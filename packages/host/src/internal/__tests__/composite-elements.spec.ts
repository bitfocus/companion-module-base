import { describe, it, expect, afterEach } from 'vitest'
import { validateCompositeElementDefinitions } from '../composite-elements.js'
import type { CompanionGraphicsCompositeElementDefinition, SomeButtonGraphicsElement } from '@companion-module/base'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validDef(
	overrides: Partial<CompanionGraphicsCompositeElementDefinition> = {},
): CompanionGraphicsCompositeElementDefinition {
	return {
		id: overrides.id ?? 'el1',
		type: 'composite',
		name: overrides.name ?? 'My Element',
		options: overrides.options ?? [],
		elements: overrides.elements ?? [{ type: 'box' }],
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// Logger capture
// ---------------------------------------------------------------------------

afterEach(() => {
	global.COMPANION_LOGGER = undefined
})

function runCapture(definitions: CompanionGraphicsCompositeElementDefinition[]): string[] {
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
		it('does not warn for an empty array', () => {
			const msgs = runCapture([])
			expect(msgs).toHaveLength(0)
		})

		it('warns and skips a null entry', () => {
			const msgs = runCapture([null as unknown as CompanionGraphicsCompositeElementDefinition])
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})

		it('warns and skips a string entry', () => {
			const msgs = runCapture(['bad' as unknown as CompanionGraphicsCompositeElementDefinition])
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})

		it('warns and skips a numeric entry', () => {
			const msgs = runCapture([42 as unknown as CompanionGraphicsCompositeElementDefinition])
			expect(msgs.some((m) => m.includes('not valid objects'))).toBe(true)
		})
	})

	describe('banned prop IDs', () => {
		it('flags a definition with id __proto__ (constructed via defineProperty)', () => {
			// Object literal syntax { __proto__: x } sets the prototype, not an own property,
			// so we must use defineProperty to create an enumerable own key named '__proto__'.
			const def = validDef({ id: 'placeholder' })
			Object.defineProperty(def, 'id', { value: '__proto__', enumerable: true, configurable: true })
			const msgs = runCapture([def])
			expect(msgs.some((m) => m.includes('reserved') || m.includes('__proto__'))).toBe(true)
		})

		it('flags a definition with id constructor', () => {
			const msgs = runCapture([validDef({ id: 'constructor' })])
			expect(msgs.some((m) => m.includes('reserved') || m.includes('constructor'))).toBe(true)
		})
	})

	describe('id validation', () => {
		it('does not warn for a valid string id', () => {
			const msgs = runCapture([validDef({ id: 'my-element' })])
			expect(msgs).toHaveLength(0)
		})

		it('flags an empty string id', () => {
			const msgs = runCapture([validDef({ id: '' })])
			expect(msgs.some((m) => m.includes('invalid id'))).toBe(true)
		})

		it('flags a numeric id', () => {
			const msgs = runCapture([validDef({ id: 123 as unknown as string })])
			expect(msgs.some((m) => m.includes('invalid id'))).toBe(true)
		})

		it('flags duplicate ids — warns on second occurrence, not first', () => {
			const msgs = runCapture([validDef({ id: 'dup' }), validDef({ id: 'dup' })])
			expect(msgs.some((m) => m.includes('duplicated') && m.includes('dup'))).toBe(true)
		})

		it('does not warn when ids are all unique', () => {
			const msgs = runCapture([validDef({ id: 'a' }), validDef({ id: 'b' })])
			expect(msgs).toHaveLength(0)
		})
	})

	describe('options validation', () => {
		it('flags when options is missing', () => {
			const def = validDef()
			delete (def as any).options
			const msgs = runCapture([def])
			expect(msgs.some((m) => m.includes('invalid options'))).toBe(true)
		})

		it('flags when options is an object instead of array', () => {
			const msgs = runCapture([validDef({ options: {} as any })])
			expect(msgs.some((m) => m.includes('invalid options'))).toBe(true)
		})

		it('does not warn when options is an empty array', () => {
			const msgs = runCapture([validDef({ options: [] })])
			expect(msgs).toHaveLength(0)
		})
	})

	describe('elements validation', () => {
		it('flags when elements is missing', () => {
			const def = validDef()
			delete (def as any).elements
			const msgs = runCapture([def])
			expect(msgs.some((m) => m.includes('invalid elements'))).toBe(true)
		})

		it('flags when elements is an object instead of array', () => {
			const msgs = runCapture([validDef({ elements: {} as any })])
			expect(msgs.some((m) => m.includes('invalid elements'))).toBe(true)
		})

		it('flags an element with an unrecognised type', () => {
			const msgs = runCapture([validDef({ elements: [{ type: 'unknown' as any }] })])
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
			const msgs = runCapture([validDef({ elements: validTypes })])
			expect(msgs).toHaveLength(0)
		})

		it('flags an invalid type nested inside group children', () => {
			const nested: SomeButtonGraphicsElement = {
				type: 'group',
				children: [{ type: 'bad' } as any],
			}
			const msgs = runCapture([validDef({ elements: [nested] })])
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(true)
		})

		it('does not warn for valid types nested inside group children', () => {
			const nested: SomeButtonGraphicsElement = {
				type: 'group',
				children: [{ type: 'box' }],
			}
			const msgs = runCapture([validDef({ elements: [nested] })])
			expect(msgs).toHaveLength(0)
		})
	})

	describe('fully valid definition', () => {
		it('does not warn for a complete valid definition', () => {
			const msgs = runCapture([validDef()])
			expect(msgs).toHaveLength(0)
		})

		it('does not warn for multiple valid definitions', () => {
			const msgs = runCapture([validDef({ id: 'a' }), validDef({ id: 'b' }), validDef({ id: 'c' })])
			expect(msgs).toHaveLength(0)
		})
	})
})
