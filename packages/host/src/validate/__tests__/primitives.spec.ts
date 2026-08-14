import { describe, expect, it } from 'vitest'
import type {
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldSecret,
	CompanionInputFieldTextInput,
	SomeCompanionInputField,
} from '@companion-module/base'
import { validateInputValue } from '../input-value.js'
import { validateMultiDropdownValue } from '../primitives.js'

// These tests are ported from Companion's shared-lib validate-input-value.test.ts, covering the field
// types that map onto the shared validation primitives. Companion-only field types (expression,
// internal:*, table, list) are intentionally omitted. They are driven through the `validateInputValue`
// orchestrator so that the base field union and the field->primitive mapping are exercised too.

describe('number', () => {
	const definition: CompanionInputFieldNumber = {
		id: 'test',
		type: 'number',
		label: 'Test',
		default: 0,
		min: 0,
		max: 100,
	}

	describe('required validation', () => {
		it('should return error when value is undefined', () => {
			expect(validateInputValue(definition, undefined)).toEqual({
				sanitisedValue: undefined,
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should return error when value is empty string', () => {
			expect(validateInputValue(definition, '')).toEqual({
				sanitisedValue: '',
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should return error when value is null', () => {
			expect(validateInputValue(definition, null)).toEqual({
				sanitisedValue: null,
				validationError: 'A value must be provided',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should be valid when value is 0', () => {
			expect(validateInputValue(definition, 0)).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: [],
			})
		})
	})

	describe('type coercion', () => {
		it('should accept number type directly', () => {
			expect(validateInputValue(definition, 50)).toMatchObject({ sanitisedValue: 50, validity: true })
		})

		it('should coerce string to number', () => {
			expect(validateInputValue(definition, '50')).toMatchObject({ sanitisedValue: 50, validity: true })
		})

		it('should return error for non-numeric string', () => {
			expect(validateInputValue(definition, 'abc')).toEqual({
				sanitisedValue: 'abc',
				validationError: 'Value must be a number',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should return error for NaN', () => {
			expect(validateInputValue(definition, NaN)).toEqual({
				sanitisedValue: NaN,
				validationError: 'Value must be a number',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should coerce boolean to number', () => {
			expect(validateInputValue(definition, true)).toMatchObject({ sanitisedValue: 1, validity: true })
			expect(validateInputValue(definition, false)).toMatchObject({ sanitisedValue: 0, validity: true })
		})
	})

	describe('range validation', () => {
		it('should be valid for values within range', () => {
			expect(validateInputValue(definition, 0)).toMatchObject({ sanitisedValue: 0, validity: true })
			expect(validateInputValue(definition, 50)).toMatchObject({ sanitisedValue: 50, validity: true })
			expect(validateInputValue(definition, 100)).toMatchObject({ sanitisedValue: 100, validity: true })
		})

		it('should return error when value is below min', () => {
			expect(validateInputValue(definition, -1)).toEqual({
				sanitisedValue: -1,
				validationError: 'Value must be greater than or equal to 0',
				validity: false,
				validationWarnings: [],
			})
		})

		it('should return error when value is above max', () => {
			expect(validateInputValue(definition, 101)).toEqual({
				sanitisedValue: 101,
				validationError: 'Value must be less than or equal to 100',
				validity: false,
				validationWarnings: [],
			})
		})
	})

	describe('min/max boundary cases', () => {
		const noMinDefinition: CompanionInputFieldNumber = { ...definition, min: undefined as unknown as number }
		const noMaxDefinition: CompanionInputFieldNumber = { ...definition, max: undefined as unknown as number }

		it('should not check min when undefined', () => {
			expect(validateInputValue(noMinDefinition, -1000)).toMatchObject({ sanitisedValue: -1000, validity: true })
		})

		it('should not check max when undefined', () => {
			expect(validateInputValue(noMaxDefinition, 1000)).toMatchObject({ sanitisedValue: 1000, validity: true })
		})
	})

	describe('clampValues', () => {
		const clampDefinition: CompanionInputFieldNumber = { ...definition, clampValues: true }

		it('should clamp value below min to min with a warning', () => {
			expect(validateInputValue(clampDefinition, -10)).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 0'],
			})
		})

		it('should clamp value above max to max with a warning', () => {
			expect(validateInputValue(clampDefinition, 150)).toEqual({
				sanitisedValue: 100,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 100'],
			})
		})

		it('should not clamp values within range', () => {
			expect(validateInputValue(clampDefinition, 50)).toMatchObject({ sanitisedValue: 50, validationWarnings: [] })
		})

		it('should let allowInvalidValues take priority over clampValues', () => {
			const clampAndAllowInvalid: CompanionInputFieldNumber = { ...clampDefinition, allowInvalidValues: true }
			expect(validateInputValue(clampAndAllowInvalid, -10)).toEqual({
				sanitisedValue: -10,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 0'],
			})
			expect(validateInputValue(clampAndAllowInvalid, 150)).toEqual({
				sanitisedValue: 150,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is above 100'],
			})
		})

		it('should clamp coerced string values', () => {
			expect(validateInputValue(clampDefinition, '150')).toMatchObject({
				sanitisedValue: 100,
				validationWarnings: ['Value was clamped to 100'],
			})
			expect(validateInputValue(clampDefinition, '-5')).toMatchObject({
				sanitisedValue: 0,
				validationWarnings: ['Value was clamped to 0'],
			})
		})

		it('should still error for non-numeric/missing values even with clampValues', () => {
			expect(validateInputValue(clampDefinition, 'abc')).toMatchObject({ validationError: 'Value must be a number' })
			expect(validateInputValue(clampDefinition, undefined)).toMatchObject({
				validationError: 'A value must be provided',
			})
		})

		it('should collect both clamp warnings when range is inverted (min > max)', () => {
			const invertedDefinition: CompanionInputFieldNumber = { ...definition, min: 100, max: 0, clampValues: true }
			expect(validateInputValue(invertedDefinition, 50)).toEqual({
				sanitisedValue: 0,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was clamped to 100', 'Value was clamped to 0'],
			})
		})
	})

	describe('allowInvalidValues', () => {
		const allowDefinition: CompanionInputFieldNumber = { ...definition, allowInvalidValues: true }

		it('should allow value below min with a warning', () => {
			expect(validateInputValue(allowDefinition, -10)).toEqual({
				sanitisedValue: -10,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 0'],
			})
		})

		it('should allow value above max with a warning', () => {
			expect(validateInputValue(allowDefinition, 150)).toEqual({
				sanitisedValue: 150,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is above 100'],
			})
		})

		it('should collect both warnings when both bounds are exceeded (inverted range)', () => {
			const invertedDefinition: CompanionInputFieldNumber = {
				...definition,
				min: 100,
				max: 0,
				allowInvalidValues: true,
			}
			expect(validateInputValue(invertedDefinition, 50)).toEqual({
				sanitisedValue: 50,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value is below 100', 'Value is above 0'],
			})
		})
	})

	describe('asInteger', () => {
		const intDefinition: CompanionInputFieldNumber = { ...definition, asInteger: true }

		it('should round a float to the nearest integer and warn', () => {
			expect(validateInputValue(intDefinition, 50.6)).toEqual({
				sanitisedValue: 51,
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
			expect(validateInputValue(intDefinition, 50.4)).toMatchObject({
				sanitisedValue: 50,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
		})

		it('should not warn for an already-integer value', () => {
			expect(validateInputValue(intDefinition, 50)).toMatchObject({ sanitisedValue: 50, validationWarnings: [] })
		})

		it('should round before checking range bounds', () => {
			expect(validateInputValue(intDefinition, 100.4)).toMatchObject({
				sanitisedValue: 100,
				validity: true,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
			expect(validateInputValue(intDefinition, 100.6)).toEqual({
				sanitisedValue: 101,
				validationError: 'Value must be less than or equal to 100',
				validity: false,
				validationWarnings: ['Value was rounded to nearest integer'],
			})
		})
	})
})

describe('textinput', () => {
	describe('minLength validation', () => {
		const requiredDefinition: CompanionInputFieldTextInput = {
			id: 'test',
			type: 'textinput',
			label: 'Test',
			minLength: 1,
		}

		it('should return error when value is undefined', () => {
			expect(validateInputValue(requiredDefinition, undefined)).toEqual({
				sanitisedValue: '',
				validationError: 'Value must be at least 1 characters long',
				validationWarnings: [],
				validity: false,
			})
		})

		it('should return error when value is empty string', () => {
			expect(validateInputValue(requiredDefinition, '')).toMatchObject({
				validationError: 'Value must be at least 1 characters long',
				validity: false,
			})
		})

		it('should be valid when value is provided', () => {
			expect(validateInputValue(requiredDefinition, 'hello')).toEqual({
				sanitisedValue: 'hello',
				validationError: undefined,
				validationWarnings: [],
				validity: true,
			})
		})
	})

	describe('no validation', () => {
		const definition: CompanionInputFieldTextInput = { id: 'test', type: 'textinput', label: 'Test' }

		it('should coerce undefined to empty string with no validation', () => {
			expect(validateInputValue(definition, undefined)).toEqual({
				sanitisedValue: '',
				validationError: undefined,
				validationWarnings: [],
			})
		})

		it('should accept empty string when no minLength', () => {
			expect(validateInputValue(definition, '')).toEqual({
				sanitisedValue: '',
				validationError: undefined,
				validationWarnings: [],
			})
		})
	})

	describe('regex validation', () => {
		const regexDefinition: CompanionInputFieldTextInput = {
			id: 'test',
			type: 'textinput',
			label: 'Test',
			regex: '/^[a-z]+$/i',
		}

		it('should be valid when value matches regex', () => {
			expect(validateInputValue(regexDefinition, 'hello')).toMatchObject({ sanitisedValue: 'hello', validity: true })
			expect(validateInputValue(regexDefinition, 'WORLD')).toMatchObject({ sanitisedValue: 'WORLD', validity: true })
		})

		it('should return error when value does not match regex', () => {
			expect(validateInputValue(regexDefinition, '123')).toEqual({
				sanitisedValue: '123',
				validationError: 'Value does not match regex: /^[a-z]+$/i',
				validationWarnings: [],
				validity: false,
			})
			expect(validateInputValue(regexDefinition, 'hello123')).toMatchObject({
				validationError: 'Value does not match regex: /^[a-z]+$/i',
				validity: false,
			})
		})
	})

	describe('type coercion', () => {
		it('should coerce number to string for validation', () => {
			const definition: CompanionInputFieldTextInput = {
				id: 'test',
				type: 'textinput',
				label: 'Test',
				regex: '/^\\d+$/',
			}
			expect(validateInputValue(definition, 123)).toMatchObject({ sanitisedValue: '123', validity: true })
		})

		it('should coerce boolean to string for validation', () => {
			const boolRegex: CompanionInputFieldTextInput = {
				id: 'test',
				type: 'textinput',
				label: 'Test',
				regex: '/^(true|false)$/',
			}
			expect(validateInputValue(boolRegex, true)).toMatchObject({ sanitisedValue: 'true', validity: true })
			expect(validateInputValue(boolRegex, false)).toMatchObject({ sanitisedValue: 'false', validity: true })
		})

		it('should coerce array to string via JSON.stringify', () => {
			const arrayTest: CompanionInputFieldTextInput = { id: 'test', type: 'textinput', label: 'Test' }
			expect(validateInputValue(arrayTest, [1, 2, 3])).toEqual({
				sanitisedValue: '[1,2,3]',
				validationError: undefined,
				validationWarnings: [],
			})
		})

		it('should coerce null to empty string', () => {
			const nullTest: CompanionInputFieldTextInput = { id: 'test', type: 'textinput', label: 'Test', regex: '/^.+$/' }
			expect(validateInputValue(nullTest, null)).toEqual({
				sanitisedValue: '',
				validationError: 'Value does not match regex: /^.+$/',
				validationWarnings: [],
				validity: false,
			})
		})
	})
})

describe('secret-text', () => {
	describe('minLength validation', () => {
		const requiredDefinition: CompanionInputFieldSecret = {
			id: 'test',
			type: 'secret-text',
			label: 'Test',
			minLength: 1,
		}

		it('should return error when value is undefined', () => {
			expect(validateInputValue(requiredDefinition, undefined)).toMatchObject({
				sanitisedValue: '',
				validationError: 'Value must be at least 1 characters long',
				validity: false,
			})
		})

		it('should be valid when value is provided', () => {
			expect(validateInputValue(requiredDefinition, 'secret')).toMatchObject({
				sanitisedValue: 'secret',
				validity: true,
			})
		})
	})

	describe('regex validation', () => {
		const regexDefinition: CompanionInputFieldSecret = {
			id: 'test',
			type: 'secret-text',
			label: 'Test',
			regex: '/^[A-Z0-9]{8}$/',
		}

		it('should be valid when value matches regex', () => {
			expect(validateInputValue(regexDefinition, 'ABCD1234')).toMatchObject({
				sanitisedValue: 'ABCD1234',
				validity: true,
			})
		})

		it('should return error when value does not match regex', () => {
			expect(validateInputValue(regexDefinition, 'short')).toMatchObject({
				validationError: 'Value does not match regex: /^[A-Z0-9]{8}$/',
				validity: false,
			})
		})
	})
})

describe('dropdown', () => {
	const definition: CompanionInputFieldDropdown = {
		id: 'test',
		type: 'dropdown',
		label: 'Test',
		default: 'option1',
		choices: [
			{ id: 'option1', label: 'Option 1' },
			{ id: 'option2', label: 'Option 2' },
			{ id: 123, label: 'Numeric Option' },
		],
	}

	it('should return error when value is undefined', () => {
		expect(validateInputValue(definition, undefined)).toEqual({
			sanitisedValue: '',
			validationError: 'Value is not in the list of choices',
			validity: false,
			validationWarnings: [],
		})
	})

	it('should be valid when value is in choices', () => {
		expect(validateInputValue(definition, 'option1')).toMatchObject({ sanitisedValue: 'option1', validity: true })
		expect(validateInputValue(definition, 'option2')).toMatchObject({ sanitisedValue: 'option2', validity: true })
	})

	it('should return error when value is not in choices', () => {
		expect(validateInputValue(definition, 'option3')).toEqual({
			sanitisedValue: 'option3',
			validationError: 'Value is not in the list of choices',
			validity: false,
			validationWarnings: [],
		})
	})

	describe('numeric choice ids', () => {
		it('should match a number value to a numeric choice id', () => {
			expect(validateInputValue(definition, 123)).toMatchObject({ sanitisedValue: 123, validity: true })
		})

		it('should match a string value to a numeric choice id via loose comparison', () => {
			expect(validateInputValue(definition, '123')).toMatchObject({ sanitisedValue: 123, validity: true })
		})
	})

	describe('allowCustom', () => {
		const customDefinition: CompanionInputFieldDropdown = { ...definition, allowCustom: true }

		it('should be valid for custom values when allowCustom is true', () => {
			expect(validateInputValue(customDefinition, 'custom_value')).toMatchObject({
				sanitisedValue: 'custom_value',
				validity: true,
			})
		})

		it('should stringify non-choice custom values', () => {
			expect(validateInputValue(customDefinition, 999)).toMatchObject({ sanitisedValue: '999', validity: true })
		})

		describe('with regex', () => {
			const customWithRegex: CompanionInputFieldDropdown = { ...definition, allowCustom: true, regex: '/^custom_/' }

			it('should be valid when custom value matches regex', () => {
				expect(validateInputValue(customWithRegex, 'custom_value')).toMatchObject({
					sanitisedValue: 'custom_value',
					validity: true,
				})
			})

			it('should return error when custom value does not match regex', () => {
				expect(validateInputValue(customWithRegex, 'invalid_value')).toEqual({
					sanitisedValue: 'invalid_value',
					validationError: 'Value does not match regex: /^custom_/',
					validity: false,
					validationWarnings: [],
				})
			})

			it('should be valid for choice values even if they do not match regex', () => {
				expect(validateInputValue(customWithRegex, 'option1')).toMatchObject({
					sanitisedValue: 'option1',
					validity: true,
				})
			})
		})
	})
})

describe('multidropdown', () => {
	const definition: CompanionInputFieldMultiDropdown = {
		id: 'test',
		type: 'multidropdown',
		label: 'Test',
		default: [],
		choices: [
			{ id: 'option1', label: 'Option 1' },
			{ id: 'option2', label: 'Option 2' },
			{ id: 'option3', label: 'Option 3' },
			{ id: 123, label: 'Numeric Option' },
		],
	}

	it('should sanitise undefined to an empty array', () => {
		expect(validateInputValue(definition, undefined)).toEqual({
			sanitisedValue: [],
			validationError: undefined,
			validity: true,
			validationWarnings: [],
		})
	})

	it('should return error when value is not an array and cannot be coerced', () => {
		expect(validateInputValue(definition, { option1: true })).toEqual({
			sanitisedValue: { option1: true },
			validationError: 'Value must be an array',
			validity: false,
			validationWarnings: [],
		})
		expect(validateInputValue(definition, '')).toMatchObject({ validationError: 'Value must be an array' })
	})

	describe('non-array coercion', () => {
		it('should coerce a non-empty string into an array with a warning', () => {
			expect(validateInputValue(definition, 'option1')).toEqual({
				sanitisedValue: ['option1'],
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a number into an array with a warning', () => {
			expect(validateInputValue(definition, 123)).toEqual({
				sanitisedValue: [123],
				validationError: undefined,
				validity: true,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a boolean and then reject the invalid value', () => {
			expect(validateInputValue(definition, true)).toEqual({
				sanitisedValue: [true],
				validationError: 'The following selected values are not valid: true',
				validity: false,
				validationWarnings: ['Value was coerced into an array'],
			})
		})

		it('should coerce a non-choice string and then reject it', () => {
			expect(validateInputValue(definition, 'invalid')).toEqual({
				sanitisedValue: ['invalid'],
				validationError: 'The following selected values are not valid: invalid',
				validity: false,
				validationWarnings: ['Value was coerced into an array'],
			})
		})
	})

	it('should be valid for an empty array', () => {
		expect(validateInputValue(definition, [])).toMatchObject({ sanitisedValue: [], validity: true })
	})

	it('should be valid when all values are in choices', () => {
		expect(validateInputValue(definition, ['option1', 'option2', 'option3'])).toMatchObject({
			sanitisedValue: ['option1', 'option2', 'option3'],
			validity: true,
		})
	})

	it('should return error when any value is not in choices', () => {
		expect(validateInputValue(definition, ['option1', 'invalid'])).toEqual({
			sanitisedValue: ['option1', 'invalid'],
			validationError: 'The following selected values are not valid: invalid',
			validity: false,
			validationWarnings: [],
		})
	})

	describe('numeric choice ids', () => {
		it('should match number and loose-string values to a numeric choice id', () => {
			expect(validateInputValue(definition, [123])).toMatchObject({ sanitisedValue: [123], validity: true })
			expect(validateInputValue(definition, ['option1', 123])).toMatchObject({
				sanitisedValue: ['option1', 123],
				validity: true,
			})
			expect(validateInputValue(definition, ['123'])).toMatchObject({ sanitisedValue: [123], validity: true })
		})
	})

	describe('minSelection/maxSelection', () => {
		const constrainedDefinition: CompanionInputFieldMultiDropdown = { ...definition, minSelection: 1, maxSelection: 2 }

		it('should return error when below minSelection', () => {
			expect(validateInputValue(constrainedDefinition, [])).toMatchObject({
				validationError: 'Must select at least 1 items',
				validity: false,
			})
		})

		it('should return error when above maxSelection', () => {
			expect(validateInputValue(constrainedDefinition, ['option1', 'option2', 'option3'])).toMatchObject({
				validationError: 'Must select at most 2 items',
				validity: false,
			})
		})

		it('should be valid when within range', () => {
			expect(validateInputValue(constrainedDefinition, ['option1'])).toMatchObject({ validity: true })
			expect(validateInputValue(constrainedDefinition, ['option1', 'option2'])).toMatchObject({ validity: true })
		})
	})

	// Note: base's `CompanionInputFieldMultiDropdown` has no allowCustom/regex, so these are exercised
	// against the primitive directly rather than through the orchestrator.
	describe('allowCustom (via primitive)', () => {
		const choices = [{ id: 'option1' }, { id: 'option2' }, { id: 'option3' }, { id: 123 }]
		const base = { choices, allowCustom: true, regex: undefined, minSelection: undefined, maxSelection: undefined }

		it('should be valid for custom values when allowCustom is true', () => {
			expect(validateMultiDropdownValue(['custom_value'], base)).toMatchObject({
				sanitisedValue: ['custom_value'],
				validity: true,
			})
			expect(validateMultiDropdownValue(['option1', 'custom_value'], base)).toMatchObject({
				sanitisedValue: ['option1', 'custom_value'],
				validity: true,
			})
		})

		it('should stringify custom non-choice values', () => {
			expect(validateMultiDropdownValue([999], base)).toMatchObject({ sanitisedValue: ['999'], validity: true })
		})

		describe('with regex', () => {
			const withRegex = { ...base, regex: '/^custom_/' }

			it('should be valid when custom value matches regex', () => {
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

describe('colorpicker', () => {
	const INVALID_ERROR = 'Value must be a color number or a css color string'

	describe('returnType: number', () => {
		const numberDefinition: CompanionInputFieldColor = {
			id: 'test',
			type: 'colorpicker',
			label: 'Test',
			default: 0,
			returnType: 'number',
			enableAlpha: false,
		}

		it('should accept color numbers unchanged', () => {
			expect(validateInputValue(numberDefinition, 16777215)).toMatchObject({ sanitisedValue: 16777215, validity: true })
			expect(validateInputValue(numberDefinition, 0)).toMatchObject({ sanitisedValue: 0, validity: true })
		})

		it('should sanitise numeric strings to a number', () => {
			expect(validateInputValue(numberDefinition, '16777215')).toMatchObject({
				sanitisedValue: 16777215,
				validity: true,
			})
		})

		it('should sanitise a css color string to a color number', () => {
			expect(validateInputValue(numberDefinition, '#ff0000')).toMatchObject({
				sanitisedValue: 0xff0000,
				validity: true,
			})
		})

		it('should pack alpha when sanitising a translucent css string', () => {
			expect(validateInputValue(numberDefinition, 'rgba(255, 0, 0, 0.5)')).toMatchObject({
				sanitisedValue: 0xff0000 + 0x80 * 0x1000000,
				validity: true,
			})
		})

		it('should return error for a string that is not a color', () => {
			expect(validateInputValue(numberDefinition, 'this is not a color')).toEqual({
				sanitisedValue: 'this is not a color',
				validationError: INVALID_ERROR,
				validity: false,
				validationWarnings: [],
			})
		})

		it('should return error when value is undefined', () => {
			expect(validateInputValue(numberDefinition, undefined)).toMatchObject({
				validationError: INVALID_ERROR,
				validity: false,
			})
		})
	})

	describe('returnType: string', () => {
		const stringDefinition: CompanionInputFieldColor = {
			id: 'test',
			type: 'colorpicker',
			label: 'Test',
			default: '#000000',
			enableAlpha: false,
			returnType: 'string',
		}

		it('should keep valid css color strings', () => {
			expect(validateInputValue(stringDefinition, '#ffffff')).toMatchObject({
				sanitisedValue: '#ffffff',
				validity: true,
			})
			expect(validateInputValue(stringDefinition, 'rgb(255,255,255)')).toMatchObject({
				sanitisedValue: 'rgb(255,255,255)',
				validity: true,
			})
		})

		it('should coerce a color number to a css string', () => {
			expect(validateInputValue(stringDefinition, 16777215)).toMatchObject({
				sanitisedValue: 'rgba(255, 255, 255, 1)',
				validity: true,
			})
		})

		it('should coerce a numeric string to a css string', () => {
			expect(validateInputValue(stringDefinition, '123')).toMatchObject({
				sanitisedValue: 'rgba(0, 0, 123, 1)',
				validity: true,
			})
		})

		it('should return error for invalid types', () => {
			expect(validateInputValue(stringDefinition, true)).toMatchObject({
				validationError: INVALID_ERROR,
				validity: false,
			})
			expect(validateInputValue(stringDefinition, ['#fff'])).toMatchObject({
				validationError: INVALID_ERROR,
				validity: false,
			})
			expect(validateInputValue(stringDefinition, { color: '#fff' })).toMatchObject({
				validationError: INVALID_ERROR,
				validity: false,
			})
		})
	})
})

describe('checkbox', () => {
	const definition: CompanionInputFieldCheckbox = { id: 'test', type: 'checkbox', label: 'Test', default: false }

	it('should keep boolean values', () => {
		expect(validateInputValue(definition, true)).toEqual({
			sanitisedValue: true,
			validationError: undefined,
			validationWarnings: [],
			validity: undefined,
		})
		expect(validateInputValue(definition, false)).toMatchObject({ sanitisedValue: false, validationError: undefined })
	})

	it('should coerce undefined to false', () => {
		expect(validateInputValue(definition, undefined)).toMatchObject({ sanitisedValue: false })
	})

	it('should coerce non-boolean values by truthiness', () => {
		expect(validateInputValue(definition, 'true')).toMatchObject({ sanitisedValue: true })
		expect(validateInputValue(definition, 1)).toMatchObject({ sanitisedValue: true })
		expect(validateInputValue(definition, 0)).toMatchObject({ sanitisedValue: false })
		expect(validateInputValue(definition, null)).toMatchObject({ sanitisedValue: false })
	})
})

describe('no-op field types', () => {
	it('should not validate static-text/custom-variable/bonjour-device', () => {
		const staticText = { id: 'x', type: 'static-text', label: 'x', value: 'hello' } as SomeCompanionInputField
		expect(validateInputValue(staticText, undefined)).toMatchObject({ validity: undefined, validationError: undefined })

		for (const type of ['custom-variable', 'bonjour-device'] as const) {
			const field = { id: 'x', type, label: 'x' } as SomeCompanionInputField
			expect(validateInputValue(field, 'anything')).toMatchObject({
				sanitisedValue: 'anything',
				validity: undefined,
				validationError: undefined,
			})
		}
	})
})
