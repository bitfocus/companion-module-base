import { CompanionStaticUpgradeScript } from '../module-api/upgrade'
import { EncodeIsVisible } from '../host-api/api.js'
import { CompanionInputFieldBase } from '../module-api/input'

export function serializeIsVisibleFn<T extends CompanionInputFieldBase>(options: T[]): EncodeIsVisible<T>[] {
	return options.map((option) => {
		if ('isVisible' in option) {
			if (typeof option.isVisible === 'function') {
				return {
					...option,
					isVisibleFn: option.isVisible.toString(),
					isVisible: undefined,
				}
			}
		}

		// ignore any existing `isVisibleFn` to avoid code injection
		return {
			...option,
			isVisibleFn: undefined,
		}
	})
}

export interface InstanceBaseProps<TConfig> {
	id: string
	upgradeScripts: CompanionStaticUpgradeScript<TConfig>[]
	_isInstanceBaseProps: boolean
}

export function isInstanceBaseProps<TConfig>(obj: unknown): obj is InstanceBaseProps<TConfig> {
	const obj2 = obj as InstanceBaseProps<TConfig>
	return typeof obj2 === 'object' && typeof obj2.id === 'string' && obj2._isInstanceBaseProps === true
}
