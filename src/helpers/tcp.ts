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
import { EventEmitter } from 'eventemitter3'
import { InstanceStatus } from '../module-api/enums.js'

type TCPStatuses =
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

	get isConnected(): boolean {
		return this.#connected
	}
	get isConnecting(): boolean {
		return this.#connecting
	}
	get isDestroyed(): boolean {
		return this.#destroyed
	}

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

	connect(): boolean {
		if (this.#destroyed) throw new Error('Cannot connect destroyed socket')
		if (this.#connecting) return false

		this.#connecting = true
		this._socket.connect(this.#port, this.#host)
		return true
	}
	async send(message: string | Buffer): Promise<boolean> {
		if (this.#destroyed || this._socket.destroyed) throw new Error('Cannot write to destroyed socket')
		if (!message || !message.length) throw new Error('No message to send')

		if (!this.#connected) {
			return false
		}

		try {
			return new Promise((resolve, reject) => {
				this._socket.write(message, (error) => {
					if (error) {
						reject(error)
						return
					}

					resolve(true)
				})
			})
		} catch (error) {
			this.#connected = false

			const error2: Error = error instanceof Error ? error : new Error(`${error}`)

			// Unhandeled socket error
			this.#new_status(InstanceStatus.UnknownError, error2.message)
			this.emit('error', error2)

			throw error2
		}
	}
	destroy(): void {
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
