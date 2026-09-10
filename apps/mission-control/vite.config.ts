import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  define: { __LIVE__: false },
  plugins: [react()],
  server: { port: 5173, strictPort: true, fs: { allow: ['../..'] } },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
