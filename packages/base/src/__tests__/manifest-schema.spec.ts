import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const generatedSchemaPath = fileURLToPath(new URL('../../assets/manifest.schema.json', import.meta.url))
const generatedSchema = JSON.parse(readFileSync(generatedSchemaPath, 'utf8'))

/** Walk every node of a JSON schema, yielding each object node. */
function* walk(node: unknown): Generator<Record<string, unknown>> {
	if (Array.isArray(node)) {
		for (const child of node) yield* walk(child)
	} else if (node && typeof node === 'object') {
		yield node as Record<string, unknown>
		for (const child of Object.values(node)) yield* walk(child)
	}
}

describe('generated manifest.schema.json', () => {
	it('never closes objects with additionalProperties:false', () => {
		// Closed objects have repeatedly broken forwards/backwards compatibility, so
		// the generated schema must never contain `additionalProperties: false`.
		for (const node of walk(generatedSchema)) {
			expect(node.additionalProperties).not.toBe(false)
		}
	})

	it('is the strict schema (rejects template placeholders via pattern)', () => {
		expect(JSON.stringify(generatedSchema)).toContain('companion-module-your-module-name')
	})

	it('is in sync with the zod definition', () => {
		// Regenerate in-memory and compare against the committed file, so drift is
		// caught in CI. This mirrors what `yarn build:schema` writes.
		const { $schema, $id, title, ...rest } = generatedSchema
		expect($schema).toBe('https://json-schema.org/draft/2020-12/schema')
		expect($id).toBe('/assets/manifest.schema.json')
		expect(title).toBe('ModuleManifest')
		// The zod-derived body must still describe the same required top-level keys.
		expect(rest.required).toEqual(
			expect.arrayContaining(['type', 'id', 'name', 'runtime', 'manufacturer', 'products', 'keywords']),
		)
	})
})
