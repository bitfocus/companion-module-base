import type { JsonValue } from '@companion-module/base'

/** Compile a `/pattern/flags` regex string into a `RegExp`, or `null` if it is empty or malformed. */
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

/** Note: returns `undefined` for an `undefined` input, so coerce with `?? ''` if you need a string. */
export function stringifyVariableValue(value: JsonValue | undefined): string | null | undefined {
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
	return JSON.stringify(value)
}
