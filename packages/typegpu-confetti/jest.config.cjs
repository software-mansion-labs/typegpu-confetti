module.exports = {
  preset: 'react-native',
  testEnvironment: 'jsdom',
  projects: [
    // React Native tests
    {
      displayName: 'react-native',
      preset: 'react-native',
      testMatch: ['<rootDir>/src/react-native/**/__tests__/**/*.test.{js,ts,tsx}'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|react-native-.*)/)',
      ],
    },
    // React web tests
    {
      displayName: 'react',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/react/**/__tests__/**/*.test.{js,ts,tsx}'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
      },
    },
    // Shared tests
    {
      displayName: 'shared',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/__tests__/**/*.test.{js,ts,tsx}',
        '<rootDir>/src/*.test.{js,ts,tsx}',
      ],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
      },
    },
  ],
};
