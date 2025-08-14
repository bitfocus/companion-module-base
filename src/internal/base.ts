import type { CompanionStaticUpgradeScript } from '../module-api/upgrade.js'
import type { EncodeIsVisible } from '../host-api/api.js'
import type { CompanionInputFieldBase } from '../module-api/input.js'

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

export interface InstanceBaseProps<TConfig, TSecrets> {
	id: string
	upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[]
	_isInstanceBaseProps: boolean
}

export function isInstanceBaseProps<TConfig, TSecrets>(obj: unknown): obj is InstanceBaseProps<TConfig, TSecrets> {
	const obj2 = obj as InstanceBaseProps<TConfig, TSecrets>
	return typeof obj2 === 'object' && typeof obj2.id === 'string' && obj2._isInstanceBaseProps === true
}
