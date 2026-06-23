# Design System

Strength Deck uses a **Spotify-inspired dark UI**: high contrast, green accent, pill controls, card surfaces.

## Color Tokens

Defined in `styles.css` `:root`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#121212` | Page background, theme-color |
| `--surface` | `#181818` | Cards, drawer panel |
| `--surface-2` | `#1f1f1f` | Inputs, secondary buttons, set rows |
| `--surface-3` | `#252525` | Gradients |
| `--text` | `#ffffff` | Primary text, active nav fill |
| `--muted` | `#b3b3b3` | Body secondary, hints |
| `--soft` | `#cbcbcb` | Label text |
| `--green` | `#1ed760` | Accent, primary CTA, badges, today marker |
| `--border` | `#4d4d4d` | Rare borders |
| `--shadow` | `rgba(0,0,0,0.5) 0 8px 24px` | Elevated surfaces |

Semantic (not tokenized, use sparingly):

- Danger: `#f3727f` (`.danger-action`, delete, undo)
- Disabled primary: `#3a3a3a` / `#8f8f8f`

Confetti palette: `#1ed760`, `#ffffff`, `#539df5`, `#ffa42b`, `#f3727f`.

## Typography

```css
--font: SpotifyMixUI, "Helvetica Neue", Helvetica, Arial,
        "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
```

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| `.eyebrow` | 12px | 700 | Uppercase, letter-spacing 1.4px, `--green` |
| `h1` | 30px (clamp 28–42 on today) | default | line-height ~1.05 |
| `h2` | 24px | default | |
| `h3` | 18px | default | |
| Labels `label span` | 12px | 700 | `--soft` |
| `.primary` / `.secondary` | 14px | 700 | Uppercase, letter-spacing 1.4px |
| Muted body | 14px | normal | `--muted`, line-height 1.45 |

## Spacing & Layout

- **App shell**: `max-width 960px`, horizontal padding 14px (24px ≥760px), bottom padding 112px for fixed nav.
- **Card padding**: 22px (compact week card: 16px).
- **Grid gaps**: 16px forms, 14px lists, 10px set rows.
- **Section rhythm**: 16–22px between major blocks.

## Components

### Buttons

| Class | Shape | Fill |
|-------|-------|------|
| `.primary` | pill, min-height 56px | `--green`, black text |
| `.secondary` | pill | `--surface-2`, inset border |
| `.ghost-button` | circle 38px | `--surface-2` |
| `.user-button` | circle 42px | `--surface-2` |

States: `.primary:disabled`, `.primary.is-complete` (white fill), `.danger-action`.

### Cards

- `.panel`, `.hero-card`, `.exercise-card` — `--surface`, radius 8px, shadow.
- `.hero-card` — gradient `#252525 → #181818 → #121212`.
- `.nutrition-card` — `--surface-2` wrapper.

### Lists & Rows

- `.set-row` — 3-column grid: label (72px) | detail | meta/checkbox.
- `.badge` — pill, `--surface-2` bg, `--green` text, 11px.
- `.empty-state` — muted message in `--surface-2` box.

### Navigation

- **Bottom app bar**: fixed, pill container, 4 equal columns, blur backdrop.
- Active tab: white background, black text; icon circle `--green`.
- Calendar nav: `.nav-icon.has-check` green check badge when today completed.

### Forms

- Inputs/selects: pill (500px radius), min-height 56px, `--surface-2`, inset gray border.
- Focus: 2px `--green` outline, slight translateY(-1px).
- `.grid-form` / `.max-grid`: 2 columns (1 on ≤560px).

### Drawer

- Right slide-over, max 460px (full width mobile).
- Backdrop `rgba(0,0,0,0.62)`.
- Sub-views: `.drawer-view` toggle via `.is-active`.
- User switch animation: `.drawer-panel.is-switching`.

### Calendar

- 7-column grid, square cells, `--surface-2`.
- `.is-today` — green inset ring.
- `.is-done` / `.is-selected` — green fill, black text.

## Motion

| Animation | Duration | Use |
|-----------|----------|-----|
| `panel-in` | 0.24s | Step panels, drawer views |
| `drawer-in` | 0.22s | Profile drawer |
| `user-switch` | 0.5s | User change highlight |
| `confetti-pop` | 0.9s | Session complete |
| Transitions | 0.18s | buttons, inputs, calendar cells |

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≤560px | Single-column forms, full drawer, single-column user cards |
| ≥760px | Wider padding; `.program-list` 2-column grid |

## Logo (SVG)

Brand mark in header: green disc (`#1ed760`), black barbell paths, star spark. Keep 40×40 viewBox; do not replace with raster.

## Adding New UI

1. Reuse existing classes before creating new ones.
2. New colors → extend `:root`, do not hardcode hex in JS-rendered HTML unless dynamic (confetti).
3. Match pill buttons and 8px card radius.
4. Korean primary copy; English eyebrows optional for section headers only.
