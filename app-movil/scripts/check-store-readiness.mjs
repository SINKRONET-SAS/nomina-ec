import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const appConfig = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function getPluginConfig(pluginName) {
  for (const plugin of appConfig.plugins || []) {
    if (plugin === pluginName) {
      return {};
    }
    if (Array.isArray(plugin) && plugin[0] === pluginName) {
      return plugin[1] || {};
    }
  }
  return null;
}

function fail(message) {
  console.error(`[LPA26-STORES] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[LPA26-STORES] ${message}`);
}

function pngDimensions(asset) {
  const buffer = readFileSync(join(root, asset));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    fail(`Asset PNG invalido: ${asset}`);
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

if (appConfig.splash) {
  fail('expo.splash es legacy y no debe declararse en SDK 57; usa el plugin expo-splash-screen.');
}

const splashPlugin = getPluginConfig('expo-splash-screen');
if (!splashPlugin) {
  fail('expo-splash-screen debe configurar el splash screen de tienda.');
}

if (
  splashPlugin.image !== './assets/splash.png'
  || splashPlugin.resizeMode !== 'contain'
  || splashPlugin.backgroundColor !== '#ecfdf5'
  || splashPlugin.enableFullScreenImage_legacy !== true
) {
  fail('expo-splash-screen debe preservar splash.png, resizeMode contain, fondo de marca y full screen legacy.');
}

const expoVersion = String(packageJson.dependencies?.expo || packageJson.devDependencies?.expo || '');
const expoSdkMajor = Number.parseInt(expoVersion.match(/\d+/)?.[0] || '', 10);
if (!Number.isInteger(expoSdkMajor) || expoSdkMajor < 54) {
  fail('Expo SDK debe ser 54 o superior para cumplir target Android 35 en builds de tienda.');
}

if (!appConfig.ios?.buildNumber) {
  fail('ios.buildNumber no esta definido.');
}

if (!packageJson.dependencies?.['expo-splash-screen']) {
  fail('expo-splash-screen debe estar declarado como dependencia.');
}

if (appConfig.userInterfaceStyle && !packageJson.dependencies?.['expo-system-ui']) {
  fail('expo-system-ui debe estar declarado cuando userInterfaceStyle esta configurado.');
}

const requiredAssets = [
  appConfig.icon,
  splashPlugin.image,
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

assertPngDimensions(appConfig.icon, 1024, 1024);
assertPngDimensions(appConfig.android?.adaptiveIcon?.foregroundImage, 1024, 1024);
assertPngDimensions('./assets/notification-icon.png', 512, 512);

for (const key of ['privacyUrl', 'termsUrl', 'supportUrl', 'accountDeletionUrl']) {
  if (!appConfig.extra?.[key]?.startsWith('https://')) {
    fail(`URL publica requerida invalida: ${key}`);
  }
}

pass('Configuracion, identificadores, URLs y assets de tienda verificados.');
