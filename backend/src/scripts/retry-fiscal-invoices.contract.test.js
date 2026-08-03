// ============================================================
// Anti-regression contract test for retry-fiscal-invoices.js
// Ensures the one-shot script stays isolated from the Express
// app, cron-jobs, and payroll calculation.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/retry-fiscal-invoices.js');

describe('retry-fiscal-invoices one-shot script', () => {
  let scriptContent;

  beforeAll(() => {
    scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
  });

  test('script file exists', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  test('script has valid syntax (node --check)', () => {
    // node --check parses the file without executing it
    expect(() => {
      execFileSync(process.execPath, ['--check', SCRIPT_PATH], {
        encoding: 'utf8',
        timeout: 10_000,
      });
    }).not.toThrow();
  });

  test('does NOT require/import cron-jobs.js', () => {
    expect(scriptContent).not.toMatch(/cron-jobs/);
  });

  test('does NOT require/import calculoNominaService', () => {
    expect(scriptContent).not.toMatch(/calculoNominaService/);
  });

  test('does NOT require/import the Express app', () => {
    expect(scriptContent).not.toMatch(/require\(.*app\.js.*\)/);
    expect(scriptContent).not.toMatch(/require\(.*express.*\)/);
  });

  test('requires fiscalInvoiceService', () => {
    expect(scriptContent).toMatch(/fiscalInvoiceService/);
  });

  test('requires the database config', () => {
    expect(scriptContent).toMatch(/require\(.*config\/database.*\)/);
  });

  test('closes the database pool on exit', () => {
    expect(scriptContent).toMatch(/db\.pool\.end\(\)/);
  });

  test('calls retryPendingInvoices with cron-fiscal-oneshot correlationId', () => {
    expect(scriptContent).toMatch(/retryPendingInvoices/);
    expect(scriptContent).toMatch(/cron-fiscal-oneshot/);
  });
});
