// ── Shared primitives ─────────────────────────────────────────────────────────

import z from 'zod'
import type {
	ButtonGraphicsBoxElement,
	ButtonGraphicsCircleElement,
	ButtonGraphicsGaugeElement,
	ButtonGraphicsGroupElement,
	ButtonGraphicsImageElement,
	ButtonGraphicsLineElement,
	ButtonGraphicsTextElement,
	SomeButtonGraphicsElement,
} from '@companion-module/base'
import { cssColorToRgba } from '../validate/color.js'
import { eov, type AssertCoversKeys } from './common.js'

/**
 * A colour: Companion's packed `0xTTRRGGBB` number, or a css colour string. Modules may use either
 * (`CompanionColorValue`), and Companion parses an all-numeric string as a packed number, so allow that too.
 */
const colorType = z.union([
	z.number().int().min(0).max(0xffffffff),
	z
		.string()
		.refine(
			(value) => cssColorToRgba(value) !== null || (value.trim() !== '' && !isNaN(Number(value))),
			'Must be a css color string or a color number',
		),
])
/** Degrees, matching the range of Companion's own rotation property */
const rotationType = z.number().min(-360).max(360)
/** Degrees around a circle, matching the range of Companion's own start/end angle properties */
const angleType = z.number().min(0).max(360)
const hAlignType = z.enum(['left', 'center', 'right'])
const vAlignType = z.enum(['top', 'center', 'bottom'])
const lineOrientationType = z.enum(['inside', 'center', 'outside'])
const imageFillModeType = z.enum(['crop', 'fill', 'fit'])
const fontFamilyType = z.enum(['companion-sans', 'companion-mono'])
const gaugeOrientationType = z.enum(['horizontal', 'vertical', 'ring'])
const gaugeTrackStyleType = z.enum(['transparent', 'dimmed'])
const gaugeValueType = z.number().min(-1000000).max(1000000)
const fontWeightType = z.enum(['normal', 'bold'])
const textStyleType = z.enum(['italic', 'underline', 'strikethrough'])

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
	x: eov(z.number().min(-1000).max(1000)).optional(),
	y: eov(z.number().min(-1000).max(1000)).optional(),
	width: eov(z.number().min(0).max(1000)).optional(),
	height: eov(z.number().min(0).max(1000)).optional(),
}

const elementRotationShape = {
	rotation: eov(rotationType).optional(),
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
	...elementRotationShape,
	type: z.literal('composite'),
	elementId: z.string(),
	options: z.record(z.string(), z.unknown()),
})
// Key-coverage assertion for compositeRef (satisfies skipped – see above)
type _CompositeRefSchemaKeys =
	| keyof typeof elementBaseShape
	| keyof typeof elementBoundsShape
	| keyof typeof elementRotationShape
	| 'type'
	| 'elementId'
	| 'options'
// ButtonGraphicsCompositeElement is a mapped generic — import the base fields manually
type _ButtonGraphicsCompositeElementKeys =
	'id' | 'name' | 'enabled' | 'opacity' | 'x' | 'y' | 'width' | 'height' | 'type' | 'rotation' | 'elementId' | 'options'
true satisfies [_ButtonGraphicsCompositeElementKeys] extends [_CompositeRefSchemaKeys] ? true : never

const textElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementRotationShape,
	type: z.literal('text'),
	text: eov(z.string()),
	fontsize: eov(z.number()).optional(),
	fontsizeAllowShrink: eov(z.boolean()).optional(),
	font: eov(fontFamilyType).optional(),
	weight: eov(fontWeightType).optional(),
	styles: eov(z.array(textStyleType)).optional(),
	color: eov(colorType).optional(),
	halign: eov(hAlignType).optional(),
	valign: eov(vAlignType).optional(),
	outlineColor: eov(colorType).optional(),
}) satisfies z.ZodType<ButtonGraphicsTextElement>
true satisfies AssertCoversKeys<typeof textElementSchema, ButtonGraphicsTextElement>

const imageElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementRotationShape,
	type: z.literal('image'),
	base64Image: eov(z.string().nullable()),
	halign: eov(hAlignType).optional(),
	valign: eov(vAlignType).optional(),
	fillMode: eov(imageFillModeType).optional(),
}) satisfies z.ZodType<ButtonGraphicsImageElement>
true satisfies AssertCoversKeys<typeof imageElementSchema, ButtonGraphicsImageElement>

const boxElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementRotationShape,
	...elementBorderShape,
	type: z.literal('box'),
	color: eov(colorType).optional(),
	cornerRadius: eov(z.number().min(0).max(100)).optional(),
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
	startAngle: eov(angleType).optional(),
	endAngle: eov(angleType).optional(),
	drawSlice: eov(z.boolean()).optional(),
	borderOnlyArc: eov(z.boolean()).optional(),
}) satisfies z.ZodType<ButtonGraphicsCircleElement>
true satisfies AssertCoversKeys<typeof circleElementSchema, ButtonGraphicsCircleElement>

const gaugeStopSchema = z.object({
	value: eov(gaugeValueType),
	color: eov(colorType),
	gradient: eov(z.boolean()),
})

const gaugeElementSchema = z.object({
	...elementBaseShape,
	...elementBoundsShape,
	...elementRotationShape,
	type: z.literal('gauge'),
	// Value
	value: eov(gaugeValueType).optional(),
	min: eov(gaugeValueType).optional(),
	max: eov(gaugeValueType).optional(),
	origin: eov(gaugeValueType).optional(),
	symmetric: eov(z.boolean()).optional(),
	// Appearance
	orientation: eov(gaugeOrientationType).optional(),
	reverse: eov(z.boolean()).optional(),
	// Circular styling
	startAngle: eov(angleType).optional(),
	endAngle: eov(angleType).optional(),
	ringWidth: eov(z.number().min(1).max(50)).optional(),
	roundedEnds: eov(z.boolean()).optional(),
	// Fill
	fillEnabled: eov(z.boolean()).optional(),
	multiColour: eov(z.boolean()).optional(),
	fillWidth: eov(z.number().min(0).max(100)).optional(),
	stops: z.array(gaugeStopSchema).optional(),
	// Marker
	markerEnabled: eov(z.boolean()).optional(),
	markerColor: eov(colorType).optional(),
	markerWidth: eov(z.number().min(1).max(100)).optional(),
	// Track
	trackStyle: eov(gaugeTrackStyleType).optional(),
	trackAmount: eov(z.number().min(0).max(100)).optional(),
	trackWidth: eov(z.number().min(0).max(100)).optional(),
}) satisfies z.ZodType<ButtonGraphicsGaugeElement>
true satisfies AssertCoversKeys<typeof gaugeElementSchema, ButtonGraphicsGaugeElement>

// Key-coverage assertion for the group schema (defined inline inside z.lazy below)
type _GroupSchemaKeys =
	| keyof typeof elementBaseShape
	| keyof typeof elementBoundsShape
	| keyof typeof elementRotationShape
	| 'type'
	| 'squareCoords'
	| 'children'
true satisfies [keyof ButtonGraphicsGroupElement] extends [_GroupSchemaKeys] ? true : never

// The outer elementSchema uses z.lazy for the recursive group case.
// The double-cast is localised here; every member schema above carries its own
// type checks so this is the only unchecked line in the file.
export const elementSchema: z.ZodType<SomeButtonGraphicsElement> = z.lazy(() =>
	z.discriminatedUnion('type', [
		z.object({
			...elementBaseShape,
			...elementBoundsShape,
			...elementRotationShape,
			type: z.literal('group'),
			squareCoords: eov(z.boolean()).optional(),
			children: z.array(elementSchema),
		}),
		compositeRefSchema,
		textElementSchema,
		imageElementSchema,
		boxElementSchema,
		lineElementSchema,
		circleElementSchema,
		gaugeElementSchema,
	]),
) as unknown as z.ZodType<SomeButtonGraphicsElement>
