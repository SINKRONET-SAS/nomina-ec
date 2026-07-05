import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaManifest, pwaWorkbox } from './pwa.config.js';

function buildApiProxy(proxyTarget) {
  return {
    target: proxyTarget,
    changeOrigin: true,
    secure: !proxyTarget.startsWith('http://'),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'icon.svg',
          'icon-192.png',
          'icon-512.png',
          'maskable-icon.svg',
          'apple-touch-icon.svg',
          'apple-touch-icon.png',
          'pwa-screenshot-wide.svg',
          'pwa-screenshot-mobile.svg',
        ],
        manifest: pwaManifest,
        workbox: pwaWorkbox,
      }),
    ],
    server: {
      proxy: {
        '/api': buildApiProxy(proxyTarget),
      },
    },
    preview: {
      proxy: {
        '/api': buildApiProxy(proxyTarget),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('@tanstack/react-query')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('axios')) return 'vendor-http';
            if (id.includes('vite-plugin-pwa') || id.includes('workbox')) return 'vendor-pwa';
            return 'vendor';
          },
        },
      },
    },
  };
});
