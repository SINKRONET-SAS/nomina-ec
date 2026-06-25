# ANV1-05 Monetizacion, PayPhone, planes e IVA

Objetivo: evitar promesas comerciales falsas y suscripciones vencidas activas.

Instrucciones:
- Verificar PayPhone actual contra backend/PWA y variables.
- Revisar `C:\proyectos web\sinkroniq-mobile` para patron PayPhone y gestion de planes antes de tocar runtime.
- Si el ambiente esta en mock/sandbox, bloquear cobro real y mostrar estado visible.
- Sincronizar planes/precios con fuente gobernada o contrato estatico validado.
- Mostrar IVA 15% de forma clara.
- Implementar control de vencimientos/dunning si falta.
- Agregar tests y reporte de fase.
- Commit esperado: `phase: ANV1-05 task: monetizacion suscripciones`.
