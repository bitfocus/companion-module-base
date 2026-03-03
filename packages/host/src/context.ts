import type {
	CompanionFeedbackButtonStyleResult,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionRecordedAction,
	CompanionVariableValue,
	InstanceStatus,
	JsonValue,
	ExpressionOptionsObject,
	CompanionOptionValues,
	OSCSomeArguments,
	SomeCompanionActionInputField,
	SomeCompanionFeedbackInputField,
	ExpressionOrValue,
} from '@companion-module/base'
import {
	SharedUdpSocketMessageJoin,
	SharedUdpSocketMessageLeave,
	SharedUdpSocketMessageSend,
} from '@companion-module/base/host-api'

export interface ModuleHostContext<TConfig, TSecrets> {
	/** The connection status has changed */
	setStatus: (status: InstanceStatus, message: string | null) => void
	/** The actions available in the connection have changed */
	setActionDefinitions: (actions: HostActionDefinition[]) => void
	/** The feedbacks available in the connection have changed */
	setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void
	/** The variables available in the connection have changed */
	setVariableDefinitions: (definitions: HostVariableDefinition[], values: HostVariableValue[]) => void
	/** The presets provided by the connection have changed */
	setPresetDefinitions: (structure: CompanionPresetSection[], presets: CompanionPresetDefinitions) => void
	/** The connection has some new values for variables */
	setVariableValues: (values: HostVariableValue[]) => void
	/** The connection has some new values for feedbacks it is running */
	updateFeedbackValues: (values: HostFeedbackValue[]) => void
	/** The connection has updated its config, which should be persisted */
	saveConfig(newConfig: TConfig | undefined, newSecrets: TSecrets | undefined): void
	/** Send an OSC message from the default osc listener in companion */
	sendOSC: (host: string, port: number, path: string, args: OSCSomeArguments) => void
	/** When the action-recorder is running, the module has recorded an action to add to the recorded stack */
	recordAction: (action: CompanionRecordedAction, uniquenessId: string | undefined) => void
	/**
	 * The connection has a new value for a custom variable
	 * Note: This should only be used by a few internal modules, it is not intended for general use
	 */
	setCustomVariable: (controlId: string, variableId: string, value: CompanionVariableValue | undefined) => void

	sharedUdpSocketJoin: (msg: SharedUdpSocketMessageJoin) => Promise<string>
	sharedUdpSocketLeave: (msg: SharedUdpSocketMessageLeave) => Promise<void>
	sharedUdpSocketSend: (msg: SharedUdpSocketMessageSend) => Promise<void>
}

export interface HostActionDefinition {
	id: string
	name: string
	sortName: string | undefined
	description: string | undefined
	options: SomeCompanionActionInputField[] // TODO module-lib - versioned types?
	optionsToMonitorForSubscribe: string[] | undefined
	hasLearn: boolean
	learnTimeout: number | undefined
	hasLifecycleFunctions: boolean
}

export type HostFeedbackType = 'boolean' | 'value' | 'advanced'

export interface HostFeedbackDefinition {
	id: string
	name: string
	sortName: string | undefined
	description: string | undefined
	options: SomeCompanionFeedbackInputField[] // TODO module-lib - versioned types?
	type: HostFeedbackType
	defaultStyle?: CompanionFeedbackButtonStyleResult
	hasLearn: boolean
	showInvert: boolean | undefined
	learnTimeout: number | undefined
}

export interface HostVariableDefinition {
	id: string
	name: string
}
export interface HostVariableValue {
	id: string
	value: JsonValue | undefined
}

export interface HostFeedbackValue {
	id: string
	controlId: string
	feedbackType: HostFeedbackType | undefined
	value: JsonValue | CompanionFeedbackButtonStyleResult | undefined
}

export interface FeedbackInstanceBase {
	id: string

	feedbackId: string // aka 'type'
	options: CompanionOptionValues
}

export interface FeedbackInstance extends FeedbackInstanceBase {
	controlId: string

	/** If control supports an imageBuffer, the dimensions the buffer must be */
	image?: {
		width: number
		height: number
	}
}

export interface ActionInstanceBase {
	id: string

	actionId: string // aka 'type'
	options: CompanionOptionValues
}
export interface ActionInstance extends ActionInstanceBase {
	controlId: string
}

export interface UpgradeActionInstance extends Omit<ActionInstanceBase, 'options'> {
	options: ExpressionOptionsObject

	controlId: string

	// If this is pending being run through upgrade scripts, the version it needs upgraded from is tracked here
	upgradeIndex: number | null
}
export interface UpgradeFeedbackInstance extends Omit<FeedbackInstanceBase, 'options'> {
	options: ExpressionOptionsObject

	isInverted: ExpressionOrValue<boolean> | undefined

	/**
	 * Only used as an output from the module, when the feedback is being converted to a boolean feedback
	 */
	style?: Partial<CompanionFeedbackButtonStyleResult>

	controlId: string

	// If this is pending being run through upgrade scripts, the version it needs upgraded from is tracked here
	upgradeIndex: number | null
}

export interface UpgradeActionAndFeedbackInstancesResponse {
	updatedConfig: unknown
	updatedSecrets: unknown
	updatedActions: UpgradeActionInstance[]
	updatedFeedbacks: UpgradeFeedbackInstance[]
	latestUpgradeIndex: number
}
