import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2024',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@threejs/webgpu-renderer'],
          vendor: ['gsap', 'dat.gui'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@renderers': resolve(__dirname, 'src/renderers'),
      '@loaders': resolve(__dirname, 'src/loaders'),
      '@controls': resolve(__dirname, 'src/controls'),
      '@shaders': resolve(__dirname, 'src/shaders'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  optimizeDeps: {
    include: ['three', '@threejs/webgpu-renderer', 'gsap', 'dat.gui'],
  },
});