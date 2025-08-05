import type { Config } from 'jest';

const config: Config = {
  displayName: 'react',
  testEnvironment: 'jest-environment-jsdom',
  rootDir: './../../',
  testMatch: ['<rootDir>/src/react/**/__tests__/**/*.test.{js,ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/react/jest.setup.react.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest', 
      { 
        tsconfig: 'tsconfig.json', 
        babelConfig: true,
        diagnostics: false,
      }
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
