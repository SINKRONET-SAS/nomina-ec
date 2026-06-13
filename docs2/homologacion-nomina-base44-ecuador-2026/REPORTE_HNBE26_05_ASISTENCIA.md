# HNBE26-05 - Asistencia mobile y PWA

Fecha: 2026-06-12

## Estado actual

El sistema tiene marcaciones mobile/PWA/API con geolocalizacion, distancia, foto opcional, IP, auditoria y novedades automaticas por atraso.

## Cambios aplicados

- Una marcacion fuera de perimetro ya no queda aceptada silenciosamente.
- Para aceptar una marcacion fuera de zona se exige:
  - `permitirFueraPerimetro: true`.
  - `motivoFueraPerimetro` no vacio.
  - Registro del motivo en metadata.
  - Auditoria con `correlationId`.

## Pendientes productivos

- Consentimiento LOPDP visible para geolocalizacion y foto.
- Cola offline con sincronizacion idempotente.
- Vista PWA de aprobacion de marcaciones fuera de zona.
- Parametrizacion por zona/jornada en el validador, no solo configuracion del tenant.

