module.exports = {
  extends: ['expo', '@react-native'],
  env: {
    jest: true,
    node: true,
  },
  globals: {
    __dirname: 'readonly',
    require: 'readonly',
    jest: 'readonly',
    fetch: 'readonly',
    global: 'readonly',
    module: 'readonly',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', 'jest.setup.js', 'jest.setup.cjs'],
      env: {
        jest: true,
      },
      globals: {
        jest: 'readonly',
        require: 'readonly',
      },
    },
    {
      files: ['metro.config.js', 'metro.config.cjs', 'babel.config.js', '.eslintrc.js'],
      env: {
        node: true,
      },
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
  ],
};
