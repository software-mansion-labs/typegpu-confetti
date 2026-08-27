import typegpu from 'eslint-plugin-typegpu';
import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/ios/**', '**/android/**'],
  jsPlugins: ['eslint-plugin-typegpu'],
  plugins: ['typescript', 'unicorn', 'oxc'],
  rules: {
    ...typegpu.configs.recommended.rules,
  },
});
