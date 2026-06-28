import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extraArgs = process.argv.slice(2);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function isPrivateLan(ip) {
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;

  const match = ip.match(/^172\.(\d+)\./);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function interfacePenalty(name) {
  return /tailscale|zerotier|vpn|virtual|vmware|hyper-v|wsl|docker|bluetooth/i.test(name) ? 10 : 0;
}

function pickLanAddress() {
  const entries = Object.entries(os.networkInterfaces())
    .flatMap(([name, addresses = []]) => addresses.map((address) => ({ name, ...address })))
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .filter((address) => isPrivateLan(address.address))
    .sort((left, right) => interfacePenalty(left.name) - interfacePenalty(right.name));

  return entries[0]?.address || '';
}

const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || pickLanAddress();
const env = { ...process.env };

if (hostname) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
  env.EXPO_PUBLIC_API_URL = env.EXPO_PUBLIC_API_URL || `http://${hostname}:3000/api`;
  console.log(`[NOMINA-EC] Expo LAN host: ${hostname}`);
  console.log(`[NOMINA-EC] API movil: ${env.EXPO_PUBLIC_API_URL}`);
} else {
  console.warn('[NOMINA-EC] No se detecto una IP LAN privada. Expo usara su seleccion automatica.');
}

const args = ['start', '--lan', '-c', ...extraArgs];
const expoCli = path.resolve(scriptDir, '../../node_modules/expo/bin/cli');
const child = spawn(process.execPath, [expoCli, ...args], {
  env,
  shell: false,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
