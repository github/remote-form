import github from 'eslint-plugin-github'

export default [
  {
    ignores: ['dist/'],
  },
  github.getFlatConfigs().browser,
  github.getFlatConfigs().recommended,
  ...github.getFlatConfigs().typescript,
  {
    rules: {
      'github/no-then': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      'github/unescaped-html-literal': 'off',
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/named': 'off',
      'eslint-comments/no-use': 'off',
      'github/no-inner-html': 'off',
      'i18n-text/no-en': 'off',
      'github/filenames-match-regex': 'off',
    },
  },
]
