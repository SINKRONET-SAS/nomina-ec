# Plan Haiky NAR26 — Novedades, anticipos, cargos, reportes y verificación de delegados

## Objetivo

Corregir los hallazgos operativos reportados en SKNOMINA sin romper las rutas públicas existentes: hacer trazables y gestionables las novedades manuales, habilitar un rol de anticipos con decisión de descuento o bonificación, incorporar carga masiva de cargos desde plantilla, generar un reporte verificable de novedades y permitir el reenvío controlado de la verificación de correo para delegados.

## Alcance funcional

1. Listar novedades manuales y masivas en una vista operativa unificada, con origen, monto, estado y periodo visibles. Permitir aprobar, editar, anular y eliminar mientras el periodo sea editable y la novedad no haya sido consumida por un rol.
2. Crear un rol de anticipos independiente del rol mensual, pero operado desde una única ruta de Anticipos y préstamos, con selección de empleados, monto, aprobación, cierre y evidencia. Cada línea podrá resolverse como descuento para fin de mes o convertirse en bonificación; el usuario podrá indicar el tipo de novedad configurado y el nombre visible de la bonificación. La decisión será auditable e idempotente, sin caminos paralelos de operación.
3. Cargar cargos o puestos masivamente mediante plantilla CSV, selector de archivo, validación por fila, asociación a unidad organizativa y resumen de resultados.
4. Consultar y descargar un reporte de novedades por periodo con detalle, filtros, estados, origen, empleado, horas y montos para validar cargas.
5. Reenviar el código de verificación de correo desde Usuarios y roles únicamente para delegados del tenant, con control de usuario activo/no verificado, rate limit, auditoría y sin revelar el código. El código enviado debe ser siempre recién emitido y llegar con una vigencia completa, nunca caducado ni heredado de un token anterior.

## Fuera de alcance

- No se cambia la semántica de los roles mensuales existentes ni se alteran periodos cerrados.
- No se elimina físicamente un usuario delegado; se mantiene la desactivación existente.
- No se modifica `C:\proyectos web\sinkroniq-mobile`.
- No se cambian parámetros legales sin fuente y sin una fase específica de gobierno.

## Criterios de seguridad y compatibilidad

- Toda consulta y mutación queda aislada por `tenant_id`, protegida por RBAC y módulo correspondiente.
- Las rutas existentes conservan sus payloads; las nuevas capacidades se exponen en rutas adicionales.
- Las operaciones de nómina y conversión usan idempotencia, estado explícito, auditoría y bloqueo por periodo cerrado.
- Los errores se devuelven con código, mensaje, `correlationId` y registro estructurado; no se agregan catches silenciosos.
- Se respeta `RULES.md`: UTF-8 sin BOM, comentarios y mensajes técnicos en español, nombres de variables en inglés, migraciones reversibles y validación frontend/backend.

## Fases y aceptación

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| NAR26-00 | Gobierno, contexto, prompts y baseline | Artefactos válidos, cadena AuditLock enlazada y alcance aprobado |
| NAR26-01 | Ciclo de vida de novedades y reporte | Listado, filtros, aprobar/editar/anular/eliminar y reporte detallado con CSV |
| NAR26-02 | Rol de anticipos y bonificación | Rol independiente, cierre, decisión descontar/bonificar, auditoría e idempotencia |
| NAR26-03 | Carga masiva de cargos | Plantilla, selector, validación por fila, persistencia tenant-safe y UI |
| NAR26-04 | Reenvío de verificación | Endpoint protegido, rate limit, auditoría y acción visible para delegados no verificados |
| NAR26-05 | Integración frontend | Rutas, estados de carga/error/vacío, navegación, accesibilidad y no regresión |
| NAR26-06 | QA y cierre | Prisma, contratos, tests, build, diff, UTF-8, AuditLock cerrado, commit y push |

## Cierre NAR26

- NAR26-00 a NAR26-06: `completed-pass`.
- Backend: 65 suites / 435 tests PASS, incluyendo novedades, anticipos/bonificaciones, reportes, cargos y verificación de delegados.
- Contratos del sistema PASS; Prisma validate PASS; parseo JSX estático PASS; `git diff --check` PASS.
- El build web queda pendiente de ejecución por una limitación del entorno local: el workspace no tiene disponible el ejecutable `vite` (`vite no se reconoce`). No se altera el código para ocultar esta condición.
- Se mantiene una sola ruta visible para anticipos y bonificaciones: Anticipos y préstamos; el nombre de la bonificación y el tipo parametrizado se capturan dentro de esa operación.
- La publicación se realizará en `main` después de registrar el cierre de AuditLock.
