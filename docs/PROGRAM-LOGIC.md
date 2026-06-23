# Program Logic

4-week strength and Olympic weightlifting block generated from profile + 1RM inputs. Prescriptions use the entered **actual 1RM** for loading, while the displayed training max remains 90% of 1RM for reference.

## References Used

- Local PDFs in `pdf/`:
  - `000000037967_20260623140922.pdf` includes an intensified weightlifting training example with squats, high pulls, pulls, clean & jerk, support work, press work, and 80-90%+ loading.
  - `역도선수들의 기록향상을 위한.pdf` emphasizes that weightlifting performance depends on strength, power, technique, flexibility, trunk/back strength, and systematic training rather than max strength alone.
  - `초급 역도 선수의 트레이닝 모델에 관한 연구.pdf` appears image-based in this repo; text extraction did not produce readable content, so it was not used as a direct source.
- LiftVault was used as a structural reference: mobile-friendly spreadsheet-style programs, goal-specific templates, 1RM percentage loading, 3-6 day Olympic lifting frequencies, weekly waves, and heavy/volume/deload organization. Its Olympic lifting overview notes that programs commonly pair snatch and clean & jerk work with squats, presses, pulls, deadlift accessories, and technique practice.

## Inputs To Session Count

```js
sessionsPerWeek =
  days >= 6 ? 5
  : days >= 5 ? 4
  : days >= 4 ? 3
  : 2

if recovery is low or intensity is easy, reduce sessions by 1
if recovery is high and intensity is hard/max, add 1 session within available days

frequencyBias = days <= 2 ? +2 : days <= 3 ? +1 : days >= 6 ? -1 : 0
intensityBias = intensity === "max" ? +2 : intensity === "hard" ? +1 : intensity === "easy" ? -1 : 0
recoveryBias = recovery === "high" ? +1 : recovery === "low" ? -1 : 0
volumeBias = clamp(frequencyBias + intensityBias + recoveryBias, -2, 3)
baseSets = clamp(5 + volumeBias, 4, 7)
reducedSets = Math.max(2, baseSets - 1)
```

`days` now affects both weekly frequency and session volume. A 2-day plan carries more sets per session because the weekly strength work is compressed. A 5-6 day plan spreads the work across more sessions, so each session uses fewer base sets. The user-selected `intensity` field raises or lowers this base set target.

The calendar-style day tabs are not all strength days. Generated strength sessions are distributed across the week, and non-training offsets render as recovery days:

- 2 sessions: day offsets 0, 3
- 3 sessions: day offsets 0, 2, 4
- 4 sessions: day offsets 0, 1, 3, 5
- 5 sessions: day offsets 0, 1, 2, 4, 5

## Goal Templates

| goal | Template |
|------|----------|
| `olympic` | Snatch, clean & jerk, pulls, front/back squat, push press |
| `mixed` | Olympic template with more deadlift emphasis |
| `power` | Squat, deadlift, push press first; Olympic lifts are not shown as technique work, only neutral strength accessories such as high pulls, rack pulls, support holds, or heavy pulls when their 1RM is available |

The plan title and generated sessions both change by goal. Missing 1RM values are filtered out per lift.

## Accessory Work

The PDF references emphasize that weightlifting performance is not max strength alone. The generated plan now adds short accessory blocks for:

- Back and trunk strength: back extensions, carries, planks, dead bugs.
- Strength support: rack holds, overhead support, pause squats, carries, posterior-chain work.
- Technical discipline only where it protects strength work: no extra failed attempts, keep trunk pressure, stop when bracing or bar speed fails.

These items are rendered as checkable non-percentage work so they do not require a stored 1RM.

## Week Progression

| Week | Name | Range | Intent |
|------|------|-------|--------|
| 1 | 축적과 기술 | 60-78% | Technique quality, repeatable volume, base strength |
| 2 | 강화와 풀 | 70-85% | Heavier doubles/singles, pulls and high force work |
| 3 | 고강도 적응 | 75-90% | Heavy singles/doubles, stop when speed or position fails |
| 4 | 디로드와 속도 | 60-72% | Lower fatigue, fast technical reps, next block prep |

Pull variations may use the parent lift's 1RM at 85-100% because they are assistance lifts, not full competition attempts.

## Prescription Helper

```js
prescription(key, max, waves, label?)
// waves: [[percent, sets, reps], ...]
// weight = roundLoad(max * percent / 100)
// trainingMax = roundLoad(max * 0.9)
// returns null if !max
```

## Today Vs Plan Picker

- **Today tab** uses `plan.sessions[0]`, the first generated session in the current block.
- **Plan tab** uses `weekSessions[week - 1][offset % sessions.length]`.
- Completion history still records the selected Today session, not an auto-advanced calendar workout.

Changing Today to auto-advance by date would require a separate migration of check IDs and history semantics.

## Nutrition Estimate

Heuristic only, not medical advice:

```js
activityFactor = days >= 6 ? 34 : days >= 4 ? 32 : 30
genderAdjust = male +100 : female -100 : 0

calories = roundToNearest(weight * activityFactor + genderAdjust, 50)
protein = weight * 1.6 g
carbs = weight * (days >= 5 ? 4 : 3.2) g
fat = weight * 0.7 g
```

## Intensity Summary

- Olympic/mixed competition lifts: usually 60-90%.
- Power goal squat/deadlift/push press: 75-95% in loading weeks, lower on deload.
- Pull assistance: up to 100% of the related Olympic lift.
- Rounding respects user unit rules: kg to 0.5, lb to 5.
