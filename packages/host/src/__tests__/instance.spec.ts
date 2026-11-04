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

describe('InstanceWrapper definitions', () => {
	async function nextTick(): Promise<void> {
		return new Promise((resolve) => setImmediate(resolve))
	}

	function createDefinitionsInstance(
		withUpdateMethods: boolean,
		init?: (instance: InstanceBase<InstanceTypes>) => void,
	) {
		// Record the order of calls to the host, to check the batching keeps things in order
		const callOrder: string[] = []
		const host = createMockHost()
		for (const [name, fn] of Object.entries(host)) {
			vi.mocked(fn).mockImplementation((() => {
				callOrder.push(name)
			}) as any)
		}
		if (withUpdateMethods) {
			host.updateActionDefinitions = vi.fn(() => callOrder.push('updateActionDefinitions'))
			host.updateFeedbackDefinitions = vi.fn(() => callOrder.push('updateFeedbackDefinitions'))
			host.updateVariableDefinitions = vi.fn(() => callOrder.push('updateVariableDefinitions'))
			host.updateCompositeElementDefinitions = vi.fn(() => callOrder.push('updateCompositeElementDefinitions'))
		}

		let module!: InstanceBase<InstanceTypes>
		class TestInstance extends InstanceBase<InstanceTypes> {
			constructor(internal: unknown) {
				super(internal)
				// eslint-disable-next-line @typescript-eslint/no-this-alias
				module = this
			}
			async init(): Promise<void> {
				init?.(this)
			}
			async destroy(): Promise<void> {}
			async configUpdated(): Promise<void> {}
			getConfigFields(): SomeCompanionConfigField[] {
				return []
			}
		}

		const wrapper = new InstanceWrapper<InstanceTypes>('test-id', host, TestInstance, [], latestModuleApiVersion)

		return { wrapper, host, module, callOrder }
	}

	const actionDef = (name: string) => ({ name, options: [], callback: vi.fn() })

	it('batches action changes into a single incremental update', async () => {
		const { host, module } = createDefinitionsInstance(true)

		module.actionDefinitions.setAll({ a: actionDef('A'), b: actionDef('B') })
		await nextTick()
		expect(host.setActionDefinitions).toHaveBeenCalledTimes(1)
		expect(vi.mocked(host.setActionDefinitions).mock.calls[0][0].map((d) => d.id)).toEqual(['a', 'b'])

		module.actionDefinitions.set({ c: actionDef('C') })
		module.actionDefinitions.set({ a: actionDef('A2'), b: undefined })
		module.actionDefinitions.remove(['c'])
		module.actionDefinitions.set({ d: actionDef('D') })
		expect(host.updateActionDefinitions).toHaveBeenCalledTimes(0)

		await nextTick()

		expect(host.setActionDefinitions).toHaveBeenCalledTimes(1)
		expect(host.updateActionDefinitions).toHaveBeenCalledTimes(1)
		const [changed, removedIds] = vi.mocked(host.updateActionDefinitions!).mock.calls[0]
		expect(changed.map((d) => [d.id, d.name])).toEqual([
			['a', 'A2'],
			['d', 'D'],
		])
		expect(removedIds).toEqual(['c', 'b'])
	})

	it('falls back to sending the full set when the host has no incremental methods', async () => {
		const { host, module } = createDefinitionsInstance(false)

		module.feedbackDefinitions.setAll({
			a: { type: 'boolean', name: 'A', defaultStyle: {}, options: [], callback: vi.fn() },
		})
		await nextTick()
		module.feedbackDefinitions.set({
			b: { type: 'boolean', name: 'B', defaultStyle: {}, options: [], callback: vi.fn() },
		})
		await nextTick()

		expect(host.setFeedbackDefinitions).toHaveBeenCalledTimes(2)
		expect(vi.mocked(host.setFeedbackDefinitions).mock.calls[1][0].map((d) => d.id)).toEqual(['a', 'b'])
	})

	it('the deprecated set*Definitions methods replace everything', async () => {
		const { host, module } = createDefinitionsInstance(true)

		module.actionDefinitions.set({ a: actionDef('A') })
		module.setActionDefinitions({ b: actionDef('B') })
		await nextTick()

		expect(host.updateActionDefinitions).toHaveBeenCalledTimes(0)
		expect(host.setActionDefinitions).toHaveBeenCalledTimes(1)
		expect(vi.mocked(host.setActionDefinitions).mock.calls[0][0].map((d) => d.id)).toEqual(['b'])
	})

	it('the deprecated set*Definitions methods work when the module has shadowed the property', async () => {
		const { host, module } = createDefinitionsInstance(true)

		// A module may have used this property name for its own purposes
		;(module as any).actionDefinitions = { something: 'else' }

		module.setActionDefinitions({ a: actionDef('A') })
		await nextTick()

		expect(host.setActionDefinitions).toHaveBeenCalledTimes(1)
		expect(vi.mocked(host.setActionDefinitions).mock.calls[0][0].map((d) => d.id)).toEqual(['a'])
	})

	it('variable values set in the same tick as the definition are kept, and sent after the definition', async () => {
		const { host, module, callOrder } = createDefinitionsInstance(true)

		module.variableDefinitions.setAll({ a: { name: 'A' } })
		await nextTick()
		callOrder.length = 0

		module.variableDefinitions.set({ b: { name: 'B' } })
		module.setVariableValues({ a: 1, b: 2 })

		expect(module.getVariableValue('b')).toBe(2)
		expect(callOrder).toEqual(['updateVariableDefinitions', 'setVariableValues'])
		expect(host.updateVariableDefinitions).toHaveBeenCalledWith([{ id: 'b', name: 'B' }], [], [{ id: 'b', value: '' }])
		expect(host.setVariableValues).toHaveBeenCalledWith([
			{ id: 'a', value: 1 },
			{ id: 'b', value: 2 },
		])
	})

	it('removing a variable definition clears its value', async () => {
		const { host, module } = createDefinitionsInstance(true)

		module.variableDefinitions.setAll({ a: { name: 'A' }, b: { name: 'B' } })
		module.setVariableValues({ a: 1, b: 2 })

		module.variableDefinitions.remove(['a'])
		await nextTick()

		expect(module.getVariableValue('a')).toBeUndefined()
		expect(module.getVariableValue('b')).toBe(2)
		expect(host.updateVariableDefinitions).toHaveBeenCalledWith([], ['a'], [{ id: 'a', value: undefined }])
	})

	it('updating an existing variable definition keeps its value', async () => {
		const { host, module } = createDefinitionsInstance(true)

		module.variableDefinitions.setAll({ a: { name: 'A' } })
		module.setVariableValues({ a: 1 })

		module.variableDefinitions.set({ a: { name: 'A renamed' } })
		await nextTick()

		expect(module.getVariableValue('a')).toBe(1)
		expect(host.updateVariableDefinitions).toHaveBeenCalledWith([{ id: 'a', name: 'A renamed' }], [], [])
	})

	it('definitions are sent before presets which reference them', async () => {
		const { host, module, callOrder } = createDefinitionsInstance(true)

		module.actionDefinitions.set({ act1: actionDef('Action') })
		module.setPresetDefinitions([], {
			p1: {
				type: 'simple',
				name: 'My Preset',
				style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
				feedbacks: [],
				steps: [{ down: [{ actionId: 'act1', options: {} }], up: [] }],
			},
		})

		expect(callOrder).toEqual(['updateActionDefinitions', 'setPresetDefinitions'])
		expect(host.setPresetDefinitions).toHaveBeenCalledTimes(1)
	})

	it('definitions set during init are sent before init resolves', async () => {
		const { wrapper, host } = createDefinitionsInstance(true, (module) => {
			module.actionDefinitions.setAll({ a: actionDef('A') })
			module.variableDefinitions.setAll({ v: { name: 'V' } })
		})

		await wrapper.init(createInitMessage())

		expect(host.setActionDefinitions).toHaveBeenCalledTimes(1)
		expect(host.setVariableDefinitions).toHaveBeenCalledWith([{ id: 'v', name: 'V' }], [{ id: 'v', value: '' }])
	})

	it('composite elements can be updated incrementally, dropping invalid definitions', async () => {
		const { host, module } = createDefinitionsInstance(true)

		const element = (name: string) => ({ type: 'composite' as const, name, options: [], elements: [] })

		module.compositeElementDefinitions.setAll({ a: element('A'), b: element('B') })
		await nextTick()
		expect(host.setCompositeElementDefinitions).toHaveBeenCalledWith({ a: element('A'), b: element('B') })

		module.compositeElementDefinitions.set({ a: { name: 'invalid' } as any, b: undefined, c: element('C') })
		await nextTick()

		expect(host.updateCompositeElementDefinitions).toHaveBeenCalledWith({ c: element('C') }, ['b', 'a'])
	})
})
