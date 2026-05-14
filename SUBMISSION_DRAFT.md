# Superteam Submission Draft

## Project Name

Birdeye Meme Scout

## Short Description

A lightweight Solana token radar for reviewing fresh token launches with Birdeye Data.

## What It Does

- Shows newly listed Solana tokens with the meme platform filter enabled.
- Calculates a simple scout score from liquidity and market activity.
- Tracks the number of Birdeye API calls made during the current server session.
- Keeps the Birdeye API key server-side instead of exposing it in the browser.

## Birdeye Endpoints Used

- `/defi/v2/tokens/new_listing`
- `/defi/token_trending` as an optional extension when plan access allows it.
- `/defi/token_security` as an optional extension when plan access allows it.

## Tech Stack

- Node.js server-side API proxy
- Vanilla HTML/CSS/JavaScript frontend
- Birdeye Data Services API

## English Submission Text

Hi Birdeye Data team,

I built Birdeye Meme Scout, a lightweight Solana token radar for reviewing fresh token launches with Birdeye Data.

What it does:
- Pulls new Solana listings with meme-platform filtering enabled.
- Computes a simple scout score based on liquidity and market activity.
- Keeps the Birdeye API key on the server side instead of exposing it in the browser.
- Tracks server-side Birdeye API call count during testing.

Birdeye endpoints used:
- /defi/v2/tokens/new_listing
- /defi/token_trending and /defi/token_security are wired as optional extensions depending on API plan access.

Tech stack:
- Node.js server proxy
- Vanilla HTML/CSS/JavaScript frontend
- Birdeye Data Services API

Links:
- GitHub: [add GitHub repo link]
- Demo: [add deployed or local demo link]
- X post: [add X post link]

Telegram: https://t.me/cool0123
