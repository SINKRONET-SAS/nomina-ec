# MATRIZ DVN26 HALLAZGOS DIAGNOSTICO V2

Fuente: `DIAGNOSTICO_V2_NOMINA_EC.md` del prototipo `sensible-easy-payroll-flow`.  
Estado: matriz de planificacion; no implica que cada hallazgo siga abierto en el runtime actual. Cada fase debe verificar contra codigo real antes de tocar archivos.

| ID | Severidad | Hallazgo | Fase | Criterio de cierre |
|----|-----------|----------|------|--------------------|
| E-01 | P0 legal | IESS personal 9.45% vs 9.95% por seguro desempleo | DVN26-01 | Decision contable documentada; parametro versionado por tipo de contrato; bloqueo UI si pendiente. |
| E-02 | P0 legal | Fondo de reserva Art. 196 CT | DVN26-02 | Calculo/provision visible, testeado y trazable por empleado elegible. |
| E-03 | P0 legal | IR no deduce gastos personales SRI | DVN26-01 | Parametro y formulario de gastos personales con tope vigente y pruebas. |
| E-04 | P0 legal | Tabla IR hardcodeada al guardar BD | DVN26-01 | Tabla IR editable/versionada; motor usa BD validada, no constantes aisladas. |
| E-05 | P0 legal | Art. 188 CT sin tope 25 meses | DVN26-03 | Liquidacion aplica tope y evidencia en acta. |
| E-06 | P0 legal | Periodo de decimo tercero incorrecto en diciembre | DVN26-03 | Casos borde diciembre/noviembre cubiertos por tests. |
| E-07 | P0 calculo | `dias_trabajados` ignorado | DVN26-02 | Sueldo y bases proporcionales por dias reales/30 legal. |
| E-08 | P0 calculo | Bono desempeno no suma a ingresos | DVN26-02 | Bonos aprobados afectan ingresos, IESS y decimos segun parametro. |
| B-01 | P1 operacion | `alertaDecimos` sin pantalla | DVN26-05 | Panel de monitoreo/historial/ejecucion manual con auditoria. |
| B-02 | P1 operacion | `verificarMarcacionesFaltantes` sin panel | DVN26-05 | Panel de ultima ejecucion, errores, reintento y trazabilidad. |
| B-03 | P1 auditoria | AuditLog sin pantalla | DVN26-05 | Auditoria filtrable por fecha, usuario, entidad, accion y tenant. |
| B-04 | P1 laboral | EntregaEquipo sin CRUD UI | DVN26-05 | CRUD visible y bloqueo de finiquito explicable. |
| B-05 | P1 documentos | DocumentoLegal definido pero no usado | DVN26-03, DVN26-05 | Contratos, actas y roles crean registros DocumentoLegal. |
| B-06 | P1 beneficios | Cuotas pagadas no incrementan | DVN26-04 | Cierre idempotente actualiza cuotas y estado con auditoria. |
| D-01 | P0 comercial | Planes sin enforcement | DVN26-07 | Capacidades fail-closed backend y mensajes UI. |
| D-02 | P1 reportes | Reportes sin exportacion | DVN26-06 | CSV/Excel/PDF por persona, periodo y estructura. |
| D-03 | P1 rendimiento | Reportes cargan global sin anio | DVN26-06 | Filtros server-side por tenant, anio, mes y estructura. |
| D-04 | P0 nomina | Calcular sobreescribe nominas cerradas | DVN26-02 | Estados cerrada/pagada protegidos por servicio y tests. |
| D-05 | P1 parametros | Tabla IR no editable desde UI | DVN26-01 | UI editable con validacion y versionado. |
| F-01 | P1 bancos | Archivos bancarios 4 bancos | DVN26-06 | Pichincha, Guayaquil, Produbanco, Bolivariano con perfiles tenant y pruebas. |
| F-02 | P0 legal | Acta finiquito PDF | DVN26-03 | PDF generado, registrado y descargable con formato revisable. |
| F-03 | P1 legal | Contrato PDF | DVN26-03 | Contrato por tipo con clausulas minimas y DocumentoLegal. |
| F-04 | P1 reportes | Reportes tabulares Excel/PDF | DVN26-06 | Exportables de nomina, IESS y provisiones. |
| F-05 | P1 comercial | Landing faltante | DVN26-08 | Landing real, no promesas falsas, acceso PWA visible. |
| F-06 | P1 PWA | Manifest/SW/iconos incompletos | DVN26-08 | PWA instalable, API NetworkOnly y assets compatibles. |
| F-07 | P1 mobile | Mobile no optimizado para teclado | DVN26-08 | Login/asistencia usable en Expo Go y APK, scroll y errores visibles. |
| F-08 | P0 tenant | Multi-tenant real ausente | DVN26-07 | TenantId obligatorio en servicios/controladores; pruebas anti-fuga. |
| T-01 | P0 arquitectura | `calcularNomina` duplicado FE/BE | DVN26-02 | Motor unico backend; frontend consume desglose. |
| T-02 | P1 SEO/PWA | `index.html` generico | DVN26-08 | Metas, OG, robots/sitemap y assets reales. |
| T-03 | P0 tenant | Filtros `empresa_id` ausentes | DVN26-07 | Consultas por tenant con RLS/verificacion. |
| T-04 | P1 errores | Errores silenciosos en calculo masivo | DVN26-02 | Resultado por empleado, errores estructurados y UI de fallos. |
