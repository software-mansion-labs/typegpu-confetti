import react from '@vitejs/plugin-react';
import typegpuPlugin from 'unplugin-typegpu/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), typegpuPlugin({})],
});
