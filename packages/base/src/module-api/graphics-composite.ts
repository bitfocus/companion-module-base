import type { StringKeys } from '../util.js'
import type { SomeCompanionFeedbackInputField } from './feedback.js'
import type { SomeButtonGraphicsElement } from './graphics.js'
import type { CompanionOptionValues } from './index.js'

export type CompanionCompositeElementSchemas = Record<string, CompanionCompositeElementSchema<CompanionOptionValues>>

export interface CompanionCompositeElementSchema<TOptions extends CompanionOptionValues> {
	options: TOptions
}

export interface CompanionGraphicsCompositeElementDefinition<
	TSchema extends CompanionCompositeElementSchema<any> = CompanionCompositeElementSchema<any>,
> {
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
	options: SomeCompanionFeedbackInputField<StringKeys<TSchema['options']>>[]

	/**
	 * The elements that make up this composite element
	 */
	elements: SomeButtonGraphicsElement[]
}

/**
 * The definitions of a group of feedbacks
 */
export type CompanionGraphicsCompositeElementDefinitions<
	TSchemas extends CompanionCompositeElementSchemas | undefined = Record<
		string,
		CompanionCompositeElementSchema<CompanionOptionValues>
	>,
> = {
	[K in keyof Extract<TSchemas, CompanionCompositeElementSchemas>]:
		| CompanionGraphicsCompositeElementDefinition<Extract<TSchemas, CompanionCompositeElementSchemas>[K]>
		| false
		| undefined
}
