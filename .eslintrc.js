module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Basic rules for code quality
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console.log in Node.js
    'no-undef': 'error',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '.eslintrc.js',
  ],
}; 