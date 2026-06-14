# Contrato ONI26-08 - Asistencia Manual y APP

## Alcance

Mejorar el control de asistencia manual y la marcacion desde APP, conectando novedades con estructura organizativa y nomina.

## Reglas

- La asistencia manual exige motivo, usuario actor, aprobacion y auditoria.
- La marcacion APP exige consentimiento informado para ubicacion.
- Los fallos de GPS, permisos o camara no pueden ocultarse; deben producir mensaje visible y log con `correlationId`.
- No se cachean datos personales completos en modo offline.
- Las novedades aprobadas se vinculan al periodo de nomina.

## LOPDP

La ubicacion y foto, cuando aplique, se tratan como datos personales. Deben existir finalidad, aviso, retencion, canal de retiro y acceso limitado por rol.
