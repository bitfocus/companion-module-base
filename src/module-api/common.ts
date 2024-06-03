import type { ConditionalKeys } from 'type-fest'
import type { CompanionInputFieldBase } from './input.js'

/**
 * Utility functions available in the context of an action/feedback
 */
export interface CompanionCommonCallbackContext {
	/**
	 * Parse and replace all the variables in a string
	 * Note: it is important to use this version when in a feedback, so that the feedback will react properly when the variables parsed change
	 * @param text The text to parse
	 * @returns The string with variables replaced with their values
	 */
	parseVariablesInString(text: string): Promise<string>
}

export type StrictOptionsObject<TOptions, TFields extends CompanionInputFieldBase> = {
	[K in keyof TOptions]: undefined extends TOptions[K] ? TFields | undefined : TFields
}

/**
 *
 */
export interface StrictOptions<TOptions> {
	getRawJson(): any
	getRaw<Key extends keyof TOptions>(fieldName: Key): TOptions[Key] | undefined
	getPlainString<Key extends ConditionalKeys<TOptions, string>>(fieldName: Key): TOptions[Key]
	getPlainNumber<Key extends ConditionalKeys<TOptions, number>>(fieldName: Key): TOptions[Key]
	getPlainBoolean<Key extends ConditionalKeys<TOptions, boolean>>(fieldName: Key): boolean

	getParsedString<Key extends ConditionalKeys<TOptions, string | undefined>>(fieldName: Key): Promise<string>
	getParsedNumber<Key extends ConditionalKeys<TOptions, string | undefined>>(fieldName: Key): Promise<number>
}
