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
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionRecordedAction,
	CompanionStaticUpgradeScript,
	CompanionVariableDefinition,
	InstanceStatus,
	InstanceTypes,
} from '../module-api/index.js'
import type { OSCSomeArguments } from '../common/osc.js'
import type { SharedUdpSocketImpl } from '../module-api/shared-udp-socket.js'
import type { StringKeys } from '../util.js'

export function isInstanceContext<TManifest extends InstanceTypes>(obj: unknown): obj is InstanceContext<TManifest> {
	const obj2 = obj as InstanceContext<TManifest>
	return !!obj2 && typeof obj2 === 'object' && typeof obj2.id === 'string' && obj2._isInstanceContext === true
}

export interface InstanceContext<TManifest extends InstanceTypes> extends InstanceSharedUdpSocketContext {
	readonly _isInstanceContext: true
	readonly id: string
	label: string

	readonly upgradeScripts: CompanionStaticUpgradeScript<TManifest['config'], TManifest['secrets']>[]

	saveConfig: (config: TManifest['config'] | undefined, secrets: TManifest['secrets'] | undefined) => void
	updateStatus(status: InstanceStatus, message: string | null): void
	oscSend(host: string, port: number, path: string, args: OSCSomeArguments): void

	recordAction(action: CompanionRecordedAction, uniquenessId?: string): void

	setActionDefinitions: (actions: CompanionActionDefinitions<TManifest['actions']>) => void
	subscribeActions: (actionIds: string[]) => void
	unsubscribeActions: (actionIds: string[]) => void

	setFeedbackDefinitions: (feedbacks: CompanionFeedbackDefinitions<TManifest['feedbacks']>) => void
	unsubscribeFeedbacks: (feedbackIds: string[]) => void
	checkFeedbacks: (feedbackTypes: StringKeys<TManifest['feedbacks']>[]) => void
	checkFeedbacksById: (feedbackIds: string[]) => void

	setPresetDefinitions: (
		structure: CompanionPresetSection<TManifest>[],
		presets: CompanionPresetDefinitions<TManifest>,
	) => void

	setVariableDefinitions: (variables: CompanionVariableDefinition[]) => void
	setVariableValues: (values: Partial<TManifest['variables']>) => void
	getVariableValue: <T extends string>(variableId: T) => TManifest['variables'][T] | undefined
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
