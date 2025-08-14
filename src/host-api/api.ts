/**
 * Warning: these types are intentionally semi-isolated from the module-api folder.
 * While it causes a lot of duplicate typings and requires us to do translation of types,
 * it allows for us to be selective as to whether a change impacts the module api or the host api.
 * This will allow for cleaner and more stable apis which can both evolve at different rates
 */

import type { CompanionFeedbackButtonStyleResult, SomeCompanionFeedbackInputField } from '../module-api/feedback.js'
import type { OSCSomeArguments } from '../common/osc.js'
import type { SomeCompanionConfigField } from '../module-api/config.js'
import type { LogLevel, InstanceStatus } from '../module-api/enums.js'
import type { CompanionOptionValues, CompanionInputFieldBase } from '../module-api/input.js'
import type { CompanionButtonPresetDefinition, CompanionTextPresetDefinition } from '../module-api/preset.js'
import type { CompanionHTTPRequest, CompanionHTTPResponse } from '../module-api/http.js'
import type { SomeCompanionActionInputField } from '../module-api/action.js'
import type { CompanionVariableValue } from '../module-api/variable.js'
import type { RemoteInfo } from 'dgram'
import type { OptionsObject } from '../util.js'
import type { JsonValue } from '../common/json-value.js'

export interface ModuleToHostEventsV0 extends ModuleToHostEventsV0SharedSocket {
	/** The connection has a message for the Companion log */
	'log-message': (msg: LogMessageMessage) => never
	/** The connection status has changed */
	'set-status': (msg: SetStatusMessage) => never
	/** The actions available in the connection have changed */
	setActionDefinitions: (msg: SetActionDefinitionsMessage) => never
	/** The feedbacks available in the connection have changed */
	setFeedbackDefinitions: (msg: SetFeedbackDefinitionsMessage) => never
	/** The varaibles available in the connection have changed */
	setVariableDefinitions: (msg: SetVariableDefinitionsMessage) => never
	/** The presets provided by the connection have changed */
	setPresetDefinitions: (msg: SetPresetDefinitionsMessage) => never
	/** The connection has some new values for variables */
	setVariableValues: (msg: SetVariableValuesMessage) => never
	/** The connection has some new values for feedbacks it is running */
	updateFeedbackValues: (msg: UpdateFeedbackValuesMessage) => never
	/** The connection has updated its config, which should be persisted */
	saveConfig: (msg: SaveConfigMessage) => never
	/** Send an OSC message from the default osc listener in companion */
	'send-osc': (msg: SendOscMessage) => never
	/**
	 * Parse the variables in a string of text.
	 * This has been semi depricated in favor of the companion parsing the options before the module.
	 */
	parseVariablesInString: (msg: ParseVariablesInStringMessage) => ParseVariablesInStringResponseMessage
	/**
	 * @deprecated Replaced with explicit upgrade call in 1.13.0
	 * The connection has upgraded some actions/feedbacks it has been informed about to a new version of its definitions
	 */
	upgradedItems: (msg: UpgradedDataResponseMessage) => void
	/** When the action-recorder is running, the module has recorded an action to add to the recorded stack */
	recordAction: (msg: RecordActionMessage) => never
	/**
	 * The connection has a new value for a custom variable
	 * Note: This should only be used by a few internal modules, it is not intended for general use
	 */
	setCustomVariable: (msg: SetCustomVariableMessage) => never
}
export interface ModuleToHostEventsV0SharedSocket {
	sharedUdpSocketJoin: (msg: SharedUdpSocketMessageJoin) => string
	sharedUdpSocketLeave: (msg: SharedUdpSocketMessageLeave) => void
	sharedUdpSocketSend: (msg: SharedUdpSocketMessageSend) => void
}

export interface HostToModuleEventsV0 extends HostToModuleEventsV0SharedSocket {
	/** Initialise the connection with the given config and label */
	init: (msg: InitMessage) => InitResponseMessage
	/** Cleanup the connection in preparation for the thread/process to be terminated */
	destroy: (msg: Record<string, never>) => void
	/**
	 * @deprecated Replaced with updateConfigAndLabel in 1.2.0
	 * This is the same as `updateConfigAndLabel` but without the label
	 */
	updateConfig: (config: unknown) => void
	/** The connection config or label has been updated by the user */
	updateConfigAndLabel: (msg: UpdateConfigAndLabelMessage) => void
	/**
	 * Some feedbacks for this connection have been created/updated/removed. This will start them being executed, watching for state changes in the connection and any referenced variables
	 * Since 1.13.0, the options will have variables pre-parsed. Subscribe/unsubscribe would be called as needed, and the feedbacks would start to be executed
	 * Prior to 1.13.0, this would also run upgrade scripts on the feedbacks
	 */
	updateFeedbacks: (msg: UpdateFeedbackInstancesMessage) => void
	/**
	 * Some actions for this connection have been created/updated/removed
	 * Since 1.13.0, the options will have variables pre-parsed. Subscribe/unsubscribe would be called as needed
	 * Prior to 1.13.0, this would also run upgrade scripts on the actions
	 */
	updateActions: (msg: UpdateActionInstancesMessage) => void
	/**
	 * Run the upgrade scripts for the provided actions and feedbacks
	 * Available since 1.13.0. Prior to this, the upgrade scripts would be run as part of the `updateActions` and `updateFeedbacks` calls
	 * The options objects provided here are in their 'raw' form, and can contain expressions
	 */
	upgradeActionsAndFeedbacks: (
		msg: UpgradeActionAndFeedbackInstancesMessage,
	) => UpgradeActionAndFeedbackInstancesResponse
	/** Execute an action */
	executeAction: (msg: ExecuteActionMessage) => void
	/** Get the config fields for this connection */
	getConfigFields: (msg: GetConfigFieldsMessage) => GetConfigFieldsResponseMessage
	/** Handle an incoming HTTP request */
	handleHttpRequest: (msg: HandleHttpRequestMessage) => HandleHttpRequestResponseMessage
	/**
	 * Learn the options for an action
	 * This allows the module to update the options for an action based on the current state of the device
	 */
	learnAction: (msg: LearnActionMessage) => LearnActionResponseMessage
	/**
	 * Learn the options for an feedback
	 * This allows the module to update the options for an feedback based on the current state of the device
	 */
	learnFeedback: (msg: LearnFeedbackMessage) => LearnFeedbackResponseMessage
	/**
	 * Start or stop the action-recorder.
	 * When running, this lets the connection emit `recordAction` events when the state of the device changes.
	 * This allows users to record macros of actions for their device by changing properties on the device itself.
	 */
	startStopRecordActions: (msg: StartStopRecordActionsMessage) => void
	/**
	 * @deprecated Replaced by companion parsing the options before the module in 1.13?.0
	 * Prior to 1.13.0, this would notify the module that a variable it had parsed during a feedback had changed and let it re-run the feedback
	 */
	variablesChanged: (msg: VariablesChangedMessage) => never
}
export interface HostToModuleEventsV0SharedSocket {
	sharedUdpSocketMessage: (msg: SharedUdpSocketMessage) => never
	sharedUdpSocketError: (msg: SharedUdpSocketError) => never
}

export type EncodeIsVisible<T extends CompanionInputFieldBase> = Omit<T, 'isVisible' | 'isVisibleExpression'> & {
	isVisibleFn?: string
	isVisibleFnType?: 'function' | 'expression'
}

export interface InitMessage {
	label: string
	isFirstInit: boolean
	config: unknown
	secrets: unknown

	lastUpgradeIndex: number

	/** @deprecated not populated/used since 1.13.0 */
	feedbacks: { [id: string]: FeedbackInstance | undefined }
	/** @deprecated not populated/used since 1.13.0 */
	actions: { [id: string]: ActionInstance | undefined }
}
export interface InitResponseMessage {
	hasHttpHandler: boolean
	hasRecordActionsHandler: boolean
	newUpgradeIndex: number

	updatedConfig: unknown | undefined
	updatedSecrets: unknown | undefined
}

export interface UpgradedDataResponseMessage {
	updatedFeedbacks: {
		[id: string]:
			| (FeedbackInstanceBase & {
					controlId: string
					style?: Partial<CompanionFeedbackButtonStyleResult>
					isInverted: boolean
			  })
			| undefined
	}
	updatedActions: { [id: string]: (ActionInstanceBase & { controlId: string }) | undefined }
}

export type GetConfigFieldsMessage = Record<string, never>
export type SomeEncodedCompanionConfigField = EncodeIsVisible<SomeCompanionConfigField>
export interface GetConfigFieldsResponseMessage {
	fields: SomeEncodedCompanionConfigField[]
}
export interface LogMessageMessage {
	level: LogLevel
	message: string
}

export interface SetStatusMessage {
	status: InstanceStatus
	message: string | null
}

export interface SetActionDefinitionsMessage {
	actions: Array<{
		id: string
		name: string
		description: string | undefined
		options: EncodeIsVisible<SomeCompanionActionInputField>[] // TODO module-lib - versioned types?
		optionsToIgnoreForSubscribe: string[] | undefined // Since 1.13.0
		hasLearn: boolean
		learnTimeout: number | undefined
		hasLifecycleFunctions: boolean // Since 1.12.0
	}>
}

export interface SetFeedbackDefinitionsMessage {
	feedbacks: Array<{
		id: string
		name: string
		description: string | undefined
		options: EncodeIsVisible<SomeCompanionFeedbackInputField>[] // TODO module-lib - versioned types?
		type: 'boolean' | 'value' | 'advanced'
		defaultStyle?: CompanionFeedbackButtonStyleResult
		hasLearn: boolean
		showInvert: boolean | undefined
		learnTimeout: number | undefined
	}>
}

export interface SetVariableDefinitionsMessage {
	variables: Array<{
		id: string
		name: string
	}>
	/** New in v1.7, optionally set values for variables at the same tiem */
	newValues?: Array<{
		id: string
		value: string | number | boolean | undefined
	}>
}

export interface SetPresetDefinitionsMessage {
	presets: Array<(CompanionButtonPresetDefinition | CompanionTextPresetDefinition) & { id: string }>
}

export interface SetVariableValuesMessage {
	newValues: Array<{
		id: string
		value: string | number | boolean | undefined
	}>
}

export interface ExecuteActionMessage {
	action: ActionInstance

	/** Identifier of the surface which triggered this action */
	surfaceId: string | undefined
}

export interface UpdateFeedbackValuesMessage {
	values: Array<{
		id: string
		controlId: string
		value: JsonValue | Partial<CompanionFeedbackButtonStyleResult> | undefined
	}>
}

export interface FeedbackInstanceBase {
	id: string

	// If this is pending being run through upgrade scripts, the version it needs upgraded from is tracked here
	upgradeIndex: number | null
	disabled: boolean

	feedbackId: string // aka 'type'
	options: OptionsObject
}

export interface FeedbackInstance extends FeedbackInstanceBase {
	controlId: string

	isInverted: boolean

	/** If control supports an imageBuffer, the dimensions the buffer must be */
	image?: {
		width: number
		height: number
	}
}

export interface UpdateConfigAndLabelMessage {
	label: string
	config: unknown | undefined
	secrets: unknown | undefined
}

export interface UpdateFeedbackInstancesMessage {
	feedbacks: { [id: string]: FeedbackInstance | null | undefined }
}

export interface ActionInstanceBase {
	id: string

	// If this is pending being run through upgrade scripts, the version it needs upgraded from is tracked here
	upgradeIndex: number | null
	disabled: boolean

	actionId: string // aka 'type'
	options: OptionsObject
}
export interface ActionInstance extends ActionInstanceBase {
	controlId: string
}

export interface UpdateActionInstancesMessage {
	actions: { [id: string]: ActionInstance | null | undefined }
}

export interface UpgradeActionInstance extends Omit<ActionInstanceBase, 'options'> {
	options: OptionsObject

	controlId: string
}
export interface UpgradeFeedbackInstance extends Omit<FeedbackInstanceBase, 'options'> {
	options: OptionsObject

	isInverted: boolean

	/**
	 * Only used as an output from the module, when the feedback is being converted to a boolean feedback
	 */
	style?: Partial<CompanionFeedbackButtonStyleResult>

	controlId: string
}

export interface UpgradeActionAndFeedbackInstancesMessage {
	actions: UpgradeActionInstance[]
	feedbacks: UpgradeFeedbackInstance[]
	defaultUpgradeIndex: number | null
}

export interface UpgradeActionAndFeedbackInstancesResponse {
	updatedConfig: unknown
	updatedSecrets: unknown
	updatedActions: UpgradeActionInstance[]
	updatedFeedbacks: UpgradeFeedbackInstance[]
	latestUpgradeIndex: number
}

export interface SaveConfigMessage {
	config: unknown | undefined
	secrets: unknown | undefined
}

export interface SendOscMessage {
	host: string
	port: number
	path: string
	args: OSCSomeArguments
}

export interface ParseVariablesInStringMessage {
	text: string
	controlId: string | undefined
	feedbackInstanceId: string | undefined
	actionInstanceId: string | undefined
}
export interface ParseVariablesInStringResponseMessage {
	text: string
	variableIds: string[] | undefined
}

export interface HandleHttpRequestMessage {
	request: CompanionHTTPRequest
}
export interface HandleHttpRequestResponseMessage {
	response: CompanionHTTPResponse
}

export interface LearnActionMessage {
	action: ActionInstance
}
export interface LearnActionResponseMessage {
	options: CompanionOptionValues | undefined
}

export interface LearnFeedbackMessage {
	feedback: FeedbackInstance
}
export interface LearnFeedbackResponseMessage {
	options: CompanionOptionValues | undefined
}

export interface StartStopRecordActionsMessage {
	recording: boolean
}

export interface RecordActionMessage {
	uniquenessId: string | null
	actionId: string
	options: CompanionOptionValues
	delay: number | undefined
}

export interface SetCustomVariableMessage {
	customVariableId: string
	value: CompanionVariableValue

	/** Control the variable was set from. This should always be defined, but did not exist in older versions */
	controlId: string | undefined
}

export interface VariablesChangedMessage {
	variablesIds: string[]
}

export interface SharedUdpSocketMessageJoin {
	family: 'udp4' | 'udp6'
	portNumber: number
	// TODO - more props?
}
export interface SharedUdpSocketMessageLeave {
	handleId: string
}
export interface SharedUdpSocketMessageSend {
	handleId: string
	message: Buffer

	address: string
	port: number
}

export interface SharedUdpSocketMessage {
	handleId: string
	portNumber: number

	message: Buffer
	source: RemoteInfo
}

export interface SharedUdpSocketError {
	handleId: string
	portNumber: number

	error: Error
}
