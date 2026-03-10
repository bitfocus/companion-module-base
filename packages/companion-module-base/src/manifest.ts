import type {
	LooseModuleManifest,
	ModuleManifest,
	ModuleManifestMaintainer,
	ModuleManifestRuntime,
	ModuleBonjourQuery,
} from '../generated/manifest.d.ts'
import {
	ModuleManifest as validateManifestSchema,
	LooseModuleManifest as looseValidateManifestSchema,
	// @ts-expect-error no types
	// eslint-disable-next-line n/no-missing-import
} from '../generated/validate_manifest.js'

export { LooseModuleManifest, ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime, ModuleBonjourQuery }

type ValidateFunc = ((manifest: LooseModuleManifest) => boolean) & { errors: unknown }

function tryValidation(validateFunc: ValidateFunc, manifest: LooseModuleManifest) {
	if (!validateFunc(manifest)) {
		const errors = validateFunc.errors
		if (!errors) throw new Error(`Manifest failed validation with unknown reason`)

		throw new Error(`Manifest validation failed: ${JSON.stringify(errors)}`)
	}
}

/** Validate that a manifest looks correctly populated */
export function validateManifest(manifest: LooseModuleManifest, looseChecks: boolean): void {
	if (looseChecks) {
		tryValidation(looseValidateManifestSchema, manifest)
	} else {
		tryValidation(validateManifestSchema, manifest)
	}

	if (manifest.legacyIds.includes(manifest.id)) {
		throw new Error(`Manifest contains itself '${manifest.id}' in legacyIds`)
	}
}
