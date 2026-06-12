import semver from 'semver'
import { z } from 'zod'
import {
	createModuleLogger,
	INTERNAL_PRESET_MIN_API_VERSION,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
} from '@companion-module/base'
import { elementSchema } from '../schema/elements.js'
import type { ActionManager } from './actions.js'
import type { FeedbackManager } from './feedback.js'
import { BANNED_PROPS } from './util.js'

const logger = createModuleLogger('PresetDefinitionsManager')

/** Guard against pathological nesting when recursing into building-block child groups */
const MAX_PRESET_NESTING_DEPTH = 10

/** Whether an action/feedback id references one of Companion's built-in internal definitions */
function isInternalId(id: unknown): id is string {
	return typeof id === 'string' && id.startsWith('internal:')
}

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
	moduleApiVersion: string,
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

	const validModuleApiVersion = semver.valid(moduleApiVersion, { loose: true })

	/**
	 * Whether the module is allowed to reference the given internal action/feedback id.
	 * Unknown internal ids, or ids the module is too old to use, are not allowed and will be dropped.
	 */
	function isInternalIdAllowed(id: string): boolean {
		const minApiVersion = (INTERNAL_PRESET_MIN_API_VERSION as Record<string, string | undefined>)[id]
		if (!minApiVersion) return false
		if (!validModuleApiVersion) return false
		return semver.gte(validModuleApiVersion, minApiVersion, { loose: true })
	}

	/**
	 * Drop any `internal:*` action/feedback entries the module is not allowed to use (unknown ids, or
	 * ids the module is too old for). Allowed internal entries and all module-own entries are kept as-is,
	 * recursing into the child groups of building-block entries. Returns new feedbacks/steps arrays, and
	 * whether anything was dropped.
	 */
	function dropDisallowedInternalEntries(preset: any): { feedbacks: any; steps: any; dropped: boolean } {
		let dropped = false
		const keep = (id: unknown): boolean => {
			if (!isInternalId(id)) return true
			if (isInternalIdAllowed(id)) return true
			dropped = true
			return false
		}

		/**
		 * Recursively filter an array of action/feedback/condition entries: drop disallowed internal
		 * entries, and filter the child groups of any building-block entry that remains.
		 */
		const filterEntries = (entries: unknown, depth: number): unknown => {
			if (!Array.isArray(entries)) return entries
			if (depth > MAX_PRESET_NESTING_DEPTH) return entries
			const out: unknown[] = []
			for (const entry of entries) {
				if (!keep(entry?.actionId ?? entry?.feedbackId)) continue
				if (entry && typeof entry === 'object' && entry.children && typeof entry.children === 'object') {
					const children: Record<string, unknown> = {}
					for (const [groupId, childEntries] of Object.entries(entry.children)) {
						children[groupId] = filterEntries(childEntries, depth + 1)
					}
					out.push({ ...entry, children })
				} else {
					out.push(entry)
				}
			}
			return out
		}

		const feedbacks = filterEntries(preset.feedbacks, 0)

		const steps = Array.isArray(preset.steps)
			? preset.steps.map((step: any) => {
					const out: Record<string, unknown> = {}
					for (const [key, value] of Object.entries(step)) {
						if (key === 'down' || key === 'up' || key === 'rotate_left' || key === 'rotate_right') {
							out[key] = filterEntries(value, 0)
						} else if (/^\d+$/.test(key)) {
							if (Array.isArray(value)) {
								out[key] = filterEntries(value, 0)
							} else if (value && typeof value === 'object' && Array.isArray((value as any).actions)) {
								out[key] = { ...(value as any), actions: filterEntries((value as any).actions, 0) }
							} else {
								out[key] = value
							}
						} else {
							out[key] = value
						}
					}
					return out
				})
			: preset.steps

		return { feedbacks, steps, dropped }
	}

	const presetsWithInvalidActionIds: string[] = []
	const presetsWithInvalidFeedbackIds: string[] = []
	const presetsWithInvalidActionOptionKeys: string[] = []
	const presetsWithInvalidFeedbackOptionKeys: string[] = []
	const presetsWithInvalidElements: string[] = []
	const presetsWithInvalidStyleOverrideRefs: string[] = []
	const presetsWithDisallowedInternalIds: string[] = []
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

			// --- Drop internal:* entries the module is not allowed to reference ---
			const internalFiltered = dropDisallowedInternalEntries(sanitisedPreset)
			sanitisedPreset = {
				...sanitisedPreset,
				feedbacks: internalFiltered.feedbacks,
				steps: internalFiltered.steps,
			}
			if (internalFiltered.dropped) presetsWithDisallowedInternalIds.push(presetName)

			// --- Validate feedback/action IDs and option keys, recursing into building-block children ---
			let hasInvalidFeedback = false
			let hasInvalidFeedbackOptionKeys = false
			let hasInvalidAction = false
			let hasInvalidActionOptionKeys = false

			const hasUnknownOptionKeys = (def: { options: Array<{ id: string }> } | undefined, options: unknown): boolean => {
				if (!def || !options || typeof options !== 'object') return false
				const validKeys = new Set(def.options.map((f) => f.id))
				for (const key of Object.keys(options)) {
					if (!validKeys.has(key)) return true
				}
				return false
			}

			const validateFeedbackEntry = (feedback: any, depth: number): void => {
				const feedbackId = feedback?.feedbackId
				// internal references are handled by the filtering above, not validated here
				if (!isInternalId(feedbackId)) {
					if (!validFeedbackIds.has(feedbackId)) {
						hasInvalidFeedback = true
					} else if (hasUnknownOptionKeys(feedbacksManager.getDefinition(feedbackId), feedback?.options)) {
						hasInvalidFeedbackOptionKeys = true
					}
				}
				validateChildren(feedback, depth)
			}

			const validateActionEntry = (action: any, depth: number): void => {
				const actionId = action?.actionId
				// internal references are handled by the filtering above, not validated here
				if (!isInternalId(actionId)) {
					if (!validActionIds.has(actionId)) {
						hasInvalidAction = true
					} else if (hasUnknownOptionKeys(actionsManager.getDefinition(actionId), action?.options)) {
						hasInvalidActionOptionKeys = true
					}
				}
				validateChildren(action, depth)
			}

			/** Validate the child groups of a building-block entry, dispatching each child by its shape */
			const validateChildren = (entry: any, depth: number): void => {
				if (depth > MAX_PRESET_NESTING_DEPTH) return
				if (!entry || typeof entry !== 'object') return
				if (!entry.children || typeof entry.children !== 'object') return
				for (const childEntries of Object.values(entry.children)) {
					if (!Array.isArray(childEntries)) continue
					for (const child of childEntries) {
						// Child groups hold feedbacks (eg condition groups) or actions; dispatch by shape
						if (child && typeof child === 'object' && 'feedbackId' in child) {
							validateFeedbackEntry(child, depth + 1)
						} else {
							validateActionEntry(child, depth + 1)
						}
					}
				}
			}

			// Validate the sanitised preset, so the children of dropped internal entries are not validated
			for (const feedback of sanitisedPreset.feedbacks) {
				validateFeedbackEntry(feedback, 0)
			}

			for (const step of sanitisedPreset.steps) {
				if (!step || typeof step !== 'object') continue
				for (const [key, value] of Object.entries(step)) {
					let actions: unknown
					if (key === 'down' || key === 'up' || key === 'rotate_left' || key === 'rotate_right') {
						actions = value
					} else if (/^\d+$/.test(key)) {
						// Numbered delay-group properties
						actions = Array.isArray(value) ? value : value?.actions
					} else {
						continue
					}
					if (!Array.isArray(actions)) continue
					for (const action of actions) {
						validateActionEntry(action, 0)
					}
				}
			}

			if (hasInvalidFeedback) presetsWithInvalidFeedbackIds.push(presetName)
			if (hasInvalidFeedbackOptionKeys) presetsWithInvalidFeedbackOptionKeys.push(presetName)
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
	if (presetsWithDisallowedInternalIds.length > 0) {
		logger.warn(
			`The following preset definitions reference internal actions/feedbacks which are not available to this module (unknown id, or the module's api version is too old) and have been removed: ${presetsWithDisallowedInternalIds
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
