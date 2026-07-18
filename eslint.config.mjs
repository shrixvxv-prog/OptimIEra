import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/.docusaurus/**',
    ],
  },
  { files: ['**/*.ts', '**/*.tsx'], languageOptions: { parser: tsParser } },
];
