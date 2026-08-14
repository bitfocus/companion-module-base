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
 * Convert an arbitrary JSON value into a string representation.
 *
 * Strings are returned unchanged, numbers and booleans are stringified with `String()`, and anything
 * else (objects, arrays, `null`) is run through `JSON.stringify`. `undefined` becomes an empty string.
 *
 * Note: this matches Companion's `stringifyVariableValue` behaviour so that validation is consistent
 * between Companion and other apps using these primitives.
 */
export function stringifyValue(value: JsonValue | undefined): string {
	if (value === undefined) return ''
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
	return JSON.stringify(value)
}
