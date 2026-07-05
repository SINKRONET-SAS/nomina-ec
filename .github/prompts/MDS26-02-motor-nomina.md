# MDS26-02 - Motor de nomina

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: el motor de nomina debe respetar la modalidad de cada empleado para decimo tercero y cuarto.

Tareas:

- En `calculoNominaService.js`, leer `emp.modalidad_decimo_tercero` y `emp.modalidad_decimo_cuarto`.
- Si modalidad es `mensual`: agregar la provision como ingreso al empleado en el rol (similar a fondo de reserva mensual).
- Si modalidad es `acumulado`: mantener comportamiento actual (solo provision contable).
- Registrar en `detalleCalculo`: `decimoTerceroModalidad`, `decimoTerceroMensualizado`, `decimoCuartoModalidad`, `decimoCuartoMensualizado`.
- El ingreso mensualizado NO afecta IESS (ya que la provision tampoco lo hace).
- El ingreso mensualizado SI suma al total de ingresos y neto a recibir.

Cierre:

- Motor calcula correctamente ambas modalidades.
- Detalle de calculo incluye modalidad y montos.
- No se rompe calculo existente (default acumulado = mismo resultado).
