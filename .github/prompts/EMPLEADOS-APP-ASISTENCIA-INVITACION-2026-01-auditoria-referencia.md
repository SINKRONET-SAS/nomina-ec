# EAA26-01 - Auditoria comparativa referencia vs Nomina-Ec

Objetivo: comparar el flujo de referidos/invitaciones de `sinkroniq-mobile` con el stack real de Nomina-Ec antes de tocar runtime.

Verificar:

- Modelos existentes de empleado, usuario, tenant, unidad organizativa, zona, jornada y marcacion.
- Rutas mobile actuales para auth y asistencia.
- Pantallas web de empleados/parametrizacion/asistencia.
- Restricciones de planes que afecten empleados o app movil.
- Riesgos de duplicidad con OWNER/RRHH.

Salida:

- Reporte `REPORTE_EAA26_01_AUDITORIA_REFERENCIA.md`.
- Mapa de equivalencias: referencia -> Nomina-Ec.
- Lista de cambios runtime propuestos para EAA26-02..08.

No implementar cambios runtime en esta fase salvo aprobacion explicita adicional.

