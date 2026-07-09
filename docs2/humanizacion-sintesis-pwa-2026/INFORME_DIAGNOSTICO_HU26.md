# Informe diagnostico HU26 - Humanizacion y sintesis PWA

## Alcance verificado

Se revisaron pantallas PWA de SKNOMINA relacionadas con documentos legales, parametrizacion, nomina, comunicaciones, ficha del trabajador y resultado de pago. El hallazgo aplica a `nomina-ec`: los textos auditados existen en `frontend-web/src/pages`.

## Hallazgos reconfirmados

| ID | Estado | Evidencia | Resolucion |
|----|--------|-----------|------------|
| HU26-F01 | Confirmado | `ContratosGenerados.jsx`, `ActasFiniquito.jsx` y `ActasEntregaDotacion.jsx` tenian avisos largos y repetidos. | Se creo `CompactNotice` y se reemplazaron por mensajes breves. |
| HU26-F02 | Confirmado | `Parametrizacion.jsx` tenia bloques extensos para archivo bancario, valores legales y jornadas. | Se redujeron textos y se mantuvo el bloqueo por responsabilidad del owner. |
| HU26-F03 | Confirmado | `DescargarReportes.jsx` y `PagosBancarios.jsx` explicaban demasiado antes de la accion principal. | Se sintetizaron encabezados, criterios y avisos. |
| HU26-F04 | Confirmado | `Comunicaciones.jsx` exponia "modo dev" y `dev_logged`. | Se cambio a "pruebas" y "Correo en pruebas". |
| HU26-F05 | Confirmado | `PaymentResult.jsx` mostraba "Modo mock activo". | Se cambio a "Pago pendiente de confirmacion". |
| HU26-F06 | Confirmado | `NuevoEmpleado.jsx` tenia textos largos, acentos pendientes y enlace antiguo. | Se humanizo microcopy y se cambio el enlace a "Descuento Anticipos". |

## Cambios runtime ejecutados

- `frontend-web/src/components/UI/CompactNotice.jsx`: componente compartido de aviso compacto.
- `frontend-web/src/pages/Documentos/ContratosGenerados.jsx`: avisos SUT/MDT y firmas sintetizados.
- `frontend-web/src/pages/Documentos/ActasFiniquito.jsx`: aviso legal reducido.
- `frontend-web/src/pages/Documentos/ActasEntregaDotacion.jsx`: titulo y aviso de firmas corregidos.
- `frontend-web/src/pages/Nomina/PagosBancarios.jsx`: texto de flujo bancario y validacion previa corregidos.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`: reportes oficiales e internos sintetizados.
- `frontend-web/src/pages/Configuracion/Comunicaciones.jsx`: estados de prueba y proteccion de datos humanizados.
- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`: cabecera, valores legales, banco y jornadas simplificados.
- `frontend-web/src/pages/Empleados/NuevoEmpleado.jsx`: ficha del trabajador sintetizada y ortografia visible corregida.
- `frontend-web/src/pages/PaymentResult.jsx`: resultado de pago sin jerga "mock".

## Riesgos residuales

- La PWA todavia contiene textos historicos extensos en pantallas no tocadas por HU26. Se recomienda una fase posterior por modulo, con capturas y medicion de longitud.
- Los cambios URR26 abiertos en el arbol no forman parte de HU26 y no deben mezclarse en el commit de esta fase.

## Validacion requerida

- Build PWA.
- Revision de diff por rutas HU26.
- UTF-8 sin BOM.
- `AuditLock.json` firmado.
