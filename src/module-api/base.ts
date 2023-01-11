import {
	CompanionActionDefinition,
	CompanionActionDefinitions,
	CompanionActionInfo,
	CompanionActionContext,
} from './action.js'
import { CompanionFeedbackDefinitions, CompanionFeedbackContext } from './feedback.js'
import { CompanionPresetDefinitions } from './preset.js'
import { InstanceStatus, LogLevel } from './enums.js'
import {
	ActionInstance,
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
	SendOscMessage,
	SetActionDefinitionsMessage,
	SetPresetDefinitionsMessage,
	SetStatusMessage,
	SetVariableDefinitionsMessage,
	SetVariableValuesMessage,
	StartStopRecordActionsMessage,
	UpdateActionInstancesMessage,
	UpdateFeedbackInstancesMessage,
	VariablesChangedMessage,
} from '../host-api/api.js'
import { literal } from '../util.js'
import { InstanceBaseShared } from '../instance-base.js'
import PQueue from 'p-queue'
import { CompanionVariableDefinition, CompanionVariableValue, CompanionVariableValues } from './variable.js'
import { OSCSomeArguments } from '../common/osc.js'
import { SomeCompanionConfigField } from './config.js'
import { CompanionStaticUpgradeScript } from './upgrade.js'
import { isInstanceBaseProps, serializeIsVisibleFn } from '../internal/base.js'
import { runThroughUpgradeScripts } from '../internal/upgrade.js'
import { FeedbackManager } from '../internal/feedback.js'
import { CompanionHTTPRequest, CompanionHTTPResponse } from './http.js'
import { IpcWrapper } from '../host-api/ipc-wrapper.js'

export interface InstanceBaseOptions {
	/**
	 * Disable enforcement of variables requiring a definition.
	 * It is not recommended to set this, unless you know what you are doing.
	 */
	disableVariableValidation: boolean
}

export abstract class InstanceBase<TConfig> implements InstanceBaseShared<TConfig> {
	readonly #ipcWrapper: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>
	readonly #upgradeScripts: CompanionStaticUpgradeScript<TConfig>[]
	public readonly id: string

	readonly #lifecycleQueue: PQueue = new PQueue({ concurrency: 1 })
	#initialized: boolean = false
	#recordingActions: boolean = false

	readonly #feedbackManager: FeedbackManager

	readonly #actionDefinitions = new Map<string, CompanionActionDefinition>()
	readonly #variableDefinitions = new Map<string, CompanionVariableDefinition>()

	readonly #actionInstances = new Map<string, ActionInstance>()
	readonly #variableValues = new Map<string, CompanionVariableValue>()

	readonly #options: InstanceBaseOptions

	public get instanceOptions(): InstanceBaseOptions {
		return this.#options
	}

	/**
	 * Create an instance of the module
	 */
	constructor(internal: unknown) {
		if (!isInstanceBaseProps<TConfig>(internal) || !internal._isInstanceBaseProps)
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`
			)

		this.#options = {
			disableVariableValidation: false,
		}

		this.#ipcWrapper = new IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>(
			{
				init: this._handleInit.bind(this),
				destroy: this._handleDestroy.bind(this),
				updateConfig: this._handleConfigUpdate.bind(this),
				executeAction: this._handleExecuteAction.bind(this),
				updateFeedbacks: this._handleUpdateFeedbacks.bind(this),
				updateActions: this._handleUpdateActions.bind(this),
				getConfigFields: this._handleGetConfigFields.bind(this),
				handleHttpRequest: this._handleHttpRequest.bind(this),
				learnAction: this._handleLearnAction.bind(this),
				learnFeedback: this._handleLearnFeedback.bind(this),
				startStopRecordActions: this._handleStartStopRecordActions.bind(this),
				variablesChanged: this._handleVariablesChanged.bind(this),
			},
			(msg) => {
				process.send!(msg)
			},
			5000
		)
		process.on('message', (msg) => {
			this.#ipcWrapper.receivedMessage(msg as any)
		})

		this.#feedbackManager = new FeedbackManager(
			async (msg) => this.#ipcWrapper.sendWithCb('parseVariablesInString', msg),
			(msg) => this.#ipcWrapper.sendWithNoCb('updateFeedbackValues', msg),
			(msg) => this.#ipcWrapper.sendWithNoCb('setFeedbackDefinitions', msg)
		)

		this.#upgradeScripts = internal.upgradeScripts
		this.id = internal.id

		this.log('debug', 'Initializing')
	}

	private async _handleInit(msg: InitMessage): Promise<InitResponseMessage> {
		return this.#lifecycleQueue.add(async () => {
			if (this.#initialized) throw new Error('Already initialized')

			const actions = msg.actions
			const feedbacks = msg.feedbacks
			let config = msg.config as TConfig

			// Create initial config object
			if (msg.isFirstInit) {
				const newConfig: any = {}
				const fields = this.getConfigFields()
				for (const field of fields) {
					if ('default' in field) {
						newConfig[field.id] = field.default
					}
				}
				config = newConfig as TConfig
				this.saveConfig(config)
			}

			/**
			 * Performing upgrades during init requires a fair chunk of work.
			 * Some actions/feedbacks will be using the upgradeIndex of the instance, but some may have their own upgradeIndex on themselves if they are from an import.
			 */
			const { updatedActions, updatedFeedbacks, updatedConfig } = runThroughUpgradeScripts(
				actions,
				feedbacks,
				msg.lastUpgradeIndex,
				this.#upgradeScripts,
				config
			)
			config = (updatedConfig as TConfig | undefined) ?? config

			// Send the upgraded data back to companion now. Just so that if the init crashes, this doesnt have to be repeated
			const pSendUpgrade = this.#ipcWrapper.sendWithCb('upgradedItems', {
				updatedActions,
				updatedFeedbacks,
			})

			// Now we can initialise the module
			try {
				await this.init(config, !!msg.isFirstInit)

				this.#initialized = true
			} catch (e) {
				console.trace(`Init failed: ${e}`)
				throw e
			} finally {
				// Only now do we need to await the upgrade
				await pSendUpgrade
			}

			setImmediate(() => {
				// Subscribe all of the actions and feedbacks
				this._handleUpdateActions({ actions }, true)
				this._handleUpdateFeedbacks({ feedbacks }, true)
			})

			return {
				hasHttpHandler: typeof this.handleHttpRequest === 'function',
				hasRecordActionsHandler: typeof this.handleStartStopRecordActions == 'function',
				newUpgradeIndex: this.#upgradeScripts.length - 1,
				updatedConfig: config,
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
	private async _handleConfigUpdate(config: unknown): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			await this.configUpdated(config as TConfig)
		})
	}
	private async _handleExecuteAction(msg: ExecuteActionMessage): Promise<void> {
		const actionDefinition = this.#actionDefinitions.get(msg.action.actionId)
		if (!actionDefinition) throw new Error(`Unknown action: ${msg.action.actionId}`)

		const context: CompanionActionContext = {
			parseVariablesInString: async (text: string): Promise<string> => {
				const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
					text: text,
					controlId: msg.action.controlId,
					actionInstanceId: msg.action.id,
					feedbackInstanceId: undefined,
				})

				return res.text
			},
		}

		await actionDefinition.callback(
			{
				id: msg.action.id,
				actionId: msg.action.actionId,
				controlId: msg.action.controlId,
				options: msg.action.options,

				_deviceId: msg.deviceId,
				_page: msg.action.page,
				_bank: msg.action.bank,
			},
			context
		)
	}

	private async _handleUpdateFeedbacks(msg: UpdateFeedbackInstancesMessage, skipUpgrades?: boolean): Promise<void> {
		// Run through upgrade scripts if needed
		if (!skipUpgrades) {
			const res = runThroughUpgradeScripts({}, msg.feedbacks, null, this.#upgradeScripts, undefined)
			this.#ipcWrapper
				.sendWithCb('upgradedItems', {
					updatedActions: res.updatedActions,
					updatedFeedbacks: res.updatedFeedbacks,
				})
				.catch((e) => {
					this.log('error', `Failed to save upgraded feedbacks: ${e}`)
				})
		}

		this.#feedbackManager.handleUpdateFeedbacks(msg.feedbacks)
	}
	private async _handleUpdateActions(msg: UpdateActionInstancesMessage, skipUpgrades?: boolean): Promise<void> {
		// Run through upgrade scripts if needed
		if (!skipUpgrades) {
			const res = runThroughUpgradeScripts(msg.actions, {}, null, this.#upgradeScripts, undefined)
			this.#ipcWrapper
				.sendWithCb('upgradedItems', {
					updatedActions: res.updatedActions,
					updatedFeedbacks: res.updatedFeedbacks,
				})
				.catch((e) => {
					this.log('error', `Failed to save upgraded actions: ${e}`)
				})
		}

		for (const [id, action] of Object.entries(msg.actions)) {
			const existing = this.#actionInstances.get(id)
			if (existing) {
				// Call unsubscribe
				const definition = this.#actionDefinitions.get(existing.actionId)
				if (definition?.unsubscribe) {
					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
								text: text,
								controlId: existing.controlId,
								actionInstanceId: existing.id,
								feedbackInstanceId: undefined,
							})

							return res.text
						},
					}

					try {
						definition.unsubscribe(existing, context)
					} catch (e: any) {
						console.error(`Action unsubscribe failed: ${JSON.stringify(existing)} - ${e?.message ?? e} ${e?.stack}`)
					}
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
					const context: CompanionFeedbackContext = {
						parseVariablesInString: async (text: string): Promise<string> => {
							const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
								text: text,
								controlId: action.controlId,
								actionInstanceId: action.id,
								feedbackInstanceId: undefined,
							})

							return res.text
						},
					}

					try {
						definition.subscribe(action, context)
					} catch (e: any) {
						console.error(`Action subscribe failed: ${JSON.stringify(action)} - ${e?.message ?? e} ${e?.stack}`)
					}
				}
			}
		}
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
		const definition = this.#actionDefinitions.get(msg.action.actionId)
		if (definition && definition.learn) {
			const context: CompanionFeedbackContext = {
				parseVariablesInString: async (text: string): Promise<string> => {
					const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
						text: text,
						controlId: msg.action.controlId,
						actionInstanceId: msg.action.id,
						feedbackInstanceId: undefined,
					})

					return res.text
				},
			}

			const newOptions = await definition.learn(
				{
					id: msg.action.id,
					actionId: msg.action.actionId,
					controlId: msg.action.controlId,
					options: msg.action.options,

					_deviceId: undefined,
					_page: msg.action.page,
					_bank: msg.action.bank,
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

	private async _handleVariablesChanged(msg: VariablesChangedMessage): Promise<void> {
		this.#feedbackManager.handleVariablesChanged(msg)
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
		this.#ipcWrapper.sendWithNoCb('saveConfig', { config: newConfig })
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
		const hostActions: SetActionDefinitionsMessage['actions'] = []

		this.#actionDefinitions.clear()

		for (const [actionId, action] of Object.entries(actions)) {
			if (action) {
				hostActions.push({
					id: actionId,
					name: action.name,
					description: action.description,
					options: serializeIsVisibleFn(action.options),
					hasLearn: !!action.learn,
				})

				// Remember the definition locally
				this.#actionDefinitions.set(actionId, action)
			}
		}

		this.#ipcWrapper.sendWithNoCb('setActionDefinitions', { actions: hostActions })
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
			}
		}

		if (!this.#options.disableVariableValidation) {
			const validIds = new Set(this.#variableDefinitions.keys())
			for (const id of this.#variableValues.keys()) {
				if (!validIds.has(id)) {
					// Delete any local cached value
					this.#variableValues.delete(id)
				}
			}
		}

		this.#ipcWrapper.sendWithNoCb('setVariableDefinitions', { variables: hostVariables })
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
				`parseVariablesInString called while in: ${currentContext}. You should use the parseVariablesInString provided to the callback instead`
			)
		}

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

	/** @deprecated */
	_getAllActions() {
		return Array.from(this.#actionInstances.values()).map((act) => ({
			id: act.id,
			actionId: act.actionId,
			controlId: act.controlId,
			options: act.options,
		}))
	}

	/**
	 * Call subscribe on all currently known placed actions.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeActions(...actionIds: string[]): void {
		let actions = Array.from(this.#actionInstances.values())

		const actionIdSet = new Set(actionIds)
		if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

		for (const act of actions) {
			const def = this.#actionDefinitions.get(act.actionId)
			if (def?.subscribe) {
				const context: CompanionActionContext = {
					parseVariablesInString: async (text: string): Promise<string> => {
						const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
							text: text,
							controlId: act.controlId,
							actionInstanceId: act.id,
							feedbackInstanceId: undefined,
						})

						return res.text
					},
				}

				def.subscribe(
					{
						id: act.id,
						actionId: act.actionId,
						controlId: act.controlId,
						options: act.options,
					},
					context
				)
			}
		}
	}
	/**
	 * Call unsubscribe on all currently known placed actions.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeActions(...actionIds: string[]): void {
		let actions = Array.from(this.#actionInstances.values())

		const actionIdSet = new Set(actionIds)
		if (actionIdSet.size) actions = actions.filter((fb) => actionIdSet.has(fb.actionId))

		for (const act of actions) {
			const def = this.#actionDefinitions.get(act.actionId)
			if (def && def.unsubscribe) {
				const context: CompanionActionContext = {
					parseVariablesInString: async (text: string): Promise<string> => {
						const res = await this.#ipcWrapper.sendWithCb('parseVariablesInString', {
							text: text,
							controlId: act.controlId,
							actionInstanceId: act.id,
							feedbackInstanceId: undefined,
						})

						return res.text
					},
				}

				def.unsubscribe(
					{
						id: act.id,
						actionId: act.actionId,
						controlId: act.controlId,
						options: act.options,
					},
					context
				)
			}
		}
	}

	/** @deprecated */
	_getAllFeedbacks() {
		return this.#feedbackManager._getAllFeedbacks()
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
	recordAction(action: Omit<CompanionActionInfo, 'id' | 'controlId'>, uniquenessId?: string): void {
		if (!this.#recordingActions) throw new Error('Not currently recording actions')

		this.#ipcWrapper.sendWithNoCb('recordAction', {
			uniquenessId: uniquenessId ?? null,
			actionId: action.actionId,
			options: action.options,
		})
	}

	/**
	 * Experimental: This method may change without notice. Do not use!
	 * Set the value of a custom variable
	 * @param variableName
	 * @param value
	 * @returns Promise which resolves upon success, or rejects if the variable no longer exists
	 */
	setCustomVariableValue(variableName: string, value: CompanionVariableValue): void {
		this.#ipcWrapper.sendWithNoCb('setCustomVariable', {
			customVariableId: variableName,
			value,
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
			})
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
			})
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
			})
		)
	}
}
