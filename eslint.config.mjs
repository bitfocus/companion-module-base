import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
})

const customConfig = [
	...baseConfig,

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
