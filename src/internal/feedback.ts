import type {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackContext,
	CompanionFeedbackDefinition,
	CompanionFeedbackDefinitions,
	CompanionFeedbackInfo,
} from '../module-api/feedback.js'
import type {
	FeedbackInstance,
	LearnFeedbackMessage,
	LearnFeedbackResponseMessage,
	ParseVariablesInStringMessage,
	ParseVariablesInStringResponseMessage,
	SetFeedbackDefinitionsMessage,
	UpdateFeedbackValuesMessage,
} from '../host-api/api.js'
import { serializeIsVisibleFn } from './base.js'
// eslint-disable-next-line n/no-missing-import
import debounceFn from '../../lib/debounce-fn/index.js'
import type { LogLevel } from '../module-api/enums.js'
import { assertNever } from '../util.js'
import type { JsonValue } from '../common/json-value.js'

function convertFeedbackInstanceToEvent(
	type: 'boolean' | 'value' | 'advanced',
	feedback: FeedbackInstance,
): CompanionFeedbackInfo {
	return {
		type: type,
		id: feedback.id,
		feedbackId: feedback.feedbackId,
		controlId: feedback.controlId,
		options: feedback.options,
	}
}

interface FeedbackCheckStatus {
	/** whether a recheck has been requested while it was being checked */
	needsRecheck: boolean
}

export class FeedbackManager {
	readonly #parseVariablesInString: (
		msg: ParseVariablesInStringMessage,
	) => Promise<ParseVariablesInStringResponseMessage>
	readonly #updateFeedbackValues: (msg: UpdateFeedbackValuesMessage) => void
	readonly #setFeedbackDefinitions: (msg: SetFeedbackDefinitionsMessage) => void
	readonly #log: (level: LogLevel, message: string) => void

	readonly #feedbackDefinitions = new Map<string, CompanionFeedbackDefinition>()
	readonly #feedbackInstances = new Map<string, FeedbackInstance>()

	// Feedback values waiting to be sent
	#pendingFeedbackValues = new Map<string, UpdateFeedbackValuesMessage['values'][0]>()
	// Feedbacks currently being checked
	#feedbacksBeingChecked = new Map<string, FeedbackCheckStatus>()

	// while in a context which provides an alternate parseVariablesInString, we should log when the original is called
	#parseVariablesContext: string | undefined

	public get parseVariablesContext(): string | undefined {
		return this.#parseVariablesContext
	}

	constructor(
		parseVariablesInString: (msg: ParseVariablesInStringMessage) => Promise<ParseVariablesInStringResponseMessage>,
		updateFeedbackValues: (msg: UpdateFeedbackValuesMessage) => void,
		setFeedbackDefinitions: (msg: SetFeedbackDefinitionsMessage) => void,
		log: (level: LogLevel, message: string) => void,
	) {
		this.#parseVariablesInString = parseVariablesInString
		this.#updateFeedbackValues = updateFeedbackValues
		this.#setFeedbackDefinitions = setFeedbackDefinitions
		this.#log = log
	}

	public getDefinitionIds(): string[] {
		return Array.from(this.#feedbackDefinitions.keys())
	}
	public getInstanceIds(): string[] {
		return Array.from(this.#feedbackInstances.keys())
	}

	public handleUpdateFeedbacks(feedbacks: { [id: string]: FeedbackInstance | null | undefined }): void {
		for (const [id, feedback] of Object.entries(feedbacks)) {
			const existing = this.#feedbackInstances.get(id)
			if (existing && !feedback) {
				// Call unsubscribe
				const definition = this.#feedbackDefinitions.get(existing.feedbackId)
				if (definition?.unsubscribe) {
					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							// No-op, any values parsed here will not be stable
							return text
						},
					}

					Promise.resolve(
						definition.unsubscribe(convertFeedbackInstanceToEvent(definition.type, existing), context),
					).catch((e) => {
						this.#log(
							'error',
							`Feedback unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`,
						)
					})
				}
			}

			if (!feedback || feedback.disabled) {
				// Deleted
				this.#feedbackInstances.delete(id)
			} else {
				// TODO module-lib - deep freeze the feedback to avoid mutation?
				this.#feedbackInstances.set(id, { ...feedback })

				// Inserted
				if (!existing) {
					const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
					if (definition?.subscribe) {
						const context: CompanionFeedbackContext = {
							parseVariablesInString: async (text: string): Promise<string> => {
								// No-op, any values parsed here will not be stable
								return text
							},
						}

						Promise.resolve(
							definition.subscribe(convertFeedbackInstanceToEvent(definition.type, feedback), context),
						).catch((e) => {
							this.#log(
								'error',
								`Feedback subscribe failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`,
							)
						})
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
					const res = await this.#parseVariablesInString({
						text: text,
						controlId: msg.feedback.controlId,
						actionInstanceId: undefined,
						feedbackInstanceId: msg.feedback.id,
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

	#triggerCheckFeedback(id: string) {
		const existingRecheck = this.#feedbacksBeingChecked.get(id)
		if (existingRecheck) {
			// Already being checked
			existingRecheck.needsRecheck = true
			return
		}

		const feedback0 = this.#feedbackInstances.get(id)
		if (!feedback0) return

		const feedback = feedback0

		const feedbackCheckStatus: FeedbackCheckStatus = {
			needsRecheck: false,
		}
		// mark it as being checked
		this.#feedbacksBeingChecked.set(id, feedbackCheckStatus)

		Promise.resolve()
			.then(async () => {
				const definition = this.#feedbackDefinitions.get(feedback.feedbackId)

				let value:
					| JsonValue
					| Promise<JsonValue>
					| CompanionAdvancedFeedbackResult
					| Promise<CompanionAdvancedFeedbackResult>
					| undefined

				// Calculate the new value for the feedback
				if (definition) {
					// Set this while the promise starts executing
					this.#parseVariablesContext = `Feedback ${feedback.feedbackId} (${id})`

					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							const res = await this.#parseVariablesInString({
								text: text,
								controlId: feedback.controlId,
								actionInstanceId: undefined,
								feedbackInstanceId: id,
							})

							return res.text
						},
					}

					switch (definition.type) {
						case 'boolean':
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('boolean', feedback),
									type: 'boolean',
								},
								context,
							)
							break
						case 'value':
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('value', feedback),
									type: 'value',
								},
								context,
							)
							break
						case 'advanced':
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('advanced', feedback),
									type: 'advanced',
									image: feedback.image,
								},
								context,
							)
							break
						default:
							assertNever(definition)
							break
					}

					this.#parseVariablesContext = undefined
				}

				// Await the value before looking at this.#pendingFeedbackValues, to avoid race conditions
				const resolvedValue = await value
				this.#pendingFeedbackValues.set(id, {
					id: id,
					controlId: feedback.controlId,
					value: resolvedValue,
				})
				this.#sendFeedbackValues()
			})
			.catch((e) => {
				console.error(`Feedback check failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`)
			})
			.finally(() => {
				// ensure this.#parseVariablesContext is cleared
				this.#parseVariablesContext = undefined

				// it is no longer being checked
				this.#feedbacksBeingChecked.delete(id)

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
				this.#updateFeedbackValues({
					values: Array.from(newValues.values()),
				})
			}
		},
		{
			wait: 5,
			maxWait: 25,
		},
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
					defaultStyle: feedback.type === 'boolean' ? feedback.defaultStyle : undefined,
					hasLearn: !!feedback.learn,
					learnTimeout: feedback.learnTimeout,
					showInvert: feedback.type === 'boolean' ? feedback.showInvert : false,
				})

				// Remember the definition locally
				this.#feedbackDefinitions.set(feedbackId, feedback)
			}
		}

		this.#setFeedbackDefinitions({ feedbacks: hostFeedbacks })
	}

	checkFeedbacks(feedbackTypes: string[]): void {
		const types = new Set(feedbackTypes)
		for (const [id, feedback] of this.#feedbackInstances.entries()) {
			const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
			if (definition) {
				if (types.size === 0 || types.has(feedback.feedbackId)) {
					// update the feedback value
					this.#triggerCheckFeedback(id)
				}
			}
		}
	}

	checkFeedbacksById(feedbackIds: string[]): void {
		for (const id of feedbackIds) {
			// update the feedback value
			this.#triggerCheckFeedback(id)
		}
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
						// No-op, any values parsed here will not be stable
						return text
					},
				}

				Promise.resolve(def.subscribe(convertFeedbackInstanceToEvent(def.type, fb), context)).catch((e) => {
					this.#log('error', `Feedback subscribe failed: ${JSON.stringify(fb)} - ${e?.message ?? e} ${e?.stack}`)
				})
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
						// No-op, any values parsed here will not be stable
						return text
					},
				}

				Promise.resolve(def.unsubscribe(convertFeedbackInstanceToEvent(def.type, fb), context)).catch((e) => {
					this.#log('error', `Feedback unsubscribe failed: ${JSON.stringify(fb)} - ${e?.message ?? e} ${e?.stack}`)
				})
			}
		}
	}
}
