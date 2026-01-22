import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
	ignores: ['coverage/**'],
})

const customConfig = [
	...baseConfig,

	{
		// Fixup typescript not finding the config correctly
		files: ['**/*.ts', '**/*.cts', '**/*.mts'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: __dirname,
				project: ['./tsconfig.json', './tsconfig.tests.json', './packages/*/tsconfig.json'],
			},
		},
	},

	{
		files: ['**/__tests__/**/*', '**/__mocks__/**/*', '**/examples/**/*'],
		rules: {
			'n/no-extraneous-require': 'off',
			'n/no-extraneous-import': 'off',
			'n/no-process-exit': 'off',
		},
	},
]

export default customConfig
