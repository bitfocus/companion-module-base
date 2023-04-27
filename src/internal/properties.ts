import { CompanionPropertyDefinition, CompanionPropertyDefinitions } from '../module-api/properties'
import { PropertySetMessage, SetPropertyDefinitionsMessage } from '../host-api/api'
import { DropdownChoiceId, LogLevel } from '../module-api'

export class PropertyManager {
	readonly #setPropertyDefinitions: (msg: SetPropertyDefinitionsMessage) => void
	readonly #log: (level: LogLevel, message: string) => void

	readonly #propertyDefinitions = new Map<string, CompanionPropertyDefinition>()
	// readonly #actionInstances = new Map<string, ActionInstance>()

	constructor(
		setPropertyDefinitions: (msg: SetPropertyDefinitionsMessage) => void,
		log: (level: LogLevel, message: string) => void
	) {
		this.#setPropertyDefinitions = setPropertyDefinitions
		this.#log = log
	}

	async propertySet(msg: PropertySetMessage): Promise<void> {
		const propertyDefinition = this.#propertyDefinitions.get(msg.property.propertyId)
		if (!propertyDefinition) throw new Error(`Unknown property: ${msg.property.propertyId}`)
		if (!propertyDefinition.setValue) throw new Error(`Property is readonly: ${msg.property.propertyId}`)

		await propertyDefinition.setValue(msg.property.instanceId, msg.property.value, null)
	}

	// public handleUpdateActions(actions: { [id: string]: ActionInstance | null | undefined }): void {
	// 	for (const [id, action] of Object.entries(actions)) {
	// 		const existing = this.#actionInstances.get(id)
	// 		if (existing) {
	// 			// Call unsubscribe
	// 			const definition = this.#actionDefinitions.get(existing.actionId)
	// 			if (definition?.unsubscribe) {
	// 				const context: CompanionActionContext = {
	// 					parseVariablesInString: async (text: string): Promise<string> => {
	// 						const res = await this.#parseVariablesInString({
	// 							text: text,
	// 							controlId: existing.controlId,
	// 							actionInstanceId: existing.id,
	// 							feedbackInstanceId: undefined,
	// 						})

	// 						return res.text
	// 					},
	// 				}

	// 				Promise.resolve(definition.unsubscribe(convertActionInstanceToEvent(existing), context)).catch((e) => {
	// 					this.#log(
	// 						'error',
	// 						`Action unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`
	// 					)
	// 				})
	// 			}
	// 		}

	// 		if (!action || action.disabled) {
	// 			// Deleted
	// 			this.#actionInstances.delete(id)
	// 		} else {
	// 			// TODO module-lib - deep freeze the action to avoid mutation?
	// 			this.#actionInstances.set(id, action)

	// 			// Inserted or updated
	// 			const definition = this.#actionDefinitions.get(action.actionId)
	// 			if (definition?.subscribe) {
	// 				const context: CompanionFeedbackContext = {
	// 					parseVariablesInString: async (text: string): Promise<string> => {
	// 						const res = await this.#parseVariablesInString({
	// 							text: text,
	// 							controlId: action.controlId,
	// 							actionInstanceId: action.id,
	// 							feedbackInstanceId: undefined,
	// 						})

	// 						return res.text
	// 					},
	// 				}

	// 				Promise.resolve(definition.subscribe(convertActionInstanceToEvent(action), context)).catch((e) => {
	// 					this.#log('error', `Action subscribe failed: ${JSON.stringify(action)} - ${e?.message ?? e} ${e?.stack}`)
	// 				})
	// 			}
	// 		}
	// 	}
	// }

	// public async handleLearnAction(msg: LearnActionMessage): Promise<LearnActionResponseMessage> {
	// 	const definition = this.#actionDefinitions.get(msg.action.actionId)
	// 	if (definition && definition.learn) {
	// 		const context: CompanionFeedbackContext = {
	// 			parseVariablesInString: async (text: string): Promise<string> => {
	// 				const res = await this.#parseVariablesInString({
	// 					text: text,
	// 					controlId: msg.action.controlId,
	// 					actionInstanceId: msg.action.id,
	// 					feedbackInstanceId: undefined,
	// 				})

	// 				return res.text
	// 			},
	// 		}

	// 		const newOptions = await definition.learn(
	// 			{
	// 				id: msg.action.id,
	// 				actionId: msg.action.actionId,
	// 				controlId: msg.action.controlId,
	// 				options: msg.action.options,

	// 				surfaceId: undefined,

	// 				_deviceId: undefined,
	// 				_page: msg.action.page,
	// 				_bank: msg.action.bank,
	// 			},
	// 			context
	// 		)

	// 		return {
	// 			options: newOptions,
	// 		}
	// 	} else {
	// 		// Not supported
	// 		return {
	// 			options: undefined,
	// 		}
	// 	}
	// }

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

					hasGetter: !!property.getValue,
					hasSetter: !!property.setValue,
				})

				// Remember the definition locally
				this.#propertyDefinitions.set(propertyId, property)
			}
		}

		this.#setPropertyDefinitions({ properties: hostProperties })
	}

	notifyPropertiesChanged(changes: Record<string, DropdownChoiceId[] | null>): void {
		// TODO
	}

	// /** @deprecated */
	// _getAllActions(): Pick<ActionInstance, 'id' | 'actionId' | 'controlId' | 'options'>[] {
	// 	return Array.from(this.#actionInstances.values()).map((act) => ({
	// 		id: act.id,
	// 		actionId: act.actionId,
	// 		controlId: act.controlId,
	// 		options: act.options,
	// 	}))
	// }

	// subscribeActions(actionIds: string[]): void {
	// 	let actions = Array.from(this.#actionInstances.values())

	// 	const actionIdSet = new Set(actionIds)
	// 	if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

	// 	for (const act of actions) {
	// 		const def = this.#actionDefinitions.get(act.actionId)
	// 		if (def?.subscribe) {
	// 			const context: CompanionActionContext = {
	// 				parseVariablesInString: async (text: string): Promise<string> => {
	// 					const res = await this.#parseVariablesInString({
	// 						text: text,
	// 						controlId: act.controlId,
	// 						actionInstanceId: act.id,
	// 						feedbackInstanceId: undefined,
	// 					})

	// 					return res.text
	// 				},
	// 			}

	// 			Promise.resolve(def.subscribe(convertActionInstanceToEvent(act), context)).catch((e) => {
	// 				this.#log('error', `Action subscribe failed: ${JSON.stringify(act)} - ${e?.message ?? e} ${e?.stack}`)
	// 			})
	// 		}
	// 	}
	// }

	// unsubscribeActions(actionIds: string[]): void {
	// 	let actions = Array.from(this.#actionInstances.values())

	// 	const actionIdSet = new Set(actionIds)
	// 	if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

	// 	for (const act of actions) {
	// 		const def = this.#actionDefinitions.get(act.actionId)
	// 		if (def && def.unsubscribe) {
	// 			const context: CompanionActionContext = {
	// 				parseVariablesInString: async (text: string): Promise<string> => {
	// 					const res = await this.#parseVariablesInString({
	// 						text: text,
	// 						controlId: act.controlId,
	// 						actionInstanceId: act.id,
	// 						feedbackInstanceId: undefined,
	// 					})

	// 					return res.text
	// 				},
	// 			}

	// 			Promise.resolve(def.unsubscribe(convertActionInstanceToEvent(act), context)).catch((e) => {
	// 				this.#log('error', `Action unsubscribe failed: ${JSON.stringify(act)} - ${e?.message ?? e} ${e?.stack}`)
	// 			})
	// 		}
	// 	}
	// }
}
