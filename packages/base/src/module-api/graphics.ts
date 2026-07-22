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
 * A color value for a button graphics element property.
 *
 * Modules may provide either a number (e.g. `0xFF0000` for red) or a css string (e.g. `'#FF0000'` or `rgb(255, 0, 0)` for red).
 */
export type CompanionColorValue = number | string

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
	| ButtonGraphicsGaugeElement

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

	color?: CompanionGraphicsElementValue<CompanionColorValue>

	halign?: CompanionGraphicsElementValue<HorizontalAlignment>
	valign?: CompanionGraphicsElementValue<VerticalAlignment>

	outlineColor?: CompanionGraphicsElementValue<CompanionColorValue>
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
	borderColor?: CompanionGraphicsElementValue<CompanionColorValue>
	borderPosition?: CompanionGraphicsElementValue<LineOrientation>
}

export interface ButtonGraphicsBoxElement
	extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds, ButtonGraphicsBorderProperties {
	type: 'box'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	color?: CompanionGraphicsElementValue<CompanionColorValue>
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

	color?: CompanionGraphicsElementValue<CompanionColorValue>

	startAngle?: CompanionGraphicsElementValue<number> // degrees 0-359
	endAngle?: CompanionGraphicsElementValue<number> // degrees 0-359

	drawSlice?: CompanionGraphicsElementValue<boolean>
	borderOnlyArc?: CompanionGraphicsElementValue<boolean>
}

export type GaugeOrientation = 'horizontal' | 'vertical' | 'ring'
export type GaugeTrackStyle = 'transparent' | 'dimmed'

/** A single colour stop on a gauge. */
export interface ButtonGraphicsGaugeStop {
	/* The value at which this stop applies, in the Min..Max range */
	value: CompanionGraphicsElementValue<number>
	color: CompanionGraphicsElementValue<CompanionColorValue>
	/* Gradient to the next stop */
	gradient: CompanionGraphicsElementValue<boolean>
}

export interface ButtonGraphicsGaugeElement extends ButtonGraphicsElementBase, ButtonGraphicsDrawBounds {
	type: 'gauge'

	rotation?: CompanionGraphicsElementValue<number> // degrees 0-359

	// Value
	/* The current value of the gauge, in the Min..Max range */
	value?: CompanionGraphicsElementValue<number>
	/* The value mapped to the start */
	min?: CompanionGraphicsElementValue<number>
	/* The value mapped to the end */
	max?: CompanionGraphicsElementValue<number>
	/* The value the fill grows from */
	origin?: CompanionGraphicsElementValue<number>
	/* Grows outward in both directions from the origin */
	symmetric?: CompanionGraphicsElementValue<boolean>

	// Appearance
	orientation?: CompanionGraphicsElementValue<GaugeOrientation>
	/* Gauge fills from the opposite end */
	reverse?: CompanionGraphicsElementValue<boolean>

	// Circular styling
	/* Angle of the start of the arc, degrees 0-360 */
	startAngle?: CompanionGraphicsElementValue<number>
	/* Angle of the end of the arc, degrees 0-360 */
	endAngle?: CompanionGraphicsElementValue<number>
	/* Width of the ring, as a percentage 1-50 */
	ringWidth?: CompanionGraphicsElementValue<number>
	roundedEnds?: CompanionGraphicsElementValue<boolean>

	// Fill
	/* Draw the filled portion of the gauge */
	fillEnabled?: CompanionGraphicsElementValue<boolean>
	/* When enabled, each colour stop is visible in the filled portion. When disabled, only the active stop colour is used for the entire filled area. */
	multiColour?: CompanionGraphicsElementValue<boolean>
	stops?: ButtonGraphicsGaugeStop[]

	// Marker
	/* Draw a marker line at the current value, across the full width of the fill */
	markerEnabled?: CompanionGraphicsElementValue<boolean>
	markerColor?: CompanionGraphicsElementValue<CompanionColorValue>
	/* Thickness of the marker line as a percentage of the fill width, 1-100 */
	markerWidth?: CompanionGraphicsElementValue<number>

	// Track
	/* How to render the unfilled track behind the fill */
	trackStyle?: CompanionGraphicsElementValue<GaugeTrackStyle>
	/* How much of the original colour remains in the unfilled track. 0 = invisible / black, 100 = same as the active colour. */
	trackAmount?: CompanionGraphicsElementValue<number>
	/* Width of the track relative to the available space, centred. 0-100 */
	trackWidth?: CompanionGraphicsElementValue<number>
}
