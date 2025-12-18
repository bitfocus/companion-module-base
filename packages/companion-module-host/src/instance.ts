import {
	CompanionStaticUpgradeScript,
	CompanionVariableDefinition,
	CompanionVariableValue,
	createModuleLogger,
	type InstanceBase,
} from '@companion-module/base'
import PQueue from 'p-queue'
import { ActionManager } from './internal/actions.js'
import { FeedbackManager } from './internal/feedback.js'
import type { ModuleHostContext } from './context.js'
// eslint-disable-next-line n/no-missing-import
import type { InstanceContext } from '@companion-module/base/dist/host-api/context.js'
import { runThroughUpgradeScripts } from './internal/upgrade.js'
import { serializeIsVisibleFn } from './internal/base.js'

export class InstanceWrapper<TConfig, TSecrets> {
	readonly #logger = createModuleLogger('InstanceWrapper')

	readonly #lifecycleQueue: PQueue = new PQueue({ concurrency: 1 })
	#initialized = false
	#recordingActions = false

	#lastConfig: TConfig = {} as any
	#lastSecrets: TSecrets = {} as any

	readonly #variableDefinitions = new Map<string, CompanionVariableDefinition>()

	readonly #variableValues = new Map<string, CompanionVariableValue>()

	readonly #host: ModuleHostContext<TConfig, TSecrets>
	readonly #actionManager: ActionManager
	readonly #feedbackManager: FeedbackManager

	readonly #instanceContext: InstanceContext<TConfig, TSecrets>
	readonly #instance: InstanceBase<TConfig, TSecrets>

	constructor(
		id: string,
		host: ModuleHostContext<TConfig, TSecrets>,
		instanceFactory: (internal: unknown) => InstanceBase<TConfig, TSecrets>,
		upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[],
	) {
		this.#host = host
		// this.#plugin = plugin

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
		)
		this.#feedbackManager = new FeedbackManager(
			parseVariablesInStringIfNeeded,
			(msg) => this.#ipcWrapper.sendWithNoCb('updateFeedbackValues', msg),
			(msg) => this.#ipcWrapper.sendWithNoCb('setFeedbackDefinitions', msg),
		)

		this.#instanceContext = {
			_isInstanceContext: true,
			id,
			label: id, // Temporary
			upgradeScripts,
			// TODO

			saveConfig: (newConfig, newSecrets) => {
				if (newConfig) this.#lastConfig = newConfig
				if (newSecrets) this.#lastSecrets = newSecrets
				this.#host.saveConfig(newConfig, newSecrets)
			},
			updateStatus: (status, message) => {
				// TODO
			},
			oscSend: (host, port, path, args) => {
				// TODO
			},

			recordAction: (action, uniquenessId) => {
				if (!this.#recordingActions) throw new Error('Not currently recording actions')

				this.#context.recordAction(action, uniquenessId)
			},

			setActionDefinitions: (actions) => {
				this.#actionManager.setActionDefinitions(actions)
			},
			subscribeActions: (actionIds) => {
				this.#actionManager.subscribeActions(actionIds)
			},
			unsubscribeActions: (actionIds) => {
				this.#actionManager.unsubscribeActions(actionIds)
			},

			setFeedbackDefinitions: (feedbacks) => {
				this.#feedbackManager.setFeedbackDefinitions(feedbacks)
			},
			subscribeFeedbacks: (feedbackIds) => {
				this.#feedbackManager.subscribeFeedbacks(feedbackIds)
			},
			unsubscribeFeedbacks: (feedbackIds) => {
				this.#feedbackManager.unsubscribeFeedbacks(feedbackIds)
			},
			checkFeedbacks: (feedbackTypes) => {
				this.#feedbackManager.checkFeedbacks(feedbackTypes)
			},
			checkFeedbacksById: (feedbackIds) => {
				this.#feedbackManager.checkFeedbacksById(feedbackIds)
			},

			setPresetDefinitions: (presets) => {
				// TODO
			},

			setVariableDefinitions: (variables) => {
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
			},
			setVariableValues: (values) => {
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
			},
			getVariableValue: (variableId) => {
				return this.#variableValues.get(variableId)
			},

			sharedUdpSocketHandlers: new Map(),
			sharedUdpSocketJoin: async (msg) => {
				// TODO
				return ''
			},
			sharedUdpSocketLeave: async (msg) => {
				// TODO
			},
			sharedUdpSocketSend: async (msg) => {
				// TODO
			},
		}
		this.#instance = instanceFactory(this.#instanceContext)
	}

	async init(msg: InitMessage): Promise<InitResponseMessage> {
		return this.#lifecycleQueue.add(async () => {
			if (this.#initialized) throw new Error('Already initialized')

			this.#lastConfig = msg.config
			this.#lastSecrets = msg.secrets
			this.#instanceContext.label = msg.label

			// Create initial config object
			if (msg.isFirstInit) {
				const newConfig: any = {}
				const newSecrets: any = {}
				const fields = this.#instance.getConfigFields()
				for (const field of fields) {
					if ('default' in field) {
						if (field.type.startsWith('secret')) {
							newSecrets[field.id] = field.default
						} else {
							newConfig[field.id] = field.default
						}
					}
				}
				this.#lastConfig = newConfig
				this.#lastSecrets = newSecrets
				this.#host.saveConfig(this.#lastConfig, this.#lastSecrets)

				// this is new, so there is no point attempting to run any upgrade scripts
				msg.lastUpgradeIndex = this.#instanceContext.upgradeScripts.length - 1
			}

			/**
			 * Making this handle actions/feedbacks is hard now due to the structure of options, so instead we just upgrade the config, and the actions/feedbacks will be handled in their own calls soon after this
			 */
			const { updatedConfig, updatedSecrets } = runThroughUpgradeScripts(
				[],
				[],
				msg.lastUpgradeIndex,
				this.#instanceContext.upgradeScripts,
				this.#lastConfig,
				this.#lastSecrets,
				false,
			)
			this.#lastConfig = updatedConfig ?? this.#lastConfig
			this.#lastSecrets = updatedSecrets ?? this.#lastSecrets

			// Now we can initialise the module
			try {
				await this.#instance.init(this.#lastConfig, !!msg.isFirstInit, this.#lastSecrets)

				this.#initialized = true
			} catch (e) {
				console.trace(`Init failed: ${e}`)
				throw e
			}

			return {
				hasHttpHandler: typeof this.handleHttpRequest === 'function',
				hasRecordActionsHandler: typeof this.handleStartStopRecordActions == 'function',
				newUpgradeIndex: this.#context.upgradeScripts.length - 1,
				disableNewConfigLayout: this.#options.disableNewConfigLayout,
				updatedConfig: this.#lastConfig,
				updatedSecrets: this.#lastSecrets,
			}
		})
	}

	async destroy(): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			await this.destroy()

			this.#initialized = false
		})
	}

	async configUpdateAndLabel(msg: UpdateConfigAndLabelMessage): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			this.#instanceContext.label = msg.label
			this.#lastConfig = msg.config
			this.#lastSecrets = msg.secrets

			await this.#instance.configUpdated(this.#lastConfig, this.#lastSecrets)
		})
	}
	async executeAction(msg: ExecuteActionMessage): Promise<ExecuteActionResponseMessage> {
		return this.#actionManager.handleExecuteAction(msg)
	}

	async updateFeedbacks(msg: UpdateFeedbackInstancesMessage): Promise<void> {
		this.#feedbackManager.handleUpdateFeedbacks(msg.feedbacks)
	}
	async updateActions(msg: UpdateActionInstancesMessage): Promise<void> {
		this.#actionManager.handleUpdateActions(msg.actions)
	}
	async upgradeActionsAndFeedbacks(
		msg: UpgradeActionAndFeedbackInstancesMessage,
	): Promise<UpgradeActionAndFeedbackInstancesResponse> {
		return runThroughUpgradeScripts(
			msg.actions,
			msg.feedbacks,
			null,
			this.#instanceContext.upgradeScripts,
			this.#lastConfig,
			this.#lastSecrets,
			true,
		)
	}

	async getConfigFields(_msg: GetConfigFieldsMessage): Promise<GetConfigFieldsResponseMessage> {
		return {
			fields: serializeIsVisibleFn(this.#instanceContext.getConfigFields()),
		}
	}

	async httpRequest(msg: HandleHttpRequestMessage): Promise<HandleHttpRequestResponseMessage> {
		if (!this.#instance.handleHttpRequest) throw new Error(`handleHttpRequest is not supported!`)

		const res = await this.#instance.handleHttpRequest(msg.request)

		return { response: res }
	}
	async learnAction(msg: LearnActionMessage): Promise<LearnActionResponseMessage> {
		return this.#actionManager.handleLearnAction(msg)
	}
	async learnFeedback(msg: LearnFeedbackMessage): Promise<LearnFeedbackResponseMessage> {
		return this.#feedbackManager.handleLearnFeedback(msg)
	}
	async startStopRecordActions(recording: boolean): Promise<void> {
		if (!recording) {
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

		if (!this.#instance.handleStartStopRecordActions) {
			this.#recordingActions = false
			throw new Error('Recording actions is not supported by this module!')
		}

		this.#recordingActions = recording

		this.#instance.handleStartStopRecordActions(this.#recordingActions)
	}

	async sharedUdpSocketMessage(msg: SharedUdpSocketMessage): Promise<void> {
		for (const socket of this.#instanceContext.sharedUdpSocketHandlers.values()) {
			if (socket.handleId === msg.handleId) {
				socket.receiveSocketMessage(msg)
			}
		}
	}
	async sharedUdpSocketError(msg: SharedUdpSocketError): Promise<void> {
		for (const socket of this.#instanceContext.sharedUdpSocketHandlers.values()) {
			if (socket.handleId === msg.handleId) {
				socket.receiveSocketError(msg.error)
			}
		}
	}
}
