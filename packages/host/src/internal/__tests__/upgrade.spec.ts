import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
	literal,
	type CompanionMigrationAction,
	type CompanionMigrationFeedback,
	type CompanionStaticUpgradeProps,
	type CompanionStaticUpgradeResult,
	type CompanionStaticUpgradeScript,
	type JsonObject,
} from '@companion-module/base'
import type { UpgradeActionInstance, UpgradeFeedbackInstance } from '../../context.js'
import { runThroughUpgradeScripts } from '../upgrade.js'

type MockUpgradeScript<TConfig extends JsonObject, TSecrets extends JsonObject> = Mock<
	CompanionStaticUpgradeScript<TConfig, TSecrets>
>

function clone<T>(val: T): T {
	return JSON.parse(JSON.stringify(val))
}

const createMockScripts = <TConfig extends JsonObject, TSecrets extends JsonObject>(
	count: number,
): MockUpgradeScript<TConfig, TSecrets>[] => {
	const result: MockUpgradeScript<TConfig, TSecrets>[] = []

	for (let i = 0; i < count; i++)
		result.push(
			vi.fn((..._args: Parameters<CompanionStaticUpgradeScript<TConfig, TSecrets>>) =>
				literal<CompanionStaticUpgradeResult<TConfig, TSecrets>>({
					updatedActions: [],
					updatedFeedbacks: [],
					updatedConfig: null,
				}),
			),
		)

	return result
}

function makeFeedbacksInput(...feedbacks: UpgradeFeedbackInstance[]): UpgradeFeedbackInstance[] {
	const res: UpgradeFeedbackInstance[] = []
	for (const feedback of feedbacks) {
		res.push(clone(feedback))
	}
	return res
}

function makeActionsInput(...actions: UpgradeActionInstance[]): UpgradeActionInstance[] {
	const res: UpgradeActionInstance[] = []

	for (const action of actions) {
		// if (res[action.id]) throw new Error(`Duplicate id "${action.id}"`)
		res.push(clone(action))
	}

	return res
}

function stripActionInstance(action: UpgradeActionInstance): CompanionMigrationAction {
	return {
		id: action.id,
		controlId: action.controlId,
		actionId: action.actionId,
		options: action.options,
	}
}

describe('runThroughUpgradeScripts', () => {
	beforeEach(() => {
		// vi.useFakeTimers()

		vi.clearAllMocks()
	})

	it('nothing to upgrade', () => {
		const scripts = createMockScripts(2)
		const result = runThroughUpgradeScripts([], [], null, scripts, {}, {}, true)

		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toBeUndefined()
		expect(result.updatedSecrets).toBeUndefined()
		expect(result.updatedActions).toEqual([])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(0)
		expect(scripts[1]).toHaveBeenCalledTimes(0)
	})

	it('just the config to upgrade, from v-null', () => {
		const configBefore = {
			host: '127.0.0.1',
			something: true,
		}
		const secretsBefore = {
			secret: '123',
		}
		const scripts = createMockScripts(2)
		const result = runThroughUpgradeScripts([], [], null, scripts, { ...configBefore }, { ...secretsBefore }, false)

		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toEqual(undefined)
		expect(result.updatedSecrets).toEqual(undefined)
		expect(result.updatedActions).toEqual([])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(1)
		expect(scripts[1]).toHaveBeenCalledTimes(1)
	})
	it('just the config to upgrade, from v0', () => {
		const configBefore = {
			host: '127.0.0.1',
			something: true,
		}
		const scripts = createMockScripts(2)
		scripts[1].mockImplementation((ctx, args) => {
			expect(args.config).toBeTruthy()
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [],
				updatedFeedbacks: [],
				updatedConfig: {
					...args.config!,
					added: 123,
				},
			})
		})

		const result = runThroughUpgradeScripts([], [], 0, scripts, { ...configBefore }, {}, false)
		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toEqual({
			...configBefore,
			added: 123,
		})
		expect(result.updatedActions).toEqual([])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(0)
		expect(scripts[1]).toHaveBeenCalledTimes(1)
		expect(scripts[1]).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			literal<CompanionStaticUpgradeProps<any, any>>({
				actions: [],
				feedbacks: [],
				config: configBefore,
				secrets: {},
			}),
		)
	})
	it('just the secrets to upgrade, from v0', () => {
		const secretsBefore = {
			host: '127.0.0.1',
			something: true,
		}
		const scripts = createMockScripts(2)
		scripts[1].mockImplementation((ctx, args) => {
			expect(args.config).toBeTruthy()
			expect(args.secrets).toBeTruthy()
			return literal<CompanionStaticUpgradeResult<any, any>>({
				updatedActions: [],
				updatedFeedbacks: [],
				updatedConfig: null,
				updatedSecrets: {
					...args.secrets!,
					added: 123,
				},
			})
		})

		const result = runThroughUpgradeScripts([], [], 0, scripts, {}, { ...secretsBefore }, false)
		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toBeUndefined()
		expect(result.updatedSecrets).toEqual({
			...secretsBefore,
			added: 123,
		})
		expect(result.updatedActions).toEqual([])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(0)
		expect(scripts[1]).toHaveBeenCalledTimes(1)
		expect(scripts[1]).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			literal<CompanionStaticUpgradeProps<any, any>>({
				actions: [],
				feedbacks: [],
				config: {},
				secrets: secretsBefore,
			}),
		)
	})

	it('just the actions to upgrade, from v0', () => {
		const action0Before: UpgradeActionInstance = {
			id: 'act0',
			upgradeIndex: null,
			actionId: 'my-action',
			options: {
				a: { value: 1, isExpression: false },
				b: { value: 2, isExpression: false },
			},
			controlId: 'control0',
		}
		const action1Before: UpgradeActionInstance = {
			id: 'act1',
			upgradeIndex: null,
			actionId: 'my-action',
			options: {
				c: { value: 1, isExpression: false },
				d: { value: 2, isExpression: false },
			},
			controlId: 'control1',
		}

		const scripts = createMockScripts(2)
		scripts[1].mockImplementation((ctx, args) => {
			expect(args).toEqual(
				literal<CompanionStaticUpgradeProps<any, any>>({
					actions: [stripActionInstance(action0Before), stripActionInstance(action1Before)],
					feedbacks: [],
					config: null,
					secrets: null,
				}),
			)

			args.actions[0].actionId = 'new-action'
			args.actions[1].actionId = 'new-action' // Modified in place, but not reported as such
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [args.actions[0]],
				updatedFeedbacks: [],
				updatedConfig: null,
			})
		})

		const actionsInput = makeActionsInput(action0Before, action1Before)
		const result = runThroughUpgradeScripts(actionsInput, [], 0, scripts, {}, {}, true)

		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toBeUndefined()
		expect(result.updatedActions).toEqual([
			{
				...action0Before,
				actionId: 'new-action',
				upgradeIndex: 1,
			},
		])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(0)
		expect(scripts[1]).toHaveBeenCalledTimes(1)

		// Check input was mutated in place
		const expectedInput = makeActionsInput(action0Before, action1Before)
		expectedInput[0].actionId = 'new-action'
		expectedInput[0].upgradeIndex = 1
		expect(actionsInput).toEqual(expectedInput)
	})

	it('isInverted change in one script is visible to the next script', () => {
		const feedbackBefore: UpgradeFeedbackInstance = {
			id: 'fb0',
			upgradeIndex: -1,
			feedbackId: 'my-feedback',
			options: {},
			isInverted: { value: true, isExpression: false },
			controlId: 'control0',
		}

		const scripts = createMockScripts(2)

		// Script 0 flips isInverted to false
		scripts[0].mockImplementation((_ctx, args) => {
			const fb = args.feedbacks[0]
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [],
				updatedFeedbacks: [
					{
						...fb,
						isInverted: { value: false, isExpression: false },
					},
				],
				updatedConfig: null,
			})
		})

		// Script 1 must see the updated isInverted (false), not the original (true)
		let receivedIsInverted: unknown = 'not-called'
		scripts[1].mockImplementation((_ctx, args) => {
			receivedIsInverted = args.feedbacks[0]?.isInverted
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [],
				updatedFeedbacks: [],
				updatedConfig: null,
			})
		})

		runThroughUpgradeScripts([], makeFeedbacksInput(feedbackBefore), -1, scripts, {}, {}, true)

		expect(scripts[1]).toHaveBeenCalledTimes(1)
		// Bug: without the fix, script 1 would see the original isInverted: true
		expect(receivedIsInverted).toEqual({ value: false, isExpression: false })
	})

	it('style set by an earlier script is preserved and not overwritten by a later script', () => {
		const feedbackBefore: UpgradeFeedbackInstance = {
			id: 'fb0',
			upgradeIndex: -1,
			feedbackId: 'my-feedback',
			options: {},
			isInverted: undefined,
			controlId: 'control0',
		}

		const scripts = createMockScripts(2)

		// Script 0 sets style to red
		scripts[0].mockImplementation((_ctx, args) => {
			const fb = args.feedbacks[0]
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [],
				updatedFeedbacks: [
					literal<CompanionMigrationFeedback>({
						...fb,
						style: { bgcolor: 0xff0000 },
					}),
				],
				updatedConfig: null,
			})
		})

		// Script 1 tries to overwrite style to green — but should not win
		scripts[1].mockImplementation((_ctx, args) => {
			const fb = args.feedbacks[0]
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [],
				updatedFeedbacks: [
					literal<CompanionMigrationFeedback>({
						...fb,
						style: { bgcolor: 0x00ff00 },
					}),
				],
				updatedConfig: null,
			})
		})

		const result = runThroughUpgradeScripts([], makeFeedbacksInput(feedbackBefore), -1, scripts, {}, {}, true)

		expect(scripts[0]).toHaveBeenCalledTimes(1)
		expect(scripts[1]).toHaveBeenCalledTimes(1)
		// The first generation of style is preserved; later scripts cannot overwrite it
		expect(result.updatedFeedbacks[0]?.style).toEqual({ bgcolor: 0xff0000 })
	})

	it('an actions to upgrade, from earlier than the rest', () => {
		const action0Before: UpgradeActionInstance = {
			id: 'act0',
			upgradeIndex: null,
			actionId: 'my-action',
			options: {
				a: { value: 1, isExpression: false },
				b: { value: 2, isExpression: false },
			},
			controlId: 'control0',
		}
		const action1Before: UpgradeActionInstance = {
			id: 'act1',
			upgradeIndex: -1,
			actionId: 'my-action',
			options: {
				c: { value: 1, isExpression: false },
				d: { value: 2, isExpression: false },
			},
			controlId: 'control1',
		}

		const scripts = createMockScripts(2)
		scripts[1].mockImplementation((ctx, args) => {
			expect(args).toEqual(
				literal<CompanionStaticUpgradeProps<JsonObject, JsonObject>>({
					actions: [stripActionInstance(action1Before), stripActionInstance(action0Before)],
					feedbacks: [],
					config: null,
					secrets: null,
				}),
			)

			args.actions[1].actionId = 'new-action'
			return literal<CompanionStaticUpgradeResult<JsonObject, JsonObject>>({
				updatedActions: [args.actions[1]],
				updatedFeedbacks: [],
				updatedConfig: null,
			})
		})

		const actionsInput = makeActionsInput(action0Before, action1Before)
		const result = runThroughUpgradeScripts(actionsInput, [], 0, scripts, {}, {}, true)

		// Check result looks sane
		expect(result).toBeTruthy()
		expect(result.updatedConfig).toBeUndefined()
		expect(result.updatedActions).toEqual([
			{
				...action0Before,
				actionId: 'new-action',
				upgradeIndex: 1,
			},
			{
				// Reported to confirm the upgrade
				...action1Before,
				upgradeIndex: -1,
			},
		])
		expect(result.updatedFeedbacks).toEqual([])

		// check scripts
		expect(scripts).toHaveLength(2)
		expect(scripts[0]).toHaveBeenCalledTimes(1)
		expect(scripts[0].mock.calls[0][1].actions).toHaveLength(1)
		expect(scripts[1]).toHaveBeenCalledTimes(1)

		// Check input was mutated in place
		const expectedInput = makeActionsInput(action0Before, action1Before)
		expectedInput[0].actionId = 'new-action'
		expectedInput[0].upgradeIndex = 1
		expect(actionsInput).toEqual(expectedInput)
	})
})
