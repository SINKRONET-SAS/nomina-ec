# Contrato ONI26-06 - OWNER Bancos y Accesos

## Alcance

El OWNER configura bancos, archivos planos, tipos de usuarios, roles y accesos por tenant usando los perfiles bancarios existentes. No se crea un modulo paralelo de bancos.

## Reglas

- Los perfiles tecnicos viven en `backend/src/config/bank-file-profiles.json`.
- La matriz de accesos vive en `backend/src/config/owner-access-bank-matrix.json`.
- Todo archivo bancario productivo exige ficha tecnica vigente del banco, cierre de nomina, permiso de generacion y permiso de descarga.
- Los archivos DEMO deben usar datos ficticios.
- Las descargas registran `correlationId`, banco, periodo, lote, conteo y total.

## Roles OWNER

- `OWNER_ADMIN`
- `NOMINA_OPERADOR`
- `NOMINA_APROBADOR`
- `LECTOR_AUDITOR`

## Rollback

Un archivo bancario debe poder anularse logicamente sin borrar auditoria. La regeneracion debe crear una nueva version con referencia al archivo anterior.
