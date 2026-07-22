import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        museum: new URL('./index.html', import.meta.url).pathname,
        builder: new URL('./builder/index.html', import.meta.url).pathname,
        morphospace: new URL('./morphospace/index.html', import.meta.url).pathname,
      },
    },
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
});
