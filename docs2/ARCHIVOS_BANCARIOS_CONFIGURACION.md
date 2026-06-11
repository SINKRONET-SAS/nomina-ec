# Configuracion de archivos planos bancarios

Fecha: 2026-06-11

## Perfiles iniciales

Los perfiles se definen en `backend/src/config/bank-file-profiles.json`.

Bancos configurados:

- PICHINCHA
- GUAYAQUIL
- PRODUBANCO

## Reglas obligatorias

- No usar cuentas placeholder en produccion.
- Descifrar cuentas bancarias solo durante la generacion del archivo.
- No imprimir cuentas completas en logs, Excel de revision ni respuestas API.
- Validar total de pagos y numero de registros antes de subir a storage.
- Mantener `BANK_ACCOUNT_ENCRYPTION_KEY` como secreto fuera de Git.

## Campos configurables

- Codigo de banco.
- Delimitador.
- Encoding.
- Fin de linea.
- Formato de fecha.
- Separador decimal.
- Longitud de cuenta.
- Header y trailer.
- Orden de campos.

## Pendiente por banco

Cada banco debe entregar especificacion oficial de carga masiva. El perfil actual es una base operacional y debe validarse con archivo de prueba anonimizado antes de pagos reales.
