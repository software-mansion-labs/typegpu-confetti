import type { Config } from 'jest';

const config: Config = {
  displayName: 'shared',
  testEnvironment: 'jest-environment-jsdom',
  rootDir: './../',
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/*.test.{js,ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        babelConfig: true,
        diagnostics: false,
      },
    ],
  },
};

export default config;
