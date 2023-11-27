/**
 * Warning: these types are intentionally semi-isolated from the module-api folder.
 * While it causes a lot of duplicate typings and requires us to do translation of types,
 * it allows for us to be selective as to whether a change impacts the module api or the host api.
 * This will allow for cleaner and more stable apis which can both evolve at different rates
 */

import { CompanionFeedbackButtonStyleResult, SomeCompanionFeedbackInputField } from '../module-api/feedback'
import { OSCSomeArguments } from '../common/osc'
import { SomeCompanionConfigField } from '../module-api/config'
import { LogLevel, InstanceStatus } from '../module-api/enums'
import { InputValue, CompanionOptionValues, CompanionInputFieldBase } from '../module-api/input'
import { CompanionButtonPresetDefinition } from '../module-api/preset'
import { CompanionHTTPRequest, CompanionHTTPResponse } from '../module-api/http'
import { SomeCompanionActionInputField } from '../module-api/action'
import { CompanionVariableValue } from '../module-api/variable'

export interface ModuleToHostEventsV0 {
	'log-message': (msg: LogMessageMessage) => never
	'set-status': (msg: SetStatusMessage) => never
	setActionDefinitions: (msg: SetActionDefinitionsMessage) => never
	setFeedbackDefinitions: (msg: SetFeedbackDefinitionsMessage) => never
	setVariableDefinitions: (msg: SetVariableDefinitionsMessage) => never
	setPresetDefinitions: (msg: SetPresetDefinitionsMessage) => never
	setVariableValues: (msg: SetVariableValuesMessage) => never
	updateFeedbackValues: (msg: UpdateFeedbackValuesMessage) => never
	saveConfig: (msg: SaveConfigMessage) => never
	'send-osc': (msg: SendOscMessage) => never
	parseVariablesInString: (msg: ParseVariablesInStringMessage) => ParseVariablesInStringResponseMessage
	upgradedItems: (msg: UpgradedDataResponseMessage) => void
	recordAction: (msg: RecordActionMessage) => never
	setCustomVariable: (msg: SetCustomVariableMessage) => never
}

export interface HostToModuleEventsV0 {
	init: (msg: InitMessage) => InitResponseMessage
	destroy: (msg: Record<string, never>) => void
	/** @deprecated */
	updateConfig: (config: unknown) => void
	updateConfigAndLabel: (msg: UpdateConfigAndLabelMessage) => void
	updateFeedbacks: (msg: UpdateFeedbackInstancesMessage) => void
	updateActions: (msg: UpdateActionInstancesMessage) => void
	executeAction: (msg: ExecuteActionMessage) => void
	getConfigFields: (msg: GetConfigFieldsMessage) => GetConfigFieldsResponseMessage
	handleHttpRequest: (msg: HandleHttpRequestMessage) => HandleHttpRequestResponseMessage
	learnAction: (msg: LearnActionMessage) => LearnActionResponseMessage
	learnFeedback: (msg: LearnFeedbackMessage) => LearnFeedbackResponseMessage
	startStopRecordActions: (msg: StartStopRecordActionsMessage) => void
	variablesChanged: (msg: VariablesChangedMessage) => never
}

export type EncodeIsVisible<T extends CompanionInputFieldBase> = Omit<T, 'isVisible'> & {
	isVisibleFn?: string
}

export interface InitMessage {
	label: string
	isFirstInit: boolean
	config: unknown

	lastUpgradeIndex: number

	feedbacks: { [id: string]: FeedbackInstance | undefined }
	actions: { [id: string]: ActionInstance | undefined }
}
export interface InitResponseMessage {
	hasHttpHandler: boolean
	hasRecordActionsHandler: boolean
	newUpgradeIndex: number

	updatedConfig: unknown | undefined
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
		hasLearn: boolean
		learnTimeout: number | undefined
	}>
}

export interface SetFeedbackDefinitionsMessage {
	feedbacks: Array<{
		id: string
		name: string
		description: string | undefined
		options: EncodeIsVisible<SomeCompanionFeedbackInputField>[] // TODO module-lib - versioned types?
		type: 'boolean' | 'advanced'
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
}

export interface SetPresetDefinitionsMessage {
	presets: Array<CompanionButtonPresetDefinition & { id: string }>
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

	/** @deprecated will be removed in favor of `surfaceId` soon */
	deviceId: string | undefined
}

export interface UpdateFeedbackValuesMessage {
	values: Array<{
		id: string
		controlId: string
		value: boolean | Partial<CompanionFeedbackButtonStyleResult> | undefined
	}>
}

export interface FeedbackInstanceBase {
	id: string

	// If this is pending being run through upgrade scripts, the version it needs upgraded from is tracked here
	upgradeIndex: number | null
	disabled: boolean

	feedbackId: string // aka 'type'
	options: { [key: string]: InputValue | undefined }
}

export interface FeedbackInstance extends FeedbackInstanceBase {
	controlId: string

	isInverted: boolean

	/** If control supports an imageBuffer, the dimensions the buffer must be */
	image?: {
		width: number
		height: number
	}

	/** @deprecated */
	page: number
	/** @deprecated */
	bank: number

	/** @deprecated */
	rawBank: any
}

export interface UpdateConfigAndLabelMessage {
	label: string
	config: unknown
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
	options: { [key: string]: InputValue | undefined }
}
export interface ActionInstance extends ActionInstanceBase {
	controlId: string

	/** @deprecated */
	page: number | null
	/** @deprecated */
	bank: number | null
}

export interface UpdateActionInstancesMessage {
	actions: { [id: string]: ActionInstance | null | undefined }
}

export interface SaveConfigMessage {
	config: unknown
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
}

export interface SetCustomVariableMessage {
	customVariableId: string
	value: CompanionVariableValue
}

export interface VariablesChangedMessage {
	variablesIds: string[]
}
