import { colord } from 'colord'
import isEqual from 'fast-deep-equal'
import type { JsonValue } from '@companion-module/base'
import { colorToNumber, compileRegex, parseColor, stringifyValue } from './helpers.js'
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

/**
 * Options for {@link validateNumberValue}.
 *
 * Every field is required but may be `undefined` so that a caller cannot accidentally omit a
 * constraint (and silently skip it). Pass `undefined` to opt out of a specific check.
 */
export interface NumberValidationOptions {
	/** The minimum allowed value, or `undefined` for no minimum */
	min: number | undefined
	/** The maximum allowed value, or `undefined` for no maximum */
	max: number | undefined
	/** Whether to round the value to the nearest integer */
	asInteger: boolean | undefined
	/** When out of range, clamp to min/max (with a warning) instead of rejecting */
	clampValues: boolean | undefined
	/** When out of range, keep the value and raise a warning instead of rejecting */
	allowInvalidValues: boolean | undefined
}

/**
 * Validate and sanitise a numeric value.
 * Coerces strings to numbers, optionally rounds to an integer, and enforces min/max.
 */
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

/**
 * Options for {@link validateTextValue}.
 *
 * Every field is required but may be `undefined` to opt out of that check.
 */
export interface TextValidationOptions {
	/** Minimum required length of the (stringified) value, or `undefined` for no minimum */
	minLength: number | undefined
	/** A `/pattern/flags` regex string the value must match, or `undefined` for no regex check */
	regex: string | undefined
}

/**
 * Validate and sanitise a text value. The value is always coerced to a string before validation.
 * This is also the primitive used for `secret-text` fields, which share `minLength`/`regex`.
 */
export function validateTextValue(
	value: JsonValue | undefined,
	options: TextValidationOptions,
): ValueValidationResult<string> {
	const warnings: string[] = []
	const sanitisedValue = stringifyValue(value ?? '')

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

/**
 * Options for {@link validateDropdownValue}.
 *
 * `choices` only needs to expose an `id` on each entry, so an app can pass its own richer choice
 * objects without reshaping them.
 */
export interface DropdownValidationOptions {
	/** The allowed choices. Only the `id` of each is used. */
	choices: readonly { id: JsonValue }[]
	/** Whether values not present in `choices` are permitted (they come through as strings) */
	allowCustom: boolean | undefined
	/** A `/pattern/flags` regex string a custom value must match, or `undefined` for no regex check */
	regex: string | undefined
}

/**
 * Validate a single-select dropdown value against a list of choices, optionally allowing custom values.
 */
export function validateDropdownValue(
	value: JsonValue | undefined,
	options: DropdownValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []

	const isInChoices = options.choices.find((c) => isEqual(c.id, value) || c.id == value)
	if (isInChoices) return makeResult(isInChoices.id, undefined, warnings)

	const stringValue = stringifyValue(value)

	if (!options.allowCustom) {
		return makeResult(stringValue, 'Value is not in the list of choices', warnings)
	}

	const compiledRegex = compileRegex(options.regex)
	if (compiledRegex && !compiledRegex.exec(stringValue)) {
		return makeResult(stringValue, `Value does not match regex: ${options.regex}`, warnings)
	}

	return makeResult(stringValue, undefined, warnings)
}

/**
 * Options for {@link validateMultiDropdownValue}.
 */
export interface MultiDropdownValidationOptions extends DropdownValidationOptions {
	/** The minimum number of selected values, or `undefined` for no minimum */
	minSelection: number | undefined
	/** The maximum number of selected values, or `undefined` for no maximum */
	maxSelection: number | undefined
}

/**
 * Validate a multi-select dropdown value: an array of values each validated against the choices.
 * Non-array scalars are coerced into a single-element array (with a warning).
 */
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

		const strVal = stringifyValue(val)
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
			`The following selected values are not valid: ${invalidValues.map(stringifyValue).join(', ')}`,
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

/**
 * Options for {@link validateColorValue}.
 */
export interface ColorValidationOptions {
	/** The format to return the sanitised color in. Defaults to a color number when `undefined`. */
	returnType: 'string' | 'number' | undefined
}

/**
 * Validate a color value (a color number or a css color string) and return it in the requested format.
 */
export function validateColorValue(
	value: JsonValue | undefined,
	options: ColorValidationOptions,
): ValueValidationResult {
	const warnings: string[] = []

	const isColor =
		typeof value === 'number' ||
		(typeof value === 'string' && ((value.trim() !== '' && !isNaN(Number(value))) || colord(value).isValid()))
	if (!isColor) {
		return makeResult(value, 'Value must be a color number or a css color string', warnings)
	}

	const colorValue = value
	return options.returnType === 'string'
		? makeResult(parseColor(colorValue), undefined, warnings)
		: makeResult(colorToNumber(colorValue), undefined, warnings)
}

/**
 * Validate a checkbox value. Any value is coerced to a boolean via truthiness, so this never fails.
 */
export function validateCheckboxValue(value: JsonValue | undefined): ValueValidationResult<boolean> {
	return makeResult(!!value, undefined, [], false)
}
