// Vite dev server. Requests to /api are forwarded to the Express server on port 4000,
// so the browser sees ONE origin (no CORS needed, cookies work simply).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: false },
    },
  },
});
