import semver from 'semver'
import { INTERNAL_PRESET_MIN_API_VERSION } from '@companion-module/base'
import type { FeedbackApiFeatures } from './feedback.js'
import type { PresetApiFeatures } from './presets.js'

/**
 * The behaviours which depend on the api version the module was built against, grouped by where they are used.
 * Resolved once when the module is launched, so that the api version doesn't need to be compared each time
 * the module updates its definitions.
 */
export interface ModuleApiFeatures {
	/** 2.2.0: Variable ids which don't match the valid pattern are rejected, instead of just warned about */
	rejectInvalidVariableIds: boolean
	feedbacks: FeedbackApiFeatures
	presets: PresetApiFeatures
}

export function getModuleApiFeatures(moduleApiVersion: string): ModuleApiFeatures {
	const validModuleApiVersion = semver.valid(moduleApiVersion, { loose: true })

	const isAtLeast = (minApiVersion: string): boolean =>
		validModuleApiVersion !== null && semver.gte(validModuleApiVersion, minApiVersion, { loose: true })

	return {
		rejectInvalidVariableIds: isAtLeast('2.2.0-0'),
		feedbacks: {
			checkAffectedProperties: isAtLeast('2.1.0-0'),
		},
		presets: {
			actionStoreResult: isAtLeast('2.2.0-0'),
			expressionLocalVariables: isAtLeast('2.3.0-0'),
			internalIds: new Set(
				Object.entries(INTERNAL_PRESET_MIN_API_VERSION as Record<string, string>)
					.filter(([, minApiVersion]) => isAtLeast(minApiVersion))
					.map(([id]) => id),
			),
		},
	}
}
