import type { StringKeys } from '../util.js'
import type { CompanionActionDefinitions } from './action.js'
import type { InstanceTypes } from './base.js'
import type { CompanionFeedbackDefinitions } from './feedback.js'
import type { CompanionGraphicsCompositeElementDefinitions } from './graphics-composite.js'
import type { CompanionVariableDefinitions } from './variable.js'

/**
 * Manage a set of definitions (actions, feedbacks, variables or composite elements) for this instance.
 *
 * Updates are batched before being sent to Companion, so it is fine to make multiple calls in a row.
 * If you are adding many definitions at once, it is still more efficient to pass them all in a single call.
 */
export interface CompanionDefinitionsApi<TDefinitions extends object> {
	/**
	 * Replace all of the definitions. Any existing definitions which are not included will be removed.
	 * @param definitions The complete set of definitions
	 */
	setAll(definitions: TDefinitions): void

	/**
	 * Add or replace some definitions, leaving any others untouched.
	 * A definition with a falsy value (eg `undefined`) will be removed.
	 * @param definitions The definitions to add or replace
	 */
	set(definitions: Partial<TDefinitions>): void

	/**
	 * Remove some definitions
	 * @param ids The ids of the definitions to remove
	 */
	remove(ids: StringKeys<TDefinitions>[]): void
}

/**
 * Manage the action definitions for this instance
 */
export type CompanionActionDefinitionsApi<TManifest extends InstanceTypes = InstanceTypes> = CompanionDefinitionsApi<
	CompanionActionDefinitions<TManifest['actions']>
>

/**
 * Manage the feedback definitions for this instance
 */
export type CompanionFeedbackDefinitionsApi<TManifest extends InstanceTypes = InstanceTypes> = CompanionDefinitionsApi<
	CompanionFeedbackDefinitions<TManifest['feedbacks']>
>

/**
 * Manage the variable definitions for this instance
 */
export type CompanionVariableDefinitionsApi<TManifest extends InstanceTypes = InstanceTypes> = CompanionDefinitionsApi<
	CompanionVariableDefinitions<TManifest['variables']>
>

/**
 * Manage the composite graphics element definitions for this instance
 */
export type CompanionCompositeElementDefinitionsApi<TManifest extends InstanceTypes = InstanceTypes> =
	CompanionDefinitionsApi<CompanionGraphicsCompositeElementDefinitions<TManifest['compositeElements']>>

/**
 * @internal
 */
export class CompanionDefinitionsApiImpl<TDefinitions extends object> implements CompanionDefinitionsApi<TDefinitions> {
	readonly #update: (definitions: Partial<TDefinitions>, replaceAll: boolean) => void

	constructor(update: (definitions: Partial<TDefinitions>, replaceAll: boolean) => void) {
		this.#update = update
	}

	setAll(definitions: TDefinitions): void {
		this.#update(definitions, true)
	}

	set(definitions: Partial<TDefinitions>): void {
		this.#update(definitions, false)
	}

	remove(ids: StringKeys<TDefinitions>[]): void {
		if (ids.length === 0) return

		const definitions: Partial<Record<string, undefined>> = {}
		for (const id of ids) {
			definitions[id] = undefined
		}
		this.#update(definitions as Partial<TDefinitions>, false)
	}
}
