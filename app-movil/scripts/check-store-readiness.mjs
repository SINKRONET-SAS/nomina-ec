import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const appConfig = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(`[LPA26-STORES] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[LPA26-STORES] ${message}`);
}

if (!appConfig.android?.package) {
  fail('android.package no esta definido.');
}

if (!appConfig.description || appConfig.description.trim().length < 30) {
  fail('expo.description debe describir comercialmente la app para tienda.');
}

if (!appConfig.extra?.androidPrivacyPolicyUrl?.startsWith('https://')) {
  fail('extra.androidPrivacyPolicyUrl debe apuntar a una politica publica HTTPS para Play Console.');
}

if (!appConfig.ios?.bundleIdentifier) {
  fail('ios.bundleIdentifier no esta definido.');
}

if (!Number.isInteger(appConfig.android?.versionCode)) {
  fail('android.versionCode debe ser numerico.');
}

if (Object.prototype.hasOwnProperty.call(appConfig.android || {}, 'targetSdkVersion')) {
  fail('android.targetSdkVersion no debe declararse en app.json managed; Expo lo resuelve por SDK/build.');
}

const expoVersion = String(packageJson.dependencies?.expo || packageJson.devDependencies?.expo || '');
const expoSdkMajor = Number.parseInt(expoVersion.match(/\d+/)?.[0] || '', 10);
if (!Number.isInteger(expoSdkMajor) || expoSdkMajor < 54) {
  fail('Expo SDK debe ser 54 o superior para cumplir target Android 35 en builds de tienda.');
}

if (!appConfig.ios?.buildNumber) {
  fail('ios.buildNumber no esta definido.');
}

const requiredAssets = [
  appConfig.icon,
  './assets/splash.png',
  appConfig.android?.adaptiveIcon?.foregroundImage,
  './assets/notification-icon.png',
  './assets/store/feature-graphic.png',
  './assets/store/screenshots/phone-01.png',
  './assets/store/screenshots/phone-02.png',
];

for (const asset of requiredAssets) {
  if (!asset || !existsSync(join(root, asset))) {
    fail(`Asset requerido faltante: ${asset}`);
  }
}

for (const key of ['privacyUrl', 'termsUrl', 'supportUrl', 'accountDeletionUrl']) {
  if (!appConfig.extra?.[key]?.startsWith('https://')) {
    fail(`URL publica requerida invalida: ${key}`);
  }
}

pass('Configuracion, identificadores, URLs y assets de tienda verificados.');
