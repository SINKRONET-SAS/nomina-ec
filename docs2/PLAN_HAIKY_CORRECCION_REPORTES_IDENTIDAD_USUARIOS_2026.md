# Plan Haiky HCF26 — Corrección de reportes, identidad, delegados y cargas masivas

## Propósito

Corregir los hallazgos reportados en SKNOMINA: mejorar legibilidad y presencia de marca en PDFs, aceptar correctamente la cédula válida `0966930315`, habilitar la administración de usuarios delegados con permisos por módulo y trazabilidad DPA, y homogeneizar las plantillas de carga masiva para que el usuario opere con datos visibles como la cédula sin conocer UUID internos.

## Alcance

- Reportes y documentos PDF: logo legible, tipografía accesible, encabezado compartido y pruebas de no regresión.
- Identidad ecuatoriana: normalización de cédula, preservación de ceros iniciales, corrección del falso negativo demostrado con `0966930315` y validación de dígito verificador.
- Usuarios delegados: listado, alta, estado activo/inactivo, límite comercial, roles soportados, permisos por módulo y UI accesible desde configuración.
- DPA/LOPDP: aceptación expresa al crear un usuario delegado, preferencias de consentimiento y auditoría del actor, tenant, versión y fecha.
- Cargas masivas: plantillas de empleados, novedades, asistencia manual y saldos iniciales; selector de archivo, nombre del archivo, identificadores amigables y compatibilidad opcional con `empleadoId`.
- Referencia: revisar `C:\proyectos web\sinkroniq-mobile` para delegados, permisos efectivos, alcance y DPA. Ese repositorio no se modifica.

## Fuera de alcance

- Cambios al repositorio `sinkroniq-mobile`.
- Validación en línea contra Registro Civil, SRI, MDT o IESS.
- Regeneración de documentos históricos.
- Cambios de producto en rutas de monetización distintas a SKNOMINA.

## Fases y gates

| Fase | Entrega | Gate |
|---|---|---|
| HCF26-00 | Gobierno, baseline y cadena AuditLock | Artefactos UTF-8 y lock encadenado |
| HCF26-01 | Diagnóstico comparativo nuevo_nomina / sinkroniq-mobile | Evidencia de rutas, permisos, DPA y plantillas |
| HCF26-02 | PDF de reportes y documentos | Pruebas de docDefinition y build backend |
| HCF26-03 | Cédula e identificación | `0966930315` válido, formato estable y pruebas API/UI |
| HCF26-04 | Usuarios delegados y DPA | UI de alta/listado/estado/permisos, cuota y auditoría |
| HCF26-05 | Plantillas de carga masiva | Selector de archivo y plantillas guiadas |
| HCF26-06 | QA, regresión, cierre, commit y push | Suites verdes, gobierno cerrado y entrega en `main` |

## Reglas de compatibilidad

- No eliminar `empleadoId` de payloads de integración; las plantillas visibles priorizan `cedula` y lo dejan opcional cuando exista.
- No cambiar respuestas públicas existentes sin mantener sus campos actuales.
- Los usuarios `owner` y `superadmin` conservan acceso irrestricto; los demás usan permisos efectivos por rol y override.
- Un usuario delegado no se crea sin consentimiento de tratamiento de datos y la acción queda auditada.
- La corrección de cédula evita el falso negativo local por el tercer dígito y no se presenta como certificación oficial externa.

## Criterios de aceptación

1. El logo aparece con tamaño útil y los textos principales de los PDFs se leen sin ampliar desproporcionadamente.
2. `0966930315` pasa el validador y se guarda normalizada como texto de diez dígitos.
3. Un owner puede crear usuarios dentro de la cuota, activar/desactivar y editar módulos desde la interfaz.
4. La creación exige aceptación DPA/LOPDP y genera preferencia y auditoría trazable.
5. Las cargas masivas ofrecen descarga, selector de archivo, archivo seleccionado y validación; no exigen conocer un UUID.
6. Backend, frontend, Prisma y pruebas pasan; no se altera `sinkroniq-mobile`.

