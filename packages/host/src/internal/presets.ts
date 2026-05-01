import { z } from 'zod'
import {
	createModuleLogger,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
} from '@companion-module/base'
import { elementSchema } from '../schema/elements.js'
import type { ActionManager } from './actions.js'
import type { FeedbackManager } from './feedback.js'
import { BANNED_PROPS } from './util.js'

const logger = createModuleLogger('PresetDefinitionsManager')

/** Collect all element IDs declared in a layered elements tree, recursing into group children */
function collectElementIds(elements: unknown[]): Set<string> {
	const ids = new Set<string>()
	for (const el of elements) {
		if (el && typeof el === 'object') {
			const elem = el as Record<string, unknown>
			if (typeof elem.id === 'string') ids.add(elem.id)
			if (Array.isArray(elem.children)) {
				for (const id of collectElementIds(elem.children)) ids.add(id)
			}
		}
	}
	return ids
}

export function sanitisePresetDefinitions(
	actionsManager: ActionManager,
	feedbacksManager: FeedbackManager,
	structure: CompanionPresetSection<any>[],
	presets: CompanionPresetDefinitions<any>,
): {
	structure: CompanionPresetSection<any>[]
	presets: CompanionPresetDefinitions<any>
} {
	const result: {
		structure: CompanionPresetSection<any>[]
		presets: CompanionPresetDefinitions<any>
	} = {
		structure: [],
		presets: {},
	}

	const validActionIds = new Set(actionsManager.getDefinitionIds())
	const validFeedbackIds = new Set(feedbacksManager.getDefinitionIds())

	const presetsWithInvalidActionIds: string[] = []
	const presetsWithInvalidFeedbackIds: string[] = []
	const presetsWithInvalidActionOptionKeys: string[] = []
	const presetsWithInvalidFeedbackOptionKeys: string[] = []
	const presetsWithInvalidElements: string[] = []
	const presetsWithInvalidStyleOverrideRefs: string[] = []
	const presetsFailedValidation: string[] = []

	for (const [_id, preset] of Object.entries(presets)) {
		if (!preset) continue
		if (BANNED_PROPS.has(_id)) {
			presetsFailedValidation.push(typeof preset.name === 'string' ? preset.name : _id)
			continue
		}
		if (preset.type !== 'simple' && preset.type !== 'layered') continue

		const presetName = typeof preset.name === 'string' ? preset.name : 'Unknown'

		try {
			// --- Structural validation ---
			if (!Array.isArray(preset.steps)) {
				presetsFailedValidation.push(presetName)
				continue
			}
			if (!Array.isArray(preset.feedbacks)) {
				presetsFailedValidation.push(presetName)
				continue
			}
			if (preset.type === 'simple' && (!preset.style || typeof preset.style !== 'object')) {
				presetsFailedValidation.push(presetName)
				continue
			}

			let sanitisedPreset = preset

			// --- layered-specific validation ---
			if (preset.type === 'layered') {
				if (!Array.isArray(preset.elements)) {
					presetsFailedValidation.push(presetName)
					continue
				}
				const elemParsed = z.array(elementSchema).safeParse(preset.elements)
				if (!elemParsed.success) {
					presetsWithInvalidElements.push(presetName)
					continue
				}
				sanitisedPreset = { ...preset, elements: elemParsed.data }
				// Validate that style override element IDs reference declared elements
				const elementIds = collectElementIds(elemParsed.data)
				let hasInvalidRef = false
				outerFeedback: for (const feedback of preset.feedbacks) {
					if (!Array.isArray(feedback?.styleOverrides)) continue
					for (const override of feedback.styleOverrides) {
						if (typeof override?.elementId === 'string' && !elementIds.has(override.elementId)) {
							hasInvalidRef = true
							break outerFeedback
						}
					}
				}
				if (hasInvalidRef) presetsWithInvalidStyleOverrideRefs.push(presetName)
			}

			// --- Validate feedback IDs and option keys ---
			let hasInvalidFeedback = false
			let hasInvalidFeedbackOptionKeys = false
			for (const feedback of preset.feedbacks) {
				const feedbackId = feedback?.feedbackId
				if (!validFeedbackIds.has(feedbackId)) {
					hasInvalidFeedback = true
				} else {
					const def = feedbacksManager.getDefinition(feedbackId)
					if (def && feedback.options && typeof feedback.options === 'object') {
						const validKeys = new Set(def.options.map((f) => f.id))
						for (const key of Object.keys(feedback.options)) {
							if (!validKeys.has(key)) {
								hasInvalidFeedbackOptionKeys = true
								break
							}
						}
					}
				}
			}
			if (hasInvalidFeedback) presetsWithInvalidFeedbackIds.push(presetName)
			if (hasInvalidFeedbackOptionKeys) presetsWithInvalidFeedbackOptionKeys.push(presetName)

			// --- Validate action IDs and option keys across all steps ---
			let hasInvalidAction = false
			let hasInvalidActionOptionKeys = false
			for (const step of preset.steps) {
				// Check named action arrays
				const namedKeys = ['down', 'up', 'rotate_left', 'rotate_right'] as const
				for (const key of namedKeys) {
					const actions = step[key]
					if (!Array.isArray(actions)) continue
					for (const action of actions) {
						const actionId = action?.actionId
						if (!validActionIds.has(actionId)) {
							hasInvalidAction = true
						} else {
							const def = actionsManager.getDefinition(actionId)
							if (def && action.options && typeof action.options === 'object') {
								const validKeys = new Set(def.options.map((f) => f.id))
								for (const optKey of Object.keys(action.options)) {
									if (!validKeys.has(optKey)) {
										hasInvalidActionOptionKeys = true
										break
									}
								}
							}
						}
					}
				}
				// Check numbered delay-group properties
				for (const [key, value] of Object.entries(step)) {
					if (!/^\d+$/.test(key)) continue
					const actions = Array.isArray(value) ? value : value?.actions
					if (!Array.isArray(actions)) continue
					for (const action of actions) {
						const actionId = action?.actionId
						if (!validActionIds.has(actionId)) {
							hasInvalidAction = true
						} else {
							const def = actionsManager.getDefinition(actionId)
							if (def && action.options && typeof action.options === 'object') {
								const validKeys = new Set(def.options.map((f) => f.id))
								for (const optKey of Object.keys(action.options)) {
									if (!validKeys.has(optKey)) {
										hasInvalidActionOptionKeys = true
										break
									}
								}
							}
						}
					}
				}
			}
			if (hasInvalidAction) presetsWithInvalidActionIds.push(presetName)
			if (hasInvalidActionOptionKeys) presetsWithInvalidActionOptionKeys.push(presetName)

			result.presets[_id] = sanitisedPreset
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
	if (presetsWithInvalidFeedbackOptionKeys.length > 0) {
		logger.warn(
			`The following preset definitions reference unknown feedback option keys: ${presetsWithInvalidFeedbackOptionKeys
				.sort()
				.join(', ')}`,
		)
	}
	if (presetsWithInvalidActionOptionKeys.length > 0) {
		logger.warn(
			`The following preset definitions reference unknown action option keys: ${presetsWithInvalidActionOptionKeys
				.sort()
				.join(', ')}`,
		)
	}
	if (presetsWithInvalidElements.length > 0) {
		logger.warn(
			`The following layered preset definitions contain invalid elements: ${presetsWithInvalidElements
				.sort()
				.join(', ')}`,
		)
	}
	if (presetsWithInvalidStyleOverrideRefs.length > 0) {
		logger.warn(
			`The following layered preset definitions contain feedback style overrides referencing unknown element IDs: ${presetsWithInvalidStyleOverrideRefs
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

		result.structure.push(section)
	}

	// Check for presets not referenced by structure
	const presetsNotReferenced: string[] = []
	for (const [presetId, preset] of Object.entries(presets)) {
		if (!preset) continue
		if (!referencedPresetIds.has(presetId)) {
			presetsNotReferenced.push(presetId)
		}
	}

	// Check for missing presets referenced by structure
	const referencedMissing: string[] = []
	for (const presetId of referencedPresetIds) {
		if (!presets[presetId]) {
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

	return result
}
