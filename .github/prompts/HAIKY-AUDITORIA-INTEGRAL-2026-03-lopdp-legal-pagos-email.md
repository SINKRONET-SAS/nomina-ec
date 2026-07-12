# HAIKY-AUDITORIA-INTEGRAL-2026-03 - LOPDP, legal, pagos, email y SBU 482

Objetivo: revisar cumplimiento Ecuador 2026 sin falsos positivos, separando control tecnico, dependencia externa y revision juridica.

Reglas:
- SBU Ecuador 2026 queda en USD 482 por validacion del usuario en pagina del Ministerio del Trabajo; no cambiar sin fuente oficial vigente o aprobacion explicita.
- Facturacion electronica debe quedar fail-closed si faltan firma, ambiente, autorizacion/validacion SRI o facturador externo.
- Proteccion de datos personales requiere finalidad, minimizacion, retencion, exportacion, purga, auditoria y revision juridica final.
- Modo mock/dev no es bug si esta gateado y no activa produccion.

Tareas:
- Revisar parametros legales, roles de pago, reportes oficiales y periodos.
- Revisar consentimiento LOPDP, privacidad, exportacion, purga/anonimizacion, GPS, foto y soporte medico.
- Revisar PayPhone real/sandbox/mock y resultado de pago.
- Revisar SMTP/email, auditoria de comunicaciones y estado productivo.
- Documentar fuentes: Ministerio del Trabajo, servicio Salarios y SRI facturacion electronica.

Cierre:
- `docs2/auditoria-integral-haiky-2026/INFORME_DIAGNOSTICO.md` actualizado.
- Candidatos a eliminacion justificados.
- Sin cambios legales destructivos por automatismo.
