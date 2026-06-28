# CONTRATO CDANV6 - CIERRE DEFINITIVO

## Principio rector

CDANV6 corrige hallazgos sobre el repo real, preservando compatibilidad y trazabilidad. Ningun cambio runtime puede cerrarse sin evidencia visible, prueba ejecutada y `AuditLock.json` actualizado.

## Invariantes

- `RULES.md` gobierna todos los cambios `.js`, `.md` y `.json`.
- El contexto operativo vive en `.github/CODEX_CONTEXT.md`; no crear `CODEX_CONTEXT.md` en raiz.
- Los mensajes al usuario deben estar en espanol comercial normal, sin textos tecnicos innecesarios.
- El SBU 2026 operativo se mantiene en USD 482 salvo cambio legal versionado y aprobado.
- RDEP productivo falla cerrado si la fuente XSD no esta reconciliada.
- Las solicitudes de GPS en mobile deben informar finalidad y tratamiento antes de pedir permiso.
- Los calculos laborales no pueden generar sueldo pendiente superior a 30 dias del divisor mensual.
- La politica de `docs2/` y `AuditLock.json` se decide sin eliminar historial ni evidencia activa por accidente.

## Contratos por hallazgo

### HAL-1 Mensajes friendly

- Mantener estructura del catalogo.
- Prohibido dejar `friendly` vacio en mensajes activos.
- Validar JSON y consumidores si existen.

### HAL-2 RDEP XSD

- Guardar version, fuente, fecha de descarga y SHA-256.
- Si no se puede confirmar fuente vigente, bloquear generacion productiva y mostrar mensaje claro.
- No afirmar cumplimiento SRI sin validacion contra XSD oficial.

### HAL-3 Ortografia y lenguaje UI

- Corregir solo texto visible.
- No tocar rutas, ids, slugs, nombres de variables, scopes ni claves tecnicas por busqueda global ciega.

### HAL-4 Logs

- El navegador no debe exponer logs de debug de autenticacion, planes, datos personales o pagos.
- Backend debe usar logger estructurado en procesos operativos cuando ya exista o cuando se agregue uno compatible.
- `console.log` de scripts y banners de arranque pueden conservarse si estan justificados.

### HAL-5 Parametrizacion

- Refactor incremental con build verde despues de cada bloque significativo.
- No cambiar comportamiento ni navegacion.
- No mezclar el split con cambios funcionales.

### HAL-6 PWA maskable

- Los iconos deben existir fisicamente y declararse en manifest.
- No referenciar assets inexistentes.
- Mantener safe-zone visual para launchers Android.

### HAL-7 LOPDP GPS

- El aviso aparece antes de `requestForegroundPermissionsAsync`.
- Debe indicar finalidad, datos tratados, responsable/base y opcion de cancelar.
- No registrar marcacion si el empleado cancela o deniega permiso.

### HAL-8 Sueldo diario dia 31

- `diasPendientes = Math.min(fechaSalida.getDate(), 30)` o equivalente.
- Test obligatorio con salida el 31 de enero de 2026.
- No modificar rubros no relacionados de liquidacion.

### HAL-9 Gobierno repo publico

- Primero diagnosticar si `docs2/` y `AuditLock.json` estan trackeados y usados por CI/docs.
- Opciones permitidas: mantener con sanitizacion, mover a repo privado, ignorar futuros cambios, o retirar del indice con aprobacion.
- Prohibido borrar sin respaldo y sin aprobacion explicita.

## Definition of Done

- Codigo/documentacion de la fase aplicados.
- Pruebas o checks acordes al alcance.
- Reporte de fase en `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/`.
- `AuditLock.json` firmado.
- Commit con formato `phase: CDANV6-XX task: <descripcion>`.
