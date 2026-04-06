import type { JsonValue } from '../common/json-value.js'
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

/** An action's options type must always be specified. */
export interface CompanionActionSchemaOptions<TOptions extends CompanionOptionValues> {
	/** The types of the action's options. */
	options: TOptions
}

/**
 * An action whose callback returns a result must specify the result type.
 */
export interface CompanionActionSchemaWithResult<
	TOptions extends CompanionOptionValues,
	TResult extends JsonValue,
> extends CompanionActionSchemaOptions<TOptions> {
	/**
	 * The action callback returns a value of this type (possibly behind a
	 * promise).
	 */
	result: TResult
}

/**
 * An action whose callback doesn't return a result must not specify the result
 * type.
 */
export interface CompanionActionSchemaNoResult<
	TOptions extends CompanionOptionValues,
> extends CompanionActionSchemaOptions<TOptions> {
	/**
	 * When no result type is specified, the action callback returns `void`
	 * (possibly behind a promise).
	 */
	result?: never
}

/**
 * Two kinds of action can be described:
 *
 *   * {@link CompanionActionSchemaWithResult}: an action with indicated options
 *     that produces a result
 *   * {@link CompanionActionSchemaNoResult}: an action with indicated options
 *     that produces no result
 */
export type CompanionActionSchema<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
	TResult extends JsonValue | void = JsonValue | void,
> = TResult extends JsonValue
	? CompanionActionSchemaWithResult<TOptions, TResult>
	: TResult extends void
		? CompanionActionSchemaNoResult<TOptions>
		: never

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

/** Fields shared across all action definitions. */
export interface CompanionActionDefinitionBase<
	TOptions extends CompanionOptionValues,
	TResult extends JsonValue | void,
> {
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

	/**
	 * A function called when the callback executes, potentially returning a
	 * result value.
	 */
	callback: (action: CompanionActionEvent<TOptions>, context: CompanionActionContext) => Promise<TResult> | TResult
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
 * The definition of an action that returns a result must opt into returning a
 * result by specifying `hasResult: true`.
 */
export interface CompanionActionDefinitionCallbackWithResult<
	TOptions extends CompanionOptionValues,
	TResult extends JsonValue,
> extends CompanionActionDefinitionBase<TOptions, TResult> {
	/* The callback returns a result. */
	hasResult: true
}

/**
 * The definition of an action that doesn't return a result omits `hasResult` or
 * explicitly specifies `hasResult: false`.
 */
export interface CompanionActionDefinitionCallbackNoResult<
	TOptions extends CompanionOptionValues,
> extends CompanionActionDefinitionBase<TOptions, void> {
	/* The callback doesn't return a result. */
	hasResult?: false
}

/**
 * The definition of an action as one of two flavors, per the supplied type
 * arguments:
 *
 *   * {@link CompanionActionDefinitionCallbackWithResult}: an action whose
 *     callback returns a result
 *   * {@link CompanionActionDefinitionCallbackNoResult}: an action whose
 *     callback returns `void`
 */
export type CompanionActionDefinition<
	TSchema extends CompanionActionSchema<CompanionOptionValues> = CompanionActionSchema<CompanionOptionValues>,
> = TSchema['result'] extends JsonValue
	? CompanionActionDefinitionCallbackWithResult<TSchema['options'], TSchema['result']>
	: TSchema['result'] extends void
		? CompanionActionDefinitionCallbackNoResult<TSchema['options']>
		: never

/**
 * The definition of a set of actions, as a record of
 * {@link CompanionActionDefinition}s.
 */
export type CompanionActionDefinitions<
	Tschemas extends Record<string, CompanionActionSchema> = Record<string, CompanionActionSchema>,
> = {
	[K in keyof Tschemas]: Tschemas[K] extends infer Schema // just to abbreviate
		? Schema extends CompanionActionSchema<infer Options, infer Result>
			? Result extends JsonValue
				? CompanionActionDefinitionCallbackWithResult<Options, Result>
				: CompanionActionDefinitionCallbackNoResult<Options>
			: never
		: never
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
