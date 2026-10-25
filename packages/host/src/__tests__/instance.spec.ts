import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InstanceBase, type InstanceTypes, type SomeCompanionConfigField } from '@companion-module/base'
import moduleApiPkg from '@companion-module/base/package.json' with { type: 'json' }
import type { ModuleHostContext } from '../context.js'
import { InstanceWrapper, type InitMessage } from '../instance.js'

const latestModuleApiVersion = moduleApiPkg.version

function createDeferred<T = void>() {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

function createMockHost(): ModuleHostContext<any, any> {
	return {
		setStatus: vi.fn(),
		setActionDefinitions: vi.fn(),
		setFeedbackDefinitions: vi.fn(),
		setVariableDefinitions: vi.fn(),
		setPresetDefinitions: vi.fn(),
		setCompositeElementDefinitions: vi.fn(),
		setVariableValues: vi.fn(),
		updateFeedbackValues: vi.fn(),
		saveConfig: vi.fn(),
		sendOSC: vi.fn(),
		recordAction: vi.fn(),
		setCustomVariable: vi.fn(),
		sharedUdpSocketJoin: vi.fn(),
		sharedUdpSocketLeave: vi.fn(),
		sharedUdpSocketSend: vi.fn(),
	}
}

/** The lifecycle methods of the module, replaced per test to control their behaviour */
interface ModuleLifecycle {
	init: (config: any, isFirstInit: boolean, secrets: any) => Promise<void>
	destroy: () => Promise<void>
	configUpdated: (config: any, secrets: any) => Promise<void>
}

function createInstance(lifecycle: ModuleLifecycle) {
	class TestInstance extends InstanceBase<InstanceTypes> {
		async init(config: any, isFirstInit: boolean, secrets: any): Promise<void> {
			return lifecycle.init(config, isFirstInit, secrets)
		}
		async destroy(): Promise<void> {
			return lifecycle.destroy()
		}
		async configUpdated(config: any, secrets: any): Promise<void> {
			return lifecycle.configUpdated(config, secrets)
		}
		getConfigFields(): SomeCompanionConfigField[] {
			return []
		}
	}

	return new InstanceWrapper<InstanceTypes>('test-id', createMockHost(), TestInstance, [], latestModuleApiVersion)
}

function createInitMessage(label = 'my-label'): InitMessage {
	return {
		label,
		isFirstInit: false,
		config: { a: 1 },
		secrets: { b: 2 },
		lastUpgradeIndex: -1,
	}
}

describe('InstanceWrapper lifecycle', () => {
	let lifecycle: {
		init: ReturnType<typeof vi.fn<ModuleLifecycle['init']>>
		destroy: ReturnType<typeof vi.fn<ModuleLifecycle['destroy']>>
		configUpdated: ReturnType<typeof vi.fn<ModuleLifecycle['configUpdated']>>
	}

	const originalTitle = process.title

	beforeEach(() => {
		lifecycle = {
			init: vi.fn(async () => {}),
			destroy: vi.fn(async () => {}),
			configUpdated: vi.fn(async () => {}),
		}
	})
	afterEach(() => {
		process.title = originalTitle
	})

	it('init: passes config to the module and returns the response', async () => {
		const wrapper = createInstance(lifecycle)

		const res = await wrapper.init(createInitMessage())

		expect(lifecycle.init).toHaveBeenCalledTimes(1)
		expect(lifecycle.init).toHaveBeenCalledWith({ a: 1 }, false, { b: 2 })
		expect(res).toEqual({
			hasHttpHandler: false,
			hasRecordActionsHandler: false,
			newUpgradeIndex: -1,
			disableNewConfigLayout: false,
			updatedConfig: { a: 1 },
			updatedSecrets: { b: 2 },
		})
	})

	it('init: rejects a second init', async () => {
		const wrapper = createInstance(lifecycle)

		await wrapper.init(createInitMessage())
		await expect(wrapper.init(createInitMessage())).rejects.toThrow('Already initialized')

		expect(lifecycle.init).toHaveBeenCalledTimes(1)
	})

	it('destroy/configUpdate: reject before init', async () => {
		const wrapper = createInstance(lifecycle)

		await expect(wrapper.destroy()).rejects.toThrow('Not initialized')
		await expect(wrapper.configUpdateAndLabel('label', {}, {})).rejects.toThrow('Not initialized')

		expect(lifecycle.destroy).toHaveBeenCalledTimes(0)
		expect(lifecycle.configUpdated).toHaveBeenCalledTimes(0)
	})

	it('init: a failed init rejects with the module error, and can be retried', async () => {
		const traceSpy = vi.spyOn(console, 'trace').mockImplementation(() => {})
		try {
			const wrapper = createInstance(lifecycle)

			lifecycle.init.mockRejectedValueOnce(new Error('module init failed'))
			await expect(wrapper.init(createInitMessage())).rejects.toThrow('module init failed')

			// The instance must not be considered initialized
			await expect(wrapper.destroy()).rejects.toThrow('Not initialized')

			// The queue must not be stuck, so a retry works
			await expect(wrapper.init(createInitMessage())).resolves.toBeTruthy()
			expect(lifecycle.init).toHaveBeenCalledTimes(2)

			await wrapper.destroy()
			expect(lifecycle.destroy).toHaveBeenCalledTimes(1)
		} finally {
			traceSpy.mockRestore()
		}
	})

	it('runs lifecycle calls one at a time, in the order they were made', async () => {
		const wrapper = createInstance(lifecycle)

		const events: string[] = []
		const initDeferred = createDeferred()
		const configDeferred = createDeferred()

		lifecycle.init.mockImplementation(async () => {
			events.push('init:start')
			await initDeferred.promise
			events.push('init:end')
		})
		lifecycle.configUpdated.mockImplementation(async (config) => {
			events.push(`configUpdated:start:${config.v}`)
			await configDeferred.promise
			events.push(`configUpdated:end:${config.v}`)
		})
		lifecycle.destroy.mockImplementation(async () => {
			events.push('destroy')
		})

		// Fire all the calls without waiting for each other
		const initPromise = wrapper.init(createInitMessage())
		const update1Promise = wrapper.configUpdateAndLabel('label1', { v: 1 }, {})
		const update2Promise = wrapper.configUpdateAndLabel('label2', { v: 2 }, {})
		const destroyPromise = wrapper.destroy()

		// Let anything that isn't blocked run
		await new Promise((resolve) => setTimeout(resolve, 10))
		expect(events).toEqual(['init:start'])

		initDeferred.resolve()
		await initPromise
		await new Promise((resolve) => setTimeout(resolve, 10))
		expect(events).toEqual(['init:start', 'init:end', 'configUpdated:start:1'])

		configDeferred.resolve()
		await Promise.all([update1Promise, update2Promise, destroyPromise])

		expect(events).toEqual([
			'init:start',
			'init:end',
			'configUpdated:start:1',
			'configUpdated:end:1',
			'configUpdated:start:2',
			'configUpdated:end:2',
			'destroy',
		])
	})

	it('a failing call does not block the calls queued behind it', async () => {
		const wrapper = createInstance(lifecycle)
		await wrapper.init(createInitMessage())

		const updateDeferred = createDeferred()
		lifecycle.configUpdated.mockImplementationOnce(async () => {
			await updateDeferred.promise
			throw new Error('config update failed')
		})

		const updatePromise = wrapper.configUpdateAndLabel('label', { v: 1 }, {})
		const destroyPromise = wrapper.destroy()

		updateDeferred.resolve()
		await expect(updatePromise).rejects.toThrow('config update failed')
		await expect(destroyPromise).resolves.toBeUndefined()
		expect(lifecycle.destroy).toHaveBeenCalledTimes(1)
	})

	it('can be re-initialized after destroy', async () => {
		const wrapper = createInstance(lifecycle)

		await wrapper.init(createInitMessage())
		await wrapper.destroy()
		await wrapper.init(createInitMessage())

		expect(lifecycle.init).toHaveBeenCalledTimes(2)
		expect(lifecycle.destroy).toHaveBeenCalledTimes(1)
	})
})
