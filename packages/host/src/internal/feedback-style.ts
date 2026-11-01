import type { ExpressionOrValue, JsonValue } from '@companion-module/base'
import type { HostFeedbackDefaultStyleOverride } from '../context.js'

const VALID_ELEMENTS = new Set<unknown>(['text', 'background', 'image'])

function isExpressionOrValue(value: unknown): value is ExpressionOrValue<JsonValue | undefined> {
	return !!value && typeof value === 'object' && 'isExpression' in value && typeof value.isExpression === 'boolean'
}

/**
 * Convert the `defaultStyleOverrides` of a feedback definition into the format sent to Companion.
 * Plain values are wrapped as `ExpressionOrValue`, and value feedback overrides are always expressions.
 * Entries which are not valid are dropped and reported in `invalid`.
 */
export function convertFeedbackDefaultStyleOverrides(
	feedbackType: 'boolean' | 'value',
	overrides: unknown,
): { overrides: HostFeedbackDefaultStyleOverride[] | undefined; invalid: boolean } {
	if (overrides === undefined) return { overrides: undefined, invalid: false }
	if (!Array.isArray(overrides)) return { overrides: undefined, invalid: true }

	const result: HostFeedbackDefaultStyleOverride[] = []
	let invalid = false

	for (const override of overrides) {
		if (
			!override ||
			typeof override !== 'object' ||
			!VALID_ELEMENTS.has(override.element) ||
			typeof override.property !== 'string' ||
			!('override' in override)
		) {
			invalid = true
			continue
		}

		let value: ExpressionOrValue<JsonValue | undefined>
		if (feedbackType === 'value') {
			if (typeof override.override !== 'string') {
				invalid = true
				continue
			}
			value = { isExpression: true, value: override.override }
		} else {
			value = isExpressionOrValue(override.override)
				? override.override
				: { isExpression: false, value: override.override }
		}

		result.push({
			element: override.element,
			property: override.property,
			override: value,
		})
	}

	return { overrides: result, invalid }
}
