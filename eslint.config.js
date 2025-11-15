import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      'build/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
    ],
  },

  // Configuration for TypeScript and JavaScript files
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Prettier config to disable conflicting ESLint rules
  prettierConfig,

  // Re-apply custom rules after Prettier
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Configuration for Astro files
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    rules: {
      // Override or add Astro-specific rules
      'astro/no-set-html-directive': 'error',
      'astro/no-unused-css-selector': 'warn',
      'astro/prefer-class-list-directive': 'warn',
    },
  },
];
