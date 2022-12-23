import { CompanionCommonCallbackContext } from './common.js'
import {
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

export type CompanionActionContext = CompanionCommonCallbackContext

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
	// Future: the contents of this should be re-evaluated in v1

	/** @deprecated */
	readonly _deviceId: string | undefined
	/** @deprecated */
	readonly _page: number
	/** @deprecated */
	readonly _bank: number
}
