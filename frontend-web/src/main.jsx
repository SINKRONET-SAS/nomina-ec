// ============================================================
// PLAN HAIKY - Entrada principal del frontend web
// ============================================================
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontro el contenedor principal de la aplicacion');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
