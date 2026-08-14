import { assertNever, type JsonValue, type SomeCompanionInputField } from '@companion-module/base'
import {
	validateCheckboxValue,
	validateColorValue,
	validateDropdownValue,
	validateMultiDropdownValue,
	validateNumberValue,
	validateTextValue,
} from './primitives.js'
import type { ValueValidationResult } from './result.js'

/**
 * Validate a value against a module-api input field definition.
 *
 * This is the Companion-side orchestrator: it maps each field type onto the corresponding shared
 * validation primitive. Other apps with their own field representations should call the individual
 * `validate*Value` primitives directly rather than going through this dispatcher.
 */
export function validateInputValue(
	field: SomeCompanionInputField,
	value: JsonValue | undefined,
): ValueValidationResult {
	switch (field.type) {
		case 'static-text':
			// Nothing to validate, and static-text has no stored value
			return { sanitisedValue: undefined, validationError: undefined, validationWarnings: [], validity: undefined }

		case 'custom-variable':
		case 'bonjour-device':
			// Nothing to validate
			return { sanitisedValue: value, validationError: undefined, validationWarnings: [], validity: undefined }

		case 'textinput':
		case 'secret-text':
			return validateTextValue(value, { minLength: field.minLength, regex: field.regex })

		case 'number':
			return validateNumberValue(value, {
				min: field.min,
				max: field.max,
				asInteger: field.asInteger,
				clampValues: field.clampValues,
				allowInvalidValues: field.allowInvalidValues,
			})

		case 'dropdown':
			return validateDropdownValue(value, {
				choices: field.choices,
				allowCustom: field.allowCustom,
				regex: field.regex,
			})

		case 'multidropdown':
			// Note: base's multidropdown has no custom-value support, so allowCustom/regex are always undefined
			return validateMultiDropdownValue(value, {
				choices: field.choices,
				allowCustom: undefined,
				regex: undefined,
				minSelection: field.minSelection,
				maxSelection: field.maxSelection,
			})

		case 'colorpicker':
			return validateColorValue(value, { returnType: field.returnType })

		case 'checkbox':
			return validateCheckboxValue(value)

		default:
			assertNever(field)
			return {
				sanitisedValue: value,
				validationError: 'Unknown input field type',
				validationWarnings: [],
				validity: false,
			}
	}
}
