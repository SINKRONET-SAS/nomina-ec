# CONTRATO_DPS26_CIERRE_DEFINITIVO

Plan: `HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026`
Codigo: `DPS26`
Estado: `DPS26-00 documental creado`

## Proposito

Este contrato define las reglas de cierre para convertir el diagnostico preliminar de SKNOMINA en cambios verificables, sin introducir regresiones ni prometer cumplimiento sin evidencia.

## Alcance funcional

El cierre cubre:

- Backend Node/Express/Prisma/PostgreSQL/Redis.
- PWA React/Vite/Tailwind.
- App movil Expo/React Native.
- Landing, planes, login, dashboard y flujos operativos.
- Reportes PDF, XML, Excel y CSV.
- Documentacion, runbooks y AuditLock.

## Invariantes

- Toda operacion multi-tenant debe tener tenant explicito o una regla documentada de superadmin/fundador.
- Toda nomina cerrada debe conservar snapshot, desglose, actor, fecha y bloqueo de edicion directa.
- Toda marcacion debe preservar evidencia laboral; no se permite borrado fisico sin regla legal y auditoria.
- Toda cuenta bancaria debe persistir cifrada y mostrarse solo como registro seguro.
- Todo reporte oficial debe bloquearse si falta fuente tecnica vigente, plantilla o validador requerido.
- Todo error visible para usuario debe usar lenguaje comercial normal, no mensajes tecnicos crudos.
- Todo cambio legal/tributario debe incluir fuente, version, prueba y reporte de impacto.

## Contrato legal laboral

Cada regla laboral debe declarar:

- Pais y anio fiscal/laboral.
- Fuente o acuerdo normativo.
- Parametro versionado.
- Vigencia desde/hasta.
- Modulo que la consume.
- Prueba automatizada o fixture manual verificado.
- Texto visible de bloqueo cuando falte configuracion.

Dominios obligatorios:

- Contratos escritos.
- Jornada, atrasos y horas extra.
- Decimo tercero.
- Decimo cuarto por region.
- Vacaciones.
- Fondos de reserva.
- IESS personal y patronal.
- Finiquito y liquidacion.
- Auditoria por periodo.

## Contrato tributario

El motor tributario debe separar:

- Parametros fiscales por anio.
- Calculo de base imponible.
- IESS deducible.
- Proyeccion de ingresos y gastos personales cuando aplique.
- Tramos de impuesto a la renta.
- Reportes SRI aplicables a relacion de dependencia.

Los reportes no deben habilitar generacion productiva si:

- Falta ficha tecnica vigente.
- Falta catalogo o XSD cuando aplique.
- Hay inconsistencia entre datos de empleador, empleado y periodo.
- No existe evidencia de validacion estructural.

## Contrato de reportes oficiales

La promesa comercial de reportes queda gobernada por RPE26: RDEP y Formulario 107 se consideran reportes SRI, IESS se mantiene como prevalidacion hasta formato oficial validado y los reportes internos deben ser trazables.

Condiciones obligatorias:

- RDEP debe generarse con estructura, catalogos y ficha tecnica vigentes para el periodo 2026 antes de habilitar descarga productiva.
- Formulario 107 debe generarse como PDF individual anual por trabajador, no como Excel, y debe reconciliar totales contra el RDEP del mismo anio.
- SAE IESS debe basarse en estructura vigente del IESS o quedar bloqueado con mensaje comercial si no existe evidencia tecnica suficiente.
- Reportes internos deben declarar fuente de datos, periodo, filtros, usuario generador, fecha de generacion y hash interno.
- Todo reporte debe tener modo validacion previa, errores accionables y descarga bloqueada cuando falten datos obligatorios.
- La UI no debe usar mensajes como "mock", "pendiente tecnico" o "sin implementar"; debe indicar que falta completar configuracion o validacion para emitir.

Evidencia minima:

- Manifest de fuente oficial o tecnica por reporte.
- Snapshot del archivo generado.
- Test de consistencia de totales.
- Registro de auditoria por descarga.
- Hash interno del archivo o payload.

## Contrato PWA y app

Los flujos operativos deben tener:

- Estado de carga.
- Estado vacio.
- Error recuperable.
- Reintento.
- Bloqueo legal o configuracion incompleta.
- Confirmacion de accion irreversible.
- Auditoria visible cuando el usuario deba supervisar.

La app movil debe solicitar permisos solo cuando la accion los requiere y debe explicar finalidad laboral, datos tratados y alternativa operativa.

## Contrato de seguridad

Se exige:

- RLS real en PostgreSQL o proteccion equivalente documentada.
- JWT con expiracion, claims suficientes y revocacion cuando aplique.
- Logs sin PII sensible.
- Documentos privados con URL firmada y expiracion.
- Cifrado de cuenta bancaria y controles de visualizacion.
- Separacion entre fundador, superadmin y owners sin obligar cambios de codigo para tareas normales.

## Fuera de alcance de DPS26-00

- Cambios runtime.
- Llamadas a servicios externos productivos.
- Emision de reportes oficiales reales.
- Ajustes en Render, Cloudflare o dominios.
- Commit y push.

## Cierre por fase

Cada fase runtime se considera cerrada solo si:

- El usuario aprobo ejecutar la fase.
- Se leyo codigo real antes de modificar.
- Se implementaron cambios acotados.
- Se ejecutaron gates aplicables.
- Se genero reporte de fase.
- `AuditLock.json` quedo firmado.
