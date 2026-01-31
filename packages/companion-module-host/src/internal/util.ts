import { SomeCompanionActionInputField, SomeCompanionFeedbackInputField } from '../main.js'

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
