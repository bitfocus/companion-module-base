// eslint-disable-next-line n/no-extraneous-import
import { $ } from 'zx'
import fs from 'fs'
import Ajv2020 from 'ajv/dist/2020.js'
import standaloneCode from 'ajv/dist/standalone/index.js'
import manifestSchema from '../assets/manifest.schema.json' with { type: 'json' }
import { fileURLToPath } from 'url'

// Compile Typescript definitions from the JSON schema
await $`json2ts --input assets/manifest.schema.json --output generated/manifest.d.ts --additionalProperties=false`

{
	// The generated code be in esm export format:
	const ajv = new Ajv2020({ code: { source: true, esm: true } })
	const validate = ajv.compile(manifestSchema)
	const moduleCode = standaloneCode(ajv, validate)

	// Now you can write the module code to file
	const outputPath = new URL('../generated/validate_manifest.js', import.meta.url)
	fs.writeFileSync(outputPath, moduleCode)

	// the reference to ajv runtime makes some consumers grumpy, so pre-bundle it with esbuild
	await $`esbuild --bundle ${fileURLToPath(outputPath)} --outfile=${fileURLToPath(outputPath)} --target=node22 --platform=node --format=esm --allow-overwrite`
}
