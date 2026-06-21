# Matriz DV3N26 - Hallazgos Diagnostico V3 Nomina-Ec 2026

| ID | Prioridad | Area | Hallazgo V3 | Estado inicial DV3N26 | Fase | Criterio de cierre |
|----|-----------|------|-------------|------------------------|------|--------------------|
| B-01 | P0 | Bancos | Archivo bancario podia incluir nominas en borrador. | Pendiente de verificacion en stack real. | DV3N26-01 | Servicio/generador filtra solo cerrada/pagada, test y mensaje visible si no hay nominas aptas. |
| B-02 | P0 | Liquidacion | Vacaciones sin dias adicionales por Art. 69 CT despues de 5 anos. | Pendiente de verificacion. | DV3N26-02 | Formula probada para 5, 6, 10 anos y documentada con fuente legal vigente. |
| B-03 | P1 | PDF rol | Fondo de reserva ausente del rol individual. | Pendiente de verificacion. | DV3N26-02 | PDF/servicio incluye fondo reserva cuando aplica y test snapshot/datos. |
| B-04 | P1 | Reportes | Provisiones no acumulaban fondo de reserva. | Pendiente de verificacion. | DV3N26-02 | Reportes suman fondo reserva y UI lo muestra sin duplicar cuentas. |
| B-05 | P2 | UI | Anios hardcoded [2024,2025,2026]. | Pendiente de busqueda global. | DV3N26-03 | Selectores usan helper comun anio actual +/- rango y prueba/build. |
| B-06 | P0 | Nomina | Recalculo podia no preservar estado pagada/cerrada. | Pendiente de verificacion. | DV3N26-01 | Nominas pagadas no se recalculan; cerradas requieren flujo explicito de reapertura. |
| B-07 | P2 | Deuda | State/imports muertos en reportes/liquidaciones. | Pendiente de verificacion. | DV3N26-08 | Sin imports muertos relevantes ni warnings de lint/build introducidos. |
| L-01 | P0 | Legal | Art. 69 CT vacaciones. | Pendiente de fuente/QA. | DV3N26-02 | Fuente, vigencia y prueba golden case. |
| L-02 | P0 | Legal | Art. 196 CT fondo reserva. | Pendiente de fuente/QA. | DV3N26-02 | Fuente, vigencia y rol/reportes. |
| L-03 | P0 | LOPDP | Falta politica, terminos, banner y consentimiento. | Pendiente funcional. | DV3N26-04 | PWA publica y registro muestran textos/version; backend audita consentimiento. |
| L-04 | P1 | MDT/SUT | Registro SUT de contratos/finiquitos sin integracion. | Pendiente funcional/externo. | DV3N26-07 | UI muestra estado, enlace/accion manual o integracion real si hay credenciales; bloqueo documentado. |
| M-01 | P1 | Reportes PDF | Nomina consolidada PDF. | Pendiente de verificacion. | DV3N26-03 | PDF landscape o equivalente en repo real, columnas completas, KPIs y firmas. |
| M-02 | P1 | Contabilidad | Asientos devengamiento/pago y plan NIC. | Pendiente de verificacion. | DV3N26-03 | Pantalla o endpoint operativo, cuadre debe/haber y exportacion. |
| M-03 | P1 | Nomina UI | Boton rol consolidado visible. | Pendiente de verificacion. | DV3N26-03 | Accion visible solo cuando hay datos aptos y maneja errores. |
| P-01 | P1 | PWA | Manifest completo. | Parcialmente existente; validar contra repo. | DV3N26-06 | Manifest es-EC, iconos reales y smoke. |
| P-02 | P1 | PWA | HTML lang correcto. | Pendiente de verificacion. | DV3N26-06 | index.html lang es/es-EC y build. |
| P-03 | P0 | PWA Offline | Service Worker offline pendiente. | Pendiente funcional. | DV3N26-06 | Assets cacheados; API no se cachea como dato vigente; UX offline clara. |
| S-01 | P0 | Seguridad | Cifrado real de cuentas bancarias. | Pendiente funcional. | DV3N26-05 | AES autenticado, migracion, pruebas, secretos por env y rollback. |
