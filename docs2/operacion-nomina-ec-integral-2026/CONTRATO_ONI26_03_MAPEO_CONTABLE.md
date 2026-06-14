# ONI26-03 - Contrato de mapeo contable

## Objetivo

Definir como Nomina-Ec debe convertir resultados de nomina en asientos contables sin hardcodear cuentas ni asumir un plan contable unico.

## Entidades

- `tenantId`: empresa responsable.
- `conceptoNomina`: sueldo, horas extra, IESS, IR, beneficios, provisiones, banco.
- `cuentaDebito`: cuenta contable parametrizada.
- `cuentaCredito`: cuenta contable parametrizada.
- `centroCosto`: dimension organizativa.
- `periodo`: anio y mes.
- `origen`: calculo, ajuste, cierre, reverso o pago.

## Reglas

- Toda cuenta debe ser configurable por tenant.
- Los defaults solo sirven como plantilla DEMO.
- Cada asiento debe cuadrar debito/credito.
- Cada asiento debe mantener `correlationId`, usuario, periodo y origen.
- Reversiones deben crear asiento inverso; no se elimina historia.

## Salida esperada

```json
{
  "tenantId": "demo",
  "periodo": "2026-06",
  "asiento": [
    { "cuenta": "510101", "debito": 470.0, "credito": 0, "centroCosto": "ADMIN", "concepto": "sueldo_base" },
    { "cuenta": "210101", "debito": 0, "credito": 470.0, "centroCosto": "ADMIN", "concepto": "sueldo_base" }
  ],
  "balanceado": true
}
```

## Validaciones

- Cuenta contable requerida.
- Centro de costo valido.
- Monto mayor o igual a cero.
- Debito total igual a credito total.
- Periodo abierto o cierre autorizado.
