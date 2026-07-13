# SKNOMINA - Sistema de nómina Ecuador

SKNOMINA es un solo sistema operativo para nómina, asistencia, documentos laborales, reportes y app móvil. El código está organizado como monorepo con tres workspaces, pero no son tres productos separados:

- `backend`: API, PostgreSQL, Prisma, cálculo de nómina, auditoría, reportes e integraciones.
- `frontend-web`: PWA administrativa para operar empleados, parametrización, novedades, nómina y reportes.
- `app-movil`: app de empleado para marcaciones, ruta y consulta de rol.

## Regla de sistema único

Toda funcionalidad visible en frontend debe tener respaldo en backend, modelo/migración cuando aplique, pruebas o gate verificable. Para evitar espejismos comerciales, la raíz incluye un contrato automatizado:

```bash
npm run contracts
```

El contrato valida, entre otros puntos:

- Recursos de parametrización visibles en PWA contra `RESOURCE_CONFIG` backend.
- Reportes visibles en PWA contra `REPORT_TYPES` backend.
- Endpoints consumidos por PWA contra rutas Express.
- Matriz contable única, líneas de cálculo y lotes de nómina.
- Novedades consumidas por cálculo y sincronizadas con contabilidad.

## Comandos raíz

```bash
npm run contracts
npm run prisma:validate
npm run test:backend
npm run build:web
npm run validate
```

`npm run validate` ejecuta contrato, Prisma validate, tests backend y build web desde la raíz.

## Instalación por workspace

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

```bash
cd frontend-web
npm install
npm run dev
```

```bash
cd app-movil
npm install
npm start
```

## Capacidades implementadas

- Multi-tenant con aislamiento por empresa y RLS.
- Empleados, estructura organizativa, cargos, jornadas, zonas y marcaciones.
- Novedades configurables con impacto en nómina.
- Cálculo mensual asociado a lote auditable.
- Matriz contable única por tenant para conceptos de nómina.
- Reportes internos: detalle tabular, detalle por empleado, matriz empleados x conceptos y reporte contable balanceado.
- Reportes externos de nómina: RDEP, Formulario 107, prevalidacion IESS y archivo bancario segun configuracion disponible.
- App móvil para marcación y consulta operativa.

## Bloqueos antes de producción

- Validación legal/laboral/contable profesional para parámetros oficiales y plan de cuentas real.
- Credenciales productivas de banco, correo, almacenamiento y pagos.
- Revisión LOPDP y políticas de tratamiento de datos.
- Homologaciones externas requeridas por bancos o entidades públicas.

## Estructura

```text
backend/       API Node.js, Prisma, PostgreSQL y servicios de dominio
frontend-web/  PWA React + Vite
app-movil/     Expo / React Native
docs2/         Planes HAIKY, reportes de fase y evidencias
scripts/       Gates de sistema único
```
