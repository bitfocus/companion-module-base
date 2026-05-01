import { z } from 'zod'
import {
	createModuleLogger,
	type ButtonGraphicsBoxElement,
	type ButtonGraphicsCircleElement,
	type ButtonGraphicsGroupElement,
	type ButtonGraphicsImageElement,
	type ButtonGraphicsLineElement,
	type ButtonGraphicsTextElement,
	type CompanionGraphicsCompositeElementDefinition,
	type CompanionGraphicsCompositeElementDefinitions,
	type CompanionInputFieldCheckbox,
	type CompanionInputFieldColor,
	type CompanionInputFieldDropdown,
	type CompanionInputFieldMultiDropdown,
	type CompanionInputFieldNumber,
	type CompanionInputFieldStaticText,
	type CompanionInputFieldTextInput,
	type ExpressionOrValue,
	type JsonValue,
	type SomeButtonGraphicsElement,
	type SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import { BANNED_PROPS } from './util.js'

const logger = createModuleLogger('CompositeElementDefinitionsManager')

// ── ExpressionOrValue ─────────────────────────────────────────────────────────

export function createExpressionOrValueSchema<T extends JsonValue | undefined>(
	schema: z.ZodType<T>,
): z.ZodType<ExpressionOrValue<T>> {
	return z.union([
		z.object({ value: schema, isExpression: z.literal(false) }),
		z.object({ value: z.string(), isExpression: z.literal(true) }),
	]) as z.ZodType<ExpressionOrValue<T>>
}

// ── Compile-time schema coverage guards ───────────────────────────────────────
// Two checks prevent drift when interfaces gain new properties:
//
//   1. `schema satisfies z.ZodType<T>`          — catches wrong property types
//   2. `true satisfies AssertCoversKeys<…, T>`  — catches missing optional keys
//      that (1) alone misses due to structural subtyping
//      (`{ a }` satisfies `{ a, b?: T }` even though `b` is absent from the schema)

type AssertCoversKeys<TSchema extends z.ZodObject<any>, TInterface> = [keyof TInterface] extends [
	keyof (TSchema extends z.ZodObject<infer S> ? S : never),
]
	? [keyof (TSchema extends z.ZodObject<infer S> ? S : never)] extends [keyof TInterface]
		? true
		: never
	: never

// ── Shared primitives ─────────────────────────────────────────────────────────

const eov = createExpressionOrValueSchema

const colorType = z.number().int().min(0).max(0xffffffff)
const hAlignType = z.enum(['left', 'center', 'right'])
const vAlignType = z.enum(['top', 'center', 'bottom'])
const lineOrientationType = z.enum(['inside', 'center', 'outside'])
const imageFillModeType = z.enum(['crop', 'fill', 'fit'])

// ── Shared element shape fragments ────────────────────────────────────────────
// Plain shape objects (not ZodObject instances) so they can be spread into z.object()
// while preserving the concrete ZodObject type that Zod v4's discriminatedUnion
// requires ($ZodTypeDiscriminable needs _zod.propValues, absent on abstract ZodType<T>).

const elementBaseShape = {
	id: z.string().optional(),
	name: z.string().optional(),
	enabled: eov(z.boolean()).optional(),
	opacity: eov(z.number().min(0).max(100)).optional(),
}

const elementBoundsShape = {
	x: eov(z.number().min(0).max(100)).optional(),
	y: eov(z.number().min(0).max(100)).optional(),
	width: eov(z.number().min(0).max(100)).optional(),
	height: eov(z.number().min(0).max(100)).optional(),
}

const elementBorderShape = {
	borderWidth: eov(z.number().min(0)).optional(),
	borderColor: eov(colorType).optional(),
	borderPosition: eov(lineOrientationType).optional(),
}

// ── Element schemas ────────────────────────────────────────────────────────────
// Each schema is a named const with both type-safety checks applied.
// Schemas are NOT annotated as abstract `z.ZodType<X>` so their concrete
// ZodObject type is preserved — required by Zod v4's discriminatedUnion.
//
// Exception – group: recursive `children` field requires z.lazy, so the group
//   schema lives inline inside elementSchema. Key coverage is checked via a
//   standalone compile-time assertion instead.
//
// Exception – compositeRef: ButtonGraphicsCompositeElement is a mapped generic
//   type; `options: Record<string, unknown>` cannot satisfy
//   CompanionPresetOptionValues, so only key-coverage is checked.

const compositeRefSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	type: z.literal('composite'),
	elementId: z.string(),
	options: z.record(z.string(), z.unknown()),
})
// Key-coverage assertion for compositeRef (satisfies skipped – see above)
type _CompositeRefSchemaKeys =
	| keyof typeof elementBaseShape
	| keyof typeof elementBoundsShape
	| 'type'
	| 'elementId'
	| 'options'
// ButtonGraphicsCompositeElement is a mapped generic — import the base fields manually
type _ButtonGraphicsCompositeElementKeys =
	| 'id'
	| 'name'
	| 'enabled'
	| 'opacity'
	| 'x'
	| 'y'
	| 'width'
	| 'height'
	| 'type'
	| 'elementId'
	| 'options'
true satisfies [_ButtonGraphicsCompositeElementKeys] extends [_CompositeRefSchemaKeys] ? true : never

const textElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	type: z.literal('text'),
	rotation: eov(z.number().min(0).max(359)).optional(),
	text: eov(z.string()),
	fontsize: eov(z.union([z.literal('auto'), z.number()])).optional(),
	color: eov(colorType).optional(),
	halign: eov(hAlignType).optional(),
	valign: eov(vAlignType).optional(),
	outlineColor: eov(colorType).optional(),
}) satisfies z.ZodType<ButtonGraphicsTextElement>
true satisfies AssertCoversKeys<typeof textElementSchema, ButtonGraphicsTextElement>

const imageElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	type: z.literal('image'),
	rotation: eov(z.number().min(0).max(359)).optional(),
	base64Image: eov(z.string().nullable()),
	halign: eov(hAlignType).optional(),
	valign: eov(vAlignType).optional(),
	fillMode: eov(imageFillModeType).optional(),
}) satisfies z.ZodType<ButtonGraphicsImageElement>
true satisfies AssertCoversKeys<typeof imageElementSchema, ButtonGraphicsImageElement>

const boxElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementBorderShape,
	type: z.literal('box'),
	rotation: eov(z.number().min(0).max(359)).optional(),
	color: eov(colorType).optional(),
}) satisfies z.ZodType<ButtonGraphicsBoxElement>
true satisfies AssertCoversKeys<typeof boxElementSchema, ButtonGraphicsBoxElement>

const lineElementSchema = z.object({
	...elementBaseShape,
	...elementBorderShape,
	type: z.literal('line'),
	fromX: eov(z.number().min(0).max(100)).optional(),
	fromY: eov(z.number().min(0).max(100)).optional(),
	toX: eov(z.number().min(0).max(100)).optional(),
	toY: eov(z.number().min(0).max(100)).optional(),
}) satisfies z.ZodType<ButtonGraphicsLineElement>
true satisfies AssertCoversKeys<typeof lineElementSchema, ButtonGraphicsLineElement>

const circleElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementBorderShape,
	type: z.literal('circle'),
	color: eov(colorType).optional(),
	startAngle: eov(z.number().min(0).max(359)).optional(),
	endAngle: eov(z.number().min(0).max(359)).optional(),
	drawSlice: eov(z.boolean()).optional(),
	borderOnlyArc: eov(z.boolean()).optional(),
}) satisfies z.ZodType<ButtonGraphicsCircleElement>
true satisfies AssertCoversKeys<typeof circleElementSchema, ButtonGraphicsCircleElement>

// Key-coverage assertion for the group schema (defined inline inside z.lazy below)
type _GroupSchemaKeys =
	| keyof typeof elementBaseShape
	| keyof typeof elementBoundsShape
	| 'type'
	| 'rotation'
	| 'children'
true satisfies [keyof ButtonGraphicsGroupElement] extends [_GroupSchemaKeys] ? true : never

// The outer elementSchema uses z.lazy for the recursive group case.
// The double-cast is localised here; every member schema above carries its own
// type checks so this is the only unchecked line in the file.
const elementSchema: z.ZodType<SomeButtonGraphicsElement> = z.lazy(() =>
	z.discriminatedUnion('type', [
		z.object({
			...elementBaseShape,
			...elementBoundsShape,
			type: z.literal('group'),
			rotation: eov(z.number().min(0).max(359)).optional(),
			children: z.array(elementSchema),
		}),
		compositeRefSchema,
		textElementSchema,
		imageElementSchema,
		boxElementSchema,
		lineElementSchema,
		circleElementSchema,
	]),
) as unknown as z.ZodType<SomeButtonGraphicsElement>

// ── Input field schemas ────────────────────────────────────────────────────────

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

const inputFieldSchema = z.discriminatedUnion('type', [
	staticTextFieldSchema,
	colorFieldSchema,
	textInputFieldSchema,
	dropdownFieldSchema,
	multiDropdownFieldSchema,
	numberFieldSchema,
	checkboxFieldSchema,
]) satisfies z.ZodType<SomeCompanionFeedbackInputField>

// ── Definition schema ──────────────────────────────────────────────────────────

const definitionSchema: z.ZodType<CompanionGraphicsCompositeElementDefinition> = z.object({
	type: z.literal('composite'),
	name: z.string().min(1),
	sortName: z.string().min(1).optional(),
	description: z.string().optional(),
	options: z.array(inputFieldSchema),
	elements: z.array(elementSchema),
})

export function validateCompositeElementDefinitions(
	definitions: CompanionGraphicsCompositeElementDefinitions<any>,
): void {
	const invalidEntries: string[] = []
	const bannedIds: string[] = []
	const invalidElementTypes: string[] = []

	for (const [id, defn] of Object.entries(definitions)) {
		if (BANNED_PROPS.has(id)) {
			bannedIds.push(id)
			continue
		}

		if (!defn || typeof defn !== 'object') {
			invalidEntries.push(id)
			continue
		}

		if (!definitionSchema.safeParse(defn).success) {
			invalidElementTypes.push(id)
		}
	}

	if (invalidEntries.length > 0) {
		logger.warn(`${invalidEntries.length} composite element definition(s) are not valid objects and were skipped`)
	}
	if (bannedIds.length > 0) {
		logger.warn(`The following composite element definitions use a reserved id: ${bannedIds.sort().join(', ')}`)
	}
	if (invalidElementTypes.length > 0) {
		logger.warn(
			`The following composite element definitions contain elements with unrecognised types: ${invalidElementTypes.sort().join(', ')}`,
		)
	}
}
