import { CompanionActionDefinitions, CompanionActionInfo } from './action'
import { CompanionFeedbackDefinitions } from './feedback'
import { CompanionPresetDefinitions } from './preset'
import { InstanceStatus, LogLevel } from './enums'
import { InstanceBaseShared } from '../instance-base'
import { CompanionVariableDefinition, CompanionVariableValue, CompanionVariableValues } from './variable'
import { OSCSomeArguments } from '../common/osc'
import { SomeCompanionConfigField } from './config'
import { CompanionHTTPRequest, CompanionHTTPResponse } from './http'
import { CompanionInstanceApi, InstanceBaseOptions } from '../internal-api'
import { LegacyFeedback, LegacyAction } from '../legacy-types'

export { InstanceBaseOptions }

export abstract class InstanceBase<TConfig> implements InstanceBaseShared<TConfig> {
	readonly #internalApi: CompanionInstanceApi<TConfig>

	public readonly id: string

	public get instanceOptions(): InstanceBaseOptions {
		return this.#internalApi.instanceOptions
	}

	/**
	 * Create an instance of the module
	 */
	constructor(internal: unknown) {
		const internalApi = internal as CompanionInstanceApi<TConfig>
		if (!internalApi || typeof internalApi.setInstance !== 'function')
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`
			)

		this.#internalApi = internalApi
		this.#internalApi.setInstance(this)

		this.id = internalApi.connectionId

		this.log('debug', 'Initializing')
	}

	/**
	 * Main initialization function called
	 * once the module is OK to start doing things.
	 */
	abstract init(config: TConfig, isFirstInit: boolean): Promise<void>

	/**
	 * Clean up the instance before it is destroyed.
	 */
	abstract destroy(): Promise<void>

	/**
	 * Called when the configuration is updated.
	 * @param config The new config object
	 */
	abstract configUpdated(config: TConfig): Promise<void>

	/**
	 * Save an updated configuration object
	 * @param newConfig The new config object
	 */
	saveConfig(newConfig: TConfig): void {
		this.#internalApi.saveConfig(newConfig)
	}

	/**
	 * Creates the configuration fields for web config
	 */
	abstract getConfigFields(): SomeCompanionConfigField[]

	/**
	 * Handle HTTP requests from Companion
	 * @param request partial request object from Express
	 */
	handleHttpRequest?(request: CompanionHTTPRequest): CompanionHTTPResponse | Promise<CompanionHTTPResponse>

	/**
	 * Handle request from Companion to start/stop recording actions
	 * @param isRecording whether recording is now running
	 */
	handleStartStopRecordActions?(isRecording: boolean): void

	/**
	 * Set the action definitions for this instance
	 * @param actions The action definitions
	 */
	setActionDefinitions(actions: CompanionActionDefinitions): void {
		this.#internalApi.actionManager.setActionDefinitions(actions)
	}

	/**
	 * Set the feedback definitions for this instance
	 * @param feedbacks The feedback definitions
	 */
	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions): void {
		this.#internalApi.feedbackManager.setFeedbackDefinitions(feedbacks)
	}

	/**
	 * Set the peset definitions for this instance
	 * @param presets The preset definitions
	 */
	setPresetDefinitions(presets: CompanionPresetDefinitions): void {
		this.#internalApi.setPresetDefinitions(presets)
	}

	/**
	 * Set the variable definitions for this instance
	 * @param variables The variable definitions
	 */
	setVariableDefinitions(variables: CompanionVariableDefinition[]): void {
		this.#internalApi.setVariableDefinitions(variables)
	}

	/**
	 * Set the values of some variables
	 * @param values The new values for the variables
	 */
	setVariableValues(values: CompanionVariableValues): void {
		this.#internalApi.setVariableValues(values)
	}

	/**
	 * Get the last set value of a variable from this connection
	 * @param variableId id of the variable
	 * @returns The value
	 */
	getVariableValue(variableId: string): CompanionVariableValue | undefined {
		return this.#internalApi.getVariableValue(variableId)
	}

	/**
	 * Parse and replace all the variables in a string
	 * Note: You must not use this for feedbacks, as your feedback will not update when the variable changes.
	 * There is an alternate version of this supplied to each of the action/feedback callbacks that tracks
	 * usages properly and will retrigger the feedback when the variables change.
	 * @param text The text to parse
	 * @returns The string with variables replaced with their values
	 */
	async parseVariablesInString(text: string): Promise<string> {
		return this.#internalApi.parseVariablesInString(text)
	}

	/**
	 * Request all feedbacks of the specified types to be checked for changes
	 * @param feedbackTypes The feedback types to check
	 */
	checkFeedbacks(...feedbackTypes: string[]): void {
		this.#internalApi.feedbackManager.checkFeedbacks(feedbackTypes)
	}

	/**
	 * Request the specified feedback instances to be checked for changes
	 * @param feedbackIds The ids of the feedback instances to check
	 */
	checkFeedbacksById(...feedbackIds: string[]): void {
		this.#internalApi.feedbackManager.checkFeedbacksById(feedbackIds)
	}

	/** @deprecated */
	_getAllActions(): LegacyAction[] {
		return this.#internalApi.actionManager._getAllActions()
	}

	/**
	 * Call subscribe on all currently known placed actions.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeActions(...actionIds: string[]): void {
		this.#internalApi.actionManager.subscribeActions(actionIds)
	}
	/**
	 * Call unsubscribe on all currently known placed actions.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeActions(...actionIds: string[]): void {
		this.#internalApi.actionManager.unsubscribeActions(actionIds)
	}

	/** @deprecated */
	_getAllFeedbacks(): LegacyFeedback[] {
		return this.#internalApi.feedbackManager._getAllFeedbacks()
	}

	/**
	 * Call subscribe on all currently known placed feedbacks.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param feedbackIds The feedbackIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeFeedbacks(...feedbackIds: string[]): void {
		this.#internalApi.feedbackManager.subscribeFeedbacks(feedbackIds)
	}
	/**
	 * Call unsubscribe on all currently known placed feedbacks.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param feedbackIds The feedbackIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeFeedbacks(...feedbackIds: string[]): void {
		this.#internalApi.feedbackManager.unsubscribeFeedbacks(feedbackIds)
	}

	/**
	 * Add an action to the current recording session
	 * @param action The action to be added to the recording session
	 * @param uniquenessId A unique id for the action being recorded. This should be different for each action, but by passing the same as a previous call will replace the previous value.
	 */
	recordAction(action: Omit<CompanionActionInfo, 'id' | 'controlId'>, uniquenessId?: string): void {
		this.#internalApi.recordAction(action, uniquenessId)
	}

	/**
	 * Experimental: This method may change without notice. Do not use!
	 * Set the value of a custom variable
	 * @param variableName
	 * @param value
	 * @returns Promise which resolves upon success, or rejects if the variable no longer exists
	 */
	setCustomVariableValue(variableName: string, value: CompanionVariableValue): void {
		this.#internalApi.setCustomVariableValue(variableName, value)
	}

	/**
	 * Send an osc message from the system osc sender
	 * @param host destination ip address
	 * @param port destination port number
	 * @param path message path
	 * @param args mesage arguments
	 */
	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void {
		this.#internalApi.oscSend(host, port, path, args)
	}

	/**
	 * Update the status of this connection
	 * @param status The status level
	 * @param message Additional information about the status
	 *
	 * ### Example
	 * ```js
	 * this.updateStatus(InstanceStatus.Ok)
	 * ```
	 */
	updateStatus(status: InstanceStatus, message?: string | null): void {
		this.#internalApi.updateStatus(status, message)
	}

	/**
	 * Write a line to the log
	 * @param level The level of the message
	 * @param message The message text to write
	 */
	log(level: LogLevel, message: string): void {
		this.#internalApi.log(level, message)
	}
}
