// ── Shared primitives ─────────────────────────────────────────────────────────

import z from 'zod'
import type {
	ButtonGraphicsBoxElement,
	ButtonGraphicsCircleElement,
	ButtonGraphicsGroupElement,
	ButtonGraphicsImageElement,
	ButtonGraphicsLineElement,
	ButtonGraphicsTextElement,
	SomeButtonGraphicsElement,
} from '@companion-module/base'
import { eov, type AssertCoversKeys } from './common.js'

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
export const elementSchema: z.ZodType<SomeButtonGraphicsElement> = z.lazy(() =>
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
