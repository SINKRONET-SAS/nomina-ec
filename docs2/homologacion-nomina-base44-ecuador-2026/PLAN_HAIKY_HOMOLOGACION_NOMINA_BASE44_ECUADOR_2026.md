# Plan HAIKY-HOMOLOGACION-NOMINA-BASE44-ECUADOR-2026

Codigo: HNBE26
Estado: baseline desplegado - pendiente ejecucion
Fecha baseline: 2026-06-12
Repo objetivo: SINKRONET-SAS/nomina-ec
Fuente funcional: C:\proyectos web\sensible-easy-payroll-flow
Fuente de reglas: RULES.md

## Objetivo

Homologar en Nomina-Ec un modulo laboral y de nomina ecuatoriana tomando como referencia funcional el prototipo Base44 `sensible-easy-payroll-flow`, sin copiar su arquitectura de datos ni sus parametros hardcodeados. La meta es mejorar cumplimiento legal en Ecuador, parametrizacion general, beneficios, control de asistencia, integracion mobile/PWA, gestion de planes, perfil de usuarios y reporteria.

El prototipo Base44 se usa como mapa de producto: empresas, empleados, marcaciones, novedades, nomina, beneficios, documentos legales, parametros legales, planes y reportes. Nomina-Ec debe absorber esos conceptos dentro de su modelo multi-tenant real (`Workspace`, `Empresa`, `OWNER`, `ADMIN`, `STAFF`, `SUPERADMIN`), sus reglas Haiky y su gobierno de planes/capacidades.

## Alcance

- Parametros laborales Ecuador versionados por vigencia, fuente oficial, region y tipo de rubro.
- Ficha laboral de empleado separada de cliente/proveedor y vinculada a `Empresa`/`Workspace`.
- Contratos, jornada, modalidad, departamento, centro de costo, salario, datos bancarios cifrados y estado laboral.
- Motor de calculo de nomina con ingresos, horas extra, IESS personal/patronal, impuesto a la renta, decimos, vacaciones, fondos de reserva, descuentos, prestamos, anticipos y costo empleador.
- Control de asistencia con marcaciones mobile, geocerca, offline controlado, dispositivo, foto opcional, novedades y aprobaciones.
- Beneficios, prestamos, anticipos, bonos, alimentacion, seguro, capacitacion y cuotas.
- Documentos laborales: rol de pago, certificado laboral, contratos, actas, liquidaciones, entrega de equipos y firma/aceptacion trazable.
- Planes y perfiles: capacidades por plan, limites por empleados/empresas, permisos RRHH y autoservicio empleado.
- Reporteria: roles de pago, provisiones, asistencia, novedades, beneficios, costos, exportables y dashboard operativo.

Fuera de alcance del baseline: modificar runtime, crear migraciones, emitir pagos bancarios reales, integrar IESS/SUT/SRI productivo o asumir parametros legales sin validacion oficial.

## Lectura de Base44

| Area Base44 | Evidencia | Uso para Nomina-Ec |
|-------------|-----------|--------------------|
| Empresa | `base44/entities/Empresa.jsonc` | Reusar idea de region, geocerca, plan y max empleados, pero mapear a `Workspace`/`Empresa` real. |
| Empleado | `base44/entities/Empleado.jsonc` | Crear ficha laboral propia; datos bancarios cifrados y datos personales sujetos a LOPDP. |
| Marcacion | `base44/entities/Marcacion.jsonc` | Inspirar asistencia mobile con tipo, timestamp, lat/lng, perimetro, distancia, foto y dispositivo. |
| NovedadAsistencia | `base44/entities/NovedadAsistencia.jsonc` | Formalizar aprobaciones de faltas, atrasos, permisos, vacaciones y subsidios. |
| Nomina | `base44/entities/Nomina.jsonc` | Separar periodo/cabecera/detalle y conservar trazabilidad de calculo. |
| BeneficioEmpleado | `base44/entities/BeneficioEmpleado.jsonc` | Modelar beneficios y descuentos con cuotas, aprobacion y estado. |
| DocumentoLegal | `base44/entities/DocumentoLegal.jsonc` | Integrar documentos laborales firmables y descargables. |
| ParametroLegal | `base44/entities/ParametroLegal.jsonc` y `src/lib/legal-ecuador.js` | Convertir parametros hardcodeados en catalogo versionado y verificable. |
| PlanSuscripcion | `base44/entities/PlanSuscripcion.jsonc` | Traducir capacidades a planes existentes de Nomina-Ec, sin crear fuente comercial paralela. |

## Riesgos detectados en la fuente

- `src/lib/legal-ecuador.js` contiene parametros 2026 hardcodeados y comentarios de verificacion legal; no puede ser fuente normativa unica.
- Hay mojibake visible en archivos de la fuente; toda importacion documental debe pasar por normalizacion UTF-8 antes de entrar al repo objetivo.
- Base44 usa entidades simples sin transacciones, idempotencia, auditoria profunda ni compatibilidad con el modelo `Workspace`/`Empresa` de Nomina-Ec.
- La nomina requiere parametros oficiales vigentes y validacion contable/laboral antes de produccion.
- Datos de empleados, bancos, geolocalizacion, fotos y salud/subsidios elevan el alcance LOPDP.

## Hallazgos iniciales

| ID | Severidad | Estado | Descripcion |
|----|-----------|--------|-------------|
| HNBE-01 | P0 | planned | No existe contrato canonico laboral en Nomina-Ec para empleado, contrato, asistencia, novedad y nomina. |
| HNBE-02 | P0 | planned | Parametros laborales deben ser versionados por vigencia y fuente oficial, no hardcodeados. |
| HNBE-03 | P0 | planned | Motor de calculo debe ser idempotente, auditable y reproducible por periodo. |
| HNBE-04 | P0 | planned | Asistencia mobile requiere geocerca, offline, correlacion de dispositivo y aprobacion de novedades. |
| HNBE-05 | P1 | planned | Beneficios/prestamos/anticipos deben integrarse al calculo y a reporterias sin duplicar estados. |
| HNBE-06 | P1 | planned | Planes comerciales deben incorporar limites/capacidades RRHH usando el catalogo de planes existente. |
| HNBE-07 | P1 | planned | Perfiles y permisos deben separar OWNER/ADMIN_RRHH/empleado/autoservicio sin romper roles actuales. |
| HNBE-08 | P1 | planned | Reporteria laboral debe cubrir roles de pago, provisiones, asistencia, beneficios y exportables. |
| HNBE-09 | P0 | planned | LOPDP debe cubrir datos laborales sensibles, geolocalizacion, fotos, documentos y cuenta bancaria cifrada. |

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| HNBE26-00 | P0 | completed | Baseline documental: plan, prompts, contexto y AuditLock. No toca runtime. |
| HNBE26-01 | P0 | planned | Verificacion forense Base44 vs Nomina-Ec: superficies, modelos, permisos, planes y brechas reales. |
| HNBE26-02 | P0 | planned | Contrato legal-parametrico Ecuador: parametros, vigencias, fuentes, validadores y matriz de cumplimiento. |
| HNBE26-03 | P0 | planned | Modelo backend laboral: empleado, contrato, asistencia, novedad, beneficio, nomina, documento y auditoria. |
| HNBE26-04 | P0 | planned | Motor de calculo de nomina: idempotencia, desglose, recalculo, cierre, reversa y pruebas doradas. |
| HNBE26-05 | P0 | planned | Asistencia mobile/PWA: marcacion, geocerca, offline, aprobaciones y sincronizacion. |
| HNBE26-06 | P1 | planned | Beneficios, documentos laborales y autoservicio empleado integrado con app. |
| HNBE26-07 | P1 | planned | Gestion de planes, perfiles y permisos RRHH homologados en backend, PWA y mobile. |
| HNBE26-08 | P1 | planned | Reporteria laboral, dashboards, exportables y trazabilidad operacional. |
| HNBE26-09 | P0 | planned | Gates, migracion controlada, validacion legal/contable, performance, seguridad y cierre. |

## Reglas especificas

- `HNBE26-00` no toca runtime.
- No iniciar `HNBE26-01` sin `.vscode/AuditLock.json` firmado para `HNBE26-00`.
- Cada fase requiere aprobacion explicita por prompt.
- No adelantar tareas de fases posteriores.
- Todo parametro legal debe incluir vigencia, fuente, fecha de carga, responsable y evidencia.
- Ningun calculo de nomina puede depender de constantes hardcodeadas en UI/mobile.
- Todo cierre de nomina debe ser idempotente, auditable y reversible mediante flujo documentado.
- Toda marcacion debe conservar `correlationId`, fuente, dispositivo y estado de sincronizacion.
- Datos bancarios, geolocalizacion, salud/subsidios y documentos laborales deben tratarse como datos sensibles LOPDP.
- No crear catalogos de planes paralelos; usar `Plan`, servicios de plan y catalogos compartidos existentes.
- Toda divergencia con Base44 debe quedar documentada como decision operativa o legal.
- Commits esperados: `phase: HNBE26-XX task: ...`.

## Gates propuestos

- Lectura forense PASS con matriz Base44/Nomina-Ec.
- JSON/Markdown UTF-8 sin BOM PASS.
- Migraciones Prisma validadas antes de aplicar en entornos remotos.
- Tests backend de calculo con casos dorados por periodo, region y novedades.
- Tests de idempotencia/recalculo/cierre/reversa de nomina.
- Tests mobile de marcacion offline/geocerca y sincronizacion.
- Tests PWA/mobile de permisos y capacidades por plan.
- `npm.cmd run --workspace=backend test` focalizado segun fase.
- `npm.cmd run --workspace=mobile test` focalizado segun fase.
- `npm.cmd run landing:build` cuando toque PWA.
- `git diff --check` PASS.

## Entregables por fase

- HNBE26-01: reporte forense con matriz de entidades, rutas, pantallas, permisos y gaps.
- HNBE26-02: matriz legal-parametrica y contrato de parametros laborales.
- HNBE26-03: propuesta de schema/API y plan de migracion sin aplicar datos productivos.
- HNBE26-04: motor de calculo y suite de casos dorados.
- HNBE26-05: flujo asistencia mobile/PWA con cola offline y auditoria.
- HNBE26-06: beneficios/documentos/autoservicio empleado.
- HNBE26-07: capacidades de planes y permisos RRHH.
- HNBE26-08: reporterias y dashboards.
- HNBE26-09: gates, reporte final, AuditLock de cierre y rollback.

## Rollback conceptual

- Toda migracion laboral debe tener script de rollback o plan de reversa documentado antes de tocar datos reales.
- Parametros legales nuevos deben poder desactivarse por vigencia sin borrar historico.
- La activacion comercial RRHH debe poder apagarse por plan/capability sin afectar facturacion electronica existente.
- La integracion mobile de asistencia debe poder deshabilitarse por feature flag si genera ruido operativo.