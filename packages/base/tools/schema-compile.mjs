/* eslint-disable n/no-extraneous-import */
import fs from 'fs'
import { fileURLToPath } from 'url'
import Ajv2020 from 'ajv/dist/2020.js'
import standaloneCode from 'ajv/dist/standalone/index.js'
import { $ } from 'zx'
import looseManifestSchema from '../assets/loose-manifest.schema.json' with { type: 'json' }
import manifestSchema from '../assets/manifest.schema.json' with { type: 'json' }
import strictRefinementsSchema from '../assets/strict-refinements.schema.json' with { type: 'json' }

// Compile Typescript definitions from the JSON schema
await $`json2ts --cwd assets --input assets/manifest.schema.json --output generated/manifest.d.ts --additionalProperties=false`

{
	// The generated code be in esm export format:
	const ajv = new Ajv2020({
		schemas: [looseManifestSchema, manifestSchema, strictRefinementsSchema],
		code: { source: true, esm: true },
	})
	const moduleCode = standaloneCode(ajv, {
		LooseModuleManifest: '/assets/loose-manifest.schema.json',
		ModuleManifest: '/assets/manifest.schema.json',
	})

	// Now you can write the module code to file
	const outputPath = new URL('../generated/validate_manifest.js', import.meta.url)
	fs.writeFileSync(outputPath, moduleCode)

	// the reference to ajv runtime makes some consumers grumpy, so pre-bundle it with esbuild
	await $`esbuild --bundle ${fileURLToPath(outputPath)} --outfile=${fileURLToPath(outputPath)} --target=node22 --platform=node --format=esm --allow-overwrite`
}
