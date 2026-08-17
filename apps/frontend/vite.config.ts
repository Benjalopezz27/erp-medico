import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@erp/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
