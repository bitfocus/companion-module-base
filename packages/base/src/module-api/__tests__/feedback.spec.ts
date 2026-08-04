import { describe, expect, test } from 'vitest'
import type { InstanceTypes } from '../base.js'
import type { CompanionFeedbackDefinitions } from '../feedback.js'

// @ts-expect-error `badValueFeedback` schema doesn't specify a `result`.
interface _TypesWithValueFeedbackMissingResult extends InstanceTypes {
	feedbacks: {
		badValueFeedback: {
			type: 'value'
			options: {
				x: number
				y: string
			}
		}
	}
}

interface Types extends InstanceTypes {
	feedbacks: {
		valueFeedback: {
			type: 'value'
			options: Record<never, never>
			result: string
		}
	}
}

const _defsWithImplicitlyBadValueCallback: CompanionFeedbackDefinitions<Types['feedbacks']> = {
	valueFeedback: {
		type: 'value',
		name: 'Value feedback',
		options: [],
		// @ts-expect-error Callback must return string
		callback: () => 42,
	},
}

const _defsWithExplicitlyBadValueCallback: CompanionFeedbackDefinitions<Types['feedbacks']> = {
	valueFeedback: {
		type: 'value',
		name: 'Value feedback',
		options: [],
		// @ts-expect-error Callback must return string
		callback: (): void => {},
	},
}

const _defsWithUnspecifiedIdenticalValueCallback: CompanionFeedbackDefinitions<Types['feedbacks']> = {
	valueFeedback: {
		type: 'value',
		name: 'Value feedback',
		options: [],
		callback: () => String(Math.random()),
	},
}

const _defsWithSpecifiedIdenticalValueCallback: CompanionFeedbackDefinitions<Types['feedbacks']> = {
	valueFeedback: {
		type: 'value',
		name: 'Value feedback',
		options: [],
		callback: (): string => String(Math.random()),
	},
}

const _defsWithImplicitSubsetValueCallback: CompanionFeedbackDefinitions<Types['feedbacks']> = {
	valueFeedback: {
		type: 'value',
		name: 'Value feedback',
		options: [],
		callback: () => 'one string to rule them all',
	},
}

describe('feedbacks', () => {
	test("dummy test so vitest doesn't complain about no test suite or tests", () => {
		expect(true).toBe(true)
	})
})
