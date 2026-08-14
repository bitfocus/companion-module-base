import { colord } from 'colord'

/**
 * How the top byte of a packed 32-bit colour number is interpreted.
 *
 * - `companion-ttrrggbb` — the top byte is *transparency* (`0` = fully opaque, `255` = fully
 *   transparent). This is Companion's native format.
 * - `standard-aarrggbb` — the top byte is *alpha* (`0` = fully transparent, `255` = fully opaque).
 *
 * In both encodings a value that fits in 24 bits (`<= 0xffffff`) has no top byte and is treated as
 * fully opaque.
 */
export type ColorInputEncoding = 'companion-ttrrggbb' | 'standard-aarrggbb'

/** An unpacked colour. Channels are 0-255; alpha is a 0-1 fraction where `1` is fully opaque. */
export interface Rgba {
	r: number
	g: number
	b: number
	a: number
}

/**
 * Decode a packed colour number into {@link Rgba}, interpreting the top byte per `encoding`.
 * A value that fits in 24 bits is treated as fully opaque.
 */
export function decodeRgba(value: number, encoding: ColorInputEncoding): Rgba {
	const dec = Math.floor(value)
	const r = (dec >>> 16) & 0xff
	const g = (dec >>> 8) & 0xff
	const b = dec & 0xff

	// A 24-bit value carries no alpha/transparency byte, so it is fully opaque.
	if (dec >= 0 && dec <= 0xffffff) return { r, g, b, a: 1 }

	const topByte = (dec >>> 24) & 0xff
	const a = encoding === 'companion-ttrrggbb' ? 1 - topByte / 255 : topByte / 255
	return { r, g, b, a }
}

/**
 * Encode {@link Rgba} into a packed colour number in the requested `encoding`.
 * Fully-opaque colours are returned as a 24-bit number (no top byte), matching {@link decodeRgba}.
 */
export function encodeRgba({ r, g, b, a }: Rgba, encoding: ColorInputEncoding): number {
	const rgb = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
	const topByte = encoding === 'companion-ttrrggbb' ? Math.round(255 * (1 - a)) : Math.round(255 * a)

	// Omit the top byte for a zero result, so fully-opaque companion colours stay 24-bit.
	if (topByte === 0) return rgb
	return topByte * 0x1000000 + rgb
}

/**
 * Parse a css colour string into {@link Rgba}, or `null` if it is not a valid css colour.
 * The returned alpha is the css alpha (0-1, `1` = opaque).
 */
export function cssColorToRgba(css: string): Rgba | null {
	const parsed = colord(css)
	if (!parsed.isValid()) return null
	const { r, g, b, a } = parsed.toRgb()
	return { r, g, b, a }
}

/** Render {@link Rgba} as a `rgba(r, g, b, a)` css string with normal alpha. */
export function rgbaToCssString({ r, g, b, a }: Rgba): string {
	return `rgba(${r}, ${g}, ${b}, ${a})`
}
