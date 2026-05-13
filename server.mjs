import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 5173);
let apiCallCount = 0;
let runtimeApiKey = '';

await loadEnvFile();

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8']
]);

const server = http.createServer(async (req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url || '/', `http://${req.headers.host}`);

    if (requestUrl.pathname.startsWith('/api/')) {
      await handleApi(requestUrl, req, res);
      return;
    }

    await serveStatic(requestUrl.pathname, res);
  } catch (error) {
    sendJson(res, requestUrl?.pathname.startsWith('/api/') ? 200 : 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error'
    });
  }
});

server.listen(port, () => {
  console.log(`Birdeye Meme Scout running at http://localhost:${port}`);
});

async function loadEnvFile() {
  const envPath = path.join(root, '.env');
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function handleApi(requestUrl, req, res) {
  if (requestUrl.pathname === '/api/status') {
    sendJson(res, 200, {
      ok: true,
      hasApiKey: Boolean(getApiKey()),
      apiCallCount
    });
    return;
  }

  if (requestUrl.pathname === '/api/key') {
    if (requestUrl.searchParams.get('clear') === 'true') {
      runtimeApiKey = '';
      sendJson(res, 200, { ok: true, hasApiKey: Boolean(getApiKey()) });
      return;
    }

    if (!requestUrl.searchParams.has('set')) {
      sendJson(res, 405, { ok: false, error: 'Use POST /api/key?set=true to set a runtime key' });
      return;
    }

    const payload = await readJsonBody(req);
    const apiKey = String(payload.apiKey || '').trim();
    if (!apiKey) {
      sendJson(res, 400, { ok: false, error: 'API key is required' });
      return;
    }
    runtimeApiKey = apiKey;
    sendJson(res, 200, { ok: true, hasApiKey: true });
    return;
  }

  if (requestUrl.pathname === '/api/trending') {
    const data = await birdeye('/defi/token_trending', {
      sort_by: requestUrl.searchParams.get('sort_by') || 'rank',
      sort_type: requestUrl.searchParams.get('sort_type') || 'asc',
      offset: requestUrl.searchParams.get('offset') || '0',
      limit: clampLimit(requestUrl.searchParams.get('limit'), 20)
    });
    sendJson(res, 200, normalizeResponse(data));
    return;
  }

  if (requestUrl.pathname === '/api/new-listings') {
    const data = await birdeye('/defi/v2/tokens/new_listing', {
      time_to: requestUrl.searchParams.get('time_to') || Math.floor(Date.now() / 1000).toString(),
      limit: clampLimit(requestUrl.searchParams.get('limit'), 20),
      meme_platform_enabled: requestUrl.searchParams.get('meme_platform_enabled') || 'true'
    });
    sendJson(res, 200, normalizeResponse(data));
    return;
  }

  if (requestUrl.pathname === '/api/security') {
    const address = requestUrl.searchParams.get('address');
    if (!address) {
      sendJson(res, 400, { ok: false, error: 'Missing token address' });
      return;
    }
    const data = await birdeye('/defi/token_security', { address });
    sendJson(res, 200, normalizeResponse(data));
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Unknown API route' });
}

async function birdeye(endpointPath, params) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('BIRDEYE_API_KEY is missing. Create a local .env file from .env.example.');
  }

  const endpoint = new URL(`https://public-api.birdeye.so${endpointPath}`);
  for (const [key, value] of Object.entries(params)) {
    endpoint.searchParams.set(key, String(value));
  }

  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'x-chain': 'solana',
      'X-API-KEY': apiKey
    }
  });

  apiCallCount += 1;
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Birdeye API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': mimeTypes.get(ext) || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

function normalizeResponse(data) {
  return {
    ok: true,
    apiCallCount,
    source: 'birdeye',
    data
  };
}

function getApiKey() {
  return runtimeApiKey || process.env.BIRDEYE_API_KEY || '';
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function clampLimit(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return String(fallback);
  return String(Math.max(1, Math.min(20, Math.floor(parsed))));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}
