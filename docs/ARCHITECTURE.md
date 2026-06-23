# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│  index.html (static shell)                              │
│  ├── styles.css                                         │
│  └── app.js (state + render + plan engine)              │
├─────────────────────────────────────────────────────────┤
│  localStorage ←→ normalizeState / saveState             │
│       │                                                 │
│       └── logged in: /api/state ←→ Vercel Postgres      │
├─────────────────────────────────────────────────────────┤
│  sw.js (network-first cache) ← manifest.webmanifest     │
└─────────────────────────────────────────────────────────┘
```

Default persistence is browser `localStorage` keyed `strength-deck-state-v1`. On Vercel, optional server sync is available through `api/` serverless functions and Postgres.

## User Flows

### Onboarding

1. Open app → default user "나" with `defaultProfile`.
2. My Page → save profile (nickname, body stats, goal, recovery).
3. 1RM tab → enter lifts → `buildPlan()` → redirect to Plan tab.
4. Today tab shows week 1 session 0 + nutrition estimate.

### Daily Session

1. Today shows `user.plan.sessions[0]` (always first session of current week block in UI; week 1 day 0).
2. User checks each set → stored in `todayChecks[isoDate][checkId]`.
3. All sets checked → "오늘 스트렝스 완료" enabled.
4. Complete → `completedDates`, `history` entry, confetti → Calendar tab.

### Multi-User

- Users in `state.users`; `activeUserId` selects context.
- Switch via My Page → 사용자 전환.
- Minimum 1 user enforced on delete.
- Export/import wraps full `state` object.

### Account Sync

1. My Page → 로그인 / 동기화.
2. Register or log in with ID/password.
3. Server state exists → pull into `localStorage`.
4. Server state empty → upload current device state.
5. Later `saveState()` calls persist locally and debounce `PUT /api/state`.

## Plan Engine (Summary)

`buildPlan(profile, maxes)` returns:

```js
{
  title, summary, metrics,
  weeks: [{ week, name, range, note }],
  sessions: [...],           // week 1 sessions (for "today")
  weekSessions: [[...], ...] // 4 weeks × N sessions
}
```

Session count per week depends on sport load:

- CrossFit / ≥5 days/week → 2 sessions/week
- ≥4 days → 3 sessions
- else → 2 sessions

Volume bias from `recovery` and sport load adjusts base set count (3–5).

Full prescription tables: [PROGRAM-LOGIC.md](PROGRAM-LOGIC.md).

## PWA & Caching

### manifest.webmanifest

- `display: standalone`, `theme_color` / `background_color: #121212`
- Single SVG icon (maskable)

### sw.js

- **Strategy**: network-first with cache fallback
- **Assets**: `./`, `index.html`, `update.html`, `styles.css`, `app.js`, `manifest`, `icon.svg`
- **Updates**: `registration.update()` on load; `controllerchange` triggers reload
- **Version**: bump `CACHE_NAME` when static assets change

### update.html

Recovery path when stale SW/cache breaks UI. Unregisters SW, clears caches, redirects to `index.html?refresh=…`. Does **not** clear `localStorage`.

## Development

```bash
node dev-server.mjs              # http://127.0.0.1:4173
# or
start-mobile-server.cmd          # HOST=0.0.0.0 PORT=4174 (LAN testing)
```

Service worker requires http(s) — use dev server, not `file://`.

## Deployment

### GitHub Pages

GitHub Actions (`.github/workflows/pages.yml`):

- Trigger: push to `main` or manual dispatch
- Uploads repository root as static artifact
- `.nojekyll` present for Jekyll bypass

Post-deploy: iPhone Safari → Share → Add to Home Screen for installed PWA experience.

GitHub Pages supports the offline/local-only app, but not login sync because `api/` serverless routes do not run there.

### Vercel

- Static assets are served from the repository root.
- Serverless functions live in `api/`.
- `@neondatabase/serverless` reads `DATABASE_URL` or compatible `POSTGRES_*` environment variables supplied by Neon/Postgres.
- `vercel.json` disables a frontend build so the existing static PWA remains the deployed app.

## Render Architecture

Imperative DOM updates — no virtual DOM.

| Function | Target DOM |
|----------|------------|
| `renderNutrition` | `#nutritionCard` |
| `renderTodaySession` | `#todaySession`, `#todayHint`, complete buttons |
| `renderPlan` | `#planTitle`, `#metricRow`, `#weekList`, `#dateTabs`, `#programList` |
| `renderHistory` | `#historyList` |
| `renderCalendar` | `#calendarGrid`, `#calendarDetail` |
| `renderUsers` | `#userCardList` |

`hydrateForms()` syncs form fields from `activeUser()` after load/switch/save.

## Extension Points

Safe extension areas:

- New lifts in `lifts` + `weekPlans` templates
- Additional profile-driven plan modifiers in `buildPlan()`
- Extra history fields (ensure import backward compatibility)
- New drawer sub-view following `data-drawer-view-panel` pattern

Risky without migration:

- Renaming `STORAGE_KEY` or user object shape
- Changing `sessions[0]` semantics for "today" without updating completion flow
