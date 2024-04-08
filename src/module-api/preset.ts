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
	/** The base style of this preset, this will be copied to the button */
	style: CompanionButtonStyleProps
	/** Preview style for preset, will be used in GUI for preview */
	previewStyle?: CompanionButtonStyleProps
	/** Options for this preset */
	options?: CompanionButtonPresetOptions
	/** The feedbacks on the button */
	feedbacks: CompanionPresetFeedback[]
	steps: CompanionButtonStepActions[]
}

export interface CompanionPresetActionsWithOptions {
	options?: CompanionActionSetOptions
	actions: CompanionPresetAction[]
}
export interface CompanionActionSetOptions {
	runWhileHeld?: boolean
}
export interface CompanionButtonStepActions {
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
	[id: string]: CompanionButtonPresetDefinition | undefined
}

export type StrictPresetDefinitions<TActions, TFeedbacks> = StrictPresetDefinitionCategory<TActions, TFeedbacks>[]
export type StrictPresetDefinitionCategory<TActions, TFeedbacks> = {
	name: string
	presets: Record<string, StrictButtonPresetDefinition<TActions, TFeedbacks>>
}

export interface StrictButtonPresetDefinition<TActions, TFeedbacks> {
	/** The type of this preset */
	type: 'button-strict'
	/** The category of this preset, for grouping */
	// category: string
	/** The name of this preset */
	name: string
	/** The base style of this preset, this will be copied to the button */
	style: CompanionButtonStyleProps
	/** Preview style for preset, will be used in GUI for preview */
	previewStyle?: CompanionButtonStyleProps
	/** Options for this preset */
	options?: CompanionButtonPresetOptions
	/** The feedbacks on the button */
	feedbacks: StrictPresetFeedback<TFeedbacks>[]
	steps: StrictButtonStepActions<TActions>[]
}

type StrictPresetFeedbackInner<TTypes, Id extends keyof TTypes> = Id extends any
	? {
			/** The id of the feedback definition */
			feedbackId: Id
			/** The option values for the feedback */
			options: TTypes[Id]
			/**
			 * If a boolean feedback, the style effect of the feedback
			 */
			style?: CompanionFeedbackButtonStyleResult
			/**
			 * If a boolean feedback, invert the value of the feedback
			 */
			isInverted?: boolean
	  }
	: never

export type StrictPresetFeedback<TFeedbacks> = StrictPresetFeedbackInner<TFeedbacks, keyof TFeedbacks>

type StrictPresetActionInner<TTypes, Id extends keyof TTypes> = Id extends any
	? {
			/** The id of the action definition */
			actionId: Id
			/** The option values for the action */
			options: TTypes[Id]
			/** The execution delay of the action */
			delay?: number
	  }
	: never

export type StrictPresetAction<TActions> = StrictPresetActionInner<TActions, keyof TActions>

export interface StrictButtonStepActions<TActions> {
	/** The button down actions */
	down: StrictPresetAction<TActions>[]
	/** The button up actions */
	up: StrictPresetAction<TActions>[]
	rotateLeft?: StrictPresetAction<TActions>[]
	rotateRight?: StrictPresetAction<TActions>[]
	[delay: number]: StrictPresetActionsWithOptions<TActions> | StrictPresetAction<TActions>[]
}

export interface StrictPresetActionsWithOptions<TActions> {
	options?: CompanionActionSetOptions
	actions: StrictPresetAction<TActions>[]
}
