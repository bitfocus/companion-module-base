import type {
	CompanionButtonPresetDefinition,
	CompanionFeedbackButtonStyleResult,
	CompanionInputFieldBase,
	CompanionOptionValues,
	CompanionRecordedAction,
	CompanionTextPresetDefinition,
	CompanionVariableValue,
	InstanceStatus,
	JsonValue,
	OptionsObject,
	SomeCompanionActionInputField,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'

export interface ModuleHostContext<TConfig, TSecrets> {
	/** The connection status has changed */
	setStatus: (status: InstanceStatus, message: string | null) => void
	/** The actions available in the connection have changed */
	setActionDefinitions: (actions: HostActionDefinition[]) => void
	/** The feedbacks available in the connection have changed */
	setFeedbackDefinitions: (feedbacks: HostFeedbackDefinition[]) => void
	/** The varaibles available in the connection have changed */
	setVariableDefinitions: (definitions: HostVariableDefinition[], values: HostVariableValue[]) => void
	/** The presets provided by the connection have changed */
	setPresetDefinitions: (
		presets: Array<(CompanionButtonPresetDefinition | CompanionTextPresetDefinition) & { id: string }>, // TODO - isolate types
	) => void
	/** The connection has some new values for variables */
	setVariableValues: (values: HostVariableValue[]) => void
	/** The connection has some new values for feedbacks it is running */
	updateFeedbackValues: (values: HostFeedbackValue[]) => void
	/** The connection has updated its config, which should be persisted */
	saveConfig(newConfig: TConfig | undefined, newSecrets: TSecrets | undefined): Promise<void>
	/** Send an OSC message from the default osc listener in companion */
	'send-osc': (msg: SendOscMessage) => void
	/**
	 * Parse the variables in a string of text.
	 * This has been semi depricated in favor of the companion parsing the options before the module.
	 */
	parseVariablesInString: (text: string, info: ParseVariablesInfo) => Promise<string>
	/** When the action-recorder is running, the module has recorded an action to add to the recorded stack */
	recordAction: (action: CompanionRecordedAction, uniquenessId: string | undefined) => void
	/**
	 * The connection has a new value for a custom variable
	 * Note: This should only be used by a few internal modules, it is not intended for general use
	 */
	setCustomVariable: (controlId: string, variableId: string, value: CompanionVariableValue | undefined) => void
}

export type EncodeIsVisible<T extends CompanionInputFieldBase> = Omit<T, 'isVisible' | 'isVisibleExpression'> & {
	isVisibleFn?: string
	isVisibleFnType?: 'function' | 'expression'
}

// export type GetConfigFieldsMessage = Record<string, never>
// export type SomeEncodedCompanionConfigField = EncodeIsVisible<SomeCompanionConfigField>
// export interface GetConfigFieldsResponseMessage {
// 	fields: SomeEncodedCompanionConfigField[]
// }
// export interface LogMessageMessage {
// 	level: LogLevel
// 	message: string
// }

export interface HostActionDefinition {
	id: string
	name: string
	description: string | undefined
	options: EncodeIsVisible<SomeCompanionActionInputField>[] // TODO module-lib - versioned types?
	optionsToIgnoreForSubscribe: string[] | undefined
	hasLearn: boolean
	learnTimeout: number | undefined
	hasLifecycleFunctions: boolean
}

export interface HostFeedbackDefinition {
	id: string
	name: string
	description: string | undefined
	options: EncodeIsVisible<SomeCompanionFeedbackInputField>[] // TODO module-lib - versioned types?
	type: 'boolean' | 'value' | 'advanced'
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
	value: string | number | boolean | undefined
}

// export interface SetPresetDefinitionsMessage {
// 	presets: Array<(CompanionButtonPresetDefinition | CompanionTextPresetDefinition) & { id: string }>
// }

// export interface ExecuteActionMessage {
// 	action: ActionInstance

// 	/** Identifier of the surface which triggered this action */
// 	surfaceId: string | undefined
// }

// export interface ExecuteActionResponseMessage {
// 	success: boolean
// 	/** If success=false, a reason for the failure */
// 	errorMessage: string | undefined
// }

export interface HostFeedbackValue {
	id: string
	controlId: string
	value: JsonValue | Partial<CompanionFeedbackButtonStyleResult> | undefined
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

// export interface UpdateConfigAndLabelMessage {
// 	label: string
// 	config: unknown | undefined
// 	secrets: unknown | undefined
// }

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

// export interface UpgradeActionInstance extends Omit<ActionInstanceBase, 'options'> {
// 	options: OptionsObject

// 	controlId: string
// }
// export interface UpgradeFeedbackInstance extends Omit<FeedbackInstanceBase, 'options'> {
// 	options: OptionsObject

// 	isInverted: boolean

// 	/**
// 	 * Only used as an output from the module, when the feedback is being converted to a boolean feedback
// 	 */
// 	style?: Partial<CompanionFeedbackButtonStyleResult>

// 	controlId: string
// }

// export interface UpgradeActionAndFeedbackInstancesMessage {
// 	actions: UpgradeActionInstance[]
// 	feedbacks: UpgradeFeedbackInstance[]
// 	defaultUpgradeIndex: number | null
// }

// export interface UpgradeActionAndFeedbackInstancesResponse {
// 	updatedConfig: unknown
// 	updatedSecrets: unknown
// 	updatedActions: UpgradeActionInstance[]
// 	updatedFeedbacks: UpgradeFeedbackInstance[]
// 	latestUpgradeIndex: number
// }

// export interface SendOscMessage {
// 	host: string
// 	port: number
// 	path: string
// 	args: OSCSomeArguments
// }

export interface ParseVariablesInfo {
	controlId: string | undefined
	feedbackInstanceId: string | undefined
	actionInstanceId: string | undefined
}
// export interface HandleHttpRequestMessage {
// 	request: CompanionHTTPRequest
// }
// export interface HandleHttpRequestResponseMessage {
// 	response: CompanionHTTPResponse
// }

// export interface LearnActionMessage {
// 	action: ActionInstance
// }
// export interface LearnActionResponseMessage {
// 	options: CompanionOptionValues | undefined
// }

// export interface LearnFeedbackMessage {
// 	feedback: FeedbackInstance
// }
// export interface LearnFeedbackResponseMessage {
// 	options: CompanionOptionValues | undefined
// }

// export interface StartStopRecordActionsMessage {
// 	recording: boolean
// }

export interface RecordActionMessage {
	uniquenessId: string | null
	actionId: string
	options: CompanionOptionValues
	delay: number | undefined
}
