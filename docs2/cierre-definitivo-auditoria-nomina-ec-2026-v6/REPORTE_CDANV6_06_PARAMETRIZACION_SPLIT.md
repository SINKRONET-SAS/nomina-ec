# REPORTE CDANV6-06 - SPLIT PARAMETRIZACION

## Resultado

Estado: `completed_local`

`Parametrizacion.jsx` fue dividido sin cambio funcional en componentes/helpers locales bajo `frontend-web/src/pages/Configuracion/parametrizacion/`.

## Nuevos modulos

- `Field.jsx`
- `IncomeTaxTableFields.jsx`
- `LegalParametersPreview.jsx`
- `legalParameterDisplay.js`

## Verificacion

- No quedan funciones duplicadas extraidas en `Parametrizacion.jsx`.
- `npm.cmd --workspace=frontend-web run build`: PASS, 1513 modulos transformados.
- `npm.cmd run contracts`: PASS.
