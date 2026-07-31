# Plan Haiky NAR26-P3 — Roles parciales, impacto de cierre y activación de delegados

Fecha: 2026-07-31  
Superficie única: `Nómina > Descuento Anticipos` y el acceso público `/verificar-email`.

## Hallazgos confirmados

1. El rol individual permite seleccionar empleados, pero no conserva una resolución por línea. La carga masiva exige una plantilla rígida y no permite declarar si cada línea se descuenta al cierre o se paga como bonificación.
2. El rol queda con una sola acción visible (`Aprobar`) y, después, la aplicación de cada línea no está explicada ni guiada; esto produce una trampa operativa aunque el backend ya tiene las dos salidas.
3. `descontar` debe crear un anticipo/beneficio que el cálculo del rol mensual descuente; `bonificar` debe crear una novedad aprobada que el rol de cierre incluya como ingreso. Ambas salidas deben quedar trazables al rol parcial y ser idempotentes.
4. La pantalla de novedades falla por usar `lines` sin declararlo al analizar el CSV.
5. El backend genera y valida códigos de correo, pero no existe una superficie pública donde un delegado pueda registrar el código y solicitar el último código si expiró.
6. La fecha de corte se muestra como `Invalid Date` cuando llega serializada como fecha ISO.

## Objetivo

Que el usuario final pueda seleccionar empleados, definir por línea `Anticipo: descontar al cierre` o `Bonificación: pagar en el rol de cierre`, cargar esas decisiones por CSV, aprobar y aplicar la selección con acciones visibles. El rol mensual de cierre debe recibir el efecto por las rutas existentes, sin caminos paralelos ni sobrescritura silenciosa.

## Fases y puertas

### NAR26-P3-00 — Gobierno y baseline

- Registrar causa, superficie única, contratos existentes y regresiones observadas.
- Actualizar `CODEX_CONTEXT.md`, `AuditLock.json` y prompts antes de modificar producto.

### NAR26-P3-01 — Modelo operativo del rol parcial

- Aceptar una resolución opcional por línea (`descontar`/`bonificar`) para conservar compatibilidad con CSV anterior.
- Incluirla en metadata y en las respuestas/reports; no agregar una columna obligatoria que rompa integraciones existentes.
- Exponer una acción segura para aplicar las resoluciones declaradas, con idempotencia y trazabilidad.
- Mantener: anticipo → `beneficios_empleados` → descuento del rol mensual; bonificación → `novedades_asistencia` aprobada → ingreso del rol mensual.

### NAR26-P3-02 — Carga masiva y experiencia de usuario

- Entregar plantilla con `resolucion` y aceptar también la plantilla histórica de cuatro columnas.
- Mostrar resolución por empleado en la selección individual, validar que solo se incluyan empleados marcados y dar mensajes accionables.
- Corregir la fecha de corte, acciones posteriores a aprobar, estados y explicación del impacto en `Cerrar Mes`.

### NAR26-P3-03 — Activación de delegados

- Crear `/verificar-email` como pantalla pública para email, RUC opcional y código.
- Permitir confirmar y reenviar; cada reenvío debe invalidar el anterior y el código expirado debe rechazarse explícitamente.
- Enlazar desde Login cuando la cuenta aún no está verificada.

### NAR26-P3-04 — Regresión y contratos

- Corregir `lines is not defined` en Novedades.
- Validar sintaxis, contratos, backend, frontend y rutas públicas.
- Revisar al final los cambios locales previos de `fiscalInvoiceService.js` y su prueba; corregir regresiones, validarlos y publicarlos en un commit separado.

### NAR26-P3-05 — Cierre y publicación

- Ejecutar validación completa y `git diff --check`.
- Cerrar `CODEX_CONTEXT.md` y `AuditLock.json` con fases, archivos y evidencia.
- Commit principal de NAR26-P3; commit separado de fiscal si corresponde; push de ambos.

## Criterios de aceptación

- Una carga individual o masiva solo crea líneas para los empleados seleccionados o listados; no crea líneas ocultas para toda la empresa.
- Cada línea puede quedar explícitamente como anticipo o bonificación, y la pantalla explica el siguiente paso.
- La aplicación repetida no duplica beneficios ni novedades.
- Un rol aprobado puede aplicar la selección y luego cerrarse solo cuando no quedan líneas pendientes.
- El cierre mensual incorpora ambos efectos por los servicios existentes y conserva metadata de origen.
- CSV histórico y CSV nuevo son compatibles; el reporte muestra la resolución solicitada y la resolución ejecutada.
- Un delegado puede activar su cuenta desde una pantalla pública y nunca se acepta un código caducado o reemplazado.
- Novedades no vuelve a fallar en la carga de la pantalla.
- No quedan regresiones en facturación ni cambios fiscales locales sin revisar.

