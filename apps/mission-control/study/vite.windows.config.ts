import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The window study's own build. Like `vite.study.config.ts` it touches nothing
 * the preservation contract names: its entry is `study/windows-v11.html`, its
 * output is `dist/study-windows-v11`, and no Owner Build config, entry or
 * script is involved.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist/study-windows-v11',
    emptyOutDir: true,
    rollupOptions: { input: 'study/windows-v11.html' },
  },
});
