import type { SomeCompanionFeedbackInputField } from './feedback.js'
import type { SomeButtonGraphicsElement } from './graphics.js'

export interface CompanionGraphicsCompositeElementDefinition {
	id: string
	type: 'composite'

	/** Name to show in the elements list */
	name: string
	/**
	 * Alternate value to use when sorting the list of elements
	 * By default, the elements are ordered by the name field, but you can override this without altering the visible name by setting this value
	 */
	sortName?: string
	/** Additional description of the element */
	description?: string
	/** The input fields for the element */
	options: SomeCompanionFeedbackInputField[]

	/**
	 * The elements that make up this composite element
	 */
	elements: SomeButtonGraphicsElement[]
}
