# AISK26-07: SQLite Offline Expansion

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 07
**Prerequisito:** AISK26-06 firmado
**Hallazgos:** HAL-100, HAL-101

## Objetivo

Extender persistencia SQLite para cache de rutas, perfil offline, y cola de reintento para envios fallidos.

## Tareas

### Cola de reintento offline (HAL-101)
1. Crear app-movil/src/db/offline-queue.js:
   - Tabla: offline_queue (id, tipo, payload_json, intentos, estado, created_at, last_attempt)
   - insertPending(tipo, payload): encolar operacion
   - processQueue(): intentar enviar pendientes al recuperar red
   - markCompleted/markFailed: actualizar estado
2. GastosMovilizacionScreen: envolver sendMobilizationReport en cola offline
3. Al recuperar conectividad (NetInfo), procesar cola automaticamente

### Cache de rutas (HAL-100 parcial)
4. Crear app-movil/src/db/route-cache.js:
   - Tabla: ruta_hoy_cache (fecha, ruta_json, synced_at)
   - Al cargar ruta del dia, persistir en SQLite
   - Si no hay red, mostrar ruta cacheada con badge "Datos offline"
5. RutaHoyScreen: intentar API primero, fallback a cache

### Cache de perfil
6. Persistir datos basicos del empleado (nombre, cargo, empresa) en SQLite
7. Mostrar perfil desde cache si API no responde

### Indicador de estado
8. App.js: agregar badge online/offline en header usando NetInfo
9. Colores: verde=online, naranja=offline con datos locales

## Consideraciones

- expo-sqlite ya esta instalado y configurado (WAL mode)
- CREATE TABLE IF NOT EXISTS para compatibilidad con installs existentes
- No cachear datos sensibles (password, tokens) en SQLite
- Limpiar cache de rutas > 7 dias

## Gate

- Envio de movilizacion funciona offline (encolado, enviado al reconectar)
- Ruta del dia visible sin red
- Badge online/offline visible
- Tests unitarios de offline-queue

## Commit

phase: AISK26-07 task: sqlite-offline
