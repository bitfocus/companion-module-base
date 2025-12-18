import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'

import { UDPHelper } from '../udp.js'
import EventEmitter from 'events'
import type { RemoteInfo, Socket, createSocket } from 'dgram'
import { InstanceStatus } from '../../module-api/enums.js'

const createSocketMock = vi.fn<typeof createSocket>(() => {
	throw new Error('Not implemented')
})
vi.mock('dgram', () => {
	return {
		default: {
			createSocket: (...args: Parameters<typeof createSocket>) => createSocketMock(...args),
		},
	}
})

class MinimalSocket extends EventEmitter {
	public isOpen = false

	constructor() {
		super()
	}

	public async emitMessage(address: string, port: number, msg: Buffer): Promise<void> {
		const rinfo: RemoteInfo = {
			address: address,
			port: port,
			family: 'IPv4',
			size: msg.length,
		}
		this.emit('message', msg, rinfo)

		await vi.runAllTimersAsync()
	}

	public bind = vi.fn<Socket['bind']>(() => {
		throw new Error('Not implemented')
	})

	public send = vi.fn<Socket['send']>(() => {
		throw new Error('Not implemented')
	})

	public close = vi.fn<Socket['close']>(() => {
		return this as any
	})
}

describe('UDP', () => {
	beforeEach(() => {
		createSocketMock.mockClear()
	})

	describe('construct', () => {
		// beforeEach(() => {
		// 	vi.useFakeTimers()
		// })
		it('no socket', () => {
			createSocketMock.mockImplementationOnce(() => {
				throw new Error('No sockets!')
			})

			expect(() => new UDPHelper('1.2.3.4', 852)).toThrow('No sockets!')
		})

		it('bad bind', async () => {
			const rawSocket = new MinimalSocket()
			createSocketMock.mockReturnValueOnce(rawSocket as any)

			expect(() => new UDPHelper('1.2.3.4', 852)).toThrow('Unable to bind')
			expect(createSocketMock).toHaveBeenCalledTimes(1)

			expect(rawSocket.bind).toHaveBeenCalledTimes(1)
			expect(rawSocket.bind).toHaveBeenCalledWith(0, undefined)
		})

		it('ok', async () => {
			const rawSocket = new MinimalSocket()
			createSocketMock.mockReturnValueOnce(rawSocket as any)

			rawSocket.bind.mockImplementationOnce(() => {
				// No op
				return rawSocket as any
			})

			const socket = new UDPHelper('1.2.3.4', 852)
			try {
				expect(socket).toBeTruthy()
				expect(createSocketMock).toHaveBeenCalledTimes(1)

				expect(rawSocket.bind).toHaveBeenCalledTimes(1)
				expect(rawSocket.bind).toHaveBeenCalledWith(0, undefined)
			} finally {
				socket.destroy()
			}
		})

		// TODO - options
	})

	it('error propogation', async () => {
		const rawSocket = new MinimalSocket()
		createSocketMock.mockReturnValueOnce(rawSocket as any)

		rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

		const socket = new UDPHelper('1.2.3.4', 852)
		try {
			expect(socket).toBeTruthy()

			const errorHandler = vi.fn(() => null)
			const statusHandler = vi.fn(() => null)
			socket.on('error', errorHandler)
			socket.on('status_change', statusHandler)

			expect(createSocketMock).toHaveBeenCalledTimes(1)

			rawSocket.emit('error', new Error('My fake error'))

			expect(errorHandler).toHaveBeenCalledTimes(1)
			expect(errorHandler).toHaveBeenCalledWith(new Error('My fake error'))
			expect(statusHandler).toHaveBeenCalledTimes(1)
			expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.UnknownError, 'My fake error')
		} finally {
			socket.destroy()
		}
	})

	describe('listening', () => {
		it('ok', async () => {
			const rawSocket = new MinimalSocket()
			createSocketMock.mockReturnValueOnce(rawSocket as any)

			rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

			const socket = new UDPHelper('1.2.3.4', 852)
			try {
				expect(socket).toBeTruthy()

				const listeningHandler = vi.fn(() => null)
				const statusHandler = vi.fn(() => null)
				socket.on('listening', listeningHandler)
				socket.on('status_change', statusHandler)

				expect(createSocketMock).toHaveBeenCalledTimes(1)

				rawSocket.emit('listening')

				expect(listeningHandler).toHaveBeenCalledTimes(1)
				expect(statusHandler).toHaveBeenCalledTimes(1)
				expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.Ok, undefined)
			} finally {
				socket.destroy()
			}
		})

		// TODO - options
	})

	// it('no error handler timeout', () => {
	// 	const rawSocket = new MinimalSocket()
	// 	createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 	rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

	// 	vi.advanceTimersByTimeAsync(10000)
	// })

	describe('send', () => {
		const rawSocket = new MinimalSocket()
		rawSocket.bind.mockImplementation(() => rawSocket as any)
		let socket: UDPHelper

		beforeAll(() => {
			createSocketMock.mockReturnValueOnce(rawSocket as any)

			socket = new UDPHelper('1.2.3.4', 852)
			expect(socket).toBeTruthy()
		})

		beforeEach(() => {
			rawSocket.close.mockClear()
			rawSocket.send.mockClear()
		})

		afterAll(() => {
			if (socket) socket.destroy()
		})

		it('destroyed', async () => {
			createSocketMock.mockReturnValueOnce(rawSocket as any)

			const mySocket = new UDPHelper('1.2.3.4', 852)
			expect(mySocket).toBeTruthy()

			mySocket.destroy()
			expect(rawSocket.close).toHaveBeenCalledTimes(1)

			await expect(mySocket.send('test')).rejects.toThrow('Cannot write to destroyed socket')
		})

		it('no message', async () => {
			await expect(socket.send(undefined as any)).rejects.toThrow('No message to send')

			expect(rawSocket.send).toHaveBeenCalledTimes(0)
		})

		it('ok: string', async () => {
			rawSocket.send.mockImplementation((msg, offset, length, cb) => {
				if (!cb) return

				cb(null, length)
			})

			await expect(socket.send('test 123')).resolves.toBeUndefined()

			expect(rawSocket.send).toHaveBeenCalledTimes(1)
			expect(rawSocket.send).toHaveBeenCalledWith('test 123', 852, '1.2.3.4', expect.any(Function))
		})

		it('ok: buffer', async () => {
			rawSocket.send.mockImplementation((msg, offset, length, cb) => {
				if (!cb) return

				cb(null, length)
			})

			const msg = Buffer.from('test 123')
			await expect(socket.send(msg)).resolves.toBeUndefined()

			expect(rawSocket.send).toHaveBeenCalledTimes(1)
			expect(rawSocket.send).toHaveBeenCalledWith(msg, 852, '1.2.3.4', expect.any(Function))
		})

		it('send error', async () => {
			rawSocket.send.mockImplementation((msg, offset, length, cb) => {
				if (!cb) return

				cb(new Error('buffer overflow'), 0)
			})

			const msg = Buffer.from('test 123')
			await expect(socket.send(msg)).rejects.toThrow('buffer overflow')

			expect(rawSocket.send).toHaveBeenCalledTimes(1)
			expect(rawSocket.send).toHaveBeenCalledWith(msg, 852, '1.2.3.4', expect.any(Function))
		})
	})
})
