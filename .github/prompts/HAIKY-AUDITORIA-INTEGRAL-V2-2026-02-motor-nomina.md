# HAIKY AIV2-02 - Motor de nomina

Objetivo:
- Mejorar el motor de calculo sin cambiar formulas legales confirmadas.
- Agregar invariantes o pruebas cuando ayuden a evitar descuadres.
- Conservar parametros legales 2026 mientras no exista nueva fuente oficial.

Acciones V2:
- Verificar `backend/src/services/calculoNominaService.js`.
- Asegurar integridad: `neto = ingresos - deducciones` despues de redondeos.
- Ejecutar pruebas focalizadas de calculo.

Gates:
- `npm.cmd --workspace=backend test -- calculoNominaService.test.js --runInBand`
- `npm run prisma:validate`
