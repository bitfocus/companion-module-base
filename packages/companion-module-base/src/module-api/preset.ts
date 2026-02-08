import type { CompanionFeedbackButtonStyleResult, CompanionFeedbackSchema } from './feedback.js'
import type { CompanionOptionValues } from './input.js'
import type { CompanionButtonStyleProps } from './style.js'
import type { InstanceTypes } from './base.js'
import type { CompanionActionSchema } from './action.js'

/**
 * The options for a button preset
 */
export interface CompanionButtonPresetOptions {
	/** Auto-progress the current step when releasing the button (default = true) */
	stepAutoProgress?: boolean
	/** Enable rotary actions for this button (default = false) */
	rotaryActions?: boolean
}

/**
 * The configuration of an feedback in a preset
 */
export type CompanionPresetFeedback<
	TFeedbackManifest extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>> = Record<
		string,
		CompanionFeedbackSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof TFeedbackManifest]: {
		/** The id of the feedback definition */
		feedbackId: K
		/** The option values for the action */
		options: TFeedbackManifest[K]['options']
		/**
		 * User editable description/comment for the feedback.
		 * Intended to describe the purpose/intent of the feedback.
		 */
		headline?: string
	} & ('boolean' extends TFeedbackManifest[K]['type']
		? // boolean feedbacks can have a few more properties
			{
				/**
				 * If a boolean feedback, the style effect of the feedback
				 */
				style?: CompanionFeedbackButtonStyleResult
				/**
				 * If a boolean feedback, invert the value of the feedback
				 */
				isInverted?: boolean
			}
		: TFeedbackManifest[K]['type'] extends 'boolean'
			? // definitely boolean
				{
					/**
					 * If a boolean feedback, the style effect of the feedback
					 */
					style: CompanionFeedbackButtonStyleResult
					/**
					 * If a boolean feedback, invert the value of the feedback
					 */
					isInverted?: boolean
				}
			: // definitely not boolean
				{
					style?: never
					isInverted?: never
				})
}[keyof TFeedbackManifest]

/**
 * The configuration of an action in a preset
 */
export type CompanionPresetAction<
	TActionManifest extends Record<string, CompanionActionSchema<CompanionOptionValues>> = Record<
		string,
		CompanionActionSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof TActionManifest]: {
		/** The id of the action definition */
		actionId: K
		/** The execution delay of the action */
		delay?: number
		/** The option values for the action */
		options: TActionManifest[K]['options']
		/**
		 * User editable description/comment for the action.
		 * Intended to describe the purpose/intent of the action.
		 */
		headline?: string
	}
}[keyof TActionManifest]

export type CompanionPresetDefinition<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionButtonPresetDefinition<TManifest>
	| CompanionTextPresetDefinition

/**
 * The definition of a press button preset
 */
export interface CompanionButtonPresetDefinition<TManifest extends InstanceTypes = InstanceTypes> {
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
	feedbacks: CompanionPresetFeedback<TManifest['feedbacks']>[]
	steps: CompanionButtonStepActions<TManifest>[]
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

export interface CompanionPresetActionsWithOptions<TManifest extends InstanceTypes = InstanceTypes> {
	options?: CompanionActionSetOptions
	actions: CompanionPresetAction<TManifest['actions']>[]
}
export interface CompanionActionSetOptions {
	runWhileHeld?: boolean
}
export interface CompanionButtonStepActions<TManifest extends InstanceTypes = InstanceTypes> {
	/** Name of this step */
	name?: string

	/** The button down actions */
	down: CompanionPresetAction<TManifest['actions']>[]
	/** The button up actions */
	up: CompanionPresetAction<TManifest['actions']>[]

	rotate_left?: CompanionPresetAction<TManifest['actions']>[]
	rotate_right?: CompanionPresetAction<TManifest['actions']>[]

	[delay: number]: CompanionPresetActionsWithOptions<TManifest> | CompanionPresetAction<TManifest['actions']>[]
}

/**
 * The definitions of a group of feedbacks
 */
export type CompanionPresetDefinitions<TManifest extends InstanceTypes = InstanceTypes> = {
	[id: string]: CompanionPresetDefinition<TManifest> | undefined
}
