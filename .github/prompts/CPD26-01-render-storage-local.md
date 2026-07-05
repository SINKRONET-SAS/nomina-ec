# CPD26-01 - Render storage local controlado

Objetivo: configurar produccion inicial con `sknomina-api` como unico generador/descargador documental, usando Render Persistent Disk.

Tareas:

- Cambiar `render.yaml` a `STORAGE_DRIVER=local`.
- Agregar disco persistente en `sknomina-api` con `mountPath: /var/data` y `sizeGB: 5`.
- Definir `LOCAL_STORAGE_DIR=/var/data/sknomina-documents`.
- Definir `LOCAL_STORAGE_PUBLIC_BASE_URL=https://api.sknomina.com`.
- Actualizar `backend/.env.example` con la ruta local y dejar AWS/R2 como opcion futura.

Validacion minima: `node --check scripts/verify-system-contracts.mjs`.
