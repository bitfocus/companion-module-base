import type { CompanionCommonCallbackContext, StrictOptions, StrictOptionsObject } from './common.js'
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
export type CompanionActionContext = CompanionCommonCallbackContext

/**
 * The definition of an action
 */
export interface CompanionActionDefinition {
	type?: 'loose'

	/** Name to show in the actions list */
	name: string
	/** Additional description of the action */
	description?: string
	/** The input fields for the action */
	options: SomeCompanionActionInputField[]
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
		context: CompanionActionContext
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
 * Basic information about an instance of an action
 */
export interface StrictActionInfo<TOptions> {
	/** The unique id for this action */
	readonly id: string
	/** The unique id for the location of this action */
	readonly controlId: string
	/** The id of the action definition */
	readonly actionId: string
	/** The user selected options for the action */
	readonly options: StrictOptions<TOptions>
}
/**
 * Extended information for execution of an action
 */
export interface StrictActionEvent<TOptions> extends StrictActionInfo<TOptions> {
	/** Identifier of the surface which triggered this action */
	readonly surfaceId: string | undefined
}

export interface StrictActionDefinition<TOptions> {
	type: 'strict'

	/** Name to show in the actions list */
	name: string
	/** Additional description of the action */
	description?: string
	/** The input fields for the action */
	options: StrictOptionsObject<TOptions, SomeCompanionActionInputField>

	/** Called to execute the action */
	callback: (action: StrictActionEvent<TOptions>, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report the existence of an action
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (action: StrictActionInfo<TOptions>, context: CompanionActionContext) => Promise<void> | void
	/**
	 * Called to report an action has been edited/removed
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (action: StrictActionInfo<TOptions>, context: CompanionActionContext) => Promise<void> | void
	/**
	 * The user requested to 'learn' the values for this action.
	 */
	learn?: (
		action: StrictActionEvent<TOptions>,
		context: CompanionActionContext
	) => TOptions | undefined | Promise<TOptions | undefined>
}

export type StrictActionDefinitions<TTypes> = {
	[Key in keyof TTypes]: StrictActionDefinition<TTypes[Key]> | undefined
}
