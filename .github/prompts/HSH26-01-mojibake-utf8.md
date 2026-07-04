# HSH26-01 Mojibake UTF-8

Objetivo: eliminar mojibake y confirmar UTF-8 valido en archivos gobernados.

Tareas:
- Buscar mojibake y caracteres de reemplazo en `.js`, `.jsx`, `.json`, `.md`, `.mjs`, `.ts` y `.tsx`.
- Corregir solamente textos afectados por el plan.
- Validar que los archivos modificados no tengan BOM.

Gate:
- Escaneo de mojibake sin coincidencias.
