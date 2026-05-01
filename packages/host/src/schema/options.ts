import z from 'zod'
import type {
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import type { AssertCoversKeys } from './common.js'

const inputFieldBaseShape = {
	id: z.string(),
	label: z.string(),
	tooltip: z.string().optional(),
	description: z.string().optional(),
	expressionDescription: z.string().optional(),
	isVisibleExpression: z.string().optional(),
	disableAutoExpression: z.boolean().optional(),
	allowInvalidValues: z.boolean().optional(),
}

const dropdownChoiceSchema = z.object({
	id: z.union([z.string(), z.number()]),
	label: z.string(),
})

const colorPresetSchema = z.union([z.string(), z.object({ color: z.string(), title: z.string() })])

const staticTextFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('static-text'),
	value: z.string(),
}) satisfies z.ZodType<CompanionInputFieldStaticText>
true satisfies AssertCoversKeys<typeof staticTextFieldSchema, CompanionInputFieldStaticText>

const colorFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('colorpicker'),
	default: z.union([z.string(), z.number()]),
	enableAlpha: z.boolean().optional(),
	returnType: z.enum(['string', 'number']).optional(),
	presetColors: z.array(colorPresetSchema).optional(),
}) satisfies z.ZodType<CompanionInputFieldColor>
true satisfies AssertCoversKeys<typeof colorFieldSchema, CompanionInputFieldColor>

const textInputFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('textinput'),
	default: z.string().optional(),
	minLength: z.number().optional(),
	regex: z.string().optional(),
	useVariables: z.boolean().optional(),
	multiline: z.boolean().optional(),
}) satisfies z.ZodType<CompanionInputFieldTextInput>
true satisfies AssertCoversKeys<typeof textInputFieldSchema, CompanionInputFieldTextInput>

const dropdownFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('dropdown'),
	choices: z.array(dropdownChoiceSchema),
	default: z.union([z.string(), z.number()]),
	allowCustom: z.boolean().optional(),
	regex: z.string().optional(),
	minChoicesForSearch: z.number().optional(),
}) satisfies z.ZodType<CompanionInputFieldDropdown>
true satisfies AssertCoversKeys<typeof dropdownFieldSchema, CompanionInputFieldDropdown>

const multiDropdownFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('multidropdown'),
	choices: z.array(dropdownChoiceSchema),
	default: z.array(z.union([z.string(), z.number()])),
	minChoicesForSearch: z.number().optional(),
	minSelection: z.number().optional(),
	maxSelection: z.number().optional(),
	sortSelection: z.boolean().optional(),
}) satisfies z.ZodType<CompanionInputFieldMultiDropdown>
true satisfies AssertCoversKeys<typeof multiDropdownFieldSchema, CompanionInputFieldMultiDropdown>

const numberFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('number'),
	default: z.number(),
	min: z.number(),
	max: z.number(),
	step: z.number().optional(),
	range: z.boolean().optional(),
	showMinAsNegativeInfinity: z.boolean().optional(),
	showMaxAsPositiveInfinity: z.boolean().optional(),
	clampValues: z.boolean().optional(),
	asInteger: z.boolean().optional(),
}) satisfies z.ZodType<CompanionInputFieldNumber>
true satisfies AssertCoversKeys<typeof numberFieldSchema, CompanionInputFieldNumber>

const checkboxFieldSchema = z.object({
	...inputFieldBaseShape,
	type: z.literal('checkbox'),
	default: z.boolean(),
}) satisfies z.ZodType<CompanionInputFieldCheckbox>
true satisfies AssertCoversKeys<typeof checkboxFieldSchema, CompanionInputFieldCheckbox>

export const inputFieldSchema = z.discriminatedUnion('type', [
	staticTextFieldSchema,
	colorFieldSchema,
	textInputFieldSchema,
	dropdownFieldSchema,
	multiDropdownFieldSchema,
	numberFieldSchema,
	checkboxFieldSchema,
]) satisfies z.ZodType<SomeCompanionFeedbackInputField>
