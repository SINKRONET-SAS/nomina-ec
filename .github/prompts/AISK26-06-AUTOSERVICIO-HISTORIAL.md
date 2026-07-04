# AISK26-06: Autoservicio Empleado e Historial

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 06
**Prerequisito:** AISK26-05 firmado
**Hallazgos:** HAL-120..122 (MEDIO/BAJO)

## Objetivo

Expandir autoservicio del empleado con descarga de rol de pago PDF, adjunto de certificado medico en permisos, y notificacion al empleado.

## Tareas

### Roles de pago en app (HAL-120)
1. AutoservicioScreen.js: agregar seccion "Mis roles de pago" con lista de periodos disponibles
2. Endpoint /api/mobile/nomina/:anio/:mes ya existe - verificar que retorna datos del empleado autenticado
3. Boton "Descargar PDF" que abre el rol en el visor nativo del telefono

### Certificado medico (HAL-121)
4. PermisosScreen.js: agregar boton "Adjuntar soporte" usando expo-image-picker
5. Mostrar preview de la imagen seleccionada
6. Backend /api/mobile/permisos POST: aceptar campo adjunto_base64 y almacenar en S3 o disco
7. En PWA PermisosOperacion.jsx: mostrar link al adjunto del empleado

### Notificacion de aprobacion (HAL-122)
8. Backend: al aprobar permiso, llamar sendNotificacionPermisoAprobado(empleado, permiso)
9. Template email: "Tu permiso del {fecha_inicio} al {fecha_fin} fue {aprobado|rechazado}"

### Email de rol al cerrar mes (complemento HAL-51)
10. nominaController.cerrarMes: iterar empleados del periodo y llamar sendRolPagoDisponible para cada uno
11. Retornar resumen: {enviados: N, omitidos: N, errores: N}

## Gate

- Empleado ve y descarga rol de pago desde app
- Permiso con adjunto se sube y se visualiza en PWA
- Al cerrar mes, empleados reciben email de rol disponible
- Tests para endpoint mobile/nomina y adjunto

## Commit

phase: AISK26-06 task: autoservicio-historial
