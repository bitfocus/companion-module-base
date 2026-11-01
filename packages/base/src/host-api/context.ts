/**
 * Warning: these types are intentionally semi-isolated from the module-api folder.
 * While it causes a lot of duplicate typings and requires us to do translation of types,
 * it allows for us to be selective as to whether a change impacts the module api or the host api.
 * This will allow for cleaner and more stable apis which can both evolve at different rates
 */

import type { RemoteInfo } from 'dgram'
import type { OSCSomeArguments } from '../common/osc.js'
import type {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	CompanionGraphicsCompositeElementDefinitions,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionRecordedAction,
	CompanionStaticUpgradeScript,
	CompanionVariableDefinitions,
	InstanceStatus,
	InstanceTypes,
} from '../module-api/index.js'
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

	/** @deprecated Retained for modules built against older versions of base. Use `updateActionDefinitions` */
	setActionDefinitions: (actions: CompanionActionDefinitions<TManifest['actions']>) => void
	/**
	 * Add, replace or remove some action definitions. Falsy values are removed
	 * @param replaceAll Whether any definitions not included should be removed
	 */
	updateActionDefinitions: (
		actions: Partial<CompanionActionDefinitions<TManifest['actions']>>,
		replaceAll: boolean,
	) => void
	subscribeActions: (actionIds: string[]) => void
	unsubscribeActions: (actionIds: string[]) => void

	/** @deprecated Retained for modules built against older versions of base. Use `updateFeedbackDefinitions` */
	setFeedbackDefinitions: (feedbacks: CompanionFeedbackDefinitions<TManifest['feedbacks']>) => void
	/**
	 * Add, replace or remove some feedback definitions. Falsy values are removed
	 * @param replaceAll Whether any definitions not included should be removed
	 */
	updateFeedbackDefinitions: (
		feedbacks: Partial<CompanionFeedbackDefinitions<TManifest['feedbacks']>>,
		replaceAll: boolean,
	) => void
	unsubscribeFeedbacks: (feedbackIds: string[]) => void
	checkFeedbacks: (feedbackTypes: StringKeys<TManifest['feedbacks']>[]) => void
	checkAllFeedbacks: () => void
	checkFeedbacksById: (feedbackIds: string[]) => void

	setPresetDefinitions: (
		structure: CompanionPresetSection<TManifest>[],
		presets: CompanionPresetDefinitions<TManifest>,
	) => void
	/** @deprecated Retained for modules built against older versions of base. Use `updateCompositeElementDefinitions` */
	setCompositeElementDefinitions: (
		compositeElements: CompanionGraphicsCompositeElementDefinitions<TManifest['compositeElements']>,
	) => void
	/**
	 * Add, replace or remove some composite element definitions. Falsy values are removed
	 * @param replaceAll Whether any definitions not included should be removed
	 */
	updateCompositeElementDefinitions: (
		compositeElements: Partial<CompanionGraphicsCompositeElementDefinitions<TManifest['compositeElements']>>,
		replaceAll: boolean,
	) => void

	/** @deprecated Retained for modules built against older versions of base. Use `updateVariableDefinitions` */
	setVariableDefinitions: (variables: CompanionVariableDefinitions<TManifest['variables']>) => void
	/**
	 * Add, replace or remove some variable definitions. Falsy values are removed
	 * @param replaceAll Whether any definitions not included should be removed
	 */
	updateVariableDefinitions: (
		variables: Partial<CompanionVariableDefinitions<TManifest['variables']>>,
		replaceAll: boolean,
	) => void
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
