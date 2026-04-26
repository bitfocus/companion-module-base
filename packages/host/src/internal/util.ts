import { SomeCompanionActionInputField, SomeCompanionFeedbackInputField } from '../main.js'

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
