# Strength Deck Subagents

Strength Deck 작업을 역할별로 나눌 때 사용하는 프로젝트 전용 서브에이전트 모음입니다.

## 기본 운영

- `orchestrator.md`: 요청을 분해하고 적절한 에이전트에게 위임합니다.
- 각 에이전트는 `AGENTS.md`, 관련 `docs/` 문서, 현재 코드 구조를 먼저 확인합니다.
- Vanilla PWA 본 앱 작업은 `index.html`, `styles.css`, `app.js`, `sw.js` 중심으로 처리합니다.
- React/TS/Tailwind/Storybook 디자인 시스템 작업은 `.codex/agents/`와 `.codex/CODEX.md`를 우선합니다.
- 모든 사용자-facing UI copy는 한국어를 기본으로 하며, section eyebrow만 Today, One Rep Max, Calendar, My Page 등 영어를 허용합니다.

## Agent Map

| Agent | Primary Use |
|---|---|
| `orchestrator.md` | 작업 분해, 역할 배정, 충돌 조정, 최종 통합 |
| `product-planner.md` | 기능 기획, 사용자 흐름, 요구사항 정리 |
| `ux-designer.md` | 모바일 UX, 정보 구조, 탭/드로어 흐름 |
| `ui-designer.md` | 다크 테마 시각 디자인, 토큰/컴포넌트 일관성 |
| `frontend-developer.md` | Vanilla HTML/CSS/JS 구현 |
| `program-logic-specialist.md` | 1RM, 4주 블록, 영양 추정, 운동 처방 |
| `data-offline-specialist.md` | localStorage, import/export, PWA cache, service worker |
| `qa-accessibility-tester.md` | 회귀 테스트, 접근성, 모바일 QA |
| `release-manager.md` | GitHub Pages/PWA 배포, 캐시 버전, 릴리스 점검 |
| `documentation-maintainer.md` | AGENTS/docs/README 동기화 |

## Coordination Rules

- 변경 전 소유 파일과 검증 방법을 명시합니다.
- `STORAGE_KEY` 변경, 상태 구조 변경, 서비스 워커 캐시 변경은 `data-offline-specialist` 검토가 필요합니다.
- 운동 처방 수식, 라운딩, 세션 구성 변경은 `program-logic-specialist` 검토가 필요합니다.
- 정적 자산 변경 시 `sw.js`의 `CACHE_NAME`을 증가시킵니다.
- 디자인 시스템 하네스(`src/components`, `.storybook`, `.codex`) 작업은 기존 `.codex/agents`와 함께 사용합니다.
