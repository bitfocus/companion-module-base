import { describe, expect, it } from 'vitest'
import type { SomeButtonGraphicsElement } from '@companion-module/base'
import { elementSchema } from '../elements.js'

/**
 * The element schema gates layered presets and composite element definitions: an element it rejects
 * takes the whole preset/definition with it. So it must accept everything the module API declares and
 * everything Companion's own element properties allow.
 */

function accepts(element: SomeButtonGraphicsElement): boolean {
	return elementSchema.safeParse(element).success
}

describe('elementSchema', () => {
	describe('colors', () => {
		it.each([
			['a packed color number', 0xff0000],
			['black', 0],
			['a number with a transparency byte', 0xff000000],
			['the largest color number', 0xffffffff],
			['a hex css string', '#ff0000'],
			['a hex css string with alpha', '#ff000080'],
			['an rgb css string', 'rgb(255, 0, 0)'],
			['an rgba css string', 'rgba(255, 0, 0, 0.5)'],
			['a color number as a string', '16711680'],
		])('accepts %s', (_name, color) => {
			expect(accepts({ type: 'box', color })).toBe(true)
		})

		it.each([
			['a string that is not a color', 'not-a-color'],
			// Companion parses colors with colord and does not register its `names` plugin, so a named
			// color is not a color it can draw
			['a named css color', 'red'],
			['an empty string', ''],
			['a negative number', -1],
			['a number beyond the 32bit range', 0x1ffffffff],
			['a fractional number', 1.5],
			['a boolean', true],
			['null', null],
		])('rejects %s', (_name, color) => {
			expect(accepts({ type: 'box', color } as SomeButtonGraphicsElement)).toBe(false)
		})

		it('accepts a css string on every color property', () => {
			expect(accepts({ type: 'box', color: '#fff', borderColor: '#000' })).toBe(true)
			expect(accepts({ type: 'text', text: '', color: '#fff', outlineColor: 'rgba(0, 0, 0, 0)' })).toBe(true)
			expect(accepts({ type: 'line', borderColor: '#fff' })).toBe(true)
			expect(accepts({ type: 'circle', color: '#fff', borderColor: '#000' })).toBe(true)
			expect(
				accepts({ type: 'gauge', markerColor: '#fff', stops: [{ value: 0, color: '#0f0', gradient: false }] }),
			).toBe(true)
		})

		it('accepts a css string inside a value wrapper', () => {
			expect(accepts({ type: 'box', color: { value: '#ff0000', isExpression: false } })).toBe(true)
		})

		it('still accepts an expression for a color', () => {
			expect(accepts({ type: 'box', color: { value: '$(foo)', isExpression: true } })).toBe(true)
		})
	})

	describe('angles', () => {
		it.each([
			['a full circle', 360],
			['no sweep', 0],
			['a partial sweep', 90],
		])('accepts %s as a circle start/end angle', (_name, angle) => {
			expect(accepts({ type: 'circle', startAngle: angle, endAngle: angle })).toBe(true)
		})

		it.each([
			['a full circle', 360],
			['no sweep', 0],
		])('accepts %s as a gauge start/end angle', (_name, angle) => {
			expect(accepts({ type: 'gauge', startAngle: angle, endAngle: angle })).toBe(true)
		})

		it.each([
			['an angle beyond a full circle', 361],
			['a negative angle', -1],
		])('rejects %s', (_name, angle) => {
			expect(accepts({ type: 'circle', endAngle: angle })).toBe(false)
			expect(accepts({ type: 'gauge', endAngle: angle })).toBe(false)
		})
	})

	describe('rotation', () => {
		it.each([
			['no rotation', 0],
			['a full turn', 360],
			['a negative rotation', -90],
			['a full negative turn', -360],
		])('accepts %s', (_name, rotation) => {
			expect(accepts({ type: 'box', rotation })).toBe(true)
			expect(accepts({ type: 'text', text: '', rotation })).toBe(true)
			expect(accepts({ type: 'image', base64Image: null, rotation })).toBe(true)
			expect(accepts({ type: 'gauge', rotation })).toBe(true)
			expect(accepts({ type: 'group', children: [], rotation })).toBe(true)
			expect(accepts({ type: 'composite', elementId: 'abc', options: {}, rotation })).toBe(true)
		})

		it.each([
			['more than a full turn', 361],
			['less than a full negative turn', -361],
		])('rejects %s', (_name, rotation) => {
			expect(accepts({ type: 'box', rotation })).toBe(false)
		})
	})

	describe('bounds', () => {
		it('accepts an element positioned off the canvas', () => {
			expect(accepts({ type: 'box', x: -25, y: -10 })).toBe(true)
		})

		it('accepts an element larger than the canvas', () => {
			expect(accepts({ type: 'box', width: 200, height: 150 })).toBe(true)
		})

		it('accepts the extremes Companion allows', () => {
			expect(accepts({ type: 'box', x: -1000, y: 1000, width: 1000, height: 0 })).toBe(true)
		})

		it.each([
			['x beyond the range', { x: -1001 }],
			['y beyond the range', { y: 1001 }],
			['a negative width', { width: -1 }],
			['a height beyond the range', { height: 1001 }],
		])('rejects %s', (_name, bounds) => {
			expect(accepts({ type: 'box', ...bounds })).toBe(false)
		})
	})

	describe('box corner radius', () => {
		it('accepts the full range Companion allows', () => {
			expect(accepts({ type: 'box', cornerRadius: 0 })).toBe(true)
			expect(accepts({ type: 'box', cornerRadius: 100 })).toBe(true)
		})

		it('rejects a corner radius beyond the range', () => {
			expect(accepts({ type: 'box', cornerRadius: 101 })).toBe(false)
		})
	})

	describe('nested elements', () => {
		it('applies the same rules to the children of a group', () => {
			expect(accepts({ type: 'group', children: [{ type: 'box', x: -50, color: '#ff0000' }] })).toBe(true)
			expect(accepts({ type: 'group', children: [{ type: 'box', color: 'not-a-color' }] })).toBe(false)
		})
	})
})
