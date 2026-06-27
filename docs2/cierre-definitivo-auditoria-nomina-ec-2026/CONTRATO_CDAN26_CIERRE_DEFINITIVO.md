# Contrato CDAN26 - Cierre Definitivo

## Principios

- El cierre es sobre codigo real de `nuevo_nomina`, no sobre scripts externos aplicados a ciegas.
- Cada fase debe respetar `RULES.md`, especialmente UTF-8 sin BOM, cero fallos silenciosos, cero regresiones tecnicas, frontend obligatorio y AuditLock firmado.
- Los hallazgos confirmados se corrigen; los falsos positivos se protegen con evidencia o prueba, no con parches innecesarios.

## Contratos funcionales

1. Seguridad Render: ningun artefacto publico de runtime o infraestructura debe exponer `plan_haiky` o `haiky_migration` como nombre operativo nuevo. Si existen recursos productivos previos, la fase debe documentar migracion y rollback sin destruir datos.
2. SBU Ecuador 2026: ninguna nomina ordinaria debe calcularse con salario base inferior al SBU vigente aplicable sin excepcion legal auditable y visible.
3. Fondo de Reserva: cada empleado aplicable debe tener modalidad explicita `MENSUAL` o `IESS`, consumida por el motor y visible para RRHH.
4. Formulario 107: el sistema debe poder generar evidencia individual anual PDF por empleado con version de ficha tecnica y bloqueo por datos faltantes.
5. Calculo mensual: el cambio de estado del periodo y los roles generados deben vivir en la misma transaccion o fallar juntos.
6. Pagos: no se muestra un cobro productivo como funcional si Stripe o el proveedor elegido no esta configurado y verificado.
7. Comunicaciones: la publicacion de rol debe disparar notificacion auditable o registrar una causa visible de no envio.
8. Superadmin: los parametros legales anuales deben poder gobernarse desde UI protegida, con trazabilidad de fuente y vigencia.

## Contratos tecnicos

- Toda API nueva debe mantener compatibilidad con clientes existentes o incluir plan de compatibilidad.
- Todo endpoint debe validar tenant, rol, permisos y correlationId.
- Todo error de infraestructura debe tener `code`, `statusCode`, `correlationId` y `userId` cuando exista.
- Toda migracion debe ser reversible o tener procedimiento de reversa documentado.
- Toda pantalla nueva debe compilar, estar enlazada en navegacion existente y mostrar estados de carga, vacio, error y bloqueo.

## Evidencia obligatoria por fase

- Archivos modificados.
- Checks ejecutados y resultado.
- Riesgos residuales.
- Captura o descripcion verificable de UI cuando aplique.
- Firma en `.vscode/AuditLock.json`.
