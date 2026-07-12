import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const DEFAULT_BASE_URL = 'http://127.0.0.1:4174';
const BASE_URL = process.env.HAIKY_VISUAL_BASE_URL || DEFAULT_BASE_URL;
const TEMP_ROOT = process.env.HAIKY_VISUAL_TMP || 'C:\\tmp';
const OUTPUT_DIR = path.join(
  ROOT,
  'docs2',
  'auditoria-assets-comercial-haiky-2026',
  'evidencia-visual',
);
const JSON_OUTPUT = path.join(
  ROOT,
  'docs2',
  'auditoria-assets-comercial-haiky-2026',
  'VISUAL_QA_JSON.json',
);
const MD_OUTPUT = path.join(
  ROOT,
  'docs2',
  'auditoria-assets-comercial-haiky-2026',
  'VISUAL_QA.md',
);

const scenarios = [
  {
    id: 'landing-desktop',
    fileName: '01-landing-desktop.png',
    pathName: '/',
    width: 1440,
    height: 1100,
    mobile: false,
  },
  {
    id: 'login-desktop',
    fileName: '02-login-desktop.png',
    pathName: '/login',
    width: 1440,
    height: 1100,
    mobile: false,
  },
  {
    id: 'landing-mobile',
    fileName: '03-landing-mobile.png',
    pathName: '/',
    width: 390,
    height: 1200,
    mobile: true,
  },
  {
    id: 'login-mobile',
    fileName: '04-login-mobile.png',
    pathName: '/login',
    width: 390,
    height: 1200,
    mobile: true,
  },
];

function findEdgeExecutable() {
  const candidates = [
    process.env.EDGE_BIN,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  const edgePath = candidates.find((candidate) => existsSync(candidate));
  if (!edgePath) {
    throw new Error('Microsoft Edge executable was not found. Set EDGE_BIN to override.');
  }
  return edgePath;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function connectCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    if (message.method && events.has(message.method)) {
      const listeners = events.get(message.method).splice(0);
      listeners.forEach((listener) => listener(message.params));
    }
  });

  function send(method, params = {}, timeoutMs = 60000) {
    const commandId = ++id;
    ws.send(JSON.stringify({ id: commandId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(commandId, { resolve, reject });
      setTimeout(() => {
        if (pending.has(commandId)) {
          pending.delete(commandId);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, timeoutMs);
    });
  }

  function once(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const listener = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      const listeners = events.get(method) || [];
      listeners.push(listener);
      events.set(method, listeners);
    });
  }

  return {
    send,
    once,
    close: () => ws.close(),
  };
}

async function launchBrowser() {
  const debugPort = await getFreePort();
  const profileDir = path.join(existsSync(TEMP_ROOT) ? TEMP_ROOT : os.tmpdir(), `sknomina-visual-${Date.now()}`);
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });

  const edge = spawn(findEdgeExecutable(), [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-features=Translate,OptimizationHints',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  });

  edge.unref();
  const listUrl = `http://127.0.0.1:${debugPort}/json/list`;
  const targets = await waitForJson(listUrl, 30000);
  const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error('No page target exposed by Edge.');

  return {
    client: await connectCdp(pageTarget.webSocketDebuggerUrl),
    dispose: async () => {
      try {
        edge.kill('SIGTERM');
      } catch {
        // Best effort cleanup only.
      }
      await sleep(500);
      try {
        rmSync(profileDir, { recursive: true, force: true });
      } catch {
        // Edge can keep profile handles for a short time on Windows.
      }
    },
  };
}

function absoluteUrl(pathName) {
  return new URL(pathName, BASE_URL).href;
}

async function runScenario(client, scenario) {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: 1,
    mobile: scenario.mobile,
  });

  if (scenario.mobile) {
    await client.send('Emulation.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
  } else {
    await client.send('Emulation.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    });
  }

  const load = client.once('Page.loadEventFired').catch(() => null);
  await client.send('Page.navigate', { url: absoluteUrl(scenario.pathName) });
  await load;
  await waitForAppReady(client);

  const evaluation = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
      const viewportWidth = window.innerWidth;
      const brandImages = Array.from(document.images)
        .filter((img) => /sknomina|icon-512|brand/i.test(img.currentSrc || img.src || '') || /SKNOMINA/i.test(img.alt || ''))
        .map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            alt: img.alt || '',
            src: img.currentSrc || img.src || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible: rect.width >= 32 && rect.height >= 32 && rect.bottom > 0 && rect.right > 0
          };
        });
      const text = body ? body.innerText : '';
      return {
        url: location.href,
        title: document.title,
        viewportWidth,
        scrollWidth,
        horizontalOverflow: Math.max(0, scrollWidth - viewportWidth),
        brandVisible: brandImages.some((image) => image.visible),
        brandImages,
        hasCookieCopy: /Usamos cookies necesarias/.test(text),
        hasPrimaryCta: /Empezar prueba|Ingresar a la PWA|Iniciar sesion|Iniciar sesi/.test(text),
        bodyLength: text.length
      };
    })()`,
  });

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const outputPath = path.join(OUTPUT_DIR, scenario.fileName);
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));

  const metrics = evaluation.result.value;
  const findings = [];
  if (!metrics.brandVisible) findings.push('brand-not-visible');
  if (metrics.horizontalOverflow > 2) findings.push(`horizontal-overflow-${metrics.horizontalOverflow}px`);
  if (!metrics.hasPrimaryCta) findings.push('primary-cta-not-detected');

  return {
    ...scenario,
    outputPath,
    metrics,
    findings,
    ok: findings.length === 0,
  };
}

async function waitForAppReady(client, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const readiness = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const text = document.body ? document.body.innerText : '';
        const brandImage = Array.from(document.images).some((img) =>
          /sknomina|icon-512|brand/i.test(img.currentSrc || img.src || '') || /SKNOMINA/i.test(img.alt || '')
        );
        return {
          readyState: document.readyState,
          bodyLength: text.length,
          brandImage
        };
      })()`,
    });
    const value = readiness.result.value;
    if (value.readyState === 'complete' && value.bodyLength > 50 && value.brandImage) {
      await sleep(350);
      return;
    }
    await sleep(250);
  }
}

function renderMarkdown(results) {
  const rows = results
    .map((result) => (
      `| ${result.id} | ${result.width}x${result.height} | ${result.ok ? 'PASS' : 'FAIL'} | ` +
      `${result.metrics.horizontalOverflow}px | ${result.metrics.brandVisible ? 'si' : 'no'} | ${result.fileName} |`
    ))
    .join('\n');

  const failures = results.filter((result) => !result.ok);
  return [
    '# QA visual de marca SKNOMINA',
    '',
    `Base URL: ${BASE_URL}`,
    '',
    '| Escenario | Viewport | Estado | Overflow horizontal | Logo visible | Evidencia |',
    '| --- | ---: | --- | ---: | --- | --- |',
    rows,
    '',
    failures.length
      ? `Resultado: FAIL. Hallazgos: ${failures.map((result) => `${result.id} (${result.findings.join(', ')})`).join('; ')}.`
      : 'Resultado: PASS. No se detecto overflow horizontal ni perdida visible del logo en los escenarios capturados.',
    '',
  ].join('\n');
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const { client, dispose } = await launchBrowser();
  const results = [];

  try {
    for (const scenario of scenarios) {
      results.push(await runScenario(client, scenario));
    }
  } finally {
    client.close();
    await dispose();
  }

  const payload = {
    ok: results.every((result) => result.ok),
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    results,
  };
  writeFileSync(JSON_OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  writeFileSync(MD_OUTPUT, renderMarkdown(results), 'utf8');

  console.log(JSON.stringify({
    ok: payload.ok,
    baseUrl: BASE_URL,
    scenarios: results.length,
    findings: results.flatMap((result) => result.findings.map((finding) => `${result.id}:${finding}`)),
  }, null, 2));

  if (!payload.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
