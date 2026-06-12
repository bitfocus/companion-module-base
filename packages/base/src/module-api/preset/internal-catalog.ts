import type {
	Equal,
	Expect,
	// eslint-disable-next-line n/no-missing-import
} from 'type-testing'
import type { JsonValue } from '../../common/json-value.js'
import type { CompanionActionSchemaWithoutResult, CompanionActionSchemaWithResult } from '../action.js'
import type { CompanionFeedbackSchema } from '../feedback.js'
import type { CompanionOptionValues } from '../input.js'

/**
 * Companion's built-in "internal" actions that may be referenced from a module's presets.
 *
 * These are exposed under reserved `internal:*` ids which are merged into the preset action manifest,
 * so they can be used alongside a module's own actions in presets. Companion translates each of these
 * to the matching internal action when a preset is imported onto a control, resolving any references
 * (such as the button location) to the control the preset is placed on.
 *
 * This list is deliberately small and self-scoped; it can grow over future api versions. When adding
 * a new entry, also add it to {@link INTERNAL_PRESET_MIN_API_VERSION}.
 */
export type CompanionInternalActionSchemas = {
	/** Wait for a specified amount of time */
	'internal:wait': { options: { time: number } }
	/** Write a message to the Companion log */
	'internal:customLog': { options: { message: string } }
	/** Abort the actions currently running on this button */
	'internal:abortButton': { options: { skipReleaseActions?: boolean } }
	/** Set the value of one of this button's local variables */
	'internal:localVariableSet': { options: { name: string; value: string } }
}

/**
 * Companion's built-in "internal" feedbacks that may be referenced from a module's presets.
 *
 * As with {@link CompanionInternalActionSchemas}, these are exposed under reserved `internal:*` ids and
 * translated by Companion at preset import time. The `type` of each feedback drives whether a `style`
 * (and `isInverted`) is required when used in a preset, exactly as for a module's own feedbacks.
 *
 * When adding a new entry, also add it to {@link INTERNAL_PRESET_MIN_API_VERSION}.
 */
export type CompanionInternalFeedbackSchemas = {
	/** Change style based on a boolean expression */
	'internal:checkExpression': { type: 'boolean'; options: { expression: string } }
	/** Change style when this button is being pressed */
	'internal:buttonPushed': { type: 'boolean'; options: { treatSteppedAsPressed?: boolean } }
	/** Change style based on the current step of this button */
	'internal:buttonCurrentStep': { type: 'boolean'; options: { step: number } }
}

/**
 * The reserved ids for the internal "building block" (logic/flow) actions and feedbacks. These nest
 * other entries via child groups, so unlike the flat catalog above they are not expressed as schema
 * records here; their full types live in the preset definition files. This union exists so the version
 * map below stays exhaustive, and is cross-checked against those types (see the drift-guard type-test in
 * definition.ts).
 */
export type InternalPresetBuildingBlockId =
	| 'internal:actionGroup'
	| 'internal:logicIf'
	| 'internal:logicWhile'
	| 'internal:logicOperator'

/**
 * The minimum module api version required to use each internal preset action/feedback id.
 *
 * The host uses this to drop (with a warning) any internal preset entry that a module is too old to be
 * allowed to use. This lets the catalog above grow over future api versions without ever letting an
 * older module emit an id it predates.
 */
export const INTERNAL_PRESET_MIN_API_VERSION: Record<
	keyof CompanionInternalActionSchemas | keyof CompanionInternalFeedbackSchemas | InternalPresetBuildingBlockId,
	string
> = {
	'internal:wait': '2.1.0-0',
	'internal:customLog': '2.1.0-0',
	'internal:abortButton': '2.1.0-0',
	'internal:localVariableSet': '2.1.0-0',
	'internal:checkExpression': '2.1.0-0',
	'internal:buttonPushed': '2.1.0-0',
	'internal:buttonCurrentStep': '2.1.0-0',
	'internal:actionGroup': '2.1.0-0',
	'internal:logicIf': '2.1.0-0',
	'internal:logicWhile': '2.1.0-0',
	'internal:logicOperator': '2.1.0-0',
}

// --- Type-level assertions ---------------------------------------------------------------------
// Ensure the catalog interfaces above are valid action/feedback schema records, so that they can be
// merged into the preset manifest types. A missing `type`, a bad `type` literal, or a non-JsonValue
// option will cause one of these to fail to compile.

type _AssertActionSchemas = Expect<
	Equal<
		CompanionInternalActionSchemas extends Record<
			string,
			| CompanionActionSchemaWithoutResult<CompanionOptionValues>
			| CompanionActionSchemaWithResult<CompanionOptionValues, JsonValue>
		>
			? true
			: false,
		true
	>
>

type _AssertFeedbackSchemas = Expect<
	Equal<
		CompanionInternalFeedbackSchemas extends Record<string, CompanionFeedbackSchema<CompanionOptionValues>>
			? true
			: false,
		true
	>
>

// Ensure the version map covers exactly the catalog ids (no missing or stray entries).
type _AssertVersionMapKeys = Expect<
	Equal<
		keyof typeof INTERNAL_PRESET_MIN_API_VERSION,
		keyof CompanionInternalActionSchemas | keyof CompanionInternalFeedbackSchemas | InternalPresetBuildingBlockId
	>
>
