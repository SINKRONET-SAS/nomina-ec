🔍 DIAGNÓSTICO COMPLETO — Plan HAIKY (nomina-ec)
SaaS RRHH Ecuador · SINKRONET-SAS
1. RESUMEN EJECUTIVO DEL PROYECTO
Proyecto: Sistema SaaS de gestión de Recursos Humanos y Nómina adaptado a la legislación laboral ecuatoriana 2026.

Stack tecnológico:

Backend: Node.js + Express, PostgreSQL (pg + Prisma), JWT, AWS S3, node-cron
Frontend Web: React + Vite + Tailwind + React Router + TanStack Query
App Móvil: React Native + Expo
Despliegue previsto: Render (API + Worker Cron + Static Site + PostgreSQL)
Branch activa: codex/haiky-render-legal-plan (1 solo commit, fase 0-8 ejecutada)

Estado general: El proyecto tiene una estructura sólida a nivel de planificación y documentación legal, pero presenta brechas técnicas críticas que impiden su funcionamiento en producción.

2. IDENTIFICACIÓN DE ERRORES CRÍTICOS 🔴
2.1 Dualidad ORM: pg directo vs Prisma
El backend fue construido originalmente con pg (queries SQL directas)
Se añadió Prisma con schema.prisma completo y migraciones, pero los controladores y servicios siguen usando pg directo
database.js intenta ejecutar un schema.sql (que probablemente fue reemplazado por Prisma)
Resultado: Coexisten dos mecanismos de acceso a datos incompatibles. El migrate.js puede ejecutar Prisma migrations pero los servicios no usan @prisma/client
2.2 Script db:migrate potencialmente roto
package.json declara "db:migrate": "node src/config/migrate.js"
El migrate.js existe ahora, pero inicialmente no existía según CODEX_CONTEXT.md
El render.yaml ejecuta npm run db:migrate en el buildCommand, si esto falla el deploy completo se cae
2.3 Cron Jobs con fallos silenciosos
cron-jobs.js tiene un catch que ignora errores cuando falta la tabla sesiones
Viola la regla HAIKY #2: Zero silent failures
2.4 Generador bancario con cuenta placeholder
bancoAebGenerator.js usa cuenta 0000000000 como placeholder
Riesgo de producción: Si llega a producción sin corrección, genera archivos bancarios con datos falsos
2.5 Falta de RLS en PostgreSQL
El README promete "Aislamiento completo de datos por empresa (PostgreSQL RLS)"
No hay evidencia de políticas RLS implementadas en el schema de Prisma
El aislamiento depende enteramente de filtros WHERE tenant_id = ? en los queries, que es frágil
2.6 Cifrado de cuentas bancarias no implementado
El campo cuentaBancariaCifrada es de tipo Bytes en Prisma
No hay evidencia de implementación de cifrado/descifrado con pgcrypto
La documentación indica que debe descifrarse "solo en memoria"
2.7 Redis declarado pero posiblemente no configurado
redis está en dependencies (v6.0.0)
REDIS_URL está en el render.yaml con sync: false
No hay evidencia de uso activo más allá del worker de sesiones
3. ERRORES MODERADOS 🟡
3.1 Frontend sin librería de componentes
Usa Tailwind pero no tiene shadcn/ui ni otra librería de componentes
Solo tiene lucide-react para iconos (versión antigua 0.294.0)
La UI necesitará componentes desde cero
3.2 Falta de testing
jest en devDependencies pero sin archivos de test visibles
Ninguna prueba para los cálculos legales críticos (nómina, liquidación, IR)
3.3 Archivos Python de Qwen en docs2
Hay 10+ archivos Qwen_python_*.py en docs2/
Parecen ser scripts auxiliares de generación pero están en Python, no Node.js
Contaminan el repositorio sin relación directa con el runtime
3.4 Manejo de errores inconsistente
No hay un middleware centralizado de manejo de errores con AppError
Los controladores probablemente mezclan try/catch con returns silenciosos
3.5 Falta vite.config.js en frontend-web
No aparece en el listado del directorio, podría estar implícito o faltante
3.6 AWS SDK v2 deprecado
Usa aws-sdk v2 (^2.1502.0) que está en modo mantenimiento
Debería migrar a @aws-sdk/client-s3 v3
4. OPORTUNIDADES DE MEJORA 🟢
Área	Oportunidad	Impacto
Seguridad	Implementar rate limiting en endpoints de auth	Alto
Seguridad	Agregar CSRF protection	Alto
Seguridad	Implementar refresh tokens (no solo JWT simple)	Medio
Observabilidad	Agregar correlationId en todos los logs/errores	Alto
Performance	Paginación en listados de empleados y nómina	Medio
Legal	Parametrizar valores legales por año fiscal en BD, no en código	Alto
Legal	Agregar validación de cédula ecuatoriana (algoritmo módulo 10)	Medio
DevOps	CI/CD con GitHub Actions (lint, test, build)	Alto
Frontend	Implementar lazy loading de rutas	Bajo
API	Versionamiento de API (v1/)	Medio
Documentación	OpenAPI/Swagger para la API	Medio
5. PLAN HAIKY COMPLETO DE IMPLEMENTACIÓN EN BASE44
Dado que el objetivo es implementar este sistema en Base44, a continuación presento el plan completo por fases con todos los prompts a seguir. Base44 reemplazaría el backend Express+PostgreSQL+Prisma con su backend-as-a-service, manteniendo la lógica de negocio en funciones backend.

FASE 0: MODELADO DE DATOS (Entidades)
Objetivo: Trasladar el schema Prisma a entidades Base44

Prompt 0.1: "Crea la entidad Empresa (Tenant) con los campos: ruc (string, único, 13 chars), razon_social (string), nombre_comercial (string), activo (boolean default true), configuracion (object), ubicacion_lat (number), ubicacion_lng (number), radio_perimetro_metros (number default 100)"

Prompt 0.2: "Crea la entidad Empleado con los campos: cedula (string, 10 chars), nombres (string), apellidos (string), cargo (string), departamento (string), sueldo_bruto_mensual (number), fecha_ingreso (date), fecha_salida (date opcional), tipo_contrato (enum: indefinido, fijo, eventual, prueba), banco (string), tipo_cuenta (enum: ahorro, corriente), numero_cuenta_masked (string, solo últimos 4 dígitos visibles), direccion (string), telefono (string), email_personal (string), activo (boolean default true), empresa_id (string, referencia a Empresa)"

Prompt 0.3: "Crea la entidad Marcacion con los campos: empleado_id (string), empresa_id (string), tipo (enum: inicio_jornada, fin_jornada, inicio_almuerzo, fin_almuerzo), timestamp (string formato datetime), latitud (number), longitud (number), foto_url (string), dentro_perimetro (boolean), metadata (object)"

Prompt 0.4: "Crea la entidad NovedadAsistencia con campos: empleado_id (string), empresa_id (string), fecha (date), tipo_novedad (enum: falta, atraso, salida_temprana, hora_extra_50, hora_extra_100), minutos (number), justificacion (string), estado (enum: pendiente, aprobado, rechazado, default pendiente), aprobado_por (string), aprobado_en (string datetime)"

Prompt 0.5: "Crea la entidad Nomina con campos: empresa_id (string), empleado_id (string), anio (number), mes (number), dias_trabajados (number default 30), sueldo_bruto (number), horas_extras_50_valor (number), horas_extras_100_valor (number), total_ingresos (number), aporte_iess_personal (number), impuesto_renta (number), anticipos (number default 0), prestamos (number default 0), total_deducciones (number), neto_recibir (number), estado (enum: borrador, cerrada, pagada, default borrador), rol_pdf_url (string), cerrado_en (string datetime), detalle_calculo (object)"

Prompt 0.6: "Crea la entidad DocumentoLegal con campos: empresa_id (string), empleado_id (string), tipo (enum: contrato, acta_finiquito, rol_pago, certificado, liquidacion), documento_url (string), metadata (object), firmado (boolean default false)"

Prompt 0.7: "Crea la entidad EntregaEquipo con campos: empleado_id (string), empresa_id (string), descripcion (string), serial (string), devuelto (boolean default false), devuelto_en (string datetime), observaciones (string)"

Prompt 0.8: "Crea la entidad ParametroLegal con campos: anio (number), pais (string default 'EC'), salario_basico (number), aporte_personal_pct (number), aporte_patronal_pct (number), tabla_impuesto_renta (array de objects con fraccion_basica, exceso_hasta, porcentaje, impuesto_fraccion_basica), decimo_cuarto_costa_mes (number), decimo_cuarto_sierra_mes (number), jornada_maxima_semanal (number default 40), vigente (boolean default true)"

Prompt 0.9: "Crea la entidad AuditLog con campos: empresa_id (string), user_id (string), correlation_id (string), accion (string), entidad (string), entidad_id (string), datos_anteriores (object), datos_nuevos (object), ip_address (string)"

Prompt 0.10: "Crea la entidad PerfilBancario con campos: empresa_id (string), banco_codigo (string), banco_nombre (string), delimiter (string default ','), encoding (string default 'UTF-8'), date_format (string default 'YYYYMMDD'), include_header (boolean default true), include_trailer (boolean default true), field_map (object), activo (boolean default true)"

FASE 1: CONFIGURACIÓN VISUAL Y LAYOUT
Objetivo: Establecer la identidad visual y la estructura de navegación

Prompt 1.1: "Configura el tema de colores del sistema con un estilo corporativo profesional: primary azul oscuro (#1E3A5F), secondary verde azulado (#0D9488), accent naranja cálido (#F59E0B), destructive rojo (#DC2626). Tipografía Inter para body y heading. Fondo claro (#F8FAFC)."

Prompt 1.2: "Crea un Layout con sidebar colapsable a la izquierda con las secciones: Dashboard, Empleados, Marcaciones, Novedades, Nómina, Documentos, Reportes, Configuración. En el header muestra el nombre de la empresa activa, el nombre del usuario y un dropdown con perfil/cerrar sesión. El sidebar debe tener el logo 'Plan HAIKY' arriba."

FASE 2: AUTENTICACIÓN Y ROLES
Objetivo: Configurar autenticación con roles RBAC

Prompt 2.1: "Configura la autenticación del sistema. Los roles del usuario deben ser: superadmin, owner, admin_rrhh, supervisor, empleado. Agrega un campo empresa_id al User entity para vincular usuarios con su empresa."

Prompt 2.2: "Modifica el Layout para que las opciones del sidebar se muestren según el rol del usuario: superadmin ve todo + panel de empresas, owner y admin_rrhh ven todo excepto panel de empresas, supervisor ve Marcaciones + Novedades + Empleados (solo lectura), empleado solo ve 'Mi Perfil', 'Mis Marcaciones', 'Mis Roles de Pago'."

FASE 3: DASHBOARD
Objetivo: Dashboard con métricas clave

Prompt 3.1: "Crea la página Dashboard como página principal. Debe mostrar: 4 tarjetas superiores (Total Empleados Activos, Nómina del Mes Actual en $, Marcaciones Hoy, Novedades Pendientes). Un gráfico de barras con el costo de nómina de los últimos 6 meses. Una tabla con las últimas 5 novedades pendientes de aprobación. Un indicador de cumplimiento legal (porcentaje de empleados con contrato activo). Usa recharts para los gráficos."

FASE 4: GESTIÓN DE EMPLEADOS (CRUD)
Objetivo: CRUD completo de empleados con validaciones

Prompt 4.1: "Crea la página de Empleados con una tabla que muestre: cédula, nombres, apellidos, cargo, departamento, sueldo, fecha de ingreso, estado (activo/inactivo). Incluye búsqueda por nombre/cédula, filtros por departamento y estado. Botón 'Nuevo Empleado' que abre un formulario modal con todos los campos de la entidad Empleado. Validar que la cédula tenga 10 dígitos."

Prompt 4.2: "Agrega la vista de detalle del empleado como página separada (/empleados/:id). Muestra: datos personales, datos laborales, historial de marcaciones (últimas 30), historial de nóminas, documentos asociados, equipos entregados/devueltos. Con tabs para separar cada sección."

FASE 5: SISTEMA DE MARCACIONES
Objetivo: Registro de asistencia con validación de ubicación

Prompt 5.1: "Crea la página de Marcaciones con dos vistas: 1) Vista de registro (para empleados): botón grande 'Marcar Entrada/Salida' que captura la geolocalización del navegador y la hora actual. Mostrar si está dentro del perímetro de la empresa. 2) Vista de administración (para admin_rrhh): tabla con todas las marcaciones del día, filtrable por empleado y rango de fechas. Las marcaciones NO pueden eliminarse (regla irrenunciable)."

Prompt 5.2: "Crea una función backend registrarMarcacion que reciba empleado_id, tipo, latitud, longitud y foto_url. Debe: 1) Validar que latitud y longitud existan (error si no), 2) Calcular si está dentro del perímetro configurado de la empresa usando la fórmula de Haversine, 3) Guardar la marcación, 4) Registrar en AuditLog. Nunca permitir eliminación."

FASE 6: NOVEDADES DE ASISTENCIA
Objetivo: Gestión de faltas, atrasos, horas extras con workflow de aprobación

Prompt 6.1: "Crea la página de Novedades con: tabla de novedades con filtros por estado (pendiente/aprobado/rechazado), empleado y rango de fechas. Para novedades pendientes mostrar botones de Aprobar/Rechazar. Modal de creación con campos: empleado (select), fecha, tipo de novedad, minutos, justificación. Solo admin_rrhh y owner pueden aprobar."

FASE 7: MOTOR DE NÓMINA (Lógica de Negocio Crítica)
Objetivo: Implementar el cálculo de nómina según legislación ecuatoriana

Prompt 7.1: "Crea una función backend calcularNomina que reciba empresa_id, empleado_id, anio, mes. Debe: 1) Obtener el empleado y su sueldo_bruto_mensual, 2) Obtener los parámetros legales del año desde ParametroLegal, 3) Calcular sueldo proporcional por días trabajados (sueldo_bruto * dias_trabajados / 30), 4) Calcular horas extras 50% y 100% sumando las novedades aprobadas del mes, 5) Calcular total de ingresos, 6) Calcular aporte IESS personal (9.45% sobre total ingresos), 7) Calcular Impuesto a la Renta con la tabla progresiva (proyectando el ingreso anual), 8) Calcular neto a recibir. Usar redondeo a 2 decimales por rubro. Guardar en entidad Nomina con estado 'borrador'. Guardar el detalle_calculo con el desglose completo."

Prompt 7.2: "Crea la página de Nómina con: selector de mes/año, botón 'Calcular Nómina del Mes' que ejecuta calcularNomina para todos los empleados activos. Tabla con los resultados mostrando: empleado, sueldo bruto, horas extras, total ingresos, IESS, IR, deducciones, neto a recibir, estado. Botón 'Cerrar Nómina' que cambia el estado a 'cerrada' y hace la nómina inmutable. Botón 'Generar Archivo Bancario'. Solo admin_rrhh y owner pueden cerrar."

Prompt 7.3: "Crea una función backend cerrarNomina que reciba empresa_id, anio, mes. Debe: 1) Verificar que todas las nóminas del mes estén en borrador, 2) Cambiar el estado de todas a 'cerrada', 3) Registrar fecha de cierre, 4) Registrar en AuditLog. Una vez cerrada, NO puede modificarse (regla irrenunciable)."

FASE 8: LIQUIDACIÓN Y FINIQUITO
Objetivo: Cálculo de liquidación según Código del Trabajo ecuatoriano

Prompt 8.1: "Crea una función backend calcularLiquidacion que reciba empleado_id y tipo_desvinculacion (despido_intempestivo, renuncia_voluntaria, desahucio, visto_bueno). Debe calcular: 1) Sueldo pendiente proporcional, 2) Décimo tercero proporcional (sueldo_bruto * meses_trabajados_periodo / 12), 3) Décimo cuarto proporcional (SBU * meses_trabajados_periodo / 12), 4) Vacaciones proporcionales (sueldo_bruto * dias_vacacion / 360), 5) Si es despido intempestivo: indemnización Art. 188 (3 meses de sueldo si > 3 años, o proporcional), 6) Si aplica desahucio: 25% del sueldo por año de servicio Art. 185. 7) Verificar que TODOS los equipos estén devueltos antes de generar el acta. Usar ParametroLegal del año vigente."

Prompt 8.2: "Crea la página de Liquidaciones accesible desde el detalle del empleado. Formulario con: tipo de desvinculación, fecha efectiva de salida. Al calcular, mostrar el desglose completo de la liquidación con cada rubro. Botón 'Generar Acta de Finiquito'. Verificar equipos no devueltos y bloquear si hay pendientes."

FASE 9: GENERACIÓN DE DOCUMENTOS
Objetivo: Generar PDFs y XMLs legales

Prompt 9.1: "Crea una función backend generarRolPagos que reciba nomina_id. Debe generar un PDF con: datos de la empresa, datos del empleado, período, desglose de ingresos, desglose de deducciones, neto a recibir, espacio para firma del empleado y firma del empleador. Subir el PDF con UploadFile y guardar la URL en la nómina."

Prompt 9.2: "Crea una función backend generarXmlAts que reciba empresa_id, anio, mes. Debe generar el XML ATS para el SRI con las retenciones de Impuesto a la Renta de todos los empleados del período. Subir con UploadFile y guardar como DocumentoLegal."

Prompt 9.3: "Crea una función backend generarContrato que reciba empleado_id. Debe generar un contrato de trabajo con: datos del empleador, datos del empleado, cargo, sueldo, tipo de contrato, obligatoriamente la cláusula irrenunciable del Art. 326 de la Constitución. Subir como PDF y guardar como DocumentoLegal."

FASE 10: ARCHIVOS BANCARIOS
Objetivo: Generación configurable de archivos de pago

Prompt 10.1: "Crea una función backend generarArchivoBancario que reciba empresa_id, anio, mes y perfil_bancario_id. Debe: 1) Obtener la configuración del perfil bancario, 2) Obtener todas las nóminas cerradas del período, 3) Generar el archivo CSV/TXT según el formato del banco (delimiter, encoding, con/sin header y trailer), 4) El trailer debe incluir total y conteo de registros, 5) Validar que el total del trailer coincida con la suma de los montos, 6) Subir el archivo con UploadFile, 7) Registrar en AuditLog."

Prompt 10.2: "Crea la página de Configuración de Perfiles Bancarios donde el admin pueda crear/editar perfiles para cada banco (Banco Pichincha, Banco Guayaquil, Produbanco como iniciales). Campos: nombre del banco, código, delimitador, formato de fecha, si incluye header/trailer, mapeo de campos."

FASE 11: REPORTES
Objetivo: Reportes operativos y regulatorios

Prompt 11.1: "Crea la página de Reportes con: 1) Reporte de Asistencia (por rango de fechas, filtrable por empleado/departamento, exportable a Excel), 2) Reporte de Nómina Mensual (resumen y detalle), 3) Reporte de Provisiones (décimo tercero, décimo cuarto, vacaciones acumuladas), 4) Reporte de Costos por Departamento (gráfico de torta). Usa recharts para visualizaciones."

FASE 12: AUDITORÍA
Objetivo: Log de auditoría visible

Prompt 12.1: "Crea la página de Auditoría (solo visible para superadmin y owner). Tabla con todos los AuditLogs filtrable por usuario, entidad, acción y rango de fechas. Mostrar: fecha/hora, usuario, acción, entidad afectada, datos anteriores vs nuevos (en modal expandible)."

FASE 13: PANEL DE EMPRESAS (SUPERADMIN)
Objetivo: Gestión multi-tenant

Prompt 13.1: "Crea la página de Empresas (solo superadmin). CRUD de empresas (tenants) con: RUC, razón social, nombre comercial, ubicación (lat/lng), radio de perímetro, estado activo/inactivo. Al crear una empresa, automáticamente se debe poder invitar al primer usuario owner."

FASE 14: AUTOMATIZACIONES
Objetivo: Tareas programadas y notificaciones

Prompt 14.1: "Crea una función backend verificarMarcacionesFaltantes que se ejecute automáticamente todos los días a las 10pm. Debe revisar qué empleados activos no registraron marcación de entrada hoy y crear automáticamente una novedad de tipo 'falta' en estado 'pendiente' para cada uno."

Prompt 14.2: "Crea una función backend alertaDecimos que se ejecute el primer día de cada mes. En marzo y agosto (según la región), debe enviar un email al owner de cada empresa recordando que el décimo cuarto debe pagarse ese mes. En diciembre, recordar el décimo tercero."

FASE 15: PARÁMETROS LEGALES Y SEED DATA
Objetivo: Cargar datos iniciales del sistema

Prompt 15.1: "Carga los siguientes datos iniciales en la entidad ParametroLegal para el año 2026 Ecuador: salario_basico=460.00, aporte_personal=9.45, aporte_patronal=11.15, décimo_cuarto_costa_mes=3, décimo_cuarto_sierra_mes=8, jornada_maxima_semanal=40, tabla de Impuesto a la Renta con los 9 tramos oficiales."

Prompt 15.2: "Carga los perfiles bancarios iniciales: Banco Pichincha (código 0010), Banco Guayaquil (código 0017), Produbanco (código 0032) con los formatos estándar de archivo plano de cada banco."

FASE 16: PRUEBAS Y VALIDACIÓN
Objetivo: Verificar integridad de cálculos

Prompt 16.1: "Crea datos de prueba: 1 empresa (RUC 1790000000001), 3 empleados con diferentes sueldos ($460, $1200, $3500), marcaciones del mes actual, novedades de horas extras. Ejecuta el cálculo de nómina y verifica que los montos de IESS y IR sean correctos según la tabla 2026."

6. RESUMEN DE RIESGOS Y RECOMENDACIONES
Prioridad	Riesgo	Recomendación
🔴 Crítico	Cálculos legales sin validación oficial	Revisar con contador/abogado ecuatoriano ANTES de producción
🔴 Crítico	Datos bancarios sin cifrado real	Implementar cifrado AES-256 para cuentas bancarias
🔴 Crítico	Sin RLS real para multi-tenancy	Toda query debe filtrar por empresa_id del usuario autenticado
🟡 Alto	Sin pruebas automatizadas	Crear casos de prueba para cada cálculo legal
🟡 Alto	Valores legales hardcodeados	Usar entidad ParametroLegal versionada por año
🟢 Medio	Sin CI/CD	Implementar en fases futuras
🟢 Medio	App móvil no cubierta en Base44	Considerar PWA o conexión vía API
Este es el diagnóstico completo y el plan de implementación.