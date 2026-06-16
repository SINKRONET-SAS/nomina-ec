# Matriz DCF26 de Hallazgos y Cierre

| ID | Prioridad | Tipo | Estado actual | Criterio de cierre |
|----|-----------|------|---------------|--------------------|
| DCF26-F01 | P0 | Pantalla sin funcionalidad real | `OperacionIntegral` guarda catalogos genericos. | Cada modulo P0 tiene endpoint/servicio propio, UI especifica y prueba. |
| DCF26-F02 | P0 | Parametrizacion desconectada | Banco OWNER no alimenta `bancoAebGenerator`. | Generador usa perfil tenant con ficha, validaciones y fallback controlado. |
| DCF26-F03 | P0 | Cumplimiento/RDEP | XML sin XSD validation runtime. | Precheck RDEP + validacion XSD + evidencia por periodo. |
| DCF26-F04 | P0 | Obligacion incorrecta | ATS activo en backend de nomina. | ATS retirado del menu y endpoint de nomina; si queda, aislado y marcado no-nomina. |
| DCF26-F05 | P0 | API no expuesta | Contrato `/api/v1` sin rutas. | API v1 minima con auth, scopes, rate limit, idempotencia y auditoria. |
| DCF26-F06 | P0 | Readiness inflado | Avance por conteo. | Avance por checks funcionales y gates verificables. |
| DCF26-F07 | P0 | Cargas/lotes | Catalogos sin importacion ni apertura real. | Upload, parseo, validacion, rollback y procesamiento de lote. |
| DCF26-F08 | P1 | Churn funcional | Planes SUPERADMIN duplicados como catalogo. | Unica fuente de verdad en pagos/planes con UI coherente. |
| DCF26-F09 | P1 | UX/mensajes | `alert`/`window.open` en flujos criticos. | Toasters/estados accionables, errores humanizados, descargas controladas. |
| DCF26-F10 | P1 | Calidad | Mojibake backend/documentos. | UTF-8 limpio verificado con `rg`. |
| DCF26-F11 | P1 | Mobile | Store readiness formal, alcance funcional minimo. | App muestra politicas, cuenta, asistencia robusta y permisos claros. |
| DCF26-F12 | P1 | Codigo/documentos muertos | `Qwen_python_*.py` en `docs2`. | Archivos retirados o archivados con indice y sin reuso operacional. |
| DCF26-F13 | P2 | QA lento | Backend tests tardan 182 s. | Suite critica por debajo de umbral acordado o tests lentos aislados. |

## Orden sugerido

1. DCF26-01: limpiar encoding para partir de una base confiable.
2. DCF26-02: sustituir catalogos genericos P0 por flujos reales.
3. DCF26-03: conectar bancos OWNER al generador.
4. DCF26-04: cerrar RDEP con XSD.
5. DCF26-05: retirar ATS de nomina.
6. DCF26-06 a DCF26-12: completar API, importaciones, apertura mensual, SUPERADMIN, mobile, UX y QA.
