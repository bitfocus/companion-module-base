import type { CompanionFeedbackButtonStyleResult, CompanionFeedbackSchema } from '../feedback.js'
import type { CompanionOptionValues, ExpressionOrValue } from '../input.js'
import type { CompanionButtonStyleProps } from '../style.js'
import type { JsonValue } from '../../common/json-value.js'
import type { CompanionVariableValue } from '../variable.js'
import type { InstanceTypes } from '../base.js'
import type { CompanionActionSchema } from '../action.js'

/**
 * The definitions of a group of presets
 */
export type CompanionPresetDefinitions<TManifest extends InstanceTypes = InstanceTypes> = {
	[id: string]: CompanionPresetDefinition<TManifest> | undefined
}

// Future: Additional types will be added, as part of the graphics overhaul
export type CompanionPresetDefinition<TManifest extends InstanceTypes = InstanceTypes> =
	CompanionSimplePresetDefinition<TManifest>

export interface CompanionPresetDefinitionBase<TType extends string> {
	/**
	 * A name for this preset
	 * This is typically shown as a tooltip
	 */
	name: string

	/**
	 * The type of the preset
	 */
	type: TType

	/**
	 * Keywords for the preset
	 * This is extra search terms to allow users to find the right preset
	 */
	keywords?: string[]
}

export interface CompanionSimplePresetDefinition<
	TManifest extends InstanceTypes = InstanceTypes,
> extends CompanionPresetDefinitionBase<'simple'> {
	/** The base style of this preset, this will be copied to the button */
	style: CompanionButtonStyleProps
	/** Preview style for preset, will be used in GUI for preview */
	previewStyle?: Partial<CompanionButtonStyleProps>

	/** Options for the button produced by this preset */
	options?: CompanionSimplePresetOptions

	/**
	 * The steps of actions for this preset
	 */
	steps: CompanionButtonStepActions<TManifest>[]

	/** The feedbacks on the button */
	feedbacks: CompanionPresetFeedback<TManifest['feedbacks']>[]

	/** Local variables on this button */
	localVariables?: CompanionSimplePresetLocalVariable[]
}

/**
 * The options for a button preset
 */
export interface CompanionSimplePresetOptions {
	/** Auto-progress the current step when releasing the button (default = true) */
	stepAutoProgress?: boolean
}

export interface CompanionPresetActionsWithOptions<TManifest extends InstanceTypes = InstanceTypes> {
	options?: CompanionActionSetOptions
	actions: CompanionPresetAction<TManifest['actions']>[]
}
export interface CompanionActionSetOptions {
	/**
	 * If true, the actions will be executed once the button crosses the duration,
	 * otherwise they will only be executed if released before the next duration
	 */
	runWhileHeld?: boolean
}
export interface CompanionButtonStepActions<TManifest extends InstanceTypes = InstanceTypes> {
	/** Name of this step */
	name?: string

	/** The button down actions */
	down: CompanionPresetAction<TManifest['actions']>[]
	/**
	 * The button up actions
	 * If any delay groups are defined, this becomes the short-press actions
	 */
	up: CompanionPresetAction<TManifest['actions']>[]

	/** The button rotate left actions */
	rotate_left?: CompanionPresetAction<TManifest['actions']>[]
	/** The button rotate right actions */
	rotate_right?: CompanionPresetAction<TManifest['actions']>[]

	/**
	 * Long-press action groups
	 * Keyed by the duration (in milliseconds) after which the long-press actions should be executed
	 */
	[duration: number]: CompanionPresetActionsWithOptions<TManifest> | CompanionPresetAction<TManifest['actions']>[]
}

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
		/** The execution delay of the action, relative to the previous action */
		delay?: number
		/** The option values for the action */
		options: CompanionPresetOptionValues<TActionManifest[K]['options']>
		/**
		 * User editable description/comment for the action.
		 * Intended to describe the purpose/intent of the action.
		 */
		headline?: string
	}
}[keyof TActionManifest]

/**
 * The configuration of a feedback in a preset
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
		/** The option values for the feedback */
		options: CompanionPresetOptionValues<TFeedbackManifest[K]['options']>
		/**
		 * User editable description/comment for the feedback.
		 * Intended to describe the purpose/intent of the feedback.
		 */
		headline?: string
	} & (TFeedbackManifest[K]['type'] extends 'boolean'
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
		: 'boolean' extends TFeedbackManifest[K]['type']
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
			: // definitely not boolean
				{
					style?: never
					isInverted?: never
				})
}[keyof TFeedbackManifest]

/**
 * The configuration of a simple local variable in a preset
 */
export interface CompanionSimplePresetLocalVariable {
	/** The name of the local variable */
	variableName: string
	/**
	 * User editable description/comment for the local variable.
	 * Intended to describe the purpose/intent of the local variable.
	 */
	headline?: string

	/**
	 * The type of variable this is
	 * Currently only 'simple' is supported
	 */
	variableType: 'simple'

	/**
	 * The value of the variable at Companion startup
	 */
	startupValue: CompanionVariableValue
}

export type CompanionPresetValue<T extends JsonValue | undefined> = T | ExpressionOrValue<T>
export type CompanionPresetOptionValues<T extends Record<string, JsonValue | undefined>> = {
	[K in keyof T]: CompanionPresetValue<T[K]>
}
