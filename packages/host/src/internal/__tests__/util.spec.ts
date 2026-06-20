import { describe, expect, it } from 'vitest'
import { filterDuplicateOptionIds } from '../util.js'

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
