import type {
	CompanionHTTPRequest,
	CompanionHTTPResponse,
	CompanionOptionValues,
	CompanionStaticUpgradeScript,
	CompanionVariableDefinition,
	CompanionVariableValue,
	SomeCompanionConfigField,
	InstanceBase,
	InstanceConstructor,
	JsonObject,
} from '@companion-module/base'
import PQueue from 'p-queue'
import { ActionManager } from './internal/actions.js'
import { FeedbackManager } from './internal/feedback.js'
import type {
	ActionInstance,
	FeedbackInstance,
	HostVariableDefinition,
	HostVariableValue,
	ModuleHostContext,
	UpgradeActionAndFeedbackInstancesResponse,
	UpgradeActionInstance,
	UpgradeFeedbackInstance,
} from './context.js'
// eslint-disable-next-line n/no-missing-import
import type { InstanceContext, SharedUdpSocketMessage } from '@companion-module/base/dist/host-api/context.js'
import { runThroughUpgradeScripts } from './internal/upgrade.js'

export class InstanceWrapper<TConfig extends JsonObject, TSecrets extends JsonObject | undefined> {
	// readonly #logger = createModuleLogger('InstanceWrapper')

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
		instanceFactory: InstanceConstructor<TConfig, TSecrets>,
		upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[],
	) {
		this.#host = host
		// this.#plugin = plugin

		this.#actionManager = new ActionManager(
			(actions) => this.#host.setActionDefinitions(actions),
			(controlId, variableId, value) => this.#host.setCustomVariable(controlId, variableId, value),
		)
		this.#feedbackManager = new FeedbackManager(
			(feedbacks) => this.#host.setFeedbackDefinitions(feedbacks),
			(values) => this.#host.updateFeedbackValues(values),
		)

		this.#instanceContext = {
			_isInstanceContext: true,
			id,
			label: id, // Temporary
			upgradeScripts,

			saveConfig: (newConfig, newSecrets) => {
				if (newConfig) this.#lastConfig = newConfig
				if (newSecrets) this.#lastSecrets = newSecrets
				this.#host.saveConfig(newConfig, newSecrets)
			},
			updateStatus: (status, message) => {
				this.#host.setStatus(status, message)
			},
			oscSend: (host, port, path, args) => {
				this.#host.sendOSC(host, port, path, args)
			},

			recordAction: (action, uniquenessId) => {
				if (!this.#recordingActions) throw new Error('Not currently recording actions')

				this.#host.recordAction(action, uniquenessId)
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
				this.#host.setPresetDefinitions(presets)
			},
			setCompositeElementDefinitions: (compositeElements) => {
				this.#host.setCompositeElementDefinitions(compositeElements)
			},

			setVariableDefinitions: (variables) => {
				const hostVariables: HostVariableDefinition[] = []
				const hostValues: HostVariableValue[] = []

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

				if (!this.#instance.instanceOptions.disableVariableValidation) {
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

				this.#host.setVariableDefinitions(hostVariables, hostValues)
			},
			setVariableValues: (values) => {
				const hostValues: HostVariableValue[] = []

				for (const [variableId, value] of Object.entries(values)) {
					if (this.#instance.instanceOptions.disableVariableValidation) {
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

				this.#host.setVariableValues(hostValues)
			},
			getVariableValue: (variableId) => {
				return this.#variableValues.get(variableId)
			},

			sharedUdpSocketHandlers: new Map(),
			sharedUdpSocketJoin: async (msg) => {
				return this.#host.sharedUdpSocketJoin(msg)
			},
			sharedUdpSocketLeave: async (msg) => {
				return this.#host.sharedUdpSocketLeave(msg)
			},
			sharedUdpSocketSend: async (msg) => {
				return this.#host.sharedUdpSocketSend(msg)
			},
		}
		this.#instance = new instanceFactory(this.#instanceContext)
	}

	async init(msg: InitMessage): Promise<InitResponseMessage> {
		const res = await this.#lifecycleQueue.add(async () => {
			if (this.#initialized) throw new Error('Already initialized')
			process.title = msg.label

			this.#lastConfig = msg.config as any
			this.#lastSecrets = msg.secrets as any
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
			this.#lastConfig = (updatedConfig ?? this.#lastConfig) as any
			this.#lastSecrets = (updatedSecrets ?? this.#lastSecrets) as any

			// Now we can initialise the module
			try {
				await this.#instance.init(this.#lastConfig, !!msg.isFirstInit, this.#lastSecrets)

				this.#initialized = true
			} catch (e) {
				console.trace(`Init failed: ${e}`)
				throw e
			}

			return {
				hasHttpHandler: typeof this.#instance.handleHttpRequest === 'function',
				hasRecordActionsHandler: typeof this.#instance.handleStartStopRecordActions == 'function',
				newUpgradeIndex: this.#instanceContext.upgradeScripts.length - 1,
				disableNewConfigLayout: this.#instance.instanceOptions.disableNewConfigLayout,
				updatedConfig: this.#lastConfig,
				updatedSecrets: this.#lastSecrets,
			}
		})

		if (!res) throw new Error('Failed to initialize')
		return res
	}

	async destroy(): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			await this.destroy()

			this.#initialized = false
		})
	}

	async configUpdateAndLabel(label: string, config: TConfig, secrets: TSecrets): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized')

			process.title = label

			this.#instanceContext.label = label
			this.#lastConfig = config
			this.#lastSecrets = secrets

			await this.#instance.configUpdated(this.#lastConfig, this.#lastSecrets)
		})
	}
	async executeAction(action: ActionInstance, surfaceId: string | undefined): Promise<ExecuteActionResult> {
		return this.#actionManager.handleExecuteAction(action, surfaceId)
	}

	async updateFeedbacks(feedbacks: Record<string, FeedbackInstance | null | undefined>): Promise<void> {
		this.#feedbackManager.handleUpdateFeedbacks(feedbacks)
	}
	async updateActions(actions: Record<string, ActionInstance | null | undefined>): Promise<void> {
		this.#actionManager.handleUpdateActions(actions)
	}
	async upgradeActionsAndFeedbacks(
		defaultUpgradeIndex: number | null,
		actions: UpgradeActionInstance[],
		feedbacks: UpgradeFeedbackInstance[],
	): Promise<UpgradeActionAndFeedbackInstancesResponse> {
		return runThroughUpgradeScripts(
			actions,
			feedbacks,
			null,
			this.#instanceContext.upgradeScripts,
			this.#lastConfig,
			this.#lastSecrets,
			true,
		)
	}

	async getConfigFields(): Promise<SomeCompanionConfigField[]> {
		return this.#instance.getConfigFields()
	}

	async httpRequest(request: CompanionHTTPRequest): Promise<CompanionHTTPResponse> {
		if (!this.#instance.handleHttpRequest) throw new Error(`handleHttpRequest is not supported!`)

		const res = await this.#instance.handleHttpRequest(request)

		return res
	}
	async learnAction(action: ActionInstance): Promise<{ options: CompanionOptionValues | undefined }> {
		return this.#actionManager.handleLearnAction(action)
	}
	async learnFeedback(feedback: FeedbackInstance): Promise<{ options: CompanionOptionValues | undefined }> {
		return this.#feedbackManager.handleLearnFeedback(feedback)
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
				const error = new Error(msg.errorMessage)
				error.stack = msg.errorStack
				socket.receiveSocketError(error)
			}
		}
	}
}

export interface InitMessage {
	label: string
	isFirstInit: boolean
	config: unknown
	secrets: unknown

	lastUpgradeIndex: number
}
export interface InitResponseMessage {
	hasHttpHandler: boolean
	hasRecordActionsHandler: boolean
	newUpgradeIndex: number
	disableNewConfigLayout: boolean

	updatedConfig: unknown | undefined
	updatedSecrets: unknown | undefined
}

export interface ExecuteActionResult {
	success: boolean
	/** If success=false, a reason for the failure */
	errorMessage: string | undefined
}

export interface SharedUdpSocketError {
	handleId: string
	portNumber: number

	errorMessage: string
	errorStack: string | undefined
}
