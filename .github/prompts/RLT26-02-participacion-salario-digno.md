# RLT26-02 — fórmulas y datos controlados

## Objetivo

Implementar fórmulas trazables para participación laboral, salario digno y beneficios laborales acumulados, sin inventar parámetros legales.

## Requisitos

- Utilidades: exigir `utilidadLiquida`, distribuir 15% con 10% por días trabajados y 5% por factor de días multiplicado por cargas familiares.
- Salario digno: exigir `salarioDignoMensual`; calcular objetivo anual prorrateado por días, percepción reportada, brecha y compensación disponible; si el fondo no alcanza, registrar factor de prorrateo.
- Décimos y beneficios: sumar provisiones y mensualizaciones registradas, modalidad, fondo de reserva y vacaciones.
- Validar parámetros numéricos no negativos y responder errores con código/status/correlation ID.
- Dejar los parámetros y advertencias en la hoja de auditoría.
- No confundir la provisión mensual con el valor pagado en el rol; los reportes y asientos deben conservar ambas columnas y su momento contable.

## Validación

Casos con utilidad cero, utilidad positiva, cargas familiares, umbral faltante, umbral válido y fondo de compensación insuficiente.
