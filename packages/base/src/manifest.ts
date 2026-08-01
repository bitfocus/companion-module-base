import z from 'zod'
import {
	buildManifestSchema,
	type ModuleBonjourQuery,
	type ModuleManifest,
	type ModuleManifestMaintainer,
	type ModuleManifestRuntime,
} from './manifest-schema.js'

export type { ModuleManifest, ModuleManifestMaintainer, ModuleManifestRuntime, ModuleBonjourQuery }

// Build both schemas once, up front, so validation is cheap on repeat calls.
const strictManifestSchema = buildManifestSchema(true)
const looseManifestSchema = buildManifestSchema(false)

/** Format zod issues into a single, ajv-like, human readable string. */
function formatValidationError(error: z.ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? `/${issue.path.join('/')}` : ''
			return path ? `${path} ${issue.message}` : issue.message
		})
		.join('; ')
}

/**
 * Validate that a manifest looks correctly populated.
 *
 * @param manifest the manifest to validate
 * @param looseChecks when `true`, skip the checks that reject leftover module
 *   template placeholder values. Used while a module is still being developed.
 */
export function validateManifest(manifest: unknown, looseChecks: boolean): asserts manifest is ModuleManifest {
	const schema = looseChecks ? looseManifestSchema : strictManifestSchema

	const result = schema.safeParse(manifest)
	if (!result.success) {
		throw new Error(`Manifest validation failed: ${formatValidationError(result.error)}`)
	}

	if (result.data.legacyIds.includes(result.data.id)) {
		throw new Error(`Manifest contains itself '${result.data.id}' in legacyIds`)
	}
}
