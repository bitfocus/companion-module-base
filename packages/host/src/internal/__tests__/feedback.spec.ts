import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
	CompanionAdvancedFeedbackDefinition,
	CompanionBooleanFeedbackDefinition,
	CompanionFeedbackDefinition,
	CompanionFeedbackDefinitionBase,
	CompanionFeedbackDefinitions,
	CompanionOptionValues,
	CompanionValueFeedbackDefinition,
} from '@companion-module/base'
import moduleApiPkg from '@companion-module/base/package.json' with { type: 'json' }
import { runAllTimers } from '../../../../base/src/__mocks__/util.js'
import type { FeedbackInstance, HostFeedbackDefinition, HostFeedbackValue } from '../../context.js'
import { FeedbackManager } from '../feedback.js'

const latestModuleApiVersion = moduleApiPkg.version

const mockDefinitionId = 'definition0'
const mockDefinitionId2 = 'definition1'
const feedbackId = 'abcdef'
const feedback: FeedbackInstance = {
	id: feedbackId,

	feedbackId: mockDefinitionId,
	options: { a: 1, b: 4 },

	controlId: 'control0',
	image: undefined,
}

const feedbackId2 = 'abc123'
const feedback2: FeedbackInstance = {
	id: feedbackId2,

	feedbackId: mockDefinitionId2,
	options: { a: 1, b: 4 },

	controlId: 'control1',
	image: undefined,
}

const unimplementedFunction = () => {
	throw new Error('Not implemented')
}

describe('FeedbackManager', () => {
	beforeEach(() => {
		vi.useFakeTimers()

		vi.clearAllMocks()
	})

	it('set definitions', () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)
		expect(manager.getDefinitionIds()).toHaveLength(0)
		expect(manager.getInstanceIds()).toHaveLength(0)

		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })

		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)
		expect(mockSetFeedbackDefinitions).lastCalledWith([
			{
				id: mockDefinitionId,
				type: 'boolean',
				name: 'Definition0',
				description: undefined,
				hasLearn: false,
				defaultStyle: {},
				options: [],
			},
		])

		// replace existing
		const mockDefinitionId2 = 'definition0'
		manager.setFeedbackDefinitions({ [mockDefinitionId2]: mockDefinition })

		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId2])
		expect(manager.getInstanceIds()).toHaveLength(0)
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(2)
	})

	it('execute callback on registration', async () => {
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)
		expect(manager.getDefinitionIds()).toHaveLength(0)
		expect(manager.getInstanceIds()).toHaveLength(0)

		const mockDefinitionId = 'definition0'
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		// setup definition
		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
		expect(manager.getInstanceIds()).toHaveLength(0)
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)

		expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

		// report a feedback
		manager.handleUpdateFeedbacks({
			[feedbackId]: feedback,
		})

		// not called immediately
		expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

		// wait for debounce
		await runAllTimers()
		expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
		// make sure it looks like expected
		expect(mockDefinition.callback).toHaveBeenLastCalledWith(
			{
				id: feedbackId,
				type: mockDefinition.type,
				feedbackId: feedback.feedbackId,
				controlId: feedback.controlId,
				options: feedback.options,
				previousOptions: null,
			},
			expect.anything(),
		)
		expect(manager.getInstanceIds()).toEqual([feedbackId])

		expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
		expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
			{
				id: 'abcdef',
				controlId: 'control0',
				feedbackType: 'boolean',
				value: false,
			},
		] satisfies HostFeedbackValue[])
	})

	it('execute callback on update', async () => {
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)

		const mockDefinitionId = 'definition0'
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		// setup definition
		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
		// report a feedback
		manager.handleUpdateFeedbacks({
			[feedbackId]: feedback,
		})
		// wait for debounce
		await runAllTimers()
		expect(mockDefinition.callback).toHaveBeenCalledTimes(1)

		// update the feedback
		const updatedFeedback = {
			...feedback,
			options: { c: 5 },
		}
		manager.handleUpdateFeedbacks({
			[feedbackId]: updatedFeedback,
		})

		// wait for debounce
		await runAllTimers()
		expect(mockDefinition.callback).toHaveBeenCalledTimes(2)

		expect(mockDefinition.callback).toHaveBeenLastCalledWith(
			{
				id: feedbackId,
				type: mockDefinition.type,
				feedbackId: feedback.feedbackId,
				controlId: feedback.controlId,
				options: updatedFeedback.options,
				previousOptions: feedback.options,
			},
			expect.anything(),
		)

		// Make sure the options were updated
		expect(updatedFeedback.options).not.toEqual(feedback.options)
	})

	it('instance: delete', async () => {
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)
		expect(manager.getDefinitionIds()).toHaveLength(0)
		expect(manager.getInstanceIds()).toHaveLength(0)

		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		// setup definition
		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
		expect(manager.getInstanceIds()).toHaveLength(0)
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)

		expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

		// report a feedback
		manager.handleUpdateFeedbacks({
			[feedbackId]: feedback,
			[feedbackId2]: {
				...feedback2,
				feedbackId: mockDefinitionId,
			},
		})

		// wait for debounce
		await runAllTimers()
		expect(mockDefinition.callback).toHaveBeenCalledTimes(2)
		expect(manager.getInstanceIds()).toEqual([feedbackId, feedbackId2])

		// remove a feedback
		manager.handleUpdateFeedbacks({
			[feedbackId]: undefined,
		})

		// wait for debounce
		await runAllTimers()
		expect(mockDefinition.callback).toHaveBeenCalledTimes(2)
		expect(manager.getInstanceIds()).toEqual([feedbackId2])
	})

	describe('checkFeedbacks', () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)

		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}
		const mockDefinition2: CompanionFeedbackDefinition = {
			type: 'advanced',
			name: 'Definition2',
			options: [],
			affectedProperties: undefined,
			callback: vi.fn<CompanionAdvancedFeedbackDefinition['callback']>(() => ({})),
		}

		beforeAll(async () => {
			expect(manager.getDefinitionIds()).toHaveLength(0)
			expect(manager.getInstanceIds()).toHaveLength(0)

			// setup definition
			manager.setFeedbackDefinitions({
				[mockDefinitionId]: mockDefinition,
				[mockDefinitionId2]: mockDefinition2,
			})
			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId, mockDefinitionId2])
			expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)

			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

			// report a feedback
			manager.handleUpdateFeedbacks({
				[feedbackId]: feedback,
				[feedbackId2]: feedback2,
			})
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(1)

			expect(manager.getInstanceIds()).toEqual([feedbackId, feedbackId2])
		})

		beforeEach(() => {
			vi.clearAllMocks()
		})

		it('no types specified', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(0)

			// check all
			manager.checkFeedbacks(null)

			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(1)

			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
			expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: 'abcdef',
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
				{
					id: 'abc123',
					controlId: 'control1',
					feedbackType: 'advanced',
					value: {},
				},
			] satisfies HostFeedbackValue[])
		})

		it('for type', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(0)

			// check all
			manager.checkFeedbacks([mockDefinitionId2, 'fake-id'])

			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(1)

			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
			expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: 'abc123',
					controlId: 'control1',
					feedbackType: 'advanced',
					value: {},
				},
			] satisfies HostFeedbackValue[])
		})

		it('for ids', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(0)

			// check all
			manager.checkFeedbacksById([feedbackId, 'fake-id'])

			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(mockDefinition2.callback).toHaveBeenCalledTimes(0)

			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
			expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: 'abcdef',
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})
	})

	describe('check while being checked', () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)

		let waitForManualResolve = false
		let nextResolve: (() => void) | undefined

		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(async () => {
				if (waitForManualResolve) {
					expect(nextResolve).toBeUndefined()
					await new Promise<void>((resolve) => {
						nextResolve = resolve
					})
					nextResolve = undefined

					// await new Promise((resolve) => setImmediate(resolve))
				}

				return false
			}),
		}

		beforeAll(async () => {
			expect(manager.getDefinitionIds()).toHaveLength(0)
			expect(manager.getInstanceIds()).toHaveLength(0)

			// setup definition
			manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
			expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)

			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

			// report a feedback
			manager.handleUpdateFeedbacks({ [feedbackId]: feedback })
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)

			expect(manager.getInstanceIds()).toEqual([feedbackId])
		})

		beforeEach(() => {
			vi.clearAllMocks()

			waitForManualResolve = false
		})

		it('basic run', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

			// check all
			manager.checkFeedbacks(null)

			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)

			// check the value sent to the client
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
			expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: 'abcdef',
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})

		it('freeze feedback callback', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

			waitForManualResolve = true

			// check all
			manager.checkFeedbacks(null)

			// make sure it hasnt completed yet
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(nextResolve).toBeTruthy()
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(0)

			// let it complete now
			nextResolve!()
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(nextResolve).toBeFalsy()

			// check the value sent to the client
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(1)
			expect(mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: 'abcdef',
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})

		it('update while frozen', async () => {
			// make sure it didnt want to rerun by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

			waitForManualResolve = true

			// check all
			manager.checkFeedbacks(null)

			// make sure it hasnt completed yet
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(nextResolve).toBeTruthy()
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(0)

			// trigger it to be checked again
			waitForManualResolve = false
			manager.checkFeedbacks(null)

			// make sure the second doesnt start by itself
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)

			// let it complete now
			setImmediate(() => nextResolve!())
			await runAllTimers()
			await runAllTimers()

			// make sure it ran twice
			expect(mockDefinition.callback).toHaveBeenCalledTimes(2)
			expect(nextResolve).toBeFalsy()

			// check the value sent to the client
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(2)
		})
	})

	describe('abort signal on recheck', () => {
		interface AbortTestRig {
			manager: FeedbackManager
			callback: ReturnType<typeof vi.fn<CompanionBooleanFeedbackDefinition['callback']>>
			mockUpdateFeedbackValues: ReturnType<typeof vi.fn<(values: HostFeedbackValue[]) => null>>
			/** The signal passed to each call of the callback, in order */
			signals: AbortSignal[]
			/** Resolver for the currently frozen callback run */
			resolveCurrent: () => void
		}

		// Setup a manager with a callback that freezes (awaiting a manual resolve) on each run,
		// recording the signal it was given. `throwOnAbort` makes a frozen run throw if its signal
		// has aborted by the time it resumes (a cooperative callback bailing out).
		async function setupRig(throwOnAbort: boolean): Promise<AbortTestRig> {
			const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
			const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
			const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)

			const signals: AbortSignal[] = []
			let nextResolve: (() => void) | undefined

			const callback = vi.fn<CompanionBooleanFeedbackDefinition['callback']>(async (_feedback, context) => {
				signals.push(context.signal)
				await new Promise<void>((resolve) => {
					nextResolve = resolve
				})
				nextResolve = undefined

				if (throwOnAbort && context.signal.aborted) throw new Error('aborted')

				return false
			})

			const mockDefinition: CompanionFeedbackDefinition = {
				type: 'boolean',
				name: 'Definition0',
				defaultStyle: {},
				options: [],
				callback,
			}

			manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
			manager.handleUpdateFeedbacks({ [feedbackId]: feedback })

			// The first run starts and freezes
			await runAllTimers()
			expect(callback).toHaveBeenCalledTimes(1)
			expect(nextResolve).toBeTruthy()

			return {
				manager,
				callback,
				mockUpdateFeedbackValues,
				signals,
				get resolveCurrent() {
					const resolve = nextResolve
					if (!resolve) throw new Error('No frozen run to resolve')
					return resolve
				},
			}
		}

		it('aborts the in-flight run when a recheck is queued', async () => {
			const rig = await setupRig(false)

			// The running callback has not been aborted yet
			expect(rig.signals[0].aborted).toBe(false)

			// Queue a recheck while the run is still frozen
			rig.manager.checkFeedbacks(null)
			await runAllTimers()

			// The in-flight run's signal is now aborted, but no second run has started yet (serial)
			expect(rig.signals[0].aborted).toBe(true)
			expect(rig.callback).toHaveBeenCalledTimes(1)
		})

		it('uses the returned value when an aborted callback ignores the signal', async () => {
			const rig = await setupRig(false)

			// Abort the first run, then let it complete by returning normally
			rig.manager.checkFeedbacks(null)
			await runAllTimers()
			expect(rig.signals[0].aborted).toBe(true)

			rig.resolveCurrent()
			await runAllTimers()

			// The recheck runs as a second, non-abortable run...
			expect(rig.callback).toHaveBeenCalledTimes(2)
			expect(rig.signals[1].aborted).toBe(false)
			rig.resolveCurrent()
			await runAllTimers()

			// ...and a value is produced (the aborted run's value is not discarded)
			expect(rig.mockUpdateFeedbackValues).toHaveBeenCalled()
			expect(rig.mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: feedbackId,
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})

		it('swallows the error when an aborted callback throws, and still rechecks', async () => {
			const rig = await setupRig(true)

			// Abort the first run; it will throw when it resumes
			rig.manager.checkFeedbacks(null)
			await runAllTimers()
			expect(rig.signals[0].aborted).toBe(true)

			rig.resolveCurrent()
			await runAllTimers()

			// The recheck still runs (non-abortable) and produces a value despite the first run throwing
			expect(rig.callback).toHaveBeenCalledTimes(2)
			expect(rig.signals[1].aborted).toBe(false)
			rig.resolveCurrent()
			await runAllTimers()

			expect(rig.mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: feedbackId,
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})

		it('aborts the in-flight run when the feedback is removed', async () => {
			const rig = await setupRig(false)
			expect(rig.signals[0].aborted).toBe(false)

			// Remove the feedback while its check is still running
			rig.manager.handleUpdateFeedbacks({ [feedbackId]: null })
			await runAllTimers()

			expect(rig.signals[0].aborted).toBe(true)
			// No new run is started for the removed feedback
			rig.resolveCurrent()
			await runAllTimers()
			expect(rig.callback).toHaveBeenCalledTimes(1)
		})

		it('aborts the in-flight run when the feedback is unsubscribed', async () => {
			const rig = await setupRig(false)
			expect(rig.signals[0].aborted).toBe(false)

			// Unsubscribe the feedback while its check is still running
			rig.manager.unsubscribeFeedbacks([mockDefinitionId])
			await runAllTimers()

			expect(rig.signals[0].aborted).toBe(true)
		})

		it('does not abort the run following an aborted run (starvation guard)', async () => {
			const rig = await setupRig(false)

			// Abort run 1
			rig.manager.checkFeedbacks(null)
			await runAllTimers()
			expect(rig.signals[0].aborted).toBe(true)

			// Let run 1 settle; the non-abortable run 2 begins
			rig.resolveCurrent()
			await runAllTimers()
			expect(rig.callback).toHaveBeenCalledTimes(2)
			expect(rig.signals[1].aborted).toBe(false)

			// Queue another recheck while run 2 is frozen - it must NOT abort run 2
			rig.manager.checkFeedbacks(null)
			await runAllTimers()
			expect(rig.signals[1].aborted).toBe(false)

			// Run 2 completes and emits a value, guaranteeing forward progress
			rig.resolveCurrent()
			await runAllTimers()
			expect(rig.mockUpdateFeedbackValues).toHaveBeenLastCalledWith([
				{
					id: feedbackId,
					controlId: 'control0',
					feedbackType: 'boolean',
					value: false,
				},
			] satisfies HostFeedbackValue[])
		})
	})

	it('learn values: no implementation', async (ctx) => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)
		expect(manager.getDefinitionIds()).toHaveLength(0)

		const mockDefinitionId = 'definition0'
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		// setup definition
		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)
		expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

		// make the call
		await expect(manager.handleLearnFeedback(feedback, ctx.signal)).resolves.toEqual({ options: undefined })
	})

	it('learn values: with implementation', async (ctx) => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)
		expect(manager.getDefinitionIds()).toHaveLength(0)

		const mockDefinitionId = 'definition0'
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
			learn: vi.fn<Required<CompanionFeedbackDefinitionBase>['learn']>(() => ({ abc: 123 })),
		}

		// setup definition
		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
		expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
		expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)
		expect(mockDefinition.callback).toHaveBeenCalledTimes(0)

		// make the call
		await expect(manager.handleLearnFeedback(feedback, ctx.signal)).resolves.toEqual({ options: { abc: 123 } })
		expect(mockDefinition.learn).toBeCalledTimes(1)
		expect(mockDefinition.learn).lastCalledWith(
			{
				id: feedbackId,
				type: mockDefinition.type,
				feedbackId: feedback.feedbackId,
				controlId: feedback.controlId,
				options: feedback.options,
				previousOptions: null,
			},
			expect.anything(),
		)
	})

	it('learn values: signal is forwarded to learn callback context', async () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)

		const mockDefinitionId = 'definition0'
		let capturedSignal: AbortSignal | undefined
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
			learn: vi.fn<Required<CompanionFeedbackDefinitionBase>['learn']>((_fb, ctx) => {
				capturedSignal = ctx.signal
				return { abc: 123 }
			}),
		}

		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })

		const controller = new AbortController()
		await manager.handleLearnFeedback(feedback, controller.signal)

		expect(capturedSignal).toBe(controller.signal)
		expect(capturedSignal!.aborted).toBe(false)
	})

	it('learn values: pre-aborted signal skips learn callback', async () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)

		const mockDefinitionId = 'definition0'
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
			learn: vi.fn<Required<CompanionFeedbackDefinitionBase>['learn']>(() => {
				return { abc: 123 }
			}),
		}

		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })

		const controller = new AbortController()
		controller.abort()

		// learn is NOT called when the signal is already aborted; result is undefined
		await expect(manager.handleLearnFeedback(feedback, controller.signal)).resolves.toEqual({ options: undefined })
		expect(mockDefinition.learn).toBeCalledTimes(0)
	})

	it('learn values: signal aborted mid-execution is observable by learn callback', async () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction, latestModuleApiVersion)

		const mockDefinitionId = 'definition0'
		const controller = new AbortController()

		let resolveLearn: ((value: CompanionOptionValues) => void) | undefined
		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
			learn: vi.fn<Required<CompanionFeedbackDefinitionBase>['learn']>(async (_fb, ctx) => {
				return new Promise<CompanionOptionValues>((resolve) => {
					resolveLearn = resolve
					// abort mid-execution and resolve with the aborted state observable
					ctx.signal.addEventListener('abort', () => resolve({ wasAborted: true }))
				})
			}),
		}

		manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })

		const learnPromise = manager.handleLearnFeedback(feedback, controller.signal)

		// learn is in-flight, abort the signal
		expect(resolveLearn).toBeDefined()
		controller.abort()

		// the abort causes learn to resolve, but the result is discarded because the signal is aborted
		await expect(learnPromise).resolves.toEqual({ options: undefined })
		expect(mockDefinition.learn).toBeCalledTimes(1)
	})

	describe('unsubscribe', () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues, latestModuleApiVersion)

		const mockDefinition: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Definition0',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(async (_fb, _ctx) => false),
			unsubscribe: vi.fn(async (_fb, _ctx) => undefined),
		}

		beforeAll(async () => {
			expect(manager.getDefinitionIds()).toHaveLength(0)
			expect(manager.getInstanceIds()).toHaveLength(0)

			// setup definition
			manager.setFeedbackDefinitions({ [mockDefinitionId]: mockDefinition })
			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
			expect(mockSetFeedbackDefinitions).toHaveBeenCalledTimes(1)

			expect(mockDefinition.callback).toHaveBeenCalledTimes(0)
		})

		beforeEach(async () => {
			manager.handleUpdateFeedbacks({
				[feedbackId]: undefined,
				[feedbackId2]: undefined,
			})

			vi.clearAllMocks()
		})

		it('not called when adding', async () => {
			// report a feedback
			manager.handleUpdateFeedbacks({ [feedbackId]: feedback })

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(0)

			expect(manager.getInstanceIds()).toEqual([feedbackId])
		})

		it('not called when updated', async () => {
			// report a feedback
			manager.handleUpdateFeedbacks({ [feedbackId]: feedback })

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(0)

			// update it
			manager.handleUpdateFeedbacks({
				[feedbackId]: {
					...feedback,
					controlId: 'new-control',
					options: { val: 'changed' },
				},
			})

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(0)

			expect(manager.getInstanceIds()).toEqual([feedbackId])
		})

		it('called when removed', async () => {
			// report a feedback
			manager.handleUpdateFeedbacks({ [feedbackId]: feedback })

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(0)

			// update it
			manager.handleUpdateFeedbacks({
				[feedbackId]: undefined,
			})

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(1)
			expect(mockDefinition.unsubscribe).toHaveBeenLastCalledWith(
				{
					id: feedbackId,
					type: mockDefinition.type,
					feedbackId: mockDefinitionId,
					controlId: feedback.controlId,
					options: feedback.options,
					previousOptions: null,
				},
				expect.anything(),
			)

			expect(manager.getInstanceIds()).toEqual([])
		})

		it('trigger all', async () => {
			// report a feedback
			manager.handleUpdateFeedbacks({
				[feedbackId]: feedback,
				[feedbackId2]: {
					...feedback2,
					feedbackId: mockDefinitionId,
				},
			})

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(0)
			expect(manager.getInstanceIds()).toEqual([feedbackId, feedbackId2])

			// trigger unsubscribe
			manager.unsubscribeFeedbacks([])

			await runAllTimers()
			expect(mockDefinition.unsubscribe).toHaveBeenCalledTimes(2)
			expect(manager.getInstanceIds()).toEqual([feedbackId, feedbackId2])
		})
	})

	describe('affectedProperties validation', () => {
		const advancedWithArray: CompanionAdvancedFeedbackDefinition = {
			type: 'advanced',
			name: 'Has affectedProperties',
			options: [],
			affectedProperties: ['bgcolor'],
			callback: vi.fn<CompanionAdvancedFeedbackDefinition['callback']>(() => ({})),
		}
		const advancedWithUndefined: CompanionAdvancedFeedbackDefinition = {
			type: 'advanced',
			name: 'Missing affectedProperties',
			options: [],
			affectedProperties: undefined,
			callback: vi.fn<CompanionAdvancedFeedbackDefinition['callback']>(() => ({})),
		}
		const booleanFeedback: CompanionFeedbackDefinition = {
			type: 'boolean',
			name: 'Boolean feedback',
			defaultStyle: {},
			options: [],
			callback: vi.fn<CompanionBooleanFeedbackDefinition['callback']>(() => false),
		}

		it('warns when advanced feedback is missing affectedProperties on api >= 2.1.0', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({
				advancedWithArray,
				advancedWithUndefined,
				booleanFeedback,
			})

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(1)
			expect(warnCalls[0][2]).toContain('affectedProperties')
			expect(warnCalls[0][2]).toContain('advancedWithUndefined')
			expect(warnCalls[0][2]).not.toContain('advancedWithArray')
			expect(warnCalls[0][2]).not.toContain('booleanFeedback')
		})

		it('warns when advanced feedback is missing affectedProperties on api > 2.1.0', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.5.3')
			manager.setFeedbackDefinitions({ advancedWithUndefined })

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(1)
			expect(warnCalls[0][2]).toContain('affectedProperties')
		})

		it('does not warn when advanced feedback has affectedProperties on api >= 2.1.0', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({ advancedWithArray })

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(0)
		})

		it('does not warn when advanced feedback is missing affectedProperties on api < 2.1.0', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.0.4')
			manager.setFeedbackDefinitions({ advancedWithUndefined })

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(0)
		})

		it('does not warn for boolean feedbacks on api >= 2.1.0', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({ booleanFeedback })

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(0)
		})

		it('does not warn for value feedbacks on api >= 2.1.0', () => {
			const valueFeedback: CompanionValueFeedbackDefinition = {
				type: 'value',
				name: 'Value feedback',
				options: [],
				callback: vi.fn<CompanionValueFeedbackDefinition['callback']>(() => 'someValue'),
			}

			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({ valueFeedback })

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(0)
		})
	})

	describe('duplicate option id validation', () => {
		it('warns for options which reuse the same id and filters out the duplicates', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const setFeedbackDefinitions = vi.fn()
			const manager = new FeedbackManager(setFeedbackDefinitions, vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({
				duplicated: {
					type: 'boolean',
					name: 'Boolean feedback',
					defaultStyle: {},
					options: [
						{ type: 'textinput', id: 'a', label: 'A' },
						{ type: 'textinput', id: 'a', label: 'A again' },
						{ type: 'textinput', id: 'b', label: 'B' },
					],
					callback: vi.fn(() => false),
				},
			} as unknown as CompanionFeedbackDefinitions)

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(1)
			expect(warnCalls[0][2]).toContain('reuse the same id')
			expect(warnCalls[0][2]).toContain('duplicated (a)')

			// Only the first usage of each id should be passed to the host
			expect(setFeedbackDefinitions).toHaveBeenCalledTimes(1)
			expect(setFeedbackDefinitions.mock.calls[0][0][0].options).toEqual([
				{ type: 'textinput', id: 'a', label: 'A' },
				{ type: 'textinput', id: 'b', label: 'B' },
			])
		})

		it('does not warn for unique option ids', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger

			const manager = new FeedbackManager(vi.fn(), vi.fn(), '2.1.0')
			manager.setFeedbackDefinitions({
				unique: {
					type: 'boolean',
					name: 'Boolean feedback',
					defaultStyle: {},
					options: [
						{ type: 'textinput', id: 'a', label: 'A' },
						{ type: 'textinput', id: 'b', label: 'B' },
					],
					callback: vi.fn(() => false),
				},
			} as unknown as CompanionFeedbackDefinitions)

			const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
			expect(warnCalls).toHaveLength(0)
		})
	})
})
