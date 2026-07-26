# PROMPT FASE DIUX26-04: REVISIÓN ARQUITECTÓNICA, PARIDAD PWA/MOBILE Y CÓDIGO MUERTO

## Contexto y Alcance
Optimización de la arquitectura global del sistema, asegurando la paridad operativa en `app-movil` (Autoservicio, marcaciones GPS, descarga de roles/documentos) y la eliminación de código muerto o estados duplicados (Reglas Haiky #4 y #8).

## Criterios de Aceptación
1. Verificación del árbol de dependencias y scripts de construcción en `package.json` raíz y workspaces.
2. Confirmación de paridad en la app móvil para consulta de roles y comprobantes firmados.
3. Limpieza de archivos obsoletos o temporales en `tmp/` y `docs/`.
4. Ejecución del chequeo de tiendas en la app móvil (`npm run check:mobile`).
