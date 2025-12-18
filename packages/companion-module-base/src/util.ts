import { HslaColor, HsvaColor, colord } from 'colord'
import type { InputValue } from './module-api/input.js'

/**
 * Assert a certain type for a literal.
 * This can be used to correctly type parts of an object in TypeScript.
 *
 * ### Example
 *  ```ts
 * {
 *  [ActionId.MyAction]: literal<CompanionActionDefinition>({
 *   name: 'My Action',
 *   // ...
 *  })
 * }
 * ```
 *
 * instead of this
 * ```ts
 * {
 *  [ActionId.MyAction]: {
 *   name: 'My Action',
 *   // ...
 *  }
 * }
 * ```
 */
export function literal<T>(v: T): T {
	return v
}

/** Type assert that a value is never */
export function assertNever(_val: never): void {
	// Nothing to do
}

export interface RgbComponents {
	r: number
	g: number
	b: number
	a?: number
}

/**
 * Combine separate RGB component to one single numerical value.
 * The RGB component have to be in a range of 0-255.
 * There can also be an alpha component in a range of 0.0-1.0 (0 = transparent).
 *
 * **Note:** Companion's components can use any CSS color string and you should prefer these strings. E.g.for a button style you can also use `'#ff8800'` or `'rgb(255, 128, 0)'` without calling a function.
 *
 * ### Example
 *
 * ```js
 * defaultStyle: {
 *  bgcolor: combineRgb(255, 0, 0),
 *  color: combineRgb(255, 255, 255),
 * }
 * ```
 */
export function combineRgb(r: number, g: number, b: number, a?: number): number {
	let colorNumber: number = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
	if (a && a >= 0 && a < 1) {
		colorNumber += 0x1000000 * Math.round(255 * (1 - a)) // add possible transparency to number
	}
	return colorNumber
}

/**
 * Split a combined color value to separate RGBA component values
 * the color can be either the Companion color number or a CSS compatible color string
 * return object will always include an alpha value (0.0-1.0), defaulting to 1 if input has no alpha information
 */
export function splitRgb(color: number | string): RgbComponents {
	if (typeof color === 'number') {
		if (color > 0xffffff) {
			return {
				r: (color >> 16) & 0xff,
				g: (color >> 8) & 0xff,
				b: color & 0xff,
				a: (255 - ((color >> 24) & 0xff)) / 255,
			}
		} else {
			return {
				r: (color >> 16) & 0xff,
				g: (color >> 8) & 0xff,
				b: color & 0xff,
				a: 1,
			}
		}
	} else if (typeof color === 'string' && colord(color).isValid()) {
		const rgb = colord(color).toRgb()
		return {
			r: rgb.r,
			g: rgb.g,
			b: rgb.b,
			a: rgb.a,
		}
	} else {
		return {
			r: 0,
			g: 0,
			b: 0,
			a: 1,
		}
	}
}

/**
 * Split a combined color value to separate HSLA component values
 * the color can be either the Companion color number or a CSS compatible color string
 * return object will always include an alpha value (0.0-1.0), defaulting to 1 if input has no alpha information
 */
export function splitHsl(color: number | string): HslaColor {
	const rgb = splitRgb(color)
	const hsl = colord(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`).toHsl()
	return hsl
}

/**
 * Split a combined color value to separate HSVA component values
 * the color can be either the Companion color number or a CSS compatible color string
 * return object will always include an alpha value (0.0-1.0), defaulting to 1 if input has no alpha information
 */
export function splitHsv(color: number | string): HsvaColor {
	const rgb = splitRgb(color)
	const hsv = colord(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`).toHsv()
	return hsv
}

/**
 * Takes a color value and returns a string with Hex notation of that color
 * the color can be either the Companion color number or a CSS compatible color string
 * if input color has no alpha or alpha of 1, return will be in format '#rrggbb', else '#rrggbbaa'
 */
export function splitHex(color: number | string): string {
	const rgb = splitRgb(color)
	const hex = colord(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`).toHex()
	return hex
}

/**
 * Make all optional properties be required and `| undefined`
 * This is useful to ensure that no property is missed, when manually converting between types, but allowing fields to be undefined
 */
export type Complete<T> = {
	[P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}

/**
 * Parse common escape characters in strings passed to callback from action or feedback options.
 * This is useful to ensure \r, \n etc are represented as such rather than as \\r, \\n
 */

export function parseEscapeCharacters(msg: string): string {
	const message = msg
		.replaceAll('\\n', '\n')
		.replaceAll('\\r', '\r')
		.replaceAll('\\t', '\t')
		.replaceAll('\\f', '\f')
		.replaceAll('\\v', '\v')
		.replaceAll('\\b', '\b')
		.replaceAll('\\\\', '\\')
		.replaceAll('\\x00', '\x00')
		.replaceAll('\\x01', '\x01')
		.replaceAll('\\x02', '\x02')
		.replaceAll('\\x03', '\x03')
	return message
}

/**
 * The reverse of parseEscapeCharacters. This is useful to to ensure special charaters are displayed normally when returned to the UI.
 * Ie during a learn callback, or as a variable
 */

export function substituteEscapeCharacters(msg: string): string {
	const message = msg
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
		.replaceAll('\t', '\\t')
		.replaceAll('\f', '\\f')
		.replaceAll('\v', '\\v')
		.replaceAll('\b', '\\b')
		.replaceAll('\\', '\\\\')
		.replaceAll('\x00', '\\x00')
		.replaceAll('\x01', '\\x01')
		.replaceAll('\x02', '\\x02')
		.replaceAll('\x03', '\\x03')
	return message
}

export type OptionsObject = { [key: string]: InputValue | undefined }
