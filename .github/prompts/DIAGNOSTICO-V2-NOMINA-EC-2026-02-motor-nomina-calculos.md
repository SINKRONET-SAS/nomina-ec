# DVN26-02 - Motor unico de nomina y calculos

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P0.

## Objetivo

Resolver E-02, E-07, E-08, D-04, T-01 y T-04: fondo de reserva, dias proporcionales, bonos, nominas cerradas protegidas, motor unico backend y errores por empleado.

## Reglas

- No duplicar calculo oficial en frontend.
- No recalcular nominas `cerrada` o `pagada`.
- Cada error por empleado debe mostrarse en UI y registrarse con `correlationId`.

## Entregables

- Servicio backend unico de calculo con desglose.
- Frontend consume resultado y muestra errores parciales.
- Tests para ingreso/salida parcial, bono, fondo reserva y estado cerrado.
- Reporte `REPORTE_DVN26_02_MOTOR_NOMINA.md`.

## Gate

Tests backend, build frontend, diff sin fallos y sin constantes nuevas de calculo en frontend/mobile.
