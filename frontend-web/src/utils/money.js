// ============================================================
// SKNOMINA - Formateador monetario compartido (frontend-web)
// Extraído en fase AISK26-04 (DRY). Consumido por:
//   - HistorialEmpleado.jsx
//   - MovilizacionAprobacion.jsx
//   - Dashboard.jsx
//   - Beneficios.jsx
// ============================================================

const moneyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function money(value) {
  return moneyFormatter.format(Number(value || 0));
}
