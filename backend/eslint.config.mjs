import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['dist', 'coverage'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Parameters required by a signature but not used (e.g. Express error handlers) start with "_".
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Plain Node scripts (outside TypeScript): declare the Node globals they use.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly' },
    },
  },
  prettier,
);
