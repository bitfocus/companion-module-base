import type { InstanceTypes } from '../base.js'
import type { CompanionPresetDefinition } from './definition.js'

export * from './definition.js'
export * from './structure.js'

/**
 * The definitions of a group of feedbacks
 */
export type CompanionPresetDefinitions<TManifest extends InstanceTypes = InstanceTypes> = {
	[id: string]: CompanionPresetDefinition<TManifest> | undefined
}
