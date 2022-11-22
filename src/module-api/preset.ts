import { CompanionFeedbackButtonStyleResult } from './feedback.js'
import { CompanionOptionValues } from './input.js'
import { CompanionAdditionalStyleProps, CompanionRequiredStyleProps } from './style.js'

/**
 * The options for a button preset
 */
export interface CompanionButtonPresetOptions {
	relativeDelay?: boolean
	stepAutoProgress?: boolean
}

/**
 * The style properties for a preset
 */
export type CompanionPresetStyle = CompanionRequiredStyleProps & Partial<CompanionAdditionalStyleProps>

/**
 * The configuration of an feedback in a preset
 */
export interface CompanionPresetFeedback {
	/** The id of the feedback definition */
	feedbackId: string
	/** The option values for the action */
	options: CompanionOptionValues
	/**
	 * If a boolean feedback, the style effect of the feedback
	 */
	style?: CompanionFeedbackButtonStyleResult
}

/**
 * The configuration of an action in a preset
 */
export interface CompanionPresetAction {
	/** The id of the action definition */
	actionId: string
	/** The execution delay of the action */
	delay?: number
	/** The option values for the action */
	options: CompanionOptionValues
}

/**
 * The definition of a press button preset
 */
export interface CompanionButtonPresetDefinition {
	/** The type of this preset */
	type: 'button'
	/** The category of this preset, for grouping */
	category: string
	/** The name of this preset */
	name: string
	/** The base style of this preset */
	style: CompanionPresetStyle
	/** Options for this preset */
	options?: CompanionButtonPresetOptions
	/** The feedbacks on the button */
	feedbacks: CompanionPresetFeedback[]
	steps: CompanionButtonStepActions[]
}

export interface CompanionButtonStepActions {
	/** The button down actions */
	down: CompanionPresetAction[]
	/** The button up actions */
	up: CompanionPresetAction[]

	rotate_left?: CompanionPresetAction[]
	rotate_right?: CompanionPresetAction[]
}

/**
 * The definitions of a group of feedbacks
 */
export interface CompanionPresetDefinitions {
	[id: string]: CompanionButtonPresetDefinition | undefined
}
