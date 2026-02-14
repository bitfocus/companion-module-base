import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { runAllTimers } from '../../../../companion-module-base/src/__mocks__/util.js'
import { FeedbackManager } from '../feedback.js'
import type { FeedbackInstance, HostFeedbackDefinition, HostFeedbackValue } from '../../context.js'
import type {
	CompanionAdvancedFeedbackDefinition,
	CompanionBooleanFeedbackDefinition,
	CompanionFeedbackDefinition,
	CompanionFeedbackDefinitionBase,
} from '@companion-module/base'

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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction)
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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)
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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)

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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)
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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)

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
			manager.checkFeedbacks([])

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
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)

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
			manager.checkFeedbacks([])

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
			manager.checkFeedbacks([])

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
			manager.checkFeedbacks([])

			// make sure it hasnt completed yet
			await runAllTimers()
			expect(mockDefinition.callback).toHaveBeenCalledTimes(1)
			expect(nextResolve).toBeTruthy()
			expect(mockUpdateFeedbackValues).toHaveBeenCalledTimes(0)

			// trigger it to be checked again
			waitForManualResolve = false
			manager.checkFeedbacks([])

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

	it('learn values: no implementation', async () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction)
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
		await expect(manager.handleLearnFeedback(feedback)).resolves.toEqual({ options: undefined })
	})

	it('learn values: with implementation', async () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, unimplementedFunction)
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
		await expect(manager.handleLearnFeedback(feedback)).resolves.toEqual({ options: { abc: 123 } })
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

	describe('unsubscribe', () => {
		const mockSetFeedbackDefinitions = vi.fn((_feedbacks: HostFeedbackDefinition[]) => null)
		const mockUpdateFeedbackValues = vi.fn((_values: HostFeedbackValue[]) => null)
		const manager = new FeedbackManager(mockSetFeedbackDefinitions, mockUpdateFeedbackValues)

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
})
