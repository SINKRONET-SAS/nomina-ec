# PLAN HAIKY RESPUESTA Y CORRECCION EMAIL DE ROLES DE PAGO 2026

## Identificacion

| Campo | Valor |
|---|---|
| Plan | `HAIKY-RESPUESTA-CORRECCION-EMAIL-ROLES-PAGO-CLIENTE-2026` |
| Codigo | `ERPC26` |
| Estado | `completed-pass` |
| Fuente funcional | Solicitud del cliente y captura de correo `Rol de pago disponible 07/2026` |
| Fuente tecnica de consulta | `C:\proyectos web\sinkroniq-mobile` (solo lectura) |
| Reglas | `RULES.md` |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` y espejo `AuditLock.json` |
| Prompts | `.github/prompts/ERPC26-00` a `.github/prompts/ERPC26-04` |

## Respuesta funcional

Se acepta la observacion. El correo de cierre no debe exigir acceso a SKNOMINA para que el empleado obtenga su rol. Cada destinatario con correo personal registrado debe recibir el PDF individual que le corresponde. El mensaje debe identificar a la empresa cliente, mostrar su logo configurado y cerrar con la leyenda `Generado con SKNómina`.

El cierre de nomina mantendra independencia transaccional: primero se confirma el cierre del periodo y luego se ejecuta la entrega documental por empleado. Un fallo de SMTP no reabre ni corrompe el cierre; queda reportado por destinatario con `correlationId` y puede corregirse mediante el envio manual ya disponible en `Nomina > Roles de pago`.

## Diagnostico confirmado

| ID | Hallazgo | Evidencia | Correccion |
|---|---|---|---|
| ERPC26-H01 | El cierre enviaba una notificacion sin PDF. | `cerrarMes` llamaba `sendRolPagoDisponible`. | Generar y adjuntar el PDF individual despues del commit del cierre. |
| ERPC26-H02 | El texto remitia a SKNOMINA y omitia al cliente. | Plantilla `payrollRoleAvailableEmailTemplate`. | Usar una unica plantilla documental con nombre canonico de la empresa. |
| ERPC26-H03 | El correo no mostraba el logo del cliente. | La plantilla no resolvia `logoBase64`. | Incluir el logo como adjunto inline CID, siguiendo el patron consultado en Sinkroniq Mobile. |
| ERPC26-H04 | El resultado del cierre no era visible en la PWA. | `CerrarMes.jsx` mostraba solo `Nomina cerrada correctamente`. | Mostrar enviados, omitidos y errores, con ruta de reenvio manual. |
| ERPC26-H05 | El envio manual existia y adjuntaba PDF. | `POST /api/nomina/:id/rol-email`. | Conservar el endpoint, el boton y el contrato; reutilizar la plantilla corregida. |

## Contrato de correo

- Destinatario: `empleados.email_personal` del empleado propietario del rol.
- Asunto: `Rol de pago MM/AAAA - <nombre del cliente>`.
- Cuerpo obligatorio: `Adjunto se encuentra tu Rol de Pagos de la Compañía "<nombre del cliente>".`
- Identidad: logo configurado por el tenant, embebido con CID y sin URL externa.
- Pie: `Generado con SKNómina`.
- Adjunto: un unico PDF de rol correspondiente al `payrollId` y empleado destinatario.
- Seguridad: escape HTML para nombre de empleado y empresa; encabezados saneados; sin acceso a archivos o URLs desde Nodemailer.
- Trazabilidad: evento de comunicacion y auditoria con `correlationId`, `userId`, estado y cantidad de adjuntos.
- Fallo: el cierre ya confirmado no se revierte por un error de entrega; la UI informa el resultado y conserva el reenvio manual.

## Decisiones tomadas desde Sinkroniq Mobile

Se reutilizan conceptualmente cuatro patrones verificados en el servicio de referencia:

1. Logo de marca como adjunto `inline` con `cid`, no como recurso remoto.
2. Plantilla HTML clara con alternativa de texto plano.
3. Escape de valores dinamicos antes de insertarlos en HTML.
4. Separacion entre el estado de la operacion principal y el estado de la entrega por correo.

No se copia su persistencia, retry, modelo de bounces ni configuracion SMTP porque pertenecen a otra arquitectura y exceden este alcance.

## Fases

| Fase | Prioridad | Objetivo | Estado esperado |
|---|---|---|---|
| ERPC26-00 | P0 | Baseline, contraste, plan, contexto y cadena AuditLock. | `completed-pass` |
| ERPC26-01 | P0 | Plantilla de correo con empresa, logo CID, texto y pie requeridos. | `completed-pass` |
| ERPC26-02 | P0 | Envio automatico del PDF individual al cerrar y preservacion del envio manual. | `completed-pass` |
| ERPC26-03 | P1 | Resultado visible en la PWA y siguiente accion ante omitidos o errores. | `completed-pass` |
| ERPC26-04 | P0 | Pruebas, contratos, build, UTF-8, AuditLock, commit y push. | `completed-pass` |

## Resultado de ejecucion

- El cierre genera el PDF definitivo por `payrollId` despues de confirmar la transaccion y lo envia al correo personal del empleado propietario.
- La misma funcion de entrega atiende el cierre automatico y el envio manual, evitando plantillas divergentes.
- El correo incluye nombre canonico del cliente, logo inline CID cuando esta configurado, cuerpo solicitado y pie `Generado con SKNómina`.
- Los roles `cerrada` y `pagada` admiten reenvio manual desde la PWA.
- Los empleados sin correo se reportan como omitidos sin generar PDF; los fallos de generacion o SMTP se aislan por empleado.
- La PWA presenta enviados, omitidos y errores, y orienta a `Nomina > Roles de pago` para completar envios manuales.
- La extraccion de `logoDataUrl` corrigio el acoplamiento detectado durante pruebas sin cambiar el contrato publico de `tenantLogoService`.

## Evidencia QA

- PASS contratos del sistema.
- PASS Prisma schema validate.
- PASS backend completo: 70 suites y 541 pruebas.
- PASS build PWA: 2031 modulos y service worker generado.
- PASS preparacion mobile para tiendas.
- PASS `node --check` en JavaScript modificado.
- PASS UTF-8 sin BOM y roundtrip canonico en 18 archivos gobernados.
- PASS `git diff --check`.

## Reejecucion de prompts y correccion de timeout

El 2026-08-06 se reejecutaron y contrastaron los prompts `ERPC26-00` a `ERPC26-04`. Durante una prueba real de cierre se detecto que la PWA heredaba el timeout global Axios de 20.000 ms, insuficiente para esperar la generacion y entrega de varios roles.

- El endpoint `/nomina/cerrar` dispone ahora de 300.000 ms en la PWA sin alterar el timeout de las demas operaciones.
- Mientras procesa, el boton comunica `Cerrando y enviando roles...`.
- Si se supera incluso ese margen, la PWA evita presentar el timeout crudo, actualiza el estado del periodo y advierte no repetir el cierre para prevenir duplicados.
- El verificador de contratos protege el timeout especifico y la advertencia operativa.
- PASS pruebas focalizadas: 3 suites y 41 pruebas.
- PASS almacenamiento local aislado: 5 pruebas; la operacion principal termino en 16 ms despues de descartar una contencion transitoria de la primera corrida paralela.
- PASS validacion integral serial posterior: contratos, Prisma, 70 suites/541 pruebas backend y build PWA de 2031 modulos.
- PASS preparacion mobile para tiendas.
- Resultado: timeout insuficiente corregido y sin regresiones adicionales.

## Cierre de regresion de dependencias

El push de cierre reporto diez alertas Dependabot introducidas por resoluciones recientes. La auditoria local agrupo las alertas en cuatro causas transitivas altas y se corrigieron antes de considerar terminada la entrega.

- `brace-expansion`: 5.0.9; ramas compatibles historicas: 1.1.18 y 2.1.4.
- `fast-uri`: 3.1.5.
- `ip-address`: 10.4.0.
- `js-yaml`: 4.3.1 y 3.15.1 para la rama Jest.
- PASS `npm audit`: 0 vulnerabilidades en lockfile y arbol instalado.
- PASS arbol de dependencias sin resoluciones invalidas.
- PASS contratos, Prisma, 70 suites/541 pruebas backend, PWA 2031 modulos y mobile.
- Se agregaron contratos que impiden reintroducir las versiones vulnerables en los manifests auditados por GitHub.

## Criterios de aceptacion

- El cierre genera un PDF por cada rol cerrado que tenga destinatario valido y lo adjunta al correo de ese empleado.
- Ningun correo puede adjuntar el rol de otro empleado.
- El HTML contiene el logo configurado del tenant mediante CID cuando existe una imagen valida.
- El texto contiene el nombre canonico del cliente y el pie exacto `Generado con SKNómina`.
- Los empleados no necesitan una cuenta ni acceso al sistema para abrir el PDF recibido.
- El boton manual de envio por empleado sigue habilitado para roles cerrados o pagados.
- La pantalla de cierre presenta conteos de enviados, omitidos y errores, y orienta al reenvio manual.
- La suite focalizada, la suite backend, contratos, Prisma, build web, UTF-8 sin BOM y `git diff --check` terminan en PASS.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| SMTP no configurado o caido | El cierre permanece valido; la entrega queda como error y se reintenta manualmente. |
| Empleado sin correo personal | Se registra como omitido sin generar un envio ambiguo. |
| Logo ausente | El correo conserva nombre empresarial y layout; la PWA ya permite configurar el logo del tenant. |
| Logo invalido historico | Se rechaza el adjunto de logo invalido de forma explicita, sin enviar HTML inseguro. |
| Volumen de empleados | El envio se procesa despues del commit y cada resultado queda aislado por empleado. |

## Rollback

- Revertir el uso automatico de `sendRolPagoEmail` en `cerrarMes` conserva el cierre de nomina y el envio manual previo.
- La extension aditiva `company` del resultado PDF puede retirarse sin migracion de datos.
- El cambio de copy en PWA no modifica contratos de API.
- No se agregan tablas, columnas ni estados de base de datos.
