# Matriz CDANV5

| ID | Estado V5 | Decision |
|----|-----------|----------|
| LEG-01 | Corregido | SBU 2026 = 482; bloquear regresion a 470/509 en runtime. |
| LEG-02 | Corregido | Movilizacion/viaticos bajo LORTI Art. 9 numeral 11. |
| PAY-01 | Falso positivo ajustado | PayPhone se confirma con Confirmation API; no HMAC local inventado. |
| REP-01 | Cerrado previo | `/api/nomina/:id/rol-pdf` ya registrado antes de rutas genericas. |
| REP-03 | Cerrado V5 | Consolidado anual backend/PWA agregado. |
| MOV-02 | Mejorado V5 | Mobile sugiere ruta desde domicilio y ruta del dia. |
| SA-01 | Cerrado previo | `render.yaml` ejecuta migracion y seed de admins. |
| NOV-01 | Cerrado previo | Permisos mobile crean novedades pendientes. |
| ROL-01 | Cerrado previo | Autoservicio mobile conserva "Mi Nómina" y expone tabs. |
| UTF-01 | Controlado | No introducir mojibake en archivos tocados; separadores mobile normalizados. |

## No aplicar literalmente

- No aplicar USD 509.
- No agregar `PAYPHONE_WEBHOOK_SECRET` ni `x-payphone-signature` como requisito de seguridad si PayPhone no lo documenta para el canal usado.
- No renombrar "Mi Nómina" a SKNOMINA.
