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
import { EventEmitter } from 'eventemitter3'
import { InstanceStatus } from '../module-api/enums'

type UDPStatuses = InstanceStatus.Ok | InstanceStatus.UnknownError

export interface UDPHelperEvents {
	// when an error occurs
	error: [err: Error]
	// the socket is listening for packets
	listening: []
	// a packet of data has been received
	data: [msg: Buffer]

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

export class UDPHelper extends EventEmitter<UDPHelperEvents> {
	readonly #host: string
	readonly #port: number
	readonly #socket: dgram.Socket
	readonly #options: UDPHelperOptions

	#destroyed = false
	#lastStatus: InstanceStatus | undefined

	get isDestroyed(): boolean {
		return this.#destroyed
	}

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
		} catch (e) {
			throw new Error(`Unable to bind to ip/port: ${this.#options.bind_ip}:${this.#options.bind_port}`)
		}

		if (this.#options.broadcast) {
			this.#socket.setBroadcast(true)
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

			if (this.#options.multicast_interface) {
				this.#socket.setMulticastInterface(this.#options.multicast_interface)
			}

			this.#new_status(InstanceStatus.Ok)
			this.emit('listening')
		})

		this.#socket.on('message', (data) => this.emit('data', data))

		setTimeout(() => {
			if (!this.#destroyed && !this.listenerCount('error')) {
				// The socket is active and has no listeners. Log an error for the module devs!
				console.error(`Danger: UDP socket for ${this.#host}:${this.#port} is missing an error handler!`)
			}
		}, 5000)
	}

	async send(message: string | Buffer): Promise<void> {
		if (this.#destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		return new Promise((resolve, reject) => {
			this.#socket.send(message, this.#port, this.#host, (error) => {
				if (error) {
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
	destroy(): void {
		this.#destroyed = true

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
