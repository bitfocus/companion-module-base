import { CompanionFeedbackButtonStyleResult } from './feedback'
import { CompanionOptionValues, DropdownChoiceId } from './input'
import { CompanionButtonStyleProps } from './style'

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
}

export type SomeCompanionPresetAction = CompanionPresetAction | CompanionPresetPropertyAction

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

export enum CompanionPresetPropertyActionId {
	SetValue = 'set-value',
}

export interface CompanionPresetPropertyAction {
	/** The id of the property definition */
	propertyId: string
	/** The id of the property change action */
	actionId: CompanionPresetPropertyActionId
	/** The execution delay of the action */
	delay?: number
	/** The id of the property instance */
	instanceId: DropdownChoiceId | null
	/** The valuee for the property */
	value: string | number | boolean
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
	actions: SomeCompanionPresetAction[]
}
export interface CompanionActionSetOptions {
	runWhileHeld?: boolean
}
export interface CompanionButtonStepActions {
	/** The button down actions */
	down: SomeCompanionPresetAction[]
	/** The button up actions */
	up: SomeCompanionPresetAction[]

	rotate_left?: SomeCompanionPresetAction[]
	rotate_right?: SomeCompanionPresetAction[]

	[delay: number]: CompanionPresetActionsWithOptions | SomeCompanionPresetAction[]
}

/**
 * The definitions of a group of feedbacks
 */
export interface CompanionPresetDefinitions {
	[id: string]: CompanionButtonPresetDefinition | undefined
}
