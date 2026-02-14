import type { JsonValue } from '../common/json-value.js'

export type ExpressionOrValue<T> = { value: T; isExpression: false } | { value: string; isExpression: true }

export type ExpressionOptionsObject = { [key: string]: ExpressionOrValue<JsonValue | undefined> | undefined }

export type CompanionOptionValues = { [key: string]: JsonValue | undefined }

/**
 * The common properties for an input field
 */
export interface CompanionInputFieldBase<TKey extends string = string> {
	/** The unique id of this input field within the input group */
	id: TKey
	/** The type of this input field */
	type:
		| 'static-text'
		| 'textinput'
		| 'dropdown'
		| 'multidropdown'
		| 'colorpicker'
		| 'number'
		| 'checkbox'
		| 'custom-variable'
		| 'bonjour-device'
		| 'secret-text'
	/** The label of the field */
	label: string
	/** A hover tooltip for this field */
	tooltip?: string
	/** A longer description/summary/notes for this field */
	description?: string
	/** An alternate description to show when the field is in expression mode. This will replace the normal description */
	expressionDescription?: string

	/**
	 * A companion expression to check whether this input should be visible, based on the current options selections within the input group
	 *
	 * This is the same syntax as other expressions written inside of Companion.
	 * You can access a value of the current options using `$(options:some_field_id)`.
	 * Note: you can only reference fields which are set to `disableAutoExpression` here, as other fields can be expressions and frequently changing values
	 */
	isVisibleExpression?: string

	/**
	 * Whether to disable support for toggling this field to be an expression
	 * Danger: Be careful if setting this to true for an existing option, if the user has already defined an expression for this,
	 * it will no longer be parsed and will break their configuration.
	 */
	disableAutoExpression?: boolean

	/**
	 * Enabling this will tell companion to validate the value of this field against the definition of the field.
	 * If the computed value for this option does not match the validation rules, it will be passed through unchanged.
	 * If this is not set, then any invalid value will result in the action/feedback being skipped entirely.
	 * Note: This only applies when in expression mode.
	 */
	allowInvalidValues?: boolean
}

/**
 * A static un-editable line of text
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'important-line',
 * 	type: 'static-text',
 * 	label: 'Important info',
 * 	value: 'Some message here'
 * }
 * ```
 */
export interface CompanionInputFieldStaticText<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'static-text'
	/** The text to show */
	value: string
}

export type CompanionColorPresetValue = string | { color: string; title: string }

/**
 * A colour picker input
 *
 * Available for actions/feedbacks/config
 * Has three optional configuration properties:
 * - {boolean} `enableAlpha` will show the colour picker with an additional alpha entry
 * - {'string'|'number'} `returnType` do you want to get the results as CSS string or Companion color number
 * - {string[]} `presetColors` replace the default swatch with your own colors when set
 *
 * ### Example
 * ```js
 * {
 * 	id: 'bg',
 * 	type: 'colorpicker',
 * 	label: 'Background color',
 * 	default: 'rgb(255, 0, 0)'
 * }
 * ```
 *
 * ```js
 * {
 * 	id: 'overlay',
 * 	type: 'colorpicker',
 * 	label: 'Overlay color',
 *  enableAlpha: true,
 *  returnType: 'string',
 * 	default: 'rgba(100, 100, 255, 0.3)',
 *  presetColors: ['#000', '#ffffff', {color: 'rgba(255, 0, 0, 0.5)', title: 'semitransparent red'}]
 * }
 * ```
 */
export interface CompanionInputFieldColor<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'colorpicker'
	/**
	 * The default color value to set when creating this action/feedback/instance
	 * Can be a color string or a color number
	 * Valid strings are CSS color strings in Hex, RGB, HSL or HSV notation with or without alpha
	 * Valid numbers are 0x0 - 0xffffffff, where the components are ttrrggbb, you can generate the number with combineRgb()
	 *
	 * ### Examples for red
	 * ```
	 * '#f00'
	 * '#ff0000'
	 * '#ff0000ff'
	 * 'rgb(255,0,0)
	 * 'rgba(255, 0, 0, 1.0)
	 * 'hsl(0, 100, 50)'
	 * 'hsv(0, 100, 100)'
	 * 0xff0000
	 * ```
	 */
	default: string | number
	/**
	 * This will enable a alpha entry slider and input
	 */
	enableAlpha?: boolean
	/**
	 * Specify if you want the colorpicker returning it's value as a CSS string or as a color number.
	 * This will also be the format stored in the database for this value
	 */
	returnType?: 'string' | 'number'
	/**
	 * If set, this will override the default colors shown in the swatch.
	 * Enter an array of either color strings or objects with color strings and titles
	 */
	presetColors?: CompanionColorPresetValue[]
}

/**
 * A basic text input field
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'textinput',
 * 	label: 'Provide name',
 * 	'default': 'Bob'
 * }
 * ```
 */
export interface CompanionInputFieldTextInput<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'textinput'
	/**
	 * The default text value
	 */
	default?: string
	/**
	 * Minimum required length of the value
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	minLength?: number
	/**
	 * A regex to use to inform the user if the current input is valid.
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	regex?: string
	/**
	 * Whether variables should be supported in the value mode text
	 * Note: Even if this is false, users can toggle this field to expression mode to use variables
	 */
	useVariables?: boolean

	/** Show as a multiline input field */
	multiline?: boolean
}

export interface DropdownChoice<TId extends JsonValue = string | number> {
	/** Value of the option */
	id: TId
	/** Label to show to users */
	label: string
}

/**
 * A dropdown input field
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'dropdown',
 * 	label: 'Select name',
 * 	choices: [
 * 		{ id: 'bob', label: 'Bob' },
 * 		{ id: 'sally', label: 'Sally' },
 * 	],
 * 	default: 'bob'
 * }
 * ```
 */
export interface CompanionInputFieldDropdown<
	TKey extends string = string,
	TChoiceId extends JsonValue = string | number,
> extends CompanionInputFieldBase<TKey> {
	type: 'dropdown'

	/** The possible choices */
	choices: DropdownChoice<TChoiceId>[]
	/** The default selected value */
	default: TChoiceId

	/**
	 * Allow custom values to be defined by the user
	 * Note: These will always come through as strings
	 */
	allowCustom?: boolean
	/** Check custom value against regex */
	regex?: string

	/** The minimum number of entries the dropdown must have before it allows searching */
	minChoicesForSearch?: number
}

/**
 * A multi-select dropdown input field
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'multidropdown',
 * 	label: 'Select name',
 * 	choices: [
 * 		{ id: 'bob', label: 'Bob' },
 * 		{ id: 'sally', label: 'Sally' },
 * 	],
 * 	default: ['bob']
 * }
 * ```
 */
export interface CompanionInputFieldMultiDropdown<
	TKey extends string = string,
	TChoiceId extends JsonValue = string | number,
> extends CompanionInputFieldBase<TKey> {
	type: 'multidropdown'

	/** The possible choices */
	choices: DropdownChoice<TChoiceId>[]
	/** The default selected values */
	default: TChoiceId[]

	/** The minimum number of entries the dropdown must have before it allows searching */
	minChoicesForSearch?: number

	/** The minimum number of selected values */
	minSelection?: number
	/** The maximum number of selected values */
	maxSelection?: number
}

/**
 * A checkbox input field
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'doit',
 * 	type: 'checkbox',
 * 	label: 'Do the thing',
 * 	default: true
 * }
 * ```
 */
export interface CompanionInputFieldCheckbox<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'checkbox'
	/** The default value */
	default: boolean
}

/**
 * A number input field
 *
 * Available for actions/feedbacks/config
 *
 * ### Example
 * ```js
 * {
 * 	id: 'size',
 * 	type: 'number',
 * 	label: 'Target size',
 * 	default: 50,
 * 	min: 0,
 * 	max: 100
 * }
 * ```
 */
export interface CompanionInputFieldNumber<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'number'

	/** The default value */
	default: number

	/**
	 * The minimum value to allow
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	min: number
	/**
	 * The maximum value to allow
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	max: number

	/** The stepping of the arrows */
	step?: number

	/** Whether to show a slider for the input */
	range?: boolean

	/** When true, show the min value as a visual -∞ when value <= min */
	showMinAsNegativeInfinity?: boolean
	/** When true, show the max value as a visual ∞ when value >= max */
	showMaxAsPositiveInfinity?: boolean
}

/**
 * A custom variable picker input
 *
 * Available for actions
 *
 * ### Example
 * ```js
 * {
 * 	id: 'destination',
 * 	type: 'custom-variable',
 * 	label: 'Save result to variable',
 * }
 * ```
 */
export interface CompanionInputFieldCustomVariable<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'custom-variable'
}

/**
 * An input field to list and select devices discovered with a bonjour query
 *
 * Available for config
 *
 * Note: Bonjour does not work in all environments, so the user is always able to select 'Manual' (null).
 * You must make sure to handle this, we recommend using the `isVisibleExpression` to hide the manual input fields when a bonjour device is selected.
 *
 * ### Example
 * ```js
 * {
 * 	id: 'my-device',
 * 	type: 'bonjour-device',
 * 	label: 'Device'
 * }
 * ```
 */
export interface CompanionInputFieldBonjourDevice<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'bonjour-device'
}

/**
 * A text input field for secret values
 *
 * Available for config. Note: the value for this will be in the secrets store, not the config store.
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'secret-text',
 * 	label: 'Provide name',
 * 	default: 'Bob'
 * }
 * ```
 */
export interface CompanionInputFieldSecret<TKey extends string = string> extends CompanionInputFieldBase<TKey> {
	type: 'secret-text'
	/**
	 * The default text value
	 */
	default?: string
	/**
	 * Minimum required length of the value
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	minLength?: number
	/**
	 * A regex to use to inform the user if the current input is valid.
	 * Note: values may not conform to this, you should validate the value in your code
	 */
	regex?: string
}
