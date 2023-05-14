import { DropdownChoice, DropdownChoiceId } from './input'

export interface CompanionPropertyDefinitionBase<TValue, TType extends CompanionPropertyType> {
	name: string
	description: string

	type: TType

	/**
	 * Instances of this property.
	 * eg, channel number of the audio fader
	 * null if no instances
	 */
	instanceIds?: Array<DropdownChoice>
	// /**
	//  * Whether to allow custom instanceIds to be used
	//  * Can be set to either a regex to filter the allowed values, or true to allow any
	//  */
	// allowCustomInstanceIds?: string | boolean

	getValues?: (context: unknown) => Promise<TValue | Record<DropdownChoiceId, TValue>>
	setValue?: (instanceId: DropdownChoiceId | null, value: TValue, context: unknown) => Promise<void>

	//   subscribe: () => {...},
	//   unsubscribe: () => {...},
}

/**
 * The definition of a variable
 */
export type CompanionPropertyDefinition =
	| CompanionNumberPropertyDefinition
	| CompanionStringPropertyDefinition
	| CompanionBooleanPropertyDefinition
	| CompanionDropdownPropertyDefinition

export interface CompanionNumberPropertyDefinition
	extends CompanionPropertyDefinitionBase<number, CompanionPropertyType.Number> {
	/**
	 * The minimum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	min: number
	/**
	 * The maximum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	max: number

	/** The stepping of the arrows */
	step?: number

	/** Whether to show a slider for the input */
	range?: boolean
}
export interface CompanionStringPropertyDefinition
	extends CompanionPropertyDefinitionBase<string, CompanionPropertyType.String> {
	/**
	 * A regex to use to inform the user if the current input is valid.
	 * Note: values may not conform to this, it is a visual hint only
	 */
	regex?: string
}
export type CompanionBooleanPropertyDefinition = CompanionPropertyDefinitionBase<boolean, CompanionPropertyType.Boolean>
export interface CompanionDropdownPropertyDefinition
	extends CompanionPropertyDefinitionBase<DropdownChoiceId, CompanionPropertyType.Dropdown> {
	/** The possible choices */
	choices: DropdownChoice[]

	// TODO - refactor these to be tidier?

	/** Allow custom values to be defined by the user */
	allowCustom?: boolean
	/** Check custom value against regex */
	regex?: string

	/** The minimum number of entries the dropdown must have before it allows searching */
	// minChoicesForSearch?: number
}

export enum CompanionPropertyType {
	String = 'string',
	Number = 'number',
	Boolean = 'boolean',
	// ColorPicker = 'colorpicker', // TODO
	Dropdown = 'dropdown',
	// MultiDropdown = 'multidropdown', // TODO
}

/**
 * The value of a property
 */
export type CompanionPropertyValue = string | number | boolean

export interface CompanionPropertyDefinitions {
	[propertyId: string]: CompanionPropertyDefinition | undefined
}
