# Matriz legal Ecuador - Plan HAIKY

Fecha: 2026-06-11  
Estado: revision tecnica inicial, no sustituye dictamen legal.

## Hallazgos

- Los calculos de nomina tenian parametros legales hardcodeados en el servicio.
- Se centralizaron parametros en `backend/src/config/legal-ecuador.js`.
- Se agrego redondeo monetario explicito en `backend/src/utils/money.js`.
- Los valores 2026 quedan marcados como `pendiente_validacion_oficial` hasta revision de abogado laboral y contador ecuatoriano.

## Reglas de redondeo

- Los rubros monetarios se redondean a 2 decimales al cerrar cada rubro.
- El neto a recibir se calcula desde rubros ya redondeados.
- Los errores de valores no numericos deben lanzar excepcion y no fallar en silencio.

## Proteccion de datos personales

Controles requeridos antes de produccion:

- Informar finalidad de tratamiento de datos laborales, biometricos/foto y geolocalizacion.
- Registrar base de legitimacion para asistencia, nomina, seguridad y obligaciones legales.
- Minimizar exposicion de cuentas bancarias: descifrado solo en memoria y mascara en UI/logs/reportes.
- Definir retencion documental para marcaciones, contratos, roles, finiquitos y archivos bancarios.
- Habilitar bitacora de acceso y acciones privilegiadas.
- Establecer procedimiento de derechos del titular compatible con obligaciones laborales y tributarias.

## Riesgos abiertos

- Confirmar salario basico unificado, tabla IR, porcentajes IESS y fechas regionales de decimo cuarto para 2026 contra fuentes oficiales.
- Revisar tratamiento de fotos y GPS como datos personales sensibles o de alto riesgo operacional.
- Validar formula de impuesto a la renta mensual con contador antes de emitir roles reales.
- Validar que nomina cerrada sea inmutable con restriccion de base de datos y no solo con UI.
