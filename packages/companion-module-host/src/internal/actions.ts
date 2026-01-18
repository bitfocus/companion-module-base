import {
	type CompanionActionContext,
	type CompanionActionDefinition,
	type CompanionActionDefinitions,
	type CompanionActionInfo,
	type CompanionOptionValues,
	type CompanionVariableValue,
	createModuleLogger,
} from '@companion-module/base'
import type { ActionInstance, HostActionDefinition } from '../context.js'
import { ExecuteActionResult } from '../instance.js'

function convertActionInstanceToEvent(action: ActionInstance): CompanionActionInfo {
	return {
		id: action.id,
		actionId: action.actionId,
		controlId: action.controlId,
		options: action.options,
	}
}

export class ActionManager {
	readonly #logger = createModuleLogger('ActionManager')

	readonly #setActionDefinitions: (actions: HostActionDefinition[]) => void
	readonly #setCustomVariableValue: (
		controlId: string,
		variableId: string,
		value: CompanionVariableValue | undefined,
	) => void

	readonly #actionDefinitions = new Map<string, CompanionActionDefinition>()
	readonly #actionInstances = new Map<string, ActionInstance>()

	constructor(
		setActionDefinitions: (msg: HostActionDefinition[]) => void,
		setCustomVariableValue: (controlId: string, variableId: string, value: CompanionVariableValue | undefined) => void,
	) {
		this.#setActionDefinitions = setActionDefinitions
		this.#setCustomVariableValue = setCustomVariableValue
	}

	public async handleExecuteAction(
		action: ActionInstance,
		surfaceId: string | undefined,
	): Promise<ExecuteActionResult> {
		const actionDefinition = this.#actionDefinitions.get(action.actionId)
		if (!actionDefinition) {
			return {
				success: false,
				errorMessage: `Action definition not found for: ${action.actionId}`,
			}
		}

		const context: CompanionActionContext = {
			type: 'action',
			setCustomVariableValue: (variableName: string, value: CompanionVariableValue) => {
				this.#setCustomVariableValue(action.controlId, variableName, value)
			},
		}

		try {
			await actionDefinition.callback(
				{
					id: action.id,
					actionId: action.actionId,
					controlId: action.controlId,
					options: action.options,

					surfaceId: surfaceId,
				},
				context,
			)

			return {
				success: true,
				errorMessage: undefined,
			}
		} catch (e: any) {
			return {
				success: false,
				errorMessage: e?.message ?? String(e),
			}
		}
	}

	public handleUpdateActions(actions: Record<string, ActionInstance | null | undefined>): void {
		for (const [id, action] of Object.entries(actions)) {
			const existing = this.#actionInstances.get(id)
			if (existing) {
				// Call unsubscribe
				const definition = this.#actionDefinitions.get(existing.actionId)
				if (definition?.unsubscribe && !definition.skipUnsubscribeOnOptionsChange) {
					const context: CompanionActionContext = {
						type: 'action',
						setCustomVariableValue: () => {
							throw new Error(`setCustomVariableValue is not available during unsubscribe`)
						},
					}

					Promise.resolve(definition.unsubscribe(convertActionInstanceToEvent(existing), context)).catch((e) => {
						this.#logger.error(
							`Action unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`,
						)
					})
				}
			}

			if (!action || action.disabled) {
				// Deleted
				this.#actionInstances.delete(id)
			} else {
				// TODO module-lib - deep freeze the action to avoid mutation?
				this.#actionInstances.set(id, action)

				// Inserted or updated
				const definition = this.#actionDefinitions.get(action.actionId)
				if (definition?.subscribe) {
					const context: CompanionActionContext = {
						type: 'action',
						setCustomVariableValue: () => {
							throw new Error(`setCustomVariableValue is not available during subscribe`)
						},
					}

					Promise.resolve(definition.subscribe(convertActionInstanceToEvent(action), context)).catch((e) => {
						this.#logger.error(`Action subscribe failed: ${JSON.stringify(action)} - ${e?.message ?? e} ${e?.stack}`)
					})
				}
			}
		}
	}

	public async handleLearnAction(action: ActionInstance): Promise<{ options: CompanionOptionValues | undefined }> {
		const definition = this.#actionDefinitions.get(action.actionId)
		if (definition && definition.learn) {
			const context: CompanionActionContext = {
				type: 'action',
				setCustomVariableValue: () => {
					throw new Error(`setCustomVariableValue is not available during learn`)
				},
			}

			const newOptions = await definition.learn(
				{
					id: action.id,
					actionId: action.actionId,
					controlId: action.controlId,
					options: action.options,

					surfaceId: undefined,
				},
				context,
			)

			return {
				options: newOptions,
			}
		} else {
			// Not supported
			return {
				options: undefined,
			}
		}
	}

	setActionDefinitions(actions: CompanionActionDefinitions): void {
		const hostActions: HostActionDefinition[] = []

		this.#actionDefinitions.clear()

		for (const [actionId, action] of Object.entries(actions)) {
			if (action) {
				hostActions.push({
					id: actionId,
					name: action.name,
					description: action.description,
					options: action.options,
					optionsToIgnoreForSubscribe: action.optionsToIgnoreForSubscribe,
					hasLearn: !!action.learn,
					learnTimeout: action.learnTimeout,
					hasLifecycleFunctions: !!action.subscribe || !!action.unsubscribe,
				})

				// Remember the definition locally
				this.#actionDefinitions.set(actionId, action)
			}
		}

		this.#setActionDefinitions(hostActions)
	}

	subscribeActions(actionIds: string[]): void {
		let actions = Array.from(this.#actionInstances.values())

		const actionIdSet = new Set(actionIds)
		if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

		for (const act of actions) {
			const def = this.#actionDefinitions.get(act.actionId)
			if (def?.subscribe) {
				const context: CompanionActionContext = {
					type: 'action',
					setCustomVariableValue: () => {
						throw new Error(`setCustomVariableValue is not available during subscribe`)
					},
				}

				Promise.resolve(def.subscribe(convertActionInstanceToEvent(act), context)).catch((e) => {
					this.#logger.error(`Action subscribe failed: ${JSON.stringify(act)} - ${e?.message ?? e} ${e?.stack}`)
				})
			}
		}
	}

	unsubscribeActions(actionIds: string[]): void {
		let actions = Array.from(this.#actionInstances.values())

		const actionIdSet = new Set(actionIds)
		if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

		for (const act of actions) {
			const def = this.#actionDefinitions.get(act.actionId)
			if (def && def.unsubscribe) {
				const context: CompanionActionContext = {
					type: 'action',
					setCustomVariableValue: () => {
						throw new Error(`setCustomVariableValue is not available during unsubscribe`)
					},
				}

				Promise.resolve(def.unsubscribe(convertActionInstanceToEvent(act), context)).catch((e) => {
					this.#logger.error(`Action unsubscribe failed: ${JSON.stringify(act)} - ${e?.message ?? e} ${e?.stack}`)
				})
			}
		}
	}
}
