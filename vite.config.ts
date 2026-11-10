import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/xlsx/') || id.includes('/node_modules/xlsx-js-style/')) return 'spreadsheet-export';
          if (id.includes('/node_modules/html2canvas/')) return 'image-capture';
          if (id.includes('/node_modules/jspdf/')) return 'pdf-export';
          if (id.includes('/node_modules/lucide-react/')) return 'icons';
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/')) return 'react-vendor';
        },
      },
    },
  },
});
