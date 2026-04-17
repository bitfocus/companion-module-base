import type { JsonValue } from '../common/json-value.js'
import type { CompanionCommonCallbackContext } from './common.js'
import type {
	CompanionOptionValues,
	CompanionInputFieldStaticText,
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldTextInput,
} from './input.js'
import type { CompanionButtonStyleProps } from './style.js'
import type { StringKeys } from '../util.js'

export type SomeCompanionFeedbackInputField<TKey extends string = string> =
	| CompanionInputFieldStaticText<TKey>
	| CompanionInputFieldColor<TKey>
	| CompanionInputFieldTextInput<TKey>
	| CompanionInputFieldDropdown<TKey>
	| CompanionInputFieldMultiDropdown<TKey>
	| CompanionInputFieldNumber<TKey>
	| CompanionInputFieldCheckbox<TKey>

export interface CompanionFeedbackSchema<TOptions extends CompanionOptionValues> {
	type: 'boolean' | 'value' | 'advanced'
	options: TOptions
}

/**
 * Basic information about an instance of a feedback
 */
export interface CompanionFeedbackInfo<TOptions extends CompanionOptionValues = CompanionOptionValues> {
	/** The type of the feedback */
	readonly type: 'boolean' | 'value' | 'advanced'
	/** The unique id for this feedback */
	readonly id: string
	/** The unique id for the location of this feedback */
	readonly controlId: string
	/** The id of the feedback definition */
	readonly feedbackId: string
	/** The user selected options for the feedback */
	readonly options: TOptions

	/** The old user selected options from the previous execution of the feedback */
	readonly previousOptions: TOptions | null
}

/**
 * Extended information for execution of a boolean feedback
 */
export type CompanionFeedbackBooleanEvent<TOptions extends CompanionOptionValues = CompanionOptionValues> =
	CompanionFeedbackInfo<TOptions>
// {
// 	// readonly type: 'boolean'
// }

/**
 * Extended information for execution of a value feedback
 */
export type CompanionFeedbackValueEvent<TOptions extends CompanionOptionValues = CompanionOptionValues> =
	CompanionFeedbackInfo<TOptions>

/**
 * Extended information for execution of an advanced feedback
 */
export interface CompanionFeedbackAdvancedEvent<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
> extends CompanionFeedbackInfo<TOptions> {
	// readonly type: 'advanced'

	/** If control supports an imageBuffer, the dimensions the buffer should be */
	readonly image?: {
		readonly width: number
		readonly height: number
	}
}

/**
 * The resulting style of a boolean feedback
 */
export type CompanionFeedbackButtonStyleResult = Partial<CompanionButtonStyleProps>

/** Size and position information for an ImageBuffer */
export interface CompanionImageBufferPosition {
	x: number
	y: number
	width: number
	height: number

	/**
	 * The scale to draw this buffer at.
	 * This can be useful to ensure that drawn buffers are sharp, as they can be drawn at a higher resolution than the buffer itself.
	 * Note: This is a multiplier, so 1 is the default size, 0.5 is half size, 2 is double size, etc.
	 * Warning: Be careful to not use buffers too large, as that can cause performance issues.
	 */
	drawScale?: number
}

/** Encoding information for an ImageBuffer */
export interface CompanionImageBufferEncoding {
	pixelFormat: 'RGB' | 'RGBA' | 'ARGB'
}

/** The resulting style of an advanced feedback */
export interface CompanionAdvancedFeedbackResult extends CompanionFeedbackButtonStyleResult {
	/** Base64 encoded pixel buffer */
	imageBuffer?: string
	imageBufferEncoding?: CompanionImageBufferEncoding
	imageBufferPosition?: CompanionImageBufferPosition
}

/**
 * The common definition of a feedback
 */
export interface CompanionFeedbackDefinitionBase<TOptions extends CompanionOptionValues = CompanionOptionValues> {
	type: 'boolean' | 'value' | 'advanced'
	/** Name to show in the feedbacks list */
	name: string
	/**
	 * Alternate value to use when sorting the list of feedbacks
	 * By default, the feedbacks are ordered by the name field, but you can override this without altering the visible name by setting this value
	 */
	sortName?: string
	/** Additional description of the feedback */
	description?: string
	/** The input fields for the feedback */
	options: SomeCompanionFeedbackInputField<StringKeys<TOptions>>[]

	/**
	 * Called to report a feedback has been removed or disabled.
	 * Useful to cleanup subscriptions setup in the callback
	 */
	unsubscribe?: (feedback: CompanionFeedbackInfo<TOptions>, context: CompanionFeedbackContext) => void | Promise<void>

	/**
	 * The user requested to 'learn' the values for this feedback.
	 * Note: As of 2.0, you should only return the values that have been learned, so that expressions in any id fields will be preserved
	 */
	learn?: (
		feedback: CompanionFeedbackInfo<TOptions>,
		context: CompanionFeedbackContext,
	) => Partial<TOptions> | undefined | Promise<Partial<TOptions> | undefined>

	/**
	 * Timeout for the 'learn' function (in milliseconds)
	 * Companion sets a default value of 5s, to ensure that the learn does not get stuck never completing
	 * You can change this if this number does not work for you, but you should keep it to a sensible value
	 */
	learnTimeout?: number
}

/**
 * The definition of a boolean feedback
 */
export interface CompanionBooleanFeedbackDefinition<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
> extends CompanionFeedbackDefinitionBase<TOptions> {
	/** The type of the feedback */
	type: 'boolean'
	/** The default style properties for this feedback */
	defaultStyle: Partial<CompanionFeedbackButtonStyleResult>
	/** Called to get the feedback value */
	callback: (
		feedback: CompanionFeedbackBooleanEvent<TOptions>,
		context: CompanionFeedbackContext,
	) => boolean | Promise<boolean>

	/**
	 * If `undefined` or true, Companion will add an 'Inverted' checkbox for your feedback, and handle the logic for you.
	 * By setting this to false, you can disable this for your feedback. You should do this if it does not make sense for your feedback.
	 */
	showInvert?: boolean
}

/**
 * The definition of a value feedback
 */
export interface CompanionValueFeedbackDefinition<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
> extends CompanionFeedbackDefinitionBase<TOptions> {
	/** The type of the feedback */
	type: 'value'
	/** Called to get the feedback value */
	callback: (
		feedback: CompanionFeedbackValueEvent<TOptions>,
		context: CompanionFeedbackContext,
	) => JsonValue | Promise<JsonValue>
}

/**
 * The definition of an advanced feedback
 */
export interface CompanionAdvancedFeedbackDefinition<
	TOptions extends CompanionOptionValues = CompanionOptionValues,
> extends CompanionFeedbackDefinitionBase<TOptions> {
	/** The type of the feedback */
	type: 'advanced'
	/** Called to get the feedback value */
	callback: (
		feedback: CompanionFeedbackAdvancedEvent<TOptions>,
		context: CompanionFeedbackContext,
	) => CompanionAdvancedFeedbackResult | Promise<CompanionAdvancedFeedbackResult>
}

/**
 * Utility functions available in the context of the current feedback
 */
export type CompanionFeedbackContext = CompanionCommonCallbackContext

/**
 * The definition of some feedback
 */
export type CompanionFeedbackDefinition<
	TSchema extends CompanionFeedbackSchema<CompanionOptionValues> = CompanionFeedbackSchema<CompanionOptionValues>,
> =
	TSchema extends CompanionFeedbackSchema<infer TOptions>
		? TSchema['type'] extends 'boolean'
			? CompanionBooleanFeedbackDefinition<TOptions>
			: TSchema['type'] extends 'value'
				? CompanionValueFeedbackDefinition<TOptions>
				: TSchema['type'] extends 'advanced'
					? CompanionAdvancedFeedbackDefinition<TOptions>
					: // Unspecific, try anything
							| CompanionBooleanFeedbackDefinition<TOptions>
							| CompanionValueFeedbackDefinition<TOptions>
							| CompanionAdvancedFeedbackDefinition<TOptions>
		: never

/**
 * The definitions of a group of feedbacks
 */
export type CompanionFeedbackDefinitions<
	TSchemas extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>> = Record<
		string,
		CompanionFeedbackSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof TSchemas]: CompanionFeedbackDefinition<TSchemas[K]> | false | undefined
}
