FRONTEND WEB (React + Vite)
  Dashboard | Empleados | Nomina | Reportes | Documentos
        |
        | HTTPS / JWT
        v
BACKEND API (Node.js + Express)
  Auth | Empleados | Nomina | Documentos | Reportes
  Middleware: Reglas Irrenunciables
        |
        +---> POSTGRESQL (RLS)
        |     Tenants, Empleados, Marcaciones, Nominas
        |
        +---> AWS S3 / Spaces
              Fotos, Contratos PDF, Roles de Pago, XMLs
        |
        v
APP MOVIL (React Native + Expo)
  Login | Marcacion (Foto + GPS) | Consulta propia