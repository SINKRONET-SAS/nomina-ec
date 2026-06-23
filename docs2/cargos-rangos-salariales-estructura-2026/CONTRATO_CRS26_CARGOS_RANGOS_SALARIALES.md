# Contrato CRS26 - Flujo de cargos y rangos salariales

## Dominio

Un cargo o puesto representa una posicion laboral definida por la empresa dentro de una unidad organizativa. No reemplaza el contrato de trabajo ni determina por si mismo obligaciones legales; funciona como politica interna para ordenar estructura, validar rangos salariales, asignar empleados y generar reportes.

## Entidad cargo propuesta

Campos minimos:

- `id`: UUID.
- `tenant_id`: empresa propietaria.
- `organization_unit_id`: unidad organizativa vigente.
- `code`: codigo unico por tenant.
- `name`: nombre visible del cargo.
- `description`: funciones o alcance operativo.
- `salary_min`: sueldo minimo permitido.
- `salary_max`: sueldo maximo permitido.
- `currency`: por defecto `USD`.
- `effective_from`: inicio de vigencia.
- `effective_to`: fin de vigencia opcional.
- `status`: `activo`, `inactivo`, `archivado`.
- `metadata`: reglas complementarias sin datos sensibles.
- `created_by`, `created_at`, `updated_at`.

## Reglas de negocio

- `salary_min` y `salary_max` deben ser mayores o iguales a cero.
- `salary_min` no puede superar `salary_max`.
- La unidad organizativa debe pertenecer al mismo tenant y estar activa.
- Un cargo inactivo no puede asignarse a empleados nuevos.
- Un cargo con empleados activos no puede eliminarse; se inactiva.
- Un cargo usado en nomina cerrada, documentos o historicos no puede eliminarse.
- El empleado debe guardar relacion al cargo y mantener etiqueta historica para compatibilidad.
- Cambiar unidad organizativa de un cargo con empleados activos requiere validacion de impacto o version nueva.

## Compatibilidad

El sistema actual usa `empleados.cargo` como texto. CRS26 debe migrar de forma gradual:

1. Crear tabla de cargos.
2. Agregar `position_id` o `cargo_id` en empleados.
3. Poblar cargos desde valores actuales cuando sea seguro.
4. Resolver empleados existentes por tenant y nombre/codigo.
5. Mantener `empleados.cargo` como snapshot visible para documentos historicos hasta que todos los consumidores usen la relacion.

## APIs esperadas

- `GET /api/configuracion/jobPositions`
- `POST /api/configuracion/jobPositions`
- `PUT /api/configuracion/jobPositions/:id`
- `DELETE /api/configuracion/jobPositions/:id`
- Validacion en `POST /api/empleados`, `PUT /api/empleados/:id` e importacion masiva.

## UI esperada

- Parametrizacion: nueva categoria "Cargos y puestos".
- Formulario de cargo con unidad organizativa, codigo, nombre, rango salarial, vigencia y estado.
- Listado con filtros por unidad, estado y vigencia.
- Acciones editar, inactivar y eliminar si no hay consumos.
- Nuevo/editar empleado: selector de cargo filtrado por unidad organizativa.
- Mensaje claro si sueldo esta fuera del rango.

## Reporteria esperada

- Lista de empleados incluye cargo y unidad.
- Reportes de nomina permiten filtrar por cargo real.
- Consolidado por estructura puede agrupar por unidad y cargo.
- Exportaciones mantienen etiqueta historica para nominas anteriores a CRS26.
