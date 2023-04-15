module.exports = {
  extends: ['@antfu/eslint-config-ts', 'plugin:prettier/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/brace-style': [
      'error',
      '1tbs',
      {
        allowSingleLine: true,
      },
    ],
    '@typescript-eslint/indent': 'off',
    'arrow-parens': ['error', 'always'],
    'antfu/if-newline': 'off',
    'quotes': [
      'error',
      'single',
      {
        avoidEscape: true,
      },
    ],
    'max-len': [
      'error',
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'import/no-unresolved': [
      'error',
      {
        ignore: ['vscode'],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '.',
            message:
              'Do not import from barrel files (index.{ts,js}) from within the same directory to avoid circular dependencies.',
          },
        ],
      },
    ],
  },
}
