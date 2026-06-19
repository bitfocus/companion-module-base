import type { CompanionCompositeElementSchemas } from './graphics-composite.js'
import type { CompanionOptionValues, ExpressionOrValue } from './input.js'

/**
 * A value for a button graphics element property.
 *
 * Modules may provide either a plain value (e.g. `5`, `'hello'`, `true`) or an {@link ExpressionOrValue} wrapper.
 * A plain value is equivalent to `{ isExpression: false, value }`, which lets modules skip the wrapper
 * boilerplate when defining presets and composite elements.
 *
 * This is a duplicate of `CompanionPresetValue` from the preset definitions, kept here to avoid a dependency
 * on that module.
 */
export type CompanionGraphicsElementValue<T> = T | ExpressionOrValue<T>

/**
 * An options object for a button graphics element (e.g. a composite element).
 *
 * Each value may be a plain value or an {@link ExpressionOrValue} wrapper, see {@link CompanionGraphicsElementValue}.
 */
export type CompanionGraphicsElementOptionsObject<T extends CompanionOptionValues = CompanionOptionValues> = {
	[K in keyof T]: CompanionGraphicsElementValue<T[K]> | undefined
}

/**
 * A button graphics element, as used when defining presets and composite elements.
 *
 * Property values may be given as plain values or {@link ExpressionOrValue} wrappers, see
 * {@link CompanionGraphicsElementValue}.
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

	enabled?: CompanionGraphicsElementValue<boolean>
	/* 0-100 */
	opacity?: CompanionGraphicsElementValue<number>
}

export interface ButtonGraphicsDrawBounds {
	/* 0-100 */
	x?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	y?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	width?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	height?: CompanionGraphicsElementValue<number>
}

export interface ButtonGraphicsCanvasElement {
	// previewColor: number

	decoration?: CompanionGraphicsElementValue<ButtonGraphicsDecorationType> // replaces show_topbar

	/* Whether to show status icons in the top right corner of the button */
	showStatusIcons?: CompanionGraphicsElementValue<ButtonGraphicsShowStatusIcons>
}

export enum ButtonGraphicsDecorationType {
	FollowDefault = 'default',
	TopBar = 'topbar',
	// BottomBar = 'bottombar', // Future
	Border = 'border',
	None = 'none',
}

export enum ButtonGraphicsShowStatusIcons {
	FollowDefault = 'default',
	ShowAll = 'all',
	None = 'none',
}

export interface ButtonGraphicsGroupElement<
	TCompositeElements extends CompanionCompositeElementSchemas | undefined = CompanionCompositeElementSchemas,
>
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'group'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	/* When enabled, the coordinate space for child elements is constrained to a centred square (the shorter side) */
	squareCoords?: CompanionGraphicsElementValue<boolean>

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
			options: CompanionGraphicsElementOptionsObject<
				Extract<TCompositeElements, CompanionCompositeElementSchemas>[K]['options']
			>
		}
	}[keyof Extract<TCompositeElements, CompanionCompositeElementSchemas>]

export type HorizontalAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'top' | 'center' | 'bottom'

export type LineOrientation = 'inside' | 'center' | 'outside'

export type ImageFillMode = 'crop' | 'fill' | 'fit'

export type ButtonGraphicsFontFamily = 'companion-sans' | 'companion-mono'

export interface ButtonGraphicsTextElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'text'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	text: CompanionGraphicsElementValue<string>

	/* 3-200, percentage of element height */
	fontsize?: CompanionGraphicsElementValue<number>
	/* Allow the text to shrink below the configured size when it is too long to fit */
	fontsizeAllowShrink?: CompanionGraphicsElementValue<boolean>

	font?: CompanionGraphicsElementValue<ButtonGraphicsFontFamily>

	color?: CompanionGraphicsElementValue<number>

	halign?: CompanionGraphicsElementValue<HorizontalAlignment>
	valign?: CompanionGraphicsElementValue<VerticalAlignment>

	outlineColor?: CompanionGraphicsElementValue<number>
}

export interface ButtonGraphicsImageElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'image'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	base64Image: CompanionGraphicsElementValue<string | null>

	halign?: CompanionGraphicsElementValue<HorizontalAlignment>
	valign?: CompanionGraphicsElementValue<VerticalAlignment>

	fillMode?: CompanionGraphicsElementValue<ImageFillMode>
}

export interface ButtonGraphicsBorderProperties {
	borderWidth?: CompanionGraphicsElementValue<number> // 0 to disable
	borderColor?: CompanionGraphicsElementValue<number>
	borderPosition?: CompanionGraphicsElementValue<LineOrientation>
}

export interface ButtonGraphicsBoxElement
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds, ButtonGraphicsBorderProperties {
	type: 'box'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	color?: CompanionGraphicsElementValue<number>
}

export interface ButtonGraphicsLineElement extends ButtonGraphicsElementBase, ButtonGraphicsBorderProperties {
	type: 'line'

	/* 0-100 */
	fromX?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	fromY?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	toX?: CompanionGraphicsElementValue<number>
	/* 0-100 */
	toY?: CompanionGraphicsElementValue<number>
}

export interface ButtonGraphicsCircleElement
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds, ButtonGraphicsBorderProperties {
	type: 'circle'

	color?: CompanionGraphicsElementValue<number>

	startAngle?: CompanionGraphicsElementValue<number> // degrees 0-359
	endAngle?: CompanionGraphicsElementValue<number> // degrees 0-359

	drawSlice?: CompanionGraphicsElementValue<boolean>
	borderOnlyArc?: CompanionGraphicsElementValue<boolean>
}
