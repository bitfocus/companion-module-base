import { describe, it, expect, afterEach, vi } from 'vitest'
import { validatePresetDefinitions } from '../presets.js'
import type { ActionManager } from '../actions.js'
import type { FeedbackManager } from '../feedback.js'
import type {
	CompanionActionDefinition,
	CompanionBooleanFeedbackDefinition,
	CompanionLayeredButtonPresetDefinition,
	CompanionOptionValues,
	CompanionPresetDefinition,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
	InstanceTypes,
	SomeButtonGraphicsElement,
} from '@companion-module/base'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal action definition with the given option ids */
function makeActionDef(...optionIds: string[]): CompanionActionDefinition {
	return {
		name: 'Action',
		options: optionIds.map((id) => ({ type: 'textinput' as const, id, label: id })),
		callback: vi.fn() as unknown as CompanionActionDefinition['callback'],
	}
}

/** Minimal boolean feedback definition with the given option ids */
function makeFeedbackDef(...optionIds: string[]): CompanionBooleanFeedbackDefinition<CompanionOptionValues> {
	return {
		type: 'boolean',
		name: 'Feedback',
		defaultStyle: {},
		options: optionIds.map((id) => ({ type: 'textinput' as const, id, label: id })),
		callback: vi.fn() as unknown as CompanionBooleanFeedbackDefinition<CompanionOptionValues>['callback'],
	}
}

function makeManagers(
	actions: Record<string, CompanionActionDefinition> = {},
	feedbacks: Record<string, CompanionBooleanFeedbackDefinition<CompanionOptionValues>> = {},
): { actionsManager: ActionManager; feedbacksManager: FeedbackManager } {
	return {
		actionsManager: {
			getDefinitionIds: () => Object.keys(actions),
			getDefinition: (id: string) => actions[id],
		} as unknown as ActionManager,
		feedbacksManager: {
			getDefinitionIds: () => Object.keys(feedbacks),
			getDefinition: (id: string) => feedbacks[id],
		} as unknown as FeedbackManager,
	}
}

const NO_STRUCTURE: CompanionPresetSection<InstanceTypes>[] = []

function run(
	presets: CompanionPresetDefinitions<InstanceTypes>,
	actions: Record<string, CompanionActionDefinition> = {},
	feedbacks: Record<string, CompanionBooleanFeedbackDefinition<CompanionOptionValues>> = {},
	structure: CompanionPresetSection<InstanceTypes>[] = NO_STRUCTURE,
): void {
	const { actionsManager, feedbacksManager } = makeManagers(actions, feedbacks)
	validatePresetDefinitions(actionsManager, feedbacksManager, structure, presets)
}

function validSimple(
	overrides: {
		name?: string
		feedbacks?: CompanionSimplePresetDefinition<InstanceTypes>['feedbacks']
		steps?: CompanionSimplePresetDefinition<InstanceTypes>['steps']
	} = {},
): CompanionSimplePresetDefinition<InstanceTypes> {
	return {
		type: 'simple',
		name: overrides.name ?? 'My Preset',
		style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
		feedbacks: overrides.feedbacks ?? [],
		steps: overrides.steps ?? [{ down: [], up: [] }],
	}
}

function validLayered(
	overrides: {
		name?: string
		elements?: CompanionLayeredButtonPresetDefinition<InstanceTypes>['elements']
		feedbacks?: CompanionLayeredButtonPresetDefinition<InstanceTypes>['feedbacks']
		steps?: CompanionLayeredButtonPresetDefinition<InstanceTypes>['steps']
	} = {},
): CompanionLayeredButtonPresetDefinition<InstanceTypes> {
	return {
		type: 'layered',
		name: overrides.name ?? 'My Layered Preset',
		// { type: 'box' } is the simplest valid element (all other fields are optional)
		elements: overrides.elements ?? [{ type: 'box', id: 'el1' }],
		feedbacks: overrides.feedbacks ?? [],
		steps: overrides.steps ?? [{ down: [], up: [] }],
	}
}

/** Build a section that directly references every given preset ID, suppressing cross-ref warnings. */
function structureFor(...ids: string[]): CompanionPresetSection<InstanceTypes>[] {
	return [{ id: 's1', name: 'Section', definitions: ids }]
}

// ---------------------------------------------------------------------------
// Logger capture
// ---------------------------------------------------------------------------

afterEach(() => {
	global.COMPANION_LOGGER = undefined
})

/** Returns all warn messages emitted during the call */
function runCapture(
	presets: CompanionPresetDefinitions<InstanceTypes>,
	actions: Record<string, CompanionActionDefinition> = {},
	feedbacks: Record<string, CompanionBooleanFeedbackDefinition<CompanionOptionValues>> = {},
	structure: CompanionPresetSection<InstanceTypes>[] = NO_STRUCTURE,
): string[] {
	const messages: string[] = []
	const prev = global.COMPANION_LOGGER
	global.COMPANION_LOGGER = (_source, level, message) => {
		if (level === 'warn') messages.push(message)
	}
	try {
		run(presets, actions, feedbacks, structure)
	} finally {
		global.COMPANION_LOGGER = prev
	}
	return messages
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validatePresetDefinitions', () => {
	describe('skipping', () => {
		it('does not warn for an empty preset map', () => {
			const msgs = runCapture({})
			expect(msgs).toHaveLength(0)
		})

		it('skips null/undefined preset entries silently (no errors/feedback/action warnings)', () => {
			// undefined entries are skipped but their key still appears in cross-ref; use matching structure
			const msgs = runCapture({ p1: undefined }, {}, {}, structureFor('p1'))
			expect(msgs.some((m) => m.includes('errors') || m.includes('feedback') || m.includes('action'))).toBe(false)
		})

		it('skips presets with an unrecognised type silently (no errors/feedback/action warnings)', () => {
			const unknown = {
				type: 'unknown',
				name: 'X',
				feedbacks: [],
				steps: [],
			} as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: unknown }, {}, {}, structureFor('p1'))
			expect(msgs.some((m) => m.includes('errors') || m.includes('feedback') || m.includes('action'))).toBe(false)
		})
	})

	describe('banned prop IDs', () => {
		it('flags a preset keyed on __proto__ (constructed via defineProperty)', () => {
			// Object literal syntax { __proto__: x } sets the prototype, not an own property,
			// so we must use defineProperty to create an enumerable own key named '__proto__'.
			const presets: CompanionPresetDefinitions<InstanceTypes> = {}
			Object.defineProperty(presets, '__proto__', {
				value: validSimple({ name: 'Evil' }),
				enumerable: true,
				configurable: true,
			})
			const msgs = runCapture(presets)
			expect(msgs.some((m) => m.includes('Evil') || m.includes('__proto__'))).toBe(true)
		})

		it('flags a preset keyed on constructor', () => {
			// 'constructor' is a valid string key in a Record type
			const presets: CompanionPresetDefinitions<InstanceTypes> = { constructor: validSimple({ name: 'Bad' }) }
			const msgs = runCapture(presets)
			expect(msgs.some((m) => m.includes('Bad') || m.includes('constructor'))).toBe(true)
		})
	})

	describe('simple preset — structural validation', () => {
		it('passes a fully valid simple preset without warnings', () => {
			const msgs = runCapture(
				{ p1: validSimple() },
				{ myAction: makeActionDef() },
				{ myFeedback: makeFeedbackDef() },
				structureFor('p1'),
			)
			expect(msgs).toHaveLength(0)
		})

		it('fails when steps is missing', () => {
			const bad = { ...validSimple(), steps: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('My Preset') && m.includes('errors'))).toBe(true)
		})

		it('fails when steps is not an array', () => {
			const bad = { ...validSimple(), steps: 'bad' } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when feedbacks is missing', () => {
			const bad = { ...validSimple(), feedbacks: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when style is missing', () => {
			const bad = { ...validSimple(), style: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when style is a non-object', () => {
			const bad = { ...validSimple(), style: 'bad' } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})
	})

	describe('simple preset — feedback ID validation', () => {
		it('warns when a feedback references an unknown feedback definition', () => {
			const msgs = runCapture({
				p1: validSimple({
					feedbacks: [{ feedbackId: 'missing', options: {} }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown feedback definitions') && m.includes('My Preset'))).toBe(true)
		})

		it('does not warn when a feedback references a known definition', () => {
			const msgs = runCapture(
				{ p1: validSimple({ feedbacks: [{ feedbackId: 'fb1', options: {} }] }) },
				{},
				{ fb1: makeFeedbackDef() },
			)
			expect(msgs.some((m) => m.includes('unknown feedback definitions'))).toBe(false)
		})
	})

	describe('simple preset — feedback option key validation', () => {
		it('warns when a feedback uses an option key not in the definition', () => {
			const msgs = runCapture(
				{ p1: validSimple({ feedbacks: [{ feedbackId: 'fb1', options: { unknownKey: 'val' } }] }) },
				{},
				{ fb1: makeFeedbackDef('validKey') },
			)
			expect(msgs.some((m) => m.includes('unknown feedback option keys') && m.includes('My Preset'))).toBe(true)
		})

		it('does not warn when feedback options only use declared keys', () => {
			const msgs = runCapture(
				{ p1: validSimple({ feedbacks: [{ feedbackId: 'fb1', options: { validKey: 'val' } }] }) },
				{},
				{ fb1: makeFeedbackDef('validKey') },
			)
			expect(msgs.some((m) => m.includes('unknown feedback option keys'))).toBe(false)
		})
	})

	describe('simple preset — action ID validation', () => {
		it('warns when a down action references an unknown action definition', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [{ actionId: 'missing', options: {} }], up: [] }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions') && m.includes('My Preset'))).toBe(true)
		})

		it('warns when an up action references an unknown action definition', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [], up: [{ actionId: 'nope', options: {} }] }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})

		it('warns when a rotate_left action is unknown', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [], up: [], rotate_left: [{ actionId: 'bad', options: {} }] }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})

		it('warns when a rotate_right action is unknown', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [], up: [], rotate_right: [{ actionId: 'bad', options: {} }] }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})

		it('warns when a numbered delay-group action (array form) is unknown', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [], up: [], 500: [{ actionId: 'missing', options: {} }] }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})

		it('warns when a numbered delay-group action (object form) is unknown', () => {
			const msgs = runCapture({
				p1: validSimple({
					steps: [{ down: [], up: [], 500: { actions: [{ actionId: 'missing', options: {} }] } }],
				}),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})

		it('does not warn when all actions are known', () => {
			const msgs = runCapture(
				{
					p1: validSimple({
						steps: [{ down: [{ actionId: 'act1', options: {} }], up: [] }],
					}),
				},
				{ act1: makeActionDef() },
			)
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(false)
		})
	})

	describe('simple preset — action option key validation', () => {
		it('warns when an action uses an option key not in the definition', () => {
			const msgs = runCapture(
				{
					p1: validSimple({
						steps: [{ down: [{ actionId: 'act1', options: { unknownKey: 'val' } }], up: [] }],
					}),
				},
				{ act1: makeActionDef('validKey') },
			)
			expect(msgs.some((m) => m.includes('unknown action option keys') && m.includes('My Preset'))).toBe(true)
		})

		it('does not warn when action options only use declared keys', () => {
			const msgs = runCapture(
				{
					p1: validSimple({
						steps: [{ down: [{ actionId: 'act1', options: { validKey: 'val' } }], up: [] }],
					}),
				},
				{ act1: makeActionDef('validKey') },
			)
			expect(msgs.some((m) => m.includes('unknown action option keys'))).toBe(false)
		})

		it('warns for a bad option key in a numbered delay group', () => {
			const msgs = runCapture(
				{
					p1: validSimple({
						steps: [{ down: [], up: [], 200: [{ actionId: 'act1', options: { bad: 'x' } }] }],
					}),
				},
				{ act1: makeActionDef('good') },
			)
			expect(msgs.some((m) => m.includes('unknown action option keys'))).toBe(true)
		})
	})

	describe('layered preset — structural validation', () => {
		it('passes a fully valid layered preset without warnings', () => {
			const msgs = runCapture({ p1: validLayered() }, {}, {}, structureFor('p1'))
			expect(msgs).toHaveLength(0)
		})

		it('fails when elements is missing', () => {
			const bad = { ...validLayered(), elements: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when elements is not an array', () => {
			const bad = { ...validLayered(), elements: 'bad' } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when steps is missing', () => {
			const bad = { ...validLayered(), steps: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})

		it('fails when feedbacks is missing', () => {
			const bad = { ...validLayered(), feedbacks: undefined } as unknown as CompanionPresetDefinition<InstanceTypes>
			const msgs = runCapture({ p1: bad })
			expect(msgs.some((m) => m.includes('errors'))).toBe(true)
		})
	})

	describe('layered preset — element type validation', () => {
		it('does not warn for all valid element types at top level', () => {
			// Cast required: ExpressionOrValue fields and composite.options can't be satisfied with bare literals;
			// this test exercises the runtime type validator, not TypeScript completeness.
			const elements = [
				{ type: 'text', text: '' },
				{ type: 'image', base64Image: null },
				{ type: 'box' },
				{ type: 'line' },
				{ type: 'circle' },
				{ type: 'composite', elementId: 'x', options: {} },
				{ type: 'group', children: [] },
			] as unknown as SomeButtonGraphicsElement[]
			const msgs = runCapture({ p1: validLayered({ elements }) })
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(false)
		})

		it('warns when an element has an unrecognised type', () => {
			// Deliberately invalid element type — cast required
			const elements = [{ type: 'rectangle' }] as unknown as SomeButtonGraphicsElement[]
			const msgs = runCapture({ p1: validLayered({ elements }) })
			expect(msgs.some((m) => m.includes('unrecognised types') && m.includes('My Layered Preset'))).toBe(true)
		})

		it('warns for an unrecognised type nested inside a group', () => {
			// Deliberately invalid child type — cast required
			const badChild = [{ type: 'bad_child' }] as unknown as SomeButtonGraphicsElement[]
			const msgs = runCapture({
				p1: validLayered({ elements: [{ type: 'group', children: badChild }] }),
			})
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(true)
		})

		it('does not warn for valid types nested inside a group', () => {
			// Cast required: ExpressionOrValue fields can't be satisfied with bare literals
			const children = [{ type: 'text', text: '' }, { type: 'box' }] as unknown as SomeButtonGraphicsElement[]
			const msgs = runCapture({
				p1: validLayered({
					elements: [{ type: 'group', children }],
				}),
			})
			expect(msgs.some((m) => m.includes('unrecognised types'))).toBe(false)
		})
	})

	describe('layered preset — style override element ID validation', () => {
		it('does not warn when styleOverride elementId matches a declared element', () => {
			const msgs = runCapture(
				{
					p1: validLayered({
						elements: [{ type: 'box', id: 'el1' }],
						feedbacks: [
							{
								feedbackId: 'fb1',
								options: {},
								styleOverrides: [
									{ elementId: 'el1', elementProperty: 'color', override: { isExpression: false as const, value: 0 } },
								],
							},
						],
					}),
				},
				{},
				{ fb1: makeFeedbackDef() },
			)
			expect(msgs.some((m) => m.includes('unknown element IDs'))).toBe(false)
		})

		it('warns when styleOverride elementId does not match any declared element', () => {
			const msgs = runCapture(
				{
					p1: validLayered({
						elements: [{ type: 'box', id: 'el1' }],
						feedbacks: [
							{
								feedbackId: 'fb1',
								options: {},
								styleOverrides: [
									{
										elementId: 'nonexistent',
										elementProperty: 'color',
										override: { isExpression: false as const, value: 0 },
									},
								],
							},
						],
					}),
				},
				{},
				{ fb1: makeFeedbackDef() },
			)
			expect(msgs.some((m) => m.includes('unknown element IDs') && m.includes('My Layered Preset'))).toBe(true)
		})

		it('resolves element IDs nested inside group children', () => {
			const msgs = runCapture(
				{
					p1: validLayered({
						elements: [{ type: 'group', children: [{ type: 'box', id: 'nested' }] }],
						feedbacks: [
							{
								feedbackId: 'fb1',
								options: {},
								styleOverrides: [
									{
										elementId: 'nested',
										elementProperty: 'color',
										override: { isExpression: false as const, value: 0 },
									},
								],
							},
						],
					}),
				},
				{},
				{ fb1: makeFeedbackDef() },
			)
			expect(msgs.some((m) => m.includes('unknown element IDs'))).toBe(false)
		})
	})

	describe('layered preset — feedback and action validation (same as simple)', () => {
		it('warns on unknown feedback ID in a layered preset', () => {
			const msgs = runCapture({
				p1: validLayered({ feedbacks: [{ feedbackId: 'missing', options: {}, styleOverrides: [] }] }),
			})
			expect(msgs.some((m) => m.includes('unknown feedback definitions'))).toBe(true)
		})

		it('warns on unknown action ID in a layered preset step', () => {
			const msgs = runCapture({
				p1: validLayered({ steps: [{ down: [{ actionId: 'gone', options: {} }], up: [] }] }),
			})
			expect(msgs.some((m) => m.includes('unknown action definitions'))).toBe(true)
		})
	})

	describe('cross-reference validation (structure ↔ presets)', () => {
		it('does not warn when all presets are referenced and all references resolve', () => {
			const msgs = runCapture({ p1: validSimple() }, {}, {}, [{ id: 's1', name: 'Section', definitions: ['p1'] }])
			expect(msgs.some((m) => m.includes('not referenced') || m.includes('do not exist'))).toBe(false)
		})

		it('warns when a preset exists but is not referenced by structure', () => {
			const msgs = runCapture({ p1: validSimple() }, {}, {}, [{ id: 's1', name: 'Section', definitions: [] }])
			expect(msgs.some((m) => m.includes('not referenced by structure') && m.includes('p1'))).toBe(true)
		})

		it('warns when structure references a preset ID that does not exist', () => {
			const msgs = runCapture({}, {}, {}, [{ id: 's1', name: 'Section', definitions: ['p1'] }])
			expect(msgs.some((m) => m.includes('do not exist in presets') && m.includes('p1'))).toBe(true)
		})

		it('does not warn "not referenced" for undefined preset entries', () => {
			const msgs = runCapture({ p1: undefined }, {}, {}, [{ id: 's1', name: 'Section', definitions: [] }])
			expect(msgs.some((m) => m.includes('not referenced by structure'))).toBe(false)
		})

		it('warns when structure references a key whose preset value is undefined', () => {
			const msgs = runCapture({ p1: undefined }, {}, {}, [{ id: 's1', name: 'Section', definitions: ['p1'] }])
			expect(msgs.some((m) => m.includes('do not exist in presets') && m.includes('p1'))).toBe(true)
		})

		it('resolves preset references inside simple groups', () => {
			const msgs = runCapture({ p1: validSimple() }, {}, {}, [
				{
					id: 's1',
					name: 'Section',
					definitions: [{ id: 'g1', type: 'simple', name: 'Group', presets: ['p1'] }],
				},
			])
			expect(msgs.some((m) => m.includes('not referenced by structure'))).toBe(false)
		})

		it('resolves preset references inside template groups', () => {
			const msgs = runCapture({ p1: validSimple() }, {}, {}, [
				{
					id: 's1',
					name: 'Section',
					definitions: [
						{
							id: 'g1',
							type: 'template',
							name: 'Template',
							presetId: 'p1',
							templateVariableName: 'v',
							templateValues: [],
						},
					],
				},
			])
			expect(msgs.some((m) => m.includes('not referenced by structure'))).toBe(false)
		})
	})

	describe('multiple presets', () => {
		it('reports all invalid presets in a single warning message', () => {
			const msgs = runCapture({
				p1: validSimple({ name: 'Alpha', feedbacks: [{ feedbackId: 'bad', options: {} }] }),
				p2: validSimple({ name: 'Beta', feedbacks: [{ feedbackId: 'bad', options: {} }] }),
			})
			const warn = msgs.find((m) => m.includes('unknown feedback definitions'))
			expect(warn).toBeDefined()
			expect(warn).toContain('Alpha')
			expect(warn).toContain('Beta')
		})
	})
})
