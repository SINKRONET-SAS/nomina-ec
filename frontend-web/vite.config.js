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
        includeAssets: ['favicon.svg', 'icon.svg', 'maskable-icon.svg'],
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
  };
});
