# HNBE26-03 - Modelo Backend Laboral

Objetivo: proponer e implementar, cuando se apruebe, el modelo backend laboral dentro de `Workspace`/`Empresa` sin duplicar conceptos existentes.

Tareas:
- Definir modelos para ficha laboral, contrato, centro de costo, asistencia, novedad, beneficio, periodo de nomina, detalle de nomina y documento laboral.
- Definir owner-scoping, indices, estados y auditoria.
- Separar empleado laboral de cliente/proveedor fiscal existente.
- Definir cifrado/masking de datos bancarios y control de acceso LOPDP.
- Preparar migracion reversible y seeds minimos de catalogos.

No hacer:
- No tocar facturacion electronica ni comprobantes SRI salvo referencias necesarias.
- No introducir estados paralelos fuera de DB.