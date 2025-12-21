/// <reference types="vitest/config" />
// eslint-disable-next-line n/no-extraneous-import
import { defineConfig } from 'vite'

export default defineConfig({
	test: {
		environment: 'node',
		exclude: ['**/node_modules/**', '**/dist/**'],
		coverage: {
			provider: 'v8',
			include: ['**/src/**/*.ts', '!**/node_modules/**'],
		},
	},
})
