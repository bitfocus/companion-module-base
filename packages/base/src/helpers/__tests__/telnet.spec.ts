import { Socket } from 'net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Socket as TMockSocket } from '../../__mocks__/net.js'
import { InstanceStatus } from '../../module-api/enums.js'
import { TelnetHelper } from '../telnet.js'

const MockSocket = Socket as unknown as typeof TMockSocket

vi.mock('net', async () => import('../../__mocks__/net.js'))

const IAC = 255
const SB = 250
const SE = 240
const WILL = 251
const WONT = 252
const DO = 253
const DONT = 254

async function sleepImmediate() {
	return new Promise((resolve) => setImmediate(resolve))
}

describe('Telnet', () => {
	afterEach(() => {
		MockSocket.mockClearSockets()
	})

	it('construct', () => {
		const telnet = new TelnetHelper('1.2.3.4', 23)
		try {
			expect(telnet).toBeTruthy()

			expect(MockSocket.mockSockets()).toHaveLength(1)
			const rawSocket = MockSocket.mockSockets()[0]

			expect(rawSocket.configOps).toEqual([
				['setKeepAlive', true, undefined],
				['setNoDelay', true],
			])
		} finally {
			telnet.destroy()
		}
	})

	describe('event forwarding', () => {
		it('connect event and status', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const connectHandler = vi.fn()
				const statusHandler = vi.fn()
				telnet.on('connect', connectHandler)
				telnet.on('status_change', statusHandler)

				// Wait for auto-connect from constructor
				await sleepImmediate()

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('ready')

				expect(connectHandler).toHaveBeenCalledTimes(1)
				expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.Ok, undefined)
			} finally {
				telnet.destroy()
			}
		})

		it('error event and status', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const errorHandler = vi.fn()
				const statusHandler = vi.fn()
				telnet.on('error', errorHandler)
				telnet.on('status_change', statusHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('error', new Error('My fake error'))

				expect(errorHandler).toHaveBeenCalledTimes(1)
				expect(errorHandler).toHaveBeenCalledWith(new Error('My fake error'))
				expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.UnknownError, 'My fake error')
			} finally {
				telnet.destroy()
			}
		})

		it('end event', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const endHandler = vi.fn()
				telnet.on('end', endHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('end')

				expect(endHandler).toHaveBeenCalledTimes(1)
			} finally {
				telnet.destroy()
			}
		})

		it('isConnected/isConnecting/isDestroyed delegate to tcp', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				expect(telnet.isConnected).toBe(false)
				expect(telnet.isDestroyed).toBe(false)

				await sleepImmediate()
				expect(telnet.isConnecting).toBe(true)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('ready')

				expect(telnet.isConnected).toBe(true)
				expect(telnet.isConnecting).toBe(false)

				telnet.destroy()
				expect(telnet.isDestroyed).toBe(true)
			} finally {
				if (!telnet.isDestroyed) telnet.destroy()
			}
		})
	})

	describe('stream parsing', () => {
		it('passes plain data through', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const dataHandler = vi.fn()
				telnet.on('data', dataHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('data', Buffer.from('hello'))

				await sleepImmediate()
				expect(dataHandler).toHaveBeenCalledTimes(1)
				expect(dataHandler).toHaveBeenCalledWith(Buffer.from('hello'))
			} finally {
				telnet.destroy()
			}
		})

		it('strips IAC sequences from data and emits iac', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const dataHandler = vi.fn()
				const iacHandler = vi.fn()
				telnet.on('data', dataHandler)
				telnet.on('iac', iacHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('data', Buffer.from([0x61, IAC, WILL, 1, 0x62])) // 'a' IAC WILL 1 'b'

				await sleepImmediate()
				expect(iacHandler).toHaveBeenCalledTimes(1)
				expect(iacHandler).toHaveBeenCalledWith('WILL', 1)
				expect(dataHandler).toHaveBeenCalledTimes(1)
				expect(dataHandler).toHaveBeenCalledWith(Buffer.from('ab'))
			} finally {
				telnet.destroy()
			}
		})

		it('emits iac for each negotiation command', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const iacHandler = vi.fn()
				telnet.on('iac', iacHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('data', Buffer.from([IAC, WILL, 1, IAC, WONT, 2, IAC, DO, 3, IAC, DONT, 4]))

				await sleepImmediate()
				expect(iacHandler).toHaveBeenCalledTimes(4)
				expect(iacHandler).toHaveBeenNthCalledWith(1, 'WILL', 1)
				expect(iacHandler).toHaveBeenNthCalledWith(2, 'WONT', 2)
				expect(iacHandler).toHaveBeenNthCalledWith(3, 'DO', 3)
				expect(iacHandler).toHaveBeenNthCalledWith(4, 'DONT', 4)
			} finally {
				telnet.destroy()
			}
		})

		it('emits sb for subnegotiation blocks', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const sbHandler = vi.fn()
				const dataHandler = vi.fn()
				telnet.on('sb', sbHandler)
				telnet.on('data', dataHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('data', Buffer.from([IAC, SB, 24, 1, SE]))

				await sleepImmediate()
				expect(sbHandler).toHaveBeenCalledTimes(1)
				expect(sbHandler).toHaveBeenCalledWith(Buffer.from([24, 1]))
				expect(dataHandler).toHaveBeenCalledTimes(0)
			} finally {
				telnet.destroy()
			}
		})

		it('keeps parser state across chunks', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const dataHandler = vi.fn()
				const iacHandler = vi.fn()
				telnet.on('data', dataHandler)
				telnet.on('iac', iacHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				// Split an IAC DO sequence across two chunks
				rawSocket.emit('data', Buffer.from([0x61, IAC]))
				rawSocket.emit('data', Buffer.from([DO, 5, 0x62]))

				await sleepImmediate()
				expect(iacHandler).toHaveBeenCalledTimes(1)
				expect(iacHandler).toHaveBeenCalledWith('DO', 5)
				expect(dataHandler).toHaveBeenCalledTimes(2)
				expect(dataHandler).toHaveBeenNthCalledWith(1, Buffer.from('a'))
				expect(dataHandler).toHaveBeenNthCalledWith(2, Buffer.from('b'))
			} finally {
				telnet.destroy()
			}
		})

		it('swallows unknown IAC commands', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				const dataHandler = vi.fn()
				const iacHandler = vi.fn()
				telnet.on('data', dataHandler)
				telnet.on('iac', iacHandler)

				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('data', Buffer.from([IAC, 241, 0x63])) // IAC NOP 'c'

				await sleepImmediate()
				expect(iacHandler).toHaveBeenCalledTimes(0)
				expect(dataHandler).toHaveBeenCalledTimes(1)
				expect(dataHandler).toHaveBeenCalledWith(Buffer.from('c'))
			} finally {
				telnet.destroy()
			}
		})
	})

	describe('send', () => {
		it('send and sendAsync delegate to tcp', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				// Wait for auto-connect and emit ready
				await sleepImmediate()
				const rawSocket = MockSocket.mockSockets()[0]
				rawSocket.emit('ready')

				expect(telnet.send('test 123')).toBe(true)
				await expect(telnet.sendAsync('test 456')).resolves.toBe(true)
			} finally {
				telnet.destroy()
			}
		})

		it('throws when destroyed', async () => {
			const telnet = new TelnetHelper('1.2.3.4', 23)
			telnet.destroy()

			expect(() => telnet.send('test')).toThrow('Cannot write to destroyed socket')
			await expect(telnet.sendAsync('test')).rejects.toThrow('Cannot write to destroyed socket')
		})
	})

	describe('missing error-handler timer', () => {
		it('logs error when no error listener', async () => {
			vi.useFakeTimers()

			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const telnet = new TelnetHelper('1.2.3.4', 23)
			try {
				// advance past the 5s timer used in the implementation
				await vi.advanceTimersByTimeAsync(5000)

				expect(spy).toHaveBeenCalledWith(expect.stringContaining('Danger: Telnet client'))
			} finally {
				spy.mockRestore()
				telnet.destroy()
				vi.useRealTimers()
			}
		})

		it('does not log when an error listener exists', async () => {
			vi.useFakeTimers()

			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const telnet = new TelnetHelper('1.2.3.4', 23)
			telnet.on('error', () => {})
			try {
				await vi.advanceTimersByTimeAsync(5000)

				expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('Danger: Telnet client'))
			} finally {
				spy.mockRestore()
				telnet.destroy()
				vi.useRealTimers()
			}
		})
	})
})
