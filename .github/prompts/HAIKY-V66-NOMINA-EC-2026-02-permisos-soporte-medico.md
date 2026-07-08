# HAIKY V66 02 - Permisos con soporte medico

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: cerrar V66-02 con adjuntos reales y minimizacion de datos.

Tareas:

- Reemplazar placeholder movil por selector nativo de imagen.
- Validar JPG/PNG/PDF en backend, maximo 3 MB.
- Subir soporte a almacenamiento documental y guardar metadata, no base64.
- Mostrar soporte adjunto en PWA de aprobacion sin preview inline.
- Agregar prueba de controlador movil.

Gate: test `mobileController.test.js` y build PWA.
