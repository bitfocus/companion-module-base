/// <reference types="vitest/config" />
// eslint-disable-next-line n/no-extraneous-import
import { defineConfig } from 'vite'

export default defineConfig({
	test: {
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['**/src/**/*.ts', '!**/node_modules/**'],
		},
		projects: [
			{
				test: {
					name: 'base',
					root: 'packages/companion-module-base',
					exclude: ['**/node_modules/**', '**/dist/**'],
				},
			},
			{
				test: {
					name: 'host',
					root: 'packages/companion-module-host',
					exclude: ['**/node_modules/**', '**/dist/**'],
				},
			},
		],
	},
})
