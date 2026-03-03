import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { TCPHelper } from '../tcp.js'
import type { Socket as TMockSocket } from '../../__mocks__/net.js'
import { Socket } from 'net'
import { InstanceStatus } from '../../module-api/enums.js'

const MockSocket = Socket as unknown as typeof TMockSocket

vi.mock('net', async () => import('../../__mocks__/net.js'))

async function sleepImmediate() {
	return new Promise((resolve) => setImmediate(resolve))
}

describe('TCP', () => {
	afterEach(() => {
		MockSocket.mockClearSockets()
	})

	describe('construct', () => {
		it('ok', () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				expect(socket).toBeTruthy()

				expect(MockSocket.mockSockets()).toHaveLength(1)
				const rawSocket = MockSocket.mockSockets()[0]

				expect(rawSocket.configOps).toHaveLength(2)
				expect(rawSocket.configOps).toEqual([
					['setKeepAlive', true, undefined],
					['setNoDelay', true],
				])
			} finally {
				socket.destroy()
			}
		})
	})

	it('error propagation', async () => {
		const socket = new TCPHelper('1.2.3.4', 852)
		try {
			expect(socket).toBeTruthy()

			const errorHandler = vi.fn()
			const statusHandler = vi.fn()
			socket.on('error', errorHandler)
			socket.on('status_change', statusHandler)

			const rawSocket = MockSocket.mockSockets()[0]
			rawSocket.emit('error', new Error('My fake error'))

			expect(errorHandler).toHaveBeenCalledTimes(1)
			expect(errorHandler).toHaveBeenCalledWith(new Error('My fake error'))
			expect(statusHandler).toHaveBeenCalledTimes(1)
			expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.UnknownError, 'My fake error')
		} finally {
			socket.destroy()
		}
	})

	describe('events', () => {
		it('connect event', async () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				const connectHandler = vi.fn()
				const statusHandler = vi.fn()
				socket.on('connect', connectHandler)
				socket.on('status_change', statusHandler)

				// Wait for auto-connect from constructor
				await sleepImmediate()

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('ready')

				expect(connectHandler).toHaveBeenCalledTimes(1)
				expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.Ok, undefined)
			} finally {
				socket.destroy()
			}
		})

		it('data event', async () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				const dataHandler = vi.fn()
				socket.on('data', dataHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				const msg = Buffer.from('hello')
				rawSocket.emit('data', msg)

				expect(dataHandler).toHaveBeenCalledTimes(1)
				expect(dataHandler).toHaveBeenCalledWith(msg)
			} finally {
				socket.destroy()
			}
		})

		it('end event', async () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				const endHandler = vi.fn()
				socket.on('end', endHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('end')

				expect(endHandler).toHaveBeenCalledTimes(1)
			} finally {
				socket.destroy()
			}
		})

		it('drain event', async () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				const drainHandler = vi.fn()
				socket.on('drain', drainHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('drain')

				expect(drainHandler).toHaveBeenCalledTimes(1)
			} finally {
				socket.destroy()
			}
		})

		it('isConnected/isConnecting toggles', async () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				expect(socket.isConnected).toBe(false)
				expect(socket.isConnecting).toBe(false)

				// Wait for auto-connect
				await sleepImmediate()
				expect(socket.isConnecting).toBe(true)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('ready')

				expect(socket.isConnected).toBe(true)
				expect(socket.isConnecting).toBe(false)
			} finally {
				socket.destroy()
			}
		})

		it('isDestroyed toggles after destroy', () => {
			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				expect(socket.isDestroyed).toBe(false)
				socket.destroy()
				expect(socket.isDestroyed).toBe(true)
			} finally {
				// no-op: already destroyed
			}
		})
	})

	describe('send (sync)', () => {
		let socket: TCPHelper
		let rawSocket: TMockSocket

		beforeAll(async () => {
			socket = new TCPHelper('1.2.3.4', 852)
			expect(socket).toBeTruthy()

			// Wait for auto-connect and emit ready
			await sleepImmediate()
			rawSocket = MockSocket.mockSockets()[0]
			rawSocket.emit('ready')
		})

		afterAll(() => {
			if (socket) socket.destroy()
		})

		it('destroyed', () => {
			const mySocket = new TCPHelper('1.2.3.4', 852)
			expect(mySocket).toBeTruthy()

			mySocket.destroy()

			expect(() => mySocket.send('test')).toThrow('Cannot write to destroyed socket')
		})

		it('no message', () => {
			expect(() => socket.send(undefined as any)).toThrow('No message to send')
		})

		it('not connected returns false', () => {
			const disconnectedSocket = new TCPHelper('1.2.3.4', 852, { reconnect: false })
			try {
				const result = disconnectedSocket.send('test')
				expect(result).toBe(false)
			} finally {
				disconnectedSocket.destroy()
			}
		})

		it('ok: string', () => {
			const result = socket.send('test 123')
			expect(result).toBe(true)
		})

		it('ok: buffer', () => {
			const msg = Buffer.from('test 123')
			const result = socket.send(msg)
			expect(result).toBe(true)
		})
	})

	describe('sendAsync', () => {
		let socket: TCPHelper
		let rawSocket: TMockSocket

		beforeAll(async () => {
			socket = new TCPHelper('1.2.3.4', 852)
			expect(socket).toBeTruthy()

			// Wait for auto-connect and emit ready
			await sleepImmediate()
			rawSocket = MockSocket.mockSockets()[0]
			rawSocket.emit('ready')
		})

		afterAll(() => {
			if (socket) socket.destroy()
		})

		it('destroyed', async () => {
			const mySocket = new TCPHelper('1.2.3.4', 852)
			expect(mySocket).toBeTruthy()

			mySocket.destroy()

			await expect(mySocket.sendAsync('test')).rejects.toThrow('Cannot write to destroyed socket')
		})

		it('no message', async () => {
			await expect(socket.sendAsync(undefined as any)).rejects.toThrow('No message to send')
		})

		it('not connected returns false', async () => {
			const disconnectedSocket = new TCPHelper('1.2.3.4', 852, { reconnect: false })
			try {
				const result = await disconnectedSocket.sendAsync('test')
				expect(result).toBe(false)
			} finally {
				disconnectedSocket.destroy()
			}
		})

		it('ok: string', async () => {
			const result = await socket.sendAsync('test 123')
			expect(result).toBe(true)
		})

		it('ok: buffer', async () => {
			const msg = Buffer.from('test 123')
			const result = await socket.sendAsync(msg)
			expect(result).toBe(true)
		})
	})

	describe('missing error-handler timer', () => {
		it('logs error when no error listener', async () => {
			vi.useFakeTimers()

			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const socket = new TCPHelper('1.2.3.4', 852)
			try {
				// advance past the 5s timer used in the implementation
				await vi.advanceTimersByTimeAsync(5000)

				expect(spy).toHaveBeenCalled()
				expect(spy).toHaveBeenCalledWith(expect.stringContaining('Danger: TCP client'))
			} finally {
				spy.mockRestore()
				socket.destroy()
				vi.useRealTimers()
			}
		})
	})
})
