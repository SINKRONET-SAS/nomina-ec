import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'assets', 'brand', 'source');
const WEB_PUBLIC_DIR = path.join(ROOT, 'frontend-web', 'public');
const WEB_BRAND_DIR = path.join(WEB_PUBLIC_DIR, 'brand');
const MOBILE_ASSETS_DIR = path.join(ROOT, 'app-movil', 'assets');
const SOURCE_SKNOMINA = path.join(SOURCE_DIR, 'SKNOMINA_LOGO.png');
const SOURCE_SINKRONET = path.join(SOURCE_DIR, 'SINKRONET.png');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'brand', 'manifest.json');

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function writeResized(source, target, width, height = width) {
  const image = await Jimp.read(source);
  image.resize(width, height, Jimp.RESIZE_BICUBIC);
  await image.writeAsync(target);
}

function fillRect(image, x, y, width, height, color) {
  image.scan(x, y, width, height, (_x, _y, idx) => {
    image.bitmap.data.writeUInt32BE(color, idx);
  });
}

async function writeSplash(source, target) {
  const canvas = new Jimp(1242, 2436, 0xecfdf5ff);
  const logo = await Jimp.read(source);
  logo.resize(720, 720, Jimp.RESIZE_BICUBIC);
  canvas.composite(logo, 261, 760);
  await canvas.writeAsync(target);
}

async function writeOgImage(source, target) {
  const canvas = new Jimp(1200, 630, 0x0f172aff);
  fillRect(canvas, 0, 0, 1200, 630, 0x0f172aff);
  fillRect(canvas, 0, 0, 420, 630, 0x0f766eff);
  fillRect(canvas, 420, 0, 32, 630, 0x22c55eff);
  const logo = await Jimp.read(source);
  logo.resize(500, 500, Jimp.RESIZE_BICUBIC);
  canvas.composite(logo, 350, 65);
  await canvas.writeAsync(target);
}

async function writeWideScreenshot(source, target) {
  const canvas = new Jimp(1280, 720, 0xf8fafcff);
  fillRect(canvas, 0, 0, 1280, 720, 0xf8fafcff);
  fillRect(canvas, 0, 0, 1280, 88, 0x0f172aff);
  fillRect(canvas, 72, 128, 438, 456, 0xffffffff);
  fillRect(canvas, 560, 128, 648, 456, 0xffffffff);
  fillRect(canvas, 604, 184, 236, 72, 0xecfdf5ff);
  fillRect(canvas, 604, 284, 500, 22, 0xcbd5e1ff);
  fillRect(canvas, 604, 332, 448, 22, 0xcbd5e1ff);
  fillRect(canvas, 604, 380, 550, 22, 0xcbd5e1ff);
  fillRect(canvas, 604, 456, 214, 52, 0x0f766eff);
  const logo = await Jimp.read(source);
  logo.resize(260, 260, Jimp.RESIZE_BICUBIC);
  canvas.composite(logo, 160, 220);
  await canvas.writeAsync(target);
}

async function writeMobileScreenshot(source, target) {
  const canvas = new Jimp(390, 844, 0xf8fafcff);
  fillRect(canvas, 0, 0, 390, 844, 0xf8fafcff);
  fillRect(canvas, 0, 0, 390, 112, 0x0f172aff);
  fillRect(canvas, 28, 152, 334, 224, 0xffffffff);
  fillRect(canvas, 28, 408, 334, 292, 0xffffffff);
  fillRect(canvas, 54, 452, 268, 18, 0xcbd5e1ff);
  fillRect(canvas, 54, 492, 226, 18, 0xcbd5e1ff);
  fillRect(canvas, 54, 532, 260, 18, 0xcbd5e1ff);
  fillRect(canvas, 54, 612, 150, 44, 0x0f766eff);
  const logo = await Jimp.read(source);
  logo.resize(158, 158, Jimp.RESIZE_BICUBIC);
  canvas.composite(logo, 116, 184);
  await canvas.writeAsync(target);
}

async function main() {
  if (!existsSync(SOURCE_SKNOMINA)) {
    throw new Error(`No existe fuente de marca: ${path.relative(ROOT, SOURCE_SKNOMINA)}`);
  }

  ensureDir(WEB_BRAND_DIR);
  ensureDir(MOBILE_ASSETS_DIR);

  const outputs = [
    ['frontend-web/public/brand/sknomina-logo-512.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/brand/sknomina-logo-512.png'), 512)],
    ['frontend-web/public/brand/sknomina-logo-1024.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/brand/sknomina-logo-1024.png'), 1024)],
    ['frontend-web/public/brand/sknomina-og.png', () => writeOgImage(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/brand/sknomina-og.png'))],
    ['frontend-web/public/brand/pwa-screenshot-wide.png', () => writeWideScreenshot(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/brand/pwa-screenshot-wide.png'))],
    ['frontend-web/public/brand/pwa-screenshot-mobile.png', () => writeMobileScreenshot(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/brand/pwa-screenshot-mobile.png'))],
    ['frontend-web/public/icon-192.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/icon-192.png'), 192)],
    ['frontend-web/public/icon-512.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/icon-512.png'), 512)],
    ['frontend-web/public/icon-192-maskable.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/icon-192-maskable.png'), 192)],
    ['frontend-web/public/icon-512-maskable.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/icon-512-maskable.png'), 512)],
    ['frontend-web/public/favicon-32.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/favicon-32.png'), 32)],
    ['frontend-web/public/favicon-48.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/favicon-48.png'), 48)],
    ['frontend-web/public/favicon-64.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/favicon-64.png'), 64)],
    ['frontend-web/public/apple-touch-icon.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'frontend-web/public/apple-touch-icon.png'), 180)],
    ['app-movil/assets/icon.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'app-movil/assets/icon.png'), 1024)],
    ['app-movil/assets/adaptive-icon.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'app-movil/assets/adaptive-icon.png'), 1024)],
    ['app-movil/assets/notification-icon.png', () => writeResized(SOURCE_SKNOMINA, path.join(ROOT, 'app-movil/assets/notification-icon.png'), 512)],
    ['app-movil/assets/splash.png', () => writeSplash(SOURCE_SKNOMINA, path.join(ROOT, 'app-movil/assets/splash.png'))],
  ];

  if (existsSync(SOURCE_SINKRONET)) {
    outputs.push(['frontend-web/public/brand/sinkronet-logo-512.png', () => writeResized(SOURCE_SINKRONET, path.join(ROOT, 'frontend-web/public/brand/sinkronet-logo-512.png'), 512)]);
  }

  for (const [, write] of outputs) {
    await write();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      sknomina: {
        path: 'assets/brand/source/SKNOMINA_LOGO.png',
        sha256: sha256File(SOURCE_SKNOMINA),
      },
      sinkronet: existsSync(SOURCE_SINKRONET)
        ? {
            path: 'assets/brand/source/SINKRONET.png',
            sha256: sha256File(SOURCE_SINKRONET),
          }
        : null,
    },
    formats: {
      pwaIcons: ['192x192 PNG', '512x512 PNG', 'maskable 192x192 PNG', 'maskable 512x512 PNG', 'apple-touch 180x180 PNG'],
      browserTab: ['32x32 PNG favicon', '48x48 PNG favicon', '64x64 PNG favicon'],
      social: ['1200x630 PNG'],
      storeMobile: ['1024x1024 PNG launcher', '512x512 PNG notification', '1242x2436 PNG splash'],
      screenshots: ['1280x720 PNG wide', '390x844 PNG mobile'],
    },
    generatedAssets: outputs.map(([relativePath]) => ({
      path: relativePath,
      sha256: sha256File(path.join(ROOT, relativePath)),
    })),
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    manifest: path.relative(ROOT, MANIFEST_PATH).replaceAll('\\', '/'),
    generatedAssets: manifest.generatedAssets.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({
    ok: false,
    error: err.message,
  }, null, 2));
  process.exit(1);
});
