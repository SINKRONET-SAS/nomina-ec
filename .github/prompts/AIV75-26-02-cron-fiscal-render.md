# AIV75-26-02 — Cron fiscal aislado en Render

Requiere aprobación explícita y `AIV75-26-01` firmado.

Crea un ejecutor Node de una sola corrida que invoque exclusivamente `retryPendingInvoices`, cierre recursos y termine con exit code verificable. Declara en `render.yaml` un servicio `type: cron` de propósito fiscal, con horario UTC documentado y variables seguras.

No invoques `backend/src/config/cron-jobs.js`, no reactives cálculo automático de nómina, no montes el disco documental y no copies secretos. Agrega un contrato anti-regresión que demuestre que el cron fiscal solo ejecuta facturación.

Valida Blueprint, script, pruebas y rollback. No declares operación productiva hasta observar una corrida en Render.
