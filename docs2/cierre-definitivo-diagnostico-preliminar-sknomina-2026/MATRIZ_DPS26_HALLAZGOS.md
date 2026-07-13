# MATRIZ_DPS26_HALLAZGOS

Plan: `HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026`
Codigo: `DPS26`
Estado: `DPS26-00 documental creado; runtime pendiente de aprobacion`

## Matriz de cierre

| ID | Prioridad | Area | Riesgo confirmado por diagnostico | Cierre definitivo esperado | Evidencia minima | Fase |
|----|-----------|------|-----------------------------------|----------------------------|------------------|------|
| DPS26-LAB-01 | P0 | Legal laboral | La oferta declara cumplimiento Ecuador 2026 sin matriz probatoria completa por modulo. | Matriz legal versionada por anio, modulo, regla, fuente, prueba y responsable. | Casos para contratos, jornada, decimos, vacaciones, fondos, IESS y finiquito. | DPS26-02 |
| DPS26-TAX-01 | P0 | Tributario | IR empleados y reportes SRI requieren precision y versionamiento. | Motor tributario aislado, tablas versionadas, fixtures y validacion estructural de reportes aplicables. | Tests de tramos, entradas/salidas, decimos, vacaciones y finiquito. | DPS26-04 |
| DPS26-PAY-01 | P0 | Motor nomina | Calculo de sueldo, horas extra, IESS, IR y finiquito expone contingencia legal si no es trazable. | Reglas puras, snapshots cerrados, desglose por rubro, redondeo definido y reverso controlado. | Tests unitarios y snapshots por escenario. | DPS26-03 |
| DPS26-IMM-01 | P0 | Inmutabilidad | Reglas irrenunciables documentadas deben existir como invariantes tecnicas. | Backend bloquea edicion indebida y registra actor, fecha, IP/contexto y motivo. | Tests de marcaciones, nomina cerrada, recalculo y auditoria. | DPS26-05 |
| DPS26-PAR-01 | P1 | Oferta comercial | Landing/README pueden prometer mas de lo implementado. | Matriz de paridad oferta-backend-PWA-app con estados reales y textos comerciales normales. | Capturas o pruebas de rutas publicas/operativas. | DPS26-06 |
| DPS26-SEC-01 | P1 | Seguridad tenant | Datos sensibles requieren RLS real, tenant en queries y logs sin PII. | RLS validado en migraciones, middleware y queries; cuentas bancarias cifradas; JWT y documentos protegidos. | Tests y revision de migraciones, rutas y servicios. | DPS26-05 |
| DPS26-PWA-01 | P1 | PWA operativa | El empleador depende de flujos robustos de alta, novedades, calculo, cierre y reportes. | Flujos criticos completos con loading, empty, error, retry y bloqueo legal visible. | Smoke PWA por flujo critico. | DPS26-07 |
| DPS26-MOB-01 | P1 | App movil | GPS/foto implican privacidad, stores y manejo offline. | Permisos minimos, avisos claros, no tracking innecesario y offline seguro. | Expo doctor, store readiness y pruebas de permisos. | DPS26-08 |
| DPS26-REP-01 | P0 | Reportes oficiales | Supersedido por RPE26 para alcance IESS. | RDEP, PDF 107 individual anual, batch IESS TXT y reportes internos deben validar contra formatos vigentes 2026 y bloquearse si falta evidencia oficial. | Archivos de prueba con casos borde, snapshots, hash interno, manifest de fuente vigente y trazabilidad de datos origen. | DPS26-09 / RPE26 |
| DPS26-REP-02 | P0 | RDEP/Formulario 107 | Formulario 107 debe ser consistente con RDEP y no debe generarse como Excel. | PDF individual por trabajador con resumen anual, totales reconciliados contra RDEP del periodo y datos del empleador/empleado completos. | Test de reconciliacion RDEP-107 por empleado y reporte de diferencias. | DPS26-09 |
| DPS26-REP-03 | P0 | SAE IESS | SAE IESS no puede ser una descarga simulada o estructura arbitraria. | Generacion basada en plantilla/estructura vigente, con validacion de empleador, empleado, fechas, avisos y aportes segun aplique. | Snapshot XML/archivo, validacion estructural y bloqueo visible si falta ficha tecnica vigente. | DPS26-09 |
| DPS26-DEP-01 | P2 | Dependencias | Backend/PWA/mobile usan stacks sensibles que deben mantenerse compatibles. | Matriz de versiones soportadas, auditoria de dependencias y builds verdes. | Checks npm, build web, tests backend y mobile check. | DPS26-10 |
| DPS26-OBS-01 | P2 | Observabilidad | Errores legales, tributarios y operativos deben ser diagnosticables sin exponer PII. | Logs estructurados con correlationId, mensajes comerciales y alertas de bloqueo. | Revision de logs y pruebas de errores controlados. | DPS26-10 |
| DPS26-DOC-01 | P3 | Documentacion | Soporte y auditoria requieren runbooks actualizados. | Runbooks de operacion, soporte, release y auditoria vinculados al plan. | Documentos versionados y AuditLock firmado. | DPS26-10 |
| DPS26-LOC-01 | P0 | Fundador/superadmin | Hay cambios locales para que el fundador tenga tenant operativo y acceso superadmin/owner. | Validar que el fundador pueda gestionar su tenant sin codigo, sin romper separacion multi-tenant ni consola superadmin. | Tests de auth/RBAC, smoke PWA con usuario superadmin y tenant fundador. | DPS26-05/DPS26-07 |
| DPS26-LOC-02 | P1 | Planes/landing | Hay cambios locales para reducir duplicidad entre landing, precios y gestion de planes. | Mantener precios visibles en landing, checkout gobernado por una sola fuente de verdad y gestion superadmin de planes. | Build frontend, smoke de `/#planes`, `/login`, resultado de pago y `/dashboard/planes`. | DPS26-06 |
| DPS26-LOC-03 | P1 | Navegacion comercial | Hay ajustes locales de Login, Sitio publico, Planes y Resultado de pago. | Los enlaces deben llevar al destino esperado y no dejar al usuario atrapado. | Prueba visual local y test de rutas. | DPS26-06/DPS26-07 |

## Criterios de severidad

- P0: puede generar contingencia laboral, tributaria, seguridad critica, perdida de inmutabilidad o datos sensibles.
- P1: afecta operacion comercial, confianza del cliente, tiendas moviles o flujos principales.
- P2: afecta mantenimiento, diagnostico o sostenibilidad del producto.
- P3: afecta soporte, documentacion o trazabilidad no bloqueante.

## Confirmaciones iniciales

- Este documento no confirma bugs de codigo por si mismo; organiza el diagnostico recibido para contraste runtime.
- Las fases runtime deben leer codigo real antes de reportar hallazgos definitivos.
- No se ejecutaron comandos de test ni build como parte de DPS26-00.
