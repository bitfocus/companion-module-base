import { DropdownChoice, DropdownChoiceId } from './input'

/**
 * The definition of a variable
 */
export interface CompanionPropertyDefinition<T extends CompanionPropertyValue = CompanionPropertyValue> {
	name: string
	description: string

	/** Of type CompanionPropertyType */
	type: CompanionPropertyValueToType<T>
	// min: number
	// max: number

	/**
	 * Instances of this property.
	 * eg, channel number of the audio fader
	 * null if no instances
	 */
	instanceIds?: Array<DropdownChoice>

	getValue?: (instanceId: DropdownChoiceId | null, context: unknown) => Promise<T>
	setValue?: (instanceId: DropdownChoiceId | null, value: T, context: unknown) => Promise<void>

	//   subscribe: () => {...},
	//   unsubscribe: () => {...},
}

export enum CompanionPropertyType {
	String = 'string',
	Number = 'number',
	Boolean = 'boolean',
}

// /**
//  * A set of values of some variables
//  */
// export interface CompanionVariableValues {
// 	[variableId: string]: CompanionVariableValue | undefined
// }

export type CompanionPropertyValueToType<T extends CompanionPropertyValue> = T extends string
	? CompanionPropertyType.String
	: T extends number
	? CompanionPropertyType.Number
	: T extends boolean
	? CompanionPropertyType.Boolean
	: never

/**
 * The value of a property
 */
export type CompanionPropertyValue = string | number | boolean

export interface CompanionPropertyDefinitions {
	[propertyId: string]: CompanionPropertyDefinition | undefined
}
