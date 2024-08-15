import { EventEmitter } from 'events'
const sockets: Array<Socket> = []
const onNextSocket: Array<Function> = []

const orgSetImmediate = setImmediate

export class Socket extends EventEmitter {
	public onWrite: ((buff: Buffer, encoding: string) => void) | undefined
	public onConnect: ((port: number, host: string) => void) | undefined
	public onClose: (() => void) | undefined

	// private _port: number
	// private _host: string
	private _connected = false

	public destroyed = false

	public configOps: Array<any[]> = []

	constructor() {
		super()

		const cb = onNextSocket.shift()
		if (cb) {
			cb(this)
		}

		sockets.push(this)
	}

	public static mockSockets() {
		return sockets
	}
	public static mockClearSockets() {
		sockets.length = 0
	}
	public static mockOnNextSocket(cb: (s: Socket) => void) {
		onNextSocket.push(cb)
	}
	// this.emit('connect')
	// this.emit('close')
	// this.emit('end')

	public connect(port: number, host = 'localhost', cb?: () => void) {
		// this._port = port
		// this._host = host

		if (this.onConnect) this.onConnect(port, host)
		orgSetImmediate(() => {
			if (cb) {
				cb()
			}
			this.setConnected()
		})
	}
	public write(buf: Buffer, cb?: () => void): void
	public write(buf: Buffer, encoding?: BufferEncoding, cb?: () => void): void
	public write(buf: Buffer, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void): void {
		const DEFAULT_ENCODING = 'utf-8'
		cb = typeof encodingOrCb === 'function' ? encodingOrCb : cb
		const encoding = typeof encodingOrCb === 'function' ? DEFAULT_ENCODING : encodingOrCb
		if (this.onWrite) {
			this.onWrite(buf, encoding ?? DEFAULT_ENCODING)
		}
		if (cb) cb()
	}
	public end() {
		this.setEnd()
		this.setClosed()
	}

	public mockClose() {
		this.setClosed()
	}
	public mockData(data: string) {
		this.emit('data', data)
	}

	public setNoDelay(noDelay?: boolean) {
		// noop
		this.configOps.push(['setNoDelay', noDelay])
	}

	public setEncoding(encoding?: BufferEncoding) {
		// noop
		this.configOps.push(['setEncoding', encoding])
	}

	public setKeepAlive(enable?: boolean, initialDelay?: number) {
		// noop
		this.configOps.push(['setKeepAlive', enable, initialDelay])
	}

	public destroy() {
		this.destroyed = true
	}

	private setConnected() {
		if (this._connected !== true) {
			this._connected = true
		}
		this.emit('connect')
	}
	private setClosed() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.destroyed = true
		this.emit('close')
		if (this.onClose) this.onClose()
	}
	private setEnd() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.emit('end')
	}
}

export default { Socket }
