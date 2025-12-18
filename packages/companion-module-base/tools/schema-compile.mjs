// eslint-disable-next-line n/no-extraneous-import
import { $ } from 'zx'
import fs from 'fs'
import Ajv from 'ajv'
import standaloneCode from 'ajv/dist/standalone/index.js'

// Compile Typescript definitions from the JSON schema
await $`json2ts --input assets/manifest.schema.json --output generated/manifest.d.ts --additionalProperties=false`

{
	// Once we drop node18, we can use an import statement instead of a fs readFileSync
	// import schema from '../assets/manifest.schema.json' with { type: 'json' }
	const schema = JSON.parse(fs.readFileSync(new URL('../assets/manifest.schema.json', import.meta.url), 'utf8'))

	// The generated code will have a default export:
	// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
	const ajv = new Ajv({ code: { source: true } })
	const validate = ajv.compile(schema)
	const moduleCode = standaloneCode(ajv, validate)

	// In theory we could replace the dependency on ajv's deep equal with our own import
	// but this won't reduce bundle size, or dev dependency count, so it's not worth the risk
	// const moduleCode = moduleCodeRaw.replace('require("ajv/dist/runtime/equal").default', 'require("fast-deep-equal")')
	// if (moduleCode === moduleCodeRaw) throw new Error('Did not replace deep equal import. Has ajv changed their output?')

	// Now you can write the module code to file
	fs.writeFileSync(new URL('../generated/validate_manifest.js', import.meta.url), moduleCode)
}
