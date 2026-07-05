# AISK26-03: Timezone Ecuador Homologacion

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 03
**Prerequisito:** AISK26-02 firmado
**Hallazgos:** HAL-60..62, HAL-23

## Objetivo

Reemplazar new Date() en logica de negocio con funciones timezone-aware para America/Guayaquil (UTC-5). Extraer utilidades duplicadas a modulos compartidos.

## Tareas

### Backend
1. Crear backend/src/utils/dateEcuador.js:
   - yearInEcuador(): ano fiscal correcto entre 7pm-midnight Ecuador
   - monthInEcuador(): mes correcto para cron y periodo
   - todayInEcuador(): fecha ISO en zona Ecuador
   - Patron: Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' })
2. configurationService.js:212,278: reemplazar new Date().getFullYear() con yearInEcuador()
3. configurationController.js:97: reemplazar con yearInEcuador()
4. cron-jobs.js:137: reemplazar new Date().getMonth()+1 con monthInEcuador()

### App movil
5. Crear app-movil/src/utils/dateEC.js extrayendo:
   - datePart() de GastosMovilizacionScreen.js
   - currentPeriodEC() de AutoservicioScreen.js
   - todayEC() de PermisosScreen.js
6. Refactorizar 3 screens para importar desde dateEC.js

## Gate

- Zero new Date().getFullYear() o getMonth() en logica de negocio
- Utilidades compartidas con tests unitarios
- Screens refactorizados sin regresion

## Commit

phase: AISK26-03 task: timezone-ecuador
