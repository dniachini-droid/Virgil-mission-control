import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The study page's own build. It touches nothing the preservation contract
 * names: its entry is `study/screens-v11.html`, its output is
 * `dist/study-v11`, and neither Owner Build config, entry or script is
 * involved. It exists so the four displays can be looked at in a browser
 * in seconds instead of through a forty-minute owner build.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist/study-v11',
    emptyOutDir: true,
    rollupOptions: { input: 'study/screens-v11.html' },
  },
});
