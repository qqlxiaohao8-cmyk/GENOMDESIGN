import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__genom/pinterest-widgets': {
        target: 'https://widgets.pinterest.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__genom\/pinterest-widgets/, ''),
      },
    },
  },
});
