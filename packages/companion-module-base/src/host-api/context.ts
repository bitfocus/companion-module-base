/**
 * Warning: these types are intentionally semi-isolated from the module-api folder.
 * While it causes a lot of duplicate typings and requires us to do translation of types,
 * it allows for us to be selective as to whether a change impacts the module api or the host api.
 * This will allow for cleaner and more stable apis which can both evolve at different rates
 */

import type { RemoteInfo } from 'dgram'
import type {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	CompanionGraphicsCompositeElementDefinition,
	CompanionPresetDefinitions,
	CompanionRecordedAction,
	CompanionStaticUpgradeScript,
	CompanionVariableDefinition,
	CompanionVariableValue,
	CompanionVariableValues,
	InstanceStatus,
} from '../module-api/index.js'
import type { OSCSomeArguments } from '../common/osc.js'
import type { SharedUdpSocketImpl } from '../module-api/shared-udp-socket.js'
import type { JsonObject } from '../common/json-value.js'

export function isInstanceContext<TConfig extends JsonObject, TSecrets extends JsonObject | undefined>(
	obj: unknown,
): obj is InstanceContext<TConfig, TSecrets> {
	const obj2 = obj as InstanceContext<TConfig, TSecrets>
	return typeof obj2 === 'object' && typeof obj2.id === 'string' && obj2._isInstanceContext === true
}

export interface InstanceContext<
	TConfig extends JsonObject,
	TSecrets extends JsonObject | undefined,
> extends InstanceSharedUdpSocketContext {
	readonly _isInstanceContext: true
	readonly id: string
	label: string

	readonly upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[]

	saveConfig: (config: TConfig | undefined, secrets: TSecrets | undefined) => void
	updateStatus(status: InstanceStatus, message: string | null): void
	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void

	recordAction(action: CompanionRecordedAction, uniquenessId?: string): void

	setActionDefinitions: (actions: CompanionActionDefinitions) => void
	subscribeActions: (actionIds: string[]) => void
	unsubscribeActions: (actionIds: string[]) => void

	setFeedbackDefinitions: (feedbacks: CompanionFeedbackDefinitions) => void
	unsubscribeFeedbacks: (feedbackIds: string[]) => void
	checkFeedbacks: (feedbackTypes: string[]) => void
	checkFeedbacksById: (feedbackIds: string[]) => void

	setPresetDefinitions: (presets: CompanionPresetDefinitions) => void
	setCompositeElementDefinitions: (compositeElements: CompanionGraphicsCompositeElementDefinition[]) => void

	setVariableDefinitions: (variables: CompanionVariableDefinition[]) => void
	setVariableValues: (values: CompanionVariableValues) => void
	getVariableValue: (variableId: string) => CompanionVariableValue | undefined
}

export interface InstanceSharedUdpSocketContext {
	readonly sharedUdpSocketHandlers: Map<string, SharedUdpSocketImpl>

	sharedUdpSocketJoin: (msg: SharedUdpSocketMessageJoin) => Promise<string>
	sharedUdpSocketLeave: (msg: SharedUdpSocketMessageLeave) => Promise<void>
	sharedUdpSocketSend: (msg: SharedUdpSocketMessageSend) => Promise<void>
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
