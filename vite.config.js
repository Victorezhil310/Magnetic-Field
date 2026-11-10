import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

export default defineConfig({
  base: './',
  server: { port: 5173, host: '0.0.0.0' },
  build: {
    outDir: 'dist',
    assetsDir: 'bundled',
    emptyOutDir: true
  },
  plugins: [{
    name: 'copy-laboratory-assets',
    closeBundle() {
      cpSync('assets', 'dist/assets', { recursive: true });
    }
  }]
});