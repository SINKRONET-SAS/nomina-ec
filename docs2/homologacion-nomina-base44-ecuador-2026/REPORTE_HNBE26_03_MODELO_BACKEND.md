# HNBE26-03 - Modelo backend laboral

Fecha: 2026-06-12

## Estado actual

El backend ya incluye `Tenant`, `Employee`, `AttendanceMark`, `AttendanceNovelty`, `Payroll`, `LegalDocument`, `LegalParameter`, `LegalParameterVersion`, `CommercialPlan`, `AuditLog`, `WorkZone`, `WorkShift`, `OrganizationUnit`, `BankProfile` y `TenantOnboardingStep`.

## Brechas de modelo antes de produccion

- Crear modelo dedicado de beneficios/prestamos/anticipos con cuotas, saldo, aprobacion y efecto en nomina.
- Separar contrato laboral como entidad versionable, no solo campo `tipo_contrato`.
- Vincular empleado con unidad organizativa, jornada, zona principal y centro de costo.
- Agregar version de parametros usada por cada calculo de nomina.
- Agregar modelo de periodo de nomina para cierre/reapertura por cabecera, no solo por filas individuales.
- Auditar lectura/descarga de documentos laborales.

## Cambios aplicados en esta fase

- Se estructuraron errores de documentos legales con `correlationId`.
- Se mantuvo el scoping por `tenant_id`.
- No se crearon migraciones nuevas para evitar cambios destructivos sin validacion de datos.

