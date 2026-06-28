# MATRIZ CDANV4 - HALLAZGOS AUDITORIA SKNOMINA 2026 V4

| ID | Prioridad | Estado | Area | Hallazgo | Cierre |
|----|-----------|--------|------|----------|--------|
| CDANV4-PAY-01 | P0 | cerrado_local | Pagos | GET `/api/pagos/confirm` podia compartir controlador con confirmacion. | GET usa `paymentReturn`; confirmacion queda en POST `/api/pagos/webhook` y PayPhone webhook. |
| CDANV4-PER-01 | P0 | cerrado_local | Permisos | No existia flujo mobile/administrativo de permisos como novedad. | App movil agrega `PermisosScreen`; backend registra `permiso_con_sueldo` o `permiso_sin_sueldo` en novedades pendientes. |
| CDANV4-HIS-01 | P0 | cerrado_local | Empleados | Ficha completa sin historial agrupado. | Servicio `employeeHistoryService`, endpoint PWA `/empleados/:id/historial` y mobile `/mobile/historial`. |
| CDANV4-MOB-01 | P1 | cerrado_local | Mobile | Autoservicio limitado. | `AutoservicioScreen` tiene tabs Mis roles, Novedades y Mi perfil. |
| CDANV4-BRAND-01 | P0 | cerrado_local | Marca | Menciones activas NOMINA-EC/Nomina-Ec. | Runtime, metadatos, correos, docs legales, Render y app pasan a SKNOMINA; “Mi Nómina” queda como etiqueta funcional. |
| CDANV4-ROL-01 | P0 | cerrado_previo_verificado | Roles PDF | Ruta de rol PDF reportada como 404. | `app.js` ya expone `/api/nomina/:id/rol-pdf`; prueba de orden de rutas lo cubre. |
| CDANV4-COM-01 | P0 | cerrado_previo_verificado | Comunicaciones | `sendRolPagoDisponible()` ausente. | `communicationService` ya exporta `sendRolPagoDisponible()` y tests de comunicaciones pasan. |
