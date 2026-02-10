import { InstanceTypes } from '../base.js'

export type CompanionPresetGroup<TManifest extends InstanceTypes = InstanceTypes> =
	CompanionPresetGroupCustom<TManifest> // | CompanionPresetGroupMatrix

export interface CompanionPresetGroupCustom<
	_TManifest extends InstanceTypes = InstanceTypes,
> extends CompanionPresetGroupBase<'custom'> {
	/**
	 * The preset ids which are part of this group
	 */
	presets: string[]
}

export interface CompanionPresetGroupBase<TType extends string> {
	/**
	 * Unique identifier for the preset
	 * This should be stable across updates to the presets
	 */
	id: string

	/**
	 * The type of the preset group
	 */
	type: TType

	/**
	 * A name for this preset group
	 */
	name: string

	/**
	 * A description of the preset group
	 */
	description?: string

	/**
	 * Keywords for the preset
	 * This is extra search terms to allow users to find the right preset
	 */
	keywords?: string[]
}

export interface CompanionPresetSection<TManifest extends InstanceTypes = InstanceTypes> {
	id: string
	name: string

	/**
	 * A description of the category, to be shown above the presets
	 */
	description?: string

	/**
	 * The definitions of presets or groups in this category
	 */
	definitions: CompanionPresetGroup<TManifest>[] | string[]

	/**
	 * Keywords for the preset
	 * This is extra search terms to allow users to find the right preset
	 */
	keywords?: string[]
}
