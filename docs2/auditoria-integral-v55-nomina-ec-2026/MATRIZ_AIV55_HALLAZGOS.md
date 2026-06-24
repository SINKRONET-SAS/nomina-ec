# Matriz AIV55 - Hallazgos Auditoria Integral V55

| ID | Prioridad | Estado final | Capa | Decision / fix |
|----|-----------|--------------|------|----------------|
| BUG-C01 | P0 | cerrado_previo | Backend nomina | N+1 de parametros legales ya corregido en `calcularNominaMensual`. |
| LEG-C01 | P0 | cerrado_previo | Legal Ecuador | Decimo cuarto por region ya existe con `region_decimo_cuarto`. |
| LEG-C02 | P0 | cerrado_local | Backend/PWA | Se agrega `modalidad_fondo_reserva`, migracion, UI empleado, importacion y detalle de calculo. |
| BUG-H02 | P0 | cerrado_local | PWA nomina | `CerrarMes.jsx` agrega permisos, incapacidad IESS, vacaciones, comision y acentos. |
| BUG-H03 | P1 | cerrado_local | App movil | `MarcacionScreen.js` corrige textos y humaniza tipos de marcacion. |
| BUG-M01 | P1 | cerrado_local | App movil | `AutoservicioScreen.js` memoiza periodo y agrega navegacion Anterior/Siguiente. |
| HUM-C01 | P1 | cerrado_local | Landing | Landing reemplazada con copy humano, sin RDEP/ATS ni parametros versionados. |
| LEG-H01 | P1 | cerrado_local | Landing | Se agrega seccion visible de proteccion de datos. |
| LEG-H02 | P0 | cerrado_local | Comunicaciones | WhatsApp exige `whatsapp_consent_at`; si falta, audita `skipped`. |
| BUG-C02 | P0 | cerrado_local | Auditoria | `auditService.js` agrega acciones, sanitizacion y error estructurado. |
| BUG-H01 | P0 | cerrado_previo | Auth | Login tenant-aware de E2E26 evita seleccion arbitraria por email. |
| DEAD-H01 | P2 | rechazado | Documentacion | No se fusiona `docs2`; es repositorio de planes Haiky vigente. |
| DEAD-M01 | P2 | rechazado | Gobierno | No se mueve `RULES.md` ni `CODEX_CONTEXT.md`; son fuentes obligatorias del flujo. |

## Bloqueos externos

- Revision legal/laboral profesional antes de prometer cumplimiento definitivo en produccion.
- Confirmar modalidad real de fondo de reserva por trabajador durante migracion de clientes existentes.
- Configurar credenciales WhatsApp productivas y contrato de tratamiento de datos fuera del repositorio.
