# E2E26-01 - Estado operacional del tenant

Actua bajo `RULES.md`.

Objetivo: impedir operacion sensible si el tenant no completo email verificado, consentimiento vigente y checklist minimo.

Tareas:

- Validar AuditLock E2E26-00.
- Revisar registro publico, email verification, onboarding, configuracion y gates de nomina.
- Disenar/implementar estado operacional del tenant sin duplicar estados.
- Bloquear calculo/cierre si faltan parametros legales, jornada, unidad, zona, periodo o empleados operativos.
- Mostrar bloqueo y siguiente accion en PWA.
- Agregar tests de backend y smoke frontend aplicables.

Cierre:

- Tenant sin requisitos minimos no puede calcular ni cerrar nomina.
- PWA explica que falta configurar.
- AuditLock firmado para E2E26-01.
- Commit esperado: `phase: E2E26-01 task: estado operacional tenant`.
