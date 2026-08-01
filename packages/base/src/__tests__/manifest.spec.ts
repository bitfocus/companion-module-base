import { describe, expect, it } from 'vitest'
import { validateManifest, type ModuleManifest } from '../manifest.js'

function validManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
	return {
		type: 'connection',
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
			expect(() => validateManifest(null, true)).toThrow('Manifest validation failed')
		})

		it('throws when passed a string', () => {
			expect(() => validateManifest('hello', true)).toThrow('Manifest validation failed')
		})

		it('throws when passed a number', () => {
			expect(() => validateManifest(42, true)).toThrow('Manifest validation failed')
		})
	})

	describe('schema validation', () => {
		it('accepts a valid manifest', () => {
			expect(() => validateManifest(validManifest(), true)).not.toThrow()
		})

		it('accepts a valid manifest under strict checks', () => {
			expect(() => validateManifest(validManifest(), false)).not.toThrow()
		})

		it('accepts the node26 runtime type', () => {
			expect(() =>
				validateManifest(validManifest({ runtime: { ...validManifest().runtime, type: 'node26' } }), true),
			).not.toThrow()
		})

		it('accepts optional isPrerelease', () => {
			expect(() => validateManifest(validManifest({ isPrerelease: true }), true)).not.toThrow()
		})

		it('accepts optional runtime permissions', () => {
			expect(() =>
				validateManifest(
					validManifest({
						runtime: { ...validManifest().runtime, permissions: { 'worker-threads': true, filesystem: true } },
					}),
					true,
				),
			).not.toThrow()
		})

		it('accepts bonjourQueries in both single and array form', () => {
			expect(() =>
				validateManifest(
					validManifest({
						bonjourQueries: {
							single: { type: '_http._tcp', protocol: 'tcp' },
							multiple: [
								{ type: '_http._tcp', protocol: 'tcp' },
								{ type: '_osc._udp', protocol: 'udp', addressFamily: 'ipv4+6' },
							],
						},
					}),
					true,
				),
			).not.toThrow()
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
				`/id must not contain the module template placeholder "companion-module-your-module-name"`,
			)
		})

		it('throws when shortname contains the template shortname', () => {
			expect(() => validateManifest(validManifest({ shortname: 'module-shortname' }), false)).toThrow(
				`/shortname must not contain the module template placeholder "module-shortname"`,
			)
		})

		it('throws when description contains the template description', () => {
			const desc = 'A short one line description of your module'
			expect(() => validateManifest(validManifest({ description: desc }), false)).toThrow(
				`/description must not contain the module template placeholder "${desc}"`,
			)
		})

		it('throws when a maintainer name contains the template name', () => {
			expect(() => validateManifest(validManifest({ maintainers: [{ name: 'Your name' }] }), false)).toThrow(
				`/maintainers/0/name must not contain the module template placeholder "Your name"`,
			)
		})

		it('throws when a maintainer email contains the template email', () => {
			expect(() =>
				validateManifest(validManifest({ maintainers: [{ name: 'Test Author', email: 'Your email' }] }), false),
			).toThrow(`/maintainers/0/email must not contain the module template placeholder "Your email"`)
		})

		it('throws when manufacturer contains the template company', () => {
			expect(() => validateManifest(validManifest({ manufacturer: 'Your company' }), false)).toThrow(
				`/manufacturer must not contain the module template placeholder "Your company"`,
			)
		})

		it('throws when products contains the template product', () => {
			expect(() => validateManifest(validManifest({ products: ['Your product'] }), false)).toThrow(
				`/products/0 must not contain the module template placeholder "Your product"`,
			)
		})

		it('does not throw for template placeholders when looseChecks=true', () => {
			expect(() => validateManifest(validManifest({ manufacturer: 'Your company' }), true)).not.toThrow()
		})
	})

	describe('unique items', () => {
		it('throws when keywords contains duplicates', () => {
			expect(() => validateManifest(validManifest({ keywords: ['a', 'a'] }), true)).toThrow(
				'/keywords must not contain duplicate items',
			)
		})

		it('throws when maintainers contains duplicates', () => {
			const maintainer = { name: 'Test Author', email: 'test@example.com' }
			expect(() => validateManifest(validManifest({ maintainers: [maintainer, { ...maintainer }] }), true)).toThrow(
				'/maintainers must not contain duplicate items',
			)
		})

		it('accepts unique items', () => {
			expect(() => validateManifest(validManifest({ keywords: ['a', 'b'] }), true)).not.toThrow()
		})
	})

	// Unknown properties must be tolerated so that a manifest produced by a newer
	// tool (with fields this version doesn't know about yet) still validates.
	describe('forwards compatibility (unknown properties)', () => {
		it('accepts an unknown top-level property', () => {
			const m = { ...validManifest(), someFutureField: 'hello' }
			expect(() => validateManifest(m, true)).not.toThrow()
			expect(() => validateManifest(m, false)).not.toThrow()
		})

		it('accepts an unknown property inside runtime', () => {
			const m = validManifest({ runtime: { ...validManifest().runtime, someFutureField: 'hello' } as any })
			expect(() => validateManifest(m, true)).not.toThrow()
		})

		it('accepts an unknown property inside a maintainer', () => {
			const m = validManifest({ maintainers: [{ name: 'Test Author', someFutureField: 'hello' } as any] })
			expect(() => validateManifest(m, true)).not.toThrow()
		})

		it('accepts an unknown property inside runtime permissions', () => {
			const m = validManifest({
				runtime: { ...validManifest().runtime, permissions: { 'future-permission': true } as any },
			})
			expect(() => validateManifest(m, true)).not.toThrow()
		})
	})
})
