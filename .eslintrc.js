module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    // Basic rules for code quality
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console.log in Node.js
    'no-undef': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Temporarily disable
    '@typescript-eslint/no-unused-vars': 'warn',
    'prefer-const': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.eslintrc.js',
  ],
}; 