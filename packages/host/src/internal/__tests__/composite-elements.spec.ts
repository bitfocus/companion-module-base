import { afterEach, describe, expect, it } from 'vitest'
import type {
	CompanionGraphicsCompositeElementDefinition,
	CompanionGraphicsCompositeElementDefinitions,
	SomeButtonGraphicsElement,
} from '@companion-module/base'
import { sanitiseCompositeElementDefinitions } from '../composite-elements.js'

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
// Logger capture + result
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
		sanitiseCompositeElementDefinitions(definitions)
	} finally {
		global.COMPANION_LOGGER = prev
	}
	return messages
}

function runSanitise(definitions: CompanionGraphicsCompositeElementDefinitions<any>): {
	result: CompanionGraphicsCompositeElementDefinitions<any>
	msgs: string[]
} {
	const msgs: string[] = []
	const prev = global.COMPANION_LOGGER
	global.COMPANION_LOGGER = (_source, level, message) => {
		if (level === 'warn') msgs.push(message)
	}
	let result: CompanionGraphicsCompositeElementDefinitions<any>
	try {
		result = sanitiseCompositeElementDefinitions(definitions)
	} finally {
		global.COMPANION_LOGGER = prev
	}
	return { result, msgs }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sanitiseCompositeElementDefinitions', () => {
	describe('skipping', () => {
		it('does not warn for an empty record', () => {
			const msgs = runCapture({})
			expect(msgs).toHaveLength(0)
		})

		it('warns and skips a null entry', () => {
			const msgs = runCapture({ myEl: null as unknown as CompanionGraphicsCompositeElementDefinition })
			expect(msgs.some((m) => m.includes('failed to validate'))).toBe(true)
		})

		it('warns and skips a false entry', () => {
			const msgs = runCapture({ myEl: false })
			expect(msgs.some((m) => m.includes('failed to validate'))).toBe(true)
		})

		it('warns and skips a string entry', () => {
			const msgs = runCapture({ myEl: 'bad' as unknown as CompanionGraphicsCompositeElementDefinition })
			expect(msgs.some((m) => m.includes('failed to validate'))).toBe(true)
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
			expect(msgs.some((m) => m.includes('failed to validate'))).toBe(true)
		})

		it('does not warn for all seven valid element types', () => {
			const validTypes: SomeButtonGraphicsElement[] = [
				{ type: 'group', children: [] },
				{ type: 'composite', elementId: 'x', options: {} },
				{ type: 'text', text: { isExpression: false, value: 'hello' } },
				{ type: 'image', base64Image: { isExpression: false, value: 'data:image/png;base64,...' } },
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
			expect(msgs.some((m) => m.includes('failed to validate'))).toBe(true)
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

	describe('return value', () => {
		it('returns an empty object for an empty input', () => {
			const { result } = runSanitise({})
			expect(result).toEqual({})
		})

		it('includes valid entries in the result', () => {
			const def = validDef()
			const { result } = runSanitise({ myEl: def })
			expect(result).toHaveProperty('myEl')
		})

		it('excludes invalid entries from the result', () => {
			const { result } = runSanitise({ myEl: null as unknown as CompanionGraphicsCompositeElementDefinition })
			expect(result).not.toHaveProperty('myEl')
		})

		it('excludes banned-id entries from the result', () => {
			const { result } = runSanitise({ constructor: validDef() })
			expect(result).not.toHaveProperty('constructor')
		})

		it('returns only valid entries when mixed with invalid ones', () => {
			const { result } = runSanitise({
				good: validDef(),
				bad: { type: 'composite', name: '' } as unknown as CompanionGraphicsCompositeElementDefinition,
			})
			expect(result).toHaveProperty('good')
			expect(result).not.toHaveProperty('bad')
		})

		it('strips unknown properties from returned data', () => {
			const def = { ...validDef(), unknownProp: 'should be stripped' }
			const { result } = runSanitise({ myEl: def })
			expect(result.myEl).not.toHaveProperty('unknownProp')
		})
	})
})
