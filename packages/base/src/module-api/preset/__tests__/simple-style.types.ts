/**
 * Type-level tests for the `style` of simple presets.
 * This file is checked by `tsc` (via tsconfig.tests.json), it does not contain any runtime tests.
 */
import type { CompanionPresetButtonStyle } from '../definition.js'

export const plainValues: CompanionPresetButtonStyle = {
	text: 'Hello $(my-module:name)',
	size: 'auto',
	color: 0xffffff,
	bgcolor: '#000000',
	alignment: 'center:center',
	show_topbar: false,
}

export const expressionValues: CompanionPresetButtonStyle = {
	text: { isExpression: true, value: '`Init ${$(my-module:name)}`' },
	size: { isExpression: true, value: '$(my-module:size)' },
	color: { isExpression: true, value: '$(my-module:active) ? 0xff0000 : 0xffffff' },
	bgcolor: { isExpression: false, value: 0 },
	alignment: { isExpression: true, value: '"left:top"' },
	pngalignment: { isExpression: false, value: 'center:bottom' },
	png64: { isExpression: true, value: '$(my-module:image)' },
	show_topbar: { isExpression: true, value: '$(my-module:topbar)' },
}

export const legacyTextExpression: CompanionPresetButtonStyle = {
	text: '`Init ${$(my-module:name)}`',
	textExpression: true,
	size: 'auto',
	color: 0xffffff,
	bgcolor: 0,
}

export const rejectedWrongType: CompanionPresetButtonStyle = {
	text: 'a',
	size: 'auto',
	color: 0xffffff,
	bgcolor: 0,
	// @ts-expect-error not a valid alignment
	alignment: { isExpression: false, value: 'middle' },
}
