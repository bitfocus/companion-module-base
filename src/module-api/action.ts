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

export type SomeTypedCompanionActionInputField<TOptions extends Record<string, any>, Id extends keyof TOptions> =
	| Omit<CompanionInputFieldDropdown<TOptions, TOptions[Id], Id>, 'id'>
	| (TOptions[Id] extends number
			?
					| Omit<CompanionInputFieldColor<TOptions, Id>, 'id'>
					| Omit<CompanionInputFieldNumber<TOptions, Id>, 'id'>
					| Omit<CompanionInputFieldCustomVariable<TOptions, Id>, 'id'>
			: TOptions[Id] extends string
			?
					| Omit<CompanionInputFieldTextInput<TOptions, Id>, 'id'>
					| Omit<CompanionInputFieldCustomVariable<TOptions, Id>, 'id'>
			: TOptions[Id] extends boolean
			? Omit<CompanionInputFieldCheckbox<TOptions, Id>, 'id'>
			: TOptions[Id] extends string[] | number[]
			? Omit<CompanionInputFieldMultiDropdown<TOptions, TOptions[Id][0], Id>, 'id'>
			: never)

export type SomeTypedCompanionActionInputFieldObject<TOptions extends Record<string, any>> = {
	[K in keyof TOptions]: SomeTypedCompanionActionInputField<TOptions, K>
}

/**
 * The definition of an action
 */
export interface CompanionActionDefinition<TOptions extends Record<string, any> = CompanionOptionValues> {
	/** Name to show in the actions list */
	name: string
	/** Additional description of the action */
	description?: string
	/** The input fields for the action */
	options: SomeCompanionActionInputField[] | SomeTypedCompanionActionInputFieldObject<TOptions>
	/** Called to execute the action */
	callback: (action: CompanionActionEvent<TOptions>) => Promise<void> | void
	/**
	 * Called to report the existence of an action
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (action: CompanionActionInfo<TOptions>) => Promise<void> | void
	/**
	 * Called to report an action has been edited/removed
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (action: CompanionActionInfo<TOptions>) => Promise<void> | void

	/**
	 * The user requested to 'learn' the values for this action.
	 */
	learn?: (
		action: CompanionActionEvent<TOptions>
	) => CompanionOptionValues | undefined | Promise<CompanionOptionValues | undefined>
}

/**
 * The definitions of a group of actions
 */
export type CompanionActionDefinitions<T extends Record<string, any> = { [id: string]: CompanionOptionValues }> = {
	[actionId in keyof T]: CompanionActionDefinition<T[actionId]> | undefined
}

/**
 * Basic information about an instance of an action
 */
export interface CompanionActionInfo<TOptions = CompanionOptionValues> {
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
export interface CompanionActionEvent<TOptions = CompanionOptionValues> extends CompanionActionInfo<TOptions> {
	// Future: the contents of this should be re-evaluated in v1

	/** @deprecated */
	readonly _deviceId: string | undefined
	/** @deprecated */
	readonly _page: number
	/** @deprecated */
	readonly _bank: number
}
