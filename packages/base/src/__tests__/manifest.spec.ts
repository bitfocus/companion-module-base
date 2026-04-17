import { describe, it, expect } from 'vitest'
import { validateManifest } from '../manifest.js'
import type { ModuleManifest } from '../manifest.js'

function validManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
	return {
		id: 'companion-module-test',
		name: 'Test Module',
		shortname: 'test',
		description: 'A test module',
		version: '1.0.0',
		license: 'MIT',
		repository: 'https://github.com/example/companion-module-test',
		bugs: 'https://github.com/example/companion-module-test/issues',
		maintainers: [{ name: 'Test Author', email: 'test@example.com' }],
		legacyIds: [],
		runtime: {
			type: 'node22',
			api: 'nodejs-ipc',
			apiVersion: '0.0.0',
			entrypoint: 'index.js',
		},
		manufacturer: 'Test Manufacturer',
		products: ['Test Product'],
		keywords: ['test'],
		...overrides,
	}
}

describe('validateManifest', () => {
	describe('basic type guard', () => {
		it('throws when passed null', () => {
			expect(() => validateManifest(null, true)).toThrow('Manifest validation failed: must be object')
		})

		it('throws when passed a string', () => {
			expect(() => validateManifest('hello', true)).toThrow('Manifest validation failed: must be object')
		})

		it('throws when passed a number', () => {
			expect(() => validateManifest(42, true)).toThrow('Manifest validation failed: must be object')
		})
	})

	describe('schema validation', () => {
		it('accepts a valid manifest', () => {
			expect(() => validateManifest(validManifest(), true)).not.toThrow()
		})

		it('throws when id is missing', () => {
			const m = validManifest()
			delete (m as any).id
			expect(() => validateManifest(m, true)).toThrow('Manifest validation failed')
		})

		it('throws when name is missing', () => {
			const m = validManifest()
			delete (m as any).name
			expect(() => validateManifest(m, true)).toThrow('Manifest validation failed')
		})

		it('throws when products is empty', () => {
			expect(() => validateManifest(validManifest({ products: [] as any }), true)).toThrow('Manifest validation failed')
		})

		it('throws when legacyIds is missing', () => {
			const m = validManifest()
			delete (m as any).legacyIds
			expect(() => validateManifest(m, true)).toThrow('Manifest validation failed')
		})

		it('throws when runtime.type is wrong', () => {
			expect(() =>
				validateManifest(validManifest({ runtime: { ...validManifest().runtime, type: 'node99' as any } }), true),
			).toThrow('Manifest validation failed')
		})

		it('throws when runtime.api is wrong', () => {
			expect(() =>
				validateManifest(
					validManifest({ runtime: { ...validManifest().runtime, api: 'something-else' as any } }),
					true,
				),
			).toThrow('Manifest validation failed')
		})
	})

	describe('legacyIds self-reference check', () => {
		it('throws when legacyIds contains the module id', () => {
			expect(() =>
				validateManifest(validManifest({ id: 'companion-module-test', legacyIds: ['companion-module-test'] }), true),
			).toThrow(`Manifest contains itself 'companion-module-test' in legacyIds`)
		})

		it('accepts legacyIds that do not include the module id', () => {
			expect(() => validateManifest(validManifest({ legacyIds: ['companion-module-old-name'] }), true)).not.toThrow()
		})

		it('accepts an empty legacyIds array', () => {
			expect(() => validateManifest(validManifest({ legacyIds: [] }), true)).not.toThrow()
		})
	})

	describe('template placeholder checks (looseChecks=false)', () => {
		it('throws when id contains the template name', () => {
			expect(() => validateManifest(validManifest({ id: 'companion-module-your-module-name' }), false)).toThrow(
				`/id must match pattern "^((?!companion-module-your-module-name).)*$"`,
			)
		})

		it('throws when shortname contains the template shortname', () => {
			expect(() => validateManifest(validManifest({ shortname: 'module-shortname' }), false)).toThrow(
				`/shortname must match pattern "^((?!module-shortname).)*$"`,
			)
		})

		it('throws when description contains the template description', () => {
			const desc = 'A short one line description of your module'
			expect(() => validateManifest(validManifest({ description: desc }), false)).toThrow(
				`/description must match pattern "^((?!A short one line description of your module).)*$"`,
			)
		})

		it('throws when a maintainer name contains the template name', () => {
			expect(() => validateManifest(validManifest({ maintainers: [{ name: 'Your name' }] }), false)).toThrow(
				`/maintainers/0/name must match pattern "^((?!Your name).)*$"`,
			)
		})

		it('throws when a maintainer email contains the template email', () => {
			expect(() =>
				validateManifest(validManifest({ maintainers: [{ name: 'Test Author', email: 'Your email' }] }), false),
			).toThrow(`/maintainers/0/email must match pattern "^((?!Your email).)*$"`)
		})

		it('throws when manufacturer contains the template company', () => {
			expect(() => validateManifest(validManifest({ manufacturer: 'Your company' }), false)).toThrow(
				`/manufacturer must match pattern "^((?!Your company).)*$"`,
			)
		})

		it('throws when products contains the template product', () => {
			expect(() => validateManifest(validManifest({ products: ['Your product'] }), false)).toThrow(
				`/products/0 must match pattern "^((?!Your product).)*$"`,
			)
		})

		it('does not throw for template placeholders when looseChecks=true', () => {
			expect(() => validateManifest(validManifest({ manufacturer: 'Your company' }), true)).not.toThrow()
		})
	})
})
