import type {
	SomeButtonGraphicsElement,
	SomeCompanionActionInputField,
	SomeCompanionFeedbackInputField,
} from '../main.js'

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

const ELEMENT_TYPES_LIST = [
	'group',
	'composite',
	'text',
	'image',
	'box',
	'line',
	'circle',
] as const satisfies SomeButtonGraphicsElement['type'][]

// Compile-time check: errors if a new type is added to SomeButtonGraphicsElement but omitted from ELEMENT_TYPES_LIST
type _AssertAllElementTypesCovered = [SomeButtonGraphicsElement['type']] extends [(typeof ELEMENT_TYPES_LIST)[number]]
	? true
	: never
true satisfies _AssertAllElementTypesCovered

export const VALID_ELEMENT_TYPES: ReadonlySet<string> = new Set(ELEMENT_TYPES_LIST)

/** Returns true if any element (or nested child) has an unrecognised type */
export function hasInvalidElementType(elements: unknown[]): boolean {
	for (const el of elements) {
		if (!el || typeof el !== 'object') return true
		const elem = el as Record<string, unknown>
		if (typeof elem.type !== 'string' || !VALID_ELEMENT_TYPES.has(elem.type)) return true
		if (Array.isArray(elem.children) && hasInvalidElementType(elem.children)) return true
	}
	return false
}
