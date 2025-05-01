import { describe, expect, test } from 'vitest'
import { serializeIsVisibleFn } from '../base.js'
import type { CompanionInputFieldBase } from '../../module-api/input.js'
// eslint-disable-next-line n/no-missing-import
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
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisible: true as any,
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisible: 'true' as any,
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisible: null as any,
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
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisible: () => true,
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisible: () => !!expected,
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
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleFn: '() => true',
				isVisibleFnType: 'function',
			},
			{
				id: 'test',
				type: 'textinput',
				label: 'Test',
				isVisibleFn: '() => !!expected',
				isVisibleFnType: 'function',
			},
		]

		const res = serializeIsVisibleFn(input)
		expect(res).toEqual(expected)
	})
})
