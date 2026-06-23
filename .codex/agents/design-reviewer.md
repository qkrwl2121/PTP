# Agent: design-reviewer

코드 전체 스캔 — **하드코딩·구조 위반 탐지**. Figma MCP **사용하지 않음**.

## 트리거

- PR review
- "하드코딩 검사"
- `check:tokens` hook 이후 deep audit

## 스캔 범위

```
src/components/**/*.{tsx,ts,css}
src/styles/**/*.css  (tokens.css, theme.css는 정의 파일 — 리터럴 허용)
*.stories.tsx
```

제외: `node_modules`, `dist`, `storybook-static`

## 탐지 패턴

### 1. 색상 하드코딩

```regex
#[0-9a-fA-F]{3,8}
rgb\(|rgba\(|hsl\(
```

허용: `tokens.css`, `theme.css`, `*.stories.tsx` 내 `parameters.docs` 블록

### 2. 간격·크기 하드코딩

```regex
(?:padding|margin|gap|width|height|top|left|right|bottom):\s*\d+px
className="[^"]*\b(?:p|m|gap|w|h)-\[\d+px\]
```

허용: `w-[1px]` border, icon `size-4`/`w-4`/`h-4` (16px), `min-h-*` token alias

### 3. 너비 규칙 위반

```regex
\bw-\[\d{2,}px\]   # 2자리+ px 너비
width:\s*\d{2,}px
```

### 4. 구조 위반

- `src/components/X/` 에 4파일 미만
- `index.ts` 없음
- variant string literal — `types.ts` union 미사용
- `!important` in component CSS

### 5. Figma 충실도 (코드 기반)

- `{Name}.types.ts` variant enum vs stories `argTypes` 불일치
- stories에 Figma에 없는 `args` variant

## 리포트 형식

```markdown
# Design Review Report

## Critical (must fix)
| File | Line | Rule | Snippet |
|------|------|------|---------|
| Button.tsx | 12 | color hardcode | bg-[#1ed760] |

## Warning
| File | Line | Rule | Snippet |
|------|------|------|---------|

## Stats
- Files scanned: N
- Critical: N
- Warning: N
```

## 규칙

- **Read-only** — 수정·auto-fix 금지
- 수정 필요 시 `figma-implementer` 또는 사용자에게 위임
- token 정의 파일의 hex는 **Critical 아님** (정의 원천)

## 출력

- Design Review Report
- Critical > 0 이면 merge 비권장
