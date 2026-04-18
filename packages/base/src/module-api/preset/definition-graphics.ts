import type { JsonValue } from '../../common/json-value.js'
import type { InstanceTypes } from '../base.js'
import type { CompanionFeedbackSchema } from '../feedback.js'
import type { ButtonGraphicsCanvasElement, SomeButtonGraphicsElement } from '../graphics.js'
import type { CompanionOptionValues, ExpressionOrValue } from '../input.js'
import type {
	CompanionButtonStepActions,
	CompanionPresetDefinitionBase,
	CompanionPresetOptionValues,
	CompanionSimplePresetLocalVariable,
} from './definition.js'

/**
 * The definition of a companion layered button preset
 * In many cases the `simple` preset type will be sufficient, but the `layered-button` preset allows for more complex buttons with multiple layers of graphics and feedbacks
 */
export interface CompanionLayeredButtonPresetDefinition<
	TManifest extends InstanceTypes = InstanceTypes,
> extends CompanionPresetDefinitionBase<'layered-button'> {
	/** The drawing elements for this preset, this will be copied to the button */
	elements: SomeButtonGraphicsElement[]

	canvas?: ButtonGraphicsCanvasElement

	/** Options for this preset */
	options?: CompanionLayeredButtonPresetDefinitionOptions
	/** The feedbacks on the button */
	feedbacks: CompanionPresetLayeredFeedback<TManifest['feedbacks']>[]
	steps: CompanionButtonStepActions<TManifest>[]

	/** Local variables on this button */
	localVariables?: CompanionSimplePresetLocalVariable[]
}

/**
 * The options for a button preset
 */
export interface CompanionLayeredButtonPresetDefinitionOptions {
	/** Auto-progress the current step when releasing the button (default = true) */
	stepAutoProgress?: boolean
}

/**
 * The configuration of an feedback in a preset
 */
export type CompanionPresetLayeredFeedback<
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
		 * Element styles to override when this feedback is active
		 */
		styleOverrides: CompanionPresetFeedbackStyleOverride[]

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
}[keyof TFeedbackManifest]

export interface CompanionPresetFeedbackStyleOverride {
	elementId: string
	elementProperty: string
	// Note: When overriding advanced feedbacks, this should be set to `{ isExpression: false, value: 'color' }` or similar to indicate which property it is using
	override: ExpressionOrValue<JsonValue | undefined>
}
