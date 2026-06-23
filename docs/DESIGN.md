# Design Guidelines

Strength Deck 디자인 시스템 — 브랜드 맥락, 토큰 사용, 컴포넌트 조합, Figma 네이밍.

> 기술 토큰 레퍼런스: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) · 구현 규칙: [CODEX.md](../CODEX.md)

## 브랜드 성격

**Strength Deck** — 모바일 퍼스트 스트렝스 트레이닝 PWA.

| 속성 | 표현 |
|------|------|
| 톤 | 자신감, 명료함, 데이터 기반 — 과장된 마케팅 톤 지양 |
| 시각 | Spotify-inspired dark UI — 고대비, `#1ed760` 악센트 |
| 언어 | UI copy **한국어** 우선; section eyebrow만 영어 허용 (Today, Calendar) |
| 밀도 | 터치 친화 — 최소 tap target 44px, pill CTA 56px |
| 모션 | 짧고 기능적 (0.18–0.24s) — 장식 애니메이션 지양 |

### 브랜드 DO

- 숫자·중량·%는 명확한 타이포 hierarchy
- 완료/성공은 green accent — 과use 금지 (1 screen 1 primary CTA)
- empty state는 muted + actionable hint

### 브랜드 DON'T

- 밝은/화이트 테마 (dark only)
- 그라데이션 남용 (hero-card 수준만)
- emoji를 UI chrome에 (달력 ✓ 제외)
- "Premium", "Ultimate" 등 empty 마케팅 카피

---

## 색상 사용 맥락

| Token | `--color-*` | When |
|-------|-------------|------|
| Background | `bg` | Page shell |
| Surface | `surface`, `surface-2`, `surface-3` | Cards → inputs → gradients |
| Text | `text`, `text-muted`, `text-soft` | Primary → body → labels |
| Accent | `accent` | Primary CTA, active tab, completion |
| Danger | `danger` | Delete, undo — **semantic only** |
| Border | `border` | Rare dividers |

**규칙:** UI surface는 surface 계열; accent는 **행동 유도 1곳**에 집중.

---

## Spacing 사용 맥락

| Token | px | When |
|-------|-----|------|
| `--spacing-1` | 4 | Icon gap, tight inline |
| `--spacing-2` | 8 | Calendar grid, compact lists |
| `--spacing-3` | 10 | Set row internal |
| `--spacing-4` | 14 | List/card gap |
| `--spacing-5` | 16 | Form grid, section gap |
| `--spacing-6` | 22 | Card padding, CTA margin |
| `--spacing-7` | 112 | Bottom nav safe area |

섹션 rhythm: eyebrow → title 6px → body 18px → content block.

---

## 컴포넌트 조합 규칙

### Page shell

```
Topbar (brand + profile)
  → PageHeading (eyebrow + h1 + hint)
  → Content cards / lists
  → BottomAppBar (fixed)
```

### Card composition

```
Panel / ExerciseCard
  ├── header (title + badge)
  └── body (SetRow[] | EmptyState)
```

### Form composition

```
GridForm (2-col → 1-col mobile)
  ├── Label + pill Input
  └── Primary wide submit
```

### Drawer (overlay)

```
DrawerHead (eyebrow + title + close)
  → DrawerView (profile | users | data)
  → DrawerActions (secondary buttons)
```

**조합 원칙:**

1. Card 안에 Card 중첩 2단계 초과 금지
2. Primary + Primary 나란히 금지 — secondary pairing
3. Badge는 header 우측 1개 — 본문 남발 금지

---

## 쓰지 말 것 (Anti-patterns)

| ❌ | ✅ 대안 |
|----|---------|
| `#1ed760` inline | `var(--color-accent)` / `text-accent` |
| `w-[320px]` card | `w-full max-w-*` + parent padding |
| Bootstrap/MUI 혼용 | DS primitives only |
| `<div onClick>` button | `<button type="button">` |
| Custom font stack | `--font-family-base` |
| Figma 없는 `variant="outline"` | Figma Component Set만 |
| Light gray on dark without token | `--color-text-muted` |

---

## Figma 레이어 네이밍 컨벤션

### Pages

```
🎨 Foundations
🧩 Components
📱 Screens / {ScreenName}
📦 Icons
```

### Component Set

```
Component/{Category}/{Name}
  e.g. Component/Button/Primary
       Component/Card/Exercise
       Component/Input/Text
```

### Variants (properties)

```
Property=Value
  variant=primary | secondary | ghost
  size=md | lg
  state=default | disabled   (Figma state만 — code hover는 CSS)
```

### Frames / Screens

```
Screen/{Tab}/{State}
  Screen/Today/Empty
  Screen/Today/Active
  Screen/Plan/WeekSelected
```

### Tokens (Figma Variables)

```
color/{name}      → --color-{name}
spacing/{n}       → --spacing-{n}
radius/{name}     → --radius-{name}
font/{role}       → --font-{role}
```

### Layers inside component

```
Root (auto-layout)
├── Label / Icon / Content / Badge
└── (no "Rectangle 47" — semantic names only)
```

### Code Connect mapping

```
Component/Button → src/components/Button/Button.figma.tsx
```

---

## Figma ↔ Code checklist

- [ ] Component Set name = folder name (PascalCase)
- [ ] Variant property names = `{Name}.types.ts` keys
- [ ] Text layers = final Korean copy
- [ ] Colors bound to variables (not raw hex on layers)
- [ ] Auto Layout → flex + gap token documented in dev notes

---

## Related

- [CODEX.md](../CODEX.md) — agent rules
- [.codex/CODEX.md](../.codex/CODEX.md) — 7-step process
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — legacy CSS class reference
