# Round-End Pipeline Recon (pre-F4.18b)

> **STATUS: CLOSED 2026-06-07 — consumed by F4.18b. Historical record, do not update. See PHASE4_STATE.md.**

**Date:** 2026-06-05. **Source:** `GameRoundManager.js` read top-to-bottom against live
working tree (commit c4fee6b+).

---

## Section 1 — Round-end trigger sites

Five distinct code paths cause `_phase = "round_over"`:

### 1A. Bank path — `bankScore()` (GRM:734-817)
- **Trigger:** Player presses Bank during `yaku_decision` phase.
- **Guard:** `this._phase !== "yaku_decision"` throws.
- **Result:** Sets `_phase = "round_over"` at GRM:796. Returns `{ status: "banked", ... }`.

### 1B. Natural round-over — `_finalizeTurn()` (GRM:2106-2122)
- **Trigger:** `roundOver` is true (hand empty, `this._hand.isEmpty()` at GRM:2054) AND
  no new yaku triggered (`newYaku.length === 0`) AND no tiger push AND no forced auto-bank.
  Falls through to the `else if (roundOver || _forceAutoBank)` branch at GRM:2106.
- **Guard:** Reached only inside `_finalizeTurn()`, which is called from `_doDeckPhase()`.
- **Result:** Sets `_phase = "round_over"` at GRM:2122. Returns via the unified
  `_finalizeTurn` return object with `status: "round_over"`.

### 1C. Forced auto-bank — `_finalizeTurn()` (GRM:2106-2122, same branch as 1B)
- **Trigger:** `_forceAutoBank` is true (new yaku + `forceAutoBankOnYaku` hex hook returns
  true, GRM:2099). Computed as: `!_disablesYaku && newYaku.length > 0 && applyHook('forceAutoBankOnYaku', false)`.
- **Guard:** Only the `yaku_ends_round` hexagram effect defines `forceAutoBankOnYaku`.
- **Result:** Same branch as 1B — identical teardown. Status returned as `"round_over"`
  (GRM:2130).
- **Important:** This path does NOT go through `bankScore()`. It runs the natural-path
  teardown, not the bank teardown. No `run.onBank()`, no `engine_lincoln` increment, no
  hex `onBank` hook.

### 1D. Consumable-triggered round end — `_checkRoundEndOnEmptyHand()` (GRM:1154-1162)
- **Trigger:** A consumable (Horse, Monkey) empties the player's hand mid-round.
- **Guard:** `this._hand.getAll().length > 0` → return false. `this._phase === 'round_over'`
  → return false.
- **Result:** Sets `_phase = 'round_over'` at GRM:1160. Returns `true` to the caller.
- **CRITICAL: This is a STRIPPED pipeline.** It fires ONLY hex `onRoundEnd` + spirit
  `_fireSpiritHook('onRoundEnd')`. It does NOT run: flow decay, post-round enhancements,
  `logRoundEnd`, decay spirit decrements, snail tracking, crow consumable generation,
  `_scoreFieldCards`, or `_applyPostRoundEnhancements`. This is a **fourth pipeline** with
  severe omissions.

### 1E. `yaku_decision` intermediate state (GRM:2103-2105)
- **Trigger:** New yaku reached (or tiger push), and `_forceAutoBank` is false.
- **Result:** Sets `_phase = "yaku_decision"`. Does NOT end the round yet — waits for player
  to choose `bankScore()` (→ path 1A) or `pushOn()` (→ continues play). If `roundOver` is
  true at the same time (last hand card triggered yaku), `_roundEndingAfterDecision = true`
  is set so bankScore knows to not push again.

**No other triggers found.** No legendary or hexagram directly sets `_phase = "round_over"`
outside these paths (Waidan's Grove-exit logic is in ShrineScene, not a round-end trigger).

---

## Section 2 — Ordered teardown sequence per pipeline

### BANK PATH (`bankScore`, GRM:734-817)

| Step | Operation | Line |
|:----:|-----------|:----:|
| 1 | `run.onBank(this)` — apply push curve success multiplier to flow | 740 |
| 2 | Hex `onBank` hook (e.g. `push_ki_swing` bank cost) | 742-743 |
| 3 | `engine_lincoln` — increment banks counter (+0.1 mult/bank) | 746-748 |
| 4 | Decay spirits — `decay_persimmon` -3, `decay_pear` -5 | 750-758 |
| 5 | `_trackSnailsUnplayed()` — sym_snails hand-count accumulation | 761 |
| 6 | `_scoreFieldCards()` — score_field_at_round_end hex scoring | 764 |
| 7 | `run.applyFlowDecay()` — round-end flow decay | 767 |
| 8 | `_applyPostRoundEnhancements(capture)` — Water dep, Fire break | 770 |
| 9 | `logger.logRoundEnd(...)` | 771-776 |
| 10 | `_roundEndingAfterDecision = false` | 777 |
| 11 | `sym_crow` — generate consumable per stack (with debug logs) | 778-792 |
| 12 | Hex `onRoundEnd` hook | 793-794 |
| 13 | `_fireSpiritHook('onRoundEnd')` — all spirit onRoundEnd hooks | 795 |
| 14 | `_phase = "round_over"` | 796 |

### NATURAL / FORCED-AUTO-BANK PATH (`_finalizeTurn`, GRM:2054-2122)

Note: Steps marked with `[guard: roundOver]` only fire when `roundOver` is true.
The forced-auto-bank path (`_forceAutoBank && !roundOver`) skips those steps.

| Step | Operation | Line |
|:----:|-----------|:----:|
| — | `roundOver = this._hand.isEmpty()` | 2054 |
| — | `penaltyApplied = roundOver && pushPenaltyActive && !dogProtection` | 2055 |
| 1 | `[guard: roundOver]` `_trackSnailsUnplayed()` | 2056 |
| 2 | `[guard: roundOver]` `sym_crow` — generate consumable per stack | 2058-2072 |
| 3 | `[guard: roundOver && penaltyApplied]` `run.onPushFailure(this)` | 2077 |
| 4 | `[guard: roundOver && penaltyApplied]` `engine_napoleon` push-fail increment | 2078-2081 |
| 5 | `[guard: roundOver]` Decay spirits — `decay_persimmon` -3, `decay_pear` -5 | 2085-2093 |
| 6 | `_scoreFieldCards()` — score_field_at_round_end hex scoring | 2108 |
| 7 | `run.applyFlowDecay()` — round-end flow decay | 2110 |
| 8 | `_applyPostRoundEnhancements(capture)` — Water dep, Fire break | 2112 |
| 9 | `logger.logRoundEnd(...)` | 2113-2117 |
| 10 | Hex `onRoundEnd` hook | 2119-2120 |
| 11 | `_fireSpiritHook('onRoundEnd')` — all spirit onRoundEnd hooks | 2121 |
| 12 | `_phase = "round_over"` | 2122 |

### CONSUMABLE-TRIGGERED PATH (`_checkRoundEndOnEmptyHand`, GRM:1154-1162)

| Step | Operation | Line |
|:----:|-----------|:----:|
| 1 | Hex `onRoundEnd` hook | 1157-1158 |
| 2 | `_fireSpiritHook('onRoundEnd')` | 1159 |
| 3 | `_phase = 'round_over'` | 1160 |

That's it. Three steps total. Everything else is omitted.

### DIFF TABLE

| Operation | Bank (1A) | Natural/ForceAuto (1B/1C) | Consumable (1D) | Classification |
|-----------|:---------:|:------------------------:|:---------------:|----------------|
| `run.onBank(this)` | Step 1 (L740) | -- | -- | **ASYMMETRIC (bank-only)** — intentional: bank multiplier only on explicit bank |
| Hex `onBank` hook | Step 2 (L742) | -- | -- | **ASYMMETRIC (bank-only)** — intentional: push_ki_swing bank penalty |
| `engine_lincoln` bank incr | Step 3 (L746) | -- | -- | **ASYMMETRIC (bank-only)** — intentional: counts explicit banks only |
| `run.onPushFailure(this)` | -- | Step 3 (L2077) | -- | **ASYMMETRIC (natural-only)** — intentional: push failure only on natural round-over with penalty |
| `engine_napoleon` push-fail incr | -- | Step 4 (L2078) | -- | **ASYMMETRIC (natural-only)** — intentional: counts push failures only |
| Decay spirits (persimmon/pear) | Step 4 (L750) | Step 5 (L2085) | -- | **DRIFTED (order) + ASYMMETRIC (missing from 1D)** — bank fires decay BEFORE snails/crow; natural fires AFTER crow. Consumable path skips entirely. |
| `_trackSnailsUnplayed()` | Step 5 (L761) | Step 1 (L2056) | -- | **DRIFTED (order) + ASYMMETRIC (missing from 1D)** — bank: after decay; natural: first step. Consumable path skips entirely. |
| `sym_crow` consumable gen | Step 11 (L778) | Step 2 (L2058) | -- | **DRIFTED (order) + ASYMMETRIC (missing from 1D)** — bank: after logRoundEnd; natural: before push-failure/decay. Consumable path skips entirely. |
| `_scoreFieldCards()` | Step 6 (L764) | Step 6 (L2108) | -- | **IDENTICAL** (same position relative to flow decay + enhancements). **ASYMMETRIC (missing from 1D).** |
| `run.applyFlowDecay()` | Step 7 (L767) | Step 7 (L2110) | -- | **IDENTICAL**. **ASYMMETRIC (missing from 1D).** |
| `_applyPostRoundEnhancements()` | Step 8 (L770) | Step 8 (L2112) | -- | **IDENTICAL**. **ASYMMETRIC (missing from 1D).** |
| `logger.logRoundEnd(...)` | Step 9 (L771) | Step 9 (L2113) | -- | **IDENTICAL** (same args shape). **ASYMMETRIC (missing from 1D).** |
| `_roundEndingAfterDecision = false` | Step 10 (L777) | -- | -- | **ASYMMETRIC (bank-only)** — cleared explicitly in bank; natural path clears it at the top of the yaku_decision branch (L2104 sets it, bankScore L777 clears it). The natural-roundOver branch never sets it, so clearing is unnecessary there. Intentional. |
| Hex `onRoundEnd` hook | Step 12 (L793) | Step 10 (L2119) | Step 1 (L1157) | **IDENTICAL** (present in all three). |
| `_fireSpiritHook('onRoundEnd')` | Step 13 (L795) | Step 11 (L2121) | Step 2 (L1159) | **IDENTICAL** (present in all three). |
| `_phase = "round_over"` | Step 14 (L796) | Step 12 (L2122) | Step 3 (L1160) | **IDENTICAL** (present in all three). |

### Key order drifts

1. **Snails vs Crow vs Decay ordering:** In the bank path, the sequence is decay → snails →
   (field scoring) → (flow decay) → (enhancements) → (log) → crow → (hex/spirit hooks).
   In the natural path, the sequence is snails → crow → (push failure) → decay →
   (field scoring) → (flow decay) → (enhancements) → (log) → (hex/spirit hooks).
   Crow fires BEFORE decay and flow-decay in the natural path, but AFTER both in the bank path.

2. **Crow relative to `logRoundEnd`:** Bank fires crow AFTER `logRoundEnd` (so the log
   doesn't capture the crow-generated consumable). Natural fires crow BEFORE the
   `roundOver || _forceAutoBank` branch (so before `logRoundEnd`). This means the log
   captures different state.

3. **Flow decay relative to crow:** In the bank path, flow decay fires BEFORE crow (Step 7
   before Step 11). In the natural path, flow decay fires AFTER crow (crow at Step 2,
   flow decay at Step 7). If crow-generated consumables interact with flow, the ordering
   matters.

---

## Section 3 — `onRoundEnd` consumer inventory

### Spirit hooks (SpiritEffects.js)

| Spirit | Line | What it does | Double-fire risk | Zero-fire risk | Order sensitivity |
|--------|:----:|-------------|:----------------:|:--------------:|:-----------------:|
| `engine_radiance` | 406-414 | Clears per-round `seenBrights` arrays (per-element or negative sub-arrays) | Harmless (clearing already-empty arrays) | **Bug:** next round starts with stale brights from the prior round, inflating mult | None — operates on own state only |
| `engine_banner` | 451-459 | Clears per-round `seenRibbons` arrays (same structure as radiance) | Harmless | **Bug:** stale ribbons carry over | None |
| `econ_collector` | 541-545 | Adds `effectivePower(spirit)` to `sellPriceBonus` on all spirits and consumables | **Bug:** double-firing doubles the bonus | Collector bonus doesn't apply for this round | Runs after flow decay — order-insensitive (modifies sell price, not scoring) |

### Hexagram hooks (HexagramEffects.js)

| Effect | Line | What it does | Double-fire risk | Zero-fire risk |
|--------|:----:|-------------|:----------------:|:--------------:|
| `eight_spirits_graduated_tax` | 438-443 | Spends `excess * 3` ki (excess = spiritCount - 4, floored at 0). Uses `Math.min(tax, run.ki)` to avoid negative ki. | **Bug:** double tax | Tax not applied — extra ki retained | Order-insensitive (ki mutation only) |

### Blast radius summary

- `engine_radiance` and `engine_banner` are the most sensitive to **zero-fire** — they rely
  on `onRoundEnd` to reset per-round state. If the consumable path (1D) ends a round without
  firing these hooks... wait, the consumable path DOES fire `_fireSpiritHook('onRoundEnd')`.
  So these DO fire. The issue is that 1D skips everything ELSE (flow decay, enhancements,
  crow, decay spirits, logging).
- `econ_collector` is the most sensitive to **double-fire** — it stacks a permanent bonus.

---

## Section 4 — Inline spirit/consumable logic in round-end paths (F4.20 tenants)

| Spirit/System | Bank path | Natural path | Consumable path | Duplicated? |
|--------------|:---------:|:------------:|:---------------:|:-----------:|
| `engine_lincoln` bank increment | L746-748 | -- | -- | No (bank-only, intentional) |
| `decay_persimmon` / `decay_pear` decrements | L750-758 | L2085-2093 | -- | **YES** — identical logic in both paths, missing from 1D |
| `_trackSnailsUnplayed()` (sym_snails) | L761 | L2056 | -- | **YES** — same helper call, missing from 1D |
| `sym_crow` consumable generation | L778-792 | L2058-2072 | -- | **YES** — nearly identical logic block (different console.log tags: `[CROW BANK]` vs `[CROW ROUNDEND]`), missing from 1D |
| `engine_napoleon` push-fail increment | -- | L2078-2081 | -- | No (natural-only, intentional — push failure) |
| `run.onPushFailure(this)` | -- | L2077 | -- | No (natural-only, intentional) |
| `run.onBank(this)` | L740 | -- | -- | No (bank-only, intentional) |

**Tenants that would migrate into hooks as a consequence of unification:**
- `sym_crow` → `onRoundEnd` hook (eliminates the duplication entirely)
- `decay_persimmon` / `decay_pear` → `onRoundEnd` hook (eliminates duplication)
- `_trackSnailsUnplayed` → could fold into `onRoundEnd` or stay as a shared helper called from the unified `_endRound()`
- `engine_lincoln` → `onBank` spirit hook (already bank-specific, doesn't need unification — just needs its own hook when bank fires)

---

## Section 5 — Shared vs. divergent helpers

### Already factored into shared helpers (model for unification)

| Helper | Bank (1A) | Natural (1B/1C) | Consumable (1D) |
|--------|:---------:|:----------------:|:---------------:|
| `_scoreFieldCards()` | L764 | L2108 | -- (skipped) |
| `_applyPostRoundEnhancements(capture)` | L770 | L2112 | -- (skipped) |
| `_trackSnailsUnplayed()` | L761 | L2056 | -- (skipped) |
| `_computeEarthKiBonus()` | L815 (in return) | L2163 (in return) | -- (skipped) |
| `_fireSpiritHook('onRoundEnd')` | L795 | L2121 | L1159 |
| `run.applyFlowDecay()` | L767 | L2110 | -- (skipped) |
| `logger.logRoundEnd(...)` | L771 | L2113 | -- (skipped) |

### Open-coded inline (needs factoring)

| Logic | Bank (1A) | Natural (1B/1C) | Notes |
|-------|:---------:|:----------------:|-------|
| `sym_crow` generation loop | L778-792 | L2058-2072 | 15-line block, near-identical, different log tags |
| Decay spirit decrements | L750-758 | L2085-2093 | 8-line block, identical |
| `engine_lincoln` bank counter | L746-748 | -- | Bank-specific; could become a spirit `onBank` hook |
| Push failure handling | -- | L2075-2081 | Natural-specific; `run.onPushFailure` + napoleon counter |

---

## Section 6 — Return-value contract

### Bank path return (`bankScore`, GRM:797-816)

```js
{
  status:          "banked",
  finalScore:      this._runningScore,
  runningScore:    this._runningScore,
  captureEvents:   [...this._scoringEvents],
  newYaku:         [],
  allYaku:         [],
  basePoints:      this._runningScore,
  flow,                                    // captured BEFORE applyPostRoundEnhancements
  pushFactor:      1.0,
  penaltyApplied:  false,                  // always false on bank
  pushCount:       this._pushCount,
  pushDepth:       this._pushDepth,
  pigDoubleKi:     this._pigDoubleKi,
  turn:            this._turn,
  deckCard:        this._lastDeckCard,
  cardsInHand:     this._hand.getAll().length,
  styleCombos:     this._style.getTriggeredCombos().length,
  earthKiBonus:    this._computeEarthKiBonus(),
}
```

### Natural/forced-auto-bank return (`_finalizeTurn`, GRM:2138-2164)

```js
{
  status,                                  // "round_over" or "ok" or "yaku_decision"
  newYaku,
  yakuDisabled:     !!_disablesYaku,
  tigerPush:        !!tigerTriggered,
  nextDeckFlip:     this._nextDeckFlip,
  captureEvents:    [...this._scoringEvents],
  runningScore:     this._runningScore,
  allYaku:          yakuForDiff,
  basePoints:       this._runningScore,
  finalScore:       this._runningScore,
  flow,                                    // captured AFTER push-failure but before the
                                           // roundOver branch (flow decay runs inside branch)
  pushEscalation,                          // 1.0 (vestigial)
  pushFactor:       1.0,
  penaltyApplied,                          // true if push failed
  pushCount:        this._pushCount,
  pushDepth:        this._pushDepth,
  pigDoubleKi:      this._pigDoubleKi,
  nextFailFlow:     1.0,
  turn:             this._turn,
  deckCard:         this._lastDeckCard,
  discarded:        [...this._discardedThisTurn],
  roundDiscardCount: this._discardCount,
  cardsInHand:      this._hand.getAll().length,
  styleCombos:      this._style.getTriggeredCombos().length,
  earthKiBonus:     this._computeEarthKiBonus(),
}
```

### Diff between return objects

| Field | Bank | Natural | Notes |
|-------|:----:|:-------:|-------|
| `status` | `"banked"` | `"round_over"` | GameScene checks both in `_handleResult` switch |
| `newYaku` | `[]` (hardcoded) | computed | Bank never has new yaku (already resolved) |
| `yakuDisabled` | absent | present | Natural-only |
| `tigerPush` | absent | present | Natural-only |
| `nextDeckFlip` | absent | present | Natural-only |
| `runningScore` | present | present | Same value |
| `allYaku` | `[]` | computed | Bank clears it |
| `pushEscalation` | absent | `1.0` | Vestigial |
| `penaltyApplied` | `false` | computed | Bank never has penalty |
| `nextFailFlow` | absent | `1.0` | Natural-only |
| `discarded` | absent | present | Bank doesn't report discards |
| `roundDiscardCount` | absent | present | Bank doesn't report discards |
| `flow` | pre-enhancement | pre-roundOver-branch | **DRIFTED:** bank captures `flow` AFTER `applyFlowDecay()` but BEFORE `_applyPostRoundEnhancements`. Natural captures `flow` BEFORE the roundOver branch runs (so BEFORE `applyFlowDecay()`). The `flow` value in the return is DIFFERENT between the two paths — bank returns post-decay flow, natural returns pre-decay flow. |

### GameScene consumption (`_showEndScreen`, GRM call sites)

**`_handleResult(result)` at GameScene:2626-2648** — switch on `result.status`:
- `'banked'` and `'round_over'` both route to `_showEndScreen(result)`.

**`_showEndScreen(result)` at GameScene:2704-2920+** reads:
- `result.status` — title text ("Score Banked!" vs "Round Over")
- `result.finalScore` — score display + threshold check via `run.checkThreshold()`
- `result.penaltyApplied` — shows push-failure warning text
- `result` passed to `run.calculateKiReward(result)` — which reads: `result.cardsInHand`,
  `result.earthKiBonus`, `result.penaltyApplied`, `result.pushDepth`

**`_showYakuDecision(result)` at GameScene:3020+** reads:
- `result.tigerPush`, `result.yakuDisabled`, `result.newYaku`, `result.runningScore`

**Fields confirmed NOT consumed by GameScene:**
`pushEscalation`, `nextFailFlow`, `pushFactor`, `allYaku` (only in yaku overlay, not end
screen), `discarded` (only in deck-flip animation, not end screen), `roundDiscardCount`.

---

## Section 7 — Observations / risks

- **GRM:781, 786, 787, 791** — `[CROW BANK]` console.log debug statements. Stale debug logs;
  remove during F4.18b.
- **GRM:2061, 2066, 2069, 2071** — `[CROW ROUNDEND]` console.log debug statements. Same —
  stale debug logs; remove during F4.18b.
- **GRM:1154-1162** — `_checkRoundEndOnEmptyHand()` is a **severely stripped pipeline**. It
  fires the hex and spirit `onRoundEnd` hooks but skips flow decay, post-round enhancements,
  logging, crow, decay spirits, snails, and field scoring. If a consumable (Horse/Monkey)
  empties the hand, the player loses their flow decay, their Water/Fire mutations don't
  process, and Crow doesn't generate consumables. This is almost certainly a bug, not an
  intentional design choice. **Highest priority for F4.18b.**
- **GRM:769 vs 2097** — `flow` capture timing differs between bank and natural returns. Bank
  captures `flow` at L769 (AFTER `applyFlowDecay()` at L767). Natural captures `flow` at
  L2097 (BEFORE the roundOver branch at L2106 which calls `applyFlowDecay()` at L2110). This
  means the `flow` field in the return object is post-decay for bank but pre-decay for
  natural. GameScene doesn't read `result.flow` directly in `_showEndScreen` (it reads
  `run.flow` live), so this may be harmless — but the inconsistency is a bug surface if
  anyone starts reading `result.flow`.
- **GRM:2096** — `const pushEscalation = 1.0; // removed — no longer used` — dead variable.
  Remove during F4.18b.
- **GRM:2156** — `nextFailFlow: 1.0` — dead field in the return object. Remove during F4.18b.
- **Crow ordering risk:** In the bank path, crow fires AFTER `logRoundEnd`, so the round-end
  log doesn't reflect crow-generated consumables. In the natural path, crow fires BEFORE
  `logRoundEnd` (well, before the `roundOver||_forceAutoBank` branch), so the log potentially
  DOES reflect them. This is a minor log-consistency drift, not a gameplay bug.
- **Forced auto-bank does NOT call `run.onBank()`** — this is deliberate (the hexagram effect
  `yaku_ends_round` auto-ends the round without push-curve bank bonuses), but should be
  documented in the unified `_endRound()` to prevent future drift.

---

## Section 8 — Consolidation feasibility verdict

### Verdict: **DRIFTED** — feasible but requires 4 deliberate decisions

The bank (1A) and natural (1B/1C) pipelines share the same core teardown (field scoring →
flow decay → enhancements → log → hex hook → spirit hooks → phase transition) and differ
only in:

1. **Bank-specific prologue** (steps 1-3): `run.onBank()`, hex `onBank`, `engine_lincoln`.
   These are intentionally bank-only. **Decision: parametric — run the bank prologue only
   when `trigger === 'banked'`.**

2. **Push-failure block** (natural steps 3-4): `run.onPushFailure()`, `engine_napoleon`.
   These are intentionally natural-roundOver-only with penalty. **Decision: parametric —
   run when `trigger === 'natural' && penaltyApplied`.**

3. **Order of crow/snails/decay relative to the core teardown:** Bank puts decay early
   (before the core), natural puts them all before the core too but in a different sub-order
   (snails → crow → push-failure → decay vs. bank's decay → snails → ... → crow). **Decision:
   normalize to one order. Recommend: snails → decay → (bank prologue or push-failure) → crow
   → core teardown. This makes crow fire last before the core, which is most consistent.**

4. **`flow` capture timing in the return object:** Bank captures post-decay; natural captures
   pre-decay. **Decision: always capture post-decay (after `applyFlowDecay()`). GameScene
   reads `run.flow` live, not `result.flow`, so this is safe.**

### Target shape

```js
_endRound(trigger) {
  // trigger: 'banked' | 'natural' | 'forced_auto_bank' | 'consumable_empty_hand'

  // ── Pre-core (trigger-specific) ──────────────────────────────────────
  if (trigger === 'banked') {
    run.onBank(this);
    const _hex = getActiveEffect();
    if (_hex?.onBank) _hex.onBank(run);
    // engine_lincoln: migrate to onBank spirit hook (F4.20 step)
  }
  if (trigger === 'natural' && this._pushPenaltyActive && !this._dogProtection) {
    run.onPushFailure(this);
    // engine_napoleon: migrate to onPushFailure spirit hook (F4.20 step)
  }

  // ── Shared core teardown ─────────────────────────────────────────────
  this._trackSnailsUnplayed();
  // decay spirits (→ migrate to onRoundEnd hook, F4.20)
  // sym_crow (→ migrate to onRoundEnd hook, F4.20)
  this._scoreFieldCards();
  run.applyFlowDecay();
  this._applyPostRoundEnhancements(this._capture.getAll());
  logger.logRoundEnd(...);
  this._roundEndingAfterDecision = false;
  const _hex = getActiveEffect();
  if (_hex?.onRoundEnd) _hex.onRoundEnd(this);
  this._fireSpiritHook('onRoundEnd');
  this._phase = 'round_over';

  // ── Return object (unified) ──────────────────────────────────────────
  return { status: trigger === 'banked' ? 'banked' : 'round_over', ... };
}
```

The consumable path (1D) would call `_endRound('consumable_empty_hand')` instead of its
current stripped 3-line implementation, gaining all the missing teardown steps.

**Risk level: LOW.** The drifts are all in ordering of side-effects (crow, snails, decay)
that don't interact with each other. The core teardown (field scoring → flow decay →
enhancements → log → hooks) is already identical. The main value is fixing the consumable
path (1D), which is genuinely buggy.

**Coordination with F4.20:** Migrating `sym_crow`, `decay_*`, `engine_lincoln`, and
`engine_napoleon` into hooks BEFORE unifying the pipeline would make unification trivial —
the duplicated inline blocks would be gone, replaced by single `_fireSpiritHook` calls that
already exist in the core teardown. **Recommend: do the F4.20 migrations (Crow, decay) first,
then unify. The unification becomes a mechanical merge of 3 pipelines into 1 with almost no
inline code left.**
