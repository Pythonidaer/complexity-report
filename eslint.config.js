export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      complexity: ['warn', { max: 10, variant: 'classic' }],
    },
  },
  {
    ignores: ['complexity/', 'node_modules/', 'coverage/', 'sample/'],
  },
];
