# Cleanup Audit Report

**Generated:** 2026-05-01

## Summary

| Category | Findings | REMOVE | INVESTIGATE | KEEP |
|----------|----------|--------|-------------|------|
| A. Paramita / Yaku Upgrades | 5 | 1 | 3 | 1 |
| B. Inactive Yakus | 2 | 1 | 0 | 1 |
| C. Style Combo System | (informational) | 0 | 2 | — |
| D. Deck-Fixing Consumables | 2 | 1 | 0 | 1 |
| E. Void Spirit | 0 | 0 | 0 | 0 |
| F. Feng Shui | 3 | 0 | 0 | 3 |
| G. Orphaned Spirit Effects | 0 | 0 | 0 | 0 |
| H. Orphaned Hexagram Effects | 0 | 0 | 0 | 0 |
| I. Dead Helper Functions | 6 | 5 | 1 | 0 |
| J. Stale Comments / Deprecated | 6 | 3 | 1 | 2 |
| **Bonus: Dead Constants** | 5 | 5 | 0 | 0 |

---

## Section A: Paramita / Yaku Upgrade System

### A1. `buyYakuUpgrade` method — RunManager

**File:** `src/systems/RunManager.js`, lines 1058–1068
```js
buyYakuUpgrade(yakuId) {
  if (!(yakuId in this._yakuUpgrades)) { throw new Error(...); }
  const cost = this.getEffectiveCost(5);
  if (this._ki < cost) { throw new Error(...); }
  this._ki -= cost;
  this._yakuUpgrades[yakuId]++;
}
```
**Callers found:** NONE (only its own definition appears in grep)
**Status:** Orphaned. No UI calls this method. The ShrineScene has no paramita purchase UI.
**Recommendation:** REMOVE

### A2. `_yakuUpgrades` state field + getter — RunManager

**File:** `src/systems/RunManager.js`, line 159 (init), line 1051 (getter)
```js
this._yakuUpgrades = { kasu: 0, tanzaku: 0, tane: 0, hikari: 0 };
get yakuUpgrades() { return { ...this._yakuUpgrades }; }
```
**Callers of getter:** `run.yakuUpgrades` is passed to `ScoringEngine.evaluate()` and `calculateFinalScore()` extensively throughout GameRoundManager (lines 361, 645, 774, 857, 1993, 1998, 2063, 2117) and GameScene (lines 2821, 2870).
**Status:** ACTIVE — the upgrades object flows into scoring. However since `buyYakuUpgrade` is never called, the values are always `{ kasu: 0, tanzaku: 0, tane: 0, hikari: 0 }`.
**Impact of always-zero:** `ScoringEngine.evaluate` adds `+0.2 * level` to each yaku's bonus. With level=0, this adds nothing. The entire upgrade plumbing is a no-op that passes zeroes through the system.
**Recommendation:** INVESTIGATE — The scoring plumbing is actively wired but always returns zero. Could remove the field + getter + all call sites that pass `yakuUpgrades`, simplifying `evaluate()` and `calculateFinalScore()` signatures. But this is a large blast radius across GRM and scoring. Better suited for a dedicated scoring cleanup pass.

### A3. `ScoringEngine.evaluate()` upgrades parameter

**File:** `src/systems/ScoringEngine.js`, line 74
```js
evaluate(capturedCards, upgrades = {}, thresholds = null) { ... }
```
**Status:** The `upgrades` parameter is threaded through all 4 yaku check methods to compute `bonus + 0.2 * (upgrades[yakuId] ?? 0)`. Since upgrades are always zero, this does nothing.
**Recommendation:** INVESTIGATE (same as A2 — tied together)

### A4. `_yakuUpgrades` in snapshot

**File:** `src/systems/RunManager.js`, line 1600
```js
yakuUpgrades: { ...this._yakuUpgrades },
```
**Status:** Included in the debug snapshot. Harmless but becomes dead weight if A2 is removed.
**Recommendation:** INVESTIGATE (remove with A2)

### A5. Logger `yakuUpgrades` display

**File:** `src/systems/GameplayLogger.js`, lines 265–266
```js
if (runState.yakuUpgrades) {
  const ups = runState.yakuUpgrades;
```
**Status:** Logs the always-zero upgrades in round-end summaries.
**Recommendation:** KEEP for now (logger is low-priority cleanup; only shows if upgrades exist)

---

## Section B: Inactive Yakus

### B1. Tsuki-narabi — Dead yaku implementation

**File:** `src/systems/ScoringEngine.js`, lines 50, 81, 265–282
```js
// TSUKI_NARABI removed from active scoring (kept as dead reference)
// this._push(results, this._checkTsukiNarabi(capturedCards));  // removed
_checkTsukiNarabi(capturedCards) { /* 25-line implementation */ }
```
**Status:** Commented out of `evaluate()`. The method `_checkTsukiNarabi` exists but is never called. `YAKU_INFO.TSUKI_NARABI` is referenced on line 281 but the entry doesn't exist in `YAKU_INFO` (removed from the object on line 50), so this method would crash if called.
**Recommendation:** REMOVE — dead code, would crash if re-enabled without restoring the YAKU_INFO entry.

### B2. Style combo yakus (Akatan, Aotan, Hanami-zake, etc.)

**File:** `src/systems/StyleEngine.js`, lines 13–108
**Status:** ACTIVE. All 12 combos (hanami_zake, tsukimi_zake, inoshikacho, akatan, aotan, spring, summer, autumn, winter, full_year, goko) are fully wired:
- `checkCombos()` runs on every capture
- Triggers feed `run.onStyleCombo()` → adds to flow (once per run)
- UI display via `_showStyleComboPopup` in GameScene
- Ki reward via `styleComboKi` in RunManager
- Logger integration via `logStyleCombos`
**Recommendation:** KEEP — all active

---

## Section C: Style Combo System State (Informational)

### Active system — fully wired

**Definition file:** `src/systems/StyleEngine.js`
**12 active combos:**
| Combo | Bonus | Trigger |
|-------|-------|---------|
| hanami_zake | +0.2 | march_curtain + september_sake |
| tsukimi_zake | +0.2 | august_moon + september_sake |
| inoshikacho | +0.3 | july_boar + october_deer + june_butterflies |
| akatan | +0.4 | jan/feb/mar ribbons |
| aotan | +0.4 | jun/sep/oct ribbons |
| spring | +0.2 | cards from months 3, 4, 5 |
| summer | +0.2 | cards from months 6, 7, 8 |
| autumn | +0.2 | cards from months 9, 10, 11 |
| winter | +0.2 | cards from months 12, 1, 2 |
| full_year | +0.8 | cards from all 12 months |
| goko | +1.0 | all 5 brights captured |

**Trigger mechanism:** `GameRoundManager._onCapture()` → `StyleEngine.checkCombos()` → `run.onStyleCombo()` adds to `run._flow` (once per run per combo).

**Logger:** `logStyleCombos()` wired at `GameRoundManager._onStyleCombos()` line 1764. `logStyleHandAchieved()` EXISTS in GameplayLogger (line 390) but is NEVER CALLED from anywhere.

### Suspect items

**C1. `GameRoundManager.recordStyleHand()`** — line 343
```js
recordStyleHand() { this._styleBase += 0.1; return this._styleBase; }
```
**Callers:** NONE from scenes. Defined but never called.
**Recommendation:** INVESTIGATE — dead method. Was part of the old Style Hand system.

**C2. `GameRoundManager.roundStyleTotal` getter** — line 296
```js
get roundStyleTotal() { return this._style.getRoundStyleTotal(); }
```
**Callers:** NONE from scenes (checked grep).
**Recommendation:** INVESTIGATE — dead getter. `StyleEngine.getRoundStyleTotal()` itself works but nobody reads the GRM accessor.

---

## Section D: Deck-Fixing Consumables

### D1. `FOUR_PRACTICES` array — deprecated alias

**File:** `src/data/consumables.js`, lines 68–102
```js
/** @deprecated — kept for backward compatibility; use CHAKRA_TOOLS instead. */
export const FOUR_PRACTICES = [ ... ];
```
**Content:** 4 entries: practice_path, practice_fasting, practice_mind, practice_tree
**Importers:** NONE — `FOUR_PRACTICES` is exported but never imported anywhere.
**Note:** The IDs `practice_path`, `practice_fasting`, `practice_mind`, `practice_tree` ARE still referenced in ShrineScene (lines 628–629, 1279–1282) for color coding and activation routing. But those reference the IDs directly, not through this array. The actual definitions used by the shop come from `CHAKRA_TOOLS`.
**Recommendation:** REMOVE the `FOUR_PRACTICES` export (array + JSDoc). The `practice_*` IDs in ShrineScene are wired through `CHAKRA_TOOLS` and `ConsumableEffects`, not through this deprecated array.

### D2. `THREE_MARKS` array + `getMarkDef`

**File:** `src/data/consumables.js`, lines 104–134
```js
/** @deprecated — kept for backward compatibility with any save state. */
export const THREE_MARKS = [ ... ];
export const getMarkDef = (id) => THREE_MARKS.find(m => m.id === id);
```
**Importers of `getMarkDef`:** Used in ShrineScene mark overlay logic. The marks themselves (mark_impermanence, mark_nonbeing, mark_transcendence) are actively used in both scenes.
**Recommendation:** KEEP — `getMarkDef` is actively called. The `@deprecated` comment is misleading; this is live code.

---

## Section E: Void Spirit References

No references to `engine_void`, `spirit_void`, or a Void spirit found anywhere in `src/`.
**Recommendation:** No action needed.

---

## Section F: Feng Shui Legacy Effect

### F1. Spirit definition

**File:** `src/data/spirits.js`, line 1065
```js
{ id: 'legend_feng_shui', name: 'Feng Shui', ... rarity: 'rare', category: 'engine_slot' }
```
**Status:** Active. Feng Shui is a Rare spirit (not Legendary despite the `legend_` prefix). It gives multiplicative bonus based on empty spirit slots.
**Recommendation:** KEEP — prefix is misleading but functional.

### F2. Spirit effect

**File:** `src/systems/SpiritEffects.js`, lines 959–967
```js
legend_feng_shui: {
  applyEngine({ spirit }) {
    const emptySlots = run.spiritSlots - occupiedNonFengShui;
    return { multiplyMult: 1 + 0.5 * emptySlots * stacks };
  },
},
```
**Status:** Active, works correctly. No legacy "+2 legendary slots" behavior found.
**Recommendation:** KEEP

### F3. Tooltip in GameScene

**File:** `src/scenes/GameScene.js`, lines 1383–1393
**Status:** Active tooltip showing Feng Shui contribution.
**Recommendation:** KEEP

---

## Section G: Orphaned Spirit Effects

No orphaned spirit effects found. All spirit handlers in `SpiritEffects.js` reference active systems (points, mult, multiplyMult, state tracking). No handlers reference deprecated mechanics.

---

## Section H: Orphaned Hexagram Effects

### H1. `computeFinalScore` hexagram hook

**File:** `src/systems/HexagramEffects.js`, line 332
**Status:** ACTIVE — used by `hex_56` (one_yaku_disabled) to apply a custom scoring formula. Called from GameRoundManager lines 1482–1483 and 1612–1613.
**Recommendation:** KEEP

No `onYakuScore` or `onYakuComplete` hooks found anywhere.

---

## Section I: Dead Helper Functions

### I1. `RunManager.buyYakuUpgrade()`

**File:** `src/systems/RunManager.js`, lines 1058–1068
**Callers:** NONE
**Recommendation:** REMOVE (see A1)

### I2. `RunManager.accumulateStyle()`, `addStyleBase()`, `decayStyle()`

**File:** `src/systems/RunManager.js`, lines 870–875
```js
/** @deprecated */ accumulateStyle(amount = 0.1) { this._styleBase += amount; }
/** @deprecated */ addStyleBase(amount) { this._styleBase += amount; }
/** @deprecated */ decayStyle() { this._styleBase = 1.0 + (this._styleBase - 1.0) * 0.7; }
```
**Callers:** NONE — grep for `accumulateStyle`, `addStyleBase`, `decayStyle` outside RunManager returns zero results.
**Note:** `_styleBase` IS still read (via `run.styleBase` getter) and passed to GRM via `setStyleBase()`. The GRM uses it in the flow formula: `flow = Math.max(1.0, this._styleBase * pushFactor)`. But these three MUTATOR methods are never called, so `_styleBase` is always 1.0 (its init value).
**Recommendation:** REMOVE these 3 deprecated methods.

### I3. `RunManager.applyRibbonStamp()`

**File:** `src/systems/RunManager.js`, lines 1471–1475
```js
/** @deprecated Use applyStamp instead. */
applyRibbonStamp(cardId, stampId) { return this.applyStamp(cardId, stampId); }
```
**Callers:** NONE — only its own definition found.
**Recommendation:** REMOVE

### I4. `GameRoundManager.recordStyleHand()`

**File:** `src/systems/GameRoundManager.js`, lines 343–346
**Callers:** NONE from any scene.
**Recommendation:** REMOVE (see C1)

### I5. `GameRoundManager.roundStyleTotal` getter

**File:** `src/systems/GameRoundManager.js`, line 296
**Callers:** NONE from scenes.
**Recommendation:** INVESTIGATE — removing it also makes `StyleEngine.getRoundStyleTotal()` orphaned, but that method is on a class instance so harder to confirm no dynamic calls. Low priority.

### I6. `GameplayLogger.logStyleHandAchieved()`

**File:** `src/systems/GameplayLogger.js`, line 390
**Callers:** NONE.
**Recommendation:** REMOVE

---

## Section J: Stale Comments and Documentation

### J1. Deprecated `@deprecated` on THREE_MARKS

**File:** `src/data/consumables.js`, line 104
```js
/** @deprecated — kept for backward compatibility with any save state. */
export const THREE_MARKS = [
```
**Status:** Misleading. THREE_MARKS is actively used via `getMarkDef()`.
**Recommendation:** REMOVE the `@deprecated` tag (keep the code).

### J2. ScoringEngine header comment mentions 5 yakus

**File:** `src/systems/ScoringEngine.js`, lines 1–24
```
// 5-yaku evaluation (flat additive bonus system)
// Tsuki-narabi+0.3  (5+ consecutive months; longest run)
// Maximum yaku mult: 1.0 + 0.3 + 0.3 + 0.4 + 0.3 + 0.7 = 3.0 (all 5 active)
```
**Status:** Incorrect. Only 4 yakus are active (Tsuki-narabi removed). Max mult is 1.0 + 0.3 + 0.3 + 0.4 + 0.7 = 2.7.
**Recommendation:** REMOVE Tsuki-narabi line and fix the max mult calculation.

### J3. GRM TODO comment about hexagram thresholds

**File:** `src/systems/GameRoundManager.js`, line 267
```js
// TODO(PostD-9a): Hexagram threshold modifiers were designed for fixed thresholds.
```
**Status:** Unknown relevance. May still be valid planning context.
**Recommendation:** KEEP (low priority)

### J4. GRM TODO about Applause spirit

**File:** `src/systems/GameRoundManager.js`, line 1554
```js
// TODO: when Applause spirit is added, held-card retriggers will be handled there.
```
**Status:** Applause spirit does not exist. May be future work.
**Recommendation:** KEEP (planning context)

### J5. `ribbonStamps.js` deprecated re-export file

**File:** `src/data/ribbonStamps.js` (entire file)
```js
/** @deprecated  Import directly from stamps.js in new code. */
export { STAMPS as RIBBON_STAMPS, getStampDef as getRibbonStampDef } from './stamps.js';
```
**Importers:** NONE — no file imports from `ribbonStamps.js`.
**Recommendation:** REMOVE entire file.

### J6. `_styleBase` field and comment

**File:** `src/systems/RunManager.js`, lines 126–129
```js
/** @deprecated Use this._flow for all scoring. */
this._styleBase = 1.0;
```
**Status:** The field IS still read (`run.styleBase` getter called from GameScene lines 216, 2944; `setStyleBase` in GRM uses it for the flow formula). The `@deprecated` tag is misleading — the field is actively used in the scoring pipeline even though it never changes from 1.0.
**Recommendation:** INVESTIGATE — `_styleBase` is always 1.0. The flow formula `Math.max(1.0, this._styleBase * pushFactor)` simplifies to `Math.max(1.0, pushFactor)`. But this touches the scoring pipeline and is better suited for a scoring cleanup pass.

---

## Bonus: Dead Constants

### GameScene.js unused constants

**File:** `src/scenes/GameScene.js`, lines 128–133
```js
const CONS_SLOT_W  = CONS_CARD_W * 3 + 16;    // 208
const CONS_SLOT_H  = CONS_CARD_H + 8;          // 112
const CONS_SLOT_X  = 1024 - CONS_SLOT_W / 2;   // 920
```
**Status:** `CONS_SLOT_W`, `CONS_SLOT_H`, `CONS_SLOT_X` are declared but NEVER used anywhere (the dark consumable rectangle that used them was removed). `CONS_BASE_X` is derived from them but is also unused (consumable positioning now uses `CONS_FAN_LEFT` from SpiritLayout.js). `CONS_BASE_Y` is still used (3 references).
**Recommendation:** REMOVE `CONS_SLOT_W`, `CONS_SLOT_H`, `CONS_SLOT_X`, `CONS_BASE_X`. Keep `CONS_BASE_Y` (but could replace with `SPIRIT_Y` since they're equal).

### ShrineScene.js partially dead constants

**File:** `src/scenes/ShrineScene.js`, line 52
```js
const SPIRIT_GAP = 76;   // used by consumable spacing
```
**Status:** Only used to derive `CONS_FAN_X = SPIRIT_GAP` on line 62. Both are used for shrine consumable grid layout (line 482: `CONS_BASE_X + i * CONS_FAN_X`).
**Recommendation:** KEEP (still actively used for shrine consumable grid)

---

## Quick-Win Removal Candidates (Safe, Zero Blast Radius)

These can be removed with no risk of breaking anything:

1. `RunManager.buyYakuUpgrade()` — method with zero callers
2. `RunManager.accumulateStyle()` — deprecated, zero callers
3. `RunManager.addStyleBase()` — deprecated, zero callers
4. `RunManager.decayStyle()` — deprecated, zero callers
5. `RunManager.applyRibbonStamp()` — deprecated wrapper, zero callers
6. `ScoringEngine._checkTsukiNarabi()` + dead comment — zero callers, would crash if called
7. `data/consumables.js FOUR_PRACTICES` export — zero importers
8. `data/ribbonStamps.js` — entire file, zero importers
9. `GameplayLogger.logStyleHandAchieved()` — zero callers
10. `GameRoundManager.recordStyleHand()` — zero callers
11. `CONS_SLOT_W`, `CONS_SLOT_H`, `CONS_SLOT_X`, `CONS_BASE_X` constants — zero uses
12. Fix `@deprecated` tag on `THREE_MARKS` (it's live code)
13. Fix ScoringEngine header comment (4 yakus, not 5)

## Deferred to Scoring Cleanup Pass

These are larger-blast-radius changes that touch the scoring pipeline:

1. Remove `_yakuUpgrades` field/getter and all `run.yakuUpgrades` call sites (simplify `evaluate()` and `calculateFinalScore()` signatures)
2. Remove `_styleBase` field/getter and simplify the flow formula in GRM
3. Remove `GRM.roundStyleTotal` getter chain
