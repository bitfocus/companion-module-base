import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import prettier from 'prettier'
import z from 'zod'
// The schema module only imports `zod`, so it can be loaded directly via Node's
// TypeScript type-stripping without a separate build step.
import { buildManifestSchema } from '../src/manifest-schema.ts'

// The published manifest schema is the *strict* one, so that editors flag any
// leftover module-template placeholders while a module is being developed.
const jsonSchema = z.toJSONSchema(buildManifestSchema(true), {
	target: 'draft-2020-12',
	// `.refine()`-based constraints (eg uniqueItems) cannot be represented in JSON
	// schema; emit what we can rather than throwing on them.
	unrepresentable: 'any',
})

// Prepend the identifying metadata that consumers reference the schema by.
const output = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: '/assets/manifest.schema.json',
	title: 'ModuleManifest',
	...jsonSchema,
}

const outputPath = fileURLToPath(new URL('../assets/manifest.schema.json', import.meta.url))

// Format through prettier so the committed file always matches the repo style.
const prettierConfig = await prettier.resolveConfig(outputPath)
const formatted = await prettier.format(JSON.stringify(output), { ...prettierConfig, parser: 'json' })
writeFileSync(outputPath, formatted)

console.log(`Wrote ${outputPath}`)
