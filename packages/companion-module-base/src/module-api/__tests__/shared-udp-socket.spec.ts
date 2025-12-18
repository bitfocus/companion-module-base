import { describe, it, expect, vi, Mock } from 'vitest'
import { nanoid } from 'nanoid'
import {
	ModuleToHostEventsV0SharedSocket,
	HostToModuleEventsV0SharedSocket,
	SharedUdpSocketMessageJoin,
	SharedUdpSocketMessageSend,
	SharedUdpSocketMessageLeave,
} from '../../host-api/api.js'
import { IpcWrapper } from '../../host-api/ipc-wrapper.js'
import { SharedUdpSocketImpl } from '../shared-udp-socket.js'
import { ManualPromise, createIpcWrapperMock, createManualPromise } from '../../__mocks__/util.js'

async function sleepImmediate() {
	return new Promise((resolve) => setImmediate(resolve))
}

type IpcWrapperExt = IpcWrapper<ModuleToHostEventsV0SharedSocket, HostToModuleEventsV0SharedSocket>

describe('Shared UDP', () => {
	function createDeps() {
		const sendWithCbFn = vi.fn<IpcWrapperExt['sendWithCb']>(() => {
			throw new Error('Not implemented')
		})

		const mockIpcWrapper = createIpcWrapperMock<ModuleToHostEventsV0SharedSocket, HostToModuleEventsV0SharedSocket>(
			sendWithCbFn,
		)
		const moduleUdpSockets = new Map<string, SharedUdpSocketImpl>()

		return {
			mockIpcWrapper,
			moduleUdpSockets,
			sendWithCbFn,
		}
	}

	it('call fail before open', () => {
		const { mockIpcWrapper, moduleUdpSockets } = createDeps()
		const socket = new SharedUdpSocketImpl(mockIpcWrapper, moduleUdpSockets, { type: 'udp4' })

		expect(() => socket.close()).toThrow(/Socket is not open/)
		expect(() => socket.send('', 12, '')).toThrow(/Socket is not open/)
	})

	describe('bind', () => {
		it('ok', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()
			const socket = new SharedUdpSocketImpl(mockIpcWrapper, moduleUdpSockets, { type: 'udp4' })
			expect(socket.eventNames()).toHaveLength(0)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
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
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)
			expect(sendWithCbFn).toHaveBeenCalledWith('sharedUdpSocketJoin', {
				family: 'udp4',
				portNumber: 5678,
			} satisfies SharedUdpSocketMessageJoin)

			// Mock receive a response
			const handleId = nanoid()
			sendPromises[0].manualResolve(handleId)

			// Verify that opened successfully
			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(1)

			// Should be tracked now
			expect(moduleUdpSockets.get(handleId)).toBe(socket)
		})

		it('error', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()
			const socket = new SharedUdpSocketImpl(mockIpcWrapper, moduleUdpSockets, { type: 'udp4' })
			expect(socket.eventNames()).toHaveLength(0)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
			})

			const bindCb = vi.fn()
			socket.bind(5678, '1.2.3.4', bindCb)

			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(0)

			// setup an error listener
			const errorCb = vi.fn()
			socket.on('error', errorCb)

			// Check call was made
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].manualReject(err)

			// Verify that opening failed
			await sleepImmediate()
			expect(bindCb).toHaveBeenCalledTimes(0)
			expect(moduleUdpSockets.size).toBe(0)

			// Error should have propogated
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)
		})
	})

	async function createAndOpenSocket(
		mockIpcWrapper: IpcWrapperExt,
		moduleUdpSockets: Map<string, SharedUdpSocketImpl>,
		sendWithCbFn: Mock<IpcWrapperExt['sendWithCb']>,
	) {
		const socket = new SharedUdpSocketImpl(mockIpcWrapper, moduleUdpSockets, { type: 'udp4' })
		expect(socket.eventNames()).toHaveLength(0)

		const sendPromises: ManualPromise<any>[] = []
		sendWithCbFn.mockImplementationOnce(async () => {
			const sendPromise = createManualPromise<any>()
			sendPromises.push(sendPromise)
			return sendPromise
		})

		const bindCb = vi.fn()
		socket.bind(5678, '1.2.3.4', bindCb)

		// Mock receive a response
		expect(sendWithCbFn).toHaveBeenCalledTimes(1)
		expect(sendPromises).toHaveLength(1)
		const handleId = nanoid()
		sendPromises[0].manualResolve(handleId)

		// Verify that opened successfully
		await sleepImmediate()
		expect(bindCb).toHaveBeenCalledTimes(1)

		// Should be tracked now
		expect(moduleUdpSockets.get(handleId)).toBe(socket)
		sendWithCbFn.mockClear()

		return { socket, handleId }
	}

	describe('send', () => {
		it('ok', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()

			const { socket, handleId } = await createAndOpenSocket(mockIpcWrapper, moduleUdpSockets, sendWithCbFn)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
			})

			// Do send
			const sendCb = vi.fn()
			const message = Buffer.from('my fake message')
			socket.send(message, 4789, '4.5.6.7', sendCb)

			// Check callbacks
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)
			expect(sendWithCbFn).toHaveBeenCalledWith('sharedUdpSocketSend', {
				handleId,
				message,
				address: '4.5.6.7',
				port: 4789,
			} satisfies SharedUdpSocketMessageSend)

			// Mock receive a response
			sendPromises[0].manualResolve(null)

			// Verify the calback
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(1)

			expect(moduleUdpSockets.has(handleId)).toBeTruthy()
		})

		it('error', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()

			const { socket, handleId } = await createAndOpenSocket(mockIpcWrapper, moduleUdpSockets, sendWithCbFn)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
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
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)
			expect(sendWithCbFn).toHaveBeenCalledWith('sharedUdpSocketSend', {
				handleId,
				message,
				address: '4.5.6.7',
				port: 4789,
			} satisfies SharedUdpSocketMessageSend)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].manualReject(err)

			// Verify the calback
			await sleepImmediate()
			expect(sendCb).toHaveBeenCalledTimes(0)
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)

			expect(moduleUdpSockets.has(handleId)).toBeTruthy()
		})
	})

	describe('close', () => {
		it('ok', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()

			const { socket, handleId } = await createAndOpenSocket(mockIpcWrapper, moduleUdpSockets, sendWithCbFn)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
			})

			// Do send
			const closeCb = vi.fn()
			socket.close(closeCb)

			// Check callbacks
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(0)

			// Check call was made
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)
			expect(sendWithCbFn).toHaveBeenCalledWith('sharedUdpSocketLeave', {
				handleId,
			} satisfies SharedUdpSocketMessageLeave)

			// Mock receive a response
			sendPromises[0].manualResolve(null)

			// Verify the calback
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(1)

			expect(moduleUdpSockets.has(handleId)).toBeFalsy()
		})

		it('error', async () => {
			const { mockIpcWrapper, moduleUdpSockets, sendWithCbFn } = createDeps()

			const { socket, handleId } = await createAndOpenSocket(mockIpcWrapper, moduleUdpSockets, sendWithCbFn)

			const sendPromises: ManualPromise<any>[] = []
			sendWithCbFn.mockImplementationOnce(async () => {
				const sendPromise = createManualPromise<any>()
				sendPromises.push(sendPromise)
				return sendPromise
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
			expect(sendWithCbFn).toHaveBeenCalledTimes(1)
			expect(sendPromises).toHaveLength(1)
			expect(sendWithCbFn).toHaveBeenCalledWith('sharedUdpSocketLeave', {
				handleId,
			} satisfies SharedUdpSocketMessageLeave)

			// Mock receive a response
			const err = new Error('Some backend failure')
			sendPromises[0].manualReject(err)

			// Verify the calback
			await sleepImmediate()
			expect(closeCb).toHaveBeenCalledTimes(0)
			expect(errorCb).toHaveBeenCalledTimes(1)
			expect(errorCb).toHaveBeenCalledWith(err)

			expect(moduleUdpSockets.has(handleId)).toBeFalsy()
		})
	})
})
