# INFORME DIAGNOSTICO OAP26

## Resumen ejecutivo

El diagnostico confirma hallazgos reales en `nomina-ec`: textos visibles con nomenclatura inconsistente, parametros legales con validacion operativamente lenta, periodos anuales sin edicion segura, ausencia de guia visible y modelos de contratos laborales insuficientes. Tambien se confirmo que asociar el modelo al cargo generaba una doble fuente de verdad; la decision final es que el modelo sea visible y editable en la ficha del empleado.

## Hallazgos confirmados

### OAP26-F01 - Ortografia y nombres de pantalla

Confirmado. La PWA mostraba textos como `Beneficios, anticipos y prestamos` y menu `Beneficios y descuentos`. Se corrigio hacia `Anticipos y préstamos` y `Descuento Anticipos`. Las pantallas de periodos y parametrizacion conservan terminologia de `Año`, `período` y `nómina` donde afecta la experiencia visible.

### OAP26-F02 - Validacion de parametros legales

Confirmado. La validacion por fuente/URL no era un buen gate operativo para parametros cuya responsabilidad legal recae en el owner. Se implemento check `Validado por owner`, se registra metadata de aprobacion y se bloquea edicion/eliminacion posterior para perfiles que no sean owner/superadmin.

### OAP26-F03 - Fechas de periodos anuales

Confirmado. La lectura de fechas con conversion horaria podia mostrar 31 de diciembre del anio anterior. El backend devuelve `fecha_desde` y `fecha_hasta` como `YYYY-MM-DD`, genera enero a diciembre del anio seleccionado y permite editar fechas solo si el periodo no esta calculado/cerrado ni tiene roles.

### OAP26-F04 - Cierre de meses previos vacios

Confirmado. Cuando una empresa empieza a operar a mitad de anio, los meses anteriores deben poder cerrarse aunque no tengan datos. Se agrego cierre masivo de meses previos vacios, con bloqueo si hay nominas o novedades.

### OAP26-F05 - Tipos y modelos de contratos

Confirmado. El sistema necesitaba cubrir las modalidades laborales de uso referencial para Ecuador 2026 y plantillas PDF especificas. Se agregaron plantillas JSON versionadas, endpoint de tipos aceptados, validacion backend y exposicion en PWA.

### OAP26-F06 - Modelo de contrato en ficha del empleado

Confirmado por decision de producto. Atar la plantilla al cargo podia ser incorrecto porque trabajadores con el mismo cargo pueden tener modalidades contractuales distintas. Se dejo la ficha del empleado como fuente operativa del modelo. La pantalla de contratos generados lo usa como sugerencia y permite cambio manual antes de emitir PDF.

### OAP26-F07 - Guia de uso

Confirmado. Se agrego pantalla de ayuda con flujos de parametros, periodos, contratos, documentos y cierre mensual.

## Candidatos descartados como falsos positivos

- No se elimina `tipo_contrato` de empleados: se reutiliza como campo de modelo de contrato para evitar migracion innecesaria y preservar compatibilidad con datos existentes.
- No se crea catalogo frontend paralelo de plantillas: la ficha consulta el endpoint backend existente y solo usa un normalizador compartido para valores legados.
- No se asume validez oficial automatica de las plantillas: quedan como modelos referenciales sujetos a revision y registro externo.

## Archivos runtime principales

- `backend/src/services/monthlyPeriodService.js`
- `backend/src/controllers/nominaController.js`
- `backend/src/services/configurationService.js`
- `backend/src/config/ecuadorContractTypes.js`
- `backend/src/services/templateGenerator.js`
- `frontend-web/src/pages/Nomina/PeriodosNomina.jsx`
- `frontend-web/src/pages/Nomina/Beneficios.jsx`
- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`
- `frontend-web/src/pages/Empleados/NuevoEmpleado.jsx`
- `frontend-web/src/pages/Documentos/ContratosGenerados.jsx`
- `frontend-web/src/pages/AyudaUsuario.jsx`
- `frontend-web/src/utils/contractTemplates.js`

## Riesgos residuales

- Las plantillas laborales deben ser revisadas por asesor laboral ecuatoriano antes de uso productivo masivo.
- La validacion del owner no sustituye fuentes oficiales; solo evita que el sistema bloquee operacion por busqueda automatica de URL.
- Los reportes tributarios y documentos SRI/IESS conservan necesidad de validacion profesional antes de presentacion oficial.
