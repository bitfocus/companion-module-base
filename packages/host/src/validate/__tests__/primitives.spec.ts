import { describe, expect, it } from 'vitest'
import type { SomeCompanionInputField } from '@companion-module/base'
import { validateInputValue } from '../input-value.js'
import {
	validateCheckboxValue,
	validateColorValue,
	validateDropdownValue,
	validateMultiDropdownValue,
	validateNumberValue,
	validateTextValue,
} from '../primitives.js'

const noNumberOpts = {
	min: undefined,
	max: undefined,
	asInteger: undefined,
	clampValues: undefined,
	allowInvalidValues: undefined,
}

describe('validateNumberValue', () => {
	it('accepts a plain number', () => {
		const r = validateNumberValue(42, noNumberOpts)
		expect(r).toMatchObject({ sanitisedValue: 42, validationError: undefined, validationWarnings: [] })
	})

	it('coerces a numeric string', () => {
		expect(validateNumberValue('42', noNumberOpts).sanitisedValue).toBe(42)
	})

	it('rejects missing values', () => {
		expect(validateNumberValue(undefined, noNumberOpts).validationError).toBe('A value must be provided')
		expect(validateNumberValue('', noNumberOpts).validationError).toBe('A value must be provided')
		expect(validateNumberValue(null, noNumberOpts).validationError).toBe('A value must be provided')
	})

	it('rejects non-numbers', () => {
		expect(validateNumberValue('abc', noNumberOpts).validationError).toBe('Value must be a number')
	})

	it('rounds to integer with a warning', () => {
		const r = validateNumberValue(4.6, { ...noNumberOpts, asInteger: true })
		expect(r.sanitisedValue).toBe(5)
		expect(r.validationWarnings).toContain('Value was rounded to nearest integer')
	})

	it('rejects values below min by default', () => {
		const r = validateNumberValue(-1, { ...noNumberOpts, min: 0 })
		expect(r.validationError).toBe('Value must be greater than or equal to 0')
	})

	it('rejects values above max by default', () => {
		const r = validateNumberValue(11, { ...noNumberOpts, max: 10 })
		expect(r.validationError).toBe('Value must be less than or equal to 10')
	})

	it('clamps when clampValues is set', () => {
		const r = validateNumberValue(11, { ...noNumberOpts, max: 10, clampValues: true })
		expect(r.sanitisedValue).toBe(10)
		expect(r.validationError).toBeUndefined()
		expect(r.validationWarnings).toContain('Value was clamped to 10')
	})

	it('warns but keeps value when allowInvalidValues is set', () => {
		const r = validateNumberValue(-5, { ...noNumberOpts, min: 0, allowInvalidValues: true })
		expect(r.sanitisedValue).toBe(-5)
		expect(r.validationError).toBeUndefined()
		expect(r.validationWarnings).toContain('Value is below 0')
	})
})

describe('validateTextValue', () => {
	it('coerces non-strings to strings', () => {
		expect(validateTextValue(42, { minLength: undefined, regex: undefined }).sanitisedValue).toBe('42')
		expect(validateTextValue(undefined, { minLength: undefined, regex: undefined }).sanitisedValue).toBe('')
		expect(validateTextValue(null, { minLength: undefined, regex: undefined }).sanitisedValue).toBe('')
	})

	it('enforces minLength', () => {
		const r = validateTextValue('ab', { minLength: 3, regex: undefined })
		expect(r.validationError).toBe('Value must be at least 3 characters long')
	})

	it('enforces regex', () => {
		const opts = { minLength: undefined, regex: '/^[0-9]+$/' }
		expect(validateTextValue('123', opts).validationError).toBeUndefined()
		expect(validateTextValue('12a', opts).validationError).toBe('Value does not match regex: /^[0-9]+$/')
	})

	it('reports validity undefined when nothing to validate', () => {
		expect(validateTextValue('anything', { minLength: undefined, regex: undefined }).validity).toBeUndefined()
	})
})

describe('validateDropdownValue', () => {
	const choices = [{ id: 'a' }, { id: 2 }]

	it('accepts a value present in choices', () => {
		expect(validateDropdownValue('a', { choices, allowCustom: undefined, regex: undefined }).sanitisedValue).toBe('a')
		expect(validateDropdownValue(2, { choices, allowCustom: undefined, regex: undefined }).sanitisedValue).toBe(2)
	})

	it('rejects a value not in choices when custom is not allowed', () => {
		const r = validateDropdownValue('x', { choices, allowCustom: undefined, regex: undefined })
		expect(r.validationError).toBe('Value is not in the list of choices')
	})

	it('accepts a custom value when allowed', () => {
		const r = validateDropdownValue('x', { choices, allowCustom: true, regex: undefined })
		expect(r.sanitisedValue).toBe('x')
		expect(r.validationError).toBeUndefined()
	})

	it('applies regex to custom values', () => {
		const r = validateDropdownValue('xx', { choices, allowCustom: true, regex: '/^[0-9]+$/' })
		expect(r.validationError).toBe('Value does not match regex: /^[0-9]+$/')
	})
})

describe('validateMultiDropdownValue', () => {
	const choices = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
	const base = { choices, allowCustom: undefined, regex: undefined, minSelection: undefined, maxSelection: undefined }

	it('defaults undefined to an empty array', () => {
		expect(validateMultiDropdownValue(undefined, base).sanitisedValue).toEqual([])
	})

	it('coerces a scalar into an array with a warning', () => {
		const r = validateMultiDropdownValue('a', base)
		expect(r.sanitisedValue).toEqual(['a'])
		expect(r.validationWarnings).toContain('Value was coerced into an array')
	})

	it('rejects values not in choices', () => {
		const r = validateMultiDropdownValue(['a', 'z'], base)
		expect(r.validationError).toBe('The following selected values are not valid: z')
	})

	it('enforces minSelection and maxSelection', () => {
		expect(validateMultiDropdownValue(['a'], { ...base, minSelection: 2 }).validationError).toBe(
			'Must select at least 2 items',
		)
		expect(validateMultiDropdownValue(['a', 'b', 'c'], { ...base, maxSelection: 2 }).validationError).toBe(
			'Must select at most 2 items',
		)
	})
})

describe('validateColorValue', () => {
	it('accepts a color number', () => {
		expect(validateColorValue(0xff0000, { returnType: 'number' }).sanitisedValue).toBe(0xff0000)
	})

	it('accepts a css string and can return a number', () => {
		const r = validateColorValue('#ff0000', { returnType: 'number' })
		expect(r.validationError).toBeUndefined()
		expect(r.sanitisedValue).toBe(0xff0000)
	})

	it('can return a css string', () => {
		const r = validateColorValue(0xff0000, { returnType: 'string' })
		expect(r.sanitisedValue).toBe('rgba(255, 0, 0, 1)')
	})

	it('rejects invalid colors', () => {
		expect(validateColorValue('not-a-color', { returnType: 'number' }).validationError).toBe(
			'Value must be a color number or a css color string',
		)
	})
})

describe('validateCheckboxValue', () => {
	it('coerces truthiness', () => {
		expect(validateCheckboxValue('yes').sanitisedValue).toBe(true)
		expect(validateCheckboxValue(0).sanitisedValue).toBe(false)
		expect(validateCheckboxValue(undefined).sanitisedValue).toBe(false)
	})
})

describe('validateInputValue orchestrator', () => {
	it('maps a number field onto the number primitive', () => {
		const field: SomeCompanionInputField = {
			id: 'n',
			type: 'number',
			label: 'n',
			default: 0,
			min: 0,
			max: 10,
			clampValues: true,
		}
		const r = validateInputValue(field, 20)
		expect(r.sanitisedValue).toBe(10)
		expect(r.validationWarnings).toContain('Value was clamped to 10')
	})

	it('maps a textinput field onto the text primitive', () => {
		const field: SomeCompanionInputField = { id: 't', type: 'textinput', label: 't', minLength: 3 }
		expect(validateInputValue(field, 'ab').validationError).toBe('Value must be at least 3 characters long')
	})

	it('maps a secret-text field onto the text primitive', () => {
		const field: SomeCompanionInputField = { id: 's', type: 'secret-text', label: 's', minLength: 4 }
		expect(validateInputValue(field, 'abcd').validationError).toBeUndefined()
	})

	it('does not validate static-text/custom-variable/bonjour-device', () => {
		for (const type of ['custom-variable', 'bonjour-device'] as const) {
			const field = { id: 'x', type, label: 'x' } as SomeCompanionInputField
			expect(validateInputValue(field, 'anything')).toMatchObject({ validity: undefined, validationError: undefined })
		}
	})
})
