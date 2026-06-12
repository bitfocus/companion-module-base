import { describe, expect, it } from 'vitest'
import {
	assertNever,
	combineRgb,
	literal,
	parseEscapeCharacters,
	splitHex,
	splitHsl,
	splitHsv,
	splitRgb,
	substituteEscapeCharacters,
} from '../util.js'

describe('literal', () => {
	it('returns the value unchanged', () => {
		const obj = { name: 'test' }
		expect(literal(obj)).toBe(obj)
		expect(literal(42)).toBe(42)
	})
})

describe('assertNever', () => {
	it('returns undefined', () => {
		expect(assertNever(undefined as never)).toBeUndefined()
	})
})

describe('combineRgb', () => {
	it('combines components', () => {
		expect(combineRgb(255, 0, 0)).toBe(0xff0000)
		expect(combineRgb(0, 255, 0)).toBe(0x00ff00)
		expect(combineRgb(0, 0, 255)).toBe(0x0000ff)
		expect(combineRgb(255, 255, 255)).toBe(0xffffff)
		expect(combineRgb(0, 0, 0)).toBe(0x000000)
		expect(combineRgb(0x10, 0x20, 0x30)).toBe(0x102030)
	})

	it('masks out-of-range components', () => {
		expect(combineRgb(0x110, 0, 0)).toBe(0x100000)
	})

	it('includes alpha when partially transparent', () => {
		// alpha is stored inverted: 0x1000000 * round(255 * (1 - a))
		expect(combineRgb(255, 0, 0, 0.5)).toBe(0x80ff0000)
		expect(combineRgb(255, 0, 0, 0.25)).toBe(0xbfff0000)
	})

	it('omits alpha when fully opaque', () => {
		expect(combineRgb(255, 0, 0, 1)).toBe(0xff0000)
	})

	it('treats alpha of 0 as fully transparent', () => {
		expect(combineRgb(255, 0, 0, 0)).toBe(0xffff0000)
		expect(splitRgb(combineRgb(255, 0, 0, 0))).toEqual({ r: 255, g: 0, b: 0, a: 0 })
	})
})

describe('splitRgb', () => {
	it('splits a color number without alpha', () => {
		expect(splitRgb(0xff8800)).toEqual({ r: 255, g: 136, b: 0, a: 1 })
		expect(splitRgb(0)).toEqual({ r: 0, g: 0, b: 0, a: 1 })
	})

	it('splits a color number with alpha', () => {
		expect(splitRgb(0x80ff0000)).toEqual({ r: 255, g: 0, b: 0, a: 127 / 255 })
	})

	it('roundtrips with combineRgb', () => {
		expect(splitRgb(combineRgb(12, 34, 56))).toEqual({ r: 12, g: 34, b: 56, a: 1 })
	})

	it('splits a css color string', () => {
		expect(splitRgb('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0, a: 1 })
		expect(splitRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0, a: 1 })
		expect(splitRgb('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 })
	})

	it('returns opaque black for an invalid string', () => {
		expect(splitRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0, a: 1 })
	})
})

describe('splitHsl', () => {
	it('splits a color number', () => {
		expect(splitHsl(combineRgb(255, 0, 0))).toEqual({ h: 0, s: 100, l: 50, a: 1 })
		expect(splitHsl(combineRgb(0, 255, 0))).toEqual({ h: 120, s: 100, l: 50, a: 1 })
	})

	it('splits a css color string', () => {
		expect(splitHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50, a: 1 })
	})
})

describe('splitHsv', () => {
	it('splits a color number', () => {
		expect(splitHsv(combineRgb(255, 0, 0))).toEqual({ h: 0, s: 100, v: 100, a: 1 })
		expect(splitHsv(combineRgb(0, 0, 0))).toEqual({ h: 0, s: 0, v: 0, a: 1 })
	})
})

describe('splitHex', () => {
	it('formats an opaque color as #rrggbb', () => {
		expect(splitHex(combineRgb(255, 136, 0))).toBe('#ff8800')
		expect(splitHex('rgb(255, 136, 0)')).toBe('#ff8800')
	})

	it('formats a transparent color as #rrggbbaa', () => {
		expect(splitHex('rgba(255, 0, 0, 0.5)')).toBe('#ff000080')
	})
})

describe('parseEscapeCharacters', () => {
	it('parses single escape sequences', () => {
		expect(parseEscapeCharacters('a\\nb')).toBe('a\nb')
		expect(parseEscapeCharacters('a\\rb')).toBe('a\rb')
		expect(parseEscapeCharacters('a\\tb')).toBe('a\tb')
		expect(parseEscapeCharacters('a\\fb')).toBe('a\fb')
		expect(parseEscapeCharacters('a\\vb')).toBe('a\vb')
		expect(parseEscapeCharacters('a\\bb')).toBe('a\bb')
	})

	it('parses hex escape sequences', () => {
		expect(parseEscapeCharacters('a\\x00b')).toBe('a\x00b')
		expect(parseEscapeCharacters('a\\x01b')).toBe('a\x01b')
		expect(parseEscapeCharacters('a\\x02b')).toBe('a\x02b')
		expect(parseEscapeCharacters('a\\x03b')).toBe('a\x03b')
	})

	it('parses escaped backslashes', () => {
		expect(parseEscapeCharacters('a\\\\c')).toBe('a\\c')
	})

	it('escaped backslash before an escape letter is consumed as the escape', () => {
		// `\\b` is matched by the backspace rule before the `\\\\` rule runs
		expect(parseEscapeCharacters('a\\\\b')).toBe('a\\\b')
	})

	it('leaves plain text untouched', () => {
		expect(parseEscapeCharacters('hello world')).toBe('hello world')
	})

	it('parses multiple sequences in one string', () => {
		expect(parseEscapeCharacters('line1\\r\\nline2\\tend')).toBe('line1\r\nline2\tend')
	})
})

describe('substituteEscapeCharacters', () => {
	it('substitutes control characters', () => {
		// Note: the backslash inserted for each control character is doubled again by the
		// later backslash substitution, so a newline becomes `\\n` rather than `\n`
		expect(substituteEscapeCharacters('a\nb')).toBe('a\\\\nb')
		expect(substituteEscapeCharacters('a\tb')).toBe('a\\\\tb')
	})

	it('substitutes hex control characters', () => {
		expect(substituteEscapeCharacters('a\x00b')).toBe('a\\x00b')
		expect(substituteEscapeCharacters('a\x01b')).toBe('a\\x01b')
		expect(substituteEscapeCharacters('a\x02b')).toBe('a\\x02b')
		expect(substituteEscapeCharacters('a\x03b')).toBe('a\\x03b')
	})

	it('substitutes backslashes', () => {
		expect(substituteEscapeCharacters('a\\b')).toBe('a\\\\b')
	})

	it('leaves plain text untouched', () => {
		expect(substituteEscapeCharacters('hello world')).toBe('hello world')
	})

	it('roundtrips hex control characters with parseEscapeCharacters', () => {
		const input = 'a\x00b\x03c'
		expect(parseEscapeCharacters(substituteEscapeCharacters(input))).toBe(input)
	})
})
