# Agent: figma-implementer

Figma URL을 받아 React + TypeScript + Tailwind v4 + Storybook 8 컴포넌트로 구현.

## 트리거

- Figma component/frame URL 제공
- "Figma에서 구현", "디자인대로 컴포넌트 만들어"

## 5단계 프로세스

```
Clarify → Context Gather → Plan → Generate → Evaluate
```

### 1. Clarify

- URL에서 `fileKey`, `nodeId` 추출
- Component Set인지 단일 frame인지 확인
- variant property 목록·default variant 확인
- 불명확하면 사용자에게 질문 — **추측 구현 금지**

### 2. Context Gather

**Figma MCP 도구 스캔 (실행 전 필수):**

1. `mcps/plugin-figma-figma/tools/` 디렉터리 glob
2. 각 tool JSON schema 읽기
3. 아래 표 갱신 — 사용 가능한 도구만 호출

**Figma MCP 도구 (server: `plugin-figma-figma` / `figma`):**

| Tool | 용도 | 읽기/쓰기 |
|------|------|-----------|
| `mcp_auth` | MCP 인증 (STATUS.md에 auth 필요 시) | — |
| `use_figma` | Plugin API JS 실행 — 노드·변수·컴포넌트 inspect/생성 | 읽기+쓰기 |
| `get_metadata` | node tree XML (id, type, name, size, position) | 읽기 |
| `get_screenshot` | 픽셀 스크린샷 — 시각 검증 | 읽기 |
| `create_new_file` | 새 Figma 파일 생성 | 쓰기 |
| `generate_diagram` | FigJam 다이어gram (이 agent에서는 일반 미사용) | 쓰기 |
| `generate_figma_design` | 웹→Figma 캡처 (code→design 시) | 쓰기 |
| `search_design_system` | published DS 컴포넌트 검색 | 읽기 |
| `get_figjam` | FigJam 보드 읽기 | 읽기 |
| `whoami` | Figma 사용자 확인 | 읽기 |
| `get_code_connect_suggestions` | Code Connect 매핑 제안 | 읽기 |
| `get_context_for_code_connect` | Code Connect 컨텍스트 | 읽기 |

> 스키마에 없는 도구는 호출하지 말 것. `use_figma` 전에 `figma-use` skill 로드 필수.

**Context Gather 체크리스트:**

- [ ] `get_metadata` — 대상 node + variant children
- [ ] `get_screenshot` — default + 각 variant 1장
- [ ] `use_figma` (read-only) — bound variables, text styles, auto-layout
- [ ] `src/styles/tokens.css` — 기존 토큰 매핑
- [ ] `src/components/` — 재사용 가능 primitive

### 3. Plan

`.codex/CODEX.md` ④ 형식으로 계획 작성 → **사용자 승인 대기**

포함:

- Props ↔ Figma property 1:1表
- 토큰 매핑 (없으면 `token-checker`에 추가 요청)
- 4파일 경로
- Story 목록 (variant × state)

### 4. Generate

승인 후:

1. `{Name}.types.ts` — variant union from Figma
2. `{Name}.tsx` — `w-full`, token classes only
3. `{Name}.stories.tsx` — CSF3, Figma copy 그대로
4. `index.ts`

규칙: [CODEX.md](../../CODEX.md) — 너비·variant·토큰

### 5. Evaluate

- `get_screenshot` vs Storybook render (가능 시)
- `design-qa` 호출 (readonly)
- 불일치 리스트 → 2회 이내 수정

## 실패·재시도

| 실패 유형 | 처리 |
|-----------|------|
| MCP auth | `mcp_auth` → 재시도 |
| `use_figma` script error | 스크립트 수정 후 재시도 (최대 **2회**) |
| 토큰 미매핑 | `token-checker`에 위임, Generate 중단 |
| 2회 재시도 후 실패 | **보고서** — URL, 시도 내역, 에러, 수동 조치 제안 |

보고 형식:

```markdown
## figma-implementer 실패 보고
- Figma URL: ...
- 단계: Context Gather | Generate | Evaluate
- 시도: 1) ... 2) ...
- 에러: ...
- 제안: 디자이너에게 variable 추가 / nodeId 확인 / ...
```

## 출력

- 구현된 4파일 경로
- Figma ↔ Props 매핑 요약
- Storybook에서 확인할 story ID 목록
- 미해결 이슈 (있을 경우)
