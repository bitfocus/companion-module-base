import { describe, expect, it } from 'vitest'
import { inputFieldSchema } from '../options.js'

describe('dropdown choice visibility', () => {
	it.each(['dropdown', 'multidropdown'] as const)('preserves visibility expressions for %s', (type) => {
		const choice = { id: 'camera', label: 'Camera', isVisibleExpression: '$(options:scene) == "Live"' }
		const result = inputFieldSchema.parse({
			type,
			id: 'source',
			label: 'Source',
			choices: [choice, { id: 'other', label: 'Other' }],
			default: type === 'dropdown' ? 'camera' : ['camera'],
		})
		expect(result).toHaveProperty('choices', [choice, { id: 'other', label: 'Other' }])
	})
})
