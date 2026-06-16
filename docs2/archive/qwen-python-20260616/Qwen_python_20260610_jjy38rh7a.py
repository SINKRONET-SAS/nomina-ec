┌─────────────────────────────────────────────────────────┐
│              FRONTEND WEB (React + Vite)                │
│  Dashboard | Empleados | Nómina | Reportes | Documentos │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / JWT
┌───────────────────────▼─────────────────────────────────┐
│              BACKEND API (Node.js + Express)            │
│  Auth | Empleados | Nómina | Documentos | Reportes      │
│  Middleware: Reglas Irrenunciables                       │
└───────────────┬───────────────────────┬─────────────────┘
                │                       │
┌───────────────▼──────────┐  ┌────────▼─────────────────┐
│   POSTGRESQL (RLS)       │  │    AWS S3 / Spaces       │
│  Tenants, Empleados,     │  │  Fotos, Contratos PDF,   │
│  Marcaciones, Nóminas    │  │  Roles de Pago, XMLs     │
└──────────────────────────┘  └──────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│           APP MÓVIL (React Native + Expo)               │
│  Login | Marcación (Foto + GPS) | Consulta propia       │
└─────────────────────────────────────────────────────────┘