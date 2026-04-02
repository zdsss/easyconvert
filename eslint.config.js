import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        window: 'readonly',
        alert: 'readonly',
        FileList: 'readonly',
        URLSearchParams: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        crypto: 'readonly',
        React: 'readonly',
        AbortController: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/react-in-jsx-scope': 'off',
      'no-undef': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    },
    settings: {
      react: { version: 'detect' }
    }
  }
];
