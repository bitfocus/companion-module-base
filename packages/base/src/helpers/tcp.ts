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

import net from 'net'
import { EventEmitter } from 'events'
import { InstanceStatus } from '../module-api/enums.js'

export type TCPStatuses =
	| InstanceStatus.Ok
	| InstanceStatus.Connecting
	| InstanceStatus.Disconnected
	| InstanceStatus.UnknownError

export interface TCPHelperEvents {
	// when an error occurs
	error: [err: Error]
	// a packet of data has been received
	data: [msg: Buffer]

	// the connection has opened
	connect: []
	// the socket has ended
	end: []
	// the write buffer has emptied
	drain: []

	// the connection status changes
	status_change: [status: TCPStatuses, message: string | undefined]
}

export interface TCPHelperOptions {
	/** default 2000 */
	reconnect_interval?: number
	/** default true */
	reconnect?: boolean
}

/**
 * A helper class for TCP socket communication with automatic reconnection.
 *
 * This class provides a managed TCP client connection with automatic reconnection
 * on errors or disconnects. It emits events for connection status, data, errors,
 * and provides both synchronous and asynchronous send methods.
 *
 * @example
 * ```typescript
 * const tcp = new TCPHelper('192.168.1.100', 8080)
 *
 * tcp.on('error', (err) => console.error('TCP Error:', err))
 * tcp.on('connect', () => console.log('Connected!'))
 * tcp.on('data', (data) => console.log('Received:', data.toString()))
 * tcp.on('status_change', (status, message) => console.log('Status:', status))
 *
 * // Wait for connection...
 * // Then send data
 *
 * // Synchronous send (errors emitted via 'error' event)
 * const sent = tcp.send('Hello')  // returns false if not connected
 *
 * // Asynchronous send (errors thrown/rejected)
 * const sent = await tcp.sendAsync('Hello')  // returns false if not connected
 *
 * // Cleanup
 * tcp.destroy()
 * ```
 */
export class TCPHelper extends EventEmitter<TCPHelperEvents> {
	readonly #host: string
	readonly #port: number
	readonly _socket: net.Socket
	readonly #options: Required<TCPHelperOptions>

	#connected = false
	#connecting = false
	#destroyed = false
	#lastStatus: InstanceStatus | undefined
	#reconnectTimer: NodeJS.Timeout | undefined
	#missingErrorHandlerTimer: NodeJS.Timeout | undefined

	/**
	 * Returns whether the socket is currently connected and ready for sending.
	 */
	get isConnected(): boolean {
		return this.#connected
	}

	/**
	 * Returns whether a connection attempt is currently in progress.
	 */
	get isConnecting(): boolean {
		return this.#connecting
	}

	/**
	 * Returns whether the socket has been permanently destroyed.
	 */
	get isDestroyed(): boolean {
		return this.#destroyed
	}

	/**
	 * Creates a new TCP helper instance.
	 *
	 * The socket will automatically attempt to connect via setImmediate after construction.
	 * If reconnection is enabled (default), it will automatically reconnect on errors or disconnects.
	 * After 5 seconds, if no error handler is attached, a warning will be logged to the console.
	 *
	 * @param host - The destination host address
	 * @param port - The destination port number
	 * @param options - Optional configuration for reconnection behavior
	 */
	constructor(host: string, port: number, options?: TCPHelperOptions) {
		super()

		this.#host = host
		this.#port = port
		this.#options = {
			reconnect_interval: 2000,
			reconnect: true,
			...options,
		}

		this._socket = new net.Socket()
		this._socket.setKeepAlive(true)
		this._socket.setNoDelay(true)

		this._socket.on('error', (err) => {
			this.#connecting = false
			this.#connected = false

			if (this.#options.reconnect) {
				this.#queueReconnect()
			}

			this.#new_status(InstanceStatus.UnknownError, err.message)
			this.emit('error', err)
		})

		this._socket.on('ready', () => {
			this.#connected = true
			this.#connecting = false

			this.#new_status(InstanceStatus.Ok)
			this.emit('connect')
		})

		this._socket.on('end', () => {
			this.#connected = false
			this.#new_status(InstanceStatus.Disconnected)

			if (!this.#connecting && this.#options.reconnect) {
				this.#queueReconnect()
			}

			this.emit('end')
		})

		this._socket.on('data', (data) => this.emit('data', data))
		this._socket.on('drain', () => this.emit('drain'))

		// Let caller install event handlers first
		setImmediate(() => {
			if (!this.#destroyed) this.connect()
		})

		this.#missingErrorHandlerTimer = setTimeout(() => {
			this.#missingErrorHandlerTimer = undefined
			if (!this.#destroyed && !this.listenerCount('error')) {
				// The socket is active and has no listeners. Log an error for the module devs!
				console.error(`Danger: TCP client for ${this.#host}:${this.#port} is missing an error handler!`)
			}
		}, 5000)
	}

	/**
	 * Manually initiates a connection to the configured host and port.
	 *
	 * This is typically called automatically after construction, but can be used
	 * to manually trigger reconnection if needed.
	 *
	 * @returns true if connection attempt started, false if already connecting
	 * @throws {Error} If the socket has been destroyed
	 */
	connect(): boolean {
		if (this.#destroyed) throw new Error('Cannot connect destroyed socket')
		if (this.#connecting) return false

		this.#connecting = true
		this._socket.connect(this.#port, this.#host)
		return true
	}

	/**
	 * Sends data over the TCP connection (synchronous).
	 *
	 * This method returns immediately. Any send errors will be emitted via the 'error' event.
	 * For error handling via promises, use {@link sendAsync} instead.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @returns true if data was queued for sending, false if not connected
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 */
	send(message: string | Buffer): boolean {
		if (this.#destroyed || this._socket.destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		if (!this.#connected) {
			return false
		}

		this._socket.write(message, (error) => {
			if (!error) return

			this.#connected = false

			// Unhandled socket error
			this.#new_status(InstanceStatus.UnknownError, error.message)
			this.emit('error', error)
		})

		return true
	}

	/**
	 * Sends data over the TCP connection (asynchronous).
	 *
	 * This method returns a promise that resolves when the send completes successfully,
	 * or rejects if an error occurs. The 'error' event will NOT be emitted for send errors
	 * when using this method.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @returns A promise that resolves to true if sent, false if not connected
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 * @throws {Error} If the underlying socket write operation fails
	 */
	async sendAsync(message: string | Buffer): Promise<boolean> {
		if (this.#destroyed || this._socket.destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		if (!this.#connected) {
			return false
		}

		await new Promise<void>((resolve, reject) => {
			this._socket.write(message, (error) => {
				if (error) {
					this.#connected = false

					// Unhandled socket error
					this.#new_status(InstanceStatus.UnknownError, error.message)

					// Note: Don't emit error, as there is a listener for the event (the promise)

					reject(error)
					return
				}

				resolve()
			})
		})

		return true
	}

	/**
	 * Closes the TCP connection and cleans up all resources.
	 *
	 * After calling this method, the socket cannot be used for sending or receiving.
	 * All event listeners are removed and automatic reconnection is disabled.
	 */
	destroy(): void {
		this.#connected = false
		this.#connecting = false
		this.#destroyed = true

		if (this.#reconnectTimer !== undefined) {
			clearTimeout(this.#reconnectTimer)
			this.#reconnectTimer = undefined
		}
		if (this.#missingErrorHandlerTimer !== undefined) {
			clearTimeout(this.#missingErrorHandlerTimer)
			this.#missingErrorHandlerTimer = undefined
		}

		this._socket.removeAllListeners()
		this.removeAllListeners()
		this._socket.destroy()
	}

	#queueReconnect(): void {
		if (this.#reconnectTimer !== undefined) {
			clearTimeout(this.#reconnectTimer)
		}

		this.#reconnectTimer = setTimeout(() => {
			this.#reconnectTimer = undefined

			this.#new_status(InstanceStatus.Connecting)

			this.connect()
		}, this.#options.reconnect_interval)
	}

	// Private function
	#new_status(status: TCPStatuses, message?: string): void {
		if (this.#lastStatus != status) {
			this.#lastStatus = status
			this.emit('status_change', status, message)
		}
	}
}
