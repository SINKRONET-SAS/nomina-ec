# HDG26-02 - Backend de eliminacion segura

Implementa un servicio reutilizable y una ruta protegida para eliminar documentos generados no firmados.

- Acepta unicamente `contrato`, `acta_finiquito` y `acta_entrega_dotacion`.
- Verifica tenant, estado no firmado y clave de almacenamiento trazable.
- Bloquea firmados, adjuntos manuales, tipos no permitidos y actas devueltas.
- Elimina storage y registros con auditoria, correlacion y manejo transaccional.
- Para dotacion, elimina la fila operativa no devuelta junto con el documento.
- Manten respuestas publicas existentes y agrega pruebas de casos positivos y negativos.

Gate: pruebas backend y rutas especificas verdes.
