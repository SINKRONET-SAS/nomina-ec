# ONI26-02 - Sitio publico y conversion

## Resultado

Se actualizo la landing publica existente sin crear una segunda pantalla. Se reforzaron los enlaces a crear cuenta, soporte/demo, privacidad, terminos y planes.

## Cambios

- Correccion de mojibake visible en `Landing.jsx`.
- CTA principal a `/registro`.
- CTA secundario a `/soporte` como solicitud de demo.
- Navegacion publica a planes, soporte y privacidad.
- Footer con soporte, terminos y privacidad.

## Validaciones

- `npm.cmd run build` en `frontend-web`: PASS.
- Busqueda de mojibake en `Landing.jsx`: sin coincidencias.

## Riesgos residuales

- El dominio publico real y URLs productivas deben validarse en release.
- La medicion comercial debe seguir bloqueada hasta consentimiento.
