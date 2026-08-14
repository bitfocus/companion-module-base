import isEqual from 'fast-deep-equal'
import type { JsonValue } from '@companion-module/base'
import { cssColorToRgba, decodeRgba, encodeRgba, rgbaToCssString, type ColorInputEncoding } from './color.js'
import { compileRegex, stringifyVariableValue } from './helpers.js'
import type { ValueValidationResult } from './result.js'

function makeResult<T>(
	sanitisedValue: T,
	validationError: string | undefined,
	validationWarnings: string[],
	hasValidation = true,
): ValueValidationResult<T> {
	return {
		sanitisedValue,
		validationError,
		validationWarnings,
		validity: validationError !== undefined ? false : hasValidation ? true : undefined,
	}
}

export interface NumberValidationOptions {
	min: number | undefined
	max: number | undefined
	asInteger: boolean | undefined
	/** When out of range, clamp to min/max (with a warning) instead of rejecting. */
	clampValues: boolean | undefined
	/** When out of range, keep the value and warn instead of rejecting. Takes priority over clampValues. */
	allowInvalidValues: boolean | undefined
}

export function validateNumberValue(
	value: JsonValue | undefined,
	options: NumberValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []

	if (value === undefined || value === '' || value === null) {
		return makeResult(value, 'A value must be provided', warnings)
	}

	let sanitisedValue = typeof value === 'number' ? value : Number(value)
	if (isNaN(sanitisedValue)) {
		return makeResult(value, 'Value must be a number', warnings)
	}

	if (options.asInteger && !Number.isInteger(sanitisedValue)) {
		warnings.push('Value was rounded to nearest integer')
		sanitisedValue = Math.round(sanitisedValue)
	}

	if (options.min !== undefined && sanitisedValue < options.min) {
		if (options.allowInvalidValues) {
			warnings.push(`Value is below ${options.min}`)
		} else if (options.clampValues) {
			sanitisedValue = options.min
			warnings.push(`Value was clamped to ${options.min}`)
		} else {
			return makeResult(sanitisedValue, `Value must be greater than or equal to ${options.min}`, warnings)
		}
	}
	if (options.max !== undefined && sanitisedValue > options.max) {
		if (options.allowInvalidValues) {
			warnings.push(`Value is above ${options.max}`)
		} else if (options.clampValues) {
			sanitisedValue = options.max
			warnings.push(`Value was clamped to ${options.max}`)
		} else {
			return makeResult(sanitisedValue, `Value must be less than or equal to ${options.max}`, warnings)
		}
	}

	return makeResult(sanitisedValue, undefined, warnings)
}

export interface TextValidationOptions {
	minLength: number | undefined
	/** A `/pattern/flags` regex string the value must match. */
	regex: string | undefined
}

// The value is coerced to a string before validation. Also used for `secret-text` fields.
export function validateTextValue(
	value: JsonValue | undefined,
	options: TextValidationOptions,
): ValueValidationResult<string> {
	const warnings: string[] = []
	const sanitisedValue = stringifyVariableValue(value ?? '') ?? ''

	const compiledRegex = compileRegex(options.regex)
	const hasValidation = options.minLength !== undefined || compiledRegex !== null

	if (options.minLength !== undefined && sanitisedValue.length < options.minLength) {
		return makeResult(sanitisedValue, `Value must be at least ${options.minLength} characters long`, warnings)
	}
	if (compiledRegex && !compiledRegex.exec(sanitisedValue)) {
		return makeResult(sanitisedValue, `Value does not match regex: ${options.regex}`, warnings)
	}

	return makeResult(sanitisedValue, undefined, warnings, hasValidation)
}

export interface DropdownValidationOptions {
	/** Only the `id` of each entry is used, so an app can pass its own richer choice objects. */
	choices: readonly { id: JsonValue }[]
	/** Whether values not present in `choices` are permitted (they come through as strings). */
	allowCustom: boolean | undefined
	/** A `/pattern/flags` regex string a custom value must match. */
	regex: string | undefined
}

export function validateDropdownValue(
	value: JsonValue | undefined,
	options: DropdownValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []

	const isInChoices = options.choices.find((c) => isEqual(c.id, value) || c.id == value)
	if (isInChoices) return makeResult(isInChoices.id, undefined, warnings)

	const stringValue = stringifyVariableValue(value) ?? ''

	if (!options.allowCustom) {
		return makeResult(stringValue, 'Value is not in the list of choices', warnings)
	}

	const compiledRegex = compileRegex(options.regex)
	if (compiledRegex && !compiledRegex.exec(stringValue)) {
		return makeResult(stringValue, `Value does not match regex: ${options.regex}`, warnings)
	}

	return makeResult(stringValue, undefined, warnings)
}

export interface MultiDropdownValidationOptions extends DropdownValidationOptions {
	minSelection: number | undefined
	maxSelection: number | undefined
}

// A non-array scalar is coerced into a single-element array (with a warning).
export function validateMultiDropdownValue(
	value: JsonValue | undefined,
	options: MultiDropdownValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []

	if (value === undefined) return makeResult<JsonValue[]>([], undefined, warnings)

	let arrayValue: JsonValue[]
	if (Array.isArray(value)) {
		arrayValue = value
	} else if (
		(typeof value === 'string' && value.trim() !== '') ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		warnings.push('Value was coerced into an array')
		arrayValue = [value]
	} else {
		return makeResult(value, 'Value must be an array', warnings)
	}

	const sanitisedValue: JsonValue[] = []
	const invalidValues: JsonValue[] = []

	for (const val of arrayValue) {
		const isInChoices = options.choices.find((c) => isEqual(c.id, val) || c.id == val)
		if (isInChoices) {
			sanitisedValue.push(isInChoices.id)
			continue
		}

		if (!options.allowCustom) {
			invalidValues.push(val)
			continue
		}

		const strVal = stringifyVariableValue(val) ?? ''
		const compiledRegex = compileRegex(options.regex)
		if (compiledRegex && !compiledRegex.exec(strVal)) {
			invalidValues.push(val)
			continue
		}

		sanitisedValue.push(strVal)
	}

	if (invalidValues.length > 0) {
		return makeResult(
			arrayValue,
			`The following selected values are not valid: ${invalidValues.map((v) => stringifyVariableValue(v) ?? '').join(', ')}`,
			warnings,
		)
	}

	if (options.minSelection !== undefined && arrayValue.length < options.minSelection) {
		return makeResult(sanitisedValue, `Must select at least ${options.minSelection} items`, warnings)
	}
	if (options.maxSelection !== undefined && arrayValue.length > options.maxSelection) {
		return makeResult(sanitisedValue, `Must select at most ${options.maxSelection} items`, warnings)
	}

	return makeResult(sanitisedValue, undefined, warnings)
}

export interface ColorValidationOptions {
	/** Defaults to `number` when `undefined`. */
	returnType: 'string' | 'number' | undefined
	/** How to interpret a numeric input's top byte. Defaults to `companion-ttrrggbb`. */
	encoding: ColorInputEncoding | undefined
	/** When falsy, alpha is dropped and only the rgb channels are kept. */
	enableAlpha: boolean | undefined
}

// Output is always a companion-ttrrggbb number, or css with normal alpha - never the input encoding.
export function validateColorValue(
	value: JsonValue | undefined,
	options: ColorValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []
	const encoding = options.encoding ?? 'companion-ttrrggbb'

	// A numeric input, or a string that is entirely a number, is treated as a packed color number.
	const asNumber =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))
				? Number(value)
				: undefined

	let rgba
	let originalCss: string | undefined
	if (asNumber !== undefined && Number.isFinite(asNumber)) {
		rgba = decodeRgba(asNumber, encoding)
	} else if (typeof value === 'string') {
		const parsed = cssColorToRgba(value)
		if (!parsed) return makeResult(value, 'Value must be a color number or a css color string', warnings)
		rgba = parsed
		originalCss = value
	} else {
		return makeResult(value, 'Value must be a color number or a css color string', warnings)
	}

	if (!options.enableAlpha && rgba.a !== 1) {
		rgba = { ...rgba, a: 1 }
		originalCss = undefined
	}

	if (options.returnType === 'string') {
		// A valid css string already has normal alpha, so preserve it; numbers render as rgba(...).
		return makeResult(originalCss ?? rgbaToCssString(rgba), undefined, warnings)
	}
	return makeResult(encodeRgba(rgba, 'companion-ttrrggbb'), undefined, warnings)
}

// Coerced to a boolean via truthiness, so this never fails.
export function validateCheckboxValue(value: JsonValue | undefined): ValueValidationResult<boolean> {
	return makeResult(!!value, undefined, [], false)
}
