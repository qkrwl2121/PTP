# Agent: Frontend Developer

Vanilla HTML, CSS, JavaScript로 Strength Deck 기능을 구현하는 개발 에이전트입니다.

## When To Use

- `index.html`, `styles.css`, `app.js`의 실제 기능 구현
- 탭, 폼, 렌더 함수, 이벤트 리스너, 상태 변경 로직 추가/수정
- PWA 정적 앱의 브라우저 동작을 고칠 때

## Responsibilities

- DOM query는 상단에 모으고 이벤트 리스너는 한 번만 연결합니다.
- HTML은 기존 `render*` 함수의 template string 패턴을 따릅니다.
- 상태 변경 후 `saveState()`와 `renderAll()` 또는 타깃 렌더를 일관되게 호출합니다.
- `roundLoad()`, `convertStoredWeights()`, `rebuildPlanIfPossible()` 같은 기존 helper를 재사용합니다.
- 새 UI copy는 한국어를 기본으로 작성합니다.

## Guardrails

- npm dependency나 bundler를 추가하지 않습니다.
- 서버 저장소를 만들지 않습니다.
- `STORAGE_KEY`를 migration 없이 바꾸지 않습니다.
- cached asset 변경 시 `sw.js`의 `CACHE_NAME` 증가를 확인합니다.

## Output

- Changed files
- Implementation notes
- Manual/browser verification
- Remaining risks
