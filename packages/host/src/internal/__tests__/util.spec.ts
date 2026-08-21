import { describe, expect, it } from 'vitest'
import { filterDuplicateOptionIds, isValidVariableId } from '../util.js'

describe('isValidVariableId', () => {
	it('accepts ids using the permitted characters', () => {
		expect(isValidVariableId('my_variable')).toBe(true)
		expect(isValidVariableId('My-Variable.1')).toBe(true)
		expect(isValidVariableId('ABCabc0123-_.')).toBe(true)
	})

	it('rejects an empty id', () => {
		expect(isValidVariableId('')).toBe(false)
	})

	it('rejects ids containing disallowed characters', () => {
		expect(isValidVariableId('has space')).toBe(false)
		expect(isValidVariableId('has:colon')).toBe(false)
		expect(isValidVariableId('has$dollar')).toBe(false)
		expect(isValidVariableId('has/slash')).toBe(false)
		expect(isValidVariableId('emoji😀')).toBe(false)
	})

	it('rejects ids with leading or trailing newlines', () => {
		expect(isValidVariableId('valid\n')).toBe(false)
		expect(isValidVariableId('\nvalid')).toBe(false)
	})
})

describe('filterDuplicateOptionIds', () => {
	it('returns an empty result for an empty array', () => {
		const result = filterDuplicateOptionIds([])
		expect(result.options).toEqual([])
		expect(result.duplicateIds).toEqual([])
	})

	it('preserves the original array when there are no duplicates', () => {
		const options = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
		const result = filterDuplicateOptionIds(options)

		expect(result.duplicateIds).toEqual([])
		// The original array reference should be returned untouched
		expect(result.options).toBe(options)
	})

	it('keeps only the first usage of a duplicated id', () => {
		const result = filterDuplicateOptionIds([{ id: 'a', label: 'first' }, { id: 'b' }, { id: 'a', label: 'second' }])

		expect(result.options).toEqual([{ id: 'a', label: 'first' }, { id: 'b' }])
		expect(result.duplicateIds).toEqual(['a'])
	})

	it('reports each duplicated id only once, even when repeated multiple times', () => {
		const result = filterDuplicateOptionIds([{ id: 'a' }, { id: 'a' }, { id: 'a' }, { id: 'b' }])

		expect(result.options).toEqual([{ id: 'a' }, { id: 'b' }])
		expect(result.duplicateIds).toEqual(['a'])
	})

	it('handles multiple distinct duplicated ids', () => {
		const result = filterDuplicateOptionIds([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }, { id: 'b' }])

		expect(result.options).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
		expect(result.duplicateIds).toEqual(['a', 'b'])
	})
})
