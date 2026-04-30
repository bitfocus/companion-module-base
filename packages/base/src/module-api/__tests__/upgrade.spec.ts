import { describe, expect, it } from 'vitest'
import { FixupBooleanOrVariablesValueToExpressions, FixupNumericOrVariablesValueToExpressions } from '../upgrade.js'

describe('FixupNumericOrVariablesValueToExpressions', () => {
	it('returns undefined when given undefined', () => {
		expect(FixupNumericOrVariablesValueToExpressions(undefined)).toBeUndefined()
	})

	it('passes through an existing expression unchanged', () => {
		const val = { isExpression: true as const, value: '$(ns:myVar) + 1' }
		expect(FixupNumericOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('converts an integer number value', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 42 })).toEqual({
			isExpression: false,
			value: 42,
		})
	})

	it('converts a float number value', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 3.14 })).toEqual({
			isExpression: false,
			value: 3.14,
		})
	})

	it('converts a zero number value', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 0 })).toEqual({
			isExpression: false,
			value: 0,
		})
	})

	it('converts a numeric string to a number', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '42' })).toEqual({
			isExpression: false,
			value: 42,
		})
	})

	it('converts a numeric string with whitespace to a number', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '  7  ' })).toEqual({
			isExpression: false,
			value: 7,
		})
	})

	it('converts a float numeric string to a number', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '3.14' })).toEqual({
			isExpression: false,
			value: 3.14,
		})
	})

	it('converts a zero numeric string to a number', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '0' })).toEqual({
			isExpression: false,
			value: 0,
		})
	})

	it('treats a simple variable as a plain expression', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '$(internal:a_var)' })).toEqual({
			isExpression: true,
			value: '$(internal:a_var)',
		})
	})

	it('treats a simple variable with surrounding whitespace as a plain expression', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '  $(ns:x)  ' })).toEqual({
			isExpression: true,
			value: '  $(ns:x)  ',
		})
	})

	it('wraps a mixed string containing a variable in parseVariables', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 'prefix$(ns:var)suffix' })).toEqual({
			isExpression: true,
			value: 'parseVariables("prefix$(ns:var)suffix")',
		})
	})

	it('wraps a plain non-numeric string in parseVariables', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 'hello world' })).toEqual({
			isExpression: true,
			value: 'parseVariables("hello world")',
		})
	})

	it('escapes backslashes in wrapped strings', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 'a\\b' })).toEqual({
			isExpression: true,
			value: 'parseVariables("a\\\\b")',
		})
	})

	it('escapes double-quotes in wrapped strings', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: 'say "hi"' })).toEqual({
			isExpression: true,
			value: 'parseVariables("say \\"hi\\"")',
		})
	})

	it('does not treat a nested $( as a simple variable', () => {
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '$(a:$(b:c))' })).toEqual({
			isExpression: true,
			value: 'parseVariables("$(a:$(b:c))")',
		})
	})

	it('passes through a boolean value unchanged', () => {
		const val = { isExpression: false as const, value: true }
		expect(FixupNumericOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('passes through a null value unchanged', () => {
		const val = { isExpression: false as const, value: null }
		expect(FixupNumericOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('passes through an empty string wrapped in parseVariables', () => {
		// Empty string is not numeric and not a variable → parseVariables
		expect(FixupNumericOrVariablesValueToExpressions({ isExpression: false, value: '' })).toEqual({
			isExpression: true,
			value: 'parseVariables("")',
		})
	})
})

describe('FixupBooleanOrVariablesValueToExpressions', () => {
	it('returns undefined when given undefined', () => {
		expect(FixupBooleanOrVariablesValueToExpressions(undefined)).toBeUndefined()
	})

	it('passes through an existing expression unchanged', () => {
		const val = { isExpression: true as const, value: '$(ns:myVar)' }
		expect(FixupBooleanOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('passes through boolean true unchanged', () => {
		const val = { isExpression: false as const, value: true }
		expect(FixupBooleanOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('passes through boolean false unchanged', () => {
		const val = { isExpression: false as const, value: false }
		expect(FixupBooleanOrVariablesValueToExpressions(val)).toBe(val)
	})

	it('coerces number 1 to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 1 })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces number 0 to false', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 0 })).toEqual({
			isExpression: false,
			value: false,
		})
	})

	it('coerces a negative number to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: -1 })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces a non-zero float to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 0.5 })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces the string "true" to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'true' })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces the string "false" to false', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'false' })).toEqual({
			isExpression: false,
			value: false,
		})
	})

	it('coerces "TRUE" (uppercase) to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'TRUE' })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces "False" (mixed case) to false', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'False' })).toEqual({
			isExpression: false,
			value: false,
		})
	})

	it('coerces numeric string "1" to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '1' })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('coerces numeric string "0" to false', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '0' })).toEqual({
			isExpression: false,
			value: false,
		})
	})

	it('coerces a non-zero numeric string to true', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '42' })).toEqual({
			isExpression: false,
			value: true,
		})
	})

	it('treats a simple variable as a plain expression', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '$(internal:a_var)' })).toEqual({
			isExpression: true,
			value: '$(internal:a_var)',
		})
	})

	it('treats a simple variable with surrounding whitespace as a plain expression', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '  $(ns:x)  ' })).toEqual({
			isExpression: true,
			value: '  $(ns:x)  ',
		})
	})

	it('wraps a mixed string containing a variable in bool(parseVariables(...))', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'prefix$(ns:var)suffix' })).toEqual({
			isExpression: true,
			value: 'bool(parseVariables("prefix$(ns:var)suffix"))',
		})
	})

	it('wraps a plain non-boolean non-numeric string in bool(parseVariables(...))', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'some text' })).toEqual({
			isExpression: true,
			value: 'bool(parseVariables("some text"))',
		})
	})

	it('escapes backslashes in wrapped strings', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'a\\b' })).toEqual({
			isExpression: true,
			value: 'bool(parseVariables("a\\\\b"))',
		})
	})

	it('escapes double-quotes in wrapped strings', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: 'say "hi"' })).toEqual({
			isExpression: true,
			value: 'bool(parseVariables("say \\"hi\\""))',
		})
	})

	it('does not treat a nested $( as a simple variable', () => {
		expect(FixupBooleanOrVariablesValueToExpressions({ isExpression: false, value: '$(a:$(b:c))' })).toEqual({
			isExpression: true,
			value: 'bool(parseVariables("$(a:$(b:c))"))',
		})
	})

	it('passes through a null value unchanged', () => {
		const val = { isExpression: false as const, value: null }
		expect(FixupBooleanOrVariablesValueToExpressions(val)).toBe(val)
	})
})
