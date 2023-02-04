import type { OSCSomeArguments } from './common/osc'
import type {
	CompanionActionDefinitions,
	CompanionActionInfo,
	CompanionFeedbackDefinitions,
	CompanionPresetDefinitions,
	CompanionVariableDefinition,
	CompanionVariableValue,
	CompanionVariableValues,
	InstanceBase,
	InstanceStatus,
	LogLevel,
} from './module-api'
import { LegacyAction, LegacyFeedback } from './legacy-types'

export interface IActionManager {
	setActionDefinitions(actions: CompanionActionDefinitions): void

	/** @deprecated */
	_getAllActions(): LegacyAction[]

	subscribeActions(actionIds: string[]): void

	unsubscribeActions(actionIds: string[]): void
}

export interface IFeedbackManager {
	parseVariablesContext: string | undefined

	getDefinitionIds(): string[]
	getInstanceIds(): string[]

	setFeedbackDefinitions(feedbacks: CompanionFeedbackDefinitions): void

	checkFeedbacks(feedbackTypes: string[]): void

	checkFeedbacksById(feedbackIds: string[]): void

	/** @deprecated */
	_getAllFeedbacks(): LegacyFeedback[]

	subscribeFeedbacks(feedbackIds: string[]): void

	unsubscribeFeedbacks(feedbackIds: string[]): void
}

export interface InstanceBaseOptions {
	/**
	 * Disable enforcement of variables requiring a definition.
	 * It is not recommended to set this, unless you know what you are doing.
	 */
	disableVariableValidation: boolean
}

export interface CompanionInstanceApi<TConfig> {
	readonly connectionId: string

	readonly actionManager: IActionManager
	readonly feedbackManager: IFeedbackManager

	readonly instanceOptions: InstanceBaseOptions

	setInstance(instance: InstanceBase<TConfig>): void

	saveConfig(newConfig: TConfig): void

	setPresetDefinitions(presets: CompanionPresetDefinitions): void

	setVariableDefinitions(variables: CompanionVariableDefinition[]): void

	setVariableValues(values: CompanionVariableValues): void

	getVariableValue(variableId: string): CompanionVariableValue | undefined

	parseVariablesInString(text: string): Promise<string>

	recordAction(action: Omit<CompanionActionInfo, 'id' | 'controlId'>, uniquenessId?: string): void

	setCustomVariableValue(variableName: string, value: CompanionVariableValue): void

	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void

	updateStatus(status: InstanceStatus, message?: string | null): void

	log(level: LogLevel, message: string): void
}
