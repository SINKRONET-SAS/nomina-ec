# AISK26-05: Gastos Movilizacion Mejorados

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 05
**Prerequisito:** AISK26-04 firmado
**Hallazgos:** HAL-110..113 (ALTO/MEDIO)

## Objetivo

Implementar cierre mensual tipo factura, sugerencia entre paradas, integracion anticipo-nomina y vinculacion con ruta.

## Tareas

### Cierre mensual (HAL-111 ALTO)
1. SQLite: tabla movilizacion_periodo_cierre (periodo, estado: abierto|enviado|bloqueado, fecha_envio)
2. UI "Cerrar mes": resumen por dia (detalle tipo factura), boton enviar, bloqueo post-envio
3. Periodo enviado se muestra como solo lectura con badge "Enviado"
4. El empleado no puede agregar gastos a un periodo cerrado

### Sugerencia entre paradas (HAL-110)
5. buildRouteSuggestion(): sugerir origen=parada N destino=parada N+1 segun progreso de ruta del dia
6. Si el empleado completa parada 1 y va a parada 2, el campo "desde" se llena con parada 1 y "hasta" con parada 2

### Vinculacion ruta-gasto (HAL-113)
7. En RutaHoyScreen, al marcar salida de un punto, mostrar alerta suave: "Registra el gasto de movilizacion antes de continuar"
8. No bloquear, solo sugerir (puede ser descartado)

### Anticipo a nomina (HAL-112)
9. Backend: al aprobar movilizacion con anticipo_usd, crear novedad tipo 'anticipo_movilizacion' vinculada al periodo
10. calculoNominaService: consumir novedad anticipo_movilizacion como ingreso no gravable

## Gate

- Cierre mensual funcional: bloquea edicion post-envio
- Sugerencia origen/destino entre paradas
- Anticipo aprobado aparece en calculo de nomina
- Tests backend para novedad anticipo_movilizacion

## Commit

phase: AISK26-05 task: movilizacion-mejorada
