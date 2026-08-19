import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Store lives at the domain root: https://daralontha.com/
    base: env.VITE_BASE || '/',
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3000',
        '/uploads': 'http://127.0.0.1:3000',
      },
    },
  };
});
