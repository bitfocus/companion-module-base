import type { ErrorObject, ValidateFunction } from 'ajv'
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

function formatValidationErrors(errors: ErrorObject[]): string {
	return errors
		.map(({ instancePath, message }) => {
			message = message || '<unknown error>'
			return instancePath ? `${instancePath} ${message}` : message
		})
		.join('; ')
}

function validate<T>(validateFunc: ValidateFunction<T>, manifest: unknown): asserts manifest is T {
	if (!validateFunc(manifest)) {
		const errors = validateFunc.errors
		if (!errors) throw new Error(`Manifest failed validation with unknown reason`)

		throw new Error(`Manifest validation failed: ${formatValidationErrors(errors)}`)
	}
}

type ManifestType<Loose extends boolean> = [Loose, false] extends [false, Loose] ? ModuleManifest : LooseModuleManifest

/** Validate that a manifest looks correctly populated */
export function validateManifest<Loose extends boolean>(
	manifest: unknown,
	looseChecks: Loose,
): asserts manifest is ManifestType<Loose> {
	if (looseChecks) {
		validate(looseValidateManifestSchema as ValidateFunction<LooseModuleManifest>, manifest)
	} else {
		validate(validateManifestSchema as ValidateFunction<ModuleManifest>, manifest)
	}

	if (manifest.legacyIds.includes(manifest.id)) {
		throw new Error(`Manifest contains itself '${manifest.id}' in legacyIds`)
	}
}
