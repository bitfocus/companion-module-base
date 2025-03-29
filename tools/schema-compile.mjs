import fs from 'fs'
import Ajv from 'ajv'
import standaloneCode from 'ajv/dist/standalone/index.js'

// Once we drop node18, we can use an import statement instead of a fs readFileSync
// import schema from '../assets/manifest.schema.json' with { type: 'json' }
const schema = JSON.parse(fs.readFileSync(new URL('../assets/manifest.schema.json', import.meta.url), 'utf8'))

// The generated code will have a default export:
// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
const ajv = new Ajv({ code: { source: true } })
const validate = ajv.compile(schema)
let moduleCode = standaloneCode(ajv, validate)

// Now you can write the module code to file
fs.writeFileSync(new URL('../generated/validate_manifest.js', import.meta.url), moduleCode)
