// ============================================================
// SKNOMINA - Entrada principal del frontend web
// ============================================================
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el contenedor principal de la aplicación');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerSW({
  onOfflineReady() {
    console.info('PWA lista para uso offline de shell estatico. Las API de nomina siguen en modo NetworkOnly.');
  },
  onRegisterError(error) {
    console.error('No se pudo registrar el service worker de la PWA.', {
      code: 'PWA_SERVICE_WORKER_REGISTER_ERROR',
      statusCode: 500,
      message: error?.message || String(error),
    });
  },
});
