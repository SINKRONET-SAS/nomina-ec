# HAIKY-AUDITORIA-INTEGRAL-2026-04 - Reportes, UI/UX, humanizacion y UTF-8

Objetivo: mejorar lectura, chunking, ortografia y ergonomia sin romper contratos ni prometer cumplimiento no validado.

Reglas:
- UTF-8 sin BOM en `.js`, `.jsx`, `.mjs`, `.json`, `.md`, `.prisma` y `.sql`.
- Textos visibles en espanol normal, sin jerga interna para usuario final.
- No usar textos largos cuando basta una accion clara.
- No presentar plantillas, reportes o calculos como asesoria legal/tributaria.

Tareas:
- Revisar landing, PWA, app movil, reportes, tablero, pagos, facturacion, privacidad y comunicaciones.
- Reducir textos confusos con avisos compactos y estados accionables.
- Revisar ortografia visible y mojibake.
- Confirmar reportes RDEP, Formulario 107, SAE, bancos, roles y rutas como flujos con bloqueo cuando falte validacion externa.

Cierre:
- `npm.cmd --workspace=frontend-web run build`.
- Gate UTF-8 de `npm.cmd run haiky:solution` en verde.
- Informe actualizado con riesgos residuales y controles.
