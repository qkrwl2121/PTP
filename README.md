# Strength Deck

Mobile-first PWA for strength training planning, 1RM-based prescriptions, local workout history, and local data export/import.

## Features

- **오늘** — daily session with set checkboxes, nutrition guide, completion tracking
- **1RM** — six lifts (squat variants, deadlift, press, snatch, clean & jerk)
- **계획** — auto-generated 4-week block with week/day picker
- **달력** — completion calendar with session detail
- **마이페이지** — profile, multi-user, JSON backup/restore

## Quick Start

```bash
node dev-server.mjs
# → http://127.0.0.1:4173

# LAN / mobile testing (Windows)
start-mobile-server.cmd
# → http://0.0.0.0:4174
```

## Deploy on GitHub Pages

1. Push to GitHub (`main` branch).
2. Settings → Pages → Deploy from branch `main`, folder `/root`.
3. Open `https://<username>.github.io/<repo>/` on iPhone Safari.
4. Share → Add to Home Screen.

User data lives in browser storage for that URL. Back up via My Page → Data Export.

## Deploy on Vercel with Login Sync

This repo now includes Vercel Serverless API routes under `api/`:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`

Create a Neon Postgres database from the Vercel Marketplace, or connect any Postgres database. Set `DATABASE_URL` in Vercel project environment variables. Existing Vercel Postgres migrations can also use `POSTGRES_URL`.

Deployment flow:

```bash
npm install
vercel
```

The app still works offline with `localStorage`. When a user logs in, local changes are saved locally first and then synced to Postgres.

After deployment, open `/api/health`. A working sync server returns `{"ok":true,"database":"connected"}`.

## Design System Harness (React + Storybook)

Figma → code 변환용 Codex 하네스:

```bash
./install.sh          # hooks + npm install
npm run dev           # Storybook 8
npm run check:tokens  # 하드코딩 색상 감지
```

| Doc | Description |
|-----|-------------|
| [CODEX.md](CODEX.md) | Design system rules — tokens, 4-file structure, agents |
| [.codex/CODEX.md](.codex/CODEX.md) | 7-step work process |
| [docs/DESIGN.md](docs/DESIGN.md) | Brand, composition, Figma naming |

## Documentation (PWA App)

| Doc | Description |
|-----|-------------|
| [AGENTS.md](AGENTS.md) | AI agent codex — Vanilla PWA conventions |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colors, typography, components |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flows, PWA, deployment |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Storage schema, import/export |
| [docs/PROGRAM-LOGIC.md](docs/PROGRAM-LOGIC.md) | 4-week prescription algorithm |

## Troubleshooting

If buttons stop working or an old version persists after deploy, open [update.html](update.html) to clear the service worker cache (local data is preserved).
