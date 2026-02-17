import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/67Tetris/',
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
