export const pwaManifest = {
  id: '/',
  name: 'SKNOMINA',
  short_name: 'SKNOMINA',
  description: 'SaaS ecuatoriano para nómina, marcaciones, documentos laborales y archivos bancarios.',
  lang: 'es-EC',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#f8fafc',
  theme_color: '#0f766e',
  categories: ['business', 'finance', 'productivity'],
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-192-maskable.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icon.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/maskable-icon.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
    {
      src: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'any',
    },
  ],
  screenshots: [
    {
      src: '/brand/pwa-screenshot-wide.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
      label: 'Panel operativo de SKNOMINA para cierre mensual',
    },
    {
      src: '/brand/pwa-screenshot-mobile.png',
      sizes: '390x844',
      type: 'image/png',
      form_factor: 'narrow',
      label: 'Vista móvil de la operación mensual de SKNOMINA',
    },
  ],
  shortcuts: [
    {
      name: 'Iniciar sesión',
      short_name: 'Login',
      description: 'Entrar al portal privado de SKNOMINA.',
      url: '/login',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
    {
      name: 'Crear cuenta',
      short_name: 'Registro',
      description: 'Crear una empresa nueva en SKNOMINA.',
      url: '/registro',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
    {
      name: 'Planes',
      short_name: 'Planes',
      description: 'Consultar planes comerciales disponibles.',
      url: '/precios',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
  ],
};

export const pwaWorkbox = {
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//],
  globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,txt,xml}'],
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'sknomina-shell',
        networkTimeoutSeconds: 5,
      },
    },
  ],
};
