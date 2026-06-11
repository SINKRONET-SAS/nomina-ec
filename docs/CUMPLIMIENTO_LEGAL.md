# Matriz de Cumplimiento Legal - Ecuador 2026

## Requisitos Legales Implementados

| Requisito Legal | Articulo | Implementacion en el SaaS | Documento/Reporte |
|----------------|----------|---------------------------|-------------------|
| Registro de jornada | Art. 71 Codigo Trabajo | App movil con foto+GPS, almacenamiento 2 anos | Reporte de asistencia |
| Pago aportes IESS | Art. 205 Codigo Trabajo | Motor de nomina calcula automaticamente | XML SAE |
| Decimo tercero | Art. 111 Codigo Trabajo | Provisionado mensual, pago en diciembre | Rol de pagos |
| Decimo cuarto | Art. 113 Codigo Trabajo | Provisionado mensual, pago segun region | Rol de pagos |
| Retencion IR | Art. 36 LRTI | Calculo progresivo anual/mensual | XML ATS |
| Entrega rol de pagos | Art. 116 Codigo Trabajo | Generacion PDF con espacio de firma | Rol de pagos PDF |
| Acta de finiquito | Art. 196 Codigo Trabajo | Template con todos los rubros legales | PDF firmable |
| Contrato por escrito | Art. 18 Codigo Trabajo | Generacion automatica desde template | DOCX + PDF |
| Vacaciones | Art. 69 Codigo Trabajo | 15 dias despues de 1 ano, provisionado | Rol de pagos |
| Horas extras | Art. 55 Codigo Trabajo | 50% dias laborables, 100% feriados | Rol de pagos |
| Indemnizacion despido | Art. 188 Codigo Trabajo | Calculo automatico segun tiempo | Acta finiquito |
| Desahucio | Art. 185 Codigo Trabajo | 25% por ano de servicio | Acta finiquito |
| Proteccion datos | Ley Organica Proteccion Datos | Cifrado, RLS, auditoria | Bitacora auditoria |

## Reglas Irrenunciables (Art. 326 Constitucion)

Estas reglas estan hardcodeadas en el sistema y NO PUEDEN ser desactivadas:

1. **No eliminacion de marcaciones**
   - Implementacion: No existe endpoint DELETE para marcaciones
   - Sancion: Error 403 si se intenta

2. **Geolocalizacion obligatoria**
   - Implementacion: Validacion en marcacionValidator.js
   - Sancion: Error 400 si no hay GPS

3. **Devolucion de equipos**
   - Implementacion: Validacion en liquidacionService.js
   - Sancion: Bloqueo de generacion de acta

4. **Clausula irrenunciable en contratos**
   - Implementacion: Inyeccion automatica en templateGenerator.js
   - Sancion: Rechazo de templates sin la clausula

5. **Nomina cerrada inmutable**
   - Implementacion: Trigger PostgreSQL prevent_update_closed_nomina
   - Sancion: Excepcion SQL si se intenta modificar

6. **Liquidacion minima legal**
   - Implementacion: Validacion en liquidacionService.js
   - Sancion: Error si es inferior al minimo legal

7. **Auditoria obligatoria**
   - Implementacion: Trigger audit_trigger en todas las tablas sensibles
   - Sancion: Si falla el trigger, falla la operacion principal

## Tabla de Impuesto a la Renta 2026

| Fraccion Basica | Exceso Hasta | Porcentaje | Fraccion Impuesto |
|----------------|--------------|------------|-------------------|
| $0 - $12,208 | $12,208 | 0% | $0 |
| $12,209 - $15,188 | $15,188 | 5% | $0 |
| $15,189 - $19,572 | $19,572 | 10% | $148.95 |
| $19,573 - $23,950 | $23,950 | 12% | $587.15 |
| $23,951 - $41,545 | $41,545 | 15% | $1,112.53 |
| $41,546 - $45,820 | $45,820 | 20% | $3,751.63 |
| $45,821 - $55,645 | $55,645 | 25% | $4,606.23 |
| $55,646 - $72,545 | $72,545 | 30% | $7,062.23 |
| $72,546 - $102,130 | $102,130 | 35% | $12,132.23 |

## Aportes IESS 2026

| Concepto | Porcentaje |
|----------|------------|
| Aporte Personal | 9.45% |
| Aporte Patronal | 11.15% |
| Total | 20.60% |

## Valores Legales 2026

- Salario Basico Unificado: $460.00
- Decimo Cuarto (Costa): $460.00 (pagadero en marzo)
- Decimo Cuarto (Sierra): $460.00 (pagadero en agosto)
- Vacaciones: 15 dias despues de 1 ano
- Jornada maxima: 40 horas semanales (8 diarias)

---

Plan Haiky - Cumplimiento Legal Ecuador 2026

