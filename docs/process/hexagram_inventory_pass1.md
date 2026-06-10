# Hexagram-Logic Centralization — Inventory & Triage (Pass 1)

> Standing reference for the hexagram block (Phase 4, Tier 2, third/final category).
> Seeded from the opening recon. Status: LIVE during the block; archive at block close-out.
> Companion to: `docs/process/hexagram_block_kickoff.md` (the brief), DECISIONS_LOG
> `D-F4-HEXAGRAMS-TIER2` (the durable record, written at close-out).

## 1. Result headline

Seepage is fully **HOOK-SHAPED** — zero manager-resident hex logic (the STOP condition did NOT
trigger). The block is smaller than the brief feared: the feared `hex.effect ===` name-checks were
already cleaned (H1). What remains:

- **B1** — a documentation pass (this doc + header reconciliation). DOCUMENTATION-ONLY.
- **A1** — a small import-cycle tidy + class-(c) param normalization. `[PRESERVE]`.
- **X1** — a Tier-3 hand-off (the threefold scoring-loop duplication).

One optional unification (a void-dispatcher `fireHook`) was CONSIDERED and DECLINED (Ruling 1 = (b)).

## 2. Hook-name reconciliation table

Legend: **D?** = in `HexagramEffects.js` header / DESIGN_DOC §9.1.2 (post-B1: all accurate);
**dispatch** = applyHook / direct (`getActiveEffect()`) / getter (Wu Xing `getX()` wrapper).

| Hook | Dispatch | Call site(s) | Defined by | Pre-B1 flag |
|---|---|---|---|---|
| `onRunStart` | direct | RM:407–408 | one_yaku_disabled, start_50_ki_no_income, price_increase_more_consumable_slots | ok |
| `onRoundStart` | direct | GRM:370–371 | one_yaku_disabled | ok |
| `onRoundEnd` | direct | GRM:1180–1181 | eight_spirits_graduated_tax | ok |
| `onCardScored` | direct | GRM:1437–1454 **&** 483–495 | 22 boost_* effects | duplicated (H3) |
| `modifyYakuThreshold` | applyHook | GRM:260 | one_yaku_disabled, field_minus_two_threshold_minus | ok |
| `modifyFieldSlots` | applyHook | GRM:1003 | field_*, deck_36 | ok |
| `modifyHandSize` | applyHook | GRM:407 | field_*, deck_60 | ok |
| `modifySpiritSlots` | applyHook | RM:441 | spirit_*, four/eight_spirits | ok |
| `modifyCardsDealt` | applyHook | GRM:409, 920 | spirit_* | ok |
| `pushCurveSuccessAmplifier` | applyHook | RM:1537 | volatile_flow, stable_flow | ok |
| `pushCurveFailureAmplifier` | applyHook | RM:1537 | volatile_flow, stable_flow | ok |
| `modifyFlowDecay` | applyHook | RM:1125 | volatile_flow, stable_flow, yaku_ends_round | ok |
| `modifyInitialFlow` | — | **none** | **none** | **documented-but-dead → DELETED (B1)** |
| `modifyKiReward` | applyHook | RM:1238 | start_50_ki_no_income | ok |
| `modifyInterestRate` | applyHook | RM:1261 | no_hand_ki_double_interest, start_50_ki | ok |
| `modifyHandKi` | applyHook | RM:1233 | no_hand_ki_*, start_50_ki | ok |
| `modifyShopCount` | applyHook | Shrine:111,199,963 | plus/minus_offerings | ok |
| `modifyShopPrice` | applyHook | RM:349 | minus_offerings, price_increase | ok |
| `modifyRerollCost` | applyHook | Shrine:129,959 | plus_offerings_double_reroll | ok |
| `modifyDeck` | direct | RM:415–417 | ~13 deck effects | ok (array return) |
| `overridesCaptureRule` | applyHook | GRM:400 | match_by_rank, match_by_adjacent_month | ok |
| `computeFinalScore` | direct | GRM:1628 **&** 539 | balanced_scoring | duplicated (H3) |
| `modifyStyleKi` | applyHook | RM:1159, GRM:1810 | style_ki_double, style_flow_double | ok |
| `modifyStyleFlow` | applyHook | RM:1146 | style_ki_double, style_flow_double | ok |
| `onCaptureComplete` | direct | GRM:1787 **&** 1326 | no_hand_ki_plus_capture | called-but-undoc + duplicated → DOCUMENTED (B1) |
| `onPushSuccess` | direct | RM:1080 | push_ki_swing | called-but-undoc → DOCUMENTED (B1) |
| `onPushFailure` | direct | RM:1097 | push_ki_swing | called-but-undoc → DOCUMENTED (B1) |
| `onBank` | direct | GRM:1157 | push_ki_swing | called-but-undoc → DOCUMENTED (B1) |
| `revealsDeckFlip` | applyHook | GRM:570 | deck_flip_revealed | called-but-undoc → DOCUMENTED (B1) |
| `discardUnmatchedDeckFlip` | applyHook | GRM:1299 | deck_flip_revealed | called-but-undoc → DOCUMENTED (B1) |
| `forceAutoBankOnYaku` | applyHook | GRM:2147 | yaku_ends_round | called-but-undoc → DOCUMENTED (B1) |
| `modifyPlaysPerTurn` | applyHook | GRM:366 | play_two_cards | called-but-undoc → DOCUMENTED (B1) |
| `disablesYaku` | applyHook | GRM:2055 | match_by_rank | called-but-undoc → DOCUMENTED (B1) |
| `disableCaptureScoring` | applyHook | GRM:1320 | score_field_at_round_end | called-but-undoc → DOCUMENTED (B1) |
| `scoreFieldAtRoundEnd` | applyHook | GRM:442 | score_field_at_round_end | called-but-undoc → DOCUMENTED (B1) |
| `shouldSpiritsFireTwice` | applyHook | GRM:1481 | four_spirits_fire_twice | called-but-undoc → DOCUMENTED (B1) |
| `modifyDeckFlipsPerTurn` | applyHook | GRM:2014 | field_plus_two_double_flip | called-but-undoc → DOCUMENTED (B1) |
| `modifyFirePoints` | getter (getFireFlatPoints) | HexEffects:730 | boost_fire, boost_metal | undoc-but-correct → DOCUMENTED (B1) |
| `modifyFireBreakChance` | getter (getFireBreakChance) | HexEffects:734 | boost_fire, boost_metal | undoc-but-correct → DOCUMENTED (B1) |
| `modifyWaterDepreciation` | getter (getWaterMult) | HexEffects:745 | boost_fire, boost_water | undoc-but-correct → DOCUMENTED (B1) |
| `modifyMetalHeldMult` | getter (getMetalHeldMult) | HexEffects:750 | boost_wood, boost_metal | undoc-but-correct → DOCUMENTED (B1) |
| `modifyMeteoriteJackpot` | getter (getMeteoriteJackpotChance) | HexEffects:754 | boost_wood, boost_metal | undoc-but-correct → DOCUMENTED (B1) |
| `modifyEarthInterest` | getter (getEarthInterestRate) | HexEffects:758 | boost_water | undoc-but-correct → DOCUMENTED (B1) |
| `modifyWoodScoring` | getter (getWoodScoringMult) | HexEffects:762 | boost_wood, boost_earth | undoc-but-correct → DOCUMENTED (B1) |
| `modifyEarthHeld` | getter (getEarthHeldMult) | HexEffects:766 | boost_earth | undoc-but-correct → DOCUMENTED (B1) |

**Pre-B1 mismatch summary:** 1 documented-but-dead (`modifyInitialFlow`, deleted); 13
called-but-undocumented (4 lifecycle + 9 radical flags, now documented); 8 undoc-but-correct Wu Xing
getters (now documented as Class 3); 0 defined-but-never-called; 0 called-but-undefined.

## 3. Seepage census

**Pattern 1 — Direct `getActiveEffect()` reads outside `applyHook` (H2b).** Every one bypasses for a
*structural* contract reason (Ruling 1 = (b) keeps them as direct reads):

| # | Site | Hook | Why it bypasses | Bucket |
|---|---|---|---|---|
| 1 | RM:407–408 | onRunStart | void side-effect | B (documented) |
| 2 | RM:415–417 | modifyDeck | returns whole deck array | B |
| 3 | GRM:370–371 | onRoundStart | void side-effect | B |
| 4 | GRM:1157–1158 | onBank | void side-effect | B |
| 5 | GRM:1180–1181 | onRoundEnd | void side-effect | B |
| 6 | RM:1080–1081 | onPushSuccess | void side-effect | B |
| 7 | RM:1097–1098 | onPushFailure | void side-effect | B |
| 8 | GRM:1787–1790 | onCaptureComplete | void side-effect | B |
| 9 | GRM:1326–1329 | onCaptureComplete (dup, disableCaptureScoring branch) | void side-effect | B |
| 10 | GRM:1437–1454 | onCardScored | multi-field merge contract | **Tier-3 (X1)** |
| 11 | GRM:483–495 | onCardScored (dup) | multi-field merge contract | **Tier-3 (X1)** |
| 12 | GRM:1628–1631 | computeFinalScore | formula override | **Tier-3 (X1)** |
| 13 | GRM:539–542 | computeFinalScore (dup) | formula override | **Tier-3 (X1)** |

None bypass "for no reason / could use applyHook today." Every direct read has a genuine contract
reason → this was a **design question** (resolved: Ruling 1 = (b)+(c)), not a pile of Bucket-A migrations.

**Pattern 2 — `hex.effect` / effect-id name-checks (H1):** NONE in the engine. The only `hex.effect`
reads are inside the dispatcher itself (`HexEffects:698,700`). `RM:912` (`b.effect === effectId`) is
**blessings**, not hexagrams. `GRM:1646` (`run.getHexagram()?.effect`) is a **log label string**, not
a control-flow branch. ✅

**Pattern 3 — Scoring-loop duplication (H3):** threefold (broader than the brief's twofold). See §7.

**Pattern 4 — Effects using the `run` singleton instead of their handed param (H4):** three hooks
across two effects (the brief expected one effect):

- `one_yaku_disabled.onRoundStart` (HexEffects:340–346) — `run._hexagramState` ×3, despite header
  declaring `onRoundStart(roundManager)`.
- `one_yaku_disabled.modifyYakuThreshold` (HexEffects:349) — `run._hexagramState` (value-transformer,
  no param available).
- `eight_spirits_graduated_tax.onRoundEnd` (HexEffects:439,442) — `run.scoringSpirits`,
  `run.spendKi(Math.min(tax, run.ki))`; handed `roundManager` but reaches the singleton.

These effects' state genuinely lives on `run` (`run._hexagramState`) or needs `run.scoringSpirits` +
`run.spendKi`, so even normalized, something must reach run. A1 owns this.

**Pattern 5 — Genuinely manager-resident hex *logic* (the STOP-condition check):** **NONE.** All hex
behavior is hook-shaped — an effect body in `HEXAGRAM_EFFECTS` or a dispatch call. No decision-making
hex logic lives in GRM/RunManager/ScoringEngine; only hook invocations + shared, generic scoring-merge
plumbing. **The STOP condition does not trigger — the dispatch-discipline thesis holds.**

## 4. Import-cycle classification + ruling

**Cycles (confirmed, not re-discovered):**
- `RunManager ↔ HexagramEffects`: RM:13 imports `{ getActiveEffect, applyHook }`; HexEffects:47
  imports the `run` singleton.
- Transitive: `ScoringEngine → SpiritEffects → RunManager → HexagramEffects → RunManager`.

**Every `run.` use inside `HexagramEffects.js`, classified:**

| Site | Use | Class |
|---|---|---|
| HexEffects:696 | `run.getHexagram()` (in `getActiveEffect`) | **(a) dispatch-helper coupling — load-bearing** |
| HexEffects:336 | `runManager._hexagramState` (onRunStart) | (b) handed param ✓ |
| HexEffects:602 | `runManager._ki = 50` | (b) handed param ✓ |
| HexEffects:622–624 | `r.addKi` (destructured param) | (b) handed param ✓ |
| HexEffects:628–636 | `r.addKi`/`r.spendKi` (push_ki_swing) | (b) handed param ✓ |
| HexEffects:641–643 | `runManager._maxConsumableSlots = 5` | (b) handed param ✓ |
| HexEffects:340–346 | `run._hexagramState` ×3 (onRoundStart) | **(c) singleton instead of param** |
| HexEffects:349 | `run._hexagramState` (modifyYakuThreshold) | (c) value-transformer, no param |
| HexEffects:439,442 | `run.scoringSpirits`/`spendKi`/`ki` (onRoundEnd) | **(c) singleton, handed GRM not run** |

**Ruling 2 = document-and-contain.** The only *irreducible* coupling is `getActiveEffect`/`applyHook`
needing `run.getHexagram()` (one read). The cycle is NOT load-bearing in a way that blocks the
canonical-home rule (it resolves fine at runtime). Accept the one-read RM↔HexEffects dispatch coupling
as deliberate. **A1** normalizes the class-(c) reaches where a handed param exists; the state-on-`run`
cases stay (nothing to normalize — `one_yaku_disabled` state and `eight_spirits` ki/spirits genuinely
live on run). Breaking the cycle outright (passing hex-def into `getActiveEffect`) would touch ~30
`applyHook` sites for one import edge — not worth it.

## 5. Canonical-home rule + dispatch-style ruling

**Rule:** Hex behavior = a hook in `HEXAGRAM_EFFECTS`, dispatched via one of the **3 documented
classes** (applyHook value-transformers/flags; direct `getActiveEffect()` side-effect/merge/array
reads; Wu Xing `getX()` config wrappers). The engine *calls hooks*; it **never special-cases a hex id**
(H1 ✅). The Wu Xing config getters stay — hex-responsive config, not seepage.

**Ruling 1 = (b)+(c):** keep the dual dispatch style, document it (B1 done — header + DESIGN_DOC
§9.1.2 + this doc). **No `fireHook` void-dispatcher.** `onCardScored` / `computeFinalScore` are handled
as a **Tier-3 scoring-loop concern** (cross-block, not this block).

**Boundary named:** the **dispatch-discipline surface** (this block — *how* hooks are invoked) vs. the
**scoring-loop surface** (Tier-3 — *how* `onCardScored` contributions are accumulated/deduped across
hex + Wu Xing + spirit). `onCardScored` sits **on the seam**: its dispatch is nominally this block's,
but its duplication/merge is inseparable from the Tier-3 scoring-loop dedup → hands-off here.

## 6. Campaign ledger

- **B1** — header reconciliation (`HexagramEffects.js` header + DESIGN_DOC §9.1.2) + this doc.
  DOCUMENTATION-ONLY, zero code-path change. **Status: DONE.**
- **A1** — import-cycle document-and-contain + class-(c) param normalization. `[PRESERVE]`. Gated on
  Ruling 2 (made). Touches 3 effect bodies (behavior-sensitive) → gets its own recon-gated prompt.
  **Status: PENDING.**
- **X1** — CROSS-BLOCK → Tier-3 scoring-loop dedup. Hand-off stub, §7. **Status: HANDED OFF.**

## 7. Tier-3 hand-off stub (X1)

The threefold duplication the Tier-3 scoring-loop pass inherits (do NOT dedup here; Tier-3 owns it,
subsumes F4.38 — cross-ref `PHASE4_STATE.md` §4 F4.38 deferral):

- **`onCardScored` merge** — `GRM:1437–1454` (`_addCapture`) **&** `GRM:483–495` (`_scoreFieldCards`).
  Byte-identical `{addPoints?, addMult?, multiplyMult?}` unpack, interleaved with Wu Xing enh procs
  (`GRM:464–481`) and spirit `onCardScored` (`GRM:1483+`).
- **`computeFinalScore`** — `GRM:1628–1631` (`_addCapture`) **&** `GRM:539–542` (`_scoreFieldCards`).
  Identical `_hexCompute?.computeFinalScore ? … : Math.round(points*mult*flow)`.
- **`onCaptureComplete`** — `GRM:1787–1790` (normal path) **&** `GRM:1326–1329` (the
  `disableCaptureScoring` early-return branch).

**Manual-gate note for Tier-3:** the hexagram scoring **animation steps** (`GRM:1462–1477`
`hexagram_card` event + `customFormula` log at `GRM:1646`) feed the GameScene scoring readout. Any
restructure of the `onCardScored`/`computeFinalScore` dispatch must manual-gate the in-game score
animation.
