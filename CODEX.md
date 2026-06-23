# Strength Deck Design System Codex

Figma 디자인 시스템을 React + TypeScript + Tailwind v4 + Storybook 8 코드로 변환할 때 따르는 단일 기준 문서입니다.

## 목적

- Figma 디자인을 코드로 옮길 때 시각, 구조, 토큰 일관성을 보장합니다.
- 토큰 하드코딩을 `.codex/hooks/check-design-tokens.mjs`로 자동 감지합니다.
- 컴포넌트 구현 과정을 `.codex/CODEX.md`의 7단계 프로세스로 표준화합니다.

## 토큰 사용 규칙

### 필수

- 색상, 간격, 타이포, radius, shadow는 CSS 변수 또는 Tailwind v4 `@theme` 토큰만 사용합니다.
- 컴포넌트와 story JSX에서는 `var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)` 기반 클래스만 사용합니다.
- Tailwind 클래스는 `bg-surface`, `text-accent`, `rounded-pill`처럼 `src/styles/theme.css`에 등록된 alias를 우선 사용합니다.
- alias가 없을 때만 `bg-[var(--color-surface)]`처럼 CSS 변수 arbitrary value를 사용합니다.

### 금지

```tsx
// 금지: 하드코딩
<div className="bg-[#121212] text-[#1ed760]" />
<div style={{ color: "#ffffff", padding: "16px" }} />

// 허용: 토큰 사용
<div className="bg-bg text-accent" />
<div style={{ color: "var(--color-text)", padding: "var(--spacing-5)" }} />
```

- 예외 파일: `src/styles/tokens.css`, `src/styles/theme.css`
- Storybook 문서 메타데이터의 설명 문자열은 예외로 둘 수 있지만, story render JSX 안에서는 하드코딩을 금지합니다.

## 컴포넌트 구조

1컴포넌트는 4파일로 구성합니다.

```text
src/components/{Name}/
  {Name}.tsx
  {Name}.types.ts
  {Name}.stories.tsx
  index.ts
```

- 폴더명과 컴포넌트명은 PascalCase로 맞춥니다.
- `{Name}.types.ts`의 variant union은 Figma Component Set property와 1:1로 맞춥니다.
- `index.ts`는 public export만 담당합니다.
- 공유 타입은 컴포넌트 내부 타입으로 먼저 두고, 실제 중복이 생길 때만 `src/types/`로 이동합니다.

## Figma 충실도 규칙

| 규칙 | 설명 |
|------|------|
| 원본 텍스트 유지 | Figma copy를 임의 번역, 축약, 재작성하지 않습니다. |
| Variant 동일성 | Figma에 있는 property 이름과 값만 구현합니다. |
| State 동일성 | Figma에 없는 disabled, selected, loading variant를 임의 생성하지 않습니다. |
| 토큰 매핑 | Figma variable은 `--color-*`, `--spacing-*`, `--radius-*` 토큰으로 매핑합니다. |
| Auto Layout | 방향, gap, padding을 flex/grid와 spacing token으로 옮깁니다. |

## 컴포넌트 구현 금지사항

- Figma에 없는 variant/state를 임의로 추가하지 않습니다.
- 색상, 간격, shadow, radius를 하드코딩하지 않습니다.
- `!important`로 디자인 시스템을 우회하지 않습니다.
- Storybook 없이 컴포넌트를 merge하지 않습니다.
- `any`로 variant props를 회피하지 않습니다.
- 전역 CSS로 특정 컴포넌트 내부를 덮어쓰지 않습니다.

## 컴포넌트 너비 규칙

- 고정 `width: Npx`, `w-[NNNpx]`를 금지합니다.
- 기본은 `w-full`을 사용하고, 실제 너비는 부모 padding, grid, `max-w-*`로 제어합니다.
- Figma `Fill container`는 `w-full`, `Hug contents`는 `w-fit` 또는 `inline-flex`로 매핑합니다.
- 예외: 아이콘 16px/24px, 1px border, 접근성용 visually-hidden 크기.

## 에이전트 위임 규칙

| 상황 | 위임 대상 | 파일 |
|------|-----------|------|
| Figma URL 기반 컴포넌트 구현 | `figma-implementer` | `.codex/agents/figma-implementer.md` |
| Figma 변수와 코드 토큰 비교 | `token-checker` | `.codex/agents/token-checker.md` |
| merge 전 품질 게이트 | `design-qa` | `.codex/agents/design-qa.md` |
| 코드 하드코딩/구조 리뷰 | `design-reviewer` | `.codex/agents/design-reviewer.md` |

루트 Codex 에이전트는 범위 조율, 계획 승인, 최종 검증을 맡고 세부 구현과 검사는 전문 agent에 위임합니다.

## 빌드 명령어

```bash
npm install
npm run dev
npm run build
npm run build-storybook
npm run typecheck
npm run lint
npm run check:tokens
npm run check:stories
```

## 디렉터리

```text
CODEX.md
.codex/
  CODEX.md
  settings.json
  agents/
  hooks/
docs/DESIGN.md
src/
  components/
  styles/tokens.css
  styles/theme.css
```

## 관련 문서

- [AGENTS.md](AGENTS.md) - 기존 Vanilla PWA 작업 규칙
- [.codex/CODEX.md](.codex/CODEX.md) - 7단계 작업 프로세스
- [docs/DESIGN.md](docs/DESIGN.md) - 브랜드, 조합, Figma 네이밍
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) - 기존 앱 디자인 토큰과 컴포넌트
