import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const manifestPath = join(dist, 'manifest.webmanifest');
const swPath = join(dist, 'sw.js');

function fail(message) {
  console.error(`[LPA26-PWA] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[LPA26-PWA] ${message}`);
}

if (!existsSync(manifestPath)) {
  fail('manifest.webmanifest no existe. Ejecuta npm.cmd run build antes del smoke.');
}

if (!existsSync(swPath)) {
  fail('sw.js no existe. La PWA no genero service worker.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const sw = readFileSync(swPath, 'utf8');

if (manifest.lang !== 'es-EC') {
  fail('El manifest debe usar lang es-EC.');
}

if (!manifest.icons?.some((icon) => icon.purpose?.includes('maskable'))) {
  fail('El manifest no declara icono maskable.');
}

if (!manifest.screenshots || manifest.screenshots.length < 2) {
  fail('El manifest debe declarar screenshots wide y narrow.');
}

if (!manifest.shortcuts || manifest.shortcuts.length < 2) {
  fail('El manifest debe declarar shortcuts operativos.');
}

for (const asset of ['icon.svg', 'maskable-icon.svg', 'apple-touch-icon.svg', 'pwa-screenshot-wide.svg', 'pwa-screenshot-mobile.svg']) {
  if (!existsSync(join(dist, asset))) {
    fail(`Asset PWA faltante en dist: ${asset}`);
  }
}

if (!sw.includes('NetworkOnly') || !sw.includes('/api/')) {
  fail('El service worker debe dejar /api en NetworkOnly.');
}

if (/localStorage|sessionStorage|empleado|banco|ruc|geolocalizacion/i.test(sw)) {
  fail('El service worker contiene indicios de datos personales o almacenamiento local.');
}

pass('Manifest, assets y service worker cumplen el smoke LPA26.');
