import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';

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
      if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true });
      if (existsSync('sitemap.xml')) cpSync('sitemap.xml', 'dist/sitemap.xml');
      if (existsSync('robots.txt')) cpSync('robots.txt', 'dist/robots.txt');
    }
  }]
});
