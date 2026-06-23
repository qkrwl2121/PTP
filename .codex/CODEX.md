# Codex 작업 프로세스

Strength Deck 디자인 시스템 작업 시 **모든 Codex 에이전트**가 따르는 7단계 프로세스.

## 7단계

```
① 이해 → ② 분석 → ③ 탐색 → ④ 계획 → ⑤ 실행 → ⑥ 검증 → ⑦ 완료
```

### ① 이해 (Understand)

- 사용자 요청·Figma URL·범위를 한 문단으로 재진술
- 애매한 variant/상태/반응형 breakpoint 있으면 **질문 후 진행**
- `.codex/agents/` 중 적합 subagent 선정

### ② 분석 (Analyze)

- Figma: component set, variables, text styles, constraints
- 코드: 기존 `src/components/` 중 재사용 가능 여부
- `docs/DESIGN.md` 브랜드·조합 규칙 확인

### ③ 탐색 (Explore)

- Figma MCP: `get_metadata`, `get_screenshot`, `use_figma` (읽기 스크립트)
- 코드베이스: grep/glob으로 유사 컴포넌트·토큰 사용처
- **코드 작성 금지** — 탐색만

### ④ 계획 (Plan)

- 생성/수정 파일 목록 (4파일 구조 준수)
- Props ↔ Figma property 매핑 테이블
- 토큰 매핑 (Figma variable → `--color-*`)
- **사용자 승인 필수** — 승인 없이 ⑤ 진입 금지

승인 요청 형식:

```markdown
## 구현 계획 (승인 필요)
- 컴포넌트: Button
- Variant: primary | secondary | ghost (Figma와 동일)
- 파일: Button.tsx, Button.types.ts, Button.stories.tsx, index.ts
- 토큰: --color-accent, --color-surface-2, --radius-pill
- 재사용: 없음
승인해 주시면 구현을 시작합니다.
```

### ⑤ 실행 (Execute)

- 승인 후에만 코드·Story 작성
- Figma 구현 → `figma-implementer` 위임 권장
- 토큰 변경 → `token-checker` 경유
- 한 번에 1컴포넌트 — 대량 생성 금지

### ⑥ 검증 (Verify)

- `design-qa` subagent 실행 (8항목, **수정 없이** 리포트만)
- 실패 항목 있으면 ④로 돌아가 계획 수정 후 재실행
- `npm run typecheck && npm run check:tokens && npm run check:stories`

### ⑦ 완료 (Done)

- 변경 요약 + Storybook에서 확인할 story 목록
- Figma ↔ 코드 diff (variant, copy, token)
- 후속 작업 제안은 **사용자가 요청할 때만**

---

## 코드 전 승인 필수

| 단계 | 승인 필요 |
|------|-----------|
| ③ 탐색 | ❌ |
| ④ 계획 제출 | ✅ 사용자 OK |
| ⑤ 첫 Write/Edit | ✅ ④ 승인 후 |
| 토큰 파일 변경 | ✅ 별도 승인 |
| `.env` 접근 | ❌ 차단 (hook) |

---

## 금지사항

| # | 금지 | 이유 |
|---|------|------|
| 1 | 승인 없이 컴포넌트 파일 생성 | scope creep |
| 2 | Figma에 없는 variant 추가 | 디자인 drift |
| 3 | `#hex`, `rgb()` 컴포넌트 내 사용 | 토큰 bypass |
| 4 | 고정 px 너비 (`w-[320px]`) | 반응형 깨짐 |
| 5 | Story 없이 merge | Storybook SSOT 붕괴 |
| 6 | `.env` 읽기/쓰기 | secrets |
| 7 | `!important` 스타일 | override 지옥 |
| 8 | 전역 CSS로 DS 컴포넌트 덮기 | isolation 파괴 |
| 9 | Figma copy 임의 변경 | 브랜드·i18n 불일치 |
| 10 | 실패한 Figma MCP 3회+ 무한 재시도 | 비용·drift — 2회 후 보고 |

---

## Subagent 호출

```
Task subagent + 프롬프트에 .codex/agents/{name}.md 내용 참조
```

| Agent | readonly | MCP |
|-------|----------|-----|
| figma-implementer | false | Figma ✅ |
| token-checker | false | Figma ✅ (변수 읽기) |
| design-qa | true | ❌ |
| design-reviewer | true | ❌ |
