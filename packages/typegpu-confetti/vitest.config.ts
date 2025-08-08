import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx,js,jsx}',
      'src/react/**/*.test.{ts,tsx,js,jsx}'
    ],
  },
  resolve: {
    alias: {
      '@': './src',
      '@react': './src/react'
    }
  }
});
