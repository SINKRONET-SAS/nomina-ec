# MATRIZ APK26 - Hallazgos y cierre

| ID | Prioridad | Hallazgo auditado | Decision APK26 | Cierre |
|----|-----------|-------------------|----------------|--------|
| HAL-1 | P0 | Expo SDK 54 supuestamente genera target 34 | Reclasificado: Expo SDK 54 target 36 segun docs oficiales; Google exige 35+ | Gate store y evidencia, sin upgrade forzado |
| HAL-2 | P0 | Superadmin ve lo mismo que cliente | Confirmado | Consola fundador propia con overview, empresas, planes e incidencias |
| HAL-3 | P0 | Falta description en app.json | Confirmado | Agregar descripcion comercial |
| HAL-4 | P0 | Falta URL de privacidad Android | Confirmado con ajuste Expo | Agregar `extra.androidPrivacyPolicyUrl` y validar en gate de tienda |
| HAL-5 | P1 | Textos sin tilde o poco comerciales | Confirmado parcial | Corregir textos visibles tocados |
| HAL-6 | P1 | Mobile no diferencia roles | Confirmado | Resolver perfil y shell por rol |
| HAL-7 | P1 | Estado legal pendiente pese a campos confirmados | Confirmado con condicion | Metadatos de validacion sin romper `validado_oficial` |
| HAL-8 | P2 | `docs2` expuesto en repo publico | Riesgo de gobierno | Ignorar anexos locales/privados, mantener trazabilidad activa |
| HAL-9 | P2 | Parametrizacion extensa | Confirmado, split parcial existente | Reporte y regla de no ampliar archivo; refactor mayor diferido |
| HAL-10 | P3 | FCM no configurado | No bloqueante | Documentar como requisito solo si se activa push |

## Criterios de aceptacion

- La app movil mantiene readiness de tienda y no introduce dependencias no reconciliadas.
- Superadmin no queda como alias simple de `PlanesGestion`.
- La PWA no muestra mensajes tecnicos innecesarios en los puntos tocados.
- Las reglas legales productivas siguen fallando cerrado si no hay fuente oficial.
- No se eliminan evidencias Haiky activas.
