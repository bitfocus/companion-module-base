import {
	createModuleLogger,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
} from '@companion-module/base'
import type { ActionManager } from './actions.js'
import type { FeedbackManager } from './feedback.js'

const logger = createModuleLogger('PresetDefinitionsManager')

export function validatePresetDefinitions(
	actionsManager: ActionManager,
	feedbacksManager: FeedbackManager,
	structure: CompanionPresetSection<any>[],
	presets: CompanionPresetDefinitions<any>,
): void {
	const validActionIds = new Set(actionsManager.getDefinitionIds())
	const validFeedbackIds = new Set(feedbacksManager.getDefinitionIds())

	const presetsWithInvalidActionIds: string[] = []
	const presetsWithInvalidFeedbackIds: string[] = []
	const presetsFailedValidation: string[] = []

	for (const [_id, preset] of Object.entries(presets)) {
		if (!preset) continue
		if (preset.type !== 'simple') continue

		const presetName = typeof preset.name === 'string' ? preset.name : 'Unknown'

		try {
			// Validate feedback IDs
			let hasInvalidFeedback = false
			if (Array.isArray(preset.feedbacks)) {
				for (const feedback of preset.feedbacks) {
					if (!validFeedbackIds.has(feedback.feedbackId)) {
						hasInvalidFeedback = true
						break
					}
				}
			}
			if (hasInvalidFeedback) presetsWithInvalidFeedbackIds.push(presetName)

			// Validate action IDs across all steps
			let hasInvalidAction = false
			if (Array.isArray(preset.steps)) {
				for (const step of preset.steps) {
					if (hasInvalidAction) break

					// Check named action arrays
					const namedKeys = ['down', 'up', 'rotate_left', 'rotate_right'] as const
					for (const key of namedKeys) {
						const actions = step[key]
						if (Array.isArray(actions)) {
							for (const action of actions) {
								if (!validActionIds.has(action.actionId)) {
									hasInvalidAction = true
									break
								}
							}
						}
						if (hasInvalidAction) break
					}

					if (hasInvalidAction) break

					// Check numbered delay properties
					for (const [key, value] of Object.entries(step)) {
						if (hasInvalidAction) break
						if (/^\d+$/.test(key)) {
							const actions = Array.isArray(value) ? value : value?.actions
							if (Array.isArray(actions)) {
								for (const action of actions) {
									if (!validActionIds.has(action.actionId)) {
										hasInvalidAction = true
										break
									}
								}
							}
						}
					}
				}
			}
			if (hasInvalidAction) presetsWithInvalidActionIds.push(presetName)
		} catch (_e) {
			presetsFailedValidation.push(presetName)
		}
	}

	if (presetsFailedValidation.length > 0) {
		logger.warn(
			`The following preset definitions have errors and could not be validated: ${presetsFailedValidation
				.sort()
				.join(', ')}`,
		)
	}
	if (presetsWithInvalidFeedbackIds.length > 0) {
		logger.warn(
			`The following preset definitions reference unknown feedback definitions: ${presetsWithInvalidFeedbackIds
				.sort()
				.join(', ')}`,
		)
	}
	if (presetsWithInvalidActionIds.length > 0) {
		logger.warn(
			`The following preset definitions reference unknown action definitions: ${presetsWithInvalidActionIds
				.sort()
				.join(', ')}`,
		)
	}

	// Cross-reference validation between structure and presets
	const referencedPresetIds = new Set<string>()

	for (const section of structure) {
		if (!Array.isArray(section.definitions)) continue

		for (const def of section.definitions) {
			if (typeof def === 'string') {
				// Direct preset reference
				referencedPresetIds.add(def)
			} else if (def && typeof def === 'object') {
				// Preset group
				if (def.type === 'simple' && 'presets' in def && Array.isArray(def.presets)) {
					for (const presetId of def.presets) {
						if (typeof presetId === 'string') {
							referencedPresetIds.add(presetId)
						}
					}
				} else if (def.type === 'template' && 'presetId' in def && typeof def.presetId === 'string') {
					referencedPresetIds.add(def.presetId)
				}
			}
		}
	}

	// Check for presets not referenced by structure
	const presetsNotReferenced: string[] = []
	for (const presetId of Object.keys(presets)) {
		if (!referencedPresetIds.has(presetId)) {
			presetsNotReferenced.push(presetId)
		}
	}

	// Check for missing presets referenced by structure
	const referencedMissing: string[] = []
	for (const presetId of referencedPresetIds) {
		if (!(presetId in presets)) {
			referencedMissing.push(presetId)
		}
	}

	if (presetsNotReferenced.length > 0) {
		logger.warn(
			`The following preset definitions exist in presets but are not referenced by structure: ${presetsNotReferenced
				.sort()
				.join(', ')}`,
		)
	}

	if (referencedMissing.length > 0) {
		logger.warn(
			`The following presets are referenced in structure but do not exist in presets: ${referencedMissing
				.sort()
				.join(', ')}`,
		)
	}
}
