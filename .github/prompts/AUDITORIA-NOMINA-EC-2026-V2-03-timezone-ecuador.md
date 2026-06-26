# ANV2-03 Timezone Ecuador

Objetivo: cerrar TZ-C01.

Instrucciones:
- Crear o reutilizar helper unico para periodo operativo con `America/Guayaquil`.
- Reemplazar defaults con `new Date()` directo en `CerrarMes.jsx`, `DescargarReportes.jsx` y consumidores relacionados.
- Alinear web, backend y app movil con el mismo contrato de periodo.
- Agregar pruebas de borde: ultimo dia del mes, 22h Ecuador y UTC dia siguiente.
- Evitar cambios de historico y documentar compatibilidad.
- Commit esperado: `phase: ANV2-03 task: timezone ecuador`.
