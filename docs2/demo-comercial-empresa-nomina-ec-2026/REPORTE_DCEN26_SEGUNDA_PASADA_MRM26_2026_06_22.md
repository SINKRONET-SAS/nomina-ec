# Reporte DCEN26 - Segunda pasada con rutas moviles 2026-06-22

Plan: `HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026`  
Codigo: `DCEN26`  
Fecha: 2026-06-22  
Modo: reejecucion local DCEN26-00..08 con parametros nuevos de rutas moviles para mercaderistas.

## Resumen

Se ejecuto una segunda pasada sobre la demo comercial para incorporar el nuevo alcance operativo de mercaderistas: sitios de visita, ruta diaria y paradas visibles para la app movil. No se hizo reset global de base de datos ni se descartaron migraciones; se uso el reset seguro del tenant demo DCEN26 y luego se reconstruyo la demo completa.

## Comandos ejecutados

- `npx.cmd prisma validate` en `backend`: PASS.
- `npx.cmd prisma migrate deploy` en `backend`: PASS, migracion `20260623023000_mrm26_route_visits` aplicada.
- `npx.cmd prisma generate` en `backend`: PASS.
- `npm.cmd run seed:demo:reset` en `backend`: PASS, elimino 1 tenant demo.
- `npm.cmd run seed:demo` en `backend`: PASS, reconstruyo y verifico la demo.
- `npm.cmd run seed:demo:verify` en `backend`: PASS, confirmo conteos persistidos.
- `npm.cmd run build` en `frontend-web`: PASS, Vite/PWA genero `dist/`.

## Ajustes de seed

- `seed:demo:reset` ahora limpia `route_exceptions`, `route_visit_marks`, `route_stops`, `route_days` y `route_sites` antes de dependencias de empleado.
- Se agrego limpieza de `job_positions` antes de `organization_units`, porque cargos consumen estructura organizativa.
- El primer empleado demo queda como `Mercaderista`, vinculado al usuario movil `empleado@demo.nomina-ec.local`.
- Se crean 3 sitios demo en Quito, 1 ruta diaria para la fecha local y 3 paradas pendientes para validar la app movil.

## Resultado verificado

| Elemento | Resultado |
|----------|-----------|
| Tenants demo DCEN26 | 1 |
| Usuarios demo | 4 |
| Empleados ficticios | 30 |
| Cargas familiares demo | 20 |
| Unidades Quito/Guayaquil | 6 |
| Zonas de marcacion | 2 |
| Jornadas | 2 |
| Sitios de ruta | 3 |
| Rutas diarias demo | 1 |
| Paradas de ruta demo | 3 |
| Marcaciones mayo 2026 | 1284 |
| Novedades | 101 |
| Periodos cerrados 2026 | 5 |
| Roles cerrados 2026 | 150 |
| Perfiles bancarios demo | 1 |

Tenant runtime resembrado: `36e2306c-9262-4d1a-aa2e-f93982649d47`.

## Incidente corregido

El primer intento de `seed:demo:reset` fallo por una restriccion entre `job_positions` y `organization_units`. Se corrigio el orden del reset demo para eliminar empleados, luego cargos y despues unidades. El segundo intento fue exitoso y elimino solo el tenant demo autorizado.

## Notas

- `backend/.demo-credentials.json` fue regenerado localmente y sigue ignorado por git.
- Las rutas demo usan coordenadas publicas/ficticias de Quito y no domicilios reales.
- La asistencia laboral se mantiene separada de la ruta operativa: la nomina usa marcaciones de jornada; supervisor y app usan visitas por tienda.
