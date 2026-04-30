import { afterEach, describe, expect, it } from 'vitest'
import type {
	CompanionGraphicsCompositeElementDefinition,
	CompanionGraphicsCompositeElementDefinitions,
	SomeButtonGraphicsElement,
} from '@companion-module/base'
import { validateCompositeElementDefinitions } from '../composite-elements.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validDef(
	overrides: Partial<CompanionGraphicsCompositeElementDefinition> = {},
): CompanionGraphicsCompositeElementDefinition {
	return {
		type: 'composite',
		name: 'My Element',
		options: [],
		elements: [{ type: 'box' }],
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// Logger capture
// ---------------------------------------------------------------------------

afterEach(() => {
	global.COMPANION_LOGGER = undefined
})

function runCapture(definitions: CompanionGraphicsCompositeElementDefinitions<any>): string[] {
	const messages: string[] = []
	const prev = global.COMPANION_LOGGER
	global.COMPANION_LOGGER = (_source, level, message) => {
		if (level === 'warn') messages.push(message)
	}
	try {
		validateCompositeElementDefinitions(definitions)
	} finally {
		global.COMPANION_LOGGER = prev
	}
	return messages
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateCompositeElementDefinitions', () => {
	describe('skipping', () => {
		it('does not warn for an empty record', () => {
			const msgs = runCapture({})
			expect(msgs).toHaveLength(0)
		})

		it('warns and skips a null entry', () => {
			const msgs = runCapture({ myEl: null as unknown as CompanionGraphicsCompositeElementDefinition })
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})

		it('warns and skips a false entry', () => {
			const msgs = runCapture({ myEl: false })
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})

		it('warns and skips a string entry', () => {
			const msgs = runCapture({ myEl: 'bad' as unknown as CompanionGraphicsCompositeElementDefinition })
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})
	})

	describe('banned prop IDs', () => {
		it('flags a definition with key __proto__ (constructed via defineProperty)', () => {
			// Object literal syntax { __proto__: x } sets the prototype, not an own property,
			// so we must use defineProperty to create an enumerable own key named '__proto__'.
			const defs = Object.create(null) as CompanionGraphicsCompositeElementDefinitions<any>
			Object.defineProperty(defs, '__proto__', { value: validDef(), enumerable: true, configurable: true })
			const msgs = runCapture(defs)
			expect(msgs.some((m) => m.includes('reserved') || m.includes('__proto__'))).toBe(true)
		})

		it('flags a definition with key constructor', () => {
			const msgs = runCapture({ constructor: validDef() })
			expect(msgs.some((m) => m.includes('reserved') || m.includes('constructor'))).toBe(true)
		})
	})

	describe('elements validation', () => {
		it('flags an element with an unrecognised type', () => {
			const msgs = runCapture({ myEl: validDef({ elements: [{ type: 'unknown' as any }] }) })
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(true)
		})

		it('does not warn for all seven valid element types', () => {
			const validTypes: SomeButtonGraphicsElement[] = [
				{ type: 'group', children: [] },
				{ type: 'composite', elementId: 'x', options: {} },
				{ type: 'text', text: 'hello' as any },
				{ type: 'image', base64Image: null as any },
				{ type: 'box' },
				{ type: 'line' },
				{ type: 'circle' },
			]
			const msgs = runCapture({ myEl: validDef({ elements: validTypes }) })
			expect(msgs).toHaveLength(0)
		})

		it('flags an invalid type nested inside group children', () => {
			const nested: SomeButtonGraphicsElement = {
				type: 'group',
				children: [{ type: 'bad' } as any],
			}
			const msgs = runCapture({ myEl: validDef({ elements: [nested] }) })
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(true)
		})

		it('does not warn for valid types nested inside group children', () => {
			const nested: SomeButtonGraphicsElement = {
				type: 'group',
				children: [{ type: 'box' }],
			}
			const msgs = runCapture({ myEl: validDef({ elements: [nested] }) })
			expect(msgs).toHaveLength(0)
		})
	})

	describe('fully valid definition', () => {
		it('does not warn for a complete valid definition', () => {
			const msgs = runCapture({ myEl: validDef() })
			expect(msgs).toHaveLength(0)
		})

		it('does not warn for multiple valid definitions', () => {
			const msgs = runCapture({ a: validDef(), b: validDef(), c: validDef() })
			expect(msgs).toHaveLength(0)
		})
	})
})
