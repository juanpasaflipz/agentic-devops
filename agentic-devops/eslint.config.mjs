import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.config.*',
      '**/.eslintrc.*',
      '**/*.test.ts',
      '**/*.spec.ts',
      'scripts/**',
      'tools/**/*.js',
    ],
  },
  // Base TS rules without type-aware checks
  ...tseslint.configs.recommended,
  // TypeScript-specific overrides for source files (still non type-aware)
  {
    files: ['src/**/*.ts', 'tools/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        allowDefaultProject: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Looser rules for stubbed adapters under tools/
  {
    files: ['tools/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Disable formatting-conflict rules
  eslintConfigPrettier,
);
