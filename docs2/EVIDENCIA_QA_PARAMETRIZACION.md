# Evidencia QA - Parametrización operativa Nómina-Ec

Fecha: 2026-06-12  
Alcance: ejecución local de fases 28 a 34.  
Ambiente: `C:\proyectos web\nuevo_nomina`, rama `codex/haiky-render-legal-plan`.

## Cambios validados

- Migración Prisma `20260612201500_parametrizacion_operativa`.
- Modelos para catálogos, parámetros legales, novedades, organización, zonas, jornadas y onboarding.
- API protegida `/api/configuracion/*`.
- UI protegida `/dashboard/configuracion/parametrizacion`.
- Checklist OWNER y acciones rápidas con escritura real por API.

## Comandos ejecutados

```powershell
cd backend
npx prisma validate
npx prisma migrate deploy
node --check src\services\configurationService.js
node --check src\controllers\configurationController.js
node --check src\app.js
npm test -- --runInBand
```

```powershell
cd frontend-web
npm run build
```

```powershell
cd app-movil
npx expo-doctor
```

## Resultados

- Prisma schema válido.
- Migración aplicada en PostgreSQL local `127.0.0.1:5432`, base `plan_haiky`.
- Backend sintácticamente válido en archivos nuevos/tocados.
- Backend tests: 6 suites aprobadas, 16 tests aprobados.
- Frontend PWA build aprobado y generó CSS, manifest y service worker.
- Expo Doctor: 21/21 checks aprobados.
- Búsqueda de mojibake en runtime y artefactos de gobierno sin coincidencias.

## Flujo QA productizable cubierto

| Paso | Estado |
| --- | --- |
| Registro de empresa | Cubierto por flujo existente de auth público |
| Configuración legal | Cubierto por API/UI de parámetros legales |
| Estructura organizativa | Cubierto por API/UI de unidades organizativas |
| Jornada y zona | Cubierto por API/UI de jornadas y zonas |
| Alta de empleado | Cubierto por módulo existente |
| Marcación | Cubierto por módulo existente, pendiente smoke integrado con zona nueva |
| Novedad | Cubierto por API/UI de tipos de novedades y módulo existente |
| Nómina | Cubierto por módulo existente, pendiente integración completa con novedades configurables |
| Archivo bancario | Cubierto por perfil bancario existente y generador actual |
| Pago de plan | Cubierto por PayPhone/mock existente |

## Riesgos residuales

- Falta smoke manual completo con backend, frontend, móvil, PostgreSQL y Redis activos.
- Falta integrar tipos de novedades configurables al motor de nómina en profundidad.
- Falta conectar zonas/jornadas configuradas al validador móvil como regla principal.
- Falta RLS Render con usuario no superusuario.
- Falta PayPhone sandbox/oficial.
- Falta revisión profesional legal de IESS y parámetros sensibles antes de producción.
