# Informe diagnostico HU26 - Humanizacion y sintesis PWA

## Alcance verificado

Se revisaron pantallas PWA de SKNOMINA relacionadas con documentos legales, parametrizacion, nomina, comunicaciones, ficha del trabajador y resultado de pago. En segunda pasada se revisaron terminos y condiciones, plantillas contractuales y etiquetas visibles de roles. El hallazgo aplica a `nomina-ec`: los textos auditados existen en `frontend-web/src/pages`, `frontend-web/src/components` y `backend/src/templates/legal/contracts`.

## Hallazgos reconfirmados

| ID | Estado | Evidencia | Resolucion |
|----|--------|-----------|------------|
| HU26-F01 | Confirmado | `ContratosGenerados.jsx`, `ActasFiniquito.jsx` y `ActasEntregaDotacion.jsx` tenian avisos largos y repetidos. | Se creo `CompactNotice` y se reemplazaron por mensajes breves. |
| HU26-F02 | Confirmado | `Parametrizacion.jsx` tenia bloques extensos para archivo bancario, valores legales y jornadas. | Se redujeron textos y se mantuvo el bloqueo por responsabilidad del administrador principal. |
| HU26-F03 | Confirmado | `DescargarReportes.jsx` y `PagosBancarios.jsx` explicaban demasiado antes de la accion principal. | Se sintetizaron encabezados, criterios y avisos. |
| HU26-F04 | Confirmado | `Comunicaciones.jsx` exponia "modo dev" y `dev_logged`. | Se cambio a "pruebas" y "Correo en pruebas". |
| HU26-F05 | Confirmado | `PaymentResult.jsx` mostraba "Modo mock activo". | Se cambio a "Pago pendiente de confirmacion". |
| HU26-F06 | Confirmado | `NuevoEmpleado.jsx` tenia textos largos, acentos pendientes y enlace antiguo. | Se humanizo microcopy y se cambio el enlace a "Descuento Anticipos". |
| HU26-F07 | Confirmado | Plantillas de contratos mencionaban SKNOMINA como fuente de calculos, evidencia o sujeto operativo dentro de clausulas laborales. | Se reemplazo por EL EMPLEADOR, expediente laboral o plantilla, segun corresponda. |
| HU26-F08 | Confirmado | `LegalText.jsx` no separaba con suficiente claridad el servicio SaaS de la responsabilidad legal del cliente. | Se agregaron clausulas de naturaleza SaaS, responsabilidad del cliente, plantillas/calculos y limites del servicio. |
| HU26-F09 | Confirmado | `sessionRoleLabel()` devolvia `owner` crudo y habia textos "Consola fundador" / "Superadmin" visibles. | Se muestran "Administrador principal" y "Soporte global" sin cambiar roles tecnicos. |
| HU26-F10 | Confirmado | `Register.jsx`, ayuda y parametrizacion conservaban frases que trasladaban jerga interna al usuario final. | Se reemplazaron por "administrador principal", "responsable" y lenguaje de empresa cliente. |

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
- `backend/src/templates/legal/contracts/*.json`: plantillas laborales sin SKNOMINA como parte contractual ni sujeto de obligaciones laborales.
- `frontend-web/src/pages/LegalText.jsx`: terminos SaaS reforzados con responsabilidad legal del cliente.
- `frontend-web/src/utils/access.js`: etiquetas humanas para roles visibles.
- `frontend-web/src/components/Layout/Layout.jsx` y `frontend-web/src/pages/Superadmin.jsx`: "Soporte global" en lugar de jerga interna.
- `frontend-web/src/pages/Register.jsx`, `frontend-web/src/pages/AyudaUsuario.jsx`, `frontend-web/src/pages/Configuracion/Parametrizacion.jsx` y formularios de parametros: lenguaje visible sin `owner`.

## Riesgos residuales

- La PWA todavia puede contener textos historicos extensos fuera de las rutas revisadas. Se recomienda una fase posterior por modulo, con capturas y medicion de longitud.
- Los identificadores tecnicos `owner` y `superadmin` permanecen en codigo por compatibilidad RBAC/API; no deben mostrarse crudos al usuario.

## Validacion requerida

- Build PWA.
- Pruebas backend de generador de plantillas.
- Contratos del sistema.
- Revision de diff por rutas HU26.
- UTF-8 sin BOM.
- `AuditLock.json` firmado.
