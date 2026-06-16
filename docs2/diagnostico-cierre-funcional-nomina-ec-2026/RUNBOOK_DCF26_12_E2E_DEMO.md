# RUNBOOK DCF26-12 - Smoke E2E DEMO Nomina-Ec

## Proposito

Validar en un ambiente local o staging que la funcionalidad cerrada por DCF26 queda visible y operable con datos ficticios, sin usar informacion real de empleados.

## Precondiciones

- Backend con migraciones aplicadas.
- Frontend web apuntando al backend del ambiente.
- Usuario `owner` o `admin_rrhh` de empresa DEMO.
- Datos de prueba ficticios.
- Navegador disponible para capturas.

## Datos DEMO minimos

Usar nombres, correos y cedulas de prueba. No usar empleados reales, capturas reales ni cuentas bancarias reales.

Plantilla sugerida para carga masiva:

```csv
identification;firstName;lastName;departmentCode;position;hireDate;salary;bankCode;bankAccount;accountType;contractType;email;phone
1710034065;Maria Fernanda;Demo Ruiz;ADM;Analista de Talento;2026-01-15;850.00;PICHINCHA;2200123456;AHORROS;indefinido;maria.demo@example.com;0999999999
```

## Flujo E2E

1. Iniciar sesion como OWNER/ADMIN_RRHH.
2. Ir a Parametrizacion y ejecutar `Cargar parametros legales obligatorios`.
3. Completar Datos de empresa, Banco y archivo plano, Usuarios y roles.
4. Ir a Empleados y usar `Carga masiva de empleados`.
5. Prevalidar la plantilla DEMO.
6. Confirmar importacion.
7. Verificar que el lote aparece en `Lotes recientes`.
8. Revertir el lote si aun no tiene procesos laborales asociados.
9. Reimportar el empleado DEMO.
10. Registrar una marcacion manual o desde app movil.
11. Abrir periodo mensual.
12. Crear lote de novedades por estructura organizativa.
13. Calcular nomina del periodo.
14. Generar rol de pago PDF.
15. Ejecutar precheck RDEP.
16. Generar RDEP solo si el precheck queda listo.
17. Generar archivo bancario con banco configurado.
18. Revisar Dashboard/headcount y Auditoria reciente.

## Evidencia esperada

- Captura de Parametrizacion con parametros legales cargados.
- Captura de carga masiva con prevalidacion, lote confirmado y reversa disponible/bloqueada.
- Captura de apertura de mes y lote de novedades.
- Captura de RDEP precheck.
- Captura de archivo bancario generado.
- Captura de Dashboard/headcount.
- Export de auditoria o registro con `correlationId`.

## Criterios de aprobacion

- No hay `alert`, `confirm` ni `window.open` en frontend web.
- No hay ATS en runtime de nomina.
- La carga masiva no aplica filas parciales cuando hay errores.
- La reversa de lote no elimina empleados con procesos laborales asociados.
- RDEP se bloquea si no pasa precheck.
- El banco usado por el archivo plano proviene de configuracion OWNER o fallback controlado.
- Los mensajes son accionables y no exponen datos sensibles.

## Limitacion de esta ejecucion

En esta sesion no se ejecuto smoke visual con navegador porque el controlador del navegador integrado no estuvo disponible. El runbook queda listo para repetirlo con navegador activo y adjuntar capturas.
