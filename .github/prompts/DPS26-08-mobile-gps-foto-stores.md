# DPS26-08 app movil GPS, foto y stores

Objetivo: cerrar estandares Android/iOS para marcacion con GPS/foto y privacidad.

Requiere aprobacion explicita del usuario.

Tareas:
- Validar permisos minimos de ubicacion, camara y textos de privacidad.
- Confirmar aviso LOPDP previo a GPS/foto.
- Revisar Secure Store, manejo offline y reintento seguro de marcaciones.
- Validar target SDK, privacy manifest, Play Store Data Safety y App Store Privacy Labels cuando aplique.

Gates:
- `npm.cmd run check:mobile`
- `npx.cmd expo-doctor`
- Reporte de fase y `AuditLock.json` firmado.
