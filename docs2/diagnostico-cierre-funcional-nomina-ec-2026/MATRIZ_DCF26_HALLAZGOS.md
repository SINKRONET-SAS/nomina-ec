# Matriz DCF26 de Hallazgos y Cierre

| ID | Prioridad | Tipo | Estado actual | Criterio de cierre |
|----|-----------|------|---------------|--------------------|
| DCF26-F01 | P0 | Pantalla sin funcionalidad real | Cerrado en DCF26-02. | `OperacionIntegral` apunta a modulos reales y no guarda catalogos genericos. |
| DCF26-F02 | P0 | Parametrizacion desconectada | Cerrado en DCF26-03. | Generador bancario usa perfil tenant con validaciones y fallback controlado. |
| DCF26-F03 | P0 | Cumplimiento/RDEP | Cerrado en DCF26-04 con bloqueo profesional. | Precheck RDEP + validacion XSD runtime; ficha vigente requiere revision antes de produccion. |
| DCF26-F04 | P0 | Obligacion incorrecta | Cerrado en DCF26-05. | ATS retirado del runtime de nomina; queda fuera de esta responsabilidad. |
| DCF26-F05 | P0 | API no expuesta | Cerrado en DCF26-06. | API v1 con auth, scopes, rate limit, idempotencia y auditoria. |
| DCF26-F06 | P0 | Readiness inflado | Cerrado en DCF26-02..12. | Avance operativo queda ligado a checks funcionales y gates. |
| DCF26-F07 | P0 | Cargas/lotes | Cerrado en DCF26-07, DCF26-08 y segunda pasada DCF26-12. | Upload, parseo, validacion, commit atomico, lote, reversa segura y procesamiento de novedades. |
| DCF26-F08 | P1 | Churn funcional | Cerrado en DCF26-09. | SUPERADMIN usa fuentes reales de pagos/planes/incidencias. |
| DCF26-F09 | P1 | UX/mensajes | Cerrado en DCF26-11. | Frontend web sin `alert`, `confirm` ni `window.open`; estados visibles. |
| DCF26-F10 | P1 | Calidad | Cerrado para runtime en DCF26-01 y DCF26-11. | Archivos tocados sin mojibake; contexto legado queda trazado como deuda documental no runtime. |
| DCF26-F11 | P1 | Mobile | Cerrado minimo en DCF26-10 con backlog UEM-01. | App muestra asistencia, historial y autoservicio; relacion formal usuario-empleado queda como backlog controlado. |
| DCF26-F12 | P1 | Codigo/documentos muertos | Cerrado en DCF26-12. | `Qwen_python_*.py` archivados con indice en `docs2/archive/qwen-python-20260616/`. |
| DCF26-F13 | P2 | QA lento | Cerrado localmente en DCF26-12. | Suite backend final: 17 suites, 60 tests, 4.472 s. |

## Orden sugerido

1. DCF26-01: limpiar encoding para partir de una base confiable.
2. DCF26-02: sustituir catalogos genericos P0 por flujos reales.
3. DCF26-03: conectar bancos OWNER al generador.
4. DCF26-04: cerrar RDEP con XSD.
5. DCF26-05: retirar ATS de nomina.
6. DCF26-06 a DCF26-12: completar API, importaciones, apertura mensual, SUPERADMIN, mobile, UX y QA.
