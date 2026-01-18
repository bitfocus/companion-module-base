import type {
	CompanionInputFieldBonjourDevice,
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldSecret,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
} from './input.js'

/**
 * Some configuration input field
 */
export type SomeCompanionConfigField =
	| CompanionInputFieldStaticText
	| CompanionInputFieldColor
	| CompanionInputFieldTextInput
	| CompanionInputFieldDropdown
	| CompanionInputFieldMultiDropdown
	| CompanionInputFieldNumber
	| CompanionInputFieldCheckbox
	| CompanionInputFieldBonjourDevice
	| CompanionInputFieldSecret
