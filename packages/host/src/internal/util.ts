import type { SomeCompanionActionInputField, SomeCompanionFeedbackInputField } from '../main.js'

/** Properties that must never be used as action/feedback/preset/variable IDs to prevent prototype pollution */
export const BANNED_PROPS = new Set([
	'__proto__',
	'constructor',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
])

export function hasAnyOldIsVisibleFunctions(
	options: (SomeCompanionActionInputField | SomeCompanionFeedbackInputField)[] | undefined,
): boolean {
	if (!options) return false

	for (const option of options) {
		if ('isVisible' in option && !!option.isVisible) return true
	}

	return false
}

export function hasAnyOldRequiredProperties(
	options: (SomeCompanionActionInputField | SomeCompanionFeedbackInputField)[] | undefined,
): boolean {
	if (!options) return false

	for (const option of options) {
		if ('required' in option && typeof option.required === 'boolean') return true
	}

	return false
}

/**
 * Find any option ids which are used by more than one input field in the same group, and remove the
 * duplicates so that only the first usage of each id is preserved.
 *
 * Duplicate ids cause unpredictable behaviour, as the fields would otherwise overwrite each other's values.
 */
export function filterDuplicateOptionIds<T extends { id: string }>(
	options: T[],
): { options: T[]; duplicateIds: string[] } {
	const seen = new Set<string>()
	const duplicates = new Set<string>()
	const filtered: T[] = []

	for (const option of options) {
		if (seen.has(option.id)) {
			duplicates.add(option.id)
		} else {
			seen.add(option.id)
			filtered.push(option)
		}
	}

	// Preserve the original array when there is nothing to remove
	if (duplicates.size === 0) return { options, duplicateIds: [] }

	return { options: filtered, duplicateIds: Array.from(duplicates) }
}
