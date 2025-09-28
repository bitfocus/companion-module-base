import type { CompanionActionDefinitions, CompanionRecordedAction } from './action.js'
import type { CompanionFeedbackDefinitions } from './feedback.js'
import type { CompanionPresetDefinitions } from './preset.js'
import type { InstanceStatus, LogLevel } from './enums.js'
import type {
	ExecuteActionMessage,
	GetConfigFieldsMessage,
	GetConfigFieldsResponseMessage,
	HandleHttpRequestMessage,
	HandleHttpRequestResponseMessage,
	HostToModuleEventsV0,
	InitMessage,
	InitResponseMessage,
	LearnActionMessage,
	LearnActionResponseMessage,
	LearnFeedbackMessage,
	LearnFeedbackResponseMessage,
	LogMessageMessage,
	ModuleToHostEventsV0,
	ParseVariablesInStringMessage,
	ParseVariablesInStringResponseMessage,
	SendOscMessage,
	SetPresetDefinitionsMessage,
	SetStatusMessage,
	SetVariableDefinitionsMessage,
	SetVariableValuesMessage,
	SharedUdpSocketError,
	SharedUdpSocketMessage,
	StartStopRecordActionsMessage,
	UpdateActionInstancesMessage,
	UpdateConfigAndLabelMessage,
	UpdateFeedbackInstancesMessage,
	UpgradeActionAndFeedbackInstancesMessage,
	UpgradeActionAndFeedbackInstancesResponse,
} from '../host-api/api.js'
import { literal } from '../util.js'
import type { InstanceBaseShared } from '../instance-base.js'
// eslint-disable-next-line n/no-missing-import
import PQueue from 'p-queue'
import type { CompanionVariableDefinition, CompanionVariableValue, CompanionVariableValues } from './variable.js'
import type { OSCSomeArguments } from '../common/osc.js'
import type { SomeCompanionConfigField } from './config.js'
import type { CompanionStaticUpgradeScript } from './upgrade.js'
import { isInstanceBaseProps, serializeIsVisibleFn } from '../internal/base.js'
import { runThroughUpgradeScripts } from '../internal/upgrade.js'
import { FeedbackManager } from '../internal/feedback.js'
import type { CompanionHTTPRequest, CompanionHTTPResponse } from './http.js'
import { IpcWrapper } from '../host-api/ipc-wrapper.js'
import { ActionManager } from '../internal/actions.js'
import {
	SharedUdpSocket,
	SharedUdpSocketImpl,
	SharedUdpSocketMessageCallback,
	SharedUdpSocketOptions,
} from './shared-udp-socket.js'

export interface InstanceBaseOptions {
	/**
	 * Disable enforcement of variables requiring a definition.
	 * It is not recommended to set this, unless you know what you are doing.
	 */
	disableVariableValidation: boolean
}

export abstract class InstanceBase<TConfig, TSecrets = undefined> implements InstanceBaseShared<TConfig, TSecrets> {
	readonly #ipcWrapper: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>
	readonly #upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[]
	public readonly id: string

	readonly #lifecycleQueue: PQueue = new PQueue({ concurrency: 1 })
	#initialized = false
	#recordingActions = false

	#lastConfig: TConfig = {} as any
	#lastSecrets: TSecrets = {} as any

	readonly #actionManager: ActionManager
	readonly #feedbackManager: FeedbackManager

	readonly #sharedUdpSocketHandlers = new Map<string, SharedUdpSocketImpl>()
	readonly #variableDefinitions = new Map<string, CompanionVariableDefinition>()

	readonly #variableValues = new Map<string, CompanionVariableValue>()

	readonly #options: InstanceBaseOptions
	#label: string

	public get instanceOptions(): InstanceBaseOptions {
		return this.#options
	}

	/**
	 * The user chosen name for this instance.
	 * This can be changed just before `configUpdated` is called
	 */
	public get label(): string {
		return this.#label
	}

	/**
	 * Create an instance of the module
	 */
	constructor(internal: unknown) {
		if (!isInstanceBaseProps<TConfig, TSecrets>(internal) || !internal._isInstanceBaseProps)
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`,
			)

		this.createSharedUdpSocket = this.createSharedUdpSocket.bind(this)

		this.#options = {
			disableVariableValidation: false,
		}

		this.#ipcWrapper = new IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>(
			{
				init: this._handleInit.bind(this),
				destroy: this._handleDestroy.bind(this),
				updateConfigAndLabel: this._handleConfigUpdateAndLabel.bind(this),
				updateConfig: async () => undefined, // Replaced by updateConfigAndLabel
				executeAction: this._handleExecuteAction.bind(this),
				updateFeedbacks: this._handleUpdateFeedbacks.bind(this),
				updateActions: this._handleUpdateActions.bind(this),
				upgradeActionsAndFeedbacks: this._handleUpgradeActionsAndFeedbacks.bind(this),
				getConfigFields: this._handleGetConfigFields.bind(this),
				handleHttpRequest: this._handleHttpRequest.bind(this),
				learnAction: this._handleLearnAction.bind(this),
				learnFeedback: this._handleLearnFeedback.bind(this),
				startStopRecordActions: this._handleStartStopRecordActions.bind(this),
				variablesChanged: async () => undefined, // Not needed since 1.13.0
				sharedUdpSocketMessage: this._handleSharedUdpSocketMessage.bind(this),
				sharedUdpSocketError: this._handleSharedUdpSocketError.bind(this),
			},
			(msg) => {
				process.send!(msg)
			},
			5000,
		)
		process.on('message', (msg) => {
			this.#ipcWrapper.receivedMessage(msg as any)
		})

		const parseVariablesInStringIfNeeded = async (
			msg: ParseVariablesInStringMessage,
		): Promise<ParseVariablesInStringResponseMessage> => {
			// Shortcut in case there is definitely nothing to parse
			if (!msg.text.includes('$('))
				return {
					text: msg.text,
					variableIds: undefined,
				}
			return this.#ipcWrapper.sendWithCb('parseVariablesInString', msg)
		}

		this.#actionManager = new ActionManager(
			parseVariablesInStringIfNeeded,
			(msg) => this.#ipcWrapper.sendWithNoCb('setActionDefinitions', msg),
			(msg) => this.#ipcWrapper.sendWithNoCb('setCustomVariable', msg),
			this.log.bind(this),
		)
		this.#feedbackManager = new FeedbackManager(
			parseVariablesInStringIfNeeded,
			(msg) => this.#ipcWrapper.sendWithNoCb('updateFeedbackValues', msg),
			(msg) => this.#ipcWrapper.sendWithNoCb('setFeedbackDefinitions', msg),
			this.log.bind(this),
		)

		this.#upgradeScripts = internal.upgradeScripts
		this.id = internal.id
		this.#label = internal.id // Temporary

		this.log('debug', 'Initializing')
	}

	private async _handleInit(msg: InitMessage): Promise<InitResponseMessage> {
		return this.#lifecycleQueue.add(async () => {
			if (this.#initialized) throw new Error('Already initialized')

			this.#lastConfig = msg.config as TConfig
			this.#lastSecrets = msg.secrets as TSecrets
			this.#label = msg.label

			// Create initial config object
			if (msg.isFirstInit) {
				const newConfig: any = {}
				const newSecrets: any = {}
				const fields = this.getConfigFields()
				for (const field of fields) {
					if ('default' in field) {
						if (field.type.startsWith('secret')) {
							newSecrets[field.id] = field.default
						} else {
							newConfig[field.id] = field.default
						}
					}
				}
				this.#lastConfig = newConfig as TConfig
				this.#lastSecrets = newSecrets as TSecrets
				this.saveConfig(this.#lastConfig, this.#lastSecrets)

				// this is new, so there is no point attempting to run any upgrade scripts
				msg.lastUpgradeIndex = this.#upgradeScripts.length - 1
			}

			/**
			 * Making this handle actions/feedbacks is hard now due to the structure of options, so instead we just upgrade the config, and the actions/feedbacks will be handled in their own calls soon after this
			 */
			const { updatedConfig, updatedSecrets } = runThroughUpgradeScripts(
				[],
				[],
				msg.lastUpgradeIndex,
				this.#upgradeScripts,
				this.#lastConfig,
				this.#lastSecrets,
				false,
			)
			this.#lastConfig = (updatedConfig as TConfig | undefined) ?? this.#lastConfig
			this.#lastSecrets = (updatedSecrets as TSecrets | undefined) ?? this.#lastSecrets

			// Now we can initialise the module
			try {
				await this.init(this.#lastConfig, !!msg.isFirstInit, this.#lastSecrets)

				this.#initialized = true
			} catch (e) {
				console.trace(`Init failed: ${e}`)
				throw e
			}

			return {
				hasHttpHandler: typeof this.handleHttpRequest === 'function',
				hasRecordActionsHandler: typeof this.handleStartStopRecordActions == 'function',
				newUpgradeIndex: this.#upgradeScripts.length - 1,
				updatedConfig: this.#lastConfig,
				updatedSecrets: this.#lastSecrets,
			}
		})
	}
	private async _handleDestroy(): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			await this.destroy()

			this.#initialized = false
		})
	}
	private async _handleConfigUpdateAndLabel(msg: UpdateConfigAndLabelMessage): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			this.#label = msg.label
			this.#lastConfig = msg.config as TConfig

			await this.configUpdated(this.#lastConfig, this.#lastSecrets)
		})
	}
	private async _handleExecuteAction(msg: ExecuteActionMessage): Promise<void> {
		return this.#actionManager.handleExecuteAction(msg)
	}

	private async _handleUpdateFeedbacks(msg: UpdateFeedbackInstancesMessage): Promise<void> {
		this.#feedbackManager.handleUpdateFeedbacks(msg.feedbacks)
	}
	private async _handleUpdateActions(msg: UpdateActionInstancesMessage): Promise<void> {
		this.#actionManager.handleUpdateActions(msg.actions)
	}
	private async _handleUpgradeActionsAndFeedbacks(
		msg: UpgradeActionAndFeedbackInstancesMessage,
	): Promise<UpgradeActionAndFeedbackInstancesResponse> {
		return runThroughUpgradeScripts(
			msg.actions,
			msg.feedbacks,
			null,
			this.#upgradeScripts,
			this.#lastConfig,
			this.#lastSecrets,
			true,
		)
	}

	private async _handleGetConfigFields(_msg: GetConfigFieldsMessage): Promise<GetConfigFieldsResponseMessage> {
		return {
			fields: serializeIsVisibleFn(this.getConfigFields()),
		}
	}

	private async _handleHttpRequest(msg: HandleHttpRequestMessage): Promise<HandleHttpRequestResponseMessage> {
		if (!this.handleHttpRequest) throw new Error(`handleHttpRequest is not supported!`)

		const res = await this.handleHttpRequest(msg.request)

		return { response: res }
	}
	private async _handleLearnAction(msg: LearnActionMessage): Promise<LearnActionResponseMessage> {
		return this.#actionManager.handleLearnAction(msg)
	}
	private async _handleLearnFeedback(msg: LearnFeedbackMessage): Promise<LearnFeedbackResponseMessage> {
		return this.#feedbackManager.handleLearnFeedback(msg)
	}
	private async _handleStartStopRecordActions(msg: StartStopRecordActionsMessage): Promise<void> {
		if (!msg.recording) {
			if (!this.#recordingActions) {
				// Already stopped
				return
			}
		} else {
			if (this.#recordingActions) {
				// Already running
				return
			}
		}

		if (!this.handleStartStopRecordActions) {
			this.#recordingActions = false
			throw new Error('Recording actions is not supported by this module!')
		}

		this.#recordingActions = msg.recording

		this.handleStartStopRecordActions(this.#recordingActions)
	}

	private async _handleSharedUdpSocketMessage(msg: SharedUdpSocketMessage): Promise<void> {
		for (const socket of this.#sharedUdpSocketHandlers.values()) {
			if (socket.handleId === msg.handleId) {
				socket.receiveSocketMessage(msg)
			}
		}
	}
	private async _handleSharedUdpSocketError(msg: SharedUdpSocketError): Promise<void> {
		for (const socket of this.#sharedUdpSocketHandlers.values()) {
			if (socket.handleId === msg.handleId) {
				socket.receiveSocketError(msg.error)
			}
		}
	}

	/**
	 * Main initialization function called
	 * once the module is OK to start doing things.
	 */
	abstract init(config: TConfig, isFirstInit: boolean, secrets: TSecrets): Promise<void>

	/**
	 * Clean up the instance before it is destroyed.
	 */
	abstract destroy(): Promise<void>

	/**
	 * Called when the configuration is updated.
	 * @param config The new config object
	 */
	abstract configUpdated(config: TConfig, secrets: TSecrets): Promise<void>

	/**
	 * Save an updated configuration object
	 * Note: The whole config object and the keys of the secrets object are reported to the webui, so be careful how sensitive data is stored
	 * @param newConfig The new config object, or undefined to not update the config
	 * @param newSecrets The new secrets object, or undefined to not update the secrets
	 */
	saveConfig(this: InstanceBase<TConfig, undefined>, newConfig: TConfig | undefined, newSecrets?: undefined): void
	saveConfig(
		this: InstanceBase<TConfig, TSecrets>,
		newConfig: TConfig | undefined,
		newSecrets: TSecrets | undefined,
	): void
	saveConfig(newConfig: TConfig | undefined, newSecrets: TSecrets | undefined): void {
		if (newConfig) this.#lastConfig = newConfig
		if (newSecrets) this.#lastSecrets = newSecrets
		this.#ipcWrapper.sendWithNoCb('saveConfig', { config: newConfig, secrets: newSecrets })
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
		this.#actionManager.setActionDefinitions(actions)
	}

	/**
	 * Set the feedback definitions for this instance
	 * @param feedbacks The feedback definitions
	 */
	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions): void {
		this.#feedbackManager.setFeedbackDefinitions(feedbacks)
	}

	/**
	 * Set the peset definitions for this instance
	 * @param presets The preset definitions
	 */
	setPresetDefinitions(presets: CompanionPresetDefinitions): void {
		const hostPresets: SetPresetDefinitionsMessage['presets'] = []

		for (const [id, preset] of Object.entries(presets)) {
			if (preset) {
				hostPresets.push({
					...preset,
					id,
				})
			}
		}

		this.#ipcWrapper.sendWithNoCb('setPresetDefinitions', { presets: hostPresets })
	}

	/**
	 * Set the variable definitions for this instance
	 * @param variables The variable definitions
	 */
	setVariableDefinitions(variables: CompanionVariableDefinition[]): void {
		const hostVariables: SetVariableDefinitionsMessage['variables'] = []
		const hostValues: SetVariableDefinitionsMessage['newValues'] = []

		this.#variableDefinitions.clear()

		for (const variable of variables) {
			hostVariables.push({
				id: variable.variableId,
				name: variable.name,
			})

			// Remember the definition locally
			this.#variableDefinitions.set(variable.variableId, variable)
			if (!this.#variableValues.has(variable.variableId)) {
				// Give us a local cached value of something
				this.#variableValues.set(variable.variableId, '')
				hostValues.push({
					id: variable.variableId,
					value: '',
				})
			}
		}

		if (!this.#options.disableVariableValidation) {
			const validIds = new Set(this.#variableDefinitions.keys())
			for (const id of this.#variableValues.keys()) {
				if (!validIds.has(id)) {
					// Delete any local cached value
					this.#variableValues.delete(id)
					hostValues.push({
						id: id,
						value: undefined,
					})
				}
			}
		}

		this.#ipcWrapper.sendWithNoCb('setVariableDefinitions', { variables: hostVariables, newValues: hostValues })
	}

	/**
	 * Set the values of some variables
	 * @param values The new values for the variables
	 */
	setVariableValues(values: CompanionVariableValues): void {
		const hostValues: SetVariableValuesMessage['newValues'] = []

		for (const [variableId, value] of Object.entries(values)) {
			if (this.#options.disableVariableValidation) {
				// update the cached value
				if (value === undefined) {
					this.#variableValues.delete(variableId)
				} else {
					this.#variableValues.set(variableId, value)
				}

				hostValues.push({
					id: variableId,
					value: value,
				})
			} else if (this.#variableDefinitions.has(variableId)) {
				// update the cached value
				this.#variableValues.set(variableId, value ?? '')

				hostValues.push({
					id: variableId,
					value: value ?? '',
				})
			} else {
				// tell companion to delete the value
				hostValues.push({
					id: variableId,
					value: undefined,
				})
			}
		}

		this.#ipcWrapper.sendWithNoCb('setVariableValues', { newValues: hostValues })
	}

	/**
	 * Get the last set value of a variable from this connection
	 * @param variableId id of the variable
	 * @returns The value
	 */
	getVariableValue(variableId: string): CompanionVariableValue | undefined {
		return this.#variableValues.get(variableId)
	}

	/**
	 * @deprecated Companion now handles this for you, for actions and feedbacks. If you need this for another purpose, let us know as we intend to remove this
	 *
	 * Parse and replace all the variables in a string
	 * Note: You must not use this for feedbacks, as your feedback will not update when the variable changes.
	 * There is an alternate version of this supplied to each of the action/feedback callbacks that tracks
	 * usages properly and will retrigger the feedback when the variables change.
	 * @param text The text to parse
	 * @returns The string with variables replaced with their values
	 */
	async parseVariablesInString(text: string): Promise<string> {
		const currentContext = this.#feedbackManager.parseVariablesContext
		if (currentContext) {
			this.log(
				'debug',
				`parseVariablesInString called while in: ${currentContext}. You should use the parseVariablesInString provided to the callback instead`,
			)
		}

		// If there are no variables, just return the text
		if (!text.includes('$(')) return text

		const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
			text: text,
			controlId: undefined,
			actionInstanceId: undefined,
			feedbackInstanceId: undefined,
		})
		return res.text
	}

	/**
	 * Request all feedbacks of the specified types to be checked for changes
	 * @param feedbackTypes The feedback types to check
	 */
	checkFeedbacks(...feedbackTypes: string[]): void {
		this.#feedbackManager.checkFeedbacks(feedbackTypes)
	}

	/**
	 * Request the specified feedback instances to be checked for changes
	 * @param feedbackIds The ids of the feedback instances to check
	 */
	checkFeedbacksById(...feedbackIds: string[]): void {
		this.#feedbackManager.checkFeedbacksById(feedbackIds)
	}

	/**
	 * Call subscribe on all currently known placed actions.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeActions(...actionIds: string[]): void {
		this.#actionManager.subscribeActions(actionIds)
	}
	/**
	 * Call unsubscribe on all currently known placed actions.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeActions(...actionIds: string[]): void {
		this.#actionManager.unsubscribeActions(actionIds)
	}

	/**
	 * Call subscribe on all currently known placed feedbacks.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param feedbackIds The feedbackIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeFeedbacks(...feedbackIds: string[]): void {
		this.#feedbackManager.subscribeFeedbacks(feedbackIds)
	}
	/**
	 * Call unsubscribe on all currently known placed feedbacks.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param feedbackIds The feedbackIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeFeedbacks(...feedbackIds: string[]): void {
		this.#feedbackManager.unsubscribeFeedbacks(feedbackIds)
	}

	/**
	 * Add an action to the current recording session
	 * @param action The action to be added to the recording session
	 * @param uniquenessId A unique id for the action being recorded. This should be different for each action, but by passing the same as a previous call will replace the previous value.
	 */
	recordAction(action: CompanionRecordedAction, uniquenessId?: string): void {
		if (!this.#recordingActions) throw new Error('Not currently recording actions')

		this.#ipcWrapper.sendWithNoCb('recordAction', {
			uniquenessId: uniquenessId ?? null,
			actionId: action.actionId,
			options: action.options,
			delay: action.delay,
		})
	}

	/**
	 * Send an osc message from the system osc sender
	 * @param host destination ip address
	 * @param port destination port number
	 * @param path message path
	 * @param args mesage arguments
	 */
	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void {
		this.#ipcWrapper.sendWithNoCb(
			'send-osc',
			literal<SendOscMessage>({
				host,
				port,
				path,
				args,
			}),
		)
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
		this.#ipcWrapper.sendWithNoCb(
			'set-status',
			literal<SetStatusMessage>({
				status,
				message: message ?? null,
			}),
		)
	}

	/**
	 * Write a line to the log
	 * @param level The level of the message
	 * @param message The message text to write
	 */
	log(level: LogLevel, message: string): void {
		this.#ipcWrapper.sendWithNoCb(
			'log-message',
			literal<LogMessageMessage>({
				level,
				message,
			}),
		)
	}

	/**
	 * Create a shared udp socket.
	 * This can be neccessary for modules where the device/software sends UDP messages to a hardcoded port number. In those
	 * cases if you don't use this then it won't be possible to use multiple instances of you module.
	 * The api here is a subset of the `Socket` from the builtin `node:dgram`, but with Companion hosting the sockets instead of the module.
	 * @param type Type of udp to use
	 * @param callback Message received callback
	 */
	createSharedUdpSocket(type: 'udp4' | 'udp6', callback?: SharedUdpSocketMessageCallback): SharedUdpSocket
	createSharedUdpSocket(options: SharedUdpSocketOptions, callback?: SharedUdpSocketMessageCallback): SharedUdpSocket
	createSharedUdpSocket(
		typeOrOptions: 'udp4' | 'udp6' | SharedUdpSocketOptions,
		callback?: SharedUdpSocketMessageCallback,
	): SharedUdpSocket {
		const options: SharedUdpSocketOptions = typeof typeOrOptions === 'string' ? { type: typeOrOptions } : typeOrOptions

		const socket = new SharedUdpSocketImpl(this.#ipcWrapper, this.#sharedUdpSocketHandlers, options)
		if (callback) socket.on('message', callback)

		return socket
	}
}
