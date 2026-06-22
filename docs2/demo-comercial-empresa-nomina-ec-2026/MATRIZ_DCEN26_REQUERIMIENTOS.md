# Matriz DCEN26 - Requerimientos demo comercial Nomina-Ec 2026

| ID | Prioridad | Area | Requerimiento | Criterio de cierre | Fase |
|----|-----------|------|---------------|--------------------|------|
| DCEN26-R01 | P0 | Gobierno demo | Crear tenant/empresa demo aislado y marcado como demo. | Existe tenant demo idempotente, identificable y con rollback/reset seguro. | DCEN26-02 |
| DCEN26-R02 | P0 | Usuarios | Crear 4 usuarios demo con roles comerciales. | Roles OWNER, RRHH, supervisor/empleado y acceso de observacion documentados, sin secretos en repo. | DCEN26-02 |
| DCEN26-R03 | P0 | Parametros | Cargar parametros legales/operativos requeridos. | Legal 2026, bancos, jornadas, novedades, unidades y catalogos quedan listos para operar la demo. | DCEN26-03 |
| DCEN26-R04 | P0 | Estructura | Configurar unidades Quito y Guayaquil. | Existen unidades, centros de costo y jerarquia operativa visible. | DCEN26-04 |
| DCEN26-R05 | P0 | Zonas | Configurar zonas de marcacion Quito/Guayaquil. | Zonas con coordenadas publicas/ficticias, radio y reglas de foto/GPS. | DCEN26-04 |
| DCEN26-R06 | P0 | Empleados | Crear 30 empleados ficticios completos. | Fichas completas con ingreso entre 2015 y 2026, domicilio, provincia/ciudad, pago, jornada, unidad, zona y region de decimo cuarto. | DCEN26-05 |
| DCEN26-R07 | P0 | Asistencia | Crear asistencias de un mes. | Mes demo con marcaciones normales, atrasos, faltas, permisos y fuera de zona. | DCEN26-06 |
| DCEN26-R08 | P0 | Nomina | Cerrar 5 meses 2026. | Cinco periodos abiertos/calculados/cerrados con roles y evidencia. | DCEN26-07 |
| DCEN26-R09 | P1 | Reportes | Generar reportes y archivos de pago demo. | PDF/XLSX/CSV y archivo bancario demo disponibles sin riesgo productivo. | DCEN26-07 |
| DCEN26-R10 | P0 | Comercial | Recorrido PWA listo para presentacion. | Dashboard, empleados, asistencia, nomina y reportes muestran datos suficientes sin pantallas vacias. | DCEN26-08 |
| DCEN26-R11 | P0 | Seguridad | Evitar datos reales y cargas bancarias reales. | Datos marcados como ficticios; archivos demo bloqueados o marcados para no ser productivos. | DCEN26-02..08 |
| DCEN26-R12 | P0 | QA | Seed idempotente y reset seguro. | Re-ejecucion no duplica; reset solo elimina tenant demo; gates pasan. | DCEN26-08 |

## Datos minimos de la demo

- Empresa: razon social ficticia, RUC ficticio valido para demo, marca visible y datos de contacto no reales.
- Usuarios: 4 accesos comerciales con roles y permisos diferenciados.
- Empleados: 30 registros con diversidad de edades, fechas de ingreso 2015-2026, ciudades, jornadas, unidades y formas de pago.
- Quito: unidad matriz, zona centro/norte ficticia y coordenadas de referencia publica.
- Guayaquil: sucursal comercial/logistica ficticia y coordenadas de referencia publica.
- Asistencia: un mes completo con suficiente variacion para mostrar aprobaciones y novedades.
- Nomina: enero a mayo 2026 o cinco meses definidos por la fase, con cierre reproducible.
