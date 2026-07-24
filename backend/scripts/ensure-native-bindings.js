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
  console.error('[NATIVE] No fue posible preparar libxmljs2 para validar XML RDEP.');
  console.error('[NATIVE] Usa Node 22.19.x o superior compatible y verifica Python, npm y el toolchain C/C++ de node-gyp.');
  console.error('[NATIVE] Comando de reparación: npm rebuild libxmljs2 --foreground-scripts');
  console.error(`[NATIVE] Detalle: ${finalError?.message || 'rebuild finalizado con error.'}`);
  process.exit(1);
}

console.log('[NATIVE] libxmljs2 reconstruido y disponible.');
