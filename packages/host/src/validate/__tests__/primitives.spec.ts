import { describe, expect, it } from 'vitest'
import { decodeRgba, encodeRgba } from '../color.js'
import {
	validateCheckboxValue,
	validateColorValue,
	validateDropdownValue,
	validateMultiDropdownValue,
	validateNumberValue,
	validateTextValue,
} from '../primitives.js'

// Ported from Companion's shared-lib validate-input-value.test.ts, retargeted at the primitives.

describe('validateNumberValue', () => {
	const range = { min: 0, max: 100, asInteger: undefined, clampValues: undefined, allowInvalidValues: undefined }

	describe('required validation', () => {
		it('should error when value is undefined', () => {
			expect(validateNumberValue(undefined, range)).toEqual({
				sanitisedValue: undefined,
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should error when value is empty string', () => {
			expect(validateNumberValue('', range)).toEqual({
				sanitisedValue: '',
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should error when value is null', () => {
			expect(validateNumberValue(null, range)).toEqual({
				sanitisedValue: null,
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should be valid when value is 0', () => {
			expect(validateNumberValue(0, range)).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: [],
			})
		})
	})

	describe('type coercion', () => {
		it('should accept a number directly', () => {
			expect(validateNumberValue(50, range)).toMatchObject({ sanitisedValue: 50, validity: true })
		})

		it('should coerce a numeric string', () => {
			expect(validateNumberValue('50', range)).toMatchObject({ sanitisedValue: 50, validity: true })
		})

		it('should error for a non-numeric string', () => {
			expect(validateNumberValue('abc', range)).toEqual({
				sanitisedValue: 'abc',
				validationError: 'Value must be a number',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should error for NaN', () => {
			expect(validateNumberValue(NaN, range)).toEqual({
				sanitisedValue: NaN,
				validationError: 'Value must be a number',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should coerce a boolean to a number', () => {
			expect(validateNumberValue(true, range)).toMatchObject({ sanitisedValue: 1, validity: true })
			expect(validateNumberValue(false, range)).toMatchObject({ sanitisedValue: 0, validity: true })
		})
	})

	describe('range validation', () => {
		it('should be valid for values within range', () => {
			expect(validateNumberValue(0, range)).toMatchObject({ sanitisedValue: 0, validity: true })
			expect(validateNumberValue(50, range)).toMatchObject({ sanitisedValue: 50, validity: true })
			expect(validateNumberValue(100, range)).toMatchObject({ sanitisedValue: 100, validity: true })
		})

		it('should error when value is below min', () => {
			expect(validateNumberValue(-1, range)).toEqual({
				sanitisedValue: -1,
				validationError: 'Value must be greater than or equal to 0',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should error when value is above max', () => {
			expect(validateNumberValue(101, range)).toEqual({
				sanitisedValue: 101,
				validationError: 'Value must be less than or equal to 100',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should not check min/max when undefined', () => {
			expect(validateNumberValue(-1000, { ...range, min: undefined })).toMatchObject({
				sanitisedValue: -1000,
				validity: true,
			})
			expect(validateNumberValue(1000, { ...range, max: undefined })).toMatchObject({
				sanitisedValue: 1000,
				validity: true,
			})
		})
	})

	describe('clampValues', () => {
		const clamp = { ...range, clampValues: true }

		it('should clamp below min to min with a warning', () => {
			expect(validateNumberValue(-10, clamp)).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 0'],
			})
		})

		it('should clamp above max to max with a warning', () => {
			expect(validateNumberValue(150, clamp)).toEqual({
				sanitisedValue: 100,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 100'],
			})
		})

		it('should not clamp values within range', () => {
			expect(validateNumberValue(50, clamp)).toMatchObject({ sanitisedValue: 50, validationWarnings: [] })
		})

		it('should let allowInvalidValues take priority over clampValues', () => {
			const both = { ...clamp, allowInvalidValues: true }
			expect(validateNumberValue(-10, both)).toEqual({
				sanitisedValue: -10,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 0'],
			})
			expect(validateNumberValue(150, both)).toEqual({
				sanitisedValue: 150,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is above 100'],
			})
		})

		it('should clamp coerced string values', () => {
			expect(validateNumberValue('150', clamp)).toMatchObject({
				sanitisedValue: 100,
				validationWarnings: ['Value was clamped to 100'],
			})
			expect(validateNumberValue('-5', clamp)).toMatchObject({
				sanitisedValue: 0,
				validationWarnings: ['Value was clamped to 0'],
			})
		})

		it('should still error for non-numeric/missing values even with clampValues', () => {
			expect(validateNumberValue('abc', clamp)).toMatchObject({ validationError: 'Value must be a number' })
			expect(validateNumberValue(undefined, clamp)).toMatchObject({ validationError: 'A value must be provided' })
		})

		it('should collect both clamp warnings when range is inverted (min > max)', () => {
			expect(validateNumberValue(50, { ...clamp, min: 100, max: 0 })).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 100', 'Value was clamped to 0'],
			})
		})
	})

	describe('allowInvalidValues', () => {
		const allow = { ...range, allowInvalidValues: true }

		it('should allow a value below min with a warning', () => {
			expect(validateNumberValue(-10, allow)).toEqual({
				sanitisedValue: -10,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 0'],
			})
		})

		it('should allow a value above max with a warning', () => {
			expect(validateNumberValue(150, allow)).toEqual({
				sanitisedValue: 150,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is above 100'],
			})
		})

		it('should collect both warnings when both bounds are exceeded (inverted range)', () => {
			expect(validateNumberValue(50, { ...allow, min: 100, max: 0 })).toEqual({
				sanitisedValue: 50,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 100', 'Value is above 0'],
			})
		})
	})

	describe('asInteger', () => {
		const int = { ...range, asInteger: true }

		it('should round a float to the nearest integer and warn', () => {
			expect(validateNumberValue(50.6, int)).toEqual({
				sanitisedValue: 51,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
			expect(validateNumberValue(50.4, int)).toMatchObject({
				sanitisedValue: 50,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
		})

		it('should not warn for an already-integer value', () => {
			expect(validateNumberValue(50, int)).toMatchObject({ sanitisedValue: 50, validationWarnings: [] })
		})

		it('should round before checking range bounds', () => {
			expect(validateNumberValue(100.4, int)).toMatchObject({
				sanitisedValue: 100,
				validity: true,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
			expect(validateNumberValue(100.6, int)).toEqual({
				sanitisedValue: 101,
				validationError: 'Value must be less than or equal to 100',
				validity: false,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
		})
	})
})

// validateTextValue is also the primitive used for `secret-text` fields (same minLength/regex knobs).
describe('validateTextValue', () => {
	describe('minLength validation', () => {
		const opts = { minLength: 1, regex: undefined }

		it('should error when value is undefined', () => {
			expect(validateTextValue(undefined, opts)).toEqual({
				sanitisedValue: '',
				validationError: 'Value must be at least 1 characters long',
				validationWarnings: [],
				validity: false,
			})
		})

		it('should error when value is empty string', () => {
			expect(validateTextValue('', opts)).toMatchObject({
				validationError: 'Value must be at least 1 characters long',
				validity: false,
			})
		})

		it('should be valid when value is provided', () => {
			expect(validateTextValue('hello', opts)).toEqual({
				sanitisedValue: 'hello',
				validationError: undefined,
				validationWarnings: [],
				validity: true,
			})
		})
	})

	describe('no validation', () => {
		const opts = { minLength: undefined, regex: undefined }

		it('should coerce undefined to empty string with no validation', () => {
			expect(validateTextValue(undefined, opts)).toEqual({
				sanitisedValue: '',
				validationError: undefined,
				validationWarnings: [],
			})
		})

		it('should accept empty string when there is no minLength', () => {
			expect(validateTextValue('', opts)).toEqual({
				sanitisedValue: '',
				validationError: undefined,
				validationWarnings: [],
			})
		})
	})

	describe('regex validation', () => {
		const opts = { minLength: undefined, regex: '/^[a-z]+$/i' }

		it('should be valid when value matches regex', () => {
			expect(validateTextValue('hello', opts)).toMatchObject({ sanitisedValue: 'hello', validity: true })
			expect(validateTextValue('WORLD', opts)).toMatchObject({ sanitisedValue: 'WORLD', validity: true })
		})

		it('should error when value does not match regex', () => {
			expect(validateTextValue('123', opts)).toEqual({
				sanitisedValue: '123',
				validationError: 'Value does not match regex: /^[a-z]+$/i',
				validationWarnings: [],
				validity: false,
			})
			expect(validateTextValue('hello123', opts)).toMatchObject({
				validationError: 'Value does not match regex: /^[a-z]+$/i',
				validity: false,
			})
		})
	})

	describe('type coercion', () => {
		it('should coerce a number to a string for validation', () => {
			expect(validateTextValue(123, { minLength: undefined, regex: '/^\\d+$/' })).toMatchObject({
				sanitisedValue: '123',
				validity: true,
			})
		})

		it('should coerce a boolean to a string for validation', () => {
			const opts = { minLength: undefined, regex: '/^(true|false)$/' }
			expect(validateTextValue(true, opts)).toMatchObject({ sanitisedValue: 'true', validity: true })
			expect(validateTextValue(false, opts)).toMatchObject({ sanitisedValue: 'false', validity: true })
		})

		it('should coerce an array to a string via JSON.stringify', () => {
			expect(validateTextValue([1, 2, 3], { minLength: undefined, regex: undefined })).toEqual({
				sanitisedValue: '[1,2,3]',
				validationError: undefined,
				validationWarnings: [],
			})
		})

		it('should coerce null to an empty string', () => {
			expect(validateTextValue(null, { minLength: undefined, regex: '/^.+$/' })).toEqual({
				sanitisedValue: '',
				validationError: 'Value does not match regex: /^.+$/',
				validationWarnings: [],
				validity: false,
			})
		})
	})
})

describe('validateDropdownValue', () => {
	const choices = [{ id: 'option1' }, { id: 'option2' }, { id: 123 }]
	const opts = { choices, allowCustom: undefined, regex: undefined }

	it('should error when value is undefined', () => {
		expect(validateDropdownValue(undefined, opts)).toEqual({
			sanitisedValue: '',
			validationError: 'Value is not in the list of choices',
			validity: false,
			validationWarnings: [],
		})
	})

	it('should be valid when value is in choices', () => {
		expect(validateDropdownValue('option1', opts)).toMatchObject({ sanitisedValue: 'option1', validity: true })
		expect(validateDropdownValue('option2', opts)).toMatchObject({ sanitisedValue: 'option2', validity: true })
	})

	it('should error when value is not in choices', () => {
		expect(validateDropdownValue('option3', opts)).toEqual({
			sanitisedValue: 'option3',
			validationError: 'Value is not in the list of choices',
			validity: false,
			validationWarnings: [],
		})
	})

	describe('numeric choice ids', () => {
		it('should match a number value to a numeric choice id', () => {
			expect(validateDropdownValue(123, opts)).toMatchObject({ sanitisedValue: 123, validity: true })
		})

		it('should match a string value to a numeric choice id via loose comparison', () => {
			expect(validateDropdownValue('123', opts)).toMatchObject({ sanitisedValue: 123, validity: true })
		})
	})

	describe('allowCustom', () => {
		const custom = { ...opts, allowCustom: true }

		it('should be valid for custom values', () => {
			expect(validateDropdownValue('custom_value', custom)).toMatchObject({
				sanitisedValue: 'custom_value',
				validity: true,
			})
		})

		it('should stringify non-choice custom values', () => {
			expect(validateDropdownValue(999, custom)).toMatchObject({ sanitisedValue: '999', validity: true })
		})

		describe('with regex', () => {
			const withRegex = { ...opts, allowCustom: true, regex: '/^custom_/' }

			it('should be valid when a custom value matches regex', () => {
				expect(validateDropdownValue('custom_value', withRegex)).toMatchObject({
					sanitisedValue: 'custom_value',
					validity: true,
				})
			})

			it('should error when a custom value does not match regex', () => {
				expect(validateDropdownValue('invalid_value', withRegex)).toEqual({
					sanitisedValue: 'invalid_value',
					validationError: 'Value does not match regex: /^custom_/',
					validity: false,
					validationWarnings: [],
				})
			})

			it('should be valid for choice values even if they do not match regex', () => {
				expect(validateDropdownValue('option1', withRegex)).toMatchObject({
					sanitisedValue: 'option1',
					validity: true,
				})
			})
		})
	})
})

describe('validateMultiDropdownValue', () => {
	const choices = [{ id: 'option1' }, { id: 'option2' }, { id: 'option3' }, { id: 123 }]
	const opts = { choices, allowCustom: undefined, regex: undefined, minSelection: undefined, maxSelection: undefined }

	it('should sanitise undefined to an empty array', () => {
		expect(validateMultiDropdownValue(undefined, opts)).toEqual({
			sanitisedValue: [],
			validationError: undefined,
			validity: true,
			validationWarnings: [],
		})
	})

	it('should error when value is not an array and cannot be coerced', () => {
		expect(validateMultiDropdownValue({ option1: true }, opts)).toEqual({
			sanitisedValue: { option1: true },
			validationError: 'Value must be an array',
			validity: false,
			validationWarnings: [],
		})
		expect(validateMultiDropdownValue('', opts)).toMatchObject({ validationError: 'Value must be an array' })
	})

	describe('non-array coercion', () => {
		it('should coerce a non-empty string into an array with a warning', () => {
			expect(validateMultiDropdownValue('option1', opts)).toEqual({
				sanitisedValue: ['option1'],
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a number into an array with a warning', () => {
			expect(validateMultiDropdownValue(123, opts)).toEqual({
				sanitisedValue: [123],
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a boolean and then reject the invalid value', () => {
			expect(validateMultiDropdownValue(true, opts)).toEqual({
				sanitisedValue: [true],
				validationError: 'The following selected values are not valid: true',
				validity: false,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a non-choice string and then reject it', () => {
			expect(validateMultiDropdownValue('invalid', opts)).toEqual({
				sanitisedValue: ['invalid'],
				validationError: 'The following selected values are not valid: invalid',
				validity: false,
				validationWarnings: ['Value was coerced into an array'],
			})
		})
	})

	it('should be valid for an empty array', () => {
		expect(validateMultiDropdownValue([], opts)).toMatchObject({ sanitisedValue: [], validity: true })
	})

	it('should be valid when all values are in choices', () => {
		expect(validateMultiDropdownValue(['option1', 'option2', 'option3'], opts)).toMatchObject({
			sanitisedValue: ['option1', 'option2', 'option3'],
			validity: true,
		})
	})

	it('should error when any value is not in choices', () => {
		expect(validateMultiDropdownValue(['option1', 'invalid'], opts)).toEqual({
			sanitisedValue: ['option1', 'invalid'],
			validationError: 'The following selected values are not valid: invalid',
			validity: false,
			validationWarnings: [],
		})
	})

	describe('numeric choice ids', () => {
		it('should match number and loose-string values to a numeric choice id', () => {
			expect(validateMultiDropdownValue([123], opts)).toMatchObject({ sanitisedValue: [123], validity: true })
			expect(validateMultiDropdownValue(['option1', 123], opts)).toMatchObject({
				sanitisedValue: ['option1', 123],
				validity: true,
			})
			expect(validateMultiDropdownValue(['123'], opts)).toMatchObject({ sanitisedValue: [123], validity: true })
		})
	})

	describe('minSelection/maxSelection', () => {
		const constrained = { ...opts, minSelection: 1, maxSelection: 2 }

		it('should error when below minSelection', () => {
			expect(validateMultiDropdownValue([], constrained)).toMatchObject({
				validationError: 'Must select at least 1 items',
				validity: false,
			})
		})

		it('should treat undefined the same as an empty array', () => {
			expect(validateMultiDropdownValue(undefined, constrained)).toMatchObject({
				validationError: 'Must select at least 1 items',
				validity: false,
			})
		})

		it('should error when above maxSelection', () => {
			expect(validateMultiDropdownValue(['option1', 'option2', 'option3'], constrained)).toMatchObject({
				validationError: 'Must select at most 2 items',
				validity: false,
			})
		})

		it('should be valid when within range', () => {
			expect(validateMultiDropdownValue(['option1'], constrained)).toMatchObject({ validity: true })
			expect(validateMultiDropdownValue(['option1', 'option2'], constrained)).toMatchObject({ validity: true })
		})
	})

	describe('allowCustom', () => {
		const custom = { ...opts, allowCustom: true }

		it('should be valid for custom values', () => {
			expect(validateMultiDropdownValue(['custom_value'], custom)).toMatchObject({
				sanitisedValue: ['custom_value'],
				validity: true,
			})
			expect(validateMultiDropdownValue(['option1', 'custom_value'], custom)).toMatchObject({
				sanitisedValue: ['option1', 'custom_value'],
				validity: true,
			})
		})

		it('should stringify custom non-choice values', () => {
			expect(validateMultiDropdownValue([999], custom)).toMatchObject({ sanitisedValue: ['999'], validity: true })
		})

		describe('with regex', () => {
			const withRegex = { ...custom, regex: '/^custom_/' }

			it('should be valid when a custom value matches regex', () => {
				expect(validateMultiDropdownValue(['custom_value'], withRegex)).toMatchObject({
					sanitisedValue: ['custom_value'],
					validity: true,
				})
			})

			it('should reject a custom value that does not match regex', () => {
				expect(validateMultiDropdownValue(['invalid_value'], withRegex)).toEqual({
					sanitisedValue: ['invalid_value'],
					validationError: 'The following selected values are not valid: invalid_value',
					validity: false,
					validationWarnings: [],
				})
			})

			it('should be valid for choice values even if they do not match regex', () => {
				expect(validateMultiDropdownValue(['option1'], withRegex)).toMatchObject({
					sanitisedValue: ['option1'],
					validity: true,
				})
			})

			it('should report multiple invalid values', () => {
				expect(validateMultiDropdownValue(['invalid1', 'option1', 'invalid2'], withRegex)).toMatchObject({
					validationError: 'The following selected values are not valid: invalid1, invalid2',
					validity: false,
				})
			})
		})
	})
})

describe('validateColorValue', () => {
	const INVALID_ERROR = 'Value must be a color number or a css color string'

	describe('returnType: number', () => {
		const opts = { returnType: 'number' as const, encoding: undefined, enableAlpha: true }

		it('should accept color numbers unchanged', () => {
			expect(validateColorValue(16777215, opts)).toMatchObject({ sanitisedValue: 16777215, validity: true })
			expect(validateColorValue(0, opts)).toMatchObject({ sanitisedValue: 0, validity: true })
		})

		it('should sanitise numeric strings to a number', () => {
			expect(validateColorValue('16777215', opts)).toMatchObject({ sanitisedValue: 16777215, validity: true })
		})

		it('should sanitise a css color string to a color number', () => {
			expect(validateColorValue('#ff0000', opts)).toMatchObject({ sanitisedValue: 0xff0000, validity: true })
		})

		it('should pack alpha when sanitising a translucent css string', () => {
			expect(validateColorValue('rgba(255, 0, 0, 0.5)', opts)).toMatchObject({
				sanitisedValue: 0xff0000 + 0x80 * 0x1000000,
				validity: true,
			})
		})

		it('should error for a string that is not a color', () => {
			expect(validateColorValue('this is not a color', opts)).toEqual({
				sanitisedValue: 'this is not a color',
				validationError: INVALID_ERROR,
				validity: false,
				validationWarnings: [],
			})
		})

		it('should error when value is undefined', () => {
			expect(validateColorValue(undefined, opts)).toMatchObject({ validationError: INVALID_ERROR, validity: false })
		})
	})

	describe('returnType: string', () => {
		const opts = { returnType: 'string' as const, encoding: undefined, enableAlpha: true }

		it('should keep valid css color strings', () => {
			expect(validateColorValue('#ffffff', opts)).toMatchObject({ sanitisedValue: '#ffffff', validity: true })
			expect(validateColorValue('rgb(255,255,255)', opts)).toMatchObject({
				sanitisedValue: 'rgb(255,255,255)',
				validity: true,
			})
		})

		it('should coerce a color number to a css string', () => {
			expect(validateColorValue(16777215, opts)).toMatchObject({
				sanitisedValue: 'rgba(255, 255, 255, 1)',
				validity: true,
			})
		})

		it('should coerce a numeric string to a css string', () => {
			expect(validateColorValue('123', opts)).toMatchObject({ sanitisedValue: 'rgba(0, 0, 123, 1)', validity: true })
		})

		it('should error for invalid types', () => {
			expect(validateColorValue(true, opts)).toMatchObject({ validationError: INVALID_ERROR, validity: false })
			expect(validateColorValue(['#fff'], opts)).toMatchObject({ validationError: INVALID_ERROR, validity: false })
			expect(validateColorValue({ color: '#fff' }, opts)).toMatchObject({
				validationError: INVALID_ERROR,
				validity: false,
			})
		})
	})

	describe('input encoding', () => {
		it('should default numeric inputs to companion-ttrrggbb', () => {
			// top byte 0x80 read as transparency, re-encoded as companion transparency is unchanged
			expect(
				validateColorValue(0x80ff0000, { returnType: 'number', encoding: undefined, enableAlpha: true }),
			).toMatchObject({ sanitisedValue: 0x80ff0000, validity: true })
		})

		it('should re-encode a standard-aarrggbb numeric input to a companion number', () => {
			// 0x80 alpha => transparency 0x7f on output
			expect(
				validateColorValue(0x80ff0000, { returnType: 'number', encoding: 'standard-aarrggbb', enableAlpha: true }),
			).toMatchObject({ sanitisedValue: 0x7fff0000, validity: true })
		})

		it('should output a css string with normal alpha for a numeric input', () => {
			expect(
				validateColorValue(0x80ff0000, { returnType: 'string', encoding: 'companion-ttrrggbb', enableAlpha: true }),
			).toMatchObject({ sanitisedValue: `rgba(255, 0, 0, ${1 - 0x80 / 255})`, validity: true })
		})
	})

	describe('alpha disabled', () => {
		it('should strip alpha from a numeric input, keeping only rgb', () => {
			expect(
				validateColorValue(0x80ff0000, { returnType: 'number', encoding: undefined, enableAlpha: undefined }),
			).toMatchObject({
				sanitisedValue: 0xff0000,
				validity: true,
			})
			expect(
				validateColorValue(0x80ff0000, { returnType: 'number', encoding: 'standard-aarrggbb', enableAlpha: false }),
			).toMatchObject({ sanitisedValue: 0xff0000, validity: true })
		})

		it('should strip alpha from a translucent css string', () => {
			expect(
				validateColorValue('rgba(255, 0, 0, 0.5)', { returnType: 'number', encoding: undefined, enableAlpha: false }),
			).toMatchObject({ sanitisedValue: 0xff0000, validity: true })
			expect(
				validateColorValue('rgba(255, 0, 0, 0.5)', { returnType: 'string', encoding: undefined, enableAlpha: false }),
			).toMatchObject({ sanitisedValue: 'rgba(255, 0, 0, 1)', validity: true })
		})

		it('should still preserve an opaque css string as-is', () => {
			expect(
				validateColorValue('#ffffff', { returnType: 'string', encoding: undefined, enableAlpha: false }),
			).toMatchObject({ sanitisedValue: '#ffffff', validity: true })
		})
	})
})

describe('color encode/decode helpers', () => {
	describe('decodeRgba', () => {
		it('should treat a 24-bit value as opaque for companion, but transparent for standard', () => {
			expect(decodeRgba(0x112233, 'companion-ttrrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 1 })
			expect(decodeRgba(0x112233, 'standard-aarrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 0 })
		})

		it('should read the top byte as transparency for companion-ttrrggbb', () => {
			expect(decodeRgba(0x00112233, 'companion-ttrrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 1 })
			expect(decodeRgba(0xff112233, 'companion-ttrrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 0 })
		})

		it('should read the top byte as alpha for standard-aarrggbb', () => {
			expect(decodeRgba(0xff112233, 'standard-aarrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 1 })
			expect(decodeRgba(0x80112233, 'standard-aarrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 128 / 255 })
			expect(decodeRgba(0x00112233, 'standard-aarrggbb')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 0 })
		})
	})

	describe('encodeRgba', () => {
		it('should encode a fully-opaque color as a 24-bit number for companion', () => {
			expect(encodeRgba({ r: 0x11, g: 0x22, b: 0x33, a: 1 }, 'companion-ttrrggbb')).toBe(0x112233)
		})

		it('should encode a fully-opaque color with a 0xff alpha byte for standard', () => {
			expect(encodeRgba({ r: 0x11, g: 0x22, b: 0x33, a: 1 }, 'standard-aarrggbb')).toBe(0xff112233)
		})

		it('should pack transparency in the top byte for companion-ttrrggbb', () => {
			expect(encodeRgba({ r: 0xff, g: 0, b: 0, a: 0.5 }, 'companion-ttrrggbb')).toBe(0xff0000 + 0x80 * 0x1000000)
		})

		it('should pack alpha in the top byte for standard-aarrggbb', () => {
			expect(encodeRgba({ r: 0xff, g: 0, b: 0, a: 0.5 }, 'standard-aarrggbb')).toBe(0xff0000 + 0x80 * 0x1000000)
		})

		it('should encode a fully-transparent colour with a zero top byte', () => {
			expect(encodeRgba({ r: 0x11, g: 0x22, b: 0x33, a: 0 }, 'standard-aarrggbb')).toBe(0x112233)
			expect(encodeRgba({ r: 0x11, g: 0x22, b: 0x33, a: 0 }, 'companion-ttrrggbb')).toBe(0xff112233)
		})
	})

	describe('round trips', () => {
		it('should round trip a 24-bit opaque color (companion-ttrrggbb)', () => {
			expect(encodeRgba(decodeRgba(0x123456, 'companion-ttrrggbb'), 'companion-ttrrggbb')).toBe(0x123456)
		})

		it('should round trip a 32-bit companion-ttrrggbb color', () => {
			expect(encodeRgba(decodeRgba(0x80123456, 'companion-ttrrggbb'), 'companion-ttrrggbb')).toBe(0x80123456)
		})

		it('should round trip a 32-bit standard-aarrggbb color', () => {
			expect(encodeRgba(decodeRgba(0x80123456, 'standard-aarrggbb'), 'standard-aarrggbb')).toBe(0x80123456)
		})

		it('should round trip a fully-transparent standard-aarrggbb color', () => {
			expect(encodeRgba(decodeRgba(0x00123456, 'standard-aarrggbb'), 'standard-aarrggbb')).toBe(0x00123456)
		})

		it('should round trip a fully-transparent companion-ttrrggbb color', () => {
			expect(encodeRgba(decodeRgba(0xff123456, 'companion-ttrrggbb'), 'companion-ttrrggbb')).toBe(0xff123456)
		})

		it('should convert between encodings via rgba', () => {
			// standard 50%-alpha red (0x80 alpha) => companion transparency 0xff - 0x80 = 0x7f
			const rgba = decodeRgba(0x80ff0000, 'standard-aarrggbb')
			expect(encodeRgba(rgba, 'companion-ttrrggbb')).toBe(0x7fff0000)
		})
	})
})

describe('validateCheckboxValue', () => {
	it('should keep boolean values', () => {
		expect(validateCheckboxValue(true)).toMatchObject({ sanitisedValue: true, validationError: undefined })
		expect(validateCheckboxValue(false)).toMatchObject({ sanitisedValue: false, validationError: undefined })
	})

	it('should coerce undefined to false', () => {
		expect(validateCheckboxValue(undefined)).toMatchObject({ sanitisedValue: false })
	})

	it('should coerce non-boolean values by truthiness', () => {
		expect(validateCheckboxValue('true')).toMatchObject({ sanitisedValue: true })
		expect(validateCheckboxValue(1)).toMatchObject({ sanitisedValue: true })
		expect(validateCheckboxValue(0)).toMatchObject({ sanitisedValue: false })
		expect(validateCheckboxValue(null)).toMatchObject({ sanitisedValue: false })
	})
})
