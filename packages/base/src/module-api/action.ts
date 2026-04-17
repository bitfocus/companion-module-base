import type { CompanionCommonCallbackContext } from './common.js'
import type {
	CompanionOptionValues,
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
	CompanionInputFieldCustomVariable,
} from './input.js'
import type { CompanionVariableValue } from './variable.js'
import type { StringKeys } from '../util.js'

export type SomeCompanionActionInputField<TKey extends string = string> =
	| CompanionInputFieldStaticText<TKey>
	| CompanionInputFieldColor<TKey>
	| CompanionInputFieldTextInput<TKey>
	| CompanionInputFieldDropdown<TKey>
	| CompanionInputFieldMultiDropdown<TKey>
	| CompanionInputFieldNumber<TKey>
	| CompanionInputFieldCheckbox<TKey>
	| CompanionInputFieldCustomVariable<TKey>

export interface CompanionActionSchema<TOptions extends CompanionOptionValues> {
	options: TOptions
}

/**
 * Utility functions available in the context of the current action
 */
export interface CompanionActionContext extends CompanionCommonCallbackContext {
	/**
	 * @deprecated Experimental: This method may change without notice. Do not use!
	 * Set the value of a custom variable
	 * @param variableName
	 * @param value
	 * @returns Promise which resolves upon success, or rejects if the variable no longer exists
	 */
	setCustomVariableValue(variableName: string, value: CompanionVariableValue): void
}

/**
 * The definition of an action
 */
export interface CompanionActionDefinition<TOptions extends CompanionOptionValues = CompanionOptionValues> {
	/** Name to show in the actions list */
	name: string
	/**
	 * Alternate value to use when sorting the list of actions
	 * By default, the actions are ordered by the name field, but you can override this without altering the visible name by setting this value
	 */
	sortName?: string
	/** Additional description of the action */
	description?: string
	/** The input fields for the action */
	options: SomeCompanionActionInputField<StringKeys<TOptions>>[]

	/**
	 * Only monitor the specified options for re-running the subscribe/unsubscribe callbacks
	 * It is recommended to set this for all actions using subscribe, to reduce unnecessary calls when the user has the values driven by expressions.
	 * If not set, all options changes will trigger unsubscribe/subscribe
	 */
	optionsToMonitorForSubscribe?: StringKeys<TOptions>[]

	/**
	 * If true, the unsubscribe callback will not be called when the options change, only when the action is removed or disabled
	 */
	skipUnsubscribeOnOptionsChange?: boolean

	/** Called to execute the action */
	callback: (action: CompanionActionEvent<TOptions>, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report the existence of an action
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (action: CompanionActionInfo<TOptions>, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report an action has been edited/removed
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (action: CompanionActionInfo<TOptions>, context: CompanionActionContext) => Promise<void> | void

	/**
	 * The user requested to 'learn' the values for this action.
	 * Note: As of 2.0, you should only return the values that have been learned, so that expressions in any id fields will be preserved
	 */
	learn?: (
		action: CompanionActionEvent<TOptions>,
		context: CompanionActionContext,
	) => Partial<TOptions> | undefined | Promise<Partial<TOptions> | undefined>

	/**
	 * Timeout for the 'learn' function (in milliseconds)
	 * Companion sets a default value of 5s, to ensure that the learn does not get stuck never completing
	 * You can change this if this number does not work for you, but you should keep it to a sensible value
	 */
	learnTimeout?: number
}

/**
 * The definitions of a group of actions
 */
export type CompanionActionDefinitions<
	Tschemas extends Record<string, CompanionActionSchema<CompanionOptionValues>> = Record<
		string,
		CompanionActionSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof Tschemas]: CompanionActionDefinition<Tschemas[K]['options']> | false | undefined
}

/**
 * Basic information about an instance of an action
 */
export interface CompanionActionInfo<TOptions extends CompanionOptionValues = CompanionOptionValues> {
	/** The unique id for this action */
	readonly id: string
	/** The unique id for the location of this action */
	readonly controlId: string
	/** The id of the action definition */
	readonly actionId: string
	/** The user selected options for the action */
	readonly options: TOptions
}

/**
 * Extended information for execution of an action
 */
export interface CompanionActionEvent<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
> extends CompanionActionInfo<TOptions> {
	/** Identifier of the surface which triggered this action */
	readonly surfaceId: string | undefined
}

/**
 * Information about an action which has been recorded
 */
export interface CompanionRecordedAction {
	/** The id of the action definition */
	actionId: string
	/** The user selected options for the action */
	options: CompanionOptionValues

	/**
	 * Delay to give to this action
	 * This is always relative to the previous action
	 */
	delay?: number
}
