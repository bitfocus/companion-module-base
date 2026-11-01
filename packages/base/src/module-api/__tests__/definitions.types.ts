/**
 * Type-level tests for the definitions apis on InstanceBase.
 * This file is checked by `tsc` (via tsconfig.tests.json), it does not contain any runtime tests.
 */
import type { InstanceTypes } from '../base.js'
import type { CompanionActionDefinitionsApi, CompanionVariableDefinitionsApi } from '../definitions.js'

interface TestManifest extends InstanceTypes {
	config: Record<string, never>
	secrets: undefined
	actions: {
		first: { options: { foo: string } }
		second: { options: { bar: number } }
	}
	feedbacks: Record<string, never>
	variables: {
		varA: string
		varB: number
	}
}

declare const actions: CompanionActionDefinitionsApi<TestManifest>
declare const variables: CompanionVariableDefinitionsApi<TestManifest>
declare const looseVariables: CompanionVariableDefinitionsApi

export function check(): void {
	// set accepts a partial
	actions.set({ first: { name: 'First', options: [], callback: () => {} } })
	actions.set({ second: undefined })
	variables.set({ varA: { name: 'A' } })

	// setAll requires every key
	// @ts-expect-error missing varB
	variables.setAll({ varA: { name: 'A' } })
	variables.setAll({ varA: { name: 'A' }, varB: { name: 'B' } })

	// remove only accepts known ids
	actions.remove(['first'])
	// @ts-expect-error unknown id
	actions.remove(['third'])

	// @ts-expect-error unknown id
	variables.set({ varC: { name: 'C' } })

	// a loosely typed manifest accepts any ids
	looseVariables.set({ anything: { name: 'Anything' } })
	looseVariables.remove(['anything'])
}
