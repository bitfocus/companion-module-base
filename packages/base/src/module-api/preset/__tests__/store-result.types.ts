/**
 * Type-level tests for `storeResult` on preset actions.
 * This file is checked by `tsc` (via tsconfig.tests.json), it does not contain any runtime tests.
 */
import type { InstanceTypes } from '../../base.js'
import type { CompanionPresetAction, WithInternalActions } from '../definition.js'

interface TestManifest extends InstanceTypes {
	config: Record<string, never>
	secrets: undefined
	actions: {
		withResult: { options: { foo: string }; result: number }
		withoutResult: { options: { foo: string } }
	}
	feedbacks: Record<string, never>
	variables: Record<string, never>
}

type Action = CompanionPresetAction<WithInternalActions<TestManifest['actions']>>
type LooseAction = CompanionPresetAction

export const allowedWithResult: Action = {
	actionId: 'withResult',
	options: { foo: 'a' },
	storeResult: { type: 'local-variable', variableName: 'out' },
}

export const rejectedWithoutResult: Action = {
	actionId: 'withoutResult',
	options: { foo: 'a' },
	// @ts-expect-error action has no result
	storeResult: { type: 'local-variable', variableName: 'out' },
}

export const rejectedInternal: Action = {
	actionId: 'internal:wait',
	options: { time: 1 },
	// @ts-expect-error internal actions have no result
	storeResult: { type: 'local-variable', variableName: 'out' },
}

export const rejectedNonLocal: Action = {
	actionId: 'withResult',
	options: { foo: 'a' },
	// @ts-expect-error only local variables are supported
	storeResult: { type: 'custom-variable', variableName: 'out' },
}

export const allowedLoose: LooseAction = {
	actionId: 'anything',
	options: {},
	storeResult: { type: 'local-variable', variableName: 'out' },
}
