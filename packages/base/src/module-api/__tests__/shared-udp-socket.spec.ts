import { describe, it, expect, vi } from 'vitest'
import { nanoid } from 'nanoid'
import { SharedUdpSocketImpl } from '../shared-udp-socket.js'
import type {
	InstanceSharedUdpSocketContext,
	SharedUdpSocketMessageJoin,
	SharedUdpSocketMessageLeave,
	SharedUdpSocketMessageSend,
} from '../../host-api/context.js'

async function sleepImmediate() {
	return new Promise((resolve) => setImmediate(resolve))
}

describe('Shared UDP', () => {
	function createContext() {
		return {
			sharedUdpSocketHandlers: new Map<string, SharedUdpSocketImpl>(),
			sharedUdpSocketJoin: vi.fn<InstanceSharedUdpSocketContext['sharedUdpSocketJoin']>(() => {
				throw new Error('Not implemented')
			}),
			sharedUdpSocketLeave: vi.fn<InstanceSharedUdpSocketContext['sharedUdpSocketLeave']>(() => {
				throw new Error('Not implemented')
			}),
			sharedUdpSocketSend: vi.fn<InstanceSharedUdpSocketContext['sharedUdpSocketSend']>(() => {
				throw new Error('Not implemented')
			}),
		}
	}

	it('call fail before open', () => {
		const ctx = createContext()
		const socket = new SharedUdpSocketImpl(ctx, { type: 'udp4' })

		expect(() => socket.close()).toThrow(/Socket is not open/)
		expect(() => socket.send('', 12, '')).toThrow(/Socket is not open/)
	})

	describe('bind', () => {
		it('ok', async () => {
			const ctx = createContext()
			const socket = new SharedUdpSocketImpl(ctx, { type: 'udp4' })
			expect(socket.eventNames()).toHaveLength(0)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketJoin.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			const bindCb = vi.fn()
			socket.bind(5678, '1.2.3.4', bindCb)

			// Opening a second time should fail
			expect(() => socket.bind(5678, '1.2.3.4', bindCb)).toThrow(/Socket is already/)

			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(0)

			// Check now a listener
			expect(socket.eventNames()).toHaveLength(1)
			expect(socket.listenerCount('listening')).toBe(1)

			// Check call was made
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledWith({
				family: 'udp4',
				portNumber: 5678,
			} satisfies SharedUdpSocketMessageJoin)

			// Mock receive a response
			const handleId = nanoid()
			sendPromises[0].resolve(handleId)

			// Verify that opened successfully
			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(1)

			// Should be tracked now
			expect(ctx.sharedUdpSocketHandlers.get(handleId)).toBe(socket)
		})

		it('error', async () => {
			const ctx = createContext()
			const socket = new SharedUdpSocketImpl(ctx, { type: 'udp4' })
			expect(socket.eventNames()).toHaveLength(0)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketJoin.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			const bindCb = vi.fn()
			socket.bind(5678, '1.2.3.4', bindCb)

			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(0)

			// setup an error listener
			const errorCb = vi.fn()
			socket.on('error', errorCb)

			// Check call was made
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].reject(err)

			// Verify that opening failed
			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketHandlers.size).toBe(0)

			// Error should have propagated
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)
		})
	})

	async function createAndOpenSocket(ctx: ReturnType<typeof createContext>) {
		const socket = new SharedUdpSocketImpl(ctx, { type: 'udp4' })
		expect(socket.eventNames()).toHaveLength(0)

		const sendPromises: PromiseWithResolvers<any>[] = []
		ctx.sharedUdpSocketJoin.mockImplementationOnce(async () => {
			const sendPromise = Promise.withResolvers<any>()
			sendPromises.push(sendPromise)
			return sendPromise.promise
		})

		const bindCb = vi.fn()
		socket.bind(5678, '1.2.3.4', bindCb)

		// Mock receive a response
		expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(1)
		expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(0)
		expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(0)
		expect(sendPromises).toHaveLength(1)
		const handleId = nanoid()
		sendPromises[0].resolve(handleId)

		// Verify that opened successfully
		await sleepImmediate()
		expect(bindCb).toHaveBeenCalledTimes(1)

		// Should be tracked now
		expect(ctx.sharedUdpSocketHandlers.get(handleId)).toBe(socket)
		ctx.sharedUdpSocketJoin.mockClear()

		return { socket, handleId }
	}

	describe('send', () => {
		it('ok', async () => {
			const ctx = createContext()

			const { socket, handleId } = await createAndOpenSocket(ctx)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketSend.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			// Do send
			const sendCb = vi.fn()
			const message = Buffer.from('my fake message')
			socket.send(message, 4789, '4.5.6.7', sendCb)

			// Check callbacks
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledWith({
				handleId,
				message,
				address: '4.5.6.7',
				port: 4789,
			} satisfies SharedUdpSocketMessageSend)

			// Mock receive a response
			sendPromises[0].resolve(null)

			// Verify the callback
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(1)

			expect(ctx.sharedUdpSocketHandlers.has(handleId)).toBeTruthy()
		})

		it('error', async () => {
			const ctx = createContext()

			const { socket, handleId } = await createAndOpenSocket(ctx)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketSend.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			// Do send
			const sendCb = vi.fn()
			const message = Buffer.from('my fake message')
			socket.send(message, 4789, '4.5.6.7', sendCb)

			const errorCb = vi.fn()
			socket.on('error', errorCb)

			// Check callbacks
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledWith({
				handleId,
				message,
				address: '4.5.6.7',
				port: 4789,
			} satisfies SharedUdpSocketMessageSend)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].reject(err)

			// Verify the callback
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(0)
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)

			expect(ctx.sharedUdpSocketHandlers.has(handleId)).toBeTruthy()
		})
	})

	describe('close', () => {
		it('ok', async () => {
			const ctx = createContext()

			const { socket, handleId } = await createAndOpenSocket(ctx)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketLeave.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			// Do send
			const closeCb = vi.fn()
			socket.close(closeCb)

			// Check callbacks
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledWith({
				handleId,
			} satisfies SharedUdpSocketMessageLeave)

			// Mock receive a response
			sendPromises[0].resolve(null)

			// Verify the callback
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(1)

			expect(ctx.sharedUdpSocketHandlers.has(handleId)).toBeFalsy()
		})

		it('error', async () => {
			const ctx = createContext()

			const { socket, handleId } = await createAndOpenSocket(ctx)

			const sendPromises: PromiseWithResolvers<any>[] = []
			ctx.sharedUdpSocketLeave.mockImplementationOnce(async () => {
				const sendPromise = Promise.withResolvers<any>()
				sendPromises.push(sendPromise)
				return sendPromise.promise
			})

			// Do send
			const closeCb = vi.fn()
			socket.close(closeCb)

			const errorCb = vi.fn()
			socket.on('error', errorCb)

			// Check callbacks
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledTimes(1)
			expect(ctx.sharedUdpSocketSend).toHaveBeenCalledTimes(0)
			expect(ctx.sharedUdpSocketJoin).toHaveBeenCalledTimes(0)
			expect(sendPromises).toHaveLength(1)
			expect(ctx.sharedUdpSocketLeave).toHaveBeenCalledWith({
				handleId,
			} satisfies SharedUdpSocketMessageLeave)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].reject(err)

			// Verify the callback
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(0)
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)

			expect(ctx.sharedUdpSocketHandlers.has(handleId)).toBeFalsy()
		})
	})
})
