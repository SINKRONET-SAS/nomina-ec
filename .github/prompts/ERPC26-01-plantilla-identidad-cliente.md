# ERPC26-01 - Plantilla e identidad del cliente

Prerequisito: AuditLock ERPC26-00 firmado.

Objetivo: crear una plantilla documental unica para el rol de pago.

Tareas:
- Resolver nombre canonico y logo del cliente desde la identidad usada por el PDF.
- Insertar el logo como adjunto inline CID cuando exista.
- Incluir el texto `Adjunto se encuentra tu Rol de Pagos de la Compañía "<cliente>".`.
- Incluir el pie `Generado con SKNómina` en HTML y texto plano.
- Escapar HTML y sanear encabezados y nombres de archivo.
- Agregar pruebas de contenido, CID, PDF adjunto y aislamiento de destinatario.

Gate: pruebas focalizadas de comunicacion, sintaxis y UTF-8 sin BOM.
