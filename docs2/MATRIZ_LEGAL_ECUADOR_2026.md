# Matriz legal Ecuador 2026

Estado: control tecnico de fase 17. No sustituye revision profesional laboral, tributaria ni contable.

## Politica de validacion

Los parametros 2026 permanecen con estado `pendiente_validacion_oficial` hasta que exista evidencia documental suficiente de fuente oficial y aprobacion profesional interna. En ambiente productivo el backend puede bloquear calculos legales si `NODE_ENV=production` o `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true` y la fuente no es `validado_oficial`.

## Fuentes oficiales consultadas

- Ministerio del Trabajo: portal institucional y enlaces a Salarios y Acuerdos Ministeriales.
- Ministerio del Trabajo: noticia oficial del 15 de diciembre sobre SBU 2026 en USD 482.
- Servicio de Rentas Internas: pagina oficial de Impuesto a la Renta y PDF oficial de tablas enlazado desde esa pagina.
- Instituto Ecuatoriano de Seguridad Social: portal institucional, pagina de normativa y consulta publica de resoluciones revisadas el 2026-06-14 para validacion de aportes.

URLs base:

- `https://www.trabajo.gob.ec/`
- `https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/`
- `https://www.sri.gob.ec/impuesto-renta`
- `https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf`
- `https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/ac3a6ab4-a60b-4892-8ecf-0f5b939169ae/Tablas%20de%20C%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta%20Herencias%20y%20Legados.pdf`
- `https://www.iess.gob.ec/`
- `https://www.iess.gob.ec/normativa/`
- `https://app.iess.gob.ec/iess-gestion-resolucion-publico-web/`

## Parametros 2026

| Parametro | Valor tecnico actual | Fuente requerida | Estado | Responsable |
| --- | ---: | --- | --- | --- |
| Salario basico unificado | 482.00 | Noticia oficial Ministerio del Trabajo, SBU 2026 USD 482 | validado_fuente_mdt | Contador / abogado laboral |
| Aporte IESS personal | 0.0945 | Pagina oficial IESS `Servicios y prestaciones`: afiliado 9.45% del sueldo o salario | validado_oficial_iess | Contador |
| Aporte IESS patronal | 0.1115 | Pagina oficial IESS `Servicios y prestaciones`: empleador 11.15% del salario del trabajador | validado_oficial_iess | Contador |
| Jornada maxima semanal | 40 | Codigo del Trabajo y normativa laboral vigente | pendiente_validacion_oficial | Abogado laboral |
| Decimo cuarto Costa/Galapagos | Mes 3 | Codigo del Trabajo y calendario regional vigente | pendiente_validacion_oficial | Abogado laboral |
| Decimo cuarto Sierra/Amazonia | Mes 8 | Codigo del Trabajo y calendario regional vigente | pendiente_validacion_oficial | Abogado laboral |
| Tabla IR personas naturales | Resolucion Nro. NAC-DGERCGC25-00000043 | PDF oficial SRI, Registro Oficial No. 194 de 30/12/2025 | validado_oficial_fuente_sri | Contador tributario |

## Tabla IR 2026 personas naturales y sucesiones indivisas

| Fraccion basica | Exceso hasta | Impuesto fraccion basica | Impuesto fraccion excedente |
| ---: | ---: | ---: | ---: |
| 0 | 12.208 | 0 | 0% |
| 12.208 | 15.549 | 0 | 5% |
| 15.549 | 20.188 | 167 | 10% |
| 20.188 | 26.700 | 631 | 12% |
| 26.700 | 35.136 | 1.412 | 15% |
| 35.136 | 46.575 | 2.678 | 20% |
| 46.575 | 62.005 | 4.965 | 25% |
| 62.005 | 82.679 | 8.823 | 30% |
| 82.679 | 109.956 | 15.025 | 35% |
| 109.956 | En adelante | 24.572 | 37% |

## Tabla IR 2026 herencias, legados y donaciones

| Fraccion basica | Exceso hasta | Impuesto fraccion basica | Impuesto fraccion excedente |
| ---: | ---: | ---: | ---: |
| 0 | 78.527 | 0 | 0% |
| 78.527 | 157.053 | 0 | 5% |
| 157.053 | 314.108 | 3.926 | 10% |
| 314.108 | 471.193 | 19.632 | 15% |
| 471.193 | 628.268 | 43.195 | 20% |
| 628.268 | 785.321 | 74.609 | 25% |
| 785.321 | 942.353 | 113.873 | 30% |
| 942.353 | En adelante | 160.982 | 35% |

## Criterios de redondeo

| Concepto | Criterio tecnico |
| --- | --- |
| Sueldo proporcional | Calcular a precision numerica y redondear a 2 decimales al cerrar el rubro. |
| Horas extra | Calcular por valor hora y recargo; redondear cada rubro a 2 decimales. |
| Aporte IESS personal | Aplicar porcentaje sobre total de ingresos gravables y redondear a 2 decimales. |
| Impuesto a la renta | Proyectar base anual, calcular impuesto anual y prorratear mensual; redondear a 2 decimales. |
| Decimos y vacaciones | Calcular proporcion sobre periodo legal y redondear a 2 decimales. |
| Archivo bancario | Usar el neto de nomina cerrado, formateado a 2 decimales segun perfil bancario. |

## Control automatizado

El servicio `legalParameterService` define `validado_oficial` como unico estado aceptado para calculos productivos. Si los parametros mantienen `pendiente_validacion_oficial`, el motor de nomina debe lanzar `LEGAL_PARAMETERS_NOT_VALIDATED` en produccion o cuando `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true`.

## Validacion IESS 2026

El 2026-06-18 se verifico la pagina oficial IESS `Servicios y prestaciones`, donde se indica que al afiliado le corresponde aportar 9.45% de su sueldo o salario y al empleador 11.15% del salario del trabajador.

Fuente: `https://www.iess.gob.ec/en/web/afiliado/servicios-y-prestaciones`.

Decision: E-01 queda cerrado para los porcentajes base 9.45% personal y 11.15% patronal. Cualquier caso especial por regimen, sector o tipo de relacion debe parametrizarse aparte con su fuente especifica.
