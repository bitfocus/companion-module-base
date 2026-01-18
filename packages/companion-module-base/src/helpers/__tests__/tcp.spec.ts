import { describe, it, expect, vi, afterEach } from 'vitest'
import { TCPHelper } from '../tcp.js'
import type { Socket as TMockSocket } from '../../__mocks__/net.js'
import { Socket } from 'net'

const MockSocket = Socket as unknown as typeof TMockSocket

vi.mock('net', async () => import('../../__mocks__/net.js'))

// async function sleepImmediate() {
// 	return new Promise((resolve) => setImmediate(resolve))
// }

describe('TCP', () => {
	// beforeEach(() => {
	// 	createSocketMock.mockClear()
	// })

	afterEach(() => {
		MockSocket.mockClearSockets()
	})

	// it('call fail before open', () => {
	// 	const { mockIpcWrapper, moduleTcpSockets } = createDeps()
	// 	const socket = new TCPHelper(mockIpcWrapper, moduleTcpSockets, { type: 'tcp4' })

	// 	expect(() => socket.destroy()).toThrow(/Socket is not open/)
	// 	expect(() => socket.send('', 12, '')).toThrow(/Socket is not open/)
	// })

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

		// it('bad bind', async () => {
		// 	const rawSocket = new MinimalSocket()
		// 	createSocketMock.mockReturnValueOnce(rawSocket as any)

		// 	expect(() => new TCPHelper('1.2.3.4', 852)).toThrow('Unable to bind')
		// 	expect(createSocketMock).toHaveBeenCalledTimes(1)

		// 	expect(rawSocket.bind).toHaveBeenCalledTimes(1)
		// 	expect(rawSocket.bind).toHaveBeenCalledWith(0, undefined)
		// })

		// it('ok', async () => {
		// 	const rawSocket = new MinimalSocket()
		// 	createSocketMock.mockReturnValueOnce(rawSocket as any)

		// 	rawSocket.bind.mockImplementationOnce(() => {
		// 		// No op
		// 		return rawSocket as any
		// 	})

		// 	const socket = new TCPHelper('1.2.3.4', 852)
		// 	try {
		// 		expect(socket).toBeTruthy()
		// 		expect(createSocketMock).toHaveBeenCalledTimes(1)

		// 		expect(rawSocket.bind).toHaveBeenCalledTimes(1)
		// 		expect(rawSocket.bind).toHaveBeenCalledWith(0, undefined)
		// 	} finally {
		// 		socket.destroy()
		// 	}
		// })

		// TODO - options
	})

	// it('error propogation', async () => {
	// 	const rawSocket = new MinimalSocket()
	// 	createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 	rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

	// 	const socket = new TCPHelper('1.2.3.4', 852)
	// 	try {
	// 		expect(socket).toBeTruthy()

	// 		const errorHandler = vi.fn(() => {})
	// 		const statusHandler = vi.fn(() => {})
	// 		socket.on('error', errorHandler)
	// 		socket.on('status_change', statusHandler)

	// 		expect(createSocketMock).toHaveBeenCalledTimes(1)

	// 		rawSocket.emit('error', new Error('My fake error'))

	// 		expect(errorHandler).toHaveBeenCalledTimes(1)
	// 		expect(errorHandler).toHaveBeenCalledWith(new Error('My fake error'))
	// 		expect(statusHandler).toHaveBeenCalledTimes(1)
	// 		expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.UnknownError, 'My fake error')
	// 	} finally {
	// 		socket.destroy()
	// 	}
	// })

	// describe('listening', () => {
	// 	it('ok', async () => {
	// 		const rawSocket = new MinimalSocket()
	// 		createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 		rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

	// 		const socket = new TCPHelper('1.2.3.4', 852)
	// 		try {
	// 			expect(socket).toBeTruthy()

	// 			const listeningHandler = vi.fn(() => {})
	// 			const statusHandler = vi.fn(() => {})
	// 			socket.on('connect', listeningHandler)
	// 			socket.on('status_change', statusHandler)

	// 			expect(createSocketMock).toHaveBeenCalledTimes(1)

	// 			rawSocket.emit('listening')

	// 			expect(listeningHandler).toHaveBeenCalledTimes(1)
	// 			expect(statusHandler).toHaveBeenCalledTimes(1)
	// 			expect(statusHandler).toHaveBeenCalledWith(InstanceStatus.Ok, undefined)
	// 		} finally {
	// 			socket.destroy()
	// 		}
	// 	})

	// 	// TODO - options
	// })

	// it('no error handler timeout', () => {
	// 	const rawSocket = new MinimalSocket()
	// 	createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 	rawSocket.bind.mockImplementationOnce(() => rawSocket as any)

	// 	vi.advanceTimersByTimeAsync(10000)
	// })

	// describe('send', () => {
	// 	const rawSocket = new MinimalSocket()
	// 	rawSocket.bind.mockImplementation(() => rawSocket as any)
	// 	let socket: TCPHelper

	// 	beforeAll(() => {
	// 		createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 		socket = new TCPHelper('1.2.3.4', 852)
	// 		expect(socket).toBeTruthy()
	// 	})

	// 	beforeEach(() => {
	// 		rawSocket.close.mockClear()
	// 		rawSocket.send.mockClear()
	// 	})

	// 	afterAll(() => {
	// 		if (socket) socket.destroy()
	// 	})

	// 	it('destroyed', async () => {
	// 		createSocketMock.mockReturnValueOnce(rawSocket as any)

	// 		const mySocket = new TCPHelper('1.2.3.4', 852)
	// 		expect(mySocket).toBeTruthy()

	// 		mySocket.destroy()
	// 		expect(rawSocket.close).toHaveBeenCalledTimes(1)

	// 		await expect(mySocket.send('test')).rejects.toThrow('Cannot write to destroyed socket')
	// 	})

	// 	it('no message', async () => {
	// 		await expect(socket.send(undefined as any)).rejects.toThrow('No message to send')

	// 		expect(rawSocket.send).toHaveBeenCalledTimes(0)
	// 	})

	// 	it('ok: string', async () => {
	// 		rawSocket.send.mockImplementation((msg, offset, length, cb) => {
	// 			if (!cb) return

	// 			cb(null, length)
	// 		})

	// 		await expect(socket.send('test 123')).resolves.toBeUndefined()

	// 		expect(rawSocket.send).toHaveBeenCalledTimes(1)
	// 		expect(rawSocket.send).toHaveBeenCalledWith('test 123', 852, '1.2.3.4', expect.any(Function))
	// 	})

	// 	it('ok: buffer', async () => {
	// 		rawSocket.send.mockImplementation((msg, offset, length, cb) => {
	// 			if (!cb) return

	// 			cb(null, length)
	// 		})

	// 		const msg = Buffer.from('test 123')
	// 		await expect(socket.send(msg)).resolves.toBeUndefined()

	// 		expect(rawSocket.send).toHaveBeenCalledTimes(1)
	// 		expect(rawSocket.send).toHaveBeenCalledWith(msg, 852, '1.2.3.4', expect.any(Function))
	// 	})

	// 	it('send error', async () => {
	// 		rawSocket.send.mockImplementation((msg, offset, length, cb) => {
	// 			if (!cb) return

	// 			cb(new Error('buffer overflow'), 0)
	// 		})

	// 		const msg = Buffer.from('test 123')
	// 		await expect(socket.send(msg)).rejects.toThrow('buffer overflow')

	// 		expect(rawSocket.send).toHaveBeenCalledTimes(1)
	// 		expect(rawSocket.send).toHaveBeenCalledWith(msg, 852, '1.2.3.4', expect.any(Function))
	// 	})
	// })
})
