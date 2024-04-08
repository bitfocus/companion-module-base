import type { ConditionalKeys } from 'type-fest'
import type { CompanionOptionValues, CompanionActionContext } from '../module-api/index.js'
import type { CompanionCommonCallbackContext, StrictOptions, StrictOptionsObject } from '../module-api/common.js'

export class StrictOptionsImpl<TOptions> implements StrictOptions<TOptions> {
	readonly #options: any
	readonly #context: CompanionCommonCallbackContext
	readonly #fields: StrictOptionsObject<TOptions, any>

	constructor(
		options: CompanionOptionValues,
		context: CompanionActionContext,
		fields: StrictOptionsObject<TOptions, any>
	) {
		this.#options = options
		this.#context = context
		this.#fields = fields
	}

	getRawJson(): any {
		return { ...this.#options }
	}
	getRaw<Key extends keyof TOptions>(fieldName: Key): any {
		// TODO - should this populate defaults?
		return this.#options[fieldName]
	}

	getPlainString<Key extends ConditionalKeys<TOptions, string>>(fieldName: Key): TOptions[Key] {
		const fieldSpec = this.#fields[fieldName]
		const defaultValue = fieldSpec && 'default' in fieldSpec ? fieldSpec.default : undefined

		const rawValue = this.#options[fieldName]
		if (defaultValue !== undefined && rawValue === undefined) return String(defaultValue) as any

		return String(rawValue) as any
	}

	getPlainNumber<Key extends ConditionalKeys<TOptions, number>>(fieldName: Key): TOptions[Key] {
		const fieldSpec = this.#fields[fieldName]
		const defaultValue = fieldSpec && 'default' in fieldSpec ? fieldSpec.default : undefined

		const rawValue = this.#options[fieldName]
		if (defaultValue !== undefined && rawValue === undefined) return Number(defaultValue) as any

		const value = Number(rawValue)
		if (isNaN(value)) {
			throw new Error(`Invalid option '${String(fieldName)}'`)
		}
		return value as any
	}

	getPlainBoolean<Key extends ConditionalKeys<TOptions, boolean>>(fieldName: Key): boolean {
		const fieldSpec = this.#fields[fieldName]
		const defaultValue = fieldSpec && 'default' in fieldSpec ? fieldSpec.default : undefined

		const rawValue = this.#options[fieldName]
		if (defaultValue !== undefined && rawValue === undefined) return Boolean(defaultValue)

		return Boolean(rawValue)
	}

	async getParsedString<Key extends ConditionalKeys<TOptions, string | undefined>>(fieldName: Key): Promise<string> {
		const rawValue = this.#options[fieldName]

		return this.#context.parseVariablesInString(rawValue)
	}
	async getParsedNumber<Key extends ConditionalKeys<TOptions, string | undefined>>(fieldName: Key): Promise<number> {
		const str = await this.getParsedString(fieldName)

		return Number(str)
	}
}
