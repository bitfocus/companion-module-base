import { describe, expect, it } from 'vitest'
import type { InstanceTypes } from '../../base.js'
import type { CompanionLayeredButtonPresetDefinition } from '../definition-graphics.js'
import type { CompanionSimplePresetDefinition } from '../definition.js'
import { INTERNAL_PRESET_MIN_API_VERSION } from '../internal-catalog.js'

// A concrete manifest so that the merged internal ids are surfaced precisely (rather than the loose
// string-index default). This exercises the type-level merge of internal:* schemas into presets.
interface TestManifest extends InstanceTypes {
	config: Record<string, never>
	secrets: undefined
	actions: { myAction: { options: { foo: string } } }
	feedbacks: {
		myFeedback: { type: 'boolean'; options: { bar: number } }
		myAdvanced: { type: 'advanced'; options: Record<string, never> }
	}
	variables: Record<string, never>
}

describe('internal preset catalog', () => {
	it('exposes a min api version for every catalog id', () => {
		// Spot-check a couple of ids and that all entries are valid semver-ish strings
		expect(INTERNAL_PRESET_MIN_API_VERSION['internal:wait']).toBe('2.1.0-0')
		expect(INTERNAL_PRESET_MIN_API_VERSION['internal:checkExpression']).toBe('2.1.0-0')
		for (const version of Object.values(INTERNAL_PRESET_MIN_API_VERSION)) {
			expect(typeof version).toBe('string')
		}
	})

	it('allows a preset to mix the module’s own and internal actions/feedbacks (type-level)', () => {
		const preset: CompanionSimplePresetDefinition<TestManifest> = {
			type: 'simple',
			name: 'Mixed',
			style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
			steps: [
				{
					down: [
						{ actionId: 'myAction', options: { foo: 'a' } },
						{ actionId: 'internal:wait', options: { time: 100 } },
						{ actionId: 'internal:customLog', options: { message: 'hi' } },
					],
					up: [],
				},
			],
			feedbacks: [
				{ feedbackId: 'myFeedback', options: { bar: 1 }, style: { color: 1 } },
				{ feedbackId: 'internal:checkExpression', options: { expression: '1 > 0' }, style: { bgcolor: 0xff0000 } },
			],
		}
		expect(preset.steps[0].down).toHaveLength(3)
	})

	it('rejects unknown internal ids and missing style on boolean internal feedbacks (type-level)', () => {
		const preset: CompanionSimplePresetDefinition<TestManifest> = {
			type: 'simple',
			name: 'Bad',
			style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
			steps: [
				{
					down: [
						// @ts-expect-error 'internal:nope' is not a known internal action id
						{ actionId: 'internal:nope', options: {} },
					],
					up: [],
				},
			],
			feedbacks: [
				// @ts-expect-error a boolean internal feedback must provide a style
				{ feedbackId: 'internal:checkExpression', options: { expression: '1 > 0' } },
			],
		}
		expect(preset.name).toBe('Bad')
	})
})

describe('internal preset building blocks', () => {
	it('nests logicIf with conditions, an actionGroup, and elseActions (type-level)', () => {
		const preset: CompanionSimplePresetDefinition<TestManifest> = {
			type: 'simple',
			name: 'If',
			style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
			steps: [
				{
					down: [
						{
							actionId: 'internal:logicIf',
							options: {},
							children: {
								condition: [
									{ feedbackId: 'internal:checkExpression', options: { expression: '1 > 0' } },
									// logicOperator used as a nested condition carries no style
									{
										feedbackId: 'internal:logicOperator',
										options: { operation: 'or' },
										children: { default: [{ feedbackId: 'myFeedback', options: { bar: 1 } }] },
									},
								],
								actions: [
									{
										actionId: 'internal:actionGroup',
										options: { executionMode: 'concurrent' },
										children: { default: [{ actionId: 'internal:wait', options: { time: 100 } }] },
									},
								],
								elseActions: [{ actionId: 'internal:customLog', options: { message: 'no' } }],
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		expect(preset.steps[0].down).toHaveLength(1)
	})

	it('allows logicWhile without the optional elseActions group, and logicOperator as a styled feedback (type-level)', () => {
		const preset: CompanionSimplePresetDefinition<TestManifest> = {
			type: 'simple',
			name: 'While',
			style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
			steps: [
				{
					down: [
						{
							actionId: 'internal:logicWhile',
							options: {},
							children: {
								condition: [{ feedbackId: 'internal:checkExpression', options: { expression: 'x' } }],
								actions: [{ actionId: 'internal:wait', options: { time: 10 } }],
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				// logicOperator as a top-level simple feedback carries a style
				{
					feedbackId: 'internal:logicOperator',
					options: { operation: 'and' },
					children: { default: [{ feedbackId: 'myFeedback', options: { bar: 1 } }] },
					style: { bgcolor: 0x00ff00 },
				},
			],
		}
		expect(preset.steps[0].down).toHaveLength(1)
	})

	it('rejects a non-boolean feedback used as a condition (type-level)', () => {
		const preset: CompanionSimplePresetDefinition<TestManifest> = {
			type: 'simple',
			name: 'BadCond',
			style: { text: '', size: 'auto', color: 0xffffff, bgcolor: 0 },
			steps: [
				{
					down: [
						{
							actionId: 'internal:logicIf',
							options: {},
							children: {
								condition: [
									// @ts-expect-error an advanced feedback cannot be used as a boolean condition
									{ feedbackId: 'myAdvanced', options: {} },
								],
								actions: [],
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		expect(preset.name).toBe('BadCond')
	})

	it('nests building blocks in a layered preset (logicOperator with styleOverrides) (type-level)', () => {
		const preset: CompanionLayeredButtonPresetDefinition<TestManifest> = {
			type: 'layered',
			name: 'Layered',
			elements: [{ type: 'box', id: 'el1' }],
			feedbacks: [
				{
					feedbackId: 'internal:logicOperator',
					options: { operation: 'xor' },
					children: { default: [{ feedbackId: 'internal:checkExpression', options: { expression: '1' } }] },
					styleOverrides: [],
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'internal:logicWhile',
							options: {},
							children: {
								condition: [{ feedbackId: 'myFeedback', options: { bar: 2 } }],
								actions: [{ actionId: 'internal:wait', options: { time: 5 } }],
							},
						},
					],
					up: [],
				},
			],
		}
		expect(preset.feedbacks).toHaveLength(1)
	})
})
