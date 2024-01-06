import { assertNever } from '../util.js'
import ejson from 'ejson'

const MAX_CALLBACK_ID = 1 << 28

/**
 * Signature for the handler functions
 */
type HandlerFunction<T extends (...args: any) => any> = (data: Parameters<T>[0]) => HandlerReturnType<T>

type HandlerReturnType<T extends (...args: any) => any> = ReturnType<T> extends never
	? Promise<void>
	: Promise<ReturnType<T>>

type HandlerFunctionOrNever<T> = T extends (...args: any) => any ? HandlerFunction<T> : never

/** Map of handler functions */
export type IpcEventHandlers<T extends object> = {
	[K in keyof T]: HandlerFunctionOrNever<T[K]>
}

type ParamsIfReturnIsNever<T extends (...args: any[]) => any> = ReturnType<T> extends never ? Parameters<T> : never
type ParamsIfReturnIsValid<T extends (...args: any[]) => any> = ReturnType<T> extends never ? never : Parameters<T>

interface IpcCallMessagePacket {
	direction: 'call'
	name: string
	payload: string
	callbackId: number | undefined
}
interface IpcResponseMessagePacket {
	direction: 'response'
	callbackId: number
	success: boolean
	payload: string
}

interface PendingCallback {
	timeout: NodeJS.Timeout | undefined
	resolve: (v: any) => void
	reject: (e: any) => void
}

export class IpcWrapper<TOutbound extends { [key: string]: any }, TInbound extends { [key: string]: any }> {
	#handlers: IpcEventHandlers<TInbound>
	#sendMessage: (message: IpcCallMessagePacket | IpcResponseMessagePacket) => void
	#defaultTimeout: number

	#nextCallbackId = 1
	#pendingCallbacks = new Map<number, PendingCallback>()

	constructor(
		handlers: IpcEventHandlers<TInbound>,
		sendMessage: (message: IpcCallMessagePacket | IpcResponseMessagePacket) => void,
		defaultTimeout: number
	) {
		this.#handlers = handlers
		this.#sendMessage = sendMessage
		this.#defaultTimeout = defaultTimeout
	}

	async sendWithCb<T extends keyof TOutbound>(
		name: T,
		msg: ParamsIfReturnIsValid<TOutbound[T]>[0],
		defaultResponse?: () => Error,
		timeout = 0
	): Promise<ReturnType<TOutbound[T]>> {
		if (timeout <= 0) timeout = this.#defaultTimeout

		const callbacks: PendingCallback = { timeout: undefined, resolve: () => null, reject: () => null }
		const promise = new Promise<ReturnType<TOutbound[T]>>((resolve, reject) => {
			callbacks.resolve = resolve
			callbacks.reject = reject
		})

		// Reset the id when it gets really high
		if (this.#nextCallbackId > MAX_CALLBACK_ID) this.#nextCallbackId = 1

		const id = this.#nextCallbackId++
		this.#pendingCallbacks.set(id, callbacks)

		this.#sendMessage({
			direction: 'call',
			name: String(name),
			payload: ejson.stringify(msg),
			callbackId: id,
		})

		// Setup a timeout, creating the error in the call, so that the stack trace is useful
		const timeoutError = new Error('Call timed out')
		callbacks.timeout = setTimeout(() => {
			callbacks.reject(defaultResponse ? defaultResponse() : timeoutError)
			this.#pendingCallbacks.delete(id)
		}, timeout)

		return promise
	}

	sendWithNoCb<T extends keyof TOutbound>(name: T, msg: ParamsIfReturnIsNever<TOutbound[T]>[0]): void {
		this.#sendMessage({
			direction: 'call',
			name: String(name),
			payload: ejson.stringify(msg),
			callbackId: undefined,
		})
	}

	receivedMessage(msg: IpcCallMessagePacket | IpcResponseMessagePacket): void {
		const rawMsg = msg
		switch (msg.direction) {
			case 'call': {
				const handler = this.#handlers[msg.name]
				if (!handler) {
					if (msg.callbackId) {
						this.#sendMessage({
							direction: 'response',
							callbackId: msg.callbackId,
							success: false,
							payload: ejson.stringify({ message: `Unknown command "${msg.name}"` }),
						})
					}
					return
				}

				// TODO - should anything be logged here?
				const data = msg.payload ? ejson.parse(msg.payload) : undefined
				handler(data).then(
					(res) => {
						if (msg.callbackId) {
							this.#sendMessage({
								direction: 'response',
								callbackId: msg.callbackId,
								success: true,
								payload: ejson.stringify(res),
							})
						}
					},
					(err) => {
						if (msg.callbackId) {
							this.#sendMessage({
								direction: 'response',
								callbackId: msg.callbackId,
								success: false,
								payload:
									err instanceof Error ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : ejson.stringify(err),
							})
						}
					}
				)

				break
			}
			case 'response': {
				if (!msg.callbackId) {
					console.error(`Ipc: Response message has no callbackId`)
					return
				}
				const callbacks = this.#pendingCallbacks.get(msg.callbackId)
				this.#pendingCallbacks.delete(msg.callbackId)
				if (!callbacks) {
					// Likely timed out, we should ignore
					return
				}

				clearTimeout(callbacks.timeout)

				const data = msg.payload ? ejson.parse(msg.payload) : undefined
				if (msg.success) {
					callbacks.resolve(data)
				} else {
					let err = data
					if (data && 'message' in data) {
						err = new Error(data.message)
						if (data.stack) err.stack = data.stack
					}
					callbacks.reject(err)
				}

				break
			}
			default:
				assertNever(msg)
				console.error(`Ipc: Message of unknown direction "${rawMsg.direction}"`)
				break
		}
	}
}
