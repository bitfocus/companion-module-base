import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type {
	CompanionActionCallbackContext,
	CompanionActionContext,
	CompanionActionDefinition,
	CompanionActionDefinitions,
	CompanionVariableValue,
	JsonValue,
	LoggingSink,
} from '@companion-module/base'
import type { ActionInstance, HostActionDefinition } from '../../context.js'
import { ActionManager } from '../actions.js'

const mockDefinitionId = 'definition0'
const mockDefinitionId2 = 'definition1'

const actionId = 'abcdef'
const action: ActionInstance = {
	id: actionId,

	actionId: mockDefinitionId,
	options: { a: 1, b: 4 },

	controlId: 'control0',
}

const actionId2 = 'abc123'
const action2: ActionInstance = {
	id: actionId2,

	actionId: mockDefinitionId2,
	options: { c: 2 },

	controlId: 'control1',
}

function createManager() {
	const setActionDefinitions = vi.fn((_actions: HostActionDefinition[]) => undefined)
	const setCustomVariableValue = vi.fn(
		(_controlId: string, _variableId: string, _value: CompanionVariableValue | undefined) => undefined,
	)
	const manager = new ActionManager(setActionDefinitions, setCustomVariableValue)
	return { manager, setActionDefinitions, setCustomVariableValue }
}

describe('ActionManager', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('set definitions', () => {
		it('minimal definition', () => {
			const { manager, setActionDefinitions } = createManager()
			expect(manager.getDefinitionIds()).toHaveLength(0)

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				options: [],
				callback: vi.fn(),
			}

			manager.setActionDefinitions({ [mockDefinitionId]: mockDefinition })

			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
			expect(manager.getDefinition(mockDefinitionId)).toBe(mockDefinition)
			expect(setActionDefinitions).toHaveBeenCalledTimes(1)
			expect(setActionDefinitions).lastCalledWith([
				{
					id: mockDefinitionId,
					name: 'Definition0',
					sortName: undefined,
					description: undefined,
					options: [],
					hasResult: false,
					optionsToMonitorForSubscribe: undefined,
					hasLearn: false,
					learnTimeout: undefined,
					hasLifecycleFunctions: false,
				} satisfies HostActionDefinition,
			])
		})

		it('full definition', () => {
			const { manager, setActionDefinitions } = createManager()

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				sortName: 'sort me',
				description: 'A description',
				options: [],
				callback: vi.fn(() => 123),
				hasResult: true,
				learn: vi.fn(() => ({})),
				learnTimeout: 1000,
				subscribe: vi.fn(),
				unsubscribe: vi.fn(),
				optionsToMonitorForSubscribe: ['a'],
			}

			manager.setActionDefinitions({ [mockDefinitionId]: mockDefinition })

			expect(setActionDefinitions).toHaveBeenCalledTimes(1)
			expect(setActionDefinitions).lastCalledWith([
				{
					id: mockDefinitionId,
					name: 'Definition0',
					sortName: 'sort me',
					description: 'A description',
					options: [],
					hasResult: true,
					optionsToMonitorForSubscribe: ['a'],
					hasLearn: true,
					learnTimeout: 1000,
					hasLifecycleFunctions: true,
				} satisfies HostActionDefinition,
			])
		})

		it('replaces existing definitions', () => {
			const { manager, setActionDefinitions } = createManager()

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				options: [],
				callback: vi.fn(),
			}

			manager.setActionDefinitions({ [mockDefinitionId]: mockDefinition })
			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])

			manager.setActionDefinitions({ [mockDefinitionId2]: mockDefinition })
			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId2])
			expect(manager.getDefinition(mockDefinitionId)).toBeUndefined()
			expect(setActionDefinitions).toHaveBeenCalledTimes(2)
		})

		it('skips falsy definitions', () => {
			const { manager, setActionDefinitions } = createManager()

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				options: [],
				callback: vi.fn(),
			}

			manager.setActionDefinitions({
				[mockDefinitionId]: mockDefinition,
				[mockDefinitionId2]: undefined,
			})

			expect(manager.getDefinitionIds()).toEqual([mockDefinitionId])
			expect(setActionDefinitions).toHaveBeenCalledTimes(1)
			expect(setActionDefinitions.mock.calls[0][0]).toHaveLength(1)
		})

		it('throws for reserved ids', () => {
			const { manager } = createManager()

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				options: [],
				callback: vi.fn(),
			}

			expect(() => manager.setActionDefinitions({ ['__proto__']: mockDefinition })).toThrow(
				'Action id "__proto__" is a reserved word',
			)
		})

		it('throws for ids with the internal prefix', () => {
			const { manager } = createManager()

			const mockDefinition: CompanionActionDefinition = {
				name: 'Definition0',
				options: [],
				callback: vi.fn(),
			}

			expect(() => manager.setActionDefinitions({ 'internal:foo': mockDefinition })).toThrow(
				'Action id "internal:foo" uses the reserved "internal:" prefix',
			)
		})
	})

	describe('set definitions: deprecation warnings', () => {
		let mockLogger: Mock<LoggingSink>

		beforeEach(() => {
			mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger
		})

		afterEach(() => {
			global.COMPANION_LOGGER = undefined
		})

		function warnMessages(): string[] {
			return mockLogger.mock.calls.filter(([, level]) => level === 'warn').map(([, , message]) => message)
		}

		it('no warnings for a well formed definition', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [{ type: 'textinput', id: 'a', label: 'A' }],
					callback: vi.fn(),
					subscribe: vi.fn(),
					optionsToMonitorForSubscribe: ['a'],
				},
			})

			expect(warnMessages()).toHaveLength(0)
		})

		it('warns for subscribe without optionsToMonitorForSubscribe', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					subscribe: vi.fn(),
				},
			} as unknown as CompanionActionDefinitions)

			const warns = warnMessages()
			expect(warns).toHaveLength(1)
			expect(warns[0]).toContain('optionsToMonitorForSubscribe')
			expect(warns[0]).toContain(mockDefinitionId)
		})

		it('warns for removed optionsToIgnoreForSubscribe property', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					optionsToIgnoreForSubscribe: ['a'],
				},
			} as unknown as CompanionActionDefinitions)

			const warns = warnMessages()
			expect(warns).toHaveLength(1)
			expect(warns[0]).toContain('optionsToIgnoreForSubscribe')
			expect(warns[0]).toContain(mockDefinitionId)
		})

		it('warns for options with old isVisible functions', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [{ type: 'textinput', id: 'a', label: 'A', isVisible: () => true }],
					callback: vi.fn(),
				},
			} as unknown as CompanionActionDefinitions)

			const warns = warnMessages()
			expect(warns).toHaveLength(1)
			expect(warns[0]).toContain('isVisible')
			expect(warns[0]).toContain(mockDefinitionId)
		})

		it('warns for options with old required properties', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [{ type: 'textinput', id: 'a', label: 'A', required: true }],
					callback: vi.fn(),
				},
			} as unknown as CompanionActionDefinitions)

			const warns = warnMessages()
			expect(warns).toHaveLength(1)
			expect(warns[0]).toContain('required')
			expect(warns[0]).toContain(mockDefinitionId)
		})

		it('warns for options which reuse the same id and filters out the duplicates', () => {
			const { manager, setActionDefinitions } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [
						{ type: 'textinput', id: 'a', label: 'A' },
						{ type: 'textinput', id: 'a', label: 'A again' },
						{ type: 'textinput', id: 'b', label: 'B' },
					],
					callback: vi.fn(),
				},
			} as unknown as CompanionActionDefinitions)

			const warns = warnMessages()
			expect(warns).toHaveLength(1)
			expect(warns[0]).toContain('reuse the same id')
			expect(warns[0]).toContain(`${mockDefinitionId} (a)`)

			// Only the first usage of each id should be passed to the host
			expect(setActionDefinitions).toHaveBeenCalledTimes(1)
			expect(setActionDefinitions.mock.calls[0][0][0].options).toEqual([
				{ type: 'textinput', id: 'a', label: 'A' },
				{ type: 'textinput', id: 'b', label: 'B' },
			])
		})

		it('no warning for unique option ids', () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [
						{ type: 'textinput', id: 'a', label: 'A' },
						{ type: 'textinput', id: 'b', label: 'B' },
					],
					callback: vi.fn(),
				},
			} as unknown as CompanionActionDefinitions)

			expect(warnMessages()).toHaveLength(0)
		})
	})

	describe('execute action', () => {
		// A constant signal that will never abort
		const neverAbortSignal = new AbortController().signal

		it('definition not found', async () => {
			const { manager } = createManager()

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: false,
				errorMessage: `Action definition not found for: ${mockDefinitionId}`,
			})
		})

		it('success without result', async () => {
			const { manager } = createManager()

			const callback = vi.fn(() => 'this value must be discarded')
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback,
				} as unknown as CompanionActionDefinition,
			})

			await expect(manager.handleExecuteAction(action, 'surface0', neverAbortSignal)).resolves.toEqual({
				success: true,
				result: undefined,
			})

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).lastCalledWith(
				{
					id: actionId,
					actionId: mockDefinitionId,
					controlId: action.controlId,
					options: action.options,
					surfaceId: 'surface0',
				},
				expect.anything(),
			)
		})

		it('success with result', async () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(async () => ({ abc: 123 })),
					hasResult: true,
				},
			})

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: true,
				result: { abc: 123 },
			})
		})

		it('callback throws an Error', async () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(() => {
						throw new Error('something failed')
					}),
				},
			})

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: false,
				errorMessage: 'something failed',
			})
		})

		it('callback throws a non-Error', async () => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(() => {
						// eslint-disable-next-line @typescript-eslint/only-throw-error
						throw 'a string error'
					}),
				},
			})

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: false,
				errorMessage: 'a string error',
			})
		})

		it('setCustomVariableValue is forwarded with the controlId', async () => {
			const { manager, setCustomVariableValue } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn((_event, context: CompanionActionContext) => {
						context.setCustomVariableValue('my-var', 'value1')
					}),
				},
			})

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: true,
				result: undefined,
			})

			expect(setCustomVariableValue).toHaveBeenCalledTimes(1)
			expect(setCustomVariableValue).lastCalledWith(action.controlId, 'my-var', 'value1')
		})

		it('signal is passed through to the callback context', async () => {
			const { manager } = createManager()

			const callback = vi.fn((_event, context: CompanionActionCallbackContext) => {
				expect(context.signal).toBe(neverAbortSignal)
			})
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback,
				},
			})

			await expect(manager.handleExecuteAction(action, undefined, neverAbortSignal)).resolves.toEqual({
				success: true,
				result: undefined,
			})

			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('aborted before execution skips the callback', async () => {
			const { manager } = createManager()

			const callback = vi.fn()
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback,
				},
			})

			const abortController = new AbortController()
			abortController.abort()

			await expect(manager.handleExecuteAction(action, undefined, abortController.signal)).resolves.toEqual({
				success: false,
				errorMessage: 'Action execution was aborted',
			})

			expect(callback).toHaveBeenCalledTimes(0)
		})

		it('callback error is ignored when aborted mid-execution', async () => {
			const { manager } = createManager()

			let rejectCurrent: ((error: Error) => void) | undefined
			const callback = vi.fn(async () => {
				return new Promise<void>((_resolve, reject) => {
					rejectCurrent = reject
				})
			})
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback,
				},
			})

			const abortController = new AbortController()
			const execution = manager.handleExecuteAction(action, undefined, abortController.signal)

			expect(callback).toHaveBeenCalledTimes(1)
			abortController.abort()
			rejectCurrent!(new Error('something failed'))

			await expect(execution).resolves.toEqual({
				success: false,
				errorMessage: 'Action execution was aborted',
			})
		})

		it('callback success is reported when aborted mid-execution', async () => {
			const { manager } = createManager()

			let resolveCurrent: ((value: JsonValue) => void) | undefined
			const callback = vi.fn(async () => {
				return new Promise<JsonValue>((resolve) => {
					resolveCurrent = resolve
				})
			})
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback,
					hasResult: true,
				},
			})

			const abortController = new AbortController()
			const execution = manager.handleExecuteAction(action, undefined, abortController.signal)

			expect(callback).toHaveBeenCalledTimes(1)
			abortController.abort()
			resolveCurrent!({ abc: 123 })

			await expect(execution).resolves.toEqual({
				success: true,
				result: { abc: 123 },
			})
		})
	})

	describe('update actions', () => {
		function createManagerWithSubscribe(skipUnsubscribeOnOptionsChange?: boolean) {
			const created = createManager()

			const subscribe = vi.fn()
			const unsubscribe = vi.fn()
			created.manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					subscribe,
					unsubscribe,
					optionsToMonitorForSubscribe: [],
					skipUnsubscribeOnOptionsChange,
				},
			})

			return { ...created, subscribe, unsubscribe }
		}

		it('subscribe called on insert', () => {
			const { manager, subscribe, unsubscribe } = createManagerWithSubscribe()

			manager.handleUpdateActions({ [actionId]: action })

			expect(subscribe).toHaveBeenCalledTimes(1)
			expect(subscribe).lastCalledWith(
				{
					id: actionId,
					actionId: mockDefinitionId,
					controlId: action.controlId,
					options: action.options,
				},
				expect.anything(),
			)
			expect(unsubscribe).toHaveBeenCalledTimes(0)
		})

		it('unsubscribe and subscribe called on update', () => {
			const { manager, subscribe, unsubscribe } = createManagerWithSubscribe()

			manager.handleUpdateActions({ [actionId]: action })
			vi.clearAllMocks()

			const updatedAction: ActionInstance = { ...action, options: { changed: true } }
			manager.handleUpdateActions({ [actionId]: updatedAction })

			expect(unsubscribe).toHaveBeenCalledTimes(1)
			expect(unsubscribe).lastCalledWith(
				{
					id: actionId,
					actionId: mockDefinitionId,
					controlId: action.controlId,
					options: action.options,
				},
				expect.anything(),
			)
			expect(subscribe).toHaveBeenCalledTimes(1)
			expect(subscribe).lastCalledWith(
				{
					id: actionId,
					actionId: mockDefinitionId,
					controlId: action.controlId,
					options: updatedAction.options,
				},
				expect.anything(),
			)
		})

		it('unsubscribe called on delete', () => {
			const { manager, subscribe, unsubscribe } = createManagerWithSubscribe()

			manager.handleUpdateActions({ [actionId]: action })
			vi.clearAllMocks()

			manager.handleUpdateActions({ [actionId]: null })

			expect(unsubscribe).toHaveBeenCalledTimes(1)
			expect(subscribe).toHaveBeenCalledTimes(0)

			// The instance is gone, so a manual subscribe of everything calls nothing
			manager.subscribeActions([])
			expect(subscribe).toHaveBeenCalledTimes(0)
		})

		it('skipUnsubscribeOnOptionsChange skips unsubscribe on update but not delete', () => {
			const { manager, subscribe, unsubscribe } = createManagerWithSubscribe(true)

			manager.handleUpdateActions({ [actionId]: action })
			vi.clearAllMocks()

			// Update: no unsubscribe, but a new subscribe
			manager.handleUpdateActions({ [actionId]: { ...action, options: { changed: true } } })
			expect(unsubscribe).toHaveBeenCalledTimes(0)
			expect(subscribe).toHaveBeenCalledTimes(1)

			// Delete: unsubscribe still happens
			manager.handleUpdateActions({ [actionId]: null })
			expect(unsubscribe).toHaveBeenCalledTimes(1)
		})

		it('ignores instances with reserved ids', () => {
			const mockLogger = vi.fn()
			global.COMPANION_LOGGER = mockLogger
			try {
				const { manager, subscribe } = createManagerWithSubscribe()

				manager.handleUpdateActions({ ['__proto__']: action })

				expect(subscribe).toHaveBeenCalledTimes(0)

				const warnCalls = mockLogger.mock.calls.filter(([, level]) => level === 'warn')
				expect(warnCalls).toHaveLength(1)
				expect(warnCalls[0][2]).toContain('reserved id')
			} finally {
				global.COMPANION_LOGGER = undefined
			}
		})

		it('setCustomVariableValue is not available during subscribe', () => {
			const { manager } = createManager()

			let capturedContext: CompanionActionContext | undefined
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					subscribe: vi.fn((_action, context) => {
						capturedContext = context
					}),
					optionsToMonitorForSubscribe: [],
				},
			})

			manager.handleUpdateActions({ [actionId]: action })

			expect(capturedContext).toBeTruthy()
			expect(() => capturedContext!.setCustomVariableValue('my-var', 'value1')).toThrow(
				'setCustomVariableValue is not available during subscribe',
			)
		})
	})

	describe('subscribeActions/unsubscribeActions', () => {
		function createManagerWithInstances() {
			const created = createManager()

			const subscribe = vi.fn()
			const unsubscribe = vi.fn()
			const subscribe2 = vi.fn()
			const unsubscribe2 = vi.fn()
			created.manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					subscribe,
					unsubscribe,
					optionsToMonitorForSubscribe: [],
				},
				[mockDefinitionId2]: {
					name: 'Definition1',
					options: [],
					callback: vi.fn(),
					subscribe: subscribe2,
					unsubscribe: unsubscribe2,
					optionsToMonitorForSubscribe: [],
				},
			})

			created.manager.handleUpdateActions({
				[actionId]: action,
				[actionId2]: action2,
			})
			vi.clearAllMocks()

			return { ...created, subscribe, unsubscribe, subscribe2, unsubscribe2 }
		}

		it('subscribe all', () => {
			const { manager, subscribe, subscribe2 } = createManagerWithInstances()

			manager.subscribeActions([])

			expect(subscribe).toHaveBeenCalledTimes(1)
			expect(subscribe2).toHaveBeenCalledTimes(1)
		})

		it('subscribe filtered by actionIds', () => {
			const { manager, subscribe, subscribe2 } = createManagerWithInstances()

			manager.subscribeActions([mockDefinitionId2, 'fake-id'])

			expect(subscribe).toHaveBeenCalledTimes(0)
			expect(subscribe2).toHaveBeenCalledTimes(1)
		})

		it('unsubscribe all', () => {
			const { manager, unsubscribe, unsubscribe2 } = createManagerWithInstances()

			manager.unsubscribeActions([])

			expect(unsubscribe).toHaveBeenCalledTimes(1)
			expect(unsubscribe2).toHaveBeenCalledTimes(1)
		})

		it('unsubscribe filtered by actionIds', () => {
			const { manager, unsubscribe, unsubscribe2 } = createManagerWithInstances()

			manager.unsubscribeActions([mockDefinitionId])

			expect(unsubscribe).toHaveBeenCalledTimes(1)
			expect(unsubscribe2).toHaveBeenCalledTimes(0)
		})
	})

	describe('learn values', () => {
		it('no implementation', async (ctx) => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
				},
			})

			await expect(manager.handleLearnAction(action, ctx.signal)).resolves.toEqual({ options: undefined })
		})

		it('with implementation', async (ctx) => {
			const { manager } = createManager()

			const learn = vi.fn(() => ({ abc: 123 }))
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn,
				},
			})

			await expect(manager.handleLearnAction(action, ctx.signal)).resolves.toEqual({ options: { abc: 123 } })
			expect(learn).toHaveBeenCalledTimes(1)
			expect(learn).lastCalledWith(
				{
					id: actionId,
					actionId: mockDefinitionId,
					controlId: action.controlId,
					options: action.options,
					surfaceId: undefined,
				},
				expect.anything(),
			)
		})

		it('signal is forwarded to learn callback context', async () => {
			const { manager } = createManager()

			let capturedSignal: AbortSignal | undefined
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn: vi.fn((_action, context) => {
						capturedSignal = context.signal
						return { abc: 123 }
					}),
				},
			})

			const controller = new AbortController()
			await manager.handleLearnAction(action, controller.signal)

			expect(capturedSignal).toBe(controller.signal)
			expect(capturedSignal!.aborted).toBe(false)
		})

		it('pre-aborted signal skips learn callback', async () => {
			const { manager } = createManager()

			const learn = vi.fn(() => ({ abc: 123 }))
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn,
				},
			})

			const controller = new AbortController()
			controller.abort()

			await expect(manager.handleLearnAction(action, controller.signal)).resolves.toEqual({ options: undefined })
			expect(learn).toHaveBeenCalledTimes(0)
		})

		it('result is discarded when aborted mid-execution', async () => {
			const { manager } = createManager()

			const controller = new AbortController()
			const learn = vi.fn(async (_action: unknown, context: { signal: AbortSignal }) => {
				return new Promise<{ abc: number }>((resolve) => {
					context.signal.addEventListener('abort', () => resolve({ abc: 123 }))
				})
			})
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn,
				},
			})

			const learnPromise = manager.handleLearnAction(action, controller.signal)

			controller.abort()

			await expect(learnPromise).resolves.toEqual({ options: undefined })
			expect(learn).toHaveBeenCalledTimes(1)
		})

		it('learn throwing rejects when not aborted', async (ctx) => {
			const { manager } = createManager()

			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn: vi.fn(() => {
						throw new Error('learn failed')
					}),
				},
			})

			await expect(manager.handleLearnAction(action, ctx.signal)).rejects.toThrow('learn failed')
		})

		it('learn throwing is swallowed when aborted', async () => {
			const { manager } = createManager()

			const controller = new AbortController()
			manager.setActionDefinitions({
				[mockDefinitionId]: {
					name: 'Definition0',
					options: [],
					callback: vi.fn(),
					learn: vi.fn(async () => {
						controller.abort()
						throw new Error('learn failed')
					}),
				},
			})

			await expect(manager.handleLearnAction(action, controller.signal)).resolves.toEqual({ options: undefined })
		})
	})
})
