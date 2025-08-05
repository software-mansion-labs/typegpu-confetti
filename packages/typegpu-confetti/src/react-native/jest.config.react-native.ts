import type { Config } from 'jest';

const config: Config = {
  displayName: 'react-native',
  testEnvironment: 'jsdom',
  rootDir: './../../',
  testMatch: ['<rootDir>/src/react-native/**/__tests__/**/*.test.{js,ts,tsx}'],
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        babelConfig: true,
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*)/)',
  ],
};

export default config;
