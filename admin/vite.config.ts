import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base =
    env.VITE_BASE || (mode === 'production' ? '/admin/' : '/');

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3000',
        '/uploads': 'http://127.0.0.1:3000',
      },
    },
  };
});
