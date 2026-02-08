import type { CompanionActionDefinitions, CompanionActionSchema, CompanionRecordedAction } from './action.js'
import type { CompanionFeedbackDefinitions, CompanionFeedbackSchema } from './feedback.js'
import type { CompanionPresetDefinitions } from './preset.js'
import type { InstanceStatus } from './enums.js'
import { createModuleLogger, type LogLevel, type ModuleLogger } from '../logging.js'
import { assertNever } from '../util.js'
import type { CompanionVariableDefinition, CompanionVariableValue, CompanionVariableValues } from './variable.js'
import type { OSCSomeArguments } from '../common/osc.js'
import type { SomeCompanionConfigField } from './config.js'
import type { CompanionHTTPRequest, CompanionHTTPResponse } from './http.js'
import {
	SharedUdpSocket,
	SharedUdpSocketImpl,
	SharedUdpSocketMessageCallback,
	SharedUdpSocketOptions,
} from './shared-udp-socket.js'
import { type InstanceContext, isInstanceContext } from '../host-api/context.js'
import type { JsonObject } from '../common/json-value.js'
import type { CompanionOptionValues } from './input.js'
import type { StringKeys } from '../util.js'

export interface InstanceBaseOptions {
	/**
	 * Disable enforcement of variables requiring a definition.
	 * It is not recommended to set this, unless you know what you are doing.
	 */
	disableVariableValidation: boolean

	/**
	 * Disable the new connection configuration layout.
	 *
	 * @deprecated This option will be removed in future versions. Avoid using this when possible.
	 *
	 * We acknowledge that some modules may face challenges adapting to the new configuration layout.
	 * If this is you, we want to hear from you! Let us know what is missing in order for you to adopt the new layout.
	 */
	disableNewConfigLayout: boolean
}

/**
 * The generic type arguments for the module instance.
 * This is optional, but allows you to have better type safety in various places
 */
export interface InstanceTypes {
	config: JsonObject
	secrets: JsonObject | undefined
	actions: Record<string, CompanionActionSchema<CompanionOptionValues>>
	feedbacks: Record<string, CompanionFeedbackSchema<CompanionOptionValues>>
}

export type InstanceConstructor<TManifest extends InstanceTypes = InstanceTypes> = new (
	internal: unknown,
) => InstanceBase<TManifest>

export abstract class InstanceBase<TManifest extends InstanceTypes = InstanceTypes> {
	readonly #context: InstanceContext<TManifest>
	readonly #logger: ModuleLogger

	readonly #options: InstanceBaseOptions

	public get id(): string {
		return this.#context.id
	}

	public get instanceOptions(): InstanceBaseOptions {
		return this.#options
	}

	/**
	 * The user chosen name for this instance.
	 * This can be changed just before `configUpdated` is called
	 */
	public get label(): string {
		return this.#context.label
	}

	/**
	 * Create an instance of the module
	 */
	constructor(internal: unknown) {
		if (!isInstanceContext<TManifest>(internal) || !internal._isInstanceContext)
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`,
			)

		this.#context = internal

		this.#logger = createModuleLogger()

		this.createSharedUdpSocket = this.createSharedUdpSocket.bind(this)

		this.#options = {
			disableVariableValidation: false,
			disableNewConfigLayout: false,
		}

		this.log('debug', 'Initializing')
	}

	/**
	 * Main initialization function called
	 * once the module is OK to start doing things.
	 */
	abstract init(config: TManifest['config'], isFirstInit: boolean, secrets: TManifest['secrets']): Promise<void>

	/**
	 * Clean up the instance before it is destroyed.
	 */
	abstract destroy(): Promise<void>

	/**
	 * Called when the configuration is updated.
	 * @param config The new config object
	 */
	abstract configUpdated(config: TManifest['config'], secrets: TManifest['secrets']): Promise<void>

	/**
	 * Save an updated configuration object
	 * Note: The whole config object and the keys of the secrets object are reported to the webui, so be careful how sensitive data is stored
	 * @param newConfig The new config object, or undefined to not update the config
	 * @param newSecrets The new secrets object, or undefined to not update the secrets
	 */
	saveConfig(this: InstanceBase<TManifest & { secrets: undefined }>, newConfig: TManifest['config'] | undefined): void
	saveConfig(
		this: InstanceBase<TManifest>,
		newConfig: TManifest['config'] | undefined,
		newSecrets: TManifest['secrets'] | undefined,
	): void
	saveConfig(newConfig: TManifest['config'] | undefined, newSecrets?: TManifest['secrets']): void {
		this.#context.saveConfig(newConfig, newSecrets)
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
	setActionDefinitions(actions: CompanionActionDefinitions<TManifest['actions']>): void {
		this.#context.setActionDefinitions(actions)
	}

	/**
	 * Set the feedback definitions for this instance
	 * @param feedbacks The feedback definitions
	 */
	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions<TManifest['feedbacks']>): void {
		this.#context.setFeedbackDefinitions(feedbacks)
	}

	/**
	 * Set the peset definitions for this instance
	 * @param presets The preset definitions
	 */
	setPresetDefinitions(presets: CompanionPresetDefinitions<TManifest>): void {
		this.#context.setPresetDefinitions(presets)
	}

	/**
	 * Set the variable definitions for this instance
	 * @param variables The variable definitions
	 */
	setVariableDefinitions(variables: CompanionVariableDefinition[]): void {
		this.#context.setVariableDefinitions(variables)
	}

	/**
	 * Set the values of some variables
	 * @param values The new values for the variables
	 */
	setVariableValues(values: CompanionVariableValues): void {
		this.#context.setVariableValues(values)
	}

	/**
	 * Get the last set value of a variable from this connection
	 * @param variableId id of the variable
	 * @returns The value
	 */
	getVariableValue(variableId: string): CompanionVariableValue | undefined {
		return this.#context.getVariableValue(variableId)
	}

	/**
	 * Request all feedbacks of the specified types to be checked for changes
	 * @param feedbackTypes The feedback types to check
	 */
	checkFeedbacks(...feedbackTypes: StringKeys<TManifest['feedbacks']>[]): void {
		this.#context.checkFeedbacks(feedbackTypes)
	}

	/**
	 * Request the specified feedback instances to be checked for changes
	 * @param feedbackIds The ids of the feedback instances to check
	 */
	checkFeedbacksById(...feedbackIds: string[]): void {
		this.#context.checkFeedbacksById(feedbackIds)
	}

	/**
	 * Call subscribe on all currently known placed actions.
	 * It can be useful to trigger this upon establishing a connection, to ensure all data is loaded.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	subscribeActions(...actionIds: string[]): void {
		this.#context.subscribeActions(actionIds)
	}
	/**
	 * Call unsubscribe on all currently known placed actions.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param actionIds The actionIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeActions(...actionIds: string[]): void {
		this.#context.unsubscribeActions(actionIds)
	}

	/**
	 * Call unsubscribe on all currently known placed feedbacks.
	 * It can be useful to do some cleanup upon a connection closing.
	 * @param feedbackIds The feedbackIds to call subscribe for. If no values are provided, then all are called.
	 */
	unsubscribeFeedbacks(...feedbackIds: string[]): void {
		this.#context.unsubscribeFeedbacks(feedbackIds)
	}

	/**
	 * Add an action to the current recording session
	 * @param action The action to be added to the recording session
	 * @param uniquenessId A unique id for the action being recorded. This should be different for each action, but by passing the same as a previous call will replace the previous value.
	 */
	recordAction(action: CompanionRecordedAction, uniquenessId?: string): void {
		this.#context.recordAction(action, uniquenessId)
	}

	/**
	 * Send an osc message from the system osc sender
	 * @param host destination ip address
	 * @param port destination port number
	 * @param path message path
	 * @param args message arguments
	 */
	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void {
		this.#context.oscSend(host, port, path, args)
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
		this.#context.updateStatus(status, message ?? null)
	}

	/**
	 * Write a line to the log
	 * @param level The level of the message
	 * @param message The message text to write
	 */
	log(level: LogLevel, message: string): void {
		switch (level) {
			case 'debug':
				this.#logger.debug(message)
				break
			case 'info':
				this.#logger.info(message)
				break
			case 'warn':
				this.#logger.warn(message)
				break
			case 'error':
				this.#logger.error(message)
				break
			default:
				assertNever(level)
				this.#logger.info(message)
				break
		}
	}

	/**
	 * Create a shared udp socket.
	 * This can be necessary for modules where the device/software sends UDP messages to a hardcoded port number. In those
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

		const socket = new SharedUdpSocketImpl(this.#context, options)
		if (callback) socket.on('message', callback)

		return socket
	}
}
