import { describe, expect, test } from 'vitest'
import { serializeIsVisibleFn } from '../base.js'
import type { CompanionInputFieldBase } from '../../module-api/input.js'
import { omit } from 'lodash-es'
import type { EncodeIsVisible } from '../../host-api/api.js'

describe('serializeIsVisibleFn', () => {
	test('no isVisible', () => {
		const input: CompanionInputFieldBase[] = [
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
			},
		]

		const res = serializeIsVisibleFn(input)
		expect(res).toEqual(input)
	})

	test('invalid options', () => {
		const input: CompanionInputFieldBase[] = [
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleExpression: 123 as any,
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleExpression: null as any,
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleExpression: () => true as any,
			},
		]

		const res = serializeIsVisibleFn(input)
		expect(res).toEqual(input.map((field) => omit(field, 'isVisibleExpression', 'isVisibleFn', 'isVisible')))
	})

	test('mixed valid', () => {
		const input: CompanionInputFieldBase[] = [
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleExpression: 'true',
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleExpression: 'abc',
			},
		]

		const expected: EncodeIsVisible<CompanionInputFieldBase>[] = [
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleFn: 'true',
				isVisibleFnType: 'expression',
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleFn: 'abc',
				isVisibleFnType: 'expression',
			},
		]

		const res = serializeIsVisibleFn(input)
		expect(res).toEqual(expected)
	})
})
