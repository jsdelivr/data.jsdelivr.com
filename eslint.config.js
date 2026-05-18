import { defineConfig } from 'eslint/config';
import javascript from '@martin-kolarik/eslint-config';

export default defineConfig([
	{
		ignores: [ 'coverage/**' ],
	},
	...javascript,
	{
		languageOptions: {
			globals: {
				db: 'readonly',
				log: 'readonly',
			},
		},
	},
	{
		files: [ 'migrations/**', 'test/**' ],

		rules: {
			'@stylistic/array-element-newline': 'off',
		},

		languageOptions: {
			globals: {
				server: 'readonly',
				chai: 'readonly',
				chaiSnapshotInstance: 'readonly',
				expect: 'readonly',
			},
		},
	},
]);
