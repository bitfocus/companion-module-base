import z from 'zod'

/**
 * Single source of truth for the module manifest schema.
 *
 * The manifest is validated in two modes:
 *   - `loose`  – structural validation only. Used while a module is still being
 *                developed and may still contain template placeholder values.
 *   - `strict` – structural validation plus checks that the module has been
 *                filled in properly (ie no leftover template placeholders).
 *
 * Both modes are produced from the exact same code by the generator functions
 * below, so there is only ever one description of the manifest to maintain. The
 * generated JSON schema (`assets/manifest.schema.json`) and the TypeScript types
 * are both derived from these definitions too.
 */

/** Escape a string so it can be embedded literally into a `RegExp` source. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * In strict mode, forbid a string field from containing one of the module
 * template's placeholder values.
 *
 * The constraint is expressed as a regex (rather than a `.refine()`) so that it
 * is carried through into the generated JSON schema as a `pattern`, and is
 * therefore surfaced by editors as well as enforced at runtime. In loose mode
 * the field is left untouched.
 */
function forbidPlaceholder(base: z.ZodString, placeholder: string, strict: boolean): z.ZodString {
	if (!strict) return base

	// Matches any string that does NOT contain `placeholder` anywhere ([\s\S] so
	// that newlines in eg a description are covered too).
	const pattern = new RegExp(`^((?!${escapeRegExp(placeholder)})[\\s\\S])*$`)
	return base.regex(pattern, `must not contain the module template placeholder ${JSON.stringify(placeholder)}`)
}

/** True if `arr` contains two items that are deeply equal. */
function hasDuplicates(arr: readonly unknown[]): boolean {
	const seen = new Set<string>()
	for (const item of arr) {
		const key = typeof item === 'string' ? item : JSON.stringify(item, Object.keys(item as object).sort())
		if (seen.has(key)) return true
		seen.add(key)
	}
	return false
}

/**
 * An array whose items must be unique. `uniqueItems` is attached to the JSON
 * schema output, and the same constraint is enforced at runtime.
 */
function uniqueArray<T extends z.ZodType>(item: T, opts: { min?: number } = {}) {
	let arr = z.array(item)
	if (opts.min !== undefined) arr = arr.min(opts.min)
	return arr
		.refine((value) => !hasDuplicates(value), { error: 'must not contain duplicate items' })
		.meta({
			uniqueItems: true,
		})
}

// ── Sub-schemas that do not depend on the strict/loose mode ────────────────────

const permissionsSchema = z
	.object({
		'worker-threads': z.boolean().optional().describe('Enable if the module uses worker threads'),
		'child-process': z.boolean().optional().describe('Enable if the module uses child processes'),
		'native-addons': z.boolean().optional().describe('Enable if the module uses native addons'),
		filesystem: z.boolean().optional().describe('Enable if the module requires read/write access to the filesystem'),
		'insecure-algorithms': z.boolean().optional().describe('Enable if the module requires legacy openssl algorithms'),
	})
	.describe(
		'Permissions required by the module. This is used to inform the user of the permissions required by the module.',
	)

const runtimeSchema = z
	.object({
		type: z.enum(['node22', 'node26']).describe('Type of the module. Must be: node22 or node26'),
		api: z.enum(['nodejs-ipc']).describe('Which host-api does it use. In the future alternate options will be allowed'),
		apiVersion: z.string().describe('The version of the host-api used'),
		entrypoint: z.string().describe('Entrypoint to pass to the runtime. eg index.js'),
		permissions: permissionsSchema.optional(),
	})
	.describe('Information on how to execute the module')
	.meta({ id: 'ModuleManifestRuntime', title: 'ModuleManifestRuntime' })

const bonjourQuerySchema = z
	.object({
		type: z.string(),
		protocol: z.enum(['tcp', 'udp']),
		port: z.number().optional(),
		txt: z
			.record(z.string(), z.string())
			.optional()
			.describe(
				"Match on any txt values returned in the query. This is useful to filter out devices of the same 'type' that are not supported",
			),
		addressFamily: z
			.enum(['ipv4', 'ipv6', 'ipv4+6'])
			.optional()
			.describe(
				'The address family to use when connecting to the device. If not specified, it will default to ipv4. This is useful for devices or modules that do not support ipv4 and ipv6, but discovery will find them on both',
			),
	})
	.meta({ id: 'ModuleBonjourQuery', title: 'ModuleBonjourQuery' })

// ── Mode-dependent generators ──────────────────────────────────────────────────

/** Build the maintainer sub-schema for the given strictness. */
function buildMaintainerSchema(strict: boolean) {
	return z
		.object({
			name: forbidPlaceholder(z.string(), 'Your name', strict),
			email: forbidPlaceholder(z.string(), 'Your email', strict).optional(),
			github: z.string().optional(),
			url: z.string().optional(),
		})
		.meta({ id: 'ModuleManifestMaintainer', title: 'ModuleManifestMaintainer' })
}

function buildManifestSchemaObject(strict: boolean) {
	return z
		.object({
			$schema: z.string().optional(),
			type: z.enum(['connection']).describe('Type of module. Must be: connection'),
			id: forbidPlaceholder(z.string(), 'companion-module-your-module-name', strict).describe(
				'Unique identifier for the module',
			),
			name: forbidPlaceholder(z.string(), 'companion-module-your-module-name', strict).describe('Name of the module'),
			shortname: forbidPlaceholder(z.string(), 'module-shortname', strict),
			description: forbidPlaceholder(z.string(), 'A short one line description of your module', strict).describe(
				'Description of the module',
			),
			version: z.string().describe('Current version of the module'),
			isPrerelease: z.boolean().optional().describe('Is this a pre-release version'),
			license: z.string().describe('SPDX identifier for license of the module'),
			repository: z.string().describe('URL to the source repository'),
			bugs: z.string().describe('URL to bug tracker'),
			maintainers: uniqueArray(buildMaintainerSchema(strict)).describe('List of active maintainers'),
			legacyIds: uniqueArray(z.string()).describe(
				'If the module had a different unique identifier previously, then specify it here',
			),
			runtime: runtimeSchema,
			manufacturer: forbidPlaceholder(z.string(), 'Your company', strict),
			products: uniqueArray(forbidPlaceholder(z.string(), 'Your product', strict), { min: 1 }),
			keywords: uniqueArray(z.string()),
			bonjourQueries: z
				.record(z.string(), z.union([bonjourQuerySchema, z.array(bonjourQuerySchema)]))
				.optional()
				.describe(
					"If the device or software for your module supports bonjour announcements, Companion will offer an easy way to watch for these announcements.\nEach query you define must have a matching config field of type 'bonjour-device' with the same name",
				),
		})
		.meta({ id: 'ModuleManifest', title: 'ModuleManifest' })
}

// ── Inferred types ─────────────────────────────────────────────────────────────
// The strict/loose distinction only adds runtime `pattern` constraints, so it has
// no effect on the inferred TypeScript types.

export type ModuleManifest = z.infer<ReturnType<typeof buildManifestSchemaObject>>
export type ModuleManifestMaintainer = z.infer<ReturnType<typeof buildMaintainerSchema>>
export type ModuleManifestRuntime = z.infer<typeof runtimeSchema>
export type ModuleBonjourQuery = z.infer<typeof bonjourQuerySchema>

/**
 * Build the complete manifest schema.
 *
 * @param strict when `true`, additionally reject leftover module-template
 *   placeholder values (eg `Your company`, `companion-module-your-module-name`).
 */
export function buildManifestSchema(strict: boolean): z.ZodType<ModuleManifest> {
	return buildManifestSchemaObject(strict)
}
