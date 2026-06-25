# Plantillas legales de contratos

## Ubicaciones

- Revision legal y negocio: `docs2/plantillas-legales/contratos`.
- Plantillas ejecutables del backend: `backend/src/templates/legal/contracts`.

La PWA no debe hardcodear tipos de contrato. La pantalla `Documentos > Contratos` consume el catalogo expuesto por `GET /api/documentos/contrato/plantillas` y genera el PDF mediante `POST /api/documentos/contrato`.

## Regla operativa

1. Redactar o revisar la plantilla en esta carpeta documental.
2. Convertir la version aprobada a JSON en `backend/src/templates/legal/contracts`.
3. Mantener `templateKey`, `version`, `displayName`, `legalBasis`, `notices`, `probation` y `sections`.
4. Ejecutar contratos de sistema unico y pruebas antes de publicar.

Ninguna clausula legal nueva debe agregarse directamente en `backend/src/services/templateGenerator.js`. Ese servicio solo carga plantillas, resuelve datos reales del tenant/empleado y renderiza PDF.

## Plantillas vigentes

| Plantilla | Runtime | Uso |
|-----------|---------|-----|
| Contrato indefinido general | `contrato_indefinido_general.json` | Relacion laboral indefinida sin clausula de periodo de prueba. |
| Contrato indefinido mercaderista con periodo de prueba | `contrato_indefinido_mercaderista_prueba.json` | Mercaderistas/promotores con rutas, evidencias operativas, dotacion/equipos y periodo de prueba parametrizado. |

## Control legal

Las plantillas son preliminares hasta revision laboral ecuatoriana. El sistema genera evidencia y conserva metadata auditable, pero no marca registro SUT/MDT como completado sin confirmacion externa.
