# Scoring-Loop Consolidation — Inventory & Triage (Pass 1)

> Standing reference for the **Tier-3 scoring-loop pass** (Phase 4, Tier 3, the marquee task).
> Seeded from the opening recon + the design rulings made in the kickoff discussion. Status: LIVE
> during the pass; archive at pass close-out.
> Companion to: the opening recon brief, DECISIONS_LOG `D-F4-SCORING-TIER3` (the durable record,
> written at close-out). Inherits X1 from `D-F4-HEXAGRAMS-TIER2` §7 and F4.38 from
> `D-F4-CONSUMABLES-TIER2`.

## 1. Result headline

The roadmap's "merge two parallel loops" framing (OVERHAUL_PLAN F4.18) is **OBSOLETE**: F2.10b already
deleted the parallel stamp scoring-retrigger loop and folded it into the Phase-1.5 `retriggerCount`.
What actually remains is the per-card scoring math **TRIPLICATED across three sites**, plus the X1 hex
twins. The pass is therefore a **structural dedup** (collapse the triplication into shared helpers),
plus exactly **one deliberate behavior change** (F2.10c: hex `onCardScored` on scoring retriggers), plus
**one independent correctness fix** (N2 hand-cap). The merge-vs-separate semantic question is HALTED
(re-reverses a considered F2.3 decision; already relocated to Phase 5/F5.0).

Three roadmap-inherited "gaps" were investigated and found NOT to be gaps (verification caught them
before any edit): (a) the "two parallel loops" — already merged by F2.10b; (b) "metal-from-hand omitted
from retriggers" — the held-from-hand block IS already retrigger-aware via `'held_in_hand'`, and the
scoring retrigger loop correctly excludes held effects; (c) "Earth held-mult during scoring" — returns
×1.0 (no-op) in ordinary play; only `boost_earth` (hex_15) makes it nonzero. Only the **hex
`onCardScored`** omission (F2.10c) is a real behavior gap.

## 2. Structural map — the scoring/capture computation sites (all in `GameRoundManager.js`)

Verdict: **scoring is ONE path** (capture-scoring `_addCapture`), already unified at the
retrigger-count level (F2.10b). Stamp side-effects are a second dispatch block in the same method,
joined to scoring only via the shared `'capture'` retrigger count. `_scoreFieldCards` is a third,
near-clone of the per-card scoring block for the round-end field-scoring hex. The **per-card scoring
math (Fire/Water/Wood + Gold/Crystal/Ghost editions + hex `onCardScored` + spirit `onCardScored`) is the
dedup target** — it is written three times.

| # | Site | Region | Computes | Notes |
|---|------|--------|----------|-------|
| A | `_addCapture` held-from-hand | before per-card loop | Metal-held mult (`getMetalHeldMult`) + Meteorite jackpot RNG; Earth-held mult (`getEarthHeldMult`, ×1.0 unless `boost_earth`) | loops `1 + _computeRetriggerCount(handCard, 'held_in_hand')` → **already retrigger-aware** |
| B | `_addCapture` per-card | main loop | base pts + Fire/Water/Wood + editions + hex `onCardScored` + spirit `onCardScored` + spirit `onCardSeen` | the canonical full per-card block |
| C | `_addCapture` Phase 1.5 retrigger | after B | re-runs base + Fire/Water/Wood + editions + spirit `onCardScored`. **OMITS hex `onCardScored`** (and `onCardSeen`) | the F2.10c gap (hex only) |
| D | `_addCapture` Phase 2 engines | after C | spirit `applyEngine` in slot order | sees retriggered totals (correct) |
| E | `_addCapture` final commit | end | `computeFinalScore` else `Math.round(points*mult*flow)` | X1 twin |
| F | `_scoreFieldCards` | round-end (hex-gated) | re-implements base + Fire/Water/Wood + editions + hex `onCardScored` + spirit `onCardScored` + `applyEngine` + `computeFinalScore` | near-clone of B+D+E; no retrigger, no held-from-hand, no `onCardSeen` |

**Duplication tally (the dedup targets):**
- Per-card enhancement/edition math (Fire/Water/Wood + Gold/Crystal/Ghost): **3×** — B, C, F.
- Spirit `onCardScored` merge (`{addPoints?,addMult?,multiplyMult?}` × count): **3×** — B, C, F.
- Hex `onCardScored`: **2×** — B, F (absent from C = the F2.10c gap).
- `computeFinalScore` final-commit: **2×** — E, F.
- `onCaptureComplete` (the post-capture return-intent hook): **2×** — the normal capture path + the
  `disableCaptureScoring` early-return branch (recon's "threefold" third item; lives near E).

**Retrigger primitive:** `_computeRetriggerCount(card, triggerType, isFirstCardOfCapture)` — adds +1
white / +3 gray stamp, then folds spirit `getRetriggerCount`. Trigger types: `'capture'` (scoring +
capture-stamps), `'held_in_hand'`, `'discard'`, `'yaku'` (and a legacy `'scoring'` string in the JSDoc;
live calls use `'capture'`). Call sites: C (`'capture'`), A (`'held_in_hand'`), `_computeEarthKiBonus`
(`'held_in_hand'`), capture-stamp dispatch (`'capture'`), discard-stamp, yaku-stamp.

**What F2.10b already consolidated (do NOT re-do):** the ~85-line standalone stamp captured-trigger
scoring-retrigger block (which used isolated `rPts`/`rMult` at ×1.0, breaking multiplicative
compounding) was deleted; stamp scoring-retriggers now ride C's `retriggerCount`. Only stamp
*side-effects* (ki/draw/consumable) remain a distinct block.

## 3. Scoring/capture-touch inventory

| Surface | Effect | Contributes | Fires at | Retrigger-aware? |
|---------|--------|-------------|----------|------------------|
| Enhancement | Fire | +flat pts | B, C, F | scoring (C) ✓ |
| | Water (Snow/Ice) | ×mult (depreciates) | B, C, F | scoring (C) ✓ |
| | Wood | ×mult | B, C, F | scoring (C) ✓ |
| | Metal-held | ×mult + jackpot | A (capture-level) | held_in_hand ✓ |
| | Earth-held mult | ×mult (×1.0 unless `boost_earth`) | A | held_in_hand ✓ |
| | Earth ki bonus | ki (% of current ki) | `_computeEarthKiBonus`, ROUND-END | held_in_hand ✓ (out of scope — F5.8) |
| Edition | Gold/Crystal/Ghost | +pts / +mult / ×mult | B, C, F | scoring (C) ✓ |
| Hex | `onCardScored` (season/axis) | merge {add/mult} | B, F | scoring (C) ✗ ← **F2.10c** |
| | `computeFinalScore` | overrides final formula | E, F | n/a |
| Spirit | `onCardScored` | merge {add/mult} × count | B, C, F | scoring (C) ✓ |
| | `onCardSeen` | state accrual | B only | n/a |
| | `applyEngine` | points/mult | D, F | n/a (post-card) |
| | `getRetriggerCount` | +retrigger | via `_computeRetriggerCount` | — (the primitive) |
| Stamp | ki / draw / consumable | side-effect | capture / discard / yaku blocks | per trigger type ✓ |

Retrigger families (DESIGN_DOC §7.8, verified): **scoring** = Dew/Wish/Family/Rainbow (rank-keyed) —
retrigger per-card scoring math, do NOT touch held effects. **held_in_hand** = Applause — retriggers
held Metal/Earth contributions. **universal** = White (+1) / Gray (+3) stamps — any trigger type.
Mirror/Memory inherit their target's scope. Echo = first capture of round.

## 4. Capture-vs-scoring dependency ledger (the design decision — HALTED)

| Effect | Class | Interaction |
|--------|-------|-------------|
| Rank-retrigger (Dew/Wish/Family/Rainbow) + capture stamps | **SEPARATION-BLOCKED** | one `'capture'` count drives BOTH scoring re-run AND stamp re-fire (Dew+Yellow=+6 ki/capture). Splitting re-breaks this. |
| White/Gray universal stamps | **SEPARATION-BLOCKED** | their +1/+3 feeds the one count driving scoring AND their own effect |
| Per-card scoring math, hex/spirit `onCardScored`, editions | merge-indifferent | identical merged or split — but triplicated (the dedup target) |
| Stamp discard/yaku effects | merge-indifferent | already on distinct `'discard'`/`'yaku'` types |
| `applyEngine`, Metal/Earth-held | merge-indifferent | post-scoring / capture-level |

**Verdict (Robert, kickoff):** merge-vs-separate is **HALTED for this pass.** Separating re-reverses
the deliberate F2.3 Prompt-B-follow-up merge ("scoring math and capture-trigger stamps fire in the same
atomic capture event"), is separation-blocked by ≥5 named compounding interactions, and is already
relocated to **Phase 5 / F5.0**. The Tier-3 pass is **mechanical dedup only**.

## 5. The pass scope (final, post-kickoff rulings)

**In scope — three separable campaigns:**

- **D1 — structural dedup (behavior-preserving).** Collapse the triplicated per-card scoring math
  (Fire/Water/Wood + editions + spirit `onCardScored` merge) and the X1 hex twins (`onCardScored`,
  `computeFinalScore`) across B, C, F into shared helpers. **Subsumes F4.38 and X1.** Verified
  byte-identical. **Held-from-hand seam (site A) extracted as a CONTRIBUTION OBJECT** — see §6.
- **D2 — F2.10c [FIX] (one deliberate behavior change).** The shared per-card helper applies hex
  `onCardScored` on scoring retriggers (site C) too — so C stops omitting it. The ONLY observable
  behavior change in the pass. Targeted verification: a retriggered card under an active season/axis
  hex now scores with the hex multiplier (scores higher); enumerable to Dew/Wish/Family/Rainbow +
  White/Gray when a `boost_*` season/axis hex is active. **Lands AFTER D1, isolated**, so the change is
  visible and tested on its own — not buried in the refactor.
- **D3 — N2 hand-cap [FIX] (independent correctness).** Stamp draws currently splice the card out of
  the deck before `HandManager.add` clamps to max — a silent card-leak on a full hand (card removed
  from deck, never added). Fix: pre-check available hand slots before drawing; draw only what fits,
  leave the rest in the deck. Apply at all THREE stamp-draw branches (discard, capture-stamp orange,
  yaku) for consistency. Matches established hand-cap behavior (under cap → draw to cap; at cap → not
  drawn, not dropped). Independent of D1/D2; can land anytime.

**NOT in scope:**
- **Merge-vs-separate** — HALTED (§4); Phase 5 / F5.0.
- **Earth mechanic redesign** (Clay→+1 ki/scoring, Pottery→+1 ki +1 interest/scoring, compounding with
  Applause/stamps) — Phase 5 / **F5.8**. D1 only PREPARES THE SEAM for it (§6); does not implement it.
- **Metal/Earth held-mult retrigger-awareness** — already correct (loops `held_in_hand`); no change.
- **Earth ki bonus** — already retrigger-aware, round-end; F5.8 territory.

## 6. The held-from-hand seam — shaped to receive the Earth redesign (Robert's ruling)

D1 must extract site A's held-from-hand accumulation as a **structured contribution**, not a bare mult.
Today it only multiplies `mult`; the planned F5.8 Earth redesign makes Earth contribute **ki and
interest per scoring event** instead of (no-op) mult. To avoid re-opening the seam in Phase 5, extract
it now in a shape with room for those channels:

- Held contribution shape: `{ multiplyMult?, addKi?, addInterest? }` (or the codebase's idiomatic
  equivalent — match the existing `onCardScored` `{addPoints?,addMult?,multiplyMult?}` convention for
  consistency). **Today only `multiplyMult` is populated** (Metal's mult; Earth's ×1.0). `addKi` /
  `addInterest` are latent (absent / zero) — the prepared slot.
- **This is NOT speculative architecture:** the redesign is a documented, Phase-5-homed intent (F5.8),
  and the shape mirrors a pattern already in the code (`onCardScored` contributions). It costs D1
  almost nothing (one field populated) and turns the F5.8 change into "populate an existing channel"
  rather than "restructure the held block." YAGNI does not bar building a known seam in its known shape
  when the code is already open.
- **D1 stays behavior-preserving regardless:** with only `multiplyMult` populated, the math is
  byte-identical to today. The seam shape is structural, not behavioral.

## 7. Doc-vs-code drifts to correct (D-F4-DOCSYNC instances, ride the campaign that touches the file)

- **DESIGN_DOC §8.2.2** — "Earth enhancements also contribute mult when held in hand during scoring
  (Phase 1)" overstates a hex-gated behavior as baseline. Code canonical: `getEarthHeldMult` returns
  ×1.0 (no effect) in ordinary play; only `boost_earth` (hex_15) makes it nonzero (×1.2 / ×1.5). Qualify
  the line accordingly. (Note: F5.8 will rewrite this section anyway — the correction is interim
  accuracy.)
- **DECISIONS_LOG F2.10b note** — flags hex `onCardScored` AND metal-from-hand as the Phase-1.5
  retrigger omission. Only the **hex** half is a real omission; metal-from-hand is `held_in_hand`-scoped
  and correctly excluded from the scoring retrigger loop. Append a one-line clarification (don't rewrite
  the record): F2.10c resolves the hex half only; the metal-from-hand "omission" was a mis-bundling.

## 8. Campaign ledger

- **D1** — structural dedup + held-from-hand seam-shaping. [PRESERVE], byte-identical. Subsumes F4.38 + X1. **Status: PENDING (next).**
- **D2** — F2.10c hex-on-scoring-retrigger [FIX]. One enumerable behavior change. After D1. **Status: PENDING.**
- **D3** — N2 hand-cap [FIX]. Independent. **Status: PENDING.**
- Doc drifts (§7) — ride D1 (DESIGN_DOC §8.2.2 touched by seam work) / D2 (F2.10b note). **Status: PENDING.**

## 9. Process notes

- Scoring is HIGH-TRUST code. D1's verification bar is byte-identical scoring output across a broad
  scenario sweep; D2's is targeted (only the enumerated retrigger-under-hex cases change, upward).
- D1 and D2 kept separate ON PURPOSE: a behavior-preserving refactor must change zero output, so the
  one intended change (D2) lands isolated — if any unexpected output moves in D1, it's a bug.
- Re-grep current line numbers per campaign (the recon's are point-in-time; scoring code is dense).
- Named items parked (own tickets, not this pass): N1 (engine_northern_lion activeSpirits ratification),
  N3 (engine_lincoln desc/behavior), Monkey-yaku non-surfacing (UI).
