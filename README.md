# Athena Chips

A Texas Hold'em chip-tracking companion. Bring your own deck — Athena handles
chips, blinds, pots, and side pots so friends can play poker anywhere without
physical chips.

- Mobile-first: every player joins from their phone via a 4-letter game code or QR
- Real-time sync over WebSockets (Socket.io)
- Side-pot math, blind/dealer rotation, all-in handling, rebuys
- Host declares the winner at showdown (with split-pot support)
- Vegas styling: green felt, gold accents, art deco fonts
- PWA-installable: "Add to Home Screen" on any phone

## Deploy

The app needs a host that supports persistent WebSocket connections and stays
warm (no sleeping). Free tiers with cold starts will break live games.

### Option 1 — Railway (recommended, ≈5 min, no terminal)

1. Push this repo to GitHub (already done if you're on the branch).
2. Go to **[railway.com](https://railway.com)** → sign up.
3. **New Project → Deploy from GitHub repo** → authorize → pick this repo.
4. Railway detects the `Dockerfile` and builds. First deploy takes ~2 min.
5. **Settings → Networking → Generate Domain** — you'll get a URL like
   `athena-chips-production.up.railway.app`.
6. Share that URL with your friends, or add a custom domain in
   **Settings → Custom Domain** (one-click Domain Connect for Cloudflare/GoDaddy).

Cost: $5/mo Hobby plan with a $5 monthly usage credit — small games fit inside
the credit.

### Option 2 — Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Click the button above (or push the repo and pick "New Web Service" on Render).
2. Connect GitHub, pick this repo. Render reads `render.yaml` and configures
   everything automatically (Docker build, port 3000, autoDeploy on push).
3. Settings → **Custom Domains** → paste your domain, add one CNAME at your
   registrar.

Cost: Starter plan at $7/mo (the free tier sleeps after 15 min — unusable for
live poker).

### Option 3 — Fly.io (cheapest, CLI required)

```bash
brew install flyctl  # or curl -L https://fly.io/install.sh | sh
fly auth signup
fly launch --copy-config --no-deploy
fly deploy
```

Cost: ~$2/mo for a 256MB shared-CPU always-on machine.

## Local development

```bash
npm install
npm run dev   # http://localhost:3000
```

To test with multiple phones on your local network, open
`http://<your-LAN-ip>:3000` from each device.

## Tests

```bash
npm test                       # 20 game-engine unit tests (Vitest)
node scripts/smoke.mjs         # End-to-end 3-client socket smoke test
                               # (start the dev server first)
```

## Generating new icons / OG image

If you tweak `public/icon.svg`, regenerate the PNGs:

```bash
node scripts/generate-icons.mjs
node scripts/generate-og.mjs
```

## Project layout

```
server.ts               Node entrypoint — Next + Socket.io on one HTTP server
src/game/               Pure game engine (state machine, side pots, rotation)
src/server/             Socket handlers, in-memory store, per-game mutex
src/client/             Socket hook, localStorage identity persistence
src/app/                Next.js App Router pages
src/components/         Vegas-themed UI components
public/                 Icons, PWA manifest, OG image
```

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Socket.io on a custom Node HTTP server
- In-memory game store — games are ephemeral, no DB needed
- Tailwind CSS + Framer Motion
- Vitest for engine tests
