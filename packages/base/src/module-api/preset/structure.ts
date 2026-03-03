import { InstanceTypes } from '../base.js'
import { CompanionVariableValue, CompanionVariableValues } from '../variable.js'

export type CompanionPresetGroup<TManifest extends InstanceTypes = InstanceTypes> =
	| CompanionPresetGroupSimple<TManifest>
	| CompanionPresetGroupTemplate<TManifest>

export type CompanionPresetReference = string

export interface CompanionPresetGroupSimple<
	_TManifest extends InstanceTypes = InstanceTypes,
> extends CompanionPresetGroupBase<'simple'> {
	/**
	 * The preset ids which are part of this group
	 */
	presets: CompanionPresetReference[]
}

/**
 * A preset which generates a series of buttons from a matrix of values
 * Tip: This allows you to avoid generating repetitive presets which vary just by a few simple values
 */
export interface CompanionPresetGroupTemplate<
	_TManifest extends InstanceTypes = InstanceTypes,
> extends CompanionPresetGroupBase<'template'> {
	/**
	 * The id of preset definition to use as the template for this group
	 */
	presetId: CompanionPresetReference

	/**
	 * The name of the local variable on the template which will be replaced by the values
	 */
	templateVariableName: string
	/**
	 * The values to inject into the template, to generate presets for each value
	 */
	templateValues: {
		/**
		 * An optional name for the preset, to be shown in the UI, if not provided the name of the referenced preset will be used instead
		 */
		name?: string

		/**
		 * The value to inject into the template variable
		 */
		value: CompanionVariableValue
	}[]

	/**
	 * Local variable values to override on the template
	 */
	commonVariableValues?: CompanionVariableValues
}

export interface CompanionPresetGroupBase<TType extends string> {
	/**
	 * Unique identifier for the preset group
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
	/**
	 * Unique identifier for the preset section
	 * This should be stable across updates to the presets
	 */
	id: string

	/**
	 * The name of the section of presets, to be shown above the presets
	 */
	name: string

	/**
	 * A description of the section, to be shown above the presets
	 */
	description?: string

	/**
	 * The definitions of presets or groups in this section
	 * This can either be an array of groups, or a direct array of preset references, which will be shown without grouping
	 */
	definitions: CompanionPresetGroup<TManifest>[] | CompanionPresetReference[]

	/**
	 * Keywords for the preset
	 * This is extra search terms to allow users to find the right preset
	 */
	keywords?: string[]
}
