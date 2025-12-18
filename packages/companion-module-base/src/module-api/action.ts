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

export type SomeCompanionActionInputField =
	| CompanionInputFieldStaticText
	| CompanionInputFieldColor
	| CompanionInputFieldTextInput
	| CompanionInputFieldDropdown
	| CompanionInputFieldMultiDropdown
	| CompanionInputFieldNumber
	| CompanionInputFieldCheckbox
	| CompanionInputFieldCustomVariable

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
export interface CompanionActionDefinition {
	/** Name to show in the actions list */
	name: string
	/** Additional description of the action */
	description?: string
	/** The input fields for the action */
	options: SomeCompanionActionInputField[]

	/**
	 * Ignore changes to certain options and don't allow them to trigger the subscribe/unsubscribe callbacks
	 * This allows for ensuring that the subscribe callback is only called when values the action cares about change
	 */
	optionsToIgnoreForSubscribe?: string[]

	/**
	 * If true, the unsubscribe callback will not be called when the options change, only when the action is removed or disabled
	 */
	skipUnsubscribeOnOptionsChange?: boolean

	/** Called to execute the action */
	callback: (action: CompanionActionEvent, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report the existence of an action
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (action: CompanionActionInfo, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report an action has been edited/removed
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (action: CompanionActionInfo, context: CompanionActionContext) => Promise<void> | void

	/**
	 * The user requested to 'learn' the values for this action.
	 */
	learn?: (
		action: CompanionActionEvent,
		context: CompanionActionContext,
	) => CompanionOptionValues | undefined | Promise<CompanionOptionValues | undefined>

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
export interface CompanionActionDefinitions {
	[actionId: string]: CompanionActionDefinition | undefined
}

/**
 * Basic information about an instance of an action
 */
export interface CompanionActionInfo {
	/** The unique id for this action */
	readonly id: string
	/** The unique id for the location of this action */
	readonly controlId: string
	/** The id of the action definition */
	readonly actionId: string
	/** The user selected options for the action */
	readonly options: CompanionOptionValues
}

/**
 * Extended information for execution of an action
 */
export interface CompanionActionEvent extends CompanionActionInfo {
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
