export type CompanionAlignment =
	| 'left:top'
	| 'center:top'
	| 'right:top'
	| 'left:center'
	| 'center:center'
	| 'right:center'
	| 'left:bottom'
	| 'center:bottom'
	| 'right:bottom'

export type CompanionTextSize = 'auto' | '7' | '14' | '18' | '24' | '30' | '44' | number

/**
 * The basic style properties for a button
 */
export interface CompanionButtonStyleProps {
	text: string
	/**
	 * Whether the text should be treated as an expression
	 */
	textExpression?: boolean
	size: CompanionTextSize
	color: number
	bgcolor: number
	alignment?: CompanionAlignment
	pngalignment?: CompanionAlignment
	png64?: string
	show_topbar?: boolean
}
