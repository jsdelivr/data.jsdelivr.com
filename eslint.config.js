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
				_: 'readonly',
				db: 'readonly',
				log: 'readonly',
				redis: 'readonly',
				logger: 'readonly',
				Bluebird: 'readonly',
				apmClient: 'readonly',
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
				chaiSnapshotInstance: 'readonly',
			},
		},
	},
]);
