import {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackContext,
	CompanionFeedbackDefinition,
	CompanionFeedbackDefinitions,
	CompanionFeedbackInfo,
} from '../module-api/feedback'
import {
	FeedbackInstance,
	HostToModuleEventsV0,
	LearnFeedbackMessage,
	LearnFeedbackResponseMessage,
	ModuleToHostEventsV0,
	SetFeedbackDefinitionsMessage,
	UpdateFeedbackValuesMessage,
	VariablesChangedMessage,
} from '../host-api/api'
import { IpcWrapper } from '../host-api/ipc-wrapper'
import { serializeIsVisibleFn } from './base'
import debounceFn from 'debounce-fn'

function convertFeedbackInstanceToEvent(
	type: 'boolean' | 'advanced',
	feedback: FeedbackInstance
): CompanionFeedbackInfo {
	return {
		type: type,
		id: feedback.id,
		feedbackId: feedback.feedbackId,
		controlId: feedback.controlId,
		options: feedback.options,
	}
}

interface FeedbackInstanceExt extends FeedbackInstance {
	referencedVariables: string[] | null
}

interface FeedbackCheckStatus {
	// whether a recheck has been requested while it was being checked
	needsRecheck: boolean
}

export class FeedbackManager {
	readonly #ipcWrapper: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>

	readonly #feedbackDefinitions = new Map<string, CompanionFeedbackDefinition>()
	readonly #feedbackInstances = new Map<string, FeedbackInstanceExt>()

	// Feedback values waiting to be sent
	#pendingFeedbackValues = new Map<string, UpdateFeedbackValuesMessage['values'][0]>()
	// Feedbacks currently being checked
	#feedbacksBeingChecked = new Map<string, FeedbackCheckStatus>()

	// while in a context which provides an alternate parseVariablesInString, we should log when the original is called
	#parseVariablesContext: string | undefined

	public get parseVariablesContext(): string | undefined {
		return this.#parseVariablesContext
	}

	constructor(ipcWrapper: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>) {
		this.#ipcWrapper = ipcWrapper
	}

	public getDefinitionIds(): string[] {
		return Array.from(this.#feedbackDefinitions.keys())
	}
	public getInstanceIds(): string[] {
		return Array.from(this.#feedbackInstances.keys())
	}

	public async handleUpdateFeedbacks(feedbacks: { [id: string]: FeedbackInstance | null | undefined }) {
		for (const [id, feedback] of Object.entries(feedbacks)) {
			const existing = this.#feedbackInstances.get(id)
			if (existing) {
				// Call unsubscribe
				const definition = this.#feedbackDefinitions.get(existing.feedbackId)
				if (definition?.unsubscribe) {
					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
								text: text,
								controlId: existing.controlId,
								actionInstanceId: undefined,
								feedbackInstanceId: existing.id,
							})

							return res.text
						},
					}

					try {
						definition.unsubscribe(convertFeedbackInstanceToEvent(definition.type, existing), context)
					} catch (e: any) {
						console.error(`Feedback unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`)
					}
				}
			}

			if (!feedback || feedback.disabled) {
				// Deleted
				this.#feedbackInstances.delete(id)
			} else {
				// TODO module-lib - deep freeze the feedback to avoid mutation?
				this.#feedbackInstances.set(id, {
					...feedback,
					referencedVariables: null,
				})

				// Inserted or updated
				const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
				if (definition?.subscribe) {
					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
								text: text,
								controlId: feedback.controlId,
								actionInstanceId: undefined,
								feedbackInstanceId: feedback.id,
							})

							return res.text
						},
					}

					try {
						definition.subscribe(convertFeedbackInstanceToEvent(definition.type, feedback), context)
					} catch (e: any) {
						console.error(`Feedback subscribe failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`)
					}
				}

				// update the feedback value
				this.#triggerCheckFeedback(id)
			}
		}
	}

	public async handleLearnFeedback(msg: LearnFeedbackMessage): Promise<LearnFeedbackResponseMessage> {
		const definition = this.#feedbackDefinitions.get(msg.feedback.feedbackId)
		if (definition && definition.learn) {
			const context: CompanionFeedbackContext = {
				parseVariablesInString: async (text: string): Promise<string> => {
					const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
						text: text,
						// Don't report a source, as this call shouldn't be tracked
						controlId: undefined,
						actionInstanceId: undefined,
						feedbackInstanceId: undefined,
					})

					return res.text
				},
			}

			const newOptions = await definition.learn(
				{
					id: msg.feedback.id,
					feedbackId: msg.feedback.feedbackId,
					controlId: msg.feedback.controlId,
					options: msg.feedback.options,
					type: definition.type,
				},
				context
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

	public async handleVariablesChanged(msg: VariablesChangedMessage): Promise<void> {
		if (!msg.variablesIds.length) return

		const changedFeedbackIds = new Set(msg.variablesIds)

		// Determine the feedbacks that need checking
		const feedbackIds = new Set<string>()
		for (const feedback of this.#feedbackInstances.values()) {
			if (feedback.referencedVariables) {
				for (const id of feedback.referencedVariables) {
					if (changedFeedbackIds.has(id)) {
						feedbackIds.add(feedback.id)
						break
					}
				}
			}
		}

		// Trigger all the feedbacks to be rechecked
		for (const id of feedbackIds) {
			setImmediate(() => {
				this.#triggerCheckFeedback(id)
			})
		}
	}

	#triggerCheckFeedback(id: string) {
		const existingRecheck = this.#feedbacksBeingChecked.get(id)
		if (existingRecheck) {
			// Already being checked
			existingRecheck.needsRecheck = true
			return
		}

		const feedbackCheckStatus: FeedbackCheckStatus = {
			needsRecheck: false,
		}
		// mark it as being checked
		this.#feedbacksBeingChecked.set(id, feedbackCheckStatus)

		const feedback = this.#feedbackInstances.get(id)

		Promise.resolve()
			.then(async () => {
				if (feedback) {
					const definition = this.#feedbackDefinitions.get(feedback.feedbackId)

					let value:
						| boolean
						| Promise<boolean>
						| CompanionAdvancedFeedbackResult
						| Promise<CompanionAdvancedFeedbackResult>
						| undefined
					const newReferencedVariables = new Set<string>()

					// Calculate the new value for the feedback
					if (definition) {
						// Set this while the promise starts executing
						this.#parseVariablesContext = `Feedback ${feedback.feedbackId} (${id})`

						const context: CompanionFeedbackContext = {
							parseVariablesInString: async (text: string): Promise<string> => {
								const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
									text: text,
									controlId: feedback.controlId,
									actionInstanceId: undefined,
									feedbackInstanceId: id,
								})

								// Track which variables were referenced
								if (res.variableIds && res.variableIds.length) {
									for (const id of res.variableIds) {
										newReferencedVariables.add(id)
									}
								}

								return res.text
							},
						}
						if (definition.type === 'boolean') {
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('boolean', feedback),
									type: 'boolean',
									_rawBank: feedback.rawBank,
								},
								context
							)
						} else {
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('advanced', feedback),
									type: 'advanced',
									image: feedback.image,
									_page: feedback.page,
									_bank: feedback.bank,
									_rawBank: feedback.rawBank,
								},
								context
							)
						}

						this.#parseVariablesContext = undefined
					}

					this.#pendingFeedbackValues.set(id, {
						id: id,
						controlId: feedback.controlId,
						value: await value,
					})
					this.#sendFeedbackValues()

					feedback.referencedVariables = newReferencedVariables.size > 0 ? Array.from(newReferencedVariables) : null
				}
			})
			.catch((e) => {
				console.error(`Feedback check failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`)
			})
			.finally(() => {
				// ensure this.#parseVariablesContext is cleared
				this.#parseVariablesContext = undefined

				this.#feedbacksBeingChecked.delete(id)

				// TODO - also recheck if a variable referenced by the result has changed while it was executing

				// If queued, trigger a check
				if (feedbackCheckStatus.needsRecheck) {
					setImmediate(() => {
						this.#triggerCheckFeedback(id)
					})
				}
			})
	}

	/**
	 * Send pending feedback values (from this.#pendingFeedbackValues) to companion, with a debounce
	 */
	#sendFeedbackValues = debounceFn(
		(): void => {
			const newValues = this.#pendingFeedbackValues
			this.#pendingFeedbackValues = new Map()

			// Send the new values back
			if (newValues.size > 0) {
				this.#ipcWrapper.sendWithNoCb('updateFeedbackValues', {
					values: Array.from(newValues.values()),
				})
			}
		},
		{
			wait: 5,
			maxWait: 25,
		}
	)

	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions): void {
		const hostFeedbacks: SetFeedbackDefinitionsMessage['feedbacks'] = []

		this.#feedbackDefinitions.clear()

		for (const [feedbackId, feedback] of Object.entries(feedbacks)) {
			if (feedback) {
				hostFeedbacks.push({
					id: feedbackId,
					name: feedback.name,
					description: feedback.description,
					options: serializeIsVisibleFn(feedback.options),
					type: feedback.type,
					defaultStyle: 'defaultStyle' in feedback ? feedback.defaultStyle : undefined,
					hasLearn: !!feedback.learn,
				})

				// Remember the definition locally
				this.#feedbackDefinitions.set(feedbackId, feedback)
			}
		}

		this.#ipcWrapper.sendWithNoCb('setFeedbackDefinitions', { feedbacks: hostFeedbacks })
	}

	checkFeedbacks(feedbackTypes: string[]): void {
		const types = new Set(feedbackTypes)
		for (const [id, feedback] of this.#feedbackInstances.entries()) {
			const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
			if (definition) {
				if (types.size > 0 && !types.has(feedback.feedbackId)) {
					// Not to be considered
					continue
				}

				// update the feedback value
				this.#triggerCheckFeedback(id)
			}
		}
	}

	checkFeedbacksById(feedbackIds: string[]): void {
		for (const id of feedbackIds) {
			// update the feedback value
			this.#triggerCheckFeedback(id)
		}
	}

	/** @deprecated */
	_getAllFeedbacks() {
		return Array.from(this.#feedbackInstances.values()).map((fb) => ({
			id: fb.id,
			feedbackId: fb.feedbackId,
			controlId: fb.controlId,
			options: fb.options,
		}))
	}

	subscribeFeedbacks(feedbackIds: string[]): void {
		let feedbacks = Array.from(this.#feedbackInstances.values())

		const feedbackIdSet = new Set(feedbackIds)
		if (feedbackIdSet.size) feedbacks = feedbacks.filter((fb) => feedbackIdSet.has(fb.feedbackId))

		for (const fb of feedbacks) {
			const def = this.#feedbackDefinitions.get(fb.feedbackId)
			if (def?.subscribe) {
				const context: CompanionFeedbackContext = {
					parseVariablesInString: async (text: string): Promise<string> => {
						const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
							text: text,
							controlId: fb.controlId,
							actionInstanceId: undefined,
							feedbackInstanceId: fb.id,
						})

						return res.text
					},
				}

				def.subscribe(
					{
						type: def.type,
						id: fb.id,
						feedbackId: fb.feedbackId,
						controlId: fb.controlId,
						options: fb.options,
					},
					context
				)
			}
		}
	}

	unsubscribeFeedbacks(feedbackIds: string[]): void {
		let feedbacks = Array.from(this.#feedbackInstances.values())

		const feedbackIdSet = new Set(feedbackIds)
		if (feedbackIdSet.size) feedbacks = feedbacks.filter((fb) => feedbackIdSet.has(fb.feedbackId))

		for (const fb of feedbacks) {
			const def = this.#feedbackDefinitions.get(fb.feedbackId)
			if (def && def.unsubscribe) {
				const context: CompanionFeedbackContext = {
					parseVariablesInString: async (text: string): Promise<string> => {
						const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
							text: text,
							controlId: fb.controlId,
							actionInstanceId: undefined,
							feedbackInstanceId: fb.id,
						})

						return res.text
					},
				}

				def.unsubscribe(
					{
						type: def.type,
						id: fb.id,
						feedbackId: fb.feedbackId,
						controlId: fb.controlId,
						options: fb.options,
					},
					context
				)
			}
		}
	}
}
