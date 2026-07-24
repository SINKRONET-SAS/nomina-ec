# HCF26-05 — Plantillas y selector de archivo

Homogeneiza las superficies de carga masiva.

- Empleados: cédula visible, plantilla descargable y selector verificado.
- Novedades: cédula primaria, `empleadoId` opcional y selector.
- Asistencia manual: cédula operativa, UUID opcional y selector con archivo visible.
- Saldos iniciales: cédula, CSV/XLSX, selector y resumen del archivo cargado.
- Mantén delimitadores, BOM, ejemplos, límites y payloads actuales.
- Rechaza filas con errores sin aplicar cambios parciales cuando el contrato lo exige.

Gate: cada plantilla se descarga y carga desde su pantalla sin conocer UUID.

