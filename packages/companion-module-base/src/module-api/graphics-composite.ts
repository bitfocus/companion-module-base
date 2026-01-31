import type { SomeCompanionFeedbackInputField } from './feedback.js'
import type { SomeButtonGraphicsElement } from './graphics.js'

export interface CompanionGraphicsCompositeElementDefinition {
	id: string
	type: 'composite'

	name: string
	description?: string
	options: SomeCompanionFeedbackInputField[]

	elements: SomeButtonGraphicsElement[]
}
