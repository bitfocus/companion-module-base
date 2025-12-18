import type { EncodeIsVisible } from '../host-api/api.js'
import type { CompanionInputFieldBase } from '@companion-module/base'

export function serializeIsVisibleFn<T extends CompanionInputFieldBase>(options: T[]): EncodeIsVisible<T>[] {
	return (options ?? []).map((option) => {
		if ('isVisibleExpression' in option && typeof option.isVisibleExpression === 'string') {
			return {
				...option,
				isVisibleFnType: 'expression',
				isVisibleFn: option.isVisibleExpression,
				isVisible: undefined,
				isVisibleExpression: undefined,
			}
		} else if ('isVisible' in option && typeof option.isVisible === 'function') {
			return {
				...option,
				isVisibleFn: option.isVisible.toString(),
				isVisibleFnType: 'function',
				isVisible: undefined,
				isVisibleExpression: undefined,
			}
		}

		// ignore any existing `isVisibleFn` to avoid code injection
		return {
			...option,
			isVisible: undefined,
			isVisibleFn: undefined,
			isVisibleFnType: undefined,
			isVisibleExpression: undefined,
		}
	})
}
