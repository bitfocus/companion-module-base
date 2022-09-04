import { ModuleManifest } from '../generated/manifest'
import manifestSchema from '../generated/manifest-json'
import Ajv, { ValidateFunction } from 'ajv'

export { ModuleManifest }

const ajv = new Ajv()
let validator: ValidateFunction | undefined

/** Validate that a manifest looks correctly populated */
export function validateManifest(manifest: ModuleManifest): void {
	if (!validator) {
		validator = ajv.compile(manifestSchema)
	}

	if (!validator(manifest)) {
		const errors = validator.errors
		if (!errors) throw new Error(`Manifest failed validation with unknown reason`)

		throw new Error(`Manifest validation failed: ${JSON.stringify(errors)}`)
	}
}
