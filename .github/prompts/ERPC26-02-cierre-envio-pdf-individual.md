# ERPC26-02 - Cierre y envio de PDF individual

Prerequisito: AuditLock ERPC26-01 firmado.

Objetivo: enviar el rol correcto al cerrar la nomina sin acoplar el commit del cierre a SMTP.

Tareas:
- Despues del commit, generar el PDF por `payrollId` con buffer.
- Enviar mediante la misma funcion usada por el flujo manual.
- Omitir de forma explicita a empleados sin correo personal.
- Aislar errores por empleado, conservar `correlationId` y devolver detalle agregado.
- Mantener el endpoint y boton manual; admitir roles finales cerrados o pagados.
- Probar que no se usa la plantilla antigua de disponibilidad en el cierre.

Gate: pruebas del controlador, auditoria y contrato de ruta sin regresiones.
