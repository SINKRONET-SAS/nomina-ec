const fs = require('fs');
const path = require('path');

describe('app route order', () => {
  test('declara descarga de rol PDF antes de la ruta generica anio/mes de nomina', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    const rolPdfIndex = source.indexOf("app.get('/api/nomina/:id/rol-pdf'");
    const rolTranspuestoPdfIndex = source.indexOf("app.get('/api/nomina/:anio/:mes/roles-pdf-transpuesto'");
    const periodIndex = source.indexOf("app.get('/api/nomina/:anio/:mes'");

    expect(rolPdfIndex).toBeGreaterThanOrEqual(0);
    expect(rolTranspuestoPdfIndex).toBeGreaterThanOrEqual(0);
    expect(periodIndex).toBeGreaterThanOrEqual(0);
    expect(rolPdfIndex).toBeLessThan(periodIndex);
    expect(rolTranspuestoPdfIndex).toBeLessThan(periodIndex);
  });

  test('GET de retorno de pago no activa planes con confirmPayment', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    expect(source).toContain("app.get('/api/pagos/confirm', paymentController.paymentReturn)");
    expect(source).toContain("app.post('/api/pagos/webhook', paymentController.confirmPayment)");
    expect(source).not.toContain("app.get('/api/pagos/confirm', paymentController.confirmPayment)");
  });

  test('expone consolidado anual de nomina desde reportes', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    expect(source).toContain("app.get('/api/reportes/nomina/:anio/consolidado'");
    expect(source).toContain('reporteController.exportarConsolidadoAnual');
  });

  test('expone rutas MSF26 para saldos iniciales y facturacion fiscal', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    expect(source).toContain("app.get('/api/onboarding/saldos-iniciales/plantilla.csv'");
    expect(source).toContain("app.post('/api/onboarding/saldos-iniciales/dry-run'");
    expect(source).toContain("app.post('/api/onboarding/saldos-iniciales/lotes/:batchId/commit'");
    expect(source).toContain("app.post('/api/facturacion/webhook/facturador'");
    expect(source).toContain("app.get('/api/facturacion/status'");
    expect(source).toContain("app.post('/api/facturacion/transacciones/:paymentTransactionId/emitir'");
  });
});
