import type { ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime } from '../generated/manifest'
// @ts-expect-error no typings
import validateManifestSchema from '../generated/validate_manifest'

export { ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime }

/** Validate that a manifest looks correctly populated */
export function validateManifest(manifest: ModuleManifest): void {
	if (!validateManifestSchema(manifest)) {
		const errors = validateManifestSchema.errors
		if (!errors) throw new Error(`Manifest failed validation with unknown reason`)

		throw new Error(`Manifest validation failed: ${JSON.stringify(errors)}`)
	}
}
