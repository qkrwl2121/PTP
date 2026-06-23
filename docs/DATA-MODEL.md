# Data Model

## Storage

| Key | Value |
|-----|-------|
| `localStorage["strength-deck-state-v1"]` | JSON string of root state |

## Remote Sync

Vercel 배포에서는 같은 `RootState`를 Postgres에 계정별 JSONB로 저장합니다.

| Table | Purpose |
|-------|---------|
| `auth_users` | 아이디, 비밀번호 해시 |
| `auth_sessions` | HttpOnly 쿠키 기반 로그인 세션 |
| `app_states` | `user_id`별 최신 `RootState` JSONB |

동작 원칙:

- 앱은 항상 먼저 `localStorage`에 저장합니다.
- 로그인 상태이면 변경 사항을 `PUT /api/state`로 debounce 동기화합니다.
- 로그인 시 서버 상태가 있으면 서버 상태를 로컬에 내려받습니다.
- 서버 상태가 비어 있으면 현재 기기 상태를 최초 업로드합니다.

## Root State

```ts
interface RootState {
  users: User[];
  activeUserId: string;
}
```

## User

```ts
interface User {
  id: string;                    // "user-{timestamp}-{random}" or "user-default"
  profile: Profile;
  maxes: Record<LiftKey, number>;
  plan: Plan | null;
  history: HistoryEntry[];       // max 30, newest first
  completedDates: Record<ISODate, true>;
  todayChecks: Record<ISODate, Record<CheckId, boolean>>;
}
```

### LiftKey

`backSquat` | `frontSquat` | `deadlift` | `pushPress` | `snatch` | `cleanJerk`

Display names in `lifts` map (Korean).

## Profile

```ts
interface Profile {
  nickname: string;              // max 18 chars in form
  gender: "female" | "male" | "other";
  height: number;                // cm, 120–230
  weight: number;                // kg (internal; display unit from profile.unit)
  unit: "kg" | "lb";
  days: 2 | 3 | 4 | 5 | 6;       // available training days per week
  goal: "olympic" | "power" | "mixed";
  recovery: "low" | "normal" | "high";
  intensity: "easy" | "normal" | "hard" | "max";
}
```

Defaults: see `defaultProfile` in `app.js`.

## Maxes

Partial object — only entered lifts have values > 0. Missing lifts excluded from prescriptions (`prescription()` returns `null`, filtered out).

## Plan

```ts
interface Plan {
  title: string;
  summary: string;
  metrics: [string, string][];   // e.g. ["주 운동", "2회"]
  weeks: WeekMeta[];
  sessions: Session[];           // week 1 slice (for Today)
  weekSessions: Session[][];     // [weekIndex][sessionIndex]
}

interface WeekMeta {
  week: 1 | 2 | 3 | 4;
  name: string;
  range: string;                 // e.g. "70-78%"
  note: string;
}

interface Session {
  title: string;
  note: string;
  lifts: LiftPrescription[];
}

interface LiftPrescription {
  name: string;
  max: number;
  trainingMax: number;           // max × 0.9, rounded
  sets: {
    percent: number;
    sets: number;
    reps: number;
    weight: number;              // max × percent/100, rounded
  }[];
}
```

## History Entry

```ts
interface HistoryEntry {
  isoDate: string;               // "YYYY-MM-DD"
  date: string;                  // ko-KR locale display
  title: string;
  doneSets: number;
  totalSets: number;
  unit: "kg" | "lb";
  lifts: { name: string; summary: string }[];
}
```

## Today Check IDs

Format: `` `${lift.name}-${setIndex}` `` — must stay stable for checkbox persistence within a day.

## Migration / Normalization

`normalizeState(raw)`:

1. If `raw.users[]` exists → map each through `normalizeUser`.
2. Else wrap legacy flat `{ profile, maxes, plan, ... }` as single user `user-default`.

`normalizeUser`:

- Ensures arrays/objects exist
- Rebuilds `plan` from maxes if any max > 0
- Syncs `completedDates` from `history[].isoDate`

## Import / Export

**Export** (`#exportData`):

```json
{
  "exportedAt": "ISO8601",
  "app": "strength-deck",
  "state": { /* RootState */ }
}
```

**Import**: accepts `{ state }` or raw state object. Runs `normalizeState` → `replaceState`.

**Reset**: confirms → `normalizeState({})` → fresh default user.

## Unit Conversion

On profile unit change:

- All `user.maxes` values converted (kg ↔ lb)
- `roundLoad(value, targetUnit)`: kg rounds to 0.5, lb to 5
- Plan rebuilt after conversion

## Backup Recommendations

Document for users:

- Data is per-origin (deploy URL). GitHub Pages URL change = new empty storage.
- Use My Page → 데이터 내보내기 before device change.
- Import merges/replaces entire state — no partial merge.
