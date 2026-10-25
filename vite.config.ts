import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5212, strictPort: true },
  preview: { host: '0.0.0.0', port: 4212, strictPort: true },
  build: { chunkSizeWarningLimit: 3000 },
});
