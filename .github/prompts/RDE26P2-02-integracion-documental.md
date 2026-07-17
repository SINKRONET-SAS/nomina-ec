# Prompt RDE26P2-02 — integracion documental y almacenamiento

Integra el resolvedor de RDE26P2-01 en los generadores de documentos que presentan o firman por el empleador y ejecuta la parte de almacenamiento.

- Corrige el acta de entrega de dotacion, incluyendo representante e identificacion en empleador, firma y metadata.
- Alinea roles de pago, contratos y finiquitos sin cambiar contratos publicos.
- En contratos emitidos elimina del PDF las notas internas de base legal, plantilla preliminar, revision legal y estado SUT/MDT. Conserva la evidencia legal como metadata auditable.
- Corrige el texto de comunicaciones electronicas: no presentes el articulo 56 de la Ley de Comercio Electronico como una regla general de notificacion SUT; usa autenticidad, integridad, trazabilidad, conservacion y valor probatorio cuando corresponda.
- Agrega una operacion tenant-aware para listar y eliminar documentos sin `empleado_id`, eliminando primero el objeto trazable y bloqueando claves ausentes.
- Rechaza adjuntos que superen 8 MB o 30 paginas en PDF; para imagenes de ficha rechaza mas de 5 MB o 5000 x 5000 pixeles.
- Registra tamano, paginas o dimensiones y politica aplicada en metadata sin guardar contenido duplicado.
- Agrega pruebas con catalogo `empresa_operativa` sin datos equivalentes en `tenants.configuracion`.

No regeneres documentos historicos ni borres documentos vinculados a un empleado.
