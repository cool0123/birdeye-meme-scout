# Birdeye Meme Scout

A lightweight Solana token radar built with Birdeye Data Services.

## What it does

- Pulls new Solana listings from Birdeye `/defi/v2/tokens/new_listing`.
- Scores tokens with a simple liquidity and market-activity heuristic.
- Tracks server-side Birdeye API call count during local testing.
- Includes optional extensions for trending and token-security data when the API plan allows access.

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

## Contact

- Telegram: `https://t.me/cool0123`
