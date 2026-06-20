# Runbook CES26 - SMTP y evidencia LOPDP

## Variables obligatorias fuera del repositorio

- `SMTP_ENABLED=true` cuando exista proveedor real.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_AUTH_REQUIRED`.
- `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`.
- `COMMUNICATION_EVENT_HASH_SECRET`: secreto independiente para HMAC de destinatarios y message-id.
- `COMMUNICATION_RETENTION_DAYS`: retencion operacional de evidencia. Valor inicial sugerido: `365`.

## Prueba operativa

1. Configurar variables SMTP en entorno seguro.
2. Iniciar backend y PWA.
3. Ingresar como `superadmin`, `owner` o `admin_rrhh`.
4. Abrir `Dashboard > Comunicaciones`.
5. Enviar prueba SMTP a un correo controlado.
6. Verificar que el resultado no muestre secretos.
7. Confirmar que `Historial reciente` registre canal, plantilla, estado, fecha y retencion.

## Privacidad

- No copiar codigos de verificacion a tickets, capturas o logs.
- No guardar cuerpos HTML/texto de emails transaccionales.
- No guardar correos ni telefonos completos en `communication_events`.
- Usar el historial solo para soporte, auditoria y evidencia de proceso.
- El ejercicio de derechos LOPDP se atiende por las politicas publicas y debe cruzar `communication_events` solo por hash interno cuando exista base tecnica y legal.

## Rollback

Si se requiere revertir CES26 en staging:

1. Deshabilitar escritura de eventos retirando temporalmente el endpoint/panel o dejando `COMMUNICATION_RETENTION_DAYS=1`.
2. Aplicar rollback SQL controlado:
   `DROP TABLE IF EXISTS communication_events;`
3. Revertir el commit CES26.

No ejecutar rollback en produccion sin exportar evidencia requerida por soporte/legal.
