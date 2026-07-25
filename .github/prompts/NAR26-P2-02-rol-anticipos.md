# NAR26-P2-02 - Rol de anticipos operable

Estandariza Anticipos y prestamos en la ruta existente. Los tipos de novedad deben provenir de la parametrizacion activa y no de texto libre. Agrega plantilla CSV, selector de archivo, resolucion por cedula, filtros por periodo/estado/tipo/busqueda y descarga del reporte filtrado. Mantiene el nombre de bonificacion indicado por el usuario y la decision unica descontar/bonificar, con idempotencia y auditoria.

Gate: endpoints protegidos, tests de filtros/carga/tipos, pantalla con carga/error/vacio y sin ruta paralela.
