import type { ExpressionOrValue } from './input.js'

/**
 * The type of a button graphics element as stored in places where it can be edited
 */
export type SomeButtonGraphicsElement =
	| ButtonGraphicsGroupElement
	// | ButtonGraphicsCompositeElement
	| ButtonGraphicsTextElement
	| ButtonGraphicsImageElement
	| ButtonGraphicsBoxElement
	| ButtonGraphicsLineElement

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

export interface ButtonGraphicsGroupElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'group'

	children: SomeButtonGraphicsElement[]
}

// export interface ButtonGraphicsCompositeElement<TOptions = Record<string, any>>
// 	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
// 	type: 'composite'

// 	elementId: string

// 	/**
// 	 * Custom elements have options defined by their composite definition
// 	 */
// 	options: { [key in keyof TOptions]?: ExpressionOrValue<TOptions[key]> }
// }
// export type CompositeElementOptionKey = `opt:${string}`

export type HorizontalAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'top' | 'center' | 'bottom'

export type LineOrientation = 'inside' | 'center' | 'outside'

export type ImageFillMode = 'crop' | 'fill' | 'fit' | 'fit_or_shrink'

export interface ButtonGraphicsTextElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'text'

	text: ExpressionOrValue<string>

	fontsize?: ExpressionOrValue<'auto' | number> // TODO - other values?

	color?: ExpressionOrValue<number>

	halign?: ExpressionOrValue<HorizontalAlignment>
	valign?: ExpressionOrValue<VerticalAlignment>

	outlineColor?: ExpressionOrValue<number>
}

export interface ButtonGraphicsImageElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'image'

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
