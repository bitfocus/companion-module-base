import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { literal } from '../../util.js'
import {
	CompanionMigrationAction,
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
} from '../../module-api/upgrade.js'
import { runThroughUpgradeScripts } from '../upgrade.js'
import { UpgradeActionInstance } from '../../host-api/api.js'

type MockUpgradeScript<TConfig> = Mock<CompanionStaticUpgradeScript<TConfig, any>>

function clone<T>(val: T): T {
	return JSON.parse(JSON.stringify(val))
}

const createMockScripts = <TConfig>(count: number): MockUpgradeScript<TConfig>[] => {
	const result: MockUpgradeScript<TConfig>[] = []

	for (let i = 0; i < count; i++)
		result.push(
			vi.fn((..._args: Parameters<CompanionStaticUpgradeScript<TConfig>>) =>
				literal<CompanionStaticUpgradeResult<TConfig>>({
					updatedActions: [],
					updatedFeedbacks: [],
					updatedConfig: null,
				}),
			),
		)

	return result
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
			return literal<CompanionStaticUpgradeResult<any>>({
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
			disabled: false,
			actionId: 'my-action',
			options: {
				a: 1,
				b: 2,
			},
			controlId: 'control0',
		}
		const action1Before: UpgradeActionInstance = {
			id: 'act1',
			upgradeIndex: null,
			disabled: false,
			actionId: 'my-action',
			options: {
				c: 1,
				d: 2,
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
			return literal<CompanionStaticUpgradeResult<any>>({
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

	it('an actions to upgrade, from earlier than the rest', () => {
		const action0Before: UpgradeActionInstance = {
			id: 'act0',
			upgradeIndex: null,
			disabled: false,
			actionId: 'my-action',
			options: {
				a: 1,
				b: 2,
			},
			controlId: 'control0',
		}
		const action1Before: UpgradeActionInstance = {
			id: 'act1',
			upgradeIndex: -1,
			disabled: false,
			actionId: 'my-action',
			options: {
				c: 1,
				d: 2,
			},
			controlId: 'control1',
		}

		const scripts = createMockScripts(2)
		scripts[1].mockImplementation((ctx, args) => {
			expect(args).toEqual(
				literal<CompanionStaticUpgradeProps<any>>({
					actions: [stripActionInstance(action1Before), stripActionInstance(action0Before)],
					feedbacks: [],
					config: null,
					secrets: null,
				}),
			)

			args.actions[1].actionId = 'new-action'
			return literal<CompanionStaticUpgradeResult<any>>({
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
