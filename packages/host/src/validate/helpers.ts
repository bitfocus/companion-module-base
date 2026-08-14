import type { JsonValue } from '@companion-module/base'

/**
 * Compile a user provided regex string of the form `/pattern/flags` into a `RegExp`.
 * Returns `null` when the string is empty, malformed, or not in the `/pattern/flags` form.
 */
export function compileRegex(regex: string | undefined): RegExp | null {
	if (!regex) return null

	try {
		const match = /^\/(.*)\/(.*)$/.exec(regex)
		if (match) {
			return new RegExp(match[1], match[2])
		} else {
			return null
		}
	} catch {
		return null
	}
}

/**
 * Convert an arbitrary value into its string representation.
 *
 * Strings pass through unchanged, numbers and booleans use `toString()`, and everything else
 * (objects, arrays, `null`) goes through `JSON.stringify` - which returns `undefined` for an
 * `undefined` input. Callers that need a guaranteed string should coerce with `?? ''`.
 *
 * This is the canonical implementation intended to be shared across Companion and other apps that use
 * these primitives, so a given value always stringifies the same way everywhere.
 */
export function stringifyVariableValue(value: JsonValue | undefined): string | null | undefined {
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
	return JSON.stringify(value)
}
