# Yaku Scoring Investigation

**Generated:** 2026-05-02

---

## Section A: Yaku Bonus Data Flow

The `bonus` field is computed in 4 yaku checker methods:
- `_checkKasu`: returns `{ bonus: 0.3 }` (from `YAKU_INFO.KASU.baseBonus`)
- `_checkTanzaku`: returns `{ bonus: 0.3 }`
- `_checkTane`: returns `{ bonus: 0.4 }`
- `_checkHikari`: returns `{ bonus: 0.7 }`

### Where `bonus` is READ:

| Location | File:Line | Purpose |
|----------|-----------|---------|
| `calculateTotalMultiplier` | ScoringEngine:90 | `1.0 + sum(all y.bonus)` → `yakuMult` | Scoring math |
| `calculateFinalScore` | ScoringEngine:117 | passes yakuMult into effectiveMult → finalScore | Scoring math |
| `_yakuBeforeTurn` snapshot | GRM:616, 1976, 2034 | `y.bonus` stored in Map for diff comparison | Gate diff logic |
| New-yaku diff filter | GRM:1972 | `y.bonus - prev > 0.3` | Gate diff logic |
| Logger `logYakuState` | GameplayLogger:142 | `+${y.bonus.toFixed(1)}` in display string | Display only |
| `evaluate().map(y => [y.name, y.bonus])` | GRM:616,828,2034 | Stored for diff comparison | Gate diff logic |

---

## Section B: Final Score Math — Two Separate Paths

**This is the key finding.** There are TWO completely separate scoring paths:

### Path 1: Per-capture scoring (THE REAL SCORE)

**File:** `GameRoundManager._scoreFieldCapture()`, line 522:
```js
const fieldScore = Math.round(points * mult * flow);
this._runningScore += fieldScore;
```

This is accumulated on every capture event. `points` come from card base values + spirit per-card effects. `mult` comes from spirit per-card multipliers. `flow` comes from `run.flow`.

**yakuMult is NOT involved.** No reference to yaku bonuses, yakuList, or calculateTotalMultiplier anywhere in this path.

### Path 2: `calculateFinalScore` (DEAD SCORING PATH)

**File:** `ScoringEngine.calculateFinalScore()`, lines 114–201:
```js
const yakuList = this.evaluate(capturedCards);
const yakuMult = this.calculateTotalMultiplier(yakuList);  // 1.0 + sum(bonuses)
// ...
const effectiveMult = (yakuMult + additiveMult) * multMult;
const finalScore = Math.round(boostedBasePoints * effectiveMult * flow);
```

yakuMult IS computed here and DOES flow into `finalScore`. However, **this `finalScore` is never used as the actual round score.** Every call site discards it:

**Call site 1:** `getCurrentScoring()` (GRM line 333)
- Returns `sc.yakuMult` and `sc.yakuList` for HUD display
- **But `getCurrentScoring()` has ZERO callers** — nobody reads the HUD data

**Call site 2:** `bankScore()` (GRM line 744)
- Calls `calculateFinalScore(..., true)` to trigger metal procs
- Only reads `sc.metalConsumableCount`
- Logger output uses `this._runningScore`, NOT `sc.finalScore`:
  ```js
  logger.logRoundEnd({ finalScore: this._runningScore, ... })
  ```
  The return object also uses `_runningScore`: `finalScore: this._runningScore`

**Call site 3:** `_finalizeTurn()` (GRM line 2086)
- Same pattern as bankScore — metal procs only
- Logger and return use `this._runningScore`

### Conclusion

**The `calculateFinalScore` method computes a yaku-influenced score that is systematically discarded.** The actual round score is always `_runningScore` from per-capture accumulation, which never involves yakuMult.

---

## Section C: yakuMult Computation

`yakuMult` is computed by `calculateTotalMultiplier(yakuList)`:
```js
return 1.0 + yakuArray.reduce((sum, y) => sum + y.bonus, 0);
```

For a round with Tane + Hikari achieved: `1.0 + 0.4 + 0.7 = 2.1`

**Where yakuMult is used:**
1. `ScoringEngine.calculateFinalScore` line 185: `effectiveMult = (yakuMult + additiveMult) * multMult` — but this finalScore is discarded (see Section B)
2. `getCurrentScoring` return: `totalMultiplier: sc.yakuMult` — but getCurrentScoring has zero callers
3. `bankScore` and `_finalizeTurn` return objects: hardcoded as `yakuMult: 1.0` (lines 776, 2129) — the actual yakuMult from calculateFinalScore is NOT used

**yakuMult contributes to displayed/returned score: NOWHERE.**

---

## Section D: Logger Output

### Current format
**File:** `GameplayLogger.logYakuState`, line 142:
```js
const yakuStr = yakuList.map(y =>
  `${y.name} +${y.bonus.toFixed(1)} (${y.count}/${y.threshold})`
).join(', ');
this._log(`  YAKU: ${yakuStr}`);
```

Output: `YAKU: Tane +0.4 (3/3), Hikari +0.7 (2/2)`

The `+0.4` and `+0.7` imply score contribution. Since yakus are gate-only, this is misleading.

### Suggested format
```
YAKU: Tane (3/3), Hikari (2/2)
```

Or if bonus values should be shown for design reference:
```
YAKU: Tane (3/3) [+0.4], Hikari (2/2) [+0.7]
```

The `logYakuAchieved` method (line 373) is fine — it shows `[YAKU ACHIEVED] Tane: 3 captured (threshold 3)` which is factual.

---

## Section E: Bank/Push Gate Logic

**File:** GRM lines 1970–1972:
```js
const newYaku = yakuFromUnspent.filter(y => {
  const prev = this._yakuBeforeTurn.get(y.name);
  return prev === undefined || y.bonus - prev > 0.3;
});
```

The gate logic is threshold-based (correctly). The `prev === undefined` check handles "first time this yaku appeared." The `y.bonus - prev > 0.3` comparison is legacy from the upgrade system — with fixed bonuses it's always `0 > 0.3 = false`, so it never fires. The effective gate is purely `prev === undefined`.

**The `bonus` value stored in `_yakuBeforeTurn` is never used for gate decisions** in practice. It's stored but the comparison is dead code.

---

## Section F: Verdict

### Hypothesis B confirmed with a twist.

**Yaku `bonus` values DO contribute to a computed `finalScore`** inside `calculateFinalScore()`. The formula `effectiveMult = (yakuMult + additiveMult) * multMult` includes yakuMult (which is 1.0 + sum of bonuses). So with Tane + Hikari, effectiveMult would be 2.1× instead of 1.0×.

**However, this `finalScore` is systematically discarded.** Every call site uses `_runningScore` (from per-capture accumulation) instead. The `calculateFinalScore` method is called purely for side effects (metal proc rolls) and post-round enhancement processing. Its score output is dead.

### What's dead and what's alive:

| Component | Status | Used For |
|-----------|--------|----------|
| `YAKU_INFO.baseBonus` values | DEAD for scoring | Only feeds dead `yakuMult` path |
| `_checkXxx` returning `bonus` | DEAD for scoring | Used in logger display + dead diff comparison |
| `calculateTotalMultiplier()` | DEAD | Only called from `calculateFinalScore` |
| `calculateFinalScore().finalScore` | DEAD | Discarded at all 3 call sites |
| `calculateFinalScore().metalConsumableCount` | ALIVE | Read for metal proc processing |
| `evaluate()` returning yakuList | ALIVE for GATE | newYaku detection triggers bank/push |
| `evaluate()` returning count/threshold | ALIVE | Gate logic: is threshold met? |
| `getCurrentScoring()` | DEAD | Zero callers |
| `_yakuBeforeTurn` diff using `.bonus` | DEAD comparison | `bonus - prev > 0.3` never fires with fixed bonuses |

---

## Section G: Recommended Changes (for review)

### Tier 1: Logger clarity (low risk)
- Remove `+${y.bonus.toFixed(1)}` from `logYakuState` format string
- Change to `${y.name} (${y.count}/${y.threshold})`

### Tier 2: Dead comparison cleanup (low risk)
- Simplify GRM line 1972 from `prev === undefined || y.bonus - prev > 0.3` to `prev === undefined`
- Simplify `_yakuBeforeTurn` to store just names (Set instead of Map), since bonus values aren't used for gate decisions

### Tier 3: Dead scoring path (medium risk, high reward)
- Remove `calculateTotalMultiplier()` method
- Remove `yakuMult` computation from `calculateFinalScore` (hardcode to 1.0)
- Remove `YAKU_INFO.baseBonus` values (or keep for documentation)
- Remove `bonus` from yaku checker return objects (return only `{ name, count, threshold }`)
- Remove `getCurrentScoring()` (zero callers)
- Simplify `calculateFinalScore` to only compute what's actually read: `metalConsumableCount` and the spirit channels

### Tier 4: Architecture question (design decision, not code cleanup)
The fact that there are TWO scoring paths (per-capture accumulation vs batch calculateFinalScore) is technical debt. The per-capture path is the real one. `calculateFinalScore` is vestigial — it was likely the original scoring formula before per-capture scoring was implemented. A future cleanup could remove `calculateFinalScore` entirely and have metal procs handled differently. But this is a larger refactor.
