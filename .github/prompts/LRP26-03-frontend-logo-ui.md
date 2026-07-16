# LRP26-03 - Frontend: UI de carga de logo en Datos de empresa

## Objetivo
Agregar la interfaz de carga de logo en la seccion Datos de empresa de Parametrizacion.

## Tareas
1. Agregar `uploadTenantLogo()` y `removeTenantLogo()` en `configurationApi.js`.
2. Crear componente `LogoUploadSection` dentro de `Parametrizacion.jsx`:
   - Input file acepta PNG/JPEG.
   - Preview del logo actual.
   - Boton cambiar/subir y boton eliminar.
   - Lee `summary.tenantLogo` del config summary.
3. Mostrar `LogoUploadSection` cuando `activeDefinition.key === 'empresa'`.
4. Agregar `tenantLogo` al response de `getConfigurationSummary()` en `configurationService.js`.

## Gates
- PWA build PASS.
- El componente muestra logo actual y permite cambiar/eliminar.

## Reglas
- No crear componente separado si se puede incluir inline en Parametrizacion.jsx.
