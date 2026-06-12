import debounceFn from 'debounce-fn'
import semver from 'semver'
import {
	assertNever,
	createModuleLogger,
	type CompanionAdvancedFeedbackResult,
	type CompanionFeedbackCallbackContext,
	type CompanionFeedbackContext,
	type CompanionFeedbackDefinition,
	type CompanionFeedbackDefinitions,
	type CompanionFeedbackInfo,
	type CompanionFeedbackLearnContext,
	type CompanionOptionValues,
	type JsonValue,
} from '@companion-module/base'
import type { FeedbackInstance, HostFeedbackDefinition, HostFeedbackValue } from '../context.js'
import { BANNED_PROPS, hasAnyOldIsVisibleFunctions, hasAnyOldRequiredProperties } from './util.js'

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
	/** AbortController for the in-flight run; aborted when a recheck is queued, to let the callback bail early */
	abortController: AbortController
	/** When false, recheck requests will not abort this run, to guarantee forward progress (starvation guard) */
	abortable: boolean
}

interface FeedbackCheckInstance extends FeedbackInstance {
	/** The options the last time the feedback was run */
	previousOptions: CompanionOptionValues | null
}

export class FeedbackManager {
	readonly #logger = createModuleLogger('FeedbackManager')

	readonly #setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void
	readonly #updateFeedbackValues: (values: HostFeedbackValue[]) => void
	readonly #moduleApiVersion: string

	readonly #feedbackDefinitions = new Map<string, CompanionFeedbackDefinition>()
	readonly #feedbackInstances = new Map<string, FeedbackCheckInstance>()

	// Feedback values waiting to be sent
	#pendingFeedbackValues = new Map<string, HostFeedbackValue>()
	// Feedbacks currently being checked
	#feedbacksBeingChecked = new Map<string, FeedbackCheckStatus>()

	constructor(
		setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void,
		updateFeedbackValues: (values: HostFeedbackValue[]) => void,
		moduleApiVersion: string,
	) {
		this.#setFeedbackDefinitions = setFeedbackDefinitions
		this.#updateFeedbackValues = updateFeedbackValues
		this.#moduleApiVersion = moduleApiVersion
	}

	public getDefinitionIds(): string[] {
		return this.#feedbackDefinitions.keys().toArray()
	}

	public getDefinition(id: string): CompanionFeedbackDefinition | undefined {
		return this.#feedbackDefinitions.get(id)
	}

	public getInstanceIds(): string[] {
		return this.#feedbackInstances.keys().toArray()
	}

	public handleUpdateFeedbacks(feedbacks: Record<string, FeedbackInstance | null | undefined>): void {
		for (const [id, feedback] of Object.entries(feedbacks)) {
			if (BANNED_PROPS.has(id)) {
				this.#logger.warn(`Ignoring feedback instance with reserved id "${id}"`)
				continue
			}
			const existing = this.#feedbackInstances.get(id)
			if (existing && !feedback) {
				// The feedback is being removed; abort any in-progress check as its result is no longer wanted
				this.#abortFeedbackCheck(id)

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
		signal: AbortSignal,
	): Promise<{ options: CompanionOptionValues | undefined }> {
		const definition = this.#feedbackDefinitions.get(feedback.feedbackId)
		if (definition && definition.learn) {
			const context: CompanionFeedbackLearnContext = {
				type: 'feedback',
				signal,
			}

			if (signal.aborted) {
				// The learn was aborted, return undefined options as a signal of this
				return {
					options: undefined,
				}
			}

			try {
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

				if (signal.aborted) {
					// The learn was aborted, return undefined options as a signal of this
					return {
						options: undefined,
					}
				}

				return {
					options: newOptions,
				}
			} catch (e) {
				if (signal.aborted) {
					// The learn was aborted, return undefined options as a signal of this
					return {
						options: undefined,
					}
				} else {
					throw e
				}
			}
		} else {
			// Not supported
			return {
				options: undefined,
			}
		}
	}

	/**
	 * Abort any in-progress check for a feedback, because its result is no longer wanted
	 * (e.g. the feedback is being removed or unsubscribed). We don't wait for the run to settle.
	 * This ignores the `abortable` starvation guard, which only concerns rechecks.
	 */
	#abortFeedbackCheck(id: string): void {
		this.#feedbacksBeingChecked.get(id)?.abortController.abort()
	}

	#triggerCheckFeedback(id: string, abortable = true) {
		const existingRecheck = this.#feedbacksBeingChecked.get(id)
		if (existingRecheck) {
			// Already being checked
			existingRecheck.needsRecheck = true
			// Ask the in-flight run to abort, so a cooperative callback can bail early.
			// If the run is not abortable (starvation guard, see below), leave it to complete.
			if (existingRecheck.abortable) existingRecheck.abortController.abort()
			return
		}

		const feedback0 = this.#feedbackInstances.get(id)
		if (!feedback0) return

		const feedback = feedback0

		const abortController = new AbortController()
		const feedbackCheckStatus: FeedbackCheckStatus = {
			needsRecheck: false,
			abortController,
			abortable,
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
					const context: CompanionFeedbackCallbackContext = {
						type: 'feedback',
						signal: abortController.signal,
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
				// If the run was aborted, a recheck is already queued; swallow the error as the callback
				// bailing on abort is expected and its result is being discarded anyway.
				if (abortController.signal.aborted) return

				this.#logger.error(`Feedback check failed: ${JSON.stringify(feedback)} - ${e?.message ?? e} ${e?.stack}`)
			})
			.finally(() => {
				// it is no longer being checked
				this.#feedbacksBeingChecked.delete(id)

				// If queued, trigger a check
				if (feedbackCheckStatus.needsRecheck) {
					// Starvation guard: if this run was aborted, force the next run to run to completion
					// (non-abortable). Without this, a slow feedback rechecked faster than it completes
					// (e.g. a cooperative 2s callback aborted every 1s) would be aborted forever and never
					// emit a value. Forcing the next run to finish bounds the worst case to ~2 durations.
					const nextAbortable = !abortController.signal.aborted
					setImmediate(() => {
						this.#triggerCheckFeedback(id, nextAbortable)
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
		const definitionsMissingAffectedProperties: string[] = []

		const validModuleApiVersion = semver.valid(this.#moduleApiVersion, { loose: true })
		const checkAffectedProperties =
			validModuleApiVersion !== null && semver.gte(validModuleApiVersion, '2.1.0-0', { loose: true })

		for (const [feedbackId, feedback] of Object.entries(feedbacks)) {
			if (!feedback) continue
			if (BANNED_PROPS.has(feedbackId)) throw new Error(`Feedback id "${feedbackId}" is a reserved word`)
			if (feedbackId.startsWith('internal:'))
				throw new Error(`Feedback id "${feedbackId}" uses the reserved "internal:" prefix`)

			hostFeedbacks.push({
				id: feedbackId,
				name: feedback.name,
				sortName: feedback.sortName,
				description: feedback.description,
				options: feedback.options,
				type: feedback.type,
				defaultStyle: feedback.type === 'boolean' ? feedback.defaultStyle : undefined,
				affectedProperties: feedback.type === 'advanced' ? feedback.affectedProperties : undefined,
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
			if (checkAffectedProperties && feedback.type === 'advanced' && !Array.isArray(feedback.affectedProperties))
				definitionsMissingAffectedProperties.push(feedbackId)
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
		if (definitionsMissingAffectedProperties.length > 0) {
			this.#logger.warn(
				`The following advanced feedback definitions are missing an array for affectedProperties. This should be set to the list of style properties the feedback will affect: ${definitionsMissingAffectedProperties
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
			// Abort any in-progress check as its result is no longer wanted
			this.#abortFeedbackCheck(fb.id)

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
