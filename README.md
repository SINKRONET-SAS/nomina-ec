# Nomina-Ec - Sistema de nomina Ecuador

Nomina-Ec es un solo sistema operativo para nomina, asistencia, documentos laborales, reportes y app movil. El codigo esta organizado como monorepo con tres workspaces, pero no son tres productos separados:

- `backend`: API, PostgreSQL, Prisma, calculo de nomina, auditoria, reportes e integraciones.
- `frontend-web`: PWA administrativa para operar empleados, parametrizacion, novedades, nomina y reportes.
- `app-movil`: app de empleado para marcaciones, ruta y consulta de rol.

## Regla de sistema unico

Toda funcionalidad visible en frontend debe tener respaldo en backend, modelo/migracion cuando aplique, pruebas o gate verificable. Para evitar espejismos comerciales, la raiz incluye un contrato automatizado:

```bash
npm run contracts
```

El contrato valida, entre otros puntos:

- Recursos de parametrizacion visibles en PWA contra `RESOURCE_CONFIG` backend.
- Reportes visibles en PWA contra `REPORT_TYPES` backend.
- Endpoints consumidos por PWA contra rutas Express.
- Matriz contable unica, lineas de calculo y lotes de nomina.
- Novedades consumidas por calculo y sincronizadas con contabilidad.

## Comandos raiz

```bash
npm run contracts
npm run prisma:validate
npm run test:backend
npm run build:web
npm run validate
```

`npm run validate` ejecuta contrato, Prisma validate, tests backend y build web desde la raiz.

## Instalacion por workspace

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
- Novedades configurables con impacto en nomina.
- Calculo mensual asociado a lote auditable.
- Matriz contable unica por tenant para conceptos de nomina.
- Reportes internos: detalle tabular, detalle por empleado, matriz empleados x conceptos y reporte contable balanceado.
- Reportes externos de nomina: RDEP, SAE y archivo bancario segun configuracion disponible.
- App movil para marcacion y consulta operativa.

## Bloqueos antes de produccion

- Validacion legal/laboral/contable profesional para parametros oficiales y plan de cuentas real.
- Credenciales productivas de banco, correo, almacenamiento y pagos.
- Revision LOPDP y politicas de tratamiento de datos.
- Homologaciones externas requeridas por bancos o entidades publicas.

## Estructura

```text
backend/       API Node.js, Prisma, PostgreSQL y servicios de dominio
frontend-web/  PWA React + Vite
app-movil/     Expo / React Native
docs2/         Planes HAIKY, reportes de fase y evidencias
scripts/       Gates de sistema unico
```
