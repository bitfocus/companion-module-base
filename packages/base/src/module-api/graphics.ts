import type { CompanionCompositeElementSchemas } from './graphics-composite.js'
import type { ExpressionOptionsObject, ExpressionOrValue } from './input.js'

/**
 * The type of a button graphics element as stored in places where it can be edited
 */
export type SomeButtonGraphicsElement<
	TCompositeElements extends CompanionCompositeElementSchemas | undefined = CompanionCompositeElementSchemas,
> =
	| ButtonGraphicsGroupElement<TCompositeElements>
	| ButtonGraphicsCompositeElement<TCompositeElements>
	| ButtonGraphicsTextElement
	| ButtonGraphicsImageElement
	| ButtonGraphicsBoxElement
	| ButtonGraphicsLineElement
	| ButtonGraphicsCircleElement

export interface ButtonGraphicsElementBase {
	id?: string
	name?: string

	enabled?: ExpressionOrValue<boolean>
	/* 0-100 */
	opacity?: ExpressionOrValue<number>
}

export interface ButtonGraphicsDrawBounds {
	/* 0-100 */
	x?: ExpressionOrValue<number>
	/* 0-100 */
	y?: ExpressionOrValue<number>
	/* 0-100 */
	width?: ExpressionOrValue<number>
	/* 0-100 */
	height?: ExpressionOrValue<number>
}

export interface ButtonGraphicsCanvasElement {
	// previewColor: number

	decoration?: ExpressionOrValue<ButtonGraphicsDecorationType> // replaces show_topbar
}

export enum ButtonGraphicsDecorationType {
	FollowDefault = 'default',
	TopBar = 'topbar',
	// BottomBar = 'bottombar', // Future
	Border = 'border',
	None = 'none',
}

export interface ButtonGraphicsGroupElement<
	TCompositeElements extends CompanionCompositeElementSchemas | undefined = CompanionCompositeElementSchemas,
>
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'group'

	rotation?: ExpressionOrValue<number> // degrees 0-359

	children: SomeButtonGraphicsElement<TCompositeElements>[]
}

export type ButtonGraphicsCompositeElement<
	TCompositeElements extends CompanionCompositeElementSchemas | undefined = CompanionCompositeElementSchemas,
> = ButtonGraphicsElementBase &
	ButtonGraphicsDrawBounds &
	{
		[K in keyof Extract<TCompositeElements, CompanionCompositeElementSchemas>]: {
			type: 'composite'

			elementId: K

			/**
			 * Custom elements have options defined by their composite definition
			 */
			options: ExpressionOptionsObject<Extract<TCompositeElements, CompanionCompositeElementSchemas>[K]['options']>
		}
	}[keyof Extract<TCompositeElements, CompanionCompositeElementSchemas>]

export type HorizontalAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'top' | 'center' | 'bottom'

export type LineOrientation = 'inside' | 'center' | 'outside'

export type ImageFillMode = 'crop' | 'fill' | 'fit'

export interface ButtonGraphicsTextElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'text'

	rotation?: ExpressionOrValue<number> // degrees 0-359

	text: ExpressionOrValue<string>

	fontsize?: ExpressionOrValue<'auto' | number>

	color?: ExpressionOrValue<number>

	halign?: ExpressionOrValue<HorizontalAlignment>
	valign?: ExpressionOrValue<VerticalAlignment>

	outlineColor?: ExpressionOrValue<number>
}

export interface ButtonGraphicsImageElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'image'

	rotation?: ExpressionOrValue<number> // degrees 0-359

	base64Image: ExpressionOrValue<string | null>

	halign?: ExpressionOrValue<HorizontalAlignment>
	valign?: ExpressionOrValue<VerticalAlignment>

	fillMode?: ExpressionOrValue<ImageFillMode>
}

export interface ButtonGraphicsBorderProperties {
	borderWidth?: ExpressionOrValue<number> // 0 to disable
	borderColor?: ExpressionOrValue<number>
	borderPosition?: ExpressionOrValue<LineOrientation>
}

export interface ButtonGraphicsBoxElement
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds, ButtonGraphicsBorderProperties {
	type: 'box'

	rotation?: ExpressionOrValue<number> // degrees 0-359

	color?: ExpressionOrValue<number>
}

export interface ButtonGraphicsLineElement extends ButtonGraphicsElementBase, ButtonGraphicsBorderProperties {
	type: 'line'

	/* 0-100 */
	fromX?: ExpressionOrValue<number>
	/* 0-100 */
	fromY?: ExpressionOrValue<number>
	/* 0-100 */
	toX?: ExpressionOrValue<number>
	/* 0-100 */
	toY?: ExpressionOrValue<number>
}

export interface ButtonGraphicsCircleElement
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds, ButtonGraphicsBorderProperties {
	type: 'circle'

	color?: ExpressionOrValue<number>

	startAngle?: ExpressionOrValue<number> // degrees 0-359
	endAngle?: ExpressionOrValue<number> // degrees 0-359

	drawSlice?: ExpressionOrValue<boolean>
	borderOnlyArc?: ExpressionOrValue<boolean>
}
