import type { JsonValue } from '@companion-module/base'

export interface ValueValidationResult<T = JsonValue | undefined> {
	/** The sanitised value. Still populated (best-effort) when there is a `validationError`. */
	sanitisedValue: T

	validationError: string | undefined

	/** Warnings raised while sanitising (e.g. "Value was clamped to 100"); do not indicate failure. */
	validationWarnings: string[]

	/** `true` = valid, `false` = failed, `undefined` = nothing to validate. */
	validity?: boolean | undefined
}
