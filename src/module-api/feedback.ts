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

export type SomeCompanionFeedbackInputField =
	| CompanionInputFieldStaticText
	| CompanionInputFieldColor
	| CompanionInputFieldTextInput
	| CompanionInputFieldDropdown
	| CompanionInputFieldMultiDropdown
	| CompanionInputFieldNumber
	| CompanionInputFieldCheckbox

/**
 * Basic information about an instance of a feedback
 */
export interface CompanionFeedbackInfo {
	/** The type of the feedback */
	readonly type: 'boolean' | 'advanced'
	/** The unique id for this feedback */
	readonly id: string
	/** The unique id for the location of this feedback */
	readonly controlId: string
	/** The id of the feedback definition */
	readonly feedbackId: string
	/** The user selected options for the feedback */
	readonly options: CompanionOptionValues
}

/**
 * Extended information for execution of a boolean feedback
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CompanionFeedbackBooleanEvent extends CompanionFeedbackInfo {
	// readonly type: 'boolean'
}

/**
 * Extended information for execution of an advanced feedback
 */
export interface CompanionFeedbackAdvancedEvent extends CompanionFeedbackInfo {
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
}

/** The resulting style of an advanced feedback */
export interface CompanionAdvancedFeedbackResult extends CompanionFeedbackButtonStyleResult {
	imageBuffer?: Uint8Array | string
	imageBufferPosition?: CompanionImageBufferPosition
}

/**
 * The common definition of a feedback
 */
export interface CompanionFeedbackDefinitionBase {
	type: 'boolean' | 'advanced'
	/** Name to show in the feedbacks list */
	name: string
	/** Additional description of the feedback */
	description?: string
	/** The input fields for the feedback */
	options: SomeCompanionFeedbackInputField[]
	/**
	 * Called to report the existence of a feedback.
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (feedback: CompanionFeedbackInfo, context: CompanionFeedbackContext) => void | Promise<void>
	/**
	 * Called to report an feedback has been edited/removed.
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (feedback: CompanionFeedbackInfo, context: CompanionFeedbackContext) => void | Promise<void>

	/**
	 * The user requested to 'learn' the values for this feedback.
	 */
	learn?: (
		action: CompanionFeedbackInfo,
		context: CompanionFeedbackContext
	) => CompanionOptionValues | undefined | Promise<CompanionOptionValues | undefined>

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
export interface CompanionBooleanFeedbackDefinition extends CompanionFeedbackDefinitionBase {
	/** The type of the feedback */
	type: 'boolean'
	/** The default style properties for this feedback */
	defaultStyle: Partial<CompanionFeedbackButtonStyleResult>
	/** Called to get the feedback value */
	callback: (feedback: CompanionFeedbackBooleanEvent, context: CompanionFeedbackContext) => boolean | Promise<boolean>

	/**
	 * If `undefined` or true, Companion will add an 'Inverted' checkbox for your feedback, and handle the logic for you.
	 * By setting this to false, you can disable this for your feedback. You should do this if it does not make sense for your feedback.
	 */
	showInvert?: boolean
}

/**
 * The definition of an advanced feedback
 */
export interface CompanionAdvancedFeedbackDefinition extends CompanionFeedbackDefinitionBase {
	/** The type of the feedback */
	type: 'advanced'
	/** Called to get the feedback value */
	callback: (
		feedback: CompanionFeedbackAdvancedEvent,
		context: CompanionFeedbackContext
	) => CompanionAdvancedFeedbackResult | Promise<CompanionAdvancedFeedbackResult>
}

/**
 * Utility functions available in the context of the current feedback
 */
export type CompanionFeedbackContext = CompanionCommonCallbackContext

/**
 * The definition of some feedback
 */
export type CompanionFeedbackDefinition = CompanionBooleanFeedbackDefinition | CompanionAdvancedFeedbackDefinition

/**
 * The definitions of a group of feedbacks
 */
export interface CompanionFeedbackDefinitions {
	[id: string]: CompanionFeedbackDefinition | undefined
}
