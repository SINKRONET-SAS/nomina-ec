# NER26-02 - Frontend de correccion individual de novedades

Objetivo: exponer en la PWA una accion clara para corregir una novedad de un empleado sin presentar la operacion como lote global.

Instrucciones:
1. Leer `RULES.md`, AuditLock y plan NER26.
2. Revisar pantallas de novedades y cierre de mes, especialmente `frontend-web/src/pages/Nomina/CerrarMes.jsx` y componentes de novedades.
3. Agregar UI con alcance visible: empleado, periodo y novedad.
4. Mostrar confirmacion antes de invalidar calculo individual.
5. Mostrar errores backend con mensaje en espanol y `correlationId`.
6. No esconder acciones necesarias solo en backend.
7. Actualizar AuditLock al cierre de fase.

Gates minimos:
- Build/check frontend disponible.
- `git diff --check`.
- UTF-8 sin BOM.
