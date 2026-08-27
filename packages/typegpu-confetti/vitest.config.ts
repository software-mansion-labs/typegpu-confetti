import typegpuPlugin from 'unplugin-typegpu/vite';
import { defineConfig } from 'vitest/config';

// Shader callbacks need the TypeGPU transform to resolve to WGSL in tests.
export default defineConfig({
  plugins: [typegpuPlugin({})],
});
