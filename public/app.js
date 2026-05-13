const state = {
  trending: [],
  newListings: []
};

const els = {
  keyStatus: document.querySelector('#key-status'),
  callCount: document.querySelector('#call-count'),
  trendingList: document.querySelector('#trending-list'),
  newList: document.querySelector('#new-list'),
  securityOutput: document.querySelector('#security-output'),
  cardTemplate: document.querySelector('#token-card-template')
};

document.querySelector('#refresh-trending').addEventListener('click', loadTrending);
document.querySelector('#refresh-new').addEventListener('click', loadNewListings);
document.querySelector('#run-usage-check').addEventListener('click', runApiUsageCheck);
document.querySelector('#key-form').addEventListener('submit', setRuntimeKey);

await refreshStatus();
setLoading(els.trendingList, 'Optional endpoint. Click Refresh Trending to check availability for the current API key.');
await loadNewListings();

async function refreshStatus() {
  const status = await request('/api/status');
  els.keyStatus.textContent = status.hasApiKey ? 'Birdeye API connected' : 'Missing local API key';
  els.callCount.textContent = `${status.apiCallCount} API calls`;
}

async function setRuntimeKey(event) {
  event.preventDefault();
  const input = document.querySelector('#api-key-input');
  const apiKey = input.value.trim();
  if (!apiKey) return;

  await request('/api/key?set=true', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });

  input.value = '';
  await refreshStatus();
  await loadNewListings();
}

async function loadTrending() {
  try {
    setLoading(els.trendingList, 'Loading trending tokens...');
    const response = await request('/api/trending?limit=20&sort_by=rank&sort_type=asc');
    state.trending = extractTokens(response.data);
    renderTokens(els.trendingList, state.trending);
    updateCallCount(response.apiCallCount);
  } catch (error) {
    setLoading(els.trendingList, `Trending endpoint unavailable: ${error.message}`);
  }
}

async function loadNewListings() {
  try {
    setLoading(els.newList, 'Loading new listings...');
    const response = await request('/api/new-listings?limit=20&meme_platform_enabled=true');
    state.newListings = extractTokens(response.data);
    renderTokens(els.newList, state.newListings);
    updateCallCount(response.apiCallCount);
  } catch (error) {
    setLoading(els.newList, error.message);
  }
}

async function runApiUsageCheck() {
  let successCount = 0;
  let errorCount = 0;

  els.securityOutput.textContent = 'Running Birdeye API usage check with rate-limit protection...';

  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await request('/api/new-listings?limit=20&meme_platform_enabled=true');
      successCount += 1;
      updateCallCount(response.apiCallCount);
    } catch {
      errorCount += 1;
    }

    els.securityOutput.textContent = `API usage check progress: ${i + 1}/50 requests. Success: ${successCount}. Errors: ${errorCount}.`;
    if (i < 49) await sleep(1100);
  }

  await refreshStatus();
  els.securityOutput.textContent = `API usage check completed. Success: ${successCount}. Errors: ${errorCount}. The counter shows Birdeye API calls made in this server session.`;
}

function renderTokens(container, tokens) {
  container.textContent = '';

  if (!tokens.length) {
    setLoading(container, 'No tokens returned. Check the API key plan or try again later.');
    return;
  }

  for (const token of tokens) {
    const card = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const logo = card.querySelector('.token-logo');
    logo.src = token.logoURI || makeFallbackLogo(token.symbol || '?');
    logo.onerror = () => {
      logo.src = makeFallbackLogo(token.symbol || '?');
    };
    card.querySelector('.token-symbol').textContent = token.symbol || 'UNKNOWN';
    card.querySelector('.token-name').textContent = token.name || token.address || 'Unnamed token';
    card.querySelector('.liquidity').textContent = `Liquidity ${formatUsd(token.liquidity)}`;
    card.querySelector('.volume').textContent = `24h Vol ${formatUsd(token.volume24hUSD || token.v24hUSD)}`;
    card.querySelector('.score').textContent = `Scout ${scoreToken(token)}`;
    card.addEventListener('click', () => loadSecurity(token));
    container.appendChild(card);
  }
}

async function loadSecurity(token) {
  if (!token.address) {
    els.securityOutput.textContent = 'Selected token has no address in the Birdeye response.';
    return;
  }

  try {
    els.securityOutput.textContent = `Loading security snapshot for ${token.symbol || token.address}...`;
    const response = await request(`/api/security?address=${encodeURIComponent(token.address)}`);
    updateCallCount(response.apiCallCount);
    els.securityOutput.textContent = JSON.stringify({ token: token.symbol || token.name, address: token.address, security: response.data }, null, 2);
  } catch (error) {
    els.securityOutput.textContent = `Security endpoint unavailable for this key: ${error.message}`;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function extractTokens(payload) {
  if (Array.isArray(payload?.data?.tokens)) return payload.data.tokens;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.tokens)) return payload.tokens;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function scoreToken(token) {
  const liquidity = Number(token.liquidity || 0);
  const volume = Number(token.volume24hUSD || token.v24hUSD || 0);
  const rank = Number.isFinite(Number(token.rank)) ? Number(token.rank) : 999;
  const liquidityScore = Math.min(40, Math.log10(liquidity + 1) * 7);
  const volumeScore = Math.min(40, Math.log10(volume + 1) * 6);
  const rankScore = Math.max(0, 20 - rank);
  return Math.round(liquidityScore + volumeScore + rankScore);
}

function formatUsd(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(number);
}

function setLoading(container, text) {
  container.innerHTML = `<div class="token-card">${escapeHtml(text)}</div>`;
}

function updateCallCount(count) {
  els.callCount.textContent = `${count} API calls`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeFallbackLogo(symbol) {
  const safeSymbol = String(symbol).slice(0, 4).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84"><rect width="84" height="84" rx="42" fill="#ffd84d"/><text x="42" y="49" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#071018">${escapeHtml(safeSymbol)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
