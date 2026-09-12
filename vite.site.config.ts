import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Build for the GitHub Pages demo site — a separate output from the extension.
// It imports the extension's real popup components so the demo cannot drift
// from what actually ships.
export default defineConfig({
  root: resolve(__dirname, 'site'),
  base: '/hwguradian/',
  // Its own public dir: the extension manifest has no business on the site.
  publicDir: resolve(__dirname, 'site/public'),
  resolve: {
    alias: { '@shared': resolve(__dirname, 'shared') },
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-site'),
    emptyOutDir: true,
    target: 'esnext',
  },
});
