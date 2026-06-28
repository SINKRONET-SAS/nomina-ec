# MATRIZ CDANV6 - HALLAZGOS AUDITORIA NOMINA-EC 2026

Plan: `HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V6`
Codigo: `CDANV6`
Estado: baseline documental

| ID | Severidad | Archivo/Modulo | Evidencia reportada | Criterio de cierre | Fase |
|----|-----------|----------------|---------------------|--------------------|------|
| HAL-1 | Critico | `backend/src/config/user-message-catalog.json` | 4 mensajes con `friendly` vacio. | Ningun mensaje activo queda sin `friendly`; textos son claros, comerciales y en espanol; pruebas/validacion JSON pasan. | CDANV6-02 |
| HAL-2 | Alto | `backend/src/config/rdep/*`, `sriRdepGenerator` | XSD RDEP 2023 sin reconciliar contra ejercicio fiscal vigente. | Manifiesto con SHA-256, version y fuente oficial; XML productivo bloqueado si XSD no esta reconciliado; pruebas RDEP verdes. | CDANV6-03 |
| HAL-3 | Medio | PWA y `README.md` | Textos visibles sin tilde o poco comerciales. | UI y docs visibles corregidos sin tocar claves tecnicas, rutas, ids ni codigo que dependa de strings. | CDANV6-04 |
| HAL-4 | Medio | `AuthContext.jsx`, `Planes.jsx`, backend config/services | `console.log` no operativo en navegador y backend. | Navegador sin logs de debug productivo; backend usa logger estructurado o mantiene solo banner de arranque justificado. | CDANV6-05 |
| HAL-5 | Medio | `frontend-web/src/pages/Configuracion/Parametrizacion.jsx` | Archivo de gran tamano con helpers y subcomponentes mezclados. | Helpers/componentes extraidos sin cambio funcional; build web verde; smoke manual de secciones. | CDANV6-06 |
| HAL-6 | Medio | `frontend-web/pwa.config.js`, `frontend-web/public` | PWA sin pares maskable PNG 192/512. | PNG maskable existen, estan referenciados en manifest y pasan validacion basica de assets. | CDANV6-07 |
| HAL-7 | Medio/P0 legal | `app-movil/src/screens/MarcacionScreen.js` | Permiso GPS solicitado sin aviso previo LOPDP. | Antes de pedir permiso se muestra aviso con finalidad, datos, responsable/base y opcion de cancelar; flujo probado en mobile check. | CDANV6-08 |
| HAL-8 | Medio/P0 laboral | `backend/src/services/liquidacionService.js` | Salida en dia 31 puede pagar mas de sueldo mensual. | Dias pendientes usa maximo 30; test cubre salida dia 31 y no rompe meses 28/29/30. | CDANV6-08 |
| HAL-9 | Bajo | `docs2/`, `.vscode/AuditLock.json`, `.gitignore` | Artefactos internos visibles en repo publico. | Decision documentada: mantener, mover, ignorar o desindexar; no se borra evidencia activa sin aprobacion explicita. | CDANV6-09 |

## Confirmado como correcto segun auditoria

- SBU 2026: USD 482.
- Tabla IR 2026 verificada contra Resolucion NAC-DGERCGC25-00000043.
- IESS personal 9.45% y patronal 11.15%.
- RLS multi-tenant con PostgreSQL `set_config`.
- `bcrypt` con salt 10.
- LOPDP con politica de privacidad y cookie consent versionado.

## Reglas de ejecucion

- Cada fase debe leer `RULES.md`.
- Cada cierre debe incluir reporte, pruebas y `AuditLock.json` firmado.
- Los fixes descargados son referencia, no parche automatico.
- No se aceptan cierres solo documentales para hallazgos que afectan runtime.
