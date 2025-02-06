import type { ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime } from '../generated/manifest.d.ts'
// @ts-expect-error no typings
// eslint-disable-next-line n/no-missing-import
import validateManifestSchema from '../generated/validate_manifest.js'

export { ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime }

/** Validate that a manifest looks correctly populated */
export function validateManifest(manifest: ModuleManifest, looseChecks: boolean): void {
	if (!looseChecks) {
		const manifestStr = JSON.stringify(manifest)
		if (manifestStr.includes('companion-module-your-module-name'))
			throw new Error(`Manifest incorrectly references template module 'companion-module-your-module-name'`)

		if (manifestStr.includes('module-shortname'))
			throw new Error(`Manifest incorrectly references template module 'module-shortname'`)

		if (manifestStr.includes('A short one line description of your module'))
			throw new Error(`Manifest incorrectly references template module 'A short one line description of your module'`)

		if (manifestStr.includes('Your name'))
			throw new Error(`Manifest incorrectly references template module 'Your name'`)

		if (manifestStr.includes('Your email'))
			throw new Error(`Manifest incorrectly references template module 'Your email'`)

		if (manifestStr.includes('Your company'))
			throw new Error(`Manifest incorrectly references template module 'Your company'`)

		if (manifestStr.includes('Your product'))
			throw new Error(`Manifest incorrectly references template module 'Your product'`)
	}

	if (manifest.legacyIds.includes(manifest.id)) {
		throw new Error(`Manifest contains itself '${manifest.id}' in legacyIds`)
	}

	if (!validateManifestSchema(manifest)) {
		const errors = validateManifestSchema.errors
		if (!errors) throw new Error(`Manifest failed validation with unknown reason`)

		throw new Error(`Manifest validation failed: ${JSON.stringify(errors)}`)
	}
}
