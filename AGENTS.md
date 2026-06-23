# Strength Deck — Agent Codex

모바일 우선 PWA. 1RM 기반 스트렝스 처방, 오늘 세션 추적, 로컬 히스토리, 다중 사용자, JSON 백업/복원.

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | Vanilla HTML + CSS + JS (no framework) |
| Storage | `localStorage` (`strength-deck-state-v1`) |
| PWA | `manifest.webmanifest` + `sw.js` (network-first cache) |
| Deploy | GitHub Pages (static root) |
| Dev server | `dev-server.mjs` (Node http, port 4173) |

## File Map

```
index.html      # Shell: 4 tabs, profile drawer, toast/confetti
app.js          # State, plan builder, render, persistence
styles.css      # Design tokens + Spotify-inspired dark UI
sw.js           # Service worker (bump CACHE_NAME on asset changes)
manifest.webmanifest
icon.svg
update.html     # Cache/SW recovery page (preserves localStorage)
dev-server.mjs  # Local static server
```

## Navigation Model

Bottom app bar switches `.step-panel` via `showStep()`:

| Step | ID | Purpose |
|------|-----|---------|
| 오늘 | `todayStep` | Today's session, nutrition, completion, history |
| 1RM | `maxesStep` | Enter maxes → rebuild plan |
| 계획 | `planStep` | 4-week block, week/day picker |
| 달력 | `calendarStep` | Completion calendar + detail |

Profile drawer (`#profileDrawer`) has sub-views: `profile`, `users`, `data`.

## State Shape

```js
{
  users: [{
    id, profile, maxes, plan, history,
    completedDates: { "YYYY-MM-DD": true },
    todayChecks: { "YYYY-MM-DD": { "liftName-0": true } }
  }],
  activeUserId
}
```

See [docs/DATA-MODEL.md](docs/DATA-MODEL.md) for field details and [docs/PROGRAM-LOGIC.md](docs/PROGRAM-LOGIC.md) for prescription rules.

## Render Pipeline

`renderAll()` → `renderUsers`, `renderPlan`, `renderNutrition`, `renderTodaySession`, `renderHistory`, `renderCalendar`, `renderCalendarNavState`.

After any state mutation: `saveState()` → optional toast → `renderAll()` (or targeted render).

## Conventions (Must Follow)

### Design

- Dark theme only. Tokens in `:root` — see [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).
- Accent: `#1ed760` (`--green`). Never introduce new primary colors.
- Buttons: pill (`border-radius: 500px`) for primary/secondary; cards use `8px`.
- Typography: `.eyebrow` (green, uppercase, 12px) + `h1`/`h2`/`h3` hierarchy.
- Korean UI copy; English only for section labels (Today, One Rep Max, Calendar, My Page).

### HTML

- Semantic sections; `aria-label` on icon-only buttons.
- New screens go inside `.app-shell` or profile drawer — do not break bottom app bar layout.
- Inline SVG icons: `viewBox="0 0 24 24"`, stroke style matching existing nav icons.

### JavaScript

- Single file `app.js`; no modules/build step.
- DOM queries at top; event listeners wired once.
- HTML via template strings in `render*` functions — match existing class names.
- Weights: `roundLoad()` (kg → 0.5 step, lb → 5 step). Unit conversion via `convertStoredWeights()`.
- Plan rebuild: `rebuildPlanIfPossible()` when profile/maxes change.

### Service Worker

When changing cached assets, increment `CACHE_NAME` in `sw.js` (currently `strength-deck-v20`).

## Common Tasks

| Task | Where to change |
|------|-----------------|
| Add lift | `lifts` map, `#maxForm` labels, `buildSessions()` prescriptions |
| Adjust week template | `buildWeeks()`, `buildSessions()` weekPlans |
| New profile field | `defaultProfile`, `normalizeProfile()`, `#profileForm`, `buildPlan()` if used |
| New tab | Add `step-panel`, appbar button `data-step`, entry in `panels` + `showStep` |
| Styling component | `styles.css` — reuse `.panel`, `.exercise-card`, `.set-row`, `.badge` |

## Do Not

- Add npm dependencies or a bundler without explicit request.
- Store data on a server — app is fully offline-first.
- Change `STORAGE_KEY` without migration logic.
- Use light theme or non-token colors in main UI.

## Design System Harness

React + TS + Tailwind v4 + Storybook 8 변환 작업 시 **[CODEX.md](CODEX.md)** 와 `.codex/` 하네스를 우선 따릅니다.

## Docs Index

- [CODEX.md](CODEX.md) — design system harness (Figma → React)
- [docs/DESIGN.md](docs/DESIGN.md) — brand, composition, Figma naming
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) — tokens, components, layout
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — flows, PWA, deployment
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) — storage schema, import/export
- [docs/PROGRAM-LOGIC.md](docs/PROGRAM-LOGIC.md) — 4-week prescription algorithm
