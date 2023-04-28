import {
	CompanionPropertyDefinition,
	CompanionPropertyDefinitions,
	CompanionPropertyValue,
} from '../module-api/properties'
import { PropertySetMessage, SetPropertyDefinitionsMessage, UpdatePropertyValuesMessage } from '../host-api/api'
import { DropdownChoiceId, LogLevel } from '../module-api'
import debounceFn from 'debounce-fn'

interface PropertyCheckStatus {
	/** whether a recheck has been requested while it was being checked */
	needsRecheck: boolean

	// /** the variables that changed while this feedback was being checked  */
	// changedVariables: Set<string>
}
export class PropertyManager {
	readonly #updatePropertyValues: (msg: UpdatePropertyValuesMessage) => void
	readonly #setPropertyDefinitions: (msg: SetPropertyDefinitionsMessage) => void
	readonly #log: (level: LogLevel, message: string) => void

	readonly #propertyDefinitions = new Map<string, CompanionPropertyDefinition>()
	// readonly #actionInstances = new Map<string, ActionInstance>()

	// Property values waiting to be sent
	#pendingPropertyValues = new Map<string, UpdatePropertyValuesMessage['values'][0]>()
	// Properties currently being checked
	#propertiesBeingChecked = new Map<string, PropertyCheckStatus>()

	constructor(
		updatePropertyValues: (msg: UpdatePropertyValuesMessage) => void,
		setPropertyDefinitions: (msg: SetPropertyDefinitionsMessage) => void,
		log: (level: LogLevel, message: string) => void
	) {
		this.#updatePropertyValues = updatePropertyValues
		this.#setPropertyDefinitions = setPropertyDefinitions
		this.#log = log
	}

	async propertySet(msg: PropertySetMessage): Promise<void> {
		const propertyDefinition = this.#propertyDefinitions.get(msg.property.propertyId)
		if (!propertyDefinition) throw new Error(`Unknown property: ${msg.property.propertyId}`)
		if (!propertyDefinition.setValue) throw new Error(`Property is readonly: ${msg.property.propertyId}`)

		await propertyDefinition.setValue(msg.property.instanceId, msg.property.value, null)
	}

	#triggerCheckProperty(id: string) {
		const existingRecheck = this.#propertiesBeingChecked.get(id)
		if (existingRecheck) {
			// Already being checked
			existingRecheck.needsRecheck = true
			return
		}

		const propertyCheckStatus: PropertyCheckStatus = {
			needsRecheck: false,
			// changedVariables: new Set(),
		}
		// mark it as being checked
		this.#propertiesBeingChecked.set(id, propertyCheckStatus)

		Promise.resolve()
			.then(async () => {
				const definition = this.#propertyDefinitions.get(id)

				let values: Promise<CompanionPropertyValue | Record<DropdownChoiceId, CompanionPropertyValue> | undefined> =
					Promise.resolve(undefined)
				// const newReferencedVariables = new Set<string>()

				// Calculate the new value for the feedback
				if (definition && definition.getValues) {
					// Set this while the promise starts executing
					// this.#parseVariablesContext = `Feedback ${property.feedbackId} (${id})`

					// const context: CompanionFeedbackContext = {
					// 	parseVariablesInString: async (text: string): Promise<string> => {
					// 		const res = await this.#parseVariablesInString({
					// 			text: text,
					// 			controlId: property.controlId,
					// 			actionInstanceId: undefined,
					// 			feedbackInstanceId: id,
					// 		})

					// 		// Track which variables were referenced
					// 		if (res.variableIds && res.variableIds.length) {
					// 			for (const id of res.variableIds) {
					// 				newReferencedVariables.add(id)
					// 			}
					// 		}

					// 		return res.text
					// 	},
					// }

					values = definition.getValues(null)

					// this.#parseVariablesContext = undefined
				}

				// Await the value before looking at this.#pendingFeedbackValues, to avoid race conditions
				const resolvedValues = await values
				this.#pendingPropertyValues.set(id, {
					id: id,
					// controlId: property.controlId,
					value: resolvedValues,
				})
				this.#sendPropertyValues()

				// property.referencedVariables = newReferencedVariables.size > 0 ? Array.from(newReferencedVariables) : null
			})
			.catch((e) => {
				console.error(`Property check failed: ${JSON.stringify({})} - ${e?.message ?? e} ${e?.stack}`)
			})
			.finally(() => {
				// ensure this.#parseVariablesContext is cleared
				// this.#parseVariablesContext = undefined

				// it is no longer being checked
				this.#propertiesBeingChecked.delete(id)

				// Check if any variables changed that should cause an immediate recheck
				const recheckForVariableChanged = false
				// if (property.referencedVariables) {
				// 	for (const id of property.referencedVariables) {
				// 		if (feedbackCheckStatus.changedVariables.has(id)) {
				// 			recheckForVariableChanged = true
				// 			break
				// 		}
				// 	}
				// }

				// If queued, trigger a check
				if (recheckForVariableChanged || propertyCheckStatus.needsRecheck) {
					setImmediate(() => {
						this.#triggerCheckProperty(id)
					})
				}
			})
	}

	/**
	 * Send pending feedback values (from this.#pendingFeedbackValues) to companion, with a debounce
	 */
	#sendPropertyValues = debounceFn(
		(): void => {
			const newValues = this.#pendingPropertyValues
			this.#pendingPropertyValues = new Map()

			// Send the new values back
			if (newValues.size > 0) {
				this.#updatePropertyValues({
					values: Array.from(newValues.values()),
				})
			}
		},
		{
			wait: 5,
			maxWait: 25,
		}
	)

	setPropertyDefinitions(properties: CompanionPropertyDefinitions): void {
		const hostProperties: SetPropertyDefinitionsMessage['properties'] = []

		this.#propertyDefinitions.clear()

		for (const [propertyId, property] of Object.entries(properties)) {
			if (property) {
				hostProperties.push({
					id: propertyId,
					name: property.name,
					description: property.description,
					type: property.type,

					instanceIds: property.instanceIds ?? null,

					hasGetter: !!property.getValues,
					hasSetter: !!property.setValue,
				})

				// Remember the definition locally
				this.#propertyDefinitions.set(propertyId, property)
			}
		}

		this.#setPropertyDefinitions({ properties: hostProperties })
	}

	notifyPropertiesChanged(changes: Record<string, DropdownChoiceId[] | null>): void {
		for (const id of Object.keys(changes)) {
			this.#triggerCheckProperty(id)
		}
	}
}
