import type { RemoteInfo } from 'dgram'
import type {
	SharedUdpSocketMessage,
	ModuleToHostEventsV0SharedSocket,
	HostToModuleEventsV0SharedSocket,
} from '../host-api/api.js'
import type { IpcWrapper } from '../host-api/ipc-wrapper.js'
import EventEmitter from 'eventemitter3'
import { assertNever } from '../util.js'

export interface SharedUdpSocketEvents {
	// when an error occurs
	error: [err: Error]
	// the socket is listening for packets
	listening: []
	// the socket is no longer listening
	close: []
	// a packet of data has been received
	message: [msg: Buffer, rinfo: RemoteInfo]
}

export interface SharedUdpSocket extends EventEmitter<SharedUdpSocketEvents> {
	// address()

	/**
	 * Bind to the shared socket. Until you call this, the shared socket will be inactive
	 * @param port Port number to listen on
	 * @param address (Unused) Local address to listen on
	 * @param callback Added to the `listening` event. Called once the socket is listening
	 */
	bind(port: number, address?: string, callback?: () => void): void

	/**
	 * Close your reference to the shared socket.
	 * @param callback Called once the socket has closed
	 */
	close(callback?: () => void): void

	/**
	 * Send a message from the shared socket
	 * @param bufferOrList Data to send
	 * @param port Target port number
	 * @param address Target address
	 * @param callback Callback to execute once the data has been sent
	 */
	send(
		bufferOrList: Buffer | DataView | string | Array<number>,
		port: number,
		address: string,
		callback?: () => void,
	): void
	/**
	 * Send a message from the shared socket
	 * @param bufferOrList Data to send
	 * @param offset Offset in the buffer to start sending from
	 * @param length Length of the data to send. Limited to the length of the bufer
	 * @param port Target port number
	 * @param address Target address
	 * @param callback Callback to execute once the data has been sent
	 */
	send(
		buffer: Buffer | DataView | string,
		offset: number,
		length: number,
		port: number,
		address: string,
		callback?: () => void,
	): void
}

export interface SharedUdpSocketOptions {
	type: 'udp4' | 'udp6'
}

export type SharedUdpSocketMessageCallback = (message: Buffer, rinfo: RemoteInfo) => void

interface BoundState {
	portNumber: number
	handleId: string
}

export class SharedUdpSocketImpl extends EventEmitter<SharedUdpSocketEvents> implements SharedUdpSocket {
	readonly #ipcWrapper: IpcWrapper<ModuleToHostEventsV0SharedSocket, HostToModuleEventsV0SharedSocket>
	readonly #moduleUdpSockets: Map<string, SharedUdpSocketImpl>
	readonly #options: SharedUdpSocketOptions

	public get handleId(): string | undefined {
		return this.boundState?.handleId
	}
	public get portNumber(): number | undefined {
		return this.boundState?.portNumber
	}

	private get boundState(): BoundState | undefined {
		if (this.#state && typeof this.#state === 'object') {
			return this.#state
		} else {
			return undefined
		}
	}

	#state: BoundState | 'pending' | 'binding' | 'fatalError' | 'closed' = 'pending'

	constructor(
		ipcWrapper: IpcWrapper<ModuleToHostEventsV0SharedSocket, HostToModuleEventsV0SharedSocket>,
		moduleUdpSockets: Map<string, SharedUdpSocketImpl>,
		options: SharedUdpSocketOptions,
	) {
		super()

		this.#ipcWrapper = ipcWrapper
		this.#moduleUdpSockets = moduleUdpSockets
		this.#options = { ...options }
	}

	bind(port: number, _address?: string, callback?: () => void): void {
		if (this.#state && typeof this.#state === 'object') throw new Error('Socket is already bound')
		switch (this.#state) {
			case 'fatalError':
				throw new Error('Socket has encountered fatal error')
			case 'binding':
				throw new Error('Socket is already bound')
			case 'closed':
				throw new Error('Socket is closing')
			case 'pending':
				break
			default:
				assertNever(this.#state)
				throw new Error('Invalid socket state')
		}

		this.#state = 'binding'

		if (callback) this.on('listening', callback)

		this.#ipcWrapper
			.sendWithCb('sharedUdpSocketJoin', {
				family: this.#options.type,
				portNumber: port,
				// Future: use address?
			})
			.then(
				(handleId) => {
					this.#state = { portNumber: port, handleId }
					this.#moduleUdpSockets.set(handleId, this)
					this.emit('listening')
				},
				(err) => {
					this.#state = 'closed'
					this.emit('error', err instanceof Error ? err : new Error(err))
				},
			)
			.catch(() => null) // Make sure any errors in user code don't cause a crash
	}

	close(callback?: () => void): void {
		if (this.#state && typeof this.#state === 'object') {
			// OK
		} else {
			switch (this.#state) {
				case 'fatalError':
					throw new Error('Socket has encountered fatal error')
				case 'pending':
				case 'closed':
				case 'binding':
					throw new Error('Socket is not open')
				default:
					assertNever(this.#state)
					throw new Error('Invalid socket state')
			}
		}

		const handleId = this.#state.handleId
		this.#state = 'closed'

		if (callback) this.on('close', callback)

		this.#ipcWrapper
			.sendWithCb('sharedUdpSocketLeave', {
				handleId: handleId,
			})
			.then(
				() => {
					this.#moduleUdpSockets.delete(handleId)
					this.emit('close')
				},
				(err) => {
					this.#moduleUdpSockets.delete(handleId)
					this.emit('error', err instanceof Error ? err : new Error(err))
				},
			)
			.catch(() => null) // Make sure any errors in user code don't cause a crash
	}

	send(bufferOrList: string | Buffer | DataView | number[], port: number, address: string, callback?: () => void): void
	send(
		buffer: string | Buffer | DataView,
		offset: number,
		length: number,
		port: number,
		address: string,
		callback?: () => void,
	): void
	send(
		bufferOrList: string | Buffer | DataView | number[],
		offsetOrPort: number,
		lengthOrAddress: number | string,
		portOrCallback: number | (() => void) | undefined,
		address?: string,
		callback?: () => void,
	): void {
		if (typeof offsetOrPort !== 'number') throw new Error('Invalid arguments')
		if (typeof lengthOrAddress === 'number') {
			if (typeof portOrCallback !== 'number' || typeof address !== 'string') throw new Error('Invalid arguments')
			if (callback !== undefined && typeof callback !== 'function') throw new Error('Invalid arguments')

			const buffer = this.#processBuffer(bufferOrList, offsetOrPort, lengthOrAddress)
			this.#sendInner(buffer, portOrCallback, address, callback)
		} else if (typeof lengthOrAddress === 'string') {
			if (portOrCallback !== undefined && typeof portOrCallback !== 'function') throw new Error('Invalid arguments')

			const buffer = this.#processBuffer(bufferOrList, 0, undefined)
			this.#sendInner(buffer, offsetOrPort, lengthOrAddress, portOrCallback)
		} else {
			throw new Error('Invalid arguments')
		}
	}

	#processBuffer(
		bufferOrList: string | Buffer | DataView | number[],
		offset: number,
		length: number | undefined,
	): Buffer {
		let buffer: Buffer
		if (typeof bufferOrList === 'string') {
			buffer = Buffer.from(bufferOrList, 'utf-8')
		} else if (Buffer.isBuffer(bufferOrList)) {
			buffer = bufferOrList
		} else if (Array.isArray(bufferOrList)) {
			// Don't apply length checks
			return Buffer.from(bufferOrList)
		} else {
			buffer = Buffer.from(bufferOrList.buffer, bufferOrList.byteOffset, bufferOrList.byteLength)
		}

		return buffer.subarray(offset, length !== undefined ? length + offset : undefined)
	}

	#sendInner(buffer: Buffer, port: number, address: string, callback?: () => void): void {
		if (!this.#state || typeof this.#state !== 'object') throw new Error('Socket is not open')

		this.#ipcWrapper
			.sendWithCb('sharedUdpSocketSend', {
				handleId: this.#state.handleId,
				message: buffer,

				address: address,
				port: port,
			})
			.then(
				() => {
					callback?.()
				},
				(err) => {
					this.emit('error', err instanceof Error ? err : new Error(err))
				},
			)
			.catch(() => null) // Make sure any errors in user code don't cause a crash
	}

	receiveSocketMessage(message: SharedUdpSocketMessage): void {
		try {
			this.emit('message', message.message, message.source)
		} catch (_e) {
			// Ignore
		}
	}
	receiveSocketError(error: Error): void {
		this.#state = 'fatalError'

		const boundState = this.boundState
		if (boundState) this.#moduleUdpSockets.delete(boundState.handleId)

		try {
			this.emit('error', error)
		} catch (_e) {
			// Ignore
		}
	}
}
