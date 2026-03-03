/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
 * Authors: William Viker <william@bitfocus.io>, Håkon Nessjøen <haakon@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */

import { EventEmitter } from 'events'
import { Transform, TransformCallback, TransformOptions } from 'stream'
import { TCPHelper, TCPHelperEvents, TCPHelperOptions } from './tcp.js'

// const NULL = 0
const DATA = 0
const SE = 240
const SB = 250
const WILL = 251
const WONT = 252
const DO = 253
const DONT = 254
const IAC = 255

export interface TelnetHelperEvents extends TCPHelperEvents {
	sb: [Buffer]
	iac: [string, number]
}
export type TelnetHelperOptions = TCPHelperOptions

/**
 * A helper class for Telnet protocol communication.
 *
 * This class extends TCP functionality with Telnet protocol parsing, handling IAC
 * (Interpret As Command) sequences and subnegotiation blocks. It automatically
 * processes the Telnet command stream and emits parsed events.
 *
 * All TCP events (connect, end, error, status_change, drain) are forwarded.
 * Additional Telnet-specific events are emitted for IAC commands and subnegotiation.
 *
 * @example
 * ```typescript
 * const telnet = new TelnetHelper('192.168.1.100', 23)
 *
 * telnet.on('error', (err) => console.error('Telnet Error:', err))
 * telnet.on('connect', () => console.log('Connected!'))
 * telnet.on('data', (data) => console.log('Received:', data.toString()))
 * telnet.on('iac', (command, option) => console.log('IAC:', command, option))
 * telnet.on('sb', (buffer) => console.log('Subnegotiation:', buffer))
 *
 * // Send data
 * telnet.send('username\r\n')
 *
 * // Cleanup
 * telnet.destroy()
 * ```
 */
export class TelnetHelper extends EventEmitter<TelnetHelperEvents> {
	readonly #tcp: TCPHelper
	readonly #stream: TelnetStream
	#missingErrorHandlerTimer: NodeJS.Timeout | undefined

	/**
	 * Returns whether the underlying TCP connection is established and ready for sending.
	 */
	get isConnected(): boolean {
		return this.#tcp.isConnected
	}

	/**
	 * Returns whether a connection attempt is currently in progress.
	 */
	get isConnecting(): boolean {
		return this.#tcp.isConnecting
	}

	/**
	 * Returns whether the Telnet connection has been permanently destroyed.
	 */
	get isDestroyed(): boolean {
		return this.#tcp.isDestroyed
	}

	/**
	 * Creates a new Telnet helper instance.
	 *
	 * The underlying TCP connection will automatically attempt to connect.
	 * All data is piped through a Telnet stream parser that handles IAC sequences.
	 * After 5 seconds, if no error handler is attached, a warning will be logged to the console.
	 *
	 * @param host - The destination host address
	 * @param port - The destination port number
	 * @param options - Optional TCP connection configuration
	 */
	constructor(host: string, port: number, options?: TelnetHelperOptions) {
		super()

		this.#tcp = new TCPHelper(host, port, options)
		this.#stream = new TelnetStream()

		this.#tcp._socket.pipe(this.#stream)

		this.#tcp.on('connect', () => this.emit('connect'))
		this.#tcp.on('end', () => this.emit('end'))
		this.#tcp.on('error', (error) => this.emit('error', error))
		this.#tcp.on('status_change', (status, message) => this.emit('status_change', status, message))
		// Ignore drain and data, they go via the stream

		this.#stream.on('iac', (a, b) => this.emit('iac', a, b))
		this.#stream.on('sb', (buffer) => this.emit('sb', buffer))
		this.#stream.on('data', (data) => this.emit('data', data))
		this.#stream.on('drain', () => this.emit('drain'))

		this.#missingErrorHandlerTimer = setTimeout(() => {
			this.#missingErrorHandlerTimer = undefined
			if (!this.isDestroyed && !this.listenerCount('error')) {
				// The socket is active and has no listeners. Log an error for the module devs!
				console.error(`Danger: Telnet client for ${host}:${port} is missing an error handler!`)
			}
		}, 5000)
	}

	/**
	 * Manually initiates a connection to the configured host and port.
	 *
	 * @returns true if connection attempt started, false if already connecting
	 * @throws {Error} If the socket has been destroyed
	 */
	connect(): boolean {
		return this.#tcp.connect()
	}

	/**
	 * Sends data over the Telnet connection (synchronous).
	 *
	 * Data is sent as-is without Telnet protocol encoding. Any send errors will be
	 * emitted via the 'error' event.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @returns true if data was queued for sending, false if not connected
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 */
	send(message: string | Buffer): boolean {
		return this.#tcp.send(message)
	}

	/**
	 * Sends data over the Telnet connection (asynchronous).
	 *
	 * Data is sent as-is without Telnet protocol encoding. Returns a promise that
	 * resolves when the send completes or rejects on error.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @returns A promise that resolves to true if sent, false if not connected
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 * @throws {Error} If the underlying socket write operation fails
	 */
	async sendAsync(message: string | Buffer): Promise<boolean> {
		return this.#tcp.sendAsync(message)
	}

	/**
	 * Closes the Telnet connection and cleans up all resources.
	 *
	 * After calling this method, the socket cannot be used for sending or receiving.
	 * All event listeners are removed and the Telnet stream is destroyed.
	 */
	destroy(): void {
		this.#tcp.destroy()

		if (this.#missingErrorHandlerTimer !== undefined) {
			clearTimeout(this.#missingErrorHandlerTimer)
			this.#missingErrorHandlerTimer = undefined
		}

		this.#stream.removeAllListeners()
		this.removeAllListeners()
		this.#stream.destroy()
	}
}

/*
 * TelnetStream
 */
class TelnetStream extends Transform {
	#buffer: Buffer
	#subbuffer: Buffer

	#state: number

	constructor(options?: TransformOptions) {
		super(options)

		this.#buffer = Buffer.alloc(0)
		this.#subbuffer = Buffer.alloc(0)
		this.#state = DATA
	}
	_transform(obj: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
		for (let i = 0; i < obj.length; ++i) {
			this.#handleByte(obj[i])
		}

		const data = this.#getData()
		if (data.length) {
			this.push(data)
		}

		callback()
	}
	#handleByte(byte: number) {
		if (this.#state === DATA) {
			if (byte === IAC) {
				this.#state = IAC
				return
			}

			this.#buffer = Buffer.concat([this.#buffer, Buffer.from([byte])])
		} else if (this.#state === IAC) {
			switch (byte) {
				case SB:
				case WILL:
				case WONT:
				case DO:
				case DONT:
					this.#state = byte
					break

				default:
					this.#state = DATA
					break
			}
		} else if (this.#state >= WILL && this.#state <= DONT) {
			let iac: string | undefined = undefined
			switch (this.#state) {
				case WILL:
					iac = 'WILL'
					break
				case WONT:
					iac = 'WONT'
					break
				case DO:
					iac = 'DO'
					break
				case DONT:
					iac = 'DONT'
					break
				default:
					// never hit
					return
			}
			this.emit('iac', iac, byte)

			this.#state = DATA
			return
		} else if (this.#state === SB) {
			if (byte === SE) {
				this.emit('sb', this.#subbuffer)
				this.#state = DATA
				this.#subbuffer = Buffer.alloc(0)
				return
			}

			this.#subbuffer = Buffer.concat([this.#subbuffer, Buffer.from([byte])])
		}
	}
	#getData() {
		const buff = this.#buffer

		this.#buffer = Buffer.alloc(0)

		return buff
	}
}
