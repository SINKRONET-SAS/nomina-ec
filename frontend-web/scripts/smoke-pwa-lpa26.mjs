import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const manifestPath = join(dist, 'manifest.webmanifest');
const swPath = join(dist, 'sw.js');
const htmlPath = join(dist, 'index.html');

function fail(message) {
  console.error(`[LPA26-PWA] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[LPA26-PWA] ${message}`);
}

function pngDimensions(asset) {
  const buffer = readFileSync(join(dist, asset));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    fail(`Asset PNG invalido en dist: ${asset}`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPngDimensions(asset, width, height) {
  const dimensions = pngDimensions(asset);
  if (dimensions.width !== width || dimensions.height !== height) {
    fail(`Asset ${asset} debe medir ${width}x${height}; mide ${dimensions.width}x${dimensions.height}.`);
  }
}

if (!existsSync(manifestPath)) {
  fail('manifest.webmanifest no existe. Ejecuta npm.cmd run build antes del smoke.');
}

if (!existsSync(htmlPath)) {
  fail('index.html no existe en dist.');
}

if (!existsSync(swPath)) {
  fail('sw.js no existe. La PWA no genero service worker.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const html = readFileSync(htmlPath, 'utf8');
const sw = readFileSync(swPath, 'utf8');

if (manifest.lang !== 'es-EC') {
  fail('El manifest debe usar lang es-EC.');
}

if (!manifest.icons?.some((icon) => icon.purpose?.includes('maskable'))) {
  fail('El manifest no declara icono maskable.');
}

if (!manifest.icons?.some((icon) => icon.src === '/apple-touch-icon.png' && icon.sizes === '180x180')) {
  fail('El manifest no declara apple-touch-icon.png 180x180.');
}

if (!manifest.screenshots || manifest.screenshots.length < 2) {
  fail('El manifest debe declarar screenshots wide y narrow.');
}

if (!manifest.shortcuts || manifest.shortcuts.length < 2) {
  fail('El manifest debe declarar shortcuts operativos.');
}

for (const asset of ['icon.svg', 'icon-192.png', 'icon-512.png', 'maskable-icon.svg', 'apple-touch-icon.svg', 'apple-touch-icon.png', 'pwa-screenshot-wide.svg', 'pwa-screenshot-mobile.svg', 'robots.txt', 'sitemap.xml']) {
  if (!existsSync(join(dist, asset))) {
    fail(`Asset PWA faltante en dist: ${asset}`);
  }
}

assertPngDimensions('icon-192.png', 192, 192);
assertPngDimensions('icon-512.png', 512, 512);
assertPngDimensions('apple-touch-icon.png', 180, 180);

if (!html.includes('href="/icon.svg"') || !html.includes('href="/icon-192.png"') || !html.includes('href="/apple-touch-icon.png"')) {
  fail('index.html debe enlazar icon.svg, icon-192.png y apple-touch-icon.png.');
}

if (!html.includes('content="/icon-512.png"')) {
  fail('Metadatos sociales deben usar el icono de sistema PNG.');
}

if (/[ÃÂ]/.test(`${html}\n${JSON.stringify(manifest)}`)) {
  fail('HTML o manifest contienen mojibake visible.');
}

if (!sw.includes('NetworkOnly') || !sw.includes('/api/')) {
  fail('El service worker debe dejar /api en NetworkOnly.');
}

if (/localStorage|sessionStorage|empleado|banco|ruc|geolocalizacion/i.test(sw)) {
  fail('El service worker contiene indicios de datos personales o almacenamiento local.');
}

pass('Manifest, assets y service worker cumplen el smoke LPA26.');
