# CBN26-02 - Boton PDF en Nomina

Actua bajo `RULES.md`.

Objetivo: corregir `Nomina.jsx` para que el boton PDF use el cliente API/auth real, muestre estados visibles y no falle silenciosamente.

Tareas:
- Reemplazar fetch directo inseguro por helper API existente o servicio compartido.
- Agregar estados de carga, exito y error.
- Asegurar descarga o apertura del PDF con nombre y tipo correctos.
- Mantener compatibilidad de API publica o documentar cambio.
- Crear `docs/REPORTE_CBN26_02_NOMINA_PDF_UI.md`.

Validaciones:
- Build frontend.
- Prueba de boton PDF con token valido y con error simulado.
- `git diff --check`.

No hacer:
- No cambiar `Beneficios.jsx` ni descuentos de nomina en esta fase.
