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

import dgram from 'dgram'
import { EventEmitter } from 'events'
import { InstanceStatus } from '../module-api/enums.js'

export type UDPStatuses = InstanceStatus.Ok | InstanceStatus.UnknownError

export interface UDPHelperEvents {
	// when an error occurs
	error: [err: Error]
	// the socket is listening for packets
	listening: []
	// a packet of data has been received
	data: [msg: Buffer, rinfo: dgram.RemoteInfo]

	// the connection status changes
	status_change: [status: UDPStatuses, message: string | undefined]
}

export interface UDPHelperOptions {
	/** default: 0 */
	bind_port?: number
	/** default: 0.0.0.0 */
	bind_ip?: string

	/** default false */
	broadcast?: boolean
	/** default 64 */
	ttl?: number
	/** default 1 */
	multicast_ttl?: number

	/** default undefined */
	multicast_interface?: string
}

/**
 * A helper class for UDP socket communication.
 *
 * This class provides a simplified interface for sending and receiving UDP datagrams.
 * It automatically manages socket lifecycle, binding, and provides both synchronous
 * and asynchronous send methods.
 *
 * @example
 * ```typescript
 * const udp = new UDPHelper('192.168.1.100', 9000)
 *
 * udp.on('error', (err) => console.error('UDP Error:', err))
 * udp.on('data', (msg, rinfo) => console.log('Received:', msg.toString()))
 *
 * // Synchronous send (errors emitted via 'error' event)
 * udp.send('Hello')
 *
 * // Asynchronous send (errors thrown/rejected)
 * await udp.sendAsync('Hello')
 *
 * // Cleanup
 * udp.destroy()
 * ```
 */
export class UDPHelper extends EventEmitter<UDPHelperEvents> {
	readonly #host: string
	readonly #port: number
	readonly #socket: dgram.Socket
	readonly #options: UDPHelperOptions

	#destroyed = false
	#lastStatus: InstanceStatus | undefined
	#missingErrorHandlerTimer: NodeJS.Timeout | undefined

	/**
	 * Returns whether the UDP socket has been destroyed.
	 */
	get isDestroyed(): boolean {
		return this.#destroyed
	}

	/**
	 * Creates a new UDP helper instance.
	 *
	 * The socket is automatically bound on construction. After 5 seconds, if no error
	 * handler is attached, a warning will be logged to the console.
	 *
	 * @param host - The destination host address for sending datagrams
	 * @param port - The destination port number for sending datagrams
	 * @param options - Optional configuration for binding, broadcast, TTL, etc.
	 * @throws {Error} If unable to bind to the specified IP/port
	 */
	constructor(host: string, port: number, options?: UDPHelperOptions) {
		super()

		this.#host = host
		this.#port = port
		this.#options = { ...options }

		// this.bound = false
		// this.pending_memberships = []

		this.#socket = dgram.createSocket('udp4')

		try {
			this.#socket.bind(this.#options.bind_port || 0, this.#options.bind_ip)
		} catch (_e) {
			throw new Error(
				`Unable to bind to ip/port: ${this.#options.bind_ip || '0.0.0.0'}:${this.#options.bind_port || 0}`,
			)
		}

		if (this.#options.ttl !== undefined) {
			this.#socket.setTTL(this.#options.ttl)
		}

		if (this.#options.multicast_ttl !== undefined) {
			this.#socket.setMulticastTTL(this.#options.multicast_ttl)
		}

		this.#socket.on('error', (error) => {
			this.#new_status(InstanceStatus.UnknownError, error.message)
			this.emit('error', error)
		})

		this.#socket.on('listening', () => {
			// this.bound = true

			// if (this.pending_memberships.length) {
			// 	while (this.pending_memberships.length > 0) {
			// 		this.socket.addMembership(member.shift())
			// 	}
			// }

			// Needed to be called after bind() had completed
			if (this.#options.broadcast) {
				this.#socket.setBroadcast(true)
			}

			if (this.#options.multicast_interface) {
				this.#socket.setMulticastInterface(this.#options.multicast_interface)
			}

			this.#new_status(InstanceStatus.Ok)
			this.emit('listening')
		})

		// Passing on rinfo to emit instead of omitting it
		this.#socket.on('message', (data, rinfo) => this.emit('data', data, rinfo))

		this.#missingErrorHandlerTimer = setTimeout(() => {
			if (!this.#destroyed && !this.listenerCount('error')) {
				// The socket is active and has no listeners. Log an error for the module devs!
				console.error(`Danger: UDP socket for ${this.#host}:${this.#port} is missing an error handler!`)
			}
		}, 5000)
	}

	/**
	 * Sends a message to the configured destination host and port (synchronous).
	 *
	 * This method returns immediately. Any send errors will be emitted via the 'error' event.
	 * For error handling via promises, use {@link sendAsync} instead.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 */
	send(message: string | Buffer): void {
		if (this.#destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		this.#socket.send(message, this.#port, this.#host, (error) => {
			if (error) {
				this.emit('error', error)
			}
		})
	}

	/**
	 * Sends a message to the configured destination host and port (asynchronous).
	 *
	 * This method returns a promise that resolves when the send completes successfully,
	 * or rejects if an error occurs. The 'error' event will NOT be emitted for send errors.
	 *
	 * @param message - The message to send (string or Buffer)
	 * @returns A promise that resolves when the message is sent
	 * @throws {Error} If the socket has been destroyed
	 * @throws {Error} If the message is empty or undefined
	 * @throws {Error} If the underlying socket send operation fails
	 */
	async sendAsync(message: string | Buffer): Promise<void> {
		if (this.#destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		return new Promise<void>((resolve, reject) => {
			this.#socket.send(message, this.#port, this.#host, (error) => {
				if (error) {
					// Note: Don't emit error, as there is a listener for the event (the promise)

					reject(error)
					return
				}

				resolve()
			})
		})
	}
	// addMembership(member) {
	// 	if (!this.bound) {
	// 		this.pending_memberships.push(member)
	// 	} else {
	// 		this.socket.addMembership(member)
	// 	}
	// }

	/**
	 * Closes the UDP socket and cleans up all resources.
	 *
	 * After calling this method, the socket cannot be used for sending or receiving.
	 * All event listeners are removed.
	 */
	destroy(): void {
		this.#destroyed = true

		if (this.#missingErrorHandlerTimer !== undefined) {
			clearTimeout(this.#missingErrorHandlerTimer)
			this.#missingErrorHandlerTimer = undefined
		}

		this.#socket.removeAllListeners()
		this.#socket.close()
		this.removeAllListeners()
	}

	// Private function
	#new_status(status: UDPStatuses, message?: string): void {
		if (this.#lastStatus != status) {
			this.#lastStatus = status
			this.emit('status_change', status, message)
		}
	}
}
