import { colord } from 'colord'
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

const rgbRev = (dec: number, alwaysIncludesAlpha = false): { a: number; r: number; g: number; b: number } => {
	dec = Math.floor(dec)
	return {
		a: dec > 0xffffff || alwaysIncludesAlpha ? (255 - ((dec & 0xff000000) >>> 24)) / 255 : 1,
		r: (dec & 0xff0000) >>> 16,
		g: (dec & 0x00ff00) >>> 8,
		b: dec & 0x0000ff,
	}
}

/**
 * Parse a color number or css color string into a css color string.
 * Invalid values (that are not a number and not a valid css color) become `rgba(0, 0, 0, 0)`.
 */
export function parseColor(color: number | string, skipValidation = false): string {
	if (typeof color === 'number' || (typeof color === 'string' && !isNaN(Number(color)))) {
		const col = rgbRev(Number(color))
		return `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a})`
	}
	if (typeof color === 'string') {
		if (skipValidation) return color
		if (colord(color).isValid()) {
			return color
		} else {
			return 'rgba(0, 0, 0, 0)'
		}
	}
	return 'rgba(0, 0, 0, 0)'
}

/**
 * Convert a color number or css color string into a Companion color number (0xAARRGGBB, where alpha
 * is inverted so that `0` is fully opaque). Invalid values become `0`.
 */
export function colorToNumber(color: number | string): number {
	if (typeof color === 'number') return Number.isFinite(color) ? color : 0
	const asNumber = Number(color)
	if (color.trim() !== '' && Number.isFinite(asNumber)) return asNumber
	if (!colord(color).isValid()) return 0

	const { r, g, b, a } = colord(color).toRgb()
	const alphaByte = Math.round(255 * (1 - a))
	return ((r << 16) | (g << 8) | b) + (alphaByte > 0 ? alphaByte * 0x1000000 : 0)
}
