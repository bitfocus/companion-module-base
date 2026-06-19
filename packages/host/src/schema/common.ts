import z from 'zod'
import type { CompanionGraphicsElementValue, JsonValue } from '@companion-module/base'

/**
 * Schema for a graphics element value: either a plain value, or an `ExpressionOrValue` wrapper.
 * Modules may provide either form (see `CompanionGraphicsElementValue`), so accept both here.
 */
export function eov<T extends JsonValue | undefined>(
	schema: z.ZodType<T>,
): z.ZodType<CompanionGraphicsElementValue<T>> {
	return z.union([
		schema,
		z.object({ value: schema, isExpression: z.literal(false) }),
		z.object({ value: z.string(), isExpression: z.literal(true) }),
	]) satisfies z.ZodType<CompanionGraphicsElementValue<T>>
}

// ── Compile-time schema coverage guards ───────────────────────────────────────
// Two checks prevent drift when interfaces gain new properties:
//
//   1. `schema satisfies z.ZodType<T>`          — catches wrong property types
//   2. `true satisfies AssertCoversKeys<…, T>`  — catches missing optional keys
//      that (1) alone misses due to structural subtyping
//      (`{ a }` satisfies `{ a, b?: T }` even though `b` is absent from the schema)

export type AssertCoversKeys<TSchema extends z.ZodObject<any>, TInterface> = [keyof TInterface] extends [
	keyof (TSchema extends z.ZodObject<infer S> ? S : never),
]
	? [keyof (TSchema extends z.ZodObject<infer S> ? S : never)] extends [keyof TInterface]
		? true
		: never
	: never
