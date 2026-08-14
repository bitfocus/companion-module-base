import type { JsonValue } from '@companion-module/base'

/**
 * The result of validating a single input value.
 *
 * This is the shared shape returned by every validation primitive as well as the {@link validateInputValue}
 * orchestrator.
 */
export interface ValueValidationResult<T = JsonValue | undefined> {
	/**
	 * The value after sanitisation (e.g. coerced to the correct type, rounded, clamped).
	 * When there is a `validationError` this may still be populated with a best-effort value.
	 */
	sanitisedValue: T

	/**
	 * A human readable error message when the value is invalid and could not be sanitised into something
	 * usable, otherwise `undefined`.
	 */
	validationError: string | undefined

	/**
	 * Human readable warnings raised while sanitising the value (e.g. "Value was clamped to 100").
	 * These do not indicate failure, the `sanitisedValue` is still usable.
	 */
	validationWarnings: string[]

	/**
	 * Tri-state summary of validation, intended as a hint for a UI:
	 * - `true` — the value was checked and is valid
	 * - `false` — the value failed validation (a `validationError` is present)
	 * - `undefined` — there was nothing to validate for this field
	 */
	validity?: boolean | undefined
}
