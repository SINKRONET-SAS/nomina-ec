# NAR26-07 — Dependencia nativa reproducible

Corregir el hueco de instalación de `libxmljs2` que impedía iniciar la suite RDEP cuando el binding nativo no estaba disponible.

Acciones:

- Alinear CI con Node 22.19.0, compatible con la dependencia y con Render.
- Agregar un pretest backend que verifique `libxmljs2`, reconstruya el binding con `npm rebuild libxmljs2 --foreground-scripts` si falta y emita diagnóstico accionable si falla el toolchain.
- Ejecutar `npm.cmd --workspace=backend test -- --runInBand`, contratos, Prisma y `git diff --check`.
- Cerrar AuditLock con la firma encadenada a NAR26-06.

Aceptación: la suite RDEP inicia en una instalación con binding disponible, una instalación incompleta no queda silenciosamente aceptada y CI usa una versión de Node compatible.
