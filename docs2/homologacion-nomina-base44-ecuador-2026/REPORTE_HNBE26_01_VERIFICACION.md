# HNBE26-01 - Verificacion forense Base44 vs Nomina-Ec

Fecha: 2026-06-12

## Evidencia leida

- Base44: `base44/entities/Empresa.jsonc`, `Empleado.jsonc`, `Marcacion.jsonc`, `NovedadAsistencia.jsonc`, `Nomina.jsonc`, `BeneficioEmpleado.jsonc`, `DocumentoLegal.jsonc`, `ParametroLegal.jsonc`, `PlanSuscripcion.jsonc`.
- Nomina-Ec backend: `backend/prisma/schema.prisma`, `backend/src/app.js`, controladores de empleados, marcaciones, novedades, nomina, documentos, reportes y configuracion.
- Nomina-Ec PWA: `frontend-web/src/App.jsx`, `frontend-web/src/components/Layout/Layout.jsx`, pantalla de parametrizacion y servicios API.
- Nomina-Ec mobile: `app-movil/src/App.js`, pantallas de marcacion y mis marcaciones.

## Hallazgos

| Area | Estado | Evidencia | Decision HNBE26 |
|------|--------|-----------|-----------------|
| Empresa/tenant | Implementado | `Tenant`, usuarios, suscripcion, configuracion y onboarding. | Mantener como raiz multiempresa; no copiar `Empresa` Base44. |
| Empleado | Implementado parcial | `Employee` incluye cedula, sueldo, banco, contrato y estado. | Reforzar contrato laboral, centros de costo y LOPDP. |
| Marcacion | Implementado parcial | `AttendanceMark`, API `/api/marcaciones`, mobile. | Endurecer fuera de perimetro con aprobacion explicita. |
| Novedades | Implementado parcial | `AttendanceNovelty` y configuracion de tipos. | Integrar impacto parametrico completo con nomina. |
| Nomina | Implementado parcial | `Payroll`, calculo mensual, cierre. | Ampliar desglose, costo empleador y reversa auditada. |
| Beneficios | Brecha | No hay tabla dedicada de prestamos/beneficios. | Modelar como fase posterior antes de produccion. |
| Documentos | Implementado parcial | Contrato, finiquito, rol y certificado. | Separar documentos laborales de reportes y auditar descargas. |
| Parametros legales | Implementado parcial | `LegalParameter`, `LegalParameterVersion`, bloqueo de validacion oficial. | Mantener bloqueo productivo hasta validacion legal/contable. |
| Planes | Implementado parcial | `CommercialPlan` con limites y flags. | Ampliar capabilities laborales sin catalogos paralelos. |
| Reporteria | Implementado parcial | ATS, SAE, banco y asistencia. | Agregar roles, provisiones, beneficios y documentos pendientes. |

## Resultado

La PWA y el backend no son solo pantallas decorativas: existen rutas, modelos, controladores y servicios reales. El riesgo principal ya no es ausencia total de backend, sino profundidad funcional: beneficios, parametrizacion legal final, pruebas doradas, autoservicio empleado y reporteria laboral completa siguen como brechas productivas.

