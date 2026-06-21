export const pwaManifest = {
  id: '/',
  name: 'NóNonomina-Ec',
  short_name: 'NóNonomina-Ec',
  description: 'SaaS ecuatoriano para nónomina, marcaciones, documentos laborales y archivos bancarios.',
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
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
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
      src: '/apple-touch-icon.svg',
      sizes: '180x180',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
  screenshots: [
    {
      src: '/pwa-screenshot-wide.svg',
      sizes: '1280x720',
      type: 'image/svg+xml',
      form_factor: 'wide',
      label: 'Panel operativo de NóNonomina-Ec para cierre mensual',
    },
    {
      src: '/pwa-screenshot-mobile.svg',
      sizes: '390x844',
      type: 'image/svg+xml',
      form_factor: 'narrow',
      label: 'Vista mómovil de la operación mensual de NóNonomina-Ec',
    },
  ],
  shortcuts: [
    {
      name: 'Iniciar sesión',
      short_name: 'Login',
      description: 'Entrar al portal privado de NóNonomina-Ec.',
      url: '/login',
      icons: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
    },
    {
      name: 'Crear cuenta',
      short_name: 'Registro',
      description: 'Crear una empresa nueva en NóNonomina-Ec.',
      url: '/registro',
      icons: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
    },
    {
      name: 'Planes',
      short_name: 'Planes',
      description: 'Consultar planes comerciales disponibles.',
      url: '/precios',
      icons: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
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
        cacheName: 'nonomina-ec-shell',
        networkTimeoutSeconds: 5,
      },
    },
  ],
};
