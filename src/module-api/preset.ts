import type { CompanionFeedbackButtonStyleResult } from './feedback.js'
import type { CompanionOptionValues } from './input.js'
import type { CompanionButtonStyleProps } from './style.js'

/**
 * The options for a button preset
 */
export interface CompanionButtonPresetOptions {
	/** Use relative delays between the actions executing (default = false) */
	relativeDelay?: boolean
	/** Auto-progress the current step when releasing the button (default = true) */
	stepAutoProgress?: boolean
	/** Enable rotary actions for this button (default = false) */
	rotaryActions?: boolean
}

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
	/**
	 * If a boolean feedback, invert the value of the feedback
	 */
	isInverted?: boolean
	/**
	 * User editable description/comment for the feedback.
	 * Intended to descibe the purpose/intent of the feedback.
	 */
	headline?: string
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
	/**
	 * User editable description/comment for the action.
	 * Intended to descibe the purpose/intent of the action.
	 */
	headline?: string
}

export type CompanionPresetDefinition = CompanionButtonPresetDefinition | CompanionTextPresetDefinition

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
	/** The base style of this preset, this will be copied to the button */
	style: CompanionButtonStyleProps
	/** Preview style for preset, will be used in GUI for preview */
	previewStyle?: Partial<CompanionButtonStyleProps>
	/** Options for this preset */
	options?: CompanionButtonPresetOptions
	/** The feedbacks on the button */
	feedbacks: CompanionPresetFeedback[]
	steps: CompanionButtonStepActions[]
}

/**
 * The definition of a text preset
 */
export interface CompanionTextPresetDefinition {
	/** The type of this preset */
	type: 'text'
	/** The category of this preset, for grouping */
	category: string
	/** The name of this preset */
	name: string
	/** The text to display */
	text: string
}

export interface CompanionPresetActionsWithOptions {
	options?: CompanionActionSetOptions
	actions: CompanionPresetAction[]
}
export interface CompanionActionSetOptions {
	runWhileHeld?: boolean
}
export interface CompanionButtonStepActions {
	/** Name of this step */
	name?: string

	/** The button down actions */
	down: CompanionPresetAction[]
	/** The button up actions */
	up: CompanionPresetAction[]

	rotate_left?: CompanionPresetAction[]
	rotate_right?: CompanionPresetAction[]

	[delay: number]: CompanionPresetActionsWithOptions | CompanionPresetAction[]
}

/**
 * The definitions of a group of feedbacks
 */
export interface CompanionPresetDefinitions {
	[id: string]: CompanionButtonPresetDefinition | CompanionTextPresetDefinition | undefined
}
