import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { imageSize } = require('image-size');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs2', 'auditoria-assets-comercial-haiky-2026');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'brand', 'manifest.json');

const expectedImages = [
  ['assets/brand/source/SKNOMINA_LOGO.png', 1254, 1254, 'Fuente SKNOMINA entregada por usuario'],
  ['frontend-web/public/brand/sknomina-logo-512.png', 512, 512, 'Logo comercial PWA'],
  ['frontend-web/public/brand/sknomina-logo-1024.png', 1024, 1024, 'Logo comercial alta resolucion'],
  ['frontend-web/public/brand/sknomina-og.png', 1200, 630, 'Imagen social Open Graph'],
  ['frontend-web/public/brand/pwa-screenshot-wide.png', 1280, 720, 'Screenshot PWA wide'],
  ['frontend-web/public/brand/pwa-screenshot-mobile.png', 390, 844, 'Screenshot PWA mobile'],
  ['frontend-web/public/icon-192.png', 192, 192, 'Icono PWA 192'],
  ['frontend-web/public/icon-512.png', 512, 512, 'Icono PWA 512'],
  ['frontend-web/public/icon-192-maskable.png', 192, 192, 'Icono maskable 192'],
  ['frontend-web/public/icon-512-maskable.png', 512, 512, 'Icono maskable 512'],
  ['frontend-web/public/favicon-32.png', 32, 32, 'Favicon browser tab 32'],
  ['frontend-web/public/favicon-48.png', 48, 48, 'Favicon browser tab 48'],
  ['frontend-web/public/favicon-64.png', 64, 64, 'Favicon browser tab 64'],
  ['frontend-web/public/apple-touch-icon.png', 180, 180, 'Apple touch icon'],
  ['app-movil/assets/icon.png', 1024, 1024, 'Launcher mobile'],
  ['app-movil/assets/adaptive-icon.png', 1024, 1024, 'Adaptive icon mobile'],
  ['app-movil/assets/notification-icon.png', 512, 512, 'Notification icon mobile'],
  ['app-movil/assets/splash.png', 1242, 2436, 'Splash mobile'],
];

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(relativePath) {
  return createHash('sha256').update(readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function checkImage([relativePath, width, height, label]) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      label,
      path: relativePath,
      expected: `${width}x${height}`,
      actual: 'missing',
      severity: 'alta',
    };
  }
  const size = imageSize(absolutePath);
  return {
    ok: size.width === width && size.height === height,
    label,
    path: relativePath,
    expected: `${width}x${height}`,
    actual: `${size.width}x${size.height}`,
    type: size.type,
    sha256: sha256File(relativePath),
    severity: size.width === width && size.height === height ? 'info' : 'alta',
  };
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

const imageChecks = expectedImages.map(checkImage);
const brandLogo = read('frontend-web/src/components/Brand/BrandLogo.jsx');
const indexHtml = read('frontend-web/index.html');
const pwaConfig = read('frontend-web/pwa.config.js');
const landing = read('frontend-web/src/pages/Landing.jsx');
const mobileLogin = read('app-movil/src/screens/LoginScreen.js');
const appConfig = read('app-movil/app.json');
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : null;

const contractChecks = [
  {
    ok: brandLogo.includes("const BRAND_LOGO_SRC = '/brand/sknomina-logo-512.png'"),
    label: 'BrandLogo usa logo comercial real',
    evidence: 'frontend-web/src/components/Brand/BrandLogo.jsx',
    severity: 'alta',
  },
  {
    ok: includesAll(indexHtml, ['/brand/sknomina-og.png', '/brand/sknomina-logo-512.png', '/favicon-32.png', '/favicon-48.png', '/favicon-64.png'])
      && !indexHtml.includes('href="/icon.svg"'),
    label: 'HTML publico usa assets comerciales en preload/social/favicon',
    evidence: 'frontend-web/index.html',
    severity: 'media',
  },
  {
    ok: includesAll(pwaConfig, ['/brand/pwa-screenshot-wide.png', '/brand/pwa-screenshot-mobile.png']),
    label: 'Manifest PWA usa screenshots PNG de marca',
    evidence: 'frontend-web/pwa.config.js',
    severity: 'media',
  },
  {
    ok: landing.includes('BRAND_LOGO_SRC') && landing.includes('HeroBrandAsset'),
    label: 'Landing usa asset de marca en primer viewport',
    evidence: 'frontend-web/src/pages/Landing.jsx',
    severity: 'alta',
  },
  {
    ok: mobileLogin.includes("require('../../assets/icon.png')") && appConfig.includes('"icon": "./assets/icon.png"'),
    label: 'Mobile usa launcher generado desde la misma fuente',
    evidence: 'app-movil',
    severity: 'alta',
  },
  {
    ok: Boolean(manifest?.source?.sknomina?.sha256),
    label: 'Manifiesto de marca registra hash de fuente SKNOMINA',
    evidence: 'assets/brand/manifest.json',
    severity: 'media',
  },
];

const findings = [
  ...imageChecks.filter((check) => !check.ok),
  ...contractChecks.filter((check) => !check.ok),
];

const report = {
  generatedAt: new Date().toISOString(),
  plan: 'HAIKY-ASSETS-COMERCIAL-UIUX-2026',
  sourceScope: 'LANDING, PWA, BACKEND contracts y MOBILE assets',
  initialConfirmedRegression: [
    'frontend-web/public/icon-512.png mostraba placeholder Nomina-Ec / Datos ficticios para tienda antes de regenerar.',
    'frontend-web/index.html priorizaba /icon.svg como favicon, manteniendo un icono de pestana no homologado con SKNOMINA.',
    'app-movil/assets/icon.png mostraba placeholder Nomina-Ec / Datos ficticios para tienda antes de regenerar.',
    'Manifest PWA usaba screenshots SVG ficticios en vez de assets comerciales PNG.',
  ],
  imageChecks,
  contractChecks,
  findingSummary: findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {}),
  findings,
  evidenceHash: sha256(JSON.stringify({ imageChecks, contractChecks, manifest })),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'DIAGNOSTICO_JSON.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdown = [
  '# Diagnostico assets comerciales Haiky 2026',
  '',
  `Generado: ${report.generatedAt}`,
  `Hash evidencia: ${report.evidenceHash}`,
  '',
  '## Regresion reconfirmada',
  '',
  ...report.initialConfirmedRegression.map((item) => `- ${item}`),
  '',
  '## Checks de imagen',
  '',
  ...imageChecks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'} ${check.label}: ${check.path} esperado ${check.expected}, actual ${check.actual}`),
  '',
  '## Checks de contrato',
  '',
  ...contractChecks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'} ${check.label} (${check.evidence})`),
  '',
  '## Hallazgos automatizados abiertos',
  '',
  findings.length
    ? findings.map((finding) => `- ${finding.severity}: ${finding.label || finding.path}`).join('\n')
    : 'No quedan hallazgos automatizados abiertos en assets comerciales.',
  '',
].join('\n');

writeFileSync(path.join(OUT_DIR, 'DIAGNOSTICO_AUTOMATIZADO.md'), markdown, 'utf8');
console.log(JSON.stringify({
  ok: findings.length === 0,
  outDir: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
  findingSummary: report.findingSummary,
}, null, 2));

if (findings.length) {
  process.exit(1);
}
