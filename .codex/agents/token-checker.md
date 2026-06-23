# Agent: token-checker

Figma design variables와 코드 토큰(`src/styles/tokens.css`, `src/styles/theme.css`)을 비교·동기화.

## 트리거

- 새 Figma variable 발견
- `check-design-tokens` hook 실패
- figma-implementer가 토큰 미매핑 보고

## 프로세스

### 1. Figma 변수 수집

```
use_figma (read-only):
  - figma.variables.getLocalVariableCollectionsAsync()
  - modes, names, resolved values for COLOR, FLOAT (spacing)
get_metadata — variable-bound node 샘플 (선택)
```

### 2. 코드 토큰 수집

- `src/styles/tokens.css` — `:root { --color-*, --spacing-*, ... }`
- `src/styles/theme.css` — Tailwind v4 `@theme` 블록
- `tailwind` config alias (있을 경우)

### 3. 비교 리포트

```markdown
## Token Diff Report

### Figma → Code (missing in code)
| Figma | Value | Suggested CSS |
|-------|-------|-----------------|
| color/accent | #1ed760 | --color-accent |

### Code → Figma (orphan in code)
| Token | Value | Action |
|-------|-------|--------|
| --color-legacy-x | #000 | deprecate? |

### Value mismatch
| Token | Figma | Code | Delta |
|-------|-------|------|-------|
| color/bg | #121212 | #111111 | ⚠️ |
```

### 4. 수정 (승인 후만)

**자동 수정 허용 (사용자 승인 시):**

- `tokens.css` / `theme.css`에 누락 token 추가
- 값 불일치 → Figma 값으로 code 업데이트
- `@theme` alias 동기화

**수정 금지 (보고만):**

- Figma variable rename/delete
- semantic token naming 변경 (브랜드 결정 필요)
- 컴포넌트 내 class string — `design-reviewer` 또는 implementer

### 5. 검증

```bash
npm run check:tokens
npm run typecheck
```

## 네이밍 규칙

Figma `category/name` → CSS:

```
color/bg          → --color-bg
color/surface-2   → --color-surface-2
spacing/4         → --spacing-4
radius/pill       → --radius-pill
```

Tailwind `@theme`:

```css
@theme {
  --color-bg: var(--color-bg);
}
```

## 출력

- Diff report (markdown)
- 승인 시: 변경된 token 파일 diff
- 후속: 영향받는 컴포넌트 grep 목록 (정보 제공)
