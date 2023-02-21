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
}

/**
 * Combine separate RGB component to one single value to be used in feedback styles
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
export function combineRgb(r: number, g: number, b: number): number {
	return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

/**
 * Split a combined color value to separate RGB component values
 */
export function splitRgb(dec: number): RgbComponents {
	return {
		r: (dec & 0xff0000) >> 16,
		g: (dec & 0x00ff00) >> 8,
		b: dec & 0x0000ff,
	}
}

/**
 * Make all optional properties be required and `| undefined`
 * This is useful to ensure that no property is missed, when manually converting between types, but allowing fields to be undefined
 */
export type Complete<T> = {
	[P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}
