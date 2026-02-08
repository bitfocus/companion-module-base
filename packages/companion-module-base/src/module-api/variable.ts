import type { StringKeys } from '../util.js'
import type { JsonValue } from '../common/json-value.js'

/**
 * The definition of a variable
 */
export interface CompanionVariableDefinition<TManifest extends CompanionVariableValues = CompanionVariableValues> {
	variableId: StringKeys<TManifest>
	name: string
}

/**
 * A set of values of some variables
 */
export interface CompanionVariableValues {
	[variableId: string]: CompanionVariableValue | undefined
}

/**
 * The value of a variable
 */
export type CompanionVariableValue = JsonValue | undefined
