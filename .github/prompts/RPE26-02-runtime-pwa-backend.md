# RPE26-02 - Runtime PWA y backend

Objetivo: aplicar la decision de producto en las superficies reales.

Reglas:
- No eliminar endpoints publicos existentes sin compatibilidad.
- Mensajes visibles en espanol tecnico y accionables.
- Errores backend con codigo y estado explicitos.

Tareas:
- Cambiar la PWA para mostrar RDEP/Formulario 107 como reportes SRI e IESS como batch TXT/DAT.
- No exponer XML IESS productivo.
- Mantener compatibilidad de endpoint legado apuntando al generador batch.
- Cambiar landing para no prometer `XML SAE IESS`.

Cierre:
- `node --check backend/src/services/iessSaeGenerator.js`.
- Contrato frontend/backend sin rutas rotas.
