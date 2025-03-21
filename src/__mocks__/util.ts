import { vi, Mock } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { IpcWrapper } from '../host-api/ipc-wrapper.js'

const orgSetTimeout = setTimeout
export async function runAllTimers(): Promise<void> {
	// Run all timers, and wait, multiple times.
	// This is to allow timers AND internal promises to resolve in inner functions
	for (let i = 0; i < 50; i++) {
		vi.runOnlyPendingTimers()
		await new Promise((resolve) => orgSetTimeout(resolve, 0))
	}
}

export async function runTimersUntilNow(): Promise<void> {
	// Run all timers, and wait, multiple times.
	// This is to allow timers AND internal promises to resolve in inner functions
	for (let i = 0; i < 50; i++) {
		vi.advanceTimersByTime(0)
		await new Promise((resolve) => orgSetTimeout(resolve, 0))
	}
}

const mockOptions = {
	fallbackMockImplementation: () => {
		throw new Error('not mocked')
	},
}

export function createIpcWrapperMock<TOutbound extends { [key: string]: any }, TInbound extends { [key: string]: any }>(
	sendWithCb?: Mock<IpcWrapper<TOutbound, TInbound>['sendWithCb']>,
): IpcWrapper<TOutbound, TInbound> {
	return mock<IpcWrapper<TOutbound, TInbound>>(
		{
			sendWithCb,
		},
		mockOptions,
	)
}

export interface ManualPromise<T> extends Promise<T> {
	isResolved: boolean
	manualResolve(res: T): void
	manualReject(e: Error): void
}
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function createManualPromise<T>(): ManualPromise<T> {
	let resolve: (val: T) => void = () => null
	let reject: (err: Error) => void = () => null
	const promise = new Promise<T>((resolve0, reject0) => {
		resolve = resolve0
		reject = reject0
	})

	const manualPromise: ManualPromise<T> = promise as any
	manualPromise.isResolved = false
	manualPromise.manualReject = (err) => {
		manualPromise.isResolved = true
		return reject(err)
	}
	manualPromise.manualResolve = (val) => {
		manualPromise.isResolved = true
		return resolve(val)
	}

	return manualPromise
}
