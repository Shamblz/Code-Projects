# Athena Chips

A Texas Hold'em chip-tracking companion. Bring your own deck — Athena handles
chips, blinds, pots, and side pots so friends can play poker anywhere without
physical chips.

- Mobile-first: every player joins from their phone via a 4-letter game code
  or QR
- Real-time sync over WebSockets (Socket.io)
- Side-pot math, blind/dealer rotation, all-in handling, rebuys
- Host declares the winner at showdown (with split-pot support)
- Vegas styling: green felt, gold accents, art deco fonts

## Stack

- Next.js 14 (App Router) + TypeScript
- Socket.io on a custom Node HTTP server
- In-memory game store (no DB — games are ephemeral)
- Tailwind CSS + Framer Motion
- Vitest for engine unit tests

## Local development

```bash
npm install
npm run dev   # http://localhost:3000
```

Two-phone test: open the URL from another device on your LAN
(`http://<your-lan-ip>:3000`) and join with the game code.

## Tests

```bash
npm test           # game engine unit tests
node scripts/smoke.mjs   # end-to-end socket smoke test (server must be running)
```

## Deploying to Fly.io

```bash
fly launch --copy-config --no-deploy
fly deploy
```

The app needs a single persistent VM (state is in-memory). The included
`fly.toml` sets `min_machines_running = 1` and disables auto-stop.

## Project layout

```
server.ts               Node entrypoint — Next + Socket.io
src/game/               Pure game engine (state machine, side pots)
src/server/             Socket handlers, in-memory store, per-game mutex
src/client/             Socket hook, identity persistence
src/app/                Next.js App Router pages
src/components/         Vegas-themed UI components
```
