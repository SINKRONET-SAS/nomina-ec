# Plan Haiky HRC26 - correccion y recalculo controlado de roles

## Objetivo

Eliminar el flujo de una sola via en el calculo mensual sin permitir alteraciones manuales de totales derivados. Mientras el rol permanezca en borrador, un usuario `owner` o `admin_rrhh` podra descartar el calculo, corregir sus novedades y volver a calcular. Los roles cerrados se mantienen inmutables.

## Hallazgos reconfirmados

1. El motor usa `ON CONFLICT ... DO UPDATE` para recalcular roles en estado `borrador`, pero la PWA deshabilita el calculo cuando el periodo llega a `calculated`.
2. Las novedades consumidas por lineas de calculo dejan de ser editables y no existe una accion visible para liberar el borrador.
3. `RolesPagos.jsx` solo permite descargar y enviar; no expone correccion ni eliminacion de borradores.
4. La etiqueta de estado de `RolesPagos.jsx` consulta `nomina.cerrada`, aunque el contrato real usa `nomina.estado`.
5. Mobile consulta roles sin restringir `estado`, por lo que un empleado puede ver un borrador que RRHH todavia puede corregir.
6. El PDF individual no diferencia visualmente un borrador de un rol cerrado.
7. Los parametros 2026 del repositorio coinciden con las fuentes oficiales revisadas: SBU USD 482, IESS 9,45% personal y 11,15% patronal, jornada mensual de 30 dias/240 horas y tabla IR 2026.
8. El endpoint heredado `/api/nomina/reabrir` convertia roles cerrados nuevamente en borrador sin revertir en la misma transaccion los efectos del cierre; no tiene consumidores en PWA ni MOBILE.

## Decisiones de diseno

- Corregir un rol significa descartar el resultado derivado, editar la novedad o ficha fuente y recalcular. No se editan manualmente netos, aportes o bases tributarias.
- El descarte elimina solo filas `borrador` y sus lineas de calculo; conserva el lote historico con metadata de descarte y crea auditoria atomica.
- El descarte puede ser individual o de todo el periodo. Requiere motivo de al menos 10 caracteres y usuario fresco con rol autorizado.
- El periodo vuelve a `novelties_loaded` si conserva novedades o a `open` si no existen; ambos estados son calculables.
- Un rol `cerrada` o `pagada` nunca puede eliminarse mediante estas acciones.
- El endpoint heredado de reapertura se conserva para compatibilidad, responde `409 NOMINA_CERRADA_INMUTABLE` y orienta a registrar el ajuste en un periodo abierto.
- Mobile y correo solo presentan roles cerrados o pagados. Un PDF de borrador se identifica como vista preliminar.

## Fases

### HRC26-00 - Diagnostico y fuentes

- Ejecutar `npm run audit:roles:2026`.
- Confirmar LANDING, PWA, BACKEND y MOBILE.
- Documentar fuentes laborales y tributarias oficiales vigentes en 2026.

### HRC26-01 - Ciclo backend

- Crear servicio transaccional de descarte individual y por periodo.
- Agregar endpoints RBAC con usuario fresco, motivo y auditoria.
- Mantener compatibilidad de los endpoints existentes.

### HRC26-02 - Operacion PWA

- Exponer `Descartar calculo` en cierre mensual.
- Exponer `Corregir novedades` y `Eliminar borrador` por rol.
- Prefijar empleado y periodo al entrar a novedades desde un rol.

### HRC26-03 - Mobile y documentos

- Ocultar borradores en autoservicio e historial mobile.
- Marcar el PDF preliminar como borrador.
- Mantener envio por correo y archivo bancario solo para estados finales.

### HRC26-04 - Gobierno y scripts

- Generar diagnostico JSON/Markdown y script JS de solucion.
- Actualizar `CODEX_CONTEXT.md`, contratos, prompts y AuditLock.

### HRC26-05 - QA y entrega

- Ejecutar pruebas focalizadas y suite completa backend.
- Ejecutar contratos, Prisma, mobile, build PWA/LANDING, UTF-8 y `git diff --check`.
- Corregir cualquier regresion, crear commit trazable y hacer push.

## Fuentes oficiales 2026

- Ministerio del Trabajo, SBU 2026 USD 482: https://www.trabajo.gob.ec/wp-content/plugins/download-monitor/download.php?force=1&id=4933
- Ministerio del Trabajo, Acuerdo MDT-2023-140: https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf
- Ministerio del Trabajo, Codigo del Trabajo: https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/CODIGO_DEL_TRABAJO.pdf
- SRI, tabla de Impuesto a la Renta 2026: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf
- SRI, formularios y ficha RDEP/Formulario 107: https://www.sri.gob.ec/web/intersri/formularios-e-instructivos
- IESS, aportes de afiliado y empleador: https://iess.gob.ec/es/web/afiliado/servicios-y-prestaciones

## Criterios de cierre

- Ningun rol cerrado puede descartarse.
- Todo descarte queda asociado a motivo, usuario, IP y `correlationId`.
- Las novedades liberadas vuelven a ser editables antes del recalculo.
- Los empleados no ven borradores en mobile.
- El diagnostico HRC26 queda sin hallazgos abiertos y todos los gates terminan en verde.
