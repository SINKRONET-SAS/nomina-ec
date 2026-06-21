# AIV50-01 - Backend nomina y N+1

Objetivo: cerrar `BKD-C01` sin cambiar contrato publico. Verificar `calculoNominaService.js`, precargar parametros legales una vez por tenant/anio, pasar el objeto al calculo por empleado y agregar prueba que falle si se recarga N veces. Cerrar con tests backend y AuditLock.