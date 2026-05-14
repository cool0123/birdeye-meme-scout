# Birdeye Meme Scout

A lightweight Solana token radar built with Birdeye Data Services.

Public reviewer demo: https://cool0123.github.io/birdeye-meme-scout/

## What it does

- Pulls new Solana listings from Birdeye `/defi/v2/tokens/new_listing`.
- Scores tokens with a simple liquidity and market-activity heuristic.
- Tracks server-side Birdeye API call count during local testing.
- Includes optional extensions for trending and token-security data when the API plan allows access.
- Falls back to a static reviewer demo on GitHub Pages so judges can inspect the product flow without a private API key.

## Run locally

```bash
cp .env.example .env
```

Add your Birdeye API key to `.env`, or paste it into the local in-memory key field:

```bash
BIRDEYE_API_KEY=your_key_here
```

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:5173
```

## API key handling

The API key is only read by `server.mjs`. The browser never receives the key.

The public GitHub Pages demo uses sample tokens only. Live Birdeye API calls run through the local Node server with `BIRDEYE_API_KEY`.

## Contact

- Telegram: `https://t.me/cool0123`
