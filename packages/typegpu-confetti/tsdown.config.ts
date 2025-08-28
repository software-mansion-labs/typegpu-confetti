import { defineConfig } from 'tsdown';
import typegpu from 'unplugin-typegpu/rolldown';

export default defineConfig({
  entry: ['src/index.ts', 'src/react/index.ts', 'src/react-native/index.ts'],
  plugins: [typegpu({})],
});
