# Contrato ONI26-09 - Seeds y Empresa DEMO

## Alcance

Crear una base DEMO reproducible para parametros, roles, bancos, empleados ficticios y estructura organizativa.

## Reglas

- No usar datos reales de empleados o empresas.
- Todo seed debe ser idempotente por `seedKey`.
- Las credenciales DEMO se generan por secreto de entorno, no se versionan passwords.
- Las tablas legales se cargan como parametros revisables con fuente y fecha, no como comportamiento oculto.
- El rollback solo puede ejecutarse si el entorno es DEMO.

## Fuente SRI

La pagina oficial `https://www.sri.gob.ec/formularios-e-instructivos1` lista la seccion RDEP, con programa para periodo fiscal 2026, ficha tecnica, catalogo, ejemplos y esquema. Esta fuente queda como referencia para parametrizacion, junto con el PDF de tablas de impuesto a la renta recibido por el usuario.
