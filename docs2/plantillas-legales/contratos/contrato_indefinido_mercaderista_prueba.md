# Contrato indefinido mercaderista con periodo de prueba

Version documental: 2026.06  
Runtime: `backend/src/templates/legal/contracts/contrato_indefinido_mercaderista_prueba.json`  
Estado: preliminar para revision laboral ecuatoriana.

## Enfoque

La plantilla no crea un contrato temporal de prueba. Define un contrato individual de trabajo a tiempo indefinido con clausula de periodo de prueba parametrizada hasta 90 dias, sujeto a validacion legal vigente antes de produccion.

## Puntos que debe conservar el runtime

- Comparecientes: empleador, RUC, representante y trabajador.
- Naturaleza indefinida de la relacion laboral.
- Clausula de periodo de prueba sin reduccion de derechos.
- Cargo de mercaderista/promotor, rutas, puntos de venta y evidencia operativa.
- Jornada parametrizada y recargos solo con autorizacion y registro verificable.
- Remuneracion no inferior al SBU configurado.
- IESS, decimos, vacaciones, fondos de reserva y beneficios aplicables.
- Dotacion, equipos y herramientas con acta de entrega.
- Derechos irrenunciables.
- Registro SUT/MDT pendiente de gestion externa hasta confirmacion.

## Variables esperadas

- `company.*`: datos del tenant.
- `employee.*`: datos del trabajador, cargo, jornada, zona y remuneracion.
- `contract.*`: plantilla, version, periodo de prueba y estado de registro.
- `legal.*`: parametros legales versionados.
- `system.*`: metadata del producto.
