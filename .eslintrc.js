module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y'
  ],
  rules: {
    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    'react/prop-types': 'off', // We're using TypeScript for type checking
    'react/jsx-filename-extension': [1, { extensions: ['.tsx', '.jsx'] }],
    'react/jsx-props-no-spreading': 'off', // Allow JSX prop spreading
    'react/no-unescaped-entities': 'off',
    
    // TypeScript rules
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/ban-ts-comment': 'warn',
    
    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'prefer-const': 'warn',
    'arrow-body-style': ['warn', 'as-needed'],
    'no-param-reassign': 'warn',
    'no-unused-expressions': 'warn',
    
    // Accessibility rules
    'jsx-a11y/anchor-is-valid': ['error', {
      components: ['Link'],
      specialLink: ['hrefLeft', 'hrefRight'],
      aspects: ['invalidHref', 'preferButton'],
    }],
  },
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      excludedFiles: ['amplify/**/*.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    // Amplify TypeScript files (exclude from project checking)
    {
      files: ['amplify/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    },
    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    // JavaScript configuration files
    {
      files: ['*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
