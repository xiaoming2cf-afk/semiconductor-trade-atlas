import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const basePath=(process.env.PAGES_BASE_PATH||'/').trim().replace(/^\/+|\/+$/g,'');
const base=basePath?`/${basePath}/`:'/';
export default defineConfig({
  base,
  plugins: [react()],
  define: { CESIUM_BASE_URL: JSON.stringify(`${base}cesium/`) },
  build: { chunkSizeWarningLimit: 6500 },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
