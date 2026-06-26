import type {
	Equal,
	Expect,
	// eslint-disable-next-line n/no-missing-import
} from 'type-testing'
import type { JsonValue } from '../../common/json-value.js'
import type { CompanionActionSchemaWithoutResult, CompanionActionSchemaWithResult } from '../action.js'
import type { InstanceTypes } from '../base.js'
import type { CompanionFeedbackButtonStyleResult, CompanionFeedbackSchema } from '../feedback.js'
import type { CompanionOptionValues, ExpressionOrValue } from '../input.js'
import type { CompanionButtonStyleProps } from '../style.js'
import type { CompanionVariableValue } from '../variable.js'
import type { CompanionLayeredButtonPresetDefinition } from './definition-graphics.js'
import type {
	CompanionInternalActionSchemas,
	CompanionInternalFeedbackSchemas,
	InternalPresetBuildingBlockId,
} from './internal-catalog.js'

/**
 * Merge the reserved `internal:*` action schemas into a module's action manifest, so that presets may
 * reference Companion's built-in internal actions alongside the module's own.
 * The intersection merges the records: `keyof (A & B) = keyof A | keyof B`.
 */
export type WithInternalActions<TActionManifest> = TActionManifest & CompanionInternalActionSchemas
/** As {@link WithInternalActions}, but for the internal feedback schemas. */
export type WithInternalFeedbacks<TFeedbackManifest> = TFeedbackManifest & CompanionInternalFeedbackSchemas

// ─── Internal building-block (logic/flow) preset entries ───────────────────────────────────────
// Building blocks nest other actions/feedbacks via child groups, so they carry a `children` field and
// are kept separate from the flat internal schemas (CompanionInternal{Action,Feedback}Schemas). Each
// block is described once in a schema record (id -> options + named child-group kinds); the mapped
// types below generate the entries, adding the common props (delay/headline/style/...) a single time.

/** The kind of entries a building block's child group holds */
export type ChildGroupKind = 'actions' | 'conditions'

/** Expand a single child-group kind to its entry-array type */
type ChildArray<TKind, TManifest extends InstanceTypes> =
	NonNullable<TKind> extends 'conditions' ? SomePresetConditionEntry<TManifest>[] : SomePresetActionEntry<TManifest>[]

/**
 * Expand a record of named child groups to the concrete `children` shape.
 * Homomorphic over `TGroups`, so optional groups (e.g. `elseActions?`) keep their optional modifier.
 */
export type MapChildren<TGroups extends Record<string, ChildGroupKind | undefined>, TManifest extends InstanceTypes> = {
	[G in keyof TGroups]: ChildArray<TGroups[G], TManifest>
}

/** Describes each building-block action: its options and named child groups (by kind). */
export interface CompanionInternalLogicActionSchemas {
	/** Execute a group of actions */
	'internal:actionGroup': {
		options: { executionMode?: 'inherit' | 'concurrent' | 'sequential' }
		children: { default: 'actions' }
	}
	/** Execute actions when all conditions are true, otherwise the (optional) else actions */
	'internal:logicIf': {
		options: Record<string, never>
		children: { condition: 'conditions'; actions: 'actions'; elseActions?: 'actions' }
	}
	/** Repeat actions while all conditions are true */
	'internal:logicWhile': {
		options: Record<string, never>
		children: { condition: 'conditions'; actions: 'actions' }
	}
}

/** A building-block action entry (one per id in {@link CompanionInternalLogicActionSchemas}). */
export type CompanionInternalLogicAction<TManifest extends InstanceTypes> = {
	[K in keyof CompanionInternalLogicActionSchemas]: {
		actionId: K
		options: CompanionPresetOptionValues<CompanionInternalLogicActionSchemas[K]['options']>
		children: MapChildren<CompanionInternalLogicActionSchemas[K]['children'], TManifest>
		delay?: number
		headline?: string
	}
}[keyof CompanionInternalLogicActionSchemas]

/** Describes each building-block feedback: its options and named child groups (by kind). */
export interface CompanionInternalLogicFeedbackSchemas {
	/** Combine multiple conditions with a boolean operator */
	'internal:logicOperator': {
		options: { operation: 'and' | 'or' | 'xor' }
		children: { default: 'conditions' }
	}
}

/** A building-block feedback used as a condition (no style). */
export type CompanionInternalConditionFeedback<TManifest extends InstanceTypes> = {
	[K in keyof CompanionInternalLogicFeedbackSchemas]: {
		feedbackId: K
		options: CompanionPresetOptionValues<CompanionInternalLogicFeedbackSchemas[K]['options']>
		children: MapChildren<CompanionInternalLogicFeedbackSchemas[K]['children'], TManifest>
		isInverted?: boolean
		headline?: string
	}
}[keyof CompanionInternalLogicFeedbackSchemas]

/** A building-block feedback used at the top level of a simple preset (carries a boolean style). */
export type CompanionInternalSimpleLogicFeedback<TManifest extends InstanceTypes> = {
	[K in keyof CompanionInternalLogicFeedbackSchemas]: {
		feedbackId: K
		options: CompanionPresetOptionValues<CompanionInternalLogicFeedbackSchemas[K]['options']>
		children: MapChildren<CompanionInternalLogicFeedbackSchemas[K]['children'], TManifest>
		style: CompanionFeedbackButtonStyleResult
		isInverted?: boolean
		headline?: string
	}
}[keyof CompanionInternalLogicFeedbackSchemas]

/**
 * A boolean feedback used as a condition: no style, and (for concrete manifests) strictly boolean ids
 * only — non-boolean ids resolve to `never` and drop out. Loosely-typed manifests (string index) get a
 * permissive shape instead of collapsing to `never`.
 */
export type CompanionPresetConditionFeedback<
	TFeedbackManifest extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>>,
> = string extends keyof TFeedbackManifest
	? { feedbackId: string; options: CompanionOptionValues; isInverted?: boolean; headline?: string }
	: {
			[K in keyof TFeedbackManifest]: TFeedbackManifest[K]['type'] extends 'boolean'
				? {
						feedbackId: K
						options: CompanionPresetOptionValues<TFeedbackManifest[K]['options']>
						isInverted?: boolean
						headline?: string
					}
				: never
		}[keyof TFeedbackManifest]

/** An action entry in a preset: the module's own or internal flat actions, plus internal building blocks. */
export type SomePresetActionEntry<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionPresetAction<WithInternalActions<TManifest['actions']>>
	| CompanionInternalLogicAction<TManifest>

/** A condition entry (boolean feedback or nested logic operator) used inside a building block. */
export type SomePresetConditionEntry<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionPresetConditionFeedback<WithInternalFeedbacks<TManifest['feedbacks']>>
	| CompanionInternalConditionFeedback<TManifest>

/** A feedback entry on a simple preset: the module's own or internal feedbacks, plus internal building blocks. */
export type SomePresetSimpleFeedbackEntry<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionPresetFeedback<WithInternalFeedbacks<TManifest['feedbacks']>>
	| CompanionInternalSimpleLogicFeedback<TManifest>

// Drift guard: the building-block schema records here must cover exactly the ids that the version map
// in internal-catalog.ts gates (InternalPresetBuildingBlockId). If they fall out of sync, this fails.
type _AssertBuildingBlockIds = Expect<
	Equal<
		keyof CompanionInternalLogicActionSchemas | keyof CompanionInternalLogicFeedbackSchemas,
		InternalPresetBuildingBlockId
	>
>

/**
 * The definitions of a group of presets
 */
export type CompanionPresetDefinitions<TManifest extends InstanceTypes = InstanceTypes> = {
	[id: string]: CompanionSomePresetDefinition<TManifest> | undefined
}

/**
 * The value stored against a preset id: either a single preset definition, or a group of alternative
 * variants of the same logical preset (see {@link CompanionPresetAlternatives}).
 */
export type CompanionSomePresetDefinition<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionPresetDefinition<TManifest>
	| CompanionPresetAlternatives<TManifest>

// Future: Additional types will be added, as part of the graphics overhaul
export type CompanionPresetDefinition<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionSimplePresetDefinition<TManifest>
	| CompanionLayeredButtonPresetDefinition<TManifest>

/**
 * A group of alternative variants of a single logical preset.
 *
 * A module can offer several variants of "the same" preset (for example a rich `layered` variant and a
 * `simple` fallback) so that hosts with differing capabilities can each surface the best one they
 * support. This library does not decide or perform that selection: it simply forwards the group, and the
 * host application picks which variant to show based on its own capabilities.
 *
 * The whole group is referenced by a single id in the preset structure, exactly like a plain preset.
 */
export interface CompanionPresetAlternatives<TManifest extends InstanceTypes = InstanceTypes> {
	/**
	 * The type of the entry
	 */
	type: 'alternatives'

	/**
	 * The variants of this preset, ordered most-preferred first.
	 * The host application surfaces the first variant it is able to render.
	 */
	variants: CompanionPresetDefinition<TManifest>[]
}

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
	feedbacks: SomePresetSimpleFeedbackEntry<TManifest>[]

	/** Local variables on this button */
	localVariables?: CompanionPresetLocalVariable[]
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
	actions: SomePresetActionEntry<TManifest>[]
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
	down: SomePresetActionEntry<TManifest>[]
	/**
	 * The button up actions
	 * If any delay groups are defined, this becomes the short-press actions
	 */
	up: SomePresetActionEntry<TManifest>[]

	/** The button rotate left actions */
	rotate_left?: SomePresetActionEntry<TManifest>[]
	/** The button rotate right actions */
	rotate_right?: SomePresetActionEntry<TManifest>[]

	/**
	 * Long-press action groups
	 * Keyed by the duration (in milliseconds) after which the long-press actions should be executed
	 */
	[duration: number]: CompanionPresetActionsWithOptions<TManifest> | SomePresetActionEntry<TManifest>[]
}

/**
 * The configuration of an action in a preset
 */
export type CompanionPresetAction<
	TActionManifest extends Record<
		string,
		| CompanionActionSchemaWithoutResult<CompanionOptionValues>
		| CompanionActionSchemaWithResult<CompanionOptionValues, JsonValue>
	> = Record<
		string,
		| CompanionActionSchemaWithoutResult<CompanionOptionValues>
		| CompanionActionSchemaWithResult<CompanionOptionValues, JsonValue>
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

export interface CompanionPresetLocalVariableBase {
	/** The name of the local variable */
	variableName: string
	/**
	 * User editable description/comment for the local variable.
	 * Intended to describe the purpose/intent of the local variable.
	 */
	headline?: string
}
/**
 * The configuration of a simple local variable in a preset
 */
export interface CompanionSimplePresetLocalVariable extends CompanionPresetLocalVariableBase {
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

export type CompanionFeedbackLocalVariable<
	TFeedbackManifest extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>> = Record<
		string,
		CompanionFeedbackSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof TFeedbackManifest]: CompanionPresetLocalVariableBase & {
		variableType: 'feedback'
		/** The id of the feedback definition whose evaluated value drives this variable */
		feedbackId: K
		/** The option values for the feedback */
		options: CompanionPresetOptionValues<TFeedbackManifest[K]['options']>
	}
}[keyof TFeedbackManifest]

export type CompanionPresetLocalVariable<
	TFeedbackManifest extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>> = Record<
		string,
		CompanionFeedbackSchema<CompanionOptionValues>
	>,
> = CompanionSimplePresetLocalVariable | CompanionFeedbackLocalVariable<TFeedbackManifest>

export type CompanionPresetValue<T extends JsonValue | undefined> = T | ExpressionOrValue<T>
export type CompanionPresetOptionValues<T extends Record<string, JsonValue | undefined>> = {
	[K in keyof T]: CompanionPresetValue<T[K]>
}
