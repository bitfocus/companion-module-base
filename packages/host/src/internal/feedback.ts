import {
	type CompanionAdvancedFeedbackResult,
	type CompanionFeedbackContext,
	type CompanionFeedbackDefinition,
	type CompanionFeedbackDefinitions,
	type CompanionFeedbackInfo,
	type CompanionOptionValues,
	type JsonValue,
	assertNever,
	createModuleLogger,
} from '@companion-module/base'
import debounceFn from 'debounce-fn'
import type { FeedbackInstance, HostFeedbackDefinition, HostFeedbackValue } from '../context.js'
import { hasAnyOldIsVisibleFunctions, hasAnyOldRequiredProperties } from './util.js'

function convertFeedbackInstanceToEvent(
	type: 'boolean' | 'value' | 'advanced',
	feedback: FeedbackCheckInstance,
	includePrevious: boolean,
): CompanionFeedbackInfo {
	return {
		type: type,
		id: feedback.id,
		feedbackId: feedback.feedbackId,
		controlId: feedback.controlId,
		options: feedback.options,
		previousOptions: includePrevious ? feedback.previousOptions : null,
	}
}

interface FeedbackCheckStatus {
	/** whether a recheck has been requested while it was being checked */
	needsRecheck: boolean
}

interface FeedbackCheckInstance extends FeedbackInstance {
	/** The options the last time the feedback was run */
	previousOptions: CompanionOptionValues | null
}

export class FeedbackManager {
	readonly #logger = createModuleLogger('FeedbackManager')

	readonly #setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void
	readonly #updateFeedbackValues: (values: HostFeedbackValue[]) => void

	readonly #feedbackDefinitions = new Map<string, CompanionFeedbackDefinition>()
	readonly #feedbackInstances = new Map<string, FeedbackCheckInstance>()

	// Feedback values waiting to be sent
	#pendingFeedbackValues = new Map<string, HostFeedbackValue>()
	// Feedbacks currently being checked
	#feedbacksBeingChecked = new Map<string, FeedbackCheckStatus>()

	constructor(
		setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void,
		updateFeedbackValues: (values: HostFeedbackValue[]) => void,
	) {
		this.#setFeedbackDefinitions = setFeedbackDefinitions
		this.#updateFeedbackValues = updateFeedbackValues
	}

	public getDefinitionIds(): string[] {
		return this.#feedbackDefinitions.keys().toArray()
	}
	public getInstanceIds(): string[] {
		return this.#feedbackInstances.keys().toArray()
	}

	public handleUpdateFeedbacks(feedbacks: Record<string, FeedbackInstance | null | undefined>): void {
		for (const [id, feedback] of Object.entries(feedbacks)) {
			const existing = this.#feedbackInstances.get(id)
			if (existing && !feedback) {
				// Call unsubscribe
				const definition = this.#feedbackDefinitions.get(existing.feedbackId)
				if (definition?.unsubscribe) {
					const context: CompanionFeedbackContext = {
						type: 'feedback',
					}

					Promise.resolve(
						definition.unsubscribe(convertFeedbackInstanceToEvent(definition.type, existing, false), context),
					).catch((e) => {
						this.#logger.error(
							`Feedback unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`,
						)
					})
				}
			}

			if (!feedback) {
				// Deleted
				this.#feedbackInstances.delete(id)
			} else {
				// TODO module-lib - deep freeze the feedback to avoid mutation?
				this.#feedbackInstances.set(id, {
					...feedback,

					// Preserve previous options, if they exist
					previousOptions: existing?.options ?? null,
				})

				// update the feedback value
				this.#triggerCheckFeedback(id)
			}
		}
	}

	public async handleLearnFeedback(
		feedback: FeedbackInstance,
	): Promise<{ options: CompanionOptionValues | undefined }> {
		const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
		if (definition && definition.learn) {
			const context: CompanionFeedbackContext = {
				type: 'feedback',
			}

			const newOptions = await definition.learn(
				{
					id: feedback.id,
					feedbackId: feedback.feedbackId,
					controlId: feedback.controlId,
					options: feedback.options,
					previousOptions: null,
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
					const context: CompanionFeedbackContext = {
						type: 'feedback',
					}

					switch (definition.type) {
						case 'boolean':
							value = definition.callback(convertFeedbackInstanceToEvent('boolean', feedback, true), context)
							break
						case 'value':
							value = definition.callback(convertFeedbackInstanceToEvent('value', feedback, true), context)
							break
						case 'advanced':
							value = definition.callback(
								{
									...convertFeedbackInstanceToEvent('advanced', feedback, true),
									image: feedback.image,
								},
								context,
							)
							break
						default:
							assertNever(definition)
							break
					}
				}

				// Await the value before looking at this.#pendingFeedbackValues, to avoid race conditions
				const resolvedValue = await value

				if (
					definition?.type === 'advanced' &&
					resolvedValue &&
					typeof resolvedValue === 'object' &&
					'imageBuffer' in resolvedValue &&
					(resolvedValue.imageBuffer as any) instanceof Uint8Array
				) {
					// Backwards compatibility fixup, ensure the imageBuffer is a string
					resolvedValue.imageBuffer = Buffer.from(resolvedValue.imageBuffer as any).toString('base64')
				}

				this.#pendingFeedbackValues.set(id, {
					id: id,
					controlId: feedback.controlId,
					feedbackType: definition?.type,
					value: resolvedValue,
				})
				this.#sendFeedbackValues()
			})
			.catch((e) => {
				this.#logger.error(`Feedback check failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`)
			})
			.finally(() => {
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
				this.#updateFeedbackValues(newValues.values().toArray())
			}
		},
		{
			wait: 5,
			maxWait: 25,
		},
	)

	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions): void {
		const hostFeedbacks: HostFeedbackDefinition[] = []

		this.#feedbackDefinitions.clear()

		const definitionsWithSubscribeMethod: string[] = []
		const definitionsWithOldIsVisible: string[] = []
		const definitionsWithOldRequiredProperties: string[] = []
		const definitionSubscriptionMentionsChangeStyle: string[] = []

		for (const [feedbackId, feedback] of Object.entries(feedbacks)) {
			if (!feedback) continue

			hostFeedbacks.push({
				id: feedbackId,
				name: feedback.name,
				sortName: feedback.sortName,
				description: feedback.description,
				options: feedback.options,
				type: feedback.type,
				defaultStyle: feedback.type === 'boolean' ? feedback.defaultStyle : undefined,
				hasLearn: !!feedback.learn,
				learnTimeout: feedback.learnTimeout,
				showInvert: feedback.type === 'boolean' ? feedback.showInvert : false,
			})

			// Remember the definition locally
			this.#feedbackDefinitions.set(feedbackId, feedback)

			// Check for old subscribe method
			if ('subscribe' in feedback && typeof feedback.subscribe === 'function')
				definitionsWithSubscribeMethod.push(feedbackId)
			if (hasAnyOldIsVisibleFunctions(feedback.options)) definitionsWithOldIsVisible.push(feedbackId)
			if (hasAnyOldRequiredProperties(feedback.options)) definitionsWithOldRequiredProperties.push(feedbackId)
			if (typeof feedback.description === 'string' && feedback.description.match(/change style/))
				definitionSubscriptionMentionsChangeStyle.push(feedbackId)
		}

		this.#setFeedbackDefinitions(hostFeedbacks)

		if (definitionsWithSubscribeMethod.length > 0) {
			this.#logger.warn(
				`The following feedback definitions have a subscribe method, which is no longer supported: ${definitionsWithSubscribeMethod
					.sort()
					.join(', ')}`,
			)
		}
		if (definitionsWithOldIsVisible.length > 0) {
			this.#logger.warn(
				`The following feedback definitions have options with the old isVisible functions. These should be replaced with isVisibleExpression to continue to operate. The definitions: ${definitionsWithOldIsVisible
					.sort()
					.join(', ')}`,
			)
		}
		if (definitionsWithOldRequiredProperties.length > 0) {
			this.#logger.warn(
				`The following feedback definitions have options with the old required properties. These should be replaced with requiredExpression to continue to operate. The definitions: ${definitionsWithOldRequiredProperties
					.sort()
					.join(', ')}`,
			)
		}
		if (definitionSubscriptionMentionsChangeStyle.length > 0) {
			this.#logger.warn(
				`The following feedback definitions have a description that mentions 'change style'. Feedbacks no longer only affect style, making this misleading. The definitions: ${definitionSubscriptionMentionsChangeStyle
					.sort()
					.join(', ')}`,
			)
		}
	}

	checkFeedbacks(feedbackTypes: string[] | null): void {
		if (feedbackTypes) {
			feedbackTypes = feedbackTypes.filter((t) => !!t)
			if (feedbackTypes.length === 0) {
				this.#logger.error(
					'checkFeedbacks cannot be called without any feedback types. This is not allowed, at least one feedback type must be provided',
				)
				return
			}
		}

		const types = feedbackTypes ? new Set(feedbackTypes) : new Set()
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

	unsubscribeFeedbacks(feedbackIds: string[]): void {
		let feedbacks = this.#feedbackInstances.values().toArray()

		const feedbackIdSet = new Set(feedbackIds)
		if (feedbackIdSet.size) feedbacks = feedbacks.filter((fb) => feedbackIdSet.has(fb.feedbackId))

		for (const fb of feedbacks) {
			const def = this.#feedbackDefinitions.get(fb.feedbackId)
			if (def && def.unsubscribe) {
				const context: CompanionFeedbackContext = {
					type: 'feedback',
				}

				Promise.resolve(def.unsubscribe(convertFeedbackInstanceToEvent(def.type, fb, false), context)).catch((e) => {
					this.#logger.error(`Feedback unsubscribe failed: ${JSON.stringify(fb)} - ${e?.message ?? e} ${e?.stack}`)
				})
			}
		}
	}
}
