import { describe, test, expect, beforeEach, vi, beforeAll } from 'vitest'
import { IpcWrapper } from '../ipc-wrapper.js'

interface TestInbound1 {
	recvTest1: (a: number) => void
	recvTest2: (a: number) => never
}
interface TestOutbound1 {
	sendTest1: (a: number) => void
	sendTest2: (a: number) => never
}

function stringifyError(err: Error): string {
	return JSON.stringify(err, Object.getOwnPropertyNames(err))
}

describe('IpcWrapper', () => {
	const sendMessageFn = vi.fn()

	const testRecv1Fn = vi.fn<() => Promise<void>>()
	const testRecv2Fn = vi.fn<() => Promise<void>>()
	let ipc: IpcWrapper<TestOutbound1, TestInbound1>

	beforeAll(() => {
		vi.useFakeTimers()
	})

	beforeEach(() => {
		sendMessageFn.mockClear()
		testRecv1Fn.mockClear()
		testRecv2Fn.mockClear()

		ipc = new IpcWrapper<TestOutbound1, TestInbound1>(
			{
				recvTest1: testRecv1Fn,
				recvTest2: testRecv2Fn,
			},
			sendMessageFn,
			100,
		)
	})

	test('send without callback', () => {
		ipc.sendWithNoCb('sendTest2', 1)

		expect(sendMessageFn).toHaveBeenCalledTimes(1)
		expect(sendMessageFn).toHaveBeenCalledWith({
			direction: 'call',
			name: 'sendTest2',
			payload: '1',
			callbackId: undefined,
		})
	})

	describe('send with callback', () => {
		test('timeout', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			vi.advanceTimersByTime(101)

			await expect(result).rejects.toThrow('Call timed out')
		})

		test('returns success', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			ipc.receivedMessage({
				direction: 'response',
				callbackId: 1,
				success: true,
				payload: '42',
			})

			await expect(result).resolves.toEqual(42)
		})

		test('returns object', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			ipc.receivedMessage({
				direction: 'response',
				callbackId: 1,
				success: true,
				payload: JSON.stringify({ value: 42 }),
			})

			await expect(result).resolves.toEqual({ value: 42 })
		})

		test('throw error', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			ipc.receivedMessage({
				direction: 'response',
				callbackId: 1,
				success: false,
				payload: stringifyError(new Error('my error')),
			})

			await expect(result).rejects.toThrow(`my error`)
		})

		test('throw error as string', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			ipc.receivedMessage({
				direction: 'response',
				callbackId: 1,
				success: false,
				payload: '"error as string"',
			})

			await expect(result).rejects.toEqual('error as string')
		})

		test('throw null', async () => {
			const result = ipc.sendWithCb('sendTest1', 23)
			result.catch(() => null) // suppress unhandled promise rejection warning

			expect(result).toBeTruthy() // should be a promise

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'call',
				name: 'sendTest1',
				payload: '23',
				callbackId: 1,
			})

			ipc.receivedMessage({
				direction: 'response',
				callbackId: 1,
				success: false,
				payload: JSON.stringify(null),
			})

			await expect(result).rejects.toEqual(null)
		})
	})

	test('receive without callback', () => {
		testRecv1Fn.mockImplementation(async () => {
			return 67 as any
		})

		ipc.receivedMessage({
			direction: 'call',
			name: 'recvTest1',
			payload: '42',
			callbackId: undefined,
		})

		expect(testRecv1Fn).toHaveBeenCalledTimes(1)
		expect(testRecv1Fn).toHaveBeenCalledWith(42)

		vi.advanceTimersByTime(101)
		expect(sendMessageFn).toHaveBeenCalledTimes(0)
	})

	describe('receive with callback', () => {
		test('returns success', async () => {
			testRecv2Fn.mockImplementation(async () => {
				return 67 as any
			})

			ipc.receivedMessage({
				direction: 'call',
				name: 'recvTest2',
				payload: '42',
				callbackId: 456,
			})

			expect(testRecv2Fn).toHaveBeenCalledTimes(1)
			expect(testRecv2Fn).toHaveBeenCalledWith(42)

			await vi.advanceTimersByTimeAsync(201)

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'response',
				success: true,
				payload: '67',
				callbackId: 456,
			})
		})

		test('returns object', async () => {
			testRecv2Fn.mockImplementation(async () => {
				return { value: 88 } as any
			})

			ipc.receivedMessage({
				direction: 'call',
				name: 'recvTest2',
				payload: '42',
				callbackId: 456,
			})

			expect(testRecv2Fn).toHaveBeenCalledTimes(1)
			expect(testRecv2Fn).toHaveBeenCalledWith(42)

			await vi.advanceTimersByTimeAsync(201)

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'response',
				success: true,
				payload: JSON.stringify({ value: 88 }),
				callbackId: 456,
			})
		})

		test('throw error', async () => {
			let error: Error | undefined
			testRecv2Fn.mockImplementation(async () => {
				error = new Error('my error')
				throw error
			})

			ipc.receivedMessage({
				direction: 'call',
				name: 'recvTest2',
				payload: '42',
				callbackId: 456,
			})

			expect(testRecv2Fn).toHaveBeenCalledTimes(1)
			expect(testRecv2Fn).toHaveBeenCalledWith(42)
			expect(error).toBeTruthy()

			await vi.advanceTimersByTimeAsync(201)

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'response',
				success: false,
				payload: stringifyError(error!),
				callbackId: 456,
			})
		})

		test('throw error as string', async () => {
			testRecv2Fn.mockImplementation(async () => {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw 'my error message'
			})

			ipc.receivedMessage({
				direction: 'call',
				name: 'recvTest2',
				payload: '42',
				callbackId: 456,
			})

			expect(testRecv2Fn).toHaveBeenCalledTimes(1)
			expect(testRecv2Fn).toHaveBeenCalledWith(42)

			await vi.advanceTimersByTimeAsync(201)

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'response',
				success: false,
				payload: '"my error message"',
				callbackId: 456,
			})
		})

		test('throw null', async () => {
			testRecv2Fn.mockImplementation(async () => {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw null
			})

			ipc.receivedMessage({
				direction: 'call',
				name: 'recvTest2',
				payload: '42',
				callbackId: 456,
			})

			expect(testRecv2Fn).toHaveBeenCalledTimes(1)
			expect(testRecv2Fn).toHaveBeenCalledWith(42)

			await vi.advanceTimersByTimeAsync(201)

			expect(sendMessageFn).toHaveBeenCalledTimes(1)
			expect(sendMessageFn).toHaveBeenCalledWith({
				direction: 'response',
				success: false,
				payload: 'null',
				callbackId: 456,
			})
		})
	})
})
