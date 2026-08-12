import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateManifest } from '../manifest.js'

// Regression fixtures: real-world-shaped manifest JSON files kept on disk. JSON
// files are far less likely to be accidentally refactored than inline TS
// objects, so they are a durable guard that manifests which validated against
// older versions of the schema keep validating against this one.

const fixturesRoot = new URL('./manifests/', import.meta.url)

function readFixtures(dir: string): { name: string; manifest: unknown }[] {
	const dirUrl = new URL(`${dir}/`, fixturesRoot)
	return readdirSync(dirUrl)
		.filter((file) => file.endsWith('.json'))
		.sort()
		.map((file) => ({
			name: file,
			manifest: JSON.parse(readFileSync(fileURLToPath(new URL(file, dirUrl)), 'utf8')),
		}))
}

describe('manifest fixtures on disk', () => {
	describe('valid/ – must pass both loose and strict validation', () => {
		it.each(readFixtures('valid'))('$name passes loose validation', ({ manifest }) => {
			expect(() => validateManifest(manifest, true)).not.toThrow()
		})

		it.each(readFixtures('valid'))('$name passes strict validation', ({ manifest }) => {
			expect(() => validateManifest(manifest, false)).not.toThrow()
		})
	})

	describe('loose-only/ – must pass loose but be rejected by strict validation', () => {
		it.each(readFixtures('loose-only'))('$name passes loose validation', ({ manifest }) => {
			expect(() => validateManifest(manifest, true)).not.toThrow()
		})

		it.each(readFixtures('loose-only'))('$name is rejected by strict validation', ({ manifest }) => {
			expect(() => validateManifest(manifest, false)).toThrow('Manifest validation failed')
		})
	})

	describe('invalid/ – must be rejected even by loose validation', () => {
		it.each(readFixtures('invalid'))('$name is rejected by loose validation', ({ manifest }) => {
			expect(() => validateManifest(manifest, true)).toThrow('Manifest validation failed')
		})
	})
})
