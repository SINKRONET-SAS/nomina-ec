const { spawnSync } = require('child_process');

function loadLibxml() {
  try {
    const libxml = require('libxmljs2');
    if (typeof libxml.parseXml !== 'function') {
      throw new Error('libxmljs2 no expone parseXml.');
    }
    return null;
  } catch (error) {
    return error;
  }
}

const initialError = loadLibxml();
if (!initialError) {
  console.log('[NATIVE] libxmljs2 disponible.');
  process.exit(0);
}

console.warn('[NATIVE] Falta el binding nativo de libxmljs2; se intentara reconstruirlo.');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rebuild = spawnSync(npmCommand, ['rebuild', 'libxmljs2', '--foreground-scripts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

const finalError = loadLibxml();
if (rebuild.status !== 0 || finalError) {
  console.warn('[NATIVE] No fue posible preparar libxmljs2 nativo para validar XML RDEP.');
  console.warn('[NATIVE] Se utilizará la validación de fallback con parser XML en JS.');
  console.warn(`[NATIVE] Detalle: ${finalError?.message || 'rebuild finalizado con advertencia.'}`);
  process.exit(0);
}

console.log('[NATIVE] libxmljs2 reconstruido y disponible.');
