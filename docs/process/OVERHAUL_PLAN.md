# Hanatu Overhaul Plan

**Date:** May 2026
**Scope:** Synthesis of audit findings (Slices 1–7) into a phased execution plan
**Source documents:**
- Design Doc V5 (`DESIGN_DOC_V5.md`)
- Cleanup catalog (`DEFERRED_CLEANUP_ITEMS.md`)
- Audit slices 1–7 (`SLICE_*.md`)

---

## Executive summary

The audit surfaced **~75 critical findings** and **~50 drift items** across seven systems. The codebase is structurally sound — the architecture (manager separation, hook system, spirit/hex/consumable registries) is well-designed and consistent. The findings cluster into five recurring patterns rather than scattered idiosyncratic bugs:

1. **Stack scaling is silently broken across the economy spirit roster.** Five spirits (Bonds, Coupon, Piggy Bank, Grace, Magpie) plus several engines (Wildlife, Plenty, Velocity, Lincoln, Napoleon, Wolf, Osprey, Persimmon, Pear) use `filter(...).length` instead of `reduce stackCount`. Players who stack these underperform doc-specified values by 50-67%.

2. **Description-vs-implementation drift is pervasive in hexagrams.** All 64 hexagrams have implementations, but ~25 have descriptions that diverge from code in magnitude, mechanism, or both. This is player-visible through HexagramCollectionScene, actively misleading after unlocks.

3. **Discount/ki paths have three different stacking behaviors.** Wu Xing/Cards/Alchemicals/Chakras stack cleanly; Spirits/Zodiacs/Stamps use a refund kludge; Legendaries get no discount support at all. Hexagram price modifiers don't apply to spirits or zodiacs.

4. **V4 scoring residue persists in result objects, logger, and dead methods.** ~50 lines of `additiveMult: 0, multMult: 1.0, pointBoost: 1.0, yakuMult: 1.0, metalConsumableCount: 0` plumbing is consumed by no live code path but flows through every round-end.

5. **UI displays values that don't reflect active hexagrams or capstones.** Bank/push projections, score-breakdown labels, ELEMENT_LABELS in card-target mode, ENH_DESC_TT tooltips, Yaku Reference, Snow/Ice mult badges — all show hardcoded baseline values.

The biggest **structural** finding is the Sacred Grove cadence mismatch: code does Grove every 3 rounds (12 visits/run); doc says act-end Grove (6 visits/run). This affects pacing, fusion progression, alchemical access, and shop economics. **Single biggest design call to make**.

---

## Five guiding principles for the overhaul

1. **Doc is canonical for design intent; code is canonical for implementation reality.** Where they disagree, pick which is right *for that specific finding* rather than blanket-applying one direction. Most cases the implementation is more thoughtful; many descriptions are placeholder.

2. **Fix the engines before the labels.** A hexagram description that says "×2 points" but does ×1.5 mult is fixed by deciding what it should do, then aligning both. Don't lock in mechanism first by editing one side.

3. **Stack scaling is a single-pattern fix.** ~12 spirits share the same `filter(...).length` bug. One unified pattern (`countStackedById(id)` helper) plus systematic application fixes them all. Highest leverage individual fix.

4. **Demo-readiness gates the priority of cosmetic fixes.** Threshold tuning, save/load, tutorial, art — the user-facing demo blockers — are downstream of correctness. Fix correctness first so balance work isn't done against shifting numbers.

5. **Single source of truth for shared values.** SNOW_MULT in three places, hexagram description vs effect, V4 scoring fields in five files — these are all "data lives in two places" failures. Consolidation is more durable than reconciliation.

---

## Phase structure overview

| Phase | Focus | Scope | Estimated effort |
|---|---|---|---|
| **0** | Triage decisions | 13 design calls that block downstream work | 1-2 hours |
| **1** | Foundation correctness | Cross-cutting bugs blocking accurate playtesting | 12-15 hours |
| **2** | System-level correctness | Per-spirit, per-hexagram, per-consumable corrections | 25-30 hours |
| **3** | UI/UX correctness | Player-visible value displays, missing affordances | 8-10 hours |
| **4** | Cleanup | Dead code removal, V4 residue, consolidation | 4-6 hours |
| **5** | §17 deferreds | Threshold tuning, save/load, tutorial, art, bundling | 60-100+ hours |

Phases 1-4 are correctness work and total ~50-60 hours. Phase 5 is the actual demo build-out. The overhaul is best executed in order; later phases assume earlier ones complete (e.g., threshold tuning in Phase 5 requires Phase 1's stack-scaling fix because spirits underperform until then).

---

## Phase 0: Triage decisions

**STATUS: CLOSED 2026-05-07** — All Phase 0 architectural buildout shipped and verified across 94 testing notes items. Architectural foundation (F1.8.a/b/c + D0.24) genuinely complete. Remaining items either superseded, deferred to Phase 1 with proper cross-references (D0.25, D0.26, D0.27, D0.19-2 partial regression, F2.3.i, F2.3.j), or skipped with sufficient alternate verification (D0.20-2).

These were design-call questions, not implementation work. Each blocked one or more findings downstream.

### D0.1: Sacred Grove cadence (Slice 5 C44)

**Question:** Every 3 rounds (code, 12 Grove visits) or every act-end (doc, 6 Grove visits)?

**Implications:**
- Code path: Faster fusion progression, more alchemicals, doubled Grove economy — current playtesting balanced around this
- Doc path: Tighter pacing per act, scarcer alchemicals, simpler tutorial framing

**Recommended:** Start by deciding act count vs round count. If the design intent is "6 acts, each ending in Grove" then doc wins. If "Grove every 3 rounds" feels like the right rhythm in playtesting, then doc updates and acts become a 6-round notional grouping with mid-act Grove visits.

### D0.2: Wu Xing cycle direction for hex_15/43/48/49/50 (Slice 4 C29)

**Question:** Generative cycle (current code) or destructive cycle (current comment)?

**Implications:**
- Generative: boost X weakens X's offspring (Wood→Fire). Coheres with "X feeds Y, depleting itself."
- Destructive: boost X weakens X's victim (Wood→Earth). Coheres with "X conquers Y."

**Recommended:** Destructive — Wu Xing's traditional asymmetry is destructive cycle (and the existing comment already says destructive). Re-target the 5 hexagram implementations to weaken the destructive-cycle target.

### D0.3: Wu Xing cycle hexagram descriptions (Slice 4 C30)

**Question:** Update the simple "×2 points and apply twice" description to match the implementation, or change implementation to actually do "×2 points and apply twice"?

**Recommended:** Update descriptions. Implementations are sophisticated and meaningful; descriptions are placeholder.

### D0.4: Boost-axis/seasonal/rank mechanism (Slice 4 C35)

**Question:** Should `boost_air/land/day/night/etc.` use `multiplyMult` (current code) or `multiplyPoints` (doc-implied "×N points")? Also, should opposite-axis penalties (×0.5) be documented or removed?

**Recommended:** Keep `multiplyMult`, keep penalties, update doc descriptions to match. The penalty creates strategic counterplay (don't run a mixed-axis deck when boost_air rolls).

### D0.5: Capstone shop block (Slice 5 C45)

**Question:** Confirm Capstones must NEVER appear in shop offerings.

**Recommended:** Confirm. Single-line filter fix.

### D0.6: Stack-aware economy spirits (Slice 5 C46, Slice 2 D11)

**Question:** Confirm Bonds (+5%/stack), Coupon (15%/stack), Piggy (×N+1/stack), Grace (×N+1/stack), Magpie (+3 ki × stack), and the engine cluster should multiply by stackCount.

**Recommended:** Confirm. Bonds cap is open question — recommend keeping cap at +25% (5 stacks) since that requires 3 regular + 2 negative which is extreme play.

### D0.7: Sacred Grove fusion section (Slice 2 C13, Slice 3 C19)

**Question:** Free for everyone (current), Cinnabar/Pearl gated (rest of design), or some hybrid?

**Recommended:** Cinnabar gates Tier 2 fusion (30 ki); Pearl gates Tier 4 capstone (50 ki). Tier 3 uses Mercury (unimplemented?). Re-check the alchemical role assignments.

### D0.8: Tier 4 capstone routing on Sacred Grove fusion (Slice 3 C19)

**Question:** When fusion produces a Capstone, must it go to Legendary slots (2 slots, separate from regular 4) and not regular spirit slots?

**Recommended:** Yes — capstones to legendary slots. Current code routes to regular slots, which is a bug.

### D0.9: Heart Chakra over-edition (Slice 3 C24)

**Question:** When player applies Heart Chakra to an already-edition card, should it overwrite, fail, or layer?

**Recommended:** Fail with a UI message. Editions are precious; silent overwrite is hostile.

### D0.10: One_yaku_disabled rotation (Slice 4 C38)

**Question:** Disable one yaku once at run start (doc) or rotate per round (code)?

**Recommended:** Once at run start (matches doc). Code path is harder to plan around. Also remove the undocumented -1 to other thresholds.

### D0.11: Speculative cards integration (Slice 3 D12, Slice 6 C60)

**Question:** Do speculative cards enter the shop pool now, or after art is produced?

**Recommended:** Defer until art is produced (matches current state). Document the speculative-integration milestone in §17 alongside save/load.

### D0.12: Logger toSnapshot retention (Slice 7 CL23)

**Question:** Are the 5 `toSnapshot()` methods seed-work for save/load, or pure dead code?

**Recommended:** Decide based on save/load intent. If save/load is roadmapped (likely yes per §17.4), keep them. If not, remove ~50 lines.

### D0.13: Tropic/Arctic/Solstice/Equinox name collision (Slice 4 C43)

**Question:** Hexagrams use 2/2/4/4-month definitions; spirits use 6/6/6/6 with overlap. Unified definition or accept the divergence?

**Recommended:** Accept divergence (spirits and hexagrams operate at different scales) but document explicitly in §9.4 and §7.15 that they use different definitions.

---

## Phase 1: Foundation correctness (15-20 hours)

**STATUS: READY TO START 2026-05-07** — Phase 0 closed. Phase 1 inherits the deferred items below in addition to its original scope.

**Inherited from Phase 0:**
- **D0.25** — Cuckoo Egg per-element hatch redesign (~3-5h). Same per-element pattern as D0.24 Past Life — each element tracks its own roundsRemaining countdown.
- **D0.26** — Algae self-count exclusion + summon-failure guard (~30 min). Two conditions added to single increment site. Folds in original D0.19-1.
- **D0.27** — Ducks mult explosion bug investigation + fix (~1-2h). Runaway multiplication observed during playtest; mechanic may need redesign.
- **D0.19-2 partial regression** — Osprey 2-card-empty fallback edge cases (~1h investigation). Fallback fix has gaps in specific configurations.
- **F2.3.i** — Universal consumable carry-over (4-6h). Routes Cinnabar/Mercury/Pearl/Chakras through inventory. Re-enables F1.8.c-4 and F1.8.c-5 verification post-fix.
- **F2.3.j** — Throat→Heart Chakra duplicate visibility (~1-2h). Unblocks D0.9-2 verification.

**Original Phase 1 scope:**
These are the cross-cutting fixes whose absence undermines all downstream work. Without them, balance tuning and playtesting work against shifting numbers.

### F1.1: Stack scaling unified fix (Slice 5 C46, Slice 2 D11)

**Affected items:** Bonds, Coupon, Piggy Bank, Grace, Magpie (economy); Wildlife, Plenty, Velocity, Lincoln, Napoleon, Wolf, Osprey, Persimmon, Pear (engines/symbionts).

**Fix pattern:**
```js
// New helper in RunManager
countStackedById(id) {
  return this._allSpirits
    .filter(s => s.id === id)
    .reduce((sum, s) => sum + (s.stackCount ?? 1), 0);
}
```

Replace all `filter(s => s.id === 'X').length` with `countStackedById('X')`. ~15-20 callsites.

For symbionts using Slot-checked spirits (Magpie at GRM 1714: `if (this._spirits.some(s => s.id === 'sym_magpie')) run.addKi(3 * combos.length)`):
```js
const magpieStacks = this.countStackedById('sym_magpie');
if (magpieStacks > 0) run.addKi(3 * combos.length * magpieStacks);
```

**Verify:** After fix, doc-stated values (3-stack Bonds = +15%, 3-stack Coupon = 45% discount, 3-stack Piggy = ×4, 3-stack Wolf = ×6, etc.) all hit. Test with a script that runs synthetic 3-stack runs and asserts magnitude.

**Effort:** 4-5 hours including verification.

### F1.2: Unified shop pricing through `getEffectiveCost` (Slice 5 C47, Slice 2 C12)

**Affected:** Spirits, Zodiacs, Legendaries don't see hexagram price modifiers; Coupon currently applied via refund kludge.

**Fix:**
```js
// RunManager
getEffectiveCost(baseCost) {
  if (this._devMode) return 0;
  const couponStacks = this.countStackedById('econ_coupon');  // depends on F1.1
  const couponDiscount = Math.min(couponStacks * 0.15, 0.45);
  let price = couponStacks > 0 ? Math.ceil(baseCost * (1 - couponDiscount)) : baseCost;
  return applyHook('modifyShopPrice', price, price);
}
```

Then route every purchase through this single helper:
- `buySpirit(offering)` already uses `getEffectiveCost(spiritDef.cost)` — gets full functionality automatically
- `buyConsumable(consumableId)` already uses `getEffectiveCost(def.cost)` — same
- Legendary purchase → use `getEffectiveCost(LEGENDARY_PURCHASE_COST)`
- Wu Xing/Cards/Alchemicals/Chakras path: replace `_price()` with `getEffectiveCost`
- Stamps: same

Eliminates the refund kludge entirely.

**Effort:** 3 hours including testing all purchase paths.

### F1.3: Three-of-seven missing ki components — **SUPERSEDED 2026-05-07**

**Original spec:** Per-yaku +5, per-push +5, surplus bonus.

**Status:** SUPERSEDED. During Phase 1 scoping (2026-05-07), Robert identified the original spec as obsolete relative to current design direction. None of the three components will be implemented:
- **Per-yaku ki:** dilutes yakus' strategic importance (they already gate bank/push)
- **Surplus bonus:** rewards shop luck more than skill ("ki should feel earned")
- **Per-push flat ki:** redundant with flow risk/reward; better to tie INTEREST to push/bank

**Replaced by F2.6** (Push-driven interest mechanic). See F2.6 entry below for design intent.

No code changes in Phase 1.

### F1.4: Fix the Coupon refund kludge consequence (Slice 5 logging accuracy)

After F1.2, the refund kludge is removed. Logger transcripts no longer show "spirit purchased for full price, refunded discount" mismatches.

**Effort:** Subsumed by F1.2.

### F1.5: V4 scoring residue removal (Slice 7 C63, C62, Cleanup catalog confirmed)

**Affected:** GRM result objects (`bankScore` 727-730, `_finalizeTurn` 2096-region), GameplayLogger.logRoundEnd consumers, ScoringEngine.calculateFinalScore stub, _applyPostRoundEnhancements `metalConsumableCount` parameter and loop.

**Approach:** Either (a) remove all V4 fields entirely, or (b) make the round-end log aggregate from per-capture events.

**Recommended:** Two-step:
1. Remove `additiveMult`, `multMult`, `pointBoost`, `pointBoostDetail`, `yakuMult`, `boostedBasePoints`, `rawBasePoints`, `metalConsumableCount` from all result objects, GRM internals, and logger consumption. ~40 lines.
2. Replace logRoundEnd's now-thin breakdown with an aggregated per-capture summary derived from `scoringEvents` (the V5 source of truth). Top contributors per capture, total spirits-fired, total stamps-fired, etc.

This produces a round-end transcript that's more useful than V4's (had aggregated totals; now has actual per-event traces) without retaining placeholder fields.

**Effort:** 3 hours.

### F1.6: Logger captures hexagram + complete spirit loadout (Slice 7 C64, C65)

**Add:**
- `logger.logHexagramAssignment(hexagram)` called from `RunManager.setHexagram` — name, id, description
- `logger.logSpiritLoadout` accepts all three collections (regular, negative, legendary) with stackCount and full state

**Effort:** 1 hour.

### F1.7: Semantic addKi reasons (Slice 7 C66)

**Add reason argument to ~30-40 `run.addKi` callsites.** Stamp green discard (`'stamp_green_discard'`), Recycling overflow (`'recycling_overflow'`), Goat per-card (`'goat_capture'`), Meteorite jackpot (`'meteorite_jackpot'`), Yellow stamp (`'stamp_yellow_capture'`), Reward push (`'reward_push'`), Magpie combo (`'magpie_combo'`), Pig zodiac (`'pig_zodiac'`), Dragon zodiac (`'dragon_lottery'`), each shop refund category, each round-end component.

**Effort:** 1.5-2 hours (mostly mechanical).

### F1.8: Spirit Architectural Foundation — **SHIPPED in PHASE 0 2026-05-07**

**Originally scoped for Phase 4, promoted to Phase 1 mid-stream, then absorbed into Phase 0** because the architectural debt was actively producing correctness bugs in playtest (3x-power negatives indistinguishable from 3-stack regulars in UI; UI bundling negatives into regular displays; whole-stack state shared incorrectly across mid-run acquisitions). Phase 0 work could no longer cleanly proceed against the old data model — D0.24 (Past Life redesign) explicitly blocked on this, as did many other Phase 0 verifications.

**STATUS: All three sub-tasks (F1.8.a, F1.8.b, F1.8.c) shipped during Phase 0 alongside 10 follow-up corrections. See DECISIONS_LOG.md for full chain of decisions and the Phase 0 retrospective in TESTING_NOTES_V2.md.**

**Architectural changes that landed (summary):**
- F1.8.a: Negatives → singletons with `powerLevel` field; `effectivePower(spirit)` helper unifies reads
- F1.8.b: Per-element accumulator state across 25 accumulator spirits
- F1.8.c: GameScene spirit column re-render after consumable use/sell
- 10 followups iteratively corrected emergent issues during verification (scoring loop count multiplier, sale path element pop sync, stale `&& spirit.state` guards, init for matching stackCount, per-stack iterative cascade, longest-held aggregation, Velocity T1 scaling, tooltip/Garden engine sweep, transcendence preservation via aggregate/powerLevel, Algae failed-summon rollback)

The original F1.8 detailed sub-sections below are retained as historical context for the architectural decisions; all are now landed and verified.

This work consists of three interlocking refactors that ship as separate prompts in dependency order:

**F1.8.a: Negative `powerLevel` field (formerly F4.13)**

Establishes the data model. Negatives become true singletons (`stackCount: 1`) with explicit `powerLevel` field. Helper `effectivePower(spirit)` unifies reads. Migration logic for in-progress saves.

Scope: data model change + grep-replace migration across all consumers of `stackCount` on negatives (engines, increment sites, `countStackedById`, transcendence paths, tooltips).

Effort: ~6-8 hours.

**F1.8.b: Per-element state for accumulator spirits (formerly F4.12, absorbing F4.11)**

Builds atop F1.8.a. Regulars use `elements` array (per-element state objects); negatives use singleton `state` object (transcendence aggregates element states into a single object that continues accumulating). Unified aggregation/increment helpers. Pattern 1/Pattern 2 unification absorbed.

Scope: refactor across ~17 accumulator spirits, increment site updates, transcendence/sale path reconciliation.

Effort: ~10-14 hours.

**F1.8.c: F3.13 UI roster correctness fix**

After F1.8.a + F1.8.b, the UI render code can be simplified considerably. Fix the bundling bug where negatives are absorbed into regular displays. Distinguish negatives visually via `isNegative` flag rather than stackCount inference.

Scope: roster UI render code refactor; tooltip updates for power vs stack distinction.

Effort: ~3-5 hours.

**Phase 1 total impact:** F1.8 adds ~19-27 hours to Phase 1.

**Cross-references:**
- D0.24 (Past Life): blocked on F1.8.a + F1.8.b. Implementation prompt drafted but not yet shipped pending architectural foundation.
- F4.11, F4.12, F4.13 (now moved to F1.8 sub-items): see those sections in Phase 4 for detailed historical context. The work was promoted to Phase 1 based on playtest evidence that the architectural debt is actively producing correctness bugs.

**Phase 1 total: ~31-42 hours (was 12-15; +F1.8 ~19-27).** After this phase, balance/playtesting works against accurate numbers AND the spirit data model is architecturally clean.

---

## Phase 2: System-level correctness (25-30 hours) — **🟢 CLOSED 2026-05-26**

This is the bulk of the audit-driven work — per-spirit, per-hexagram, per-consumable corrections. These can be parallelized; many are independent.

### Phase 2 closure summary (2026-05-26)

**Testing battery complete.** 247 tests run across 9 batches over 2 sessions. Final tally: 184 verified (●), 25 partial (◐), 5 failed (✗), 29 deferred (⤵), 3 obsolete (❌), 0 untested.

**Bug fixing complete for Phase 2 scope.** Of 16 bugs surfaced during testing:
- **7 fixed in closeout session 2026-05-26:** B-1 (+5 phantom), B-2 (Horse+Ship), B-4 (Memory/Mirror stacking), B-5 (Third Eye+Wuji), B-12 (Crown Chakra mutations), B-15 (Algae frozen), B-16 (Cat 2/4 uniqueness inflation)
- **1 resolved through observation:** B-3 (Meteorite jackpot — was firing correctly, initial test didn't run long enough)
- **2 deferred to Phase 3 UI work:** B-9 (UI opacity in break event), B-11 (Leaf-spawned field slot invisible)
- **6 deferred to Phase 4:** B-6 (Gankyil 3-stack — design reconsideration), B-7 (Snow/Ice timing), B-8 (Clay/Pottery timing), B-10 (Silk anti-stranding scope), B-13 (Festival per-round cap), B-14 (Proportional thresholds deck-size scaling)

Full bug details + test results in `/home/claude/audit/PHASE_2_TESTING.md`.

**Surfaced Phase 4 design questions:**
- Spirit stacking math audit needed (additive vs multiplicative vs "fires twice") — multiple spirits stack multiplicatively where players may expect additive; comprehensive audit + canonical decision needed for F4.24/F4.25
- Hook-firing centralization (F4.24 area) — multiple bugs (B-2, B-5) stemmed from code paths bypassing centralized helpers. Comprehensive audit + helper consolidation recommended

### F2.1: Spirit corrections (Slices 1-2 ~25 critical findings)

Group these by mechanism:

**F2.1.a: Sacred Grove fusion fixes (Slice 2 C13, Slice 3 C19)**
- Apply ki cost (Cinnabar 30, Pearl 50) to fusion section
- Capstone fusion → legendary slots, not regular slots
- Block T4 capstones from regular spirit pool entry
- Block T4 capstones from `_pickRandomLegendary` (Slice 5 C45)

Effort: 2 hours.

**F2.1.b: Stub spirit decisions (Slice 2 C16)**
- Echo, Replica, Print, Collector — currently non-functional
- Either implement (per design intent) or remove from data and shop pool
- Recommend: Implement Echo (replays last spirit's contribution), defer Replica/Print/Collector to a v0.2 milestone, remove from current data

Effort: 4 hours if implementing Echo; 1 hour if all deferred.

**F2.1.c: Engine state-blind fixes (Slice 2 C9)**
- Wildlife, Plenty (count brights/animals/etc.) — already correct mechanism, just need stackCount fix from F1.1
- Velocity (count plays this round) — same
- Lincoln (count banks), Napoleon (count push fails) — same
- Persimmon, Pear, Palace — apply stackCount

These are subsumed by F1.1's pattern fix. After F1.1 is done, verify each engine.

Effort: subsumed by F1.1; verification ~1 hour.

**F2.1.d: Engine stack-aware engine_irrigation (Slice 2 C10)**
- Currently flat +3 mult per Earth-enhanced card scored, ignoring stackCount
- Should multiply by stackCount per design

Effort: 0.5 hours.

**F2.1.e: legend_chi formula correction (Slice 2 C11)**
- At flow=1.0, the formula produces wrong value
- Verify against design doc spirit table

Effort: 1 hour (re-derive formula from doc).

**F2.1.f: getEffectiveCost expansion (subsumed by F1.2)**

**F2.1.g: Crow stack-aware + non-firing investigation (added during Phase 0 playtest)**

Two issues surfaced during D0.6 playtesting:
- `sym_crow` consumable-generation logic at `GameRoundManager.js` lines 737 and 2019 still uses `filter(s => s.id === 'sym_crow').length` — the OLD object-counting pattern. D0.6 missed updating Crow to use `countStackedById`. With multi-stack Crow, only one consumable generates per round (object count), not one per effective stack.
- Playtest reported NO consumables generating from Crow at all, even at 1 effective stack. Possible causes: (a) consumable inventory was full so `canAddConsumable` short-circuited, or (b) a real bug. Investigation needed.

Update both call sites to use `countStackedById('sym_crow')` per D0.6 pattern. Then verify the spawn behavior at round end with empty consumable inventory.

Effort: 1 hour (15min code change + ~45min investigation/verification).

**Effort total for F2.1: ~9-11 hours.**

### F2.2: Hexagram corrections (Slice 4 ~15 critical findings) **`✅ SHIPPED + VERIFIED 2026-05-14`**

**F2.2 ship summary (2026-05-14):**

Four prompts shipped over a single session, with verification after each:

- **Prompt 1:** 14 hexagrams touched — descriptions + simple mechanical fixes (B1-B6, B9, B12-B14, D3, D6, plus Wu Xing comment fix). Renamed `no_banking_ki_plus_capture` → `no_hand_ki_plus_capture`. ~2-3h.
- **Prompt 1 patch:** hex_16 forceAutoBankOnYaku removed (push/bank decisions stay functional); hex_29 yaku disable restored (rank-matching with yakus exposed deeper bug in initial-deal stacking — full redesign deferred as F2.2.x to Phase 2C). ~30m.
- **Prompt 2:** F2.6.b + F2.6.c push hexagram redesigns. New `pushCurveSuccessAmplifier` / `pushCurveFailureAmplifier` hooks introduced. volatile_flow and stable_flow rewired with amplifier values. Capstone Time gets inline checks for success amplifier 1.5×, failure amplifier 0.5×, no decay. Dead `modifyPushSuccess`/`modifyPushFailure` hooks removed. ~2h.
- **Decay log fix (F2.6 v1.3.2):** Removed two stale `logger._log` lines in GRM that hardcoded the default FLOW_DECAY_RATE constant, producing wrong values under hexagram/spirit modifiers. ~10m.
- **Prompt 3:** Six deck composition redesigns using speculative card system. animal_deck (2 animals + 2 plains/month), ribbon_deck (mirror), all_plains_doubled (4 plains/month), deck_60 (5 cards/month with all speculatives), bright_and_plains (1 bright + 3 plains/month), deck_36 (1 bright + 1 animal + 1 ribbon/month). Renamed 4 effect IDs. ~2-3h.

**Total shipped: ~7-9 hours of Claude Code work + verification.**

**Deferred to Phase 2C:** F2.2.x hex_29 Kǎn full redesign (initial-deal layout for rank-matching coherence).
**Deferred to Phase 2D closeout battery:** F2.6 Tests 5/6 (Capstone Time + flow hexagram compounding), hex_06 bank cost timing, hex_21 high-spirit-count verification.

All four F2.2 categories from the audit (mechanical bugs, push redesigns, design decisions, description rewrites) resolved. See F4.14 (Design Doc V5 reconciliation) for the full list of doc-side changes accumulated from F2.2.

---

### F2.2 historical plan (for reference, mostly superseded by ship summary above)

After Phase 0 design decisions, apply to all 64 hexagrams systematically:

**F2.2.a: Wu Xing cycle re-targeting (post D0.2 decision)**
If destructive: change `boost_wood.modifyFire*` to target Earth instead. Update boost_fire (Earth → Metal), boost_earth (Metal → Water), boost_metal (Water → Wood), boost_water (Wood → Fire).

Effort: 2 hours.

**F2.2.b: Wu Xing description update (D0.3)**
Replace 5 placeholder descriptions with actual mechanism descriptions.

Effort: 0.5 hours.

**F2.2.c: Magnitude alignment**
- hex_59/60 field/hand: align ±2 to match doc, OR update doc to ±1
- hex_26/40 spirit slots and deck modifications: align ±2 / ±8, OR update doc, AND fix hook (use `modifyDeck` not `modifyCardsDealt`)
- hex_38 Kasu reduction: -1 to -2 to match doc
- hex_07 offerings +1 to +2
- hex_54 discount: choose between 25% and -1 flat
- hex_06 banking cost: implement -5 ki on bank
- hex_16 capture ki +1 to +3, decide on banking-disabled implementation
- hex_10 price +25% vs +2 flat: pick one

Effort: 4 hours (~30 min per hexagram for cross-checks).

**F2.2.d: Mechanism corrections**
- hex_21 graduated tax (per-purchase 2× cost vs per-round drain): pick D0 decision
- hex_61 balanced_scoring formula: implement doc formula or update doc
- hex_30 one_yaku_disabled (rotate vs fix at run start, post D0.10): apply
- hex_64 volatile_flow: implement "double on push, reset on bank" if going strict, or update doc to smoothing variant
- hex_63 stable_flow: implement "no decay + lock style base" or update doc
- hex_04 randomized_deck: per-round reshuffle hook
- hex_24 start_50_ki_no_income: scope decision (block all ki sources or just round-end), apply

Effort: 3-4 hours.

**F2.2.e: Description alignment for non-mechanical drift**
- Axis hexagram descriptions (8 total: boost_air, boost_land, boost_day, boost_night, boost_yang, boost_yin, boost_space, boost_energy) — describe by axis property (per-card), not month list. Multiple errors per Phase 0 playtest discovery:
  - Currently say "×2 points" but actual mechanism is ×1.5 mult, capture-level (per D0.4-1)
  - Currently list months as if axis were per-month, but axis is per-card (Feb has both air-day and air-night cards, etc.)
  - Don't mention debuff side (×0.75 on opposite-axis cards per D0.4-1)
  - Combined hexagrams (Yang/Yin/Space/Energy) need to explain OR-logic compounding (×2.25 if matching both buff axes, ×0.5625 if matching both debuff axes, ×1.125 if mixed) per D0.4-2
- Hex_29 match_by_rank — note yaku is also disabled
- Hex_51 deck_flip_revealed — note unmatched flips are discarded
- Hex_23 no_plains_double_others — clarify "doubled" is via duplication
- Deck-axis hexagrams (day/night/air/land deck) — note duplication mechanism

Effort: 2 hours (expanded from 1.5h to account for the 8 axis hexagram description rewrites).

**F2.2.f: Hexagram `getSeason` alignment with spirit-side (Slice 4 D29)**
Code's `getSeason` uses Spring=Jan-Mar; spirit-side and doc use Spring=Mar-May. Align to doc.

Effort: 0.5 hours.

**Effort total for F2.2: ~12-14 hours.**

### F2.3: Consumable corrections (Slice 3 ~10 critical findings) **`✅ SHIPPED + VERIFIED 2026-05-14`**

**F2.3 ship summary (2026-05-14):**

Single-prompt ship (Max Effort) covering the full consolidation. Net codebase reduction of ~38 lines while adding behavior fixes and architectural consolidation.

**The unification:** Six parallel implementations of "add spirit, merge same-id stacks, cascade-transcend at 4" consolidated into one canonical helper `_acquireSpiritStack(spiritDef, stackCount, options)`. Six existing methods became thin wrappers; four bypass paths (Cinnabar/Mercury/Sulfur/Jade) replaced their direct-push code with helper calls. Three intentional direct-create paths (Amber, Sulfur negative branch, Past Life negative branch) preserved with `addSpiritDirect`.

**Bug fixes landed:**
- **C24/C25 (Cinnabar/Mercury/Sulfur bypass stacking):** Resolved via helper routing. Cinnabar/Mercury/Sulfur now merge into existing same-id spirits and trigger cascade-transcendence as needed. Mercury → transcendence chain works as an emergent strategy.
- **Jade accumulator state bug:** Direct `target.stackCount++` was bypassing `_addAccumulatorElement`. Now routed through helper, fixes accumulator element tracking.
- **`addSymbiontSpirit` hardcoded powerLevel:** Was `powerLevel: 3` literal; now uses correct `Math.min(3, count - 1)` formula via helper. Functionally equivalent in normal play but more architecturally correct.

**Other items in scope:**
- **Heart Chakra picker filter:** Editioned cards filtered from picker grid. Empty-deck case refunds ki.
- **Shop card pool:** `baseCards` → `speculativeCards` per DESIGN_DOC_V5 §12.2.
- **`addSpiritDirect` docstring:** Updated to clarify the three intentional use cases (Amber, Sulfur negative, Past Life negative).

**Already-resolved items from Slice 3 audit (no work needed):**
- C19 (Grove fusion T4 routing) — Grove fusion UI removed entirely in prior work
- C20 (Festival stamp unusable) — F2.3.i resolved
- C21 (Consumable inventory routing) — F2.3.i resolved
- C22 (Rooster max slots) — already uses `_roosterBonusThisRound += 1` + `_recomputeFieldSlots`
- C23 (Tiger non-functional) — `tigerTriggered` consumer + flag clearing already in GRM bank/push gate
- C26 (`_addPastLifeCopy` 1× negative bug) — fixed in F1.8.b followup #9
- C27 (Heart Chakra over-edition apply-side) — `applyChakraHeart` already returns proper error
- D20 (Legacy consumable_*) — removed in F1.x cleanup

**Verification:** 9 of 11 priority tests confirmed in playtest. The 2 unverified cases (Past Life regression, `_fireCuckooHatch` regression) are verified by transitivity through other helper-based paths that did pass.

**Deferred to other tasks:**
- **F2.3.j (rarity tier expansion):** Crow symbiont + Black/Blue/Purple stamp + `generateRandomConsumable` rarity tier system. Larger scope; needs design pass on common/uncommon/rare mappings across consumable types.
- **F4.16 (system reorganization):** Spirit-specific logic seepage across SpiritEffects/RunManager/GameScene. Examples: `_fireCuckooHatch` in RunManager, Cuckoo Egg maturity-counting in GameScene. Phase 4 work, ideally with fresh codebase snapshot.
- **F2.4 cleanup:** Dead `result.result === 'failed'` check in GRM (no longer reachable since `addSymbiontSpirit` returns new shape).
- **F4.14 doc reconciliation:** D15 Goat "+1 per card captured" clarification; description updates for affected consumables.

**Cross-references:**
- F4.14 (Design Doc V5 reconciliation accumulator) — minor doc-side changes batched
- F1.8.b/c, F2.3.i (parent work that resolved most original Slice 3 findings)

---

### F2.3 historical plan (for reference, mostly superseded by ship summary above)

**F2.3.a: Festival/Stamp consumable inventory routing (Slice 3 C20)**
Chakras, Stamps, Alchemicals never enter consumable inventory because they're activated at point-of-purchase. Decide per-category:
- Chakras: keep as point-of-purchase (designed as deck modifier)
- Stamps: keep point-of-purchase (single-use card mod)
- Alchemicals: keep point-of-purchase (single-use deck mod)
- Festival-spirit-generated stamps: these should enter consumable inventory for later use OR fire immediately on selected card. Need design call (D0.x — adding now: D0.14)

Effort: 2 hours (mostly Festival routing).

**F2.3.b: Sacred Grove fusion T4 routing (subsumed by F2.1.a)**

**F2.3.c: Rooster max-field-slots semantics (Slice 3 C22)**
Rooster sets `setMaxSlots(9)` absolutely, overriding hexagram/blessing additions. Should ADD +1 instead.

Effort: 0.5 hours.

**F2.3.d: zodiac_tiger non-functional (Slice 3 C23)**
Currently does nothing. Implement per design: target a card to apply Tiger effect (see doc).

Effort: 1 hour.

**F2.3.e: Cinnabar/Mercury/Sulfur addSpiritDirect bypassing stacking (Slice 3 C25)**
These alchemicals add spirits via a path that skips the usual stack/negative routing. Route through `addSpirit(...)` proper.

Effort: 1 hour.

**F2.3.f: _addPastLifeCopy negative-on-transcendence (Slice 3 C26)**
Past-life mechanic produces 1× negative on transcendence — needs verification of intended behavior.

Effort: 1 hour.

**F2.3.g: Heart Chakra over-edition (Slice 3 C24, post D0.9)**
Decide policy, implement.

Effort: 0.5 hours.

**F2.3.h: buyConsumable/sellConsumable scope (Slice 3 C28)**
Currently only handles Zodiacs. Extend to Wu Xing if the design wants Wu Xing to be sellable.

Effort: 1 hour.

**F2.3.i: Universal consumable carry-over (Phase 0 playtest 2026-05-06)**

Currently only Zodiac consumables and Wu Xing enhancements can be carried into rounds; other consumables (Chakra Tools, Alchemicals, Stamps/Festival items) activate at the moment of purchase. Per design intent, ALL consumables should be carryable so players can decide WHEN to activate them within a round.

**Scope:**
- Audit purchase flow for each consumable category (Chakra Tools, Alchemicals, Stamps, Festival items, anything else): identify which ones force-activate at purchase vs. which are carried.
- Refactor purchase flow so all consumables route to inventory by default. Activation requires explicit player choice.
- Update inventory UI to show all consumable types, not just Zodiacs/Wu Xing.
- Update activation flow so each consumable has a clear "use" affordance from inventory.

**Verified non-carry-able consumables (2026-05-07 playtest, F1.8.c-4 & F1.8.c-5 testing):**
- **Alchemicals: Cinnabar, Mercury, Pearl** — confirmed force-activate at shop purchase. Cannot be added to consumable slot. Must execute fusion/defusion immediately.
- **Chakra Tools: Throat, Heart** (per earlier playtest 2026-05-06)
- Stamps and Festival items per the earlier audit.

**Why important:** Forces tactical decision-making (when to use a Chakra Tool, which round to activate Cinnabar). Also resolves the Heart Chakra → Throat Chakra interaction issue where duplicating a card mid-shop and then trying to Heart-Chakra it doesn't work because the duplicated card isn't in scope.

**Open question:** Some consumables may have implicit activation timing (e.g., a "draw 3 cards" effect makes no sense at shop time). Each consumable category needs a design pass to decide intended timing.

**Test verification trigger:** When F2.3.i ships, re-test F1.8.c-4 (Cinnabar fusion mid-round) and F1.8.c-5 (Mercury defusion / Pearl fusion mid-round) which were marked N/A pre-fix. These should now verify mid-round usage triggers `_renderSpiritColumn()` and updates the spirit fan correctly — the F1.8.c re-render plumbing is already in place; F2.3.i just opens the gate by routing alchemicals through the inventory + use callback.

Effort: 4-6 hours.

**F2.3.j: Throat Chakra duplicate not visible to Heart Chakra (Phase 0 playtest 2026-05-06)**

When Throat Chakra duplicates a card, the duplicate doesn't appear in Heart Chakra's targetable card list. The duplicate must not be properly registered as an eligible target for subsequent edition operations.

**Investigation needed:**
- Where does the duplicate card get added (deck, hand, separate buffer)?
- What scope does Heart Chakra's targetable list use? Does it match the duplicate's location?
- Is this an issue with timing (duplicate added after target list is computed) or scope (target list excludes duplicate's location)?

Effort: 1-2 hours (likely small fix once root cause identified).

**Effort total for F2.3: ~13-17 hours (was 7-8; +F2.3.i and F2.3.j ~5-8).**

### F2.4: Inline tooltip / hardcoded description accuracy audit + universal stack-aware engine audit (added during Phase 0 playtest) — **🟢 EFFECTIVELY COMPLETE 2026-05-24** (test patterns + data refactoring deferred to Phase 4)

**Phase 2 closure status (2026-05-24):**

| Subtask | Status |
|---|---|
| 1. Card enhancement strings | 🟡 Iron description fix shipped (other elements not verified — flagged for spot-check) |
| 2. Spirit tooltip strings | ✅ 26 accumulator spirits covered by F2.5 Phase G |
| 3. Tooltip-engine math sync | ✅ F2.5 Phase G synced the 26 spirits we modified; other spirits not touched |
| 4. Universal stack-aware engines | ✅ 39/39 applyEngine blocks confirmed stack-aware |
| 5. Replace hardcoded with data refs | ⏭ Deferred to F4 architectural cleanup |
| 6. Cross-reference comments | ⏭ Deferred to F4 architectural cleanup |
| 7. Tooltip-integrity test pattern | ⏭ Deferred to F4 architectural cleanup |
| 8. Stack-aware test pattern | ⏭ Deferred to F4 architectural cleanup |
| 9. Dead-flag audit | ✅ All 4 ConsumableEffects flags actively used (tigerPushActive, dogProtection, snakeThresholdMods, goatActive) |
| 10. Regular-vs-negative iteration asymmetry | ✅ Zero `this._spirits` iterations in GRM (all use `allSpirits`) |

**Iron description fix (2026-05-24):**

ENH_DESC_TT had fabricated mechanics for Iron/Meteorite ("+10 pts proc, feeds Velocity"). Actual mechanics per design doc and GRM code:
- Iron (base): held-in-hand ×1.5 mult, 5% jackpot for +30 ki, feeds Velocity via in-deck count
- Meteorite (upgraded): held-in-hand ×3.0 mult, 5% jackpot for +30 ki, jackpots trigger Velocity t2Procs

Replaced with accurate descriptions.

**Other element descriptions (water/fire/earth/wood) not directly verified.** These weren't flagged as bugs but should be spot-checked during F2.D.x gameplay verification or F5.1 balance tuning. Flagging as known unknowns rather than blockers.

**Background:**

Discovered during Phase 0 playtesting: hardcoded UI tooltip strings in `GameScene.js` (and likely elsewhere) contain inaccurate descriptions of card-enhancement mechanics. These are separate from data-file descriptions (handled in F2.1/F2.2/F2.3) and from hexagram-aware display values (F3.6).

Additionally: D0.22 audit found that several engine spirits aren't stack-aware AT ALL (engine_lincoln, engine_palace, decay_persimmon, decay_pear, possibly others). These were missed in earlier audits because their tooltips MATCHED their (flawed) engine output, so they appeared consistent. Per universal stacking principle, every spirit's contribution should scale with stackCount.

**Known issues:**

- `ENH_DESC_TT` in `GameScene.js:3508-3514` describes Iron as "+10 pts proc, feeds Velocity" — but Iron's actual mechanic is held-in-hand mult ×1.5 (with the +10 pts being a separate Velocity tier-1 trigger, not the held mult). Description conflates two mechanics.
- Similar audit needed for: water (Snow/Ice), fire (Ember/Charcoal), earth (Clay/Pottery), wood (Leaf/Silk).
- Per-card tooltips (`_showCardTooltip`), per-spirit tooltips, per-consumable tooltips, per-hexagram displays — all need an accuracy pass.
- **Tooltip-engine math sync (D0.22 partial fix):** Per-spirit tooltip lines that compute derived values (mult, ki, pts) from `spirit.state` MUST match the corresponding engine `applyEngine` output. Initial fix in D0.22 covered Ants/Algae/Snails/Ducks/Napoleon, but broader audit needed.
- **Universal stack-aware engine audit (D0.23):** Several engines (engine_lincoln, engine_palace, decay_persimmon, decay_pear) don't scale with stackCount in EITHER increment or engine output. These need stack scaling applied (Pattern 2 by default — engine output multiplication). D0.23 addresses the known set; broader sweep needed for any remaining stack-blind spirits.

**Scope:**

1. Audit every hardcoded description string in:
   - `src/scenes/GameScene.js` (card tooltips, side panel labels, spirit tooltip blocks ~lines 1100-1300)
   - `src/scenes/ShrineScene.js` (shop offering descriptions)
   - Anywhere else strings are constructed inline rather than pulled from data
2. Verify each string against the actual implementation
3. **Tooltip-engine math sync:** For each spirit with derived-value tooltip, cross-reference its `applyEngine` in SpiritEffects.js. Verify identical formula. Where the engine uses `× stackCount` and the tooltip doesn't (or vice versa), sync them.
4. **Universal stack-aware engine audit:** For every spirit definition with `applyEngine`, verify that EITHER (a) state increment scales by stackCount at increment time (Pattern 1), OR (b) engine output multiplies by stackCount (Pattern 2). If neither, the spirit is stack-blind — apply Pattern 2 (preferred).
5. Replace hardcoded strings with references to data-file descriptions where possible (so updates to data propagate automatically)
6. Where hardcoded strings must remain (e.g., for layout reasons), add a comment cross-referencing the implementation source so future drift is catchable
7. **Build a tooltip-integrity test pattern:** Consider adding a per-spirit assertion (in dev mode or test suite) that verifies tooltip-displayed value === engine output for representative state values. Catches drift automatically when engine formulas change.
8. **Build a stack-aware test pattern:** For each spirit, run engine at stackCount=1 vs stackCount=3 with identical state. Output should differ by 3×. Any spirit that doesn't scale = bug (or document the intentional exception).
9. **Dead-flag audit (added 2026-05-07 from zodiac playtest):** Several consumables write state flags that are never read in GRM (e.g., Tiger's `_tigerPushActive`, Rabbit's `_rabbitActive` — surfaced via zodiac playtest and fixed in Phase 1 closeout). Run a systematic audit: for every flag-style assignment in ConsumableEffects.js and SpiritEffects.js, verify GRM (or another reading site) consults it. Pattern:

       fetch('/src/systems/ConsumableEffects.js').then(r => r.text()).then(t => {
         const assigns = [...t.matchAll(/roundManager\._(\w+)\s*=/g)];
         const flags = [...new Set(assigns.map(m => '_' + m[1]))];
         // Cross-reference each against GRM read sites
       });

   Any flag with only 1 reference (the assignment) in GRM is dead. Either wire it up to a consumption point, remove the assignment, or use an existing equivalent flag (as Rabbit does with `_dogProtection`).

10. **Regular-vs-negative iteration asymmetry audit (added 2026-05-08 from Phase 1 closeout Osprey bug):** A bug surfaced where the round-start state reset loop in GRM iterated only `this._spirits` (regular spirits) but the intercept counter increment used `run.allSpirits.filter(...)` (regular + negative). Result: a Negative Osprey's `flipsUsedThisRound` counter was incremented during play but never reset, eventually sticking at max and disabling the effect entirely.

    Fix applied (2026-05-08): changed reset loop to iterate `run.allSpirits`.
    
    Broader audit pattern: search GRM and other systems for any loop iterating `this._spirits` (or similar regular-only accessor) that performs an operation also performed on `allSpirits` elsewhere. Look for: state resets, score contribution calculations, hook invocations, anything that should apply uniformly to all spirit instances regardless of regular/negative status.
    
        fetch('/src/systems/GameRoundManager.js').then(r => r.text()).then(t => {
          const matches = [...t.matchAll(/for\s*\([^)]*of\s+this\._spirits\b/g)];
          for (const m of matches) {
            console.log(t.substring(Math.max(0, m.index - 50), m.index + 300));
            console.log('---');
          }
        });
    
    For each match, ask: should this also apply to negatives? If yes and the corresponding mid-round operation uses `allSpirits`, that's an asymmetry bug.

**Why important:** Players read tooltips to understand mechanics. Inaccurate tooltips actively mislead — worse than no tooltip at all. Especially compounding because Phase 2 corrections to engine formulas may not propagate to hardcoded tooltip strings, creating UI/engine math drift. AND universal stacking is a fundamental design principle: spirits that ignore stacks are mechanically broken vs. design intent.

**Process discipline:**
- Whenever any spirit's engine formula changes in `SpiritEffects.js`, the corresponding tooltip in `GameScene.js` MUST be updated in the same prompt.
- Audits for "stack-aware behavior" must be SKEPTICAL: treat "this engine has no stack factor" as a potential bug to investigate, not as design intent. The default is "every spirit scales with stacks."
- Document explicit exceptions where stack-blind behavior IS intentional.

**Effort:** ~5-8 hours for full audit + fixes (was ~3-5; expanded due to engine-side audit scope).

**Effort total for F2.4: ~5-8 hours.**

### F2.5: Negative accumulator state semantics review (added 2026-05-07 during F1.8.b followup #9 verification) — **🟢 EFFECTIVELY COMPLETE 2026-05-23** (B.6 deferred to F4.27)

**Progress as of 2026-05-23:** 26 of 29 accumulator spirits converted to Idea D semantics. Past Life and Cuckoo Egg (Cat 5 maturation) deferred to F4.27 due to architectural complexity (logic spread across multiple files; better unified during Phase 4's spirit-logic-migration work).

Phase A (snapshot dispatch infrastructure): ✅ shipped + verified
Phase B.1 (Cat 1 single-key, 16 spirits): ✅ shipped + verified
Phase B.2 (Cat 1 dual-key + Cat 1' exponential, 5 spirits): ✅ shipped + verified
Phase B.3 (Cat 2 uniqueness — Wildlife, Plenty): ✅ shipped + verified
Phase B.4 (Cat 4 reset-uniqueness — Radiance, Banner): ✅ shipped + verified
Phase B.5 (Northern Lion conversion): ✅ shipped + verified
Phase B.6 (Past Life + Cuckoo Egg): 🟡 **DEFERRED to F4.27** — design complete, implementation deferred to Phase 4

**Bycatch fixed:**
- Radiance exponential bug (`Math.pow(2.0, n)` → `1 + n × 2`)
- Banner switched to set semantics (consistent with Radiance)
- Old GRM inline round-start reset removed (replaced by onRoundEnd hooks)
- Northern Lion semantic fix: was once-at-bank, now per-push success
- Northern Lion ShrineScene consumption updated for accumulator model

**Architectural follow-ups logged (all for Phase 4):**
- F4.25: Three-place duplication of formula data (ACCUMULATOR_INIT, applyEngine, NEGATIVE_SNAPSHOT)
- F4.26: powerLevel-4 transcendence alternative (revisit "all 4 contribute" semantics)
- F4.27: Past Life + Cuckoo Egg Cat 5 migration (deferred from B.6)

**Minor known issue (logged for F5.1):**
- Northern Lion's `_rerollsUsed` doesn't transfer through transcend boundary — players get a "free rerolls reset" on transcend, capped at total earned. Could be fixed by carrying `_rerollsUsed` through `snapshotCat1Linear`.

**Remaining work in F2.5 itself:**
- Phase G: Tooltip correctness for 26 converted spirits: ✅ shipped 2026-05-24
- Phase H: Gameplay verification pass (~1-2h, do during regular playtesting)

**Effective F2.5 closure:** The 26 converted spirits cover all the player-impacting accumulator spirits with score-mult contributions. Past Life and Cuckoo Egg are meta-spirits without `applyEngine` outputs; their transcend-continuity gap is edge-case and acceptable until F4.27.

**Background:** F1.8.b followup #9 swapped `_aggregateElementsForNegative`'s numeric aggregator from `Math.max` (longest-held) to `Math.floor(aggregate / powerLevel)` (preservation formula). This correctly preserves pre-transcend mult contribution for both equal and staggered element cases. However, the new formula has two known imperfections that surfaced during verification:

**Issue 1: Floor truncation at transcend boundary.** When `aggregate` doesn't divide evenly by `powerLevel`, the negative loses 0 to (powerLevel-1) × scaling of mult contribution. For Algae's `× 0.1 × 3` scaling, this is 0 to 0.2 mult per transcend boundary. Verified: 3-stack Algae at aggregate=19, powerLevel=3 produces `state = floor(19/3) = 6`, engine ×2.8 instead of expected ×2.9 (the would-be 4-stack momentary).

**Issue 2: Aggregation-vs-count semantic mismatch.** `state.summonCount` stores `floor(aggregate / powerLevel)` — the "average element value," not the literal count of events witnessed. Tooltip text like "Symbionts summoned: N" no longer matches what the player has actually witnessed. For staggered acquisition Algae with elements `[{11}, {6}, {1}]`, the player saw 18 total summon events across all elements, but the negative shows `state.summonCount = 6` (the average per element). Semantic mismatch is confusing in UX.

**Big-refactor option (recommended for this F2.5 work):** Convert all 25 accumulator spirits' negative-form engine formulas to read sum-based state instead of multiplied state. Key change: drop `× powerLevel` from negative accumulator engine formulas. State stores the literal aggregate. Increments scale by powerLevel matching the would-be regular path.

**Affected spirits (~28-29 — corrected count 2026-05-22 Robert's audit):**

**Additive-mult accumulators (11):**
- sym_ants, sym_snails, sym_badger, sym_ducks
- engine_devotion, engine_habitat, engine_ceremony, engine_agriculture
- engine_lincoln, engine_napoleon, engine_missing_number

**Mult-mult accumulators (15):**
- sym_algae
- engine_radiance, engine_wildlife, engine_banner, engine_plenty
- engine_glacier, engine_carbon, engine_velocity, engine_fossil, engine_moths
- engine_palace, engine_ship, engine_kintaro, engine_bullseye
- legend_wuji

**Non-scoring (maturation timers) (3):**
- util_past_life
- sym_cuckoo_egg
- game_northern_lion (or sym_northern_lion — to confirm during audit)

**Sub-category considerations:**
- **Uniqueness trackers:** engine_wildlife, engine_plenty (set cardinality, not numeric count)
- **Per-round reset:** engine_radiance, engine_banner (accumulate during round, reset at round end)
- **Maturation timers:** Past Life, Cuckoo Egg, Northern Lion (round-based, not event-based; one-shot activation)

**Scope:**

1. **Decision call:** Verify the design intent. Currently negative-form spirits use `state × scaling × powerLevel` engine formula. Refactor would make accumulators use `state × scaling` directly. Capstones and pure-multiplier negatives might keep `× powerLevel`. Need a clear policy.

2. **Engine formula updates (25 spirits):** Per-spirit audit and update of `applyEngine` blocks. Each accumulator negative engine drops `× powerLevel` and uses sum-based state directly.

3. **`_aggregateElementsForNegative` formula update:** Replace `Math.floor(aggregate / powerLevel)` with `aggregate` (sum directly).

4. **Per-event increment paths:** When a negative accumulator observes an event, increment by `powerLevel × symbiosisStacks` (or equivalent for that mechanic) to match the would-be regular path's accumulation rate.

5. **Tooltip updates:** Each negative accumulator tooltip displays the literal count, matching the engine math.

6. **Cross-reference with F2.4 (tooltip-engine sync audit):** Both F2.4 and F2.5 touch tooltips and engine formulas. Sequence F2.5 first, then F2.4's sweep catches any drift.

**Verification approach:** For each accumulator spirit, simulate a transcend boundary scenario. Verify negative engine output exactly preserves the would-be momentary regular engine output. No floor truncation, no semantic mismatch.

**Effort:** 6-10 hours. Substantial scope (25 spirits × per-engine review + per-increment review + per-tooltip review). Should be a deliberate design session, not rushed.

**Cross-references:**
- F1.8.b followup #9 (preservation formula via floor division) — interim fix; superseded by F2.5's sum-based approach if pursued.
- F1.8.b followup #10 (failed-summon rollback) — Algae-specific, unrelated to this F2.5 work.
- F2.4 (tooltip/engine sync audit) — sequence after F2.5 for cleanest pass.
- F5.4b (deck-mod-hex redesign) — may interact since both touch negative-form mechanics.

**Why deferred:** Not blocking. Current floor-truncation produces small visible discrepancies (0-0.2 mult per transcend) but doesn't break gameplay. The bigger semantic mismatch (state-count not matching witnessed-event-count) is a UX concern that's tolerable in the short term. The refactor is substantial enough to warrant deliberate scoping rather than rushed inclusion in Phase 1.

**Design ideas to revisit at F2.5 implementation (logged 2026-05-07):**

**Idea A: Two-value tracking (Robert, 2026-05-07).** Have the negative inherit BOTH the aggregate (for engine math) AND the oldest-element's count (for player-facing display). At transcend, both values are precisely available from existing per-element state — no averaging required. Negative state would carry `{ aggregate: 18, displayCount: 11 }` for a 3-stack Algae case.

Trade-off identified: as the negative accumulates events going forward, the two values diverge (aggregate grows by powerLevel per event, displayCount grows by 1). After 10 more events post-transcend, the ratio drifts — displayCount stops matching aggregate semantically. Tolerable if displayCount is reframed as "oldest element's perspective" rather than literal "events witnessed."

**Idea B: Sum-based state with no powerLevel multiplier (original F2.5 proposal).** State stores literal aggregate, engine formula drops `× powerLevel`, increments scale by powerLevel per event. Cleanest mathematically but requires touching 25 spirit engine formulas. Tooltip naturally shows literal aggregate, no divergence.

**Idea C: Snapshot-then-static displayCount.** Display the oldest-element value at moment of transcend and freeze it (don't update going forward). Aggregate updates normally. Player sees "this negative formed when 11 events had been witnessed" as historical marker. Loses dynamic display but eliminates divergence.

**Idea D: Snapshot + linear accumulation (LOCKED 2026-05-15)** — Robert's design.

The negative behaves mathematically equivalent to "a fresh accumulator pre-seeded with the transcend-moment output, accumulating linearly post-transcend at powerLevel-scaled rate."

**State structure:**
```js
state = {
  preTranscendTotal: number,    // Engine output at moment of transcendence
                                 // (replaces base 1.0 for mult-mult / 0 for additive)
  oldestAtTranscend: number,    // Longest-held element's count at transcend (frozen, for tooltip)
  newEvents: number,            // Events witnessed by the negative post-transcend
  powerLevel: number,           // Frozen at transcend (3 for accumulator-driven transcendence)
}
```

**Engine output formula (universal):**
```
output = preTranscendTotal + (newEvents × scaling × powerLevel)
```

**Tooltip display:**
```
display = oldestAtTranscend + newEvents
```

**On event observation (negative-side):**
```
state.newEvents += 1
```

**Verification with the canonical test case (3-stack Algae, elements `[{11}, {6}, {1}]`, scaling 0.1):**

Pre-transcend:
- Engine output = 1.0 + (sum = 18) × 0.1 = ×2.8 ✓

Adding 4th Algae triggers transcendence. The transcendence-triggering 4th summon increments all 3 existing elements first: `[{12}, {7}, {2}]`. Sum = 21.

At transcendence, snapshot regular engine:
- preTranscendTotal = 1.0 + 21 × 0.1 = ×3.1
- oldestAtTranscend = 12 (longest-held element)
- newEvents = 0
- powerLevel = 3

Negative engine output immediately:
- output = 3.1 + 0 × 0.1 × 3 = ×3.1 ✓ continuity preserved at transcend boundary
- Tooltip: 12 + 0 = "12 symbionts summoned" ✓ matches player experience (oldest element's continuous witness)

After 1 more summon observed by negative:
- newEvents = 1
- output = 3.1 + 1 × 0.1 × 3 = ×3.4 ✓ matches "+0.3 mult per summon for 3-stack-powered Algae"
- Tooltip: 12 + 1 = 13

After 10 more summons:
- output = 3.1 + 10 × 0.1 × 3 = ×6.1
- Tooltip: 12 + 10 = 22

**Why this design is optimal:**

1. **Mathematically continuous** — no floor truncation at the transcend boundary (Issue 1 from F1.8.b followup #9 fully resolved)
2. **Semantically truthful tooltip** — oldest element's witness count is a meaningful concept ("events seen continuously by at least one part of this spirit") that matches player intuition (Issue 2 resolved)
3. **No double-counting** — preTranscendTotal preserves the full pre-transcend output without `× powerLevel` issues
4. **Generalizes to additive and multiplicative engines** — preTranscendTotal is the absolute output at transcend, regardless of base type
5. **Architectural simplicity** — three fields + same engine math structure for all accumulator negatives

**Implementation approach (Option γ — engine self-application at transcend):**

The cleanest implementation is to capture preTranscendTotal by **invoking the regular `applyEngine` just before transcendence**, then storing the output as the negative's starting state. No per-spirit transcend hook needed — each spirit's existing engine formula self-applies, producing the correct preTranscendTotal automatically.

In transcendence code (RunManager `_aggregateElementsForNegative` or equivalent):
1. Pre-transcend: run `applyEngine({ spirit: regular, ... })` to get current output
2. Extract the contribution (addPoints, addMult, multiplyMult — whichever this spirit produces)
3. Store as `state.preTranscendTotal`
4. Read oldest element's count for `state.oldestAtTranscend`
5. Initialize `state.newEvents = 0`
6. Set `state.powerLevel = 3` (or whatever the transcendence threshold was)

Each spirit's negative-side `applyEngine` reads the new state shape:
```js
if (spirit.isNegative) {
  return {
    // For mult-mult engines:
    multiplyMult: state.preTranscendTotal + state.newEvents * scaling * state.powerLevel,
    // OR for additive engines:
    addMult: state.preTranscendTotal + state.newEvents * scaling * state.powerLevel,
  };
}
```

The exact return shape depends on each spirit's engine type.

**Robert's locked design intent (2026-05-15):** Idea D is the chosen direction. Ideas A, B, C remain in the doc as historical context for the design exploration.

## Audit approach (added 2026-05-15)

Before shipping F2.5, conduct a per-spirit audit to verify each of the 25 accumulator spirits cleanly maps to Idea D's structure. The audit will surface spirits that need additional design work (e.g., uniqueness trackers, capped formulas, threshold-based formulas).

### Audit categories

For each spirit, classify into one of:

**Category 1: Standard linear accumulator** — Formula is `base + aggregate × scaling × powerLevel`. Maps directly to Idea D. No design work needed.

**Category 2: Uniqueness tracker** — Formula uses set cardinality, not numeric count (e.g., `engine_wildlife`, `engine_plenty`). Negative state needs to track "new uniques observed" with deduplication against pre-transcend set. Requires design work — may need a separate `oldUniqueSet` field plus `newUniqueSet`.

**Category 3: Capped accumulator** — Formula has a maximum (e.g., "+0.5 mult per unique animal, cap at +5"). At transcend, may already be at cap. Post-transcend additions may not contribute. Design question: does the cap apply to the post-transcend portion? If pre-transcend hit cap, is the negative "frozen" at cap or can post-transcend events push it further?

**Category 4: Threshold accumulator** — Engine output activates only past a threshold (e.g., "while count > X, give +Y"). Post-transcend behavior needs design: does the negative inherit the "active" state?

**Category 5: Non-engine spirits** — Spirits without `applyEngine` (lifecycle-only, no scoring contribution). May not be in the 25-list but worth confirming.

**Category 6: Special cases** — Anything that doesn't fit above (e.g., `util_past_life` — already special-cased per F1.8.b context).

### Audit procedure (per spirit)

For each of the 25 spirits:

1. **Read current `applyEngine` block** — identify formula structure
2. **Identify scaling factor** (the `× X` per event)
3. **Identify base** (the `1.0` or `0` or other starting value)
4. **Determine category** (1-6 above)
5. **For Category 1:** confirm Idea D maps cleanly, document the formula
6. **For Categories 2-6:** document the formula AND the design question it raises
7. **Note any cross-spirit interactions** (Symbiosis interaction, hexagram interactions, etc.)

### Audit deliverable

A document — `F2_5_AUDIT_FINDINGS.md` — with one entry per spirit:

```
## sym_algae

Category: 1 (standard linear)
Regular engine formula: 1.0 + aggregateNumericState('summonCount') × 0.1 × stackCount
Scaling: 0.1
Base (mult-mult): 1.0
Idea D mapping: preTranscendTotal at transcend, then preTranscendTotal + newEvents × 0.1 × 3
Status: clean, ready to ship

## engine_wildlife

Category: 2 (uniqueness tracker)
Regular engine formula: 1.0 + uniqueAnimalsSeenCount × 0.5 × stackCount
Scaling: 0.5
Base: 1.0
Design question: At transcend, oldUniqueSet has N items. Post-transcend, an animal already in oldUniqueSet shouldn't count as new. Need a Set comparison in increment path.
Status: needs design — recommend extending state with `oldUniqueSet: Set, newUniqueSet: Set`
```

This pattern of audit-then-decide-then-ship is the same pattern we used for F2.1 (audit findings doc, decide per spirit, ship corrections).

### Audit time estimate

- 25 spirits × ~5-15 min each = 2-6 hours of audit work
- Plus design discussion for non-Category-1 spirits = 1-3 hours
- Total audit phase: 3-9 hours (highly variable depending on how many spirits need design)

### Implementation time after audit

- `_aggregateElementsForNegative` refactor: 30 min
- Category 1 spirits (engine formula updates): ~5-10 min each
- Category 2-6 spirits: variable per design call
- Tooltip updates: 1 hour
- Verification: 2-3 hours

**Net F2.5 effort (audit + implementation):** 6-15 hours, depending on what the audit surfaces. Original 6-10h estimate was for sum-based approach (Idea B). Idea D's superior design has comparable implementation effort but better outcomes.

### Audit ordering recommendation

When conducting the audit, suggest order:

1. **Start with most-played spirits** (Algae, Devotion, Wildlife) — establishes pattern recognition
2. **Then symbionts as a group** (sym_ants, sym_snails, sym_algae, sym_badger) — likely all Category 1
3. **Then engines as a group** (mostly Category 1, some special cases)
4. **Special cases last** (legend_wuji, util_past_life, uniqueness trackers)
5. **Finish with verification pass** — confirm classifications are right

This ordering builds intuition before tackling edge cases.

## Locked per-category negative designs (2026-05-22 design session)

The design session refined the structure into 4 active categories. Each has a locked state shape and behavior.

### Category 1: Standard linear accumulator (~22 spirits)

**Pattern:** Per-element numeric counter, incremented unconditionally on event. `aggregateNumericState` sums across elements. Engine output is linear in aggregate.

**Examples:**
- Additive-mult (11): sym_ants, sym_snails, sym_badger, sym_ducks, engine_devotion, engine_habitat, engine_ceremony, engine_agriculture, engine_lincoln, engine_napoleon, engine_missing_number
- Mult-mult (10): sym_algae, engine_glacier, engine_carbon, engine_velocity, engine_fossil, engine_moths, engine_palace, engine_ship, engine_kintaro, engine_bullseye, legend_wuji
- Utility/resource (1): engine_northern_lion — same pattern but "output" is consumable rerolls, not mult

**Negative state shape:**
```js
state = {
  preTranscendTotal: number,     // Engine output at moment of transcend
                                  // (replaces base 1.0 for mult-mult / 0 for additive)
  oldestAtTranscend: number,     // Longest-held element's count (for tooltip)
  newEvents: number,             // Events witnessed post-transcend
  powerLevel: number,            // Frozen at transcend
}
```

**Engine output formula:**
```
output = preTranscendTotal + (newEvents × scaling × powerLevel)
```

**Tooltip:** `oldestAtTranscend + newEvents`

**Increment on event:** `state.newEvents += 1`

**Implementation:** Option γ — invoke regular `applyEngine` at moment just before transcendence to capture `preTranscendTotal` automatically. No per-spirit transcend hook needed; each spirit's existing formula self-applies.

### Category 2: Uniqueness tracker (Wildlife, Plenty)

**Pattern:** Per-element Set, incremented with set semantics (add only if absent). `aggregateArrayLength` sums lengths across elements. Engine output linear in sum-of-lengths.

**Key difference from Category 1:** Events may add 0–powerLevel entries to sum, depending on which elements already have the value. Therefore **no powerLevel multiplier needed** on negatives — the arrays themselves handle the powerLevel-rate accumulation naturally.

**Uniqueness keys locked (2026-05-22):**
- Wildlife: **animal type** (12 unique → hard cap at 1 + 36 × 0.5 = ×19 at 3-stack negative all-arrays-full)
- Plenty: **card id** (24 unique → hard cap at 1 + 72 × 0.1 = ×8.2 at 3-stack negative all-arrays-full)

**Negative state shape:**
```js
state = {
  arrays: [Set, Set, Set],       // Inherited from oldest 3 elements at transcend
                                  // (or 2 / 1 for Amber-triggered low-stack transcend)
  // powerLevel implicit in arrays.length
}
```

**On event observation:** For each array in `state.arrays`: if event not in array, add it.

**Engine output:**
```
sum = state.arrays.map(a => a.size).reduce((s, n) => s + n, 0)
output = 1 + sum × scaling     // (formula identical to regular form)
```

**Tooltip:** `union.size` = `new Set(state.arrays.flatMap(s => [...s])).size`

**No preTranscendTotal needed.** The arrays themselves carry the pre-transcend state forward; the engine reads the same formula as the regular.

**Architectural note:** Category 2 negatives retain per-element arrays as a small architectural exception. Not a general break of "negatives have flat state" — only uniqueness trackers need this structure.

### Category 4: Per-round-reset accumulator (Radiance, Banner)

**Pattern:** Same as Category 2 — per-element Set, increment with set semantics. Difference: **arrays empty at round end.**

**Examples:**
- engine_radiance — "+2 mult-mult per unique bright seen this round" (NOTE: current implementation is exponential `2^n`; **bug logged separately to fix to `1 + n × 2`**)
- engine_banner — "+1 mult-mult per unique ribbon seen this round"

**Uniqueness keys (analogous to Cat 2):**
- Radiance: **card id** (bright cards — 5 unique brights in base deck, so max 1 + 15 × 2 = ×31 at 3-stack all-arrays-full)
- Banner: **card id** (ribbon cards — 10 unique ribbons in base deck, so max 1 + 30 = ×31 at 3-stack all-arrays-full)

**Negative state shape:** Same as Category 2:
```js
state = {
  arrays: [Set, Set, Set],
}
```

**On event observation:** Same as Cat 2 — add to each array if absent.

**Engine output:** Spirit-specific formula on `sum-of-lengths`:
- Radiance: `1 + sum × 2` (post-bugfix)
- Banner: `1 + sum`

**Tooltip:** Same as Cat 2 — union.size.

**On round-end:** Each array → empty Set. Negative starts next round fresh, like the regular would.

**If transcend during shop (between rounds):** Arrays are empty at transcend (per-round reset already happened); negative inherits 3 empty arrays. Begins accumulating fresh next round.

**Why arrays (not collapsed counter):** Handles the "Jade-added stack member mid-round" case correctly. A newly-added regular element starts with empty array; transcendence captures this staggered state. Collapsed counter would lose the staggered acquisition info.

### Category 5: Maturation timer (Past Life, Cuckoo Egg)

**Pattern:** Per-element `{numerator, denominator}` tracking rounds-held vs rounds-required. Each element matures independently when its numerator reaches denominator.

**Examples:**
- util_past_life — matures after N rounds; can be sold to copy a target spirit as a negative
- sym_cuckoo_egg — matures after N rounds; auto-hatches into a random Tier-2 fusion as a negative

**Per-element regular behavior (locked design from Phase 0/1):**
- Each element independently tracks numerator (rounds held) / denominator (rounds to mature)
- Sell semantics: player can sell newest, top-2 newest, or whole stack
- Selling immature elements has no effect (only matured ones activate)

**Negative state shape:**
```js
state = {
  numerator: number,             // Sum of element numerators at transcend
  denominator: number,           // Sum of element denominators at transcend
  powerLevel: number,            // For the created copy/hatch's powerLevel
  
  // For Past Life only:
  selectedTarget?: spiritId,     // Player's choice at sale time
  
  // (Cuckoo Egg uses RNG at hatch time, no stored target)
}
```

**Maturation logic:**
- Per round: `state.numerator += 1`
- Matured when `state.numerator >= state.denominator`

**Activation behavior:**
- Past Life: matured negative can be sold → creates Negative copy of selected target at copier's powerLevel
- Cuckoo Egg: matured negative auto-hatches → creates Negative Tier-2 fusion (random) at copier's powerLevel

**Copy/hatch semantics (Option A — fresh state, locked 2026-05-22):**

The copy/hatch creates a fresh negative at the copier's powerLevel with no accumulated state. The negative is "born ready" but starts at zero accumulation.

For target = regular spirit: Copy is a powerLevel-N negative form of that spirit with empty state.
For target = negative spirit: Copy is a powerLevel-N negative form (not target's powerLevel × N). **No powerLevel compounding.**

**Why Option A:** Simpler. The "create a fresh negative without needing to actually 4-stack" effect is itself valuable. Avoids per-category complexity for copy semantics.

**Pending investigation for Phase 4 (Option B alternative):**

An alternative design — "copy inherits the target's accumulated state" — was considered but deferred. It would allow Past Life copies to inherit accumulator state (e.g., copying a 3-stack Algae creates a Negative Algae with that Algae's snapshotted state).

The complexity is in handling powerLevel mismatch between copier and target. If copier powerLevel < target stack count, only the older N arrays/elements are inherited. For Category 2/4 uniqueness trackers, this means snapshotting copier-powerLevel-worth of arrays. For Category 5 targets (copy-of-copy), recursive resolution needed.

**Option B is documented for future revisit during Phase 4** if Option A feels insufficient in playtesting. Re-evaluate after F5.1 tuning lands.

**Cross-reference:** Past Life's full design (Phase 0/1 era) lives in DECISIONS_LOG.md and TESTING_NOTES_V2 — should be referenced during F2.5 implementation for full context.

## F2.5 implementation plan (locked 2026-05-22)

**Pre-implementation needs:**
1. Recon Past Life and Cuckoo Egg current implementation (search RunManager.js for `past_life`, `cuckoo_egg`, `matureRounds`, `hatch`)
2. Recon Northern Lion shop reroll integration to confirm Category 1 mapping
3. Confirm `_aggregateElementsForNegative` current implementation (the helper that needs refactoring to Option γ)

**Implementation phases:**

**Phase A: Refactor `_aggregateElementsForNegative` (30 min)**
- Replace floor-division logic with Option γ: invoke `applyEngine` on regular spirit at transcend time
- Capture output as `preTranscendTotal` for Category 1
- For Category 2/4: snapshot arrays directly (no engine self-application needed)
- For Category 5: sum numerator/denominator across elements
- Branch on category by detecting state shape (or maintain a category-map per spirit id)

**Phase B: Update Category 1 spirit engine formulas (~22 spirits × 5 min)**
- For each spirit's `applyEngine`: when `spirit.isNegative`, use the new formula `preTranscendTotal + newEvents × scaling × powerLevel`
- The scaling factor is the same as in the regular form (e.g., 0.1 for Algae, 0.5 for Devotion's bright bonus, etc.)
- Templated update across all 22 — fast once pattern is established

**Phase C: Update Category 2 spirit engine formulas (2 spirits × 15 min)**
- Wildlife, Plenty: when `spirit.isNegative`, formula is identical to regular (no `× scaling`-style branch needed)
- Just the architectural piece: arrays inherited at transcend, increment with set semantics

**Phase D: Update Category 4 spirit engine formulas (2 spirits × 15 min)**
- Radiance: bugfix from `2^n` to `1 + n × 2`
- Banner: confirmed `1 + n`
- Both: arrays inherited, set semantics, round-end reset hook
- Add `onRoundEnd` hook to clear arrays for negative form

**Phase E: Update Category 5 spirit behavior (2 spirits × 30 min)**
- Past Life: implement negative sale logic (`createCopy(target, copierPowerLevel)`)
- Cuckoo Egg: implement negative hatch logic (`createHatch(copierPowerLevel)`)
- Both: per-round numerator increment for negative form

**Phase F: Update event observation paths (1 hour)**
- For Category 1 negatives: `state.newEvents += 1` instead of `incrementPerElement`
- For Category 2/4 negatives: iterate `state.arrays`, add to each if absent
- For Category 5 negatives: `state.numerator += 1` per round
- For Northern Lion: confirm shop reroll integration uses correct state read

**Phase G: Tooltip updates (1 hour)**
- Category 1: `oldestAtTranscend + newEvents`
- Category 2/4: `union.size` (compute on demand)
- Category 5: `numerator/denominator` ratio with maturity indicator

**Phase H: Verification (2-3 hours)**
- Per spirit: build to transcend point, verify continuity at boundary, verify post-transcend behavior
- Cross-category test: hex_57 + Wildlife (does adjacency-matching interact with Wildlife's animal-type uniqueness?)
- Northern Lion-specific: confirm rerolls available is correctly reported post-transcend

**Total estimate: 8-12 hours** (revised from original 6-15h with audit clarity).

### Outstanding items before implementation

- [x] Recon Past Life current implementation — `_firePastLifeCopy` exists, supports negative + regular targets
- [x] Recon Cuckoo Egg current implementation — `_fireCuckooHatch` exists but produces REGULAR fusions only; needs negative-aware refactor
- [x] Recon Northern Lion shop reroll integration — currently flat `state.freeRelolls`; needs full accumulator refactor
- [x] Confirm `_aggregateElementsForNegative` current code shape — Math.floor(sum/powerLevel) approach confirmed
- [x] Verify Radiance is genuinely exponential — confirmed `Math.pow(2.0, n)`, fix to `1 + n × 2` with set semantics
- [x] Banner uniqueness key — card id, matching Radiance's structure

### Final scope decisions (2026-05-22)

**In scope for F2.5:**
- Cat 1 (~21 spirits — Ducks removed): full Idea D treatment
- Cat 1' (Velocity): exponential-aware variant of Idea D
- Cat 2 (Wildlife, Plenty): per-element arrays inherited, set semantics
- Cat 4 (Radiance, Banner): same as Cat 2 + round-end reset + bug fixes
  - Radiance: `2^n` → `1 + n × 2`, switch to `addUniqueToElements`
  - Banner: switch to `addUniqueToElements` for set semantics consistency
- Cat 5 (Past Life, Cuckoo Egg): maturation accumulator; negative Cuckoo Egg produces negative Tier-2 fusion
- Northern Lion conversion: flat state → per-element accumulator
  - 3-stack gives 3 rerolls per push (additive accumulator pattern)
  - Tooltip shows "Free rerolls available: X"

**Deferred to Phase 5:**
- Ducks: full effect redesign needed; not just architecture but mechanic
  - Currently flat-state `multValue` (net deck-flip matches minus strands)
  - Bundle with other Phase 5 redesign work
- **Velocity exponential-on-stack (balance, not structure):** both branches compound on stack
  (negative: `powerLevel` inside the `1.5^x` exponent; regular: `_scaleEngineOutput`'s
  `Math.pow(mult, n)`) — currently CONSISTENT with each other, but an across-the-board exception to
  the codebase's otherwise-ADDITIVE stacking throughline. Phase 5 binary decision: **sanctioned**
  build-around payoff vs **sand-down** to additive grammar — and only then the magnitude (base 1.5
  is already explosive). Decide both branches together. Full rationale: DECISIONS_LOG
  `D-F4.20-VELOCITY`. Cross-ref F5.1 (balance), F4.27-ish (`_scaleEngineOutput` canonicalization),
  F4.38 (Wu Xing). F4.20-FIX deliberately left `velocity.test.js` asserting accrual + monotonic
  output only (NOT the exact exponential) at this granularity.

**Cat 5 activation semantics:**
- Past Life: sale-activated. Player sells stack, creates copies of target spirit. Negative form sells to create Negative copy at copier's powerLevel.
- Cuckoo Egg: sale-activated (never auto-hatches). When sold, generates Tier-2 fusion(s). Stacked sales RNG-sync to same fusion. Negative Cuckoo Egg generates Negative Tier-2 fusion at copier's powerLevel.

**F2.5 effort total: 12-17 hours** (revised based on expanded scope including Northern Lion conversion).

### F2.6: Push-driven flow & interest redesign (commitment model) **`✅ SHIPPED + VERIFIED 2026-05-14`** (added 2026-05-07 during F1.3 scoping; design finalized 2026-05-08; shipped over five patches 2026-05-08 through 2026-05-14)

**Background:** F1.3's original spec added per-yaku +5 ki, per-push +5 ki, and surplus bonus. During F1.3 scoping, Robert pivoted the design — the original spec was obsolete. F2.6 replaces F1.3 with a commitment-based push/bank mechanic that ties both flow and interest to push/bank outcomes.

**Design (finalized 2026-05-08 after extended back-and-forth):**

The current model mutates flow per-push (incremental ratchet), which means each push pays out immediately and failure only loses what the prior success gained. This isn't a real push-your-luck mechanic — there's no commitment.

The new model: **pushes don't pay out until you bank or fail.** Each successful push raises your "rung." Higher rungs give bigger bonuses (if banked) and worse penalties (if failed). The multiplier is a **table lookup** based on resolution depth, NOT a compounded product.

**Push curve (parametric for F5.1 tuning):**

| Resolution depth | Success (bank) | Failure (push failed) |
|------------------|----------------|-----------------------|
| 0                | ×1.00          | n/a                   |
| 1                | ×1.10          | ×0.90                 |
| 2                | ×1.25          | ×0.80                 |
| 3                | ×1.50          | ×0.65                 |
| 4                | ×2.00          | ×0.50                 |
| 5+ (extrapolate) | +0.50/depth    | -0.15/depth (floor 0.05) |

**Break-even probabilities reveal interesting "valley of doubt" at push 3 (~71% needed), then push 4 drops back to 67% as the bonus accelerates faster than the penalty.** Past push 4, probabilities climb steeply.

**Architecture:**
- `_pushDepth` on GRM, integer, resets at round start, increments on successful push
- `_flow` no longer mutates during pushes — only at bank or fail
- At bank: `_flow *= getPushMultiplier(_pushDepth, 'success')` (depth 0 = no change)
- At fail: `_flow *= getPushMultiplier(_pushDepth + 1, 'failure')`
- Interest at round end: `effectiveRate = (base + spirit modifiers) × pushMult` (Option A: multiplier scales everything including Bonds and Ingot contributions)
- Interest is **round-local** — recomputed each round, no persistent carry-over

**Score behavior (clarification):** Push outcomes affect **flow**, which affects scoring going forward. This round's score is what was earned at the flow value during captures; future rounds feel the new flow value. Pushes don't retroactively recompute this round's score.

**UI changes:**
- New info bar item: `Interest: 10%` showing current effective rate (no multiplier annotation in main view)
- Bank/push popup expanded to show all three outcome scenarios (bank, push success, push fail) for both flow and interest

**Hexagram interactions (preserved hooks):**
- `modifyPushSuccess` / `modifyPushFailure` (used by `volatile_flow` #64, `stable_flow` #63) — temporarily invalidated by the new model. **NOT dead code: these hooks are still attached to real, draftable hexagrams whose design intent is preserved as F2.6.b redesign work. Do not delete during cleanup passes.** The hexagrams still partially function via their `modifyFlowDecay` effects, but their push-modifier expression is awaiting rewire.
- `modifyFlowDecay` — still functional (decay still happens at round end)
- `onPushSuccess` / `onPushFailure` (used by `push_ki_swing` #06) — still fire, observe events. No changes needed.
- `modifyKiReward`, `modifyInterestRate`, `onCaptureComplete` (used by `no_banking_ki_plus_capture` #16) — still functional. No changes.

**Effort:** 3-5 hours (design + implementation + verification + UI updates).

**Cross-references:**
- F1.3 (original) SUPERSEDED by F2.6
- F2.6.b (next): redesign of volatile_flow and stable_flow hexagrams for the new model
- F2.2 (Hexagram corrections): address pre-existing description/code mismatches in #06, #16, #63, #64 (separate concern from F2.6's mechanic redesign)
- F3.5 (Stack contribution display): may surface push-multiplier details
- F3.9 (Round-end ki breakdown): now needs to include push-multiplier line
- F5.1 (Threshold tuning): the parametric `PUSH_CURVE` is the primary tuning input
- Flow mechanic (existing): partially redesigned; decay preserved

### F2.6.b: Hexagram push-mechanic redesign post-F2.6 (added 2026-05-08; reclassified as F2.2 sub-task 2026-05-14)

**Status:** No longer a standalone Phase 2A task — this work bundles naturally into F2.2 (Hexagram corrections, Phase 2B). When F2.2 audits volatile_flow (#64) and stable_flow (#63) against DESIGN_DOC_V5, F2.6.b's push-curve redesign is part of that fix.

Original analysis preserved below for reference.

**Background:** F2.6's commitment-based push model renders two hexagram effects' push-multiplier hooks **temporarily invalidated** (not dead code — see below):

- `volatile_flow` (hex_64 Wèi Jì): old hooks were `modifyPushSuccess: 1.2, modifyPushFailure: 0.7`. In new model these don't fire because per-push hooks don't modify mult anymore.
- `stable_flow` (hex_63 Jì Jì): old hooks were `modifyPushSuccess: 1.05, modifyPushFailure: 0.95`. Same issue.

After F2.6 ships, these hexagrams retain only their `modifyFlowDecay` effects (which still work — 0.85 for volatile, 0.98 for stable). This makes them substantially weaker in expression than originally designed.

**⚠ Cleanup-pass warning:**

The `modifyPushSuccess` and `modifyPushFailure` fields on these two hexagrams are marked with `OBSOLETE post-F2.6` comments in code. **These fields must NOT be deleted by Phase 4 dead-code cleanup passes (F4.1, F4.10, or similar).** They are placeholders awaiting redesign in this task (F2.6.b), not stale code from past refactors. Their hexagrams (#63 and #64) are still draftable in actual play, and the design intent — "stable_flow makes pushes gentler" / "volatile_flow makes pushes more extreme" — is preserved as work to be done, not abandoned design.

This is an example of a broader architectural smell pattern worth naming: **temporarily-invalidated code from staged redesigns** — code that looks dead but represents active design commitments awaiting rewire. Distinct from genuinely dead code (no callers, no design intent). Cleanup passes should always check whether code is genuinely orphaned or just awaiting later work.

**Redesign approach (TBD, two candidate shapes):**

**Option A: Hexagram-specific curve overrides**
```js
volatile_flow: {
  pushCurve: {
    1: { success: 1.20, failure: 0.75 },
    2: { success: 1.50, failure: 0.55 },
    3: { success: 2.00, failure: 0.30 },
    // ... steeper everywhere
  },
  modifyFlowDecay: () => 0.85,
}
```

Pro: Maximum design control per hexagram. Con: large per-hexagram data.

**Option B: Curve-scaling multiplier**
```js
volatile_flow: {
  pushCurveAmplifier: 1.5,  // amplifies both gain and loss by 50% from baseline
  modifyFlowDecay: () => 0.85,
}
```

Where the resulting curve becomes `1.0 ± (deltaFromBaseline × amplifier)`:
- Baseline depth 1: success 1.10 (+0.10), failure 0.90 (-0.10)
- Volatile depth 1 with amplifier 1.5: success 1.15, failure 0.85

Pro: One scalar per hexagram. Con: less expressive than per-depth overrides.

**Recommendation:** Option B (scaling) for simplicity. Player intuition matches "volatile = more extreme swings." Specific values to be tuned in F5.1.

**Implementation also requires:**
- Removing the obsolete `modifyPushSuccess` / `modifyPushFailure` fields once the new approach replaces them (only then are they dead code)
- Removing the `OBSOLETE post-F2.6` comments once resolved
- Updating hexagram tooltip descriptions to reflect the new behavior

**Other hexagrams in this audit's scope:**
- `push_ki_swing` (hex_06 Sòng): description says "Banking costs 5 ki" but code lacks bank penalty. Either add the bank penalty or correct the description. Likely F2.2 territory but flagged here.
- `no_banking_ki_plus_capture` (hex_16 Yù): description says "+3 ki per capture" but code adds 1. Same — F2.2 territory.

**Effort:** 1-2 hours (audit + implementation + tests + F2.2 cross-coordination).

**Cross-references:**
- F2.6 (parent): created the obsolescence this resolves
- F2.2 (Hexagram corrections): pre-existing description/code mismatches in #06, #16, #63, #64 belong here, not F2.6.b
- F4.1 / F4.10 (dead code cleanup): MUST NOT delete `volatile_flow` / `stable_flow` push hooks before this task resolves them
- F4.14 (Design doc reconciliation): hexagram descriptions in design docs may also need updating to match resolved code

**F2.6 + F2.6.b effort total: 4-7 hours combined.**

### F2.6.c: Capstone Time push-mechanic redesign post-F2.6 (added 2026-05-08; reclassified as F2.1 sub-task 2026-05-14)

**Status:** No longer a standalone Phase 2A task — this work bundles naturally into F2.1 (Spirit corrections, Phase 2B). When F2.1 audits legendary spirits against DESIGN_DOC_V5, F2.6.c's Capstone Time push-curve redesign is part of that fix.

Original analysis preserved below for reference.

**Background:** The `legend_time` capstone (Capstone Time) previously modified push outcomes via in-line logic in `onPushSuccess` / `onPushFailure`:
- `onPushSuccess`: base was `time ? 1.3 : 1.1` (Time made successes 30% instead of 10%)
- `onPushFailure`: base was `time ? 0.95 : 0.9` (Time made failures 5% loss instead of 10%)

The combined effect was "Time smooths push variance — bigger wins, smaller losses." This was hard-coded into the per-push mutation logic and is now invalidated by F2.6's commitment model.

During F2.6 implementation, Claude Code preserved a vestige of this behavior by applying `× 1.1` to the curve multiplier when Time is active (in both `onBank` and `onPushFailure`). This produces:
- Push success at depth 1 with Time: `1.10 × 1.1 = 1.21`
- Push failure at depth 1 with Time: `0.90 × 1.1 = 0.99`

Mathematically reasonable (pulls outcomes toward 1.0, smoothing variance) but **was not in F2.6's specification** — Claude Code made an autonomous design call. Per Robert's decision 2026-05-08, this should be reverted in the F2.6 v1.1 patch and Capstone Time properly redesigned in this task alongside other push-mechanic hexagrams.

**Redesign options:**

**Option A: Curve scaling toward neutral (preserve original intent)**

Time's effect "smoothing volatility" maps naturally to dampening the push curve's swings. A `pushCurveDampener: 0.5` would halve the deltas from baseline:
- Baseline depth 1: success 1.10 (+0.10), failure 0.90 (-0.10)
- With Time (dampener 0.5): success 1.05 (+0.05), failure 0.95 (-0.05)

This is the inverse of `volatile_flow`'s amplifier approach (F2.6.b). Two capstones/hexagrams with opposing effects on the same curve. Elegant symmetry.

**Option B: Asymmetric (Time only protects against failure)**

Time has historically been about temporal stability — perhaps it should only soften losses, not weaken wins:
- Win at depth N: unchanged from baseline
- Loss at depth N: `1 - (1 - failure_multiplier) × 0.5` (halves the loss)

E.g., depth 1 baseline failure is 0.90 (-0.10); with Time it becomes 0.95 (-0.05). Wins stay at 1.10. Better for cautious players.

**Option C: Extra depth tolerance**

Time gives the player one "free retry" — a failed push at depth 1 resolves at depth 0 instead of depth 1's failure value. Conceptually "time gives you a second chance."

**Recommendation:** Option A (symmetric dampener) for v1, matches the elegance of volatile_flow/stable_flow's amplifier model and is the closest analog to the original intent.

**Sequencing:** Should ship alongside F2.6.b (hexagram push redesign). Both involve the same push-curve modifier infrastructure. Bundle as a single design + implementation cycle.

**Effort:** Combined with F2.6.b — adds ~30 min to that task's scope.

**Cross-references:**
- F2.6 (parent): created the obsolescence this resolves
- F2.6.b (sibling): same infrastructure work, bundle together
- F1.x Capstone Time original implementation: where the existing logic lived

**F2.6 + F2.6.b + F2.6.c effort total: ~5-8 hours combined.**

### F2.7: Round-local state reflects mid-round mutations in real time (added 2026-05-07; restructured into 3 sub-tasks 2026-05-08)

**Background:** Recon during Phase 2A planning revealed that what initially looked like a single architectural pattern (the "round-start snapshot pattern") is actually **three distinct mechanisms** producing similar symptoms:

1. **Spirit roster snapshot** — `this._spirits` array in GRM, set via `setSpirits()` at round start, never re-synced for mid-round mutations
2. **Field configuration round-start computation** — `_fieldBase` computed once with `FieldManager.MAX_SLOTS + _amberMod + _fieldSlotBonus`, then passed to `_field.setMaxSlots()`; mid-round mutations to `_permanentFieldSlotMod` don't re-trigger this computation
3. **UI re-render gaps** — manager classes (DeckManager, HandManager, FieldManager) update correctly on mid-round mutations, but GameScene's visual rendering doesn't refresh until the next user action

Splitting F2.7 into focused sub-tasks based on these mechanisms gives each a cleaner scope and lets them ship independently.

### F2.7a: Eliminate `_spirits` snapshot, live read from run state **`✅ SHIPPED + VERIFIED 2026-05-08`**

Addresses the **spirit roster snapshot** mechanism. Eliminates `this._spirits` array in GRM and replaces all 45 references with live `run.activeSpirits` / `run.scoringSpirits` getters. Strengthens `run.spirits` getter with `stackCount > 0` filter as defense-in-depth against zero-stack residue from fusion alchemicals.

**Manifestations resolved:**
- Cinnabar fusion: new fusion scores immediately in same round ✓
- Mercury de-fusion: component spirits score immediately ✓
- Jade stack increment: new stack count reflected in scoring ✓
- Amber transcend: negative version scores; old version doesn't double-count ✓
- Lead summon: new Rare spirit scores immediately ✓
- Sulfur duplicate/clear: works with negative spirits in pool ✓
- Pearl Tier-4 fusion: same architectural path, expected to work (not specifically tested but inherits the fix)

**Effort delivered:** ~2-3h design + recon + verification.

See DECISIONS_LOG.md (2026-05-08 entry) for full details.

### F2.7b: Field configuration live recomputation **`✅ SHIPPED + VERIFIED 2026-05-08`**

Addresses the **field configuration round-start computation** mechanism.

**Manifestations resolved:**
- Amber field slot reduction: `_permanentFieldSlotMod` now triggers immediate `_recomputeFieldSlots()` on Amber use ✓
- Rooster field slot expansion: switched from absolute `setMaxSlots(9)` to relational `_roosterBonusThisRound += 1` with helper recomputation ✓
- Hexagrams (#28, #59, #60, #62): continue to plug into the `modifyFieldSlots` hook on top of the aggregated base — verified via architecture (existing hook contract preserved)

**Architectural choice:** Approach B (explicit aggregation in helper) over Approach A (central registration API). Documented threshold for revisiting (3+ more sources). See DECISIONS_LOG.md 2026-05-08 entry.

**Known limitation:** Data-layer updates work correctly, but visual rendering of new slot count requires a subsequent player action to trigger re-render. To be resolved by F2.7c.

**Effort delivered:** ~1h design + recon + verification.

See DECISIONS_LOG.md (2026-05-08 entry) for full details.

### F2.7c: UI re-render hooks + Throat same-round duplicate **`✅ SHIPPED + VERIFIED 2026-05-08`**

Addresses the **UI re-render gaps** mechanism + the related Throat same-round availability issue. Required two passes — initial fix addressed alchemical paths; follow-up addressed zodiac paths after playtest revealed three-path dispatch fragmentation.

**Manifestations resolved:**
- Throat Chakra duplicate now available same round (shuffled into round-local draw pile) ✓
- Rooster: 9th field slot appears immediately ✓
- Rat / Dog / Horse: added cards appear in hand immediately ✓
- Ox / Monkey: slot mutations visible immediately ✓
- Snake: yaku threshold reduction visible immediately ✓
- Amber + Cinnabar + Mercury + Jade + Pearl + Sulfur + Lead: full UI refresh on activation ✓
- Zodiac sell button: full UI refresh on sale (bonus cleanup) ✓

**Architectural finding deferred to F4.15:** Three separate code paths dispatch consumable activations (`_activateCardTarget`, `_activateAlchemical`, inline zodiac else-branch). Each independently manages target picking, execution, re-render. Unification scheduled for Phase 4 engine cleanup.

**Effort delivered:** ~1.5h design + recon + verification + follow-up.

See DECISIONS_LOG.md (2026-05-08 entry) for full details.

### F2.7 phase total: ~4-5h delivered (under original 5-8h estimate). **F2.7 CLUSTER COMPLETE.**

**Cross-references:**
- F2.3.i: surfaced via Throat Chakra deck count lag and alchemical scoring lag
- F2.8 (deck view overlay): benefits from live deck state and Throat same-round availability
- All player-initiated mid-round state mutations: now propagate correctly through data layer (F2.7a/b) and UI layer (F2.7c)
- F4.15 (Consumable activation unification): architectural follow-up scheduled for Phase 4

### F2.8: Deck-view overlay (added 2026-05-07 from F2.3.i playtest) **`✅ SHIPPED 2026-05-15`**

**Status:** Functional MVP shipped during Phase 2D session. Card layout used 0.5 scale and 12-per-row to fit modal. Full aesthetic + usability redesign logged as **F3.21** for Phase 3.

**Background:** Currently the player can click the banked-pile icon to see all cards they've captured this round. There's no equivalent for the deck — the player can't inspect their full deck composition, see which cards have stamps/editions/enhancements, or verify deck mutations.

**Design intent:** Mirror the banked-pile pattern. Clicking the deck icon opens an overlay showing all deck cards with their enhancements, stamps, editions, and any other state.

**Design specs:**
- **Content:** Full deck (all cards owned), not just round-local draw pile. The player wants to see what they own, not just what's coming up.
- **Visualization:** Each card shows enhancement icons, edition borders, stamp marks — depends on F3.15 UI polish (edition visibility, Earth icon, etc.) being complete first.
- **Tooltip per card:** Hover shows full card state (enhancements, stamps, editions, base points, type, month).
- **Sort order:** Default sort by month then type (composition-oriented view). Possible: filter toggle for "draw pile only" or "by edition/stamp" — polish.
- **Closes on click outside or via Close button.**

**Why this matters:**
- Resolves a UX gap: player wants to inspect deck like they can the banked pile
- Solves F2.3.j (Throat Chakra duplicate visibility) cleanly — duplicates are visible in the overlay
- Supports better strategic decisions (player can see what's coming, what's been enhanced)
- Validates Phase 2 deck mutations (Crown Chakra identity-copy results, etc.) at-a-glance

**Dependency:** Should follow F2.7 (live deck reads) so the overlay always reflects current state. Without F2.7, the overlay would show a stale snapshot mid-round.

**Effort:** 2-3 hours (UI rendering + interaction + sort logic).

**Cross-references:**
- F2.7 (live deck reads): prerequisite for accurate real-time view
- F3.15 (UI polish): card sprite enhancements (edition borders, Earth icon) needed for full visualization
- F2.3.j (Throat Chakra duplicate visibility): resolved by this overlay
- Existing banked-pile overlay pattern: direct reference for implementation style

### F2.9: Mercury de-fuse smart slot check (added 2026-05-07 from F2.3.i playtest) **`✅ SHIPPED + VERIFIED 2026-05-15`**

**Status:** Smart-slot check shipped. For each de-fusion component, checks if an existing non-negative spirit of that id is in the roster — if yes, no new slot needed. Net-negative-slot case enabled (both components stack + fusion slot freed = net free slot). Error message correctly reports 1 vs 2 slots needed. All 8 verification tests pass.

**Background:** Mercury currently requires 2 open spirit slots to de-fuse a Tier-2/3 fusion. This is overly strict in cases where one of the resulting component spirits would merge into an existing stack.

**Example:** Player has 6/6 slots filled, including a Cinnabar-fused Devotion (Wood+Fire) and a singleton Wood spirit. Mercury de-fuse currently fails on "need 2 open slots." Smart slot check would recognize that the Wood component can stack onto the existing Wood (+1 to existing stack, no new slot needed), and Fire takes the Devotion slot. Net: 0 new slots required, just one stack increment + replacement.

**Design intent:** Mercury eligibility check should compute the actual slot delta after de-fusion, not assume worst case.

**Approach:**

For each component of the fusion being de-fused:
- If component spirit already exists in roster AND is at stack < max: counts as "no new slot needed" (stack +1)
- If not: counts as "new slot needed"

Mercury succeeds if `new_slots_needed <= open_slots + 1` (the +1 because the fusion itself frees its slot).

**Edge cases:**
- Both components stack onto existing → net -1 slot (frees a slot!)
- One component stacks, one needs slot → net 0 slot change
- Both components need new slots → net +1 slot (current behavior)

**Effort:** 1-2 hours (eligibility check + tests).

**Cross-references:**
- F2.3.i: surfaced via H5 testing
- Mercury alchemical (parent feature)

### F2.10: Stamp mixing system + retrigger math correction (added 2026-05-07 from F2.3.i stamp playtest; split into 2.10a + 2.10b on 2026-05-08)

**Note on split:** Originally bundled because both issues surfaced from stamp playtest. On closer inspection the two issues involve different parts of the codebase (stamp application vs scoring engine) and have different risk profiles. Split into two independent sub-tasks for cleaner scoping.

### F2.10a: Stamp mixing system **`✅ SHIPPED 2026-05-08`**

**Background:** The 9-color stamp mixing system from CONSUMABLE_ROSTER_V4 was designed so that applying a stamp to an already-stamped card mixes the colors (yellow + red = orange, blue + yellow = green, etc.). Previously, applying a second stamp **overwrote** the previous stamp instead of mixing, making tertiary stamps (gray, black) unreachable through normal play.

**Mixing matrix (symmetric — both orderings produce the same result):**

| Existing | + Applied | = Result |
|---|---|---|
| red | yellow | orange |
| yellow | blue | green |
| red | blue | purple |
| red | green | black |
| yellow | purple | black |
| blue | orange | black |
| white | black | gray |

Any combination not in the table → overwrite. This is intentional: players need to be able to change stamps when they want to.

**Codebase changes:**
- `src/data/stamps.js`: added `STAMP_MIX` lookup table + exported `mixStamps(existing, applied)` function
- `src/systems/RunManager.js`: `applyStamp` now calls `mixStamps(card.ribbonStamp, stampId)` to determine the result stamp

**Effort delivered:** ~30 minutes.

### F2.10c: Stamp visualization correctness **`✅ SHIPPED 2026-05-08`**

**Background:** `GameScene._makeRibbonStampDot` was rendering every stamp as a white dot due to two bugs in the hardcoded color map: (1) wrong key format — map keys were bare color names (`"red"`) but lookups used full stamp IDs (`"stamp_red"`), (2) map only contained 4 of the 9 stamps.

**Fix:** Replaced the hardcoded map with a direct `getStampDef(card.ribbonStamp).hexColor` lookup. The data file already defined `hexColor` for all 9 stamps; the visualization now reads from that authoritative source.

**Effort delivered:** ~5 minutes.

**Cross-references:**
- F2.10a (mixing): the visualization correctness is essential for the mixing system to be visually playable
- F3.18 (card tooltip enrichment): future work to surface stamp name + effect in tooltip; visualization alone gets us mid-game readable

### F2.10b: Retrigger compounding math correction **`✅ SHIPPED + VERIFIED 2026-05-08`**

**Background:** White stamp retrigger math was incorrect. Retrigger fired as a **separate** scoring event after the primary capture, calculated as `retrigger_pts × mult` without flow. The intended behavior is for the retrigger to **compound** into the primary capture's score calculation so it participates in all the same multipliers.

**Architectural finding from recon:** GRM `_addCapture` had two parallel retrigger systems:
1. Phase 1.5 (correct): used by `retrigger_rainbow`, `retrigger_family`, plus mirror/memory proxies
2. Stamp captured-trigger block (broken): isolated `rPts`/`rMult` starting at 1.0, separate score event

**Decision:** Plug stamps into Phase 1.5's `retriggerCount` (2-line addition). Delete the entire parallel block (~85 lines). Approach unifies the two systems.

**Math verified (Yang ×4, Sun +3, with white stamp on second card):** Expected mult progression 1 → 16 → 76 → 316 confirmed in capture log. Final score 20,544 matches `67 × 316 × 0.97`.

**Surfaced architectural observation (out of scope for F2.10b):** Phase 1.5 retrigger loop doesn't apply hexagram `onCardScored` or metal-from-hand mult. This affects spirit retriggers too, not just stamps. May need a follow-up Phase 1.5 enhancement task.

**Surfaced UX observation (out of scope for F2.10b):** Capture log no longer displays retriggers as separate line items (the deleted `logRetriggerScoring` call provided this). Math is correct; just less self-documenting. Candidate for UX follow-up.

**Effort delivered:** ~1.5h recon + design + ship + verification.

See DECISIONS_LOG.md (2026-05-08 entry) for full details.

### F2 phase total: ~54-69 hours (F2.10a 2-3h pending + F2.10b shipped, totaling ~4-6h for the split — unchanged from original F2.10 estimate).

**Phase 2 total: ~54-69 hours.**

---

## Phase 2 Sub-Phase Reference

For sequencing clarity, Phase 2 work groups into four sub-phases:

- **Phase 2A — Architectural cleanup** (✅ COMPLETE 2026-05-14): F2.6, F2.7, F2.10
- **Phase 2B — Content corrections** (in progress 2026-05-14): F2.1 spirits, F2.2 hexagrams, F2.3 consumables
- **Phase 2C — Double-trigram verification** (~8-12h): stress-test the 7 effect-bearing double-trigrams (see below)
- **Phase 2D — Polish + verification** (~10-15h): F2.5, F2.8, F2.9, F2.4 (audit last, since it sweeps everything that came before)

Total of ~54-69h matches the per-task estimates above.

---

## Phase 2C: Double-Trigram Verification (8-12 hours, added 2026-05-14)

The 8 double-trigram hexagrams (per DESIGN_DOC_V5 §9.2) produce the most fundamental gameplay alterations — they don't tweak multipliers, they change how the game itself plays. Each one breaks assumptions that other systems quietly depend on, requiring focused verification and likely refinement.

This was triggered by F2.2 Prompt 1 verification revealing that hex_29 Kǎn (match_by_rank) has incoherent behavior: captures match by rank, but initial board layout still stacks by month. The same risk exists for the other 6 effect-bearing double-trigrams.

### Scope: 7 effect-bearing double-trigrams (hex_02 is no_effect, no test needed)

| Hex | Effect | Verification focus |
|---|---|---|
| hex_01 Qián | `score_field_at_round_end` | Inverts capture incentive — does UI communicate punitive captures? Spirits firing on capture behave coherently? |
| hex_29 Kǎn | `match_by_rank` | **Known issue:** initial deal still stacks by month. Full redesign needed. |
| hex_30 Lí | `one_yaku_disabled` | Per-round yaku cycling. Does the UI surface which yaku is disabled this round? |
| hex_51 Zhèn | `deck_flip_revealed` | Reveal mechanic + unmatched-flip discarding. UI shows next deck card? Field stays sparser as expected? |
| hex_52 Gèn | `yaku_ends_round` | No pushes ever. How does push curve handle this? F2.6's depth tracking edge cases? |
| hex_57 Xùn | `match_by_adjacent_month` | Same risk as hex_29: does initial deal handle adjacent-month logic correctly? |
| hex_58 Duì | `play_two_cards` | Two captures per turn. Spirit hooks fire correctly? Order of operations clean? |

### Per-hexagram process

1. Force-roll the hexagram
2. Play 3-5 rounds with varied builds (no spirits, spirit-heavy, hexagram-extreme)
3. Document any incoherent behavior in DECISIONS_LOG
4. Decide for each: ship as-is, patch mechanically, or full redesign with deferral

### Why this matters

These are the "signature mechanics" of the I Ching framing — the most identity-defining hexagrams in the game. Players who draft them expect transformative experiences. If they're subtly broken, the broader hexagram system feels less compelling.

### Sequencing rationale

Phase 2C runs **after** F2.2 + F2.3 + F2.1 (Phase 2B content corrections) and **before** Phase 3 UI work. Reasoning:

- Underlying systems (spirits, consumables, hexagrams) are stable before stress-testing their interactions
- Phase 3 UI work often needs to render these effects, so they should be coherent first
- Allows the verification to focus on emergent issues, not foundational ones

### Effort estimate

- 7 hexagrams × ~1h per playtest pass = ~7h
- Patching/redesign overhead = ~3-5h additional
- DECISIONS_LOG documentation throughout

**Phase 2C total: 8-12 hours.**

### Known follow-up: F2.2.x — hex_29 redesign

Already logged as a sub-task of Phase 2C. Initial-deal layout for rank-matching needs to be addressed before hex_29 can ship coherently.

---

## Phase 2D: Polish + Verification (10-15 hours, restructured 2026-05-14)

Final pre-Phase-3 cluster: small targeted improvements and a comprehensive audit. Runs after Phase 2C so the audit can sweep through everything including the double-trigram redesigns.

### Scope (tasks already individually defined in Phase 2 section above)

- **F2.5: Negative accumulator state semantics review** (~6-10h) — see full task spec earlier in document
- **F2.8: Deck-view overlay** (~2-3h)
- **F2.9: Mercury de-fuse smart slot check** (~1-2h)
- **F2.4: Inline tooltip + hardcoded description accuracy audit + universal stack-aware engine audit** (~5-8h) — RUNS LAST since it audits everything that came before

### Sequencing within Phase 2D

1. F2.8 (deck-view overlay) — small UI feature, low risk
2. F2.9 (Mercury smart slot) — tiny mechanical fix
3. F2.5 (negative accumulator semantics) — meatier semantic review
4. F2.4 (tooltip + engine audit) — final sweep, depends on everything else being stable

### F2.D.x: Phase 2 closeout test battery (added 2026-05-14)

Throughout Phase 2A and Phase 2B, certain verification cases were "verified in isolation but not in combination." These accumulate as deferred checks that should run at Phase 2 close, before pivoting to Phase 3.

**Known deferred items so far:**

- **F2.6 Tests 5 & 6** (Capstone Time + volatile_flow / stable_flow compounding): the amplifier math compounds multiplicatively (1.5 × 1.5 = 2.25 for full volatile-Time; 0.5 × 0.5 = 0.25 for full stable-Time). Confirmed by association in 2026-05-14 verification but not directly tested together.
- **hex_06 Sòng bank cost timing:** does the 5 ki bank deduction happen before or after the round-end interest credit calculation? Verify with a Sòng run.
- **hex_21 Shì Kè tax with 7-8 spirits:** verified at 5 and 6 spirits; 7/8 spirit configurations not directly tested.
- **More items will accumulate as Phase 2B work continues** — log them here as they appear.

This battery runs alongside F2.4 (the engine audit) as the final Phase 2 closeout. Both pre-Phase 3 work.

**Effort:** ~1-2h (each item is a quick force-roll and observation).

### Why this runs after Phase 2C

F2.4 explicitly audits the tooltip and engine state across the codebase. If hex_29 (and possibly other double-trigrams) trigger redesigns during Phase 2C, those redesigns introduce new code that F2.4 needs to sweep through. Running 2C first means 2D's audit catches everything in one pass instead of needing a re-audit.

**Phase 2D total: 10-15 hours.**

---

### F2.11: Capture vs Scoring semantic audit — RELOCATED to F5.0 (added 2026-05-15, moved 2026-05-15)

**Status:** Moved to Phase 5 as **F5.0** — the first task of Phase 5, before tuning and content work. Phase 4 architectural cleanup (F4.18 capture-event dispatch consolidation, F4.20 spirit logic migration, F4.22 duplicate card ID handling) provides the foundation needed for a clean classification pass.

Phase 2C continues to apply **partial fixes** for hexagrams that surface capture/scoring divergence. Each gets minimal patches to be functional under the simplest interpretation, with semantic edge cases deferred to F5.0.

See **F5.0** under Phase 5 for full scope.

---

## Phase 3: UI/UX correctness (8-10 hours)

After Phase 2, the engines compute correctly; Phase 3 makes sure the UI reflects it.

### F3.1: Bank/push UI projection accuracy (Slice 6 C54)

Replace hardcoded `0.9 / 0.95 / 1.1` constants with hook-derived values. About 4 callsites in GameScene.js.

Effort: 1 hour.

### F3.2: End-screen breakdown labels (Slice 6 C55) — **✅ EFFECTIVELY COMPLETE 2026-05-29** (no-op; subsumed by F2.6 + F3.1)

Same pattern — read actual flow rates, not constants.

**Closure note (2026-05-29):** Recon during Cluster A confirmed `_showEndScreen` (11,073-char body) has zero hardcoded multipliers or flow constants. F2.6's push-curve redesign refactored the scoring display to compute from live values via `getPushMultiplier`. F3.1's `getEffectiveFlowDecay()` getter + flow decay overlay fix resolved the one remaining hardcoded display site in this region. No additional work needed.

Effort: 0.5 hours → 0 hours (subsumed).

### F3.3: Yaku Reference uses dynamic thresholds (Slice 6 C56)

`_showYakuGuide` should call `this._round._getCaptureThresholds()` and substitute into descriptions.

Effort: 0.5 hours.

### F3.4: Active hexagram name/effect displayed in GameScene + ShrineScene (Slice 6 C57)

Add a small label near the threshold/Ki area showing `Hex N: Name`. Hover tooltip for full effect.

Effort: 1.5 hours (need to design where it fits in the layout).

### F3.5: Stack contribution display correctness + per-element tooltip mode (expanded 2026-05-07)

**Original scope:** After F1.1 fixes engines to actually scale by stackCount, the `Stacked ×N — fires N× per card` text becomes accurate. For engines that legitimately don't scale (per design), suppress that line.

**Expanded scope (added 2026-05-07 during D0.25 design discussion):**

F1.8.b's per-element accumulator architecture established that each element of a stacked spirit tracks its own state (totalPlayed, summonCount, seenAnimals, acquiredRound, etc.). However, the current tooltip system only renders ONE aggregated view per spirit — the rich per-element data is hidden from the player.

This creates UX awkwardness:
- Wildlife tooltip shows "4/9 animals seen" (longest-held value) but engine uses aggregate union (5 unique) for mult contribution
- Multi-stack accumulators with mixed maturity (e.g., Cuckoo Egg) need a clear way to surface per-element state
- Players can't see WHICH element is contributing what

**Two-mode tooltip design:**

1. **Stack-level (default hover):**
   - Aggregated view: total contribution to engine, summary state
   - Concise; matches current behavior in spirit and tone
   - Example: "Wildlife (×3 stack) — 5 unique animals seen → +2.5 mult"

2. **Element-level (when stack is fanned out / clicked):**
   - One tooltip per element, showing individual state and contribution
   - Element identified by acquired-round or fan position
   - Example for 3-stack Wildlife:
     - "Copy 1 (acquired R2): 4 animals seen → +2.0 mult contribution"
     - "Copy 2 (acquired R5): 1 animal seen → +0.5 mult contribution"
     - "Copy 3 (acquired R8): 0 animals seen → 0 contribution"

**Implementation approach:**

The data is already there (`spirit.elements[]`). Need to:
1. Detect fanned-out state in GameScene.js (probably existing infrastructure from F1.8.c-style fan-out animations)
2. Add per-element tooltip rendering path — iterates over `spirit.elements`, generates one tooltip per element
3. Refactor existing tooltip code paths to support both stack-level and element-level rendering
4. Address the aggregate-vs-element disagreement explicitly in stack-level tooltips (e.g., "5 unique animals total / 4 in longest-held copy")

**Affected spirits (per-element accumulators that benefit from this):**
- 25 spirits in ACCUMULATOR_SPIRIT_IDS (see F1.8.b)
- Plus Past Life (D0.24) and Cuckoo Egg (D0.25) which have per-element maturity tracking

**Effort:** 3-5 hours. Mostly tooltip rendering work; the underlying data architecture is already in place. May warrant a dedicated design pass for tooltip text/format conventions.

**Cross-references:**
- F1.8.b followup #5 (Wildlife UX note): the design tension this resolves
- F1.8.c (consumable re-render): may share fan-out infrastructure
- D0.24 (Past Life) / D0.25 (Cuckoo Egg): both benefit from per-element maturity display
- F2.5 (negative accumulator state semantics): tooltip readability for negatives is part of that broader question

**F3.5 effort total: 3-5 hours.**

### F3.5b: Stack-aggregated tooltip output for non-accumulator spirits (added 2026-05-29 from F3.5 shipment review)

**Background:** F3.5 added per-element tooltips for accumulator/engine spirits during fan-out, so players can see individual element state. But for non-accumulator spirits (per-card scorers, retriggers, economy modifiers, etc.) the stack-level tooltip still showed the raw description (e.g., "+20 points per spring card") regardless of stack count. Players had to do mental math to know that 3-stack Pollen actually gives +60 points per spring card.

F3.5b extends `getSpiritContrib` with per-spirit branches that compute stack-aggregated output for non-accumulator spirits. Builds on F3.5's foundation.

**Universal architectural changes:**

1. **Remove "Stacked ×N — fires N× per card" line for regulars.** The visual stack-count badge already conveys this. (Negative copy line preserved for now; flagged for possible removal later.)

2. **Eliminate "per stack" / "stacks: X/Y/Z" language from descriptions.** Replaced with stack-aggregated values throughout. Stack badge IS the per-stack indicator.

3. **Architectural change to description appending — Option C (replace, don't append).** When a spirit has a dispatch branch in `getSpiritContrib`, the contribution line is the *complete* tooltip body. Static description from `getSpiritDef` is no longer prepended for spirits with dispatch branches. Spirits without dispatch fall back to the existing description-based behavior.

4. **Structured `tooltipBase` fields added to spirits.js.** Each spirit with a dispatch branch gets a `tooltipBase` field declaring its base numeric value(s). The tooltip code reads from this field rather than hardcoding constants. This establishes single source of truth for base values.

5. **Effect code update DEFERRED to Phase 4.** SpiritEffects.js (and other effect-bearing locations) keep their hardcoded values. Each gets a TODO comment marking the canonical source as `tooltipBase`. F4 task (logged below as F4.36) absorbs the effect-code migration alongside other spirit-system architectural work.

**Categories covered (~40 spirits):**

- **Per-card flat point/mult boosts** (Cat 1): seasonal foundations (Pollen, Heat, Harvest, Cold, Bees, Wet, Changing Leaves, Dry); axis foundations (Clouds, Soil, Light, Dark, Wind, Rock, Movement, Stillness); T2 fusions (Bloom, Thunderstorm, Decay, Blizzard, Atmosphere, Continent, Sun, Moon); rank foundations (Shine, Oxygen, Poem, Salt); T3 cross-fusions (Yang, Yin, Space, Energy, Solstice, Equinox, Tropic, Arctic).
- **Rank utility / economy / gameplay / decay / retrigger** (Cat 2): Glory, Symbiosis, Irrigation; Bonds, Ingot, Recycling, Lucky Charm, Reward, Coupon, Replica, Collector; Catcher, Echo; Persimmon, Pear; Rainbow, Family, Wish, Dew, Applause.
- **Engines and Symbionts** (Cat 3): Cuckoo Egg; Algae, Ants, Crow, Snails, Magpie, Osprey, Wolf, Garden, Badger; Radiance, Wildlife, Banner, Plenty; Glacier, Carbon, Velocity, Fossil, Moths; Devotion, Habitat, Ceremony, Agriculture; Missing Number, Palace, Ship, Surplus, Northern Lion, Kintaro, Golden Toad, Bullseye, Lincoln, Napoleon. (All accumulator engines preserve their existing state-counter tooltip lines; only the description-bearing portion is updated.)

**Deferred from F3.5b — keep current behavior until mechanic clarified:**

- `econ_grace` — non-standard compounding (1+N pattern, not pure additive)
- `econ_piggybank` — same non-standard compounding
- `econ_print` — mechanic not yet implemented (already flagged elsewhere)
- `util_festival` — mechanic may need refactor (per-trigger vs use-per-round)
- `game_mirror` — interaction with engine spirits unclear
- `engine_memory` — interaction with engine spirits unclear
- `util_past_life` — keeping current maturity display; full tooltip rewrite deferred
- `sym_caterpillar` — stacking behavior undecided
- `sym_ducks` — effect not determined

**Tooltip wording updates that imply mechanic clarifications (NOT mechanic changes — tooltip-only):**

- `engine_lincoln` description specifies "+0.1 additive mult each time you bank without pushing." Currently implementation may not enforce the "without pushing" clause; flagged as bug to verify (F4.36 or testing pass).

**Effort:** 4-6 hours (largely mechanical but ~40 spirits to wire and `spirits.js` definitions to extend).

**Cross-references:**
- F3.5 (parent — extracted shared tooltip module; F3.5b builds on the established pattern)
- **F4.36 (newly added below)** — effect-code migration to read from `tooltipBase` fields
- F4.28 (stacking math audit) — F3.5b's "display additive even where code compounds" exposes any non-additive stacking bugs during testing
- F4.34 (water depreciation source-of-truth) — similar single-source-of-truth pattern at a different layer

### F3.6: ELEMENT_LABELS and ENH_DESC_TT alignment (Slice 4 D30, Slice 6 C59)

Replace hardcoded values with `getFireFlatPoints()`, `getMetalHeldMult()`, `getEarthInterestRate()` etc. Reflects active hexagram modifiers.

Effort: 1.5 hours.

### F3.7: SNOW_MULT/ICE_MULT badge consolidation (Slice 7 C61)

Either:
- Have GameScene import from ScoringEngine
- Or call `getWaterMult` directly to support hexagram modifiers

Recommend the second — supports hex_43/48 modifications to water depreciation.

Effort: 1 hour.

### F3.7b: Field-end scoring breakdown UI (added 2026-05-15 from Phase 2C hex_01 verification)

**Background:** During Phase 2C verification of hex_01, field-end scoring was confirmed to work mechanically (engine spirits fire, per-card scoring spirits fire, math is correct). However, the player sees a single aggregate number without a per-card breakdown.

In normal capture scoring, each capture event renders its own breakdown UI: per-card points, per-spirit contributions, mult chain, flow. Field-end scoring lacks this — players see "Field scored: 10792" without insight into how it computed.

**Concrete observation (Robert, 2026-05-15):**
- Setup: hex_01 + Wet (+10 mult per summer card), 5 summer cards on field
- Observed final: 10792 score at 1.92× flow
- To verify correctness, manually compute: 10792 / 1.92 = 5620.83; 5620.83 / 50 mult = 112.4 points
- Math is correct, but player has to do back-of-envelope math to understand the score

**Scope:**

Add a per-card breakdown to the field-end scoring path (`_scoreFieldCards`). Use the existing `_onScoringStep` callback mechanism — events already fire (e.g., `type: 'card_points'` per card). UI just needs to consume them and render a breakdown panel similar to capture scoring.

**Implementation approach:**

1. Verify all relevant scoring step events fire from `_scoreFieldCards` (engine contributions, per-card spirit hooks, final flow multiplier)
2. In GameScene, recognize field-end scoring as a distinct event type (different from capture scoring) and render its breakdown
3. Show per-card subtotals, per-spirit contributions, final mult, flow multiplication

**Cross-references:**
- F2.6 (push/bank UI clarity — related concerns)
- F3.2 (end-screen breakdown labels)
- F5.0 (capture/scoring audit will clarify which spirits SHOULD show in this breakdown)

**Effort:** 2-3 hours including verification.

### F3.7c: Wu Xing proc event surfacing — **DEFERRED 2026-05-29** to Phase 4 (added 2026-05-29 from Cluster C planning)

**Background:** Wu Xing element procs (Snow/Ice depreciation, Ember/Charcoal break, Clay/Pottery interest, Meteorite jackpot) currently fire silently during scoring. Players see effects on score/ki but no indication of WHICH proc fired or WHEN. Surfacing these events as status messages in the sidebar would aid testing and player understanding.

**Why deferred:** Recon (2026-05-29) revealed that proc-firing code is scattered across multiple files with no central location. Configuration values and getters live in HexagramEffects.js; tier multiplier tables live in ScoringEngine.js; but the actual proc-execution code (incrementing depLevel, rolling break chances, mutating card state) is genuinely scattered or hidden behind unfamiliar terminology. We searched ScoringEngine, RunManager, HexagramEffects, SpiritEffects, ConsumableEffects, Round, Capture, Deck — and could not cleanly locate the execution sites.

Wiring proc-event emit calls into 7+ scattered locations now would create churn when F4.38 consolidates Wu Xing enhancement code. The work would need to be moved/reconsolidated, and risks orphan calls in places that no longer fire procs.

This is the same lesson from F3.5b (tooltip work ahead of architectural consolidation creates drift). Better to do the consolidation once and add UI feedback in a single coherent location.

**Pre-condition:**
- F4.38 (Wu Xing enhancement effect code consolidation) — when proc code lives in a central location with structured event emission, F3.7c becomes a trivial UI consumer

**Scope (post-consolidation):**

UI design (already decided 2026-05-29):
- **Location:** Repurpose existing `_statusText` in Box 2 (Activity context) of the GameScene sidebar. Single-message slot; clears on each new message.
- **Format:** "Jan Crane: Snow depreciated" style — short, with month-abbreviated card name + event type.
- **Events to surface:** Snow depreciation, Ice depreciation, Ember break, Charcoal break, Clay interest proc, Pottery interest proc, Meteorite jackpot. Wood (Leaf/Silk) procs NOT surfaced — already visually apparent.
- **Persistence:** Status text overwrites on each new message (matching existing pattern; competes with action-feedback messages — last-write-wins is acceptable for testing context).

**Implementation (post-F4.38):**

After F4.38 consolidates enhancement effects into a central location with event emission, F3.7c just adds:
1. A subscriber in GameScene that listens for proc events
2. Format the event into a short status message
3. Call existing `_setStatus(msg)`

Expected effort post-F4.38: 1-2 hours (mostly trivial once events emit cleanly).

**Cross-references:**
- F4.38 (pre-condition — Wu Xing consolidation)
- F4.31 (Snow/Ice and Clay/Pottery proc timing — absorbed into F4.38)
- F3.7b (sibling field-end scoring breakdown)
- F3.11 (in-flight scoring animation — different concern: F3.7c surfaces "what events fired"; F3.11 surfaces "what contributed to score")



After F2.2.b/e (description corrections), this scene automatically reads the new descriptions. Manual verification pass.

Effort: 0.5 hours.

### F3.9: Round-end ki decomposition + breakdown UI (expanded scope 2026-05-07)

**Original scope (UI-only):** Show round-end ki breakdown in the post-round summary panel — base + cards + style + earth + per-yaku + per-push + surplus + mid-round components. Visual display only.

**Expanded scope (added 2026-05-07 during F1.7 verification):** During F1.7 verification, observed that mid-round ki events log with meaningful reasons (`stamp_yellow_capture`, `recycling_overflow`, etc.) but round-end ki is a lump-sum `[KI] +242 (round_end_reward)` aggregating multiple components silently. The cleaner fix: decompose ki crediting at the addKi level rather than just at display time. Each component fires its own addKi call with its own reason.

**Three-layer task:**

1. **Data layer:** Refactor `run.calculateKiReward(result)` to expose component breakdown. Either return a structured object `{flat, heldInHand, interest, styleCombos, discards, stamps, zodiacs}` instead of a sum, OR keep the sum return and add a parallel `getRewardBreakdown(result)` method.

2. **Logging layer (GameScene.js, ~line 2823 and 2859):** Replace `run.addKi(kiEarned, 'round_end_reward')` with multiple per-component addKi calls:
   ```js
   const c = run.getKiRewardBreakdown(result);
   if (c.flat > 0)         run.addKi(c.flat, 'round_end_base');
   if (c.heldInHand > 0)   run.addKi(c.heldInHand, 'round_end_held_in_hand');
   if (c.interest > 0)     run.addKi(c.interest, 'round_end_interest');  // Piggybank
   if (c.earthKi > 0)      run.addKi(c.earthKi, 'round_end_earth');
   // (style combos, stamps, zodiacs already fire mid-round with their own reasons; not duplicated here)
   ```
   
   Result: GameplayLogger shows distinct component lines instead of one lump sum.

3. **UI layer:** Round-end summary display shows the breakdown. Already partially done via the existing `kiLabel` construction (`+${cardsInHand} cards +${earthKi} earth`); needs additional components added (interest, etc.).

**Component categories to track:**
- Flat reward (base round clearance)
- Cards in hand (Ingot/Grace bonus per held card)
- Interest (Piggybank — % of current ki at round end)
- Style combos (already mid-round via `'style combo: ${name}'`)
- Discards (mid-round Recycling — already labeled)
- Stamps (mid-round per-stamp triggers — already labeled)
- Zodiacs (mid-round per-zodiac use — already labeled)
- Earth ki bonus (round-end aggregate from Earth-enhanced cards)
- Yaku bonuses (if any flat ki tied to yaku achievement)
- Push success bonuses (Reward spirit already mid-round, but if any flat bonus exists)

**Verification:**
- Round-end log shows multiple `[KI] +N` lines with distinct reasons instead of one `(round_end_reward)` lump
- Summary panel shows the same breakdown for the player

**Effort:** 2-3 hours (expanded from original 1h — adds data-layer refactor and logging-layer split alongside the UI work).

**Cross-references:**
- F1.7 (semantic addKi reasons) — provides the foundation. F3.9 extends F1.7's logging granularity to round-end events.
- D0.18-3 (round-end log breakdown) — superseded by F1.7 + F3.9 combo per Phase 0 closure decision.

### F3.10: Misc UI cleanups — **🟢 EFFECTIVELY COMPLETE 2026-05-29** (1 of 3 items shipped; 2 closed as no-op)

**Original scope (three items from earlier audit slices):**
- Sell button for non-zodiacs (Slice 6 D40, post D0.x decision)
- Logger entry hexagram tracking surface in transcript
- HexCollection's "Begin Run" button decision (Slice 6 C53, post D0.x)

**Closure status (2026-05-29):**

1. **Sell button for non-zodiacs (Item 1):** ✅ **SHIPPED.** Recon revealed `sellConsumable` in RunManager used `getZodiacDef` only, returning 0 refund for non-zodiac consumables (elements, chakras, stamps). Fix dispatches by id prefix to the appropriate definition source, computing `floor(cost/2)` refund for all non-negative consumable types.

2. **Logger hexagram tracking (Item 2):** ✅ **NO-OP — already complete.** Recon confirmed `logHexagramAssignment` is defined in GameplayLogger.js (logs hex's englishName, chineseCharacter, chineseName, id, and description) AND is called from `RunManager.setHexagram` at @15914. Transcripts include hex info as designed. No work needed.

3. **HexCollection "Begin Run" button (Item 3):** ⏸️ **DROPPED — no specific concern identified.** Recon of HexagramCollectionScene.js showed the Begin Run button works as designed (resets run, sets selected hex, starts GameScene). The "post D0.x decision" reference doesn't appear in DECISIONS_LOG.md. Without a documented concern, no change. If a specific UX issue surfaces during playtesting, it can be added as a new task at that point.

**Effort:** 1 hour → ~0.5 hours actual (one fix shipped, two closed without work).

### F3.11: In-flight scoring animation — surface contributions hidden in totals (added during Phase 0 playtest; split into 11a/11b 2026-05-29)

Discovered during Phase 0 playtesting and confirmed during F3.11 recon (2026-05-29): several scoring contributions affect the final score correctly but never animate during the per-card scoring sequence in GameScene. Players see capture totals but don't see WHICH contributions produced them.

**Recon findings (2026-05-29):**

The scoring event system in `GameRoundManager.js` emits 11 event types: `capture_start, card_points, capture_complete, field_score, hexagram_card, spirit_effect, engine_state_update, retrigger, engine_effect, capture, glory_draw`. GameScene's `_animateScoringEvent` handles 7 of them; **4 are emitted but unhandled** (`retrigger`, `capture`, `field_score`, `glory_draw`).

Additionally, in the per-card scoring loop (around line 19576 of GameRoundManager.js), several contribution types fold their effects directly into `cardPts` or `mult` BEFORE the `card_points` event fires. This means the player sees the running totals update but no per-source attribution:
- Fire/Ember flat points (`cardPts += getFireFlatPoints(...)`)
- Water/Snow/Ice mult (`mult *= getWaterMult(...)`)
- Wood/Leaf/Silk mult (`mult *= getWoodScoringMult(...)`)
- Gold edition (`cardPts += 20`)
- Crystal edition (`mult += 5`)
- Ghost edition (`mult *= 1.5`)
- Iron/Meteorite held-mult (at capture level, `mult *= getMetalHeldMult(...)`)

The logger DOES capture these via `_cb.contributions.push(...)` for the console transcript, but no equivalent step event fires for the animation.

**Confirmed via Robert's manual testing 2026-05-29:** The following don't surface in left-panel scoring UI (do not animate per-source increments):
- Water (Snow/Ice) enhancement mult
- Iron/Meteorite held-in-hand mult
- White stamp retrigger (and presumably Gray)
- Retrigger spirits (Rainbow, Family, Wish, Dew, Applause, Echo)
- Fire/Ember flat points (corrected post-test)

These DO surface (per-source animation visible):
- Base card points
- Gold, Crystal, Ghost editions (Gold via cardPts text; Crystal/Ghost via mult bump — though attribution missing)
- Per-card spirit triggers (`spirit_effect` event handled)
- Engine spirit contributions (`engine_effect` event handled)
- Engine state updates (`engine_state_update` event handled)

### F3.11a: Handle emitted-but-unhandled event types (added 2026-05-29 from F3.11 split)

**Scope:** Add `_animateScoringEvent` handler cases for the 4 unhandled event types currently emitted by `GameRoundManager.js`.

Per recon (2026-05-29), the event payloads are:
- `{ type: 'retrigger', card, cardPts, points, mult, triggerIndex }` — emitted when stamps or retrigger spirits cause a card to score again
- `{ type: 'capture', cards, capturePoints: points, mult, flow, captureScore, runningTotal }` — capture-level summary including held-in-hand effects
- `{ type: 'field_score', cards: fieldCards, capturePoints: points, mult, flow, captureScore, runningTotal }` — field-end scoring (hex_01 territory; may overlap with F3.7b)
- `{ type: 'glory_draw', count }` — Glory spirit drew cards on bright capture

**Implementation:**
1. **`retrigger` handler:** Show a per-card retrigger indicator. Visual cue: ↻ symbol + "Retrigger ${triggerIndex}" floating text near the card. Update Points/Mult to event's cumulative values.
2. **`capture` handler:** Animate the held-in-hand effects portion (Iron/Meteorite mult). The event itself wraps the entire capture, so this might function as a capture summary stage that animates held-effects before `capture_complete` runs.
3. **`field_score` handler:** Field-end scoring — may be left to F3.7b which is more comprehensive. F3.11a could add a placeholder log or simple total update.
4. **`glory_draw` handler:** Brief floating text "Glory: +${count} draws" near the spirit, or near the deck/hand area. Pulse the Glory spirit icon if visible.

**Why this is safe to ship now:** Pure additions to `_animateScoringEvent` switch statement. No changes to emission sites. No coupling with Wu Xing consolidation. Low refactor risk.

**Effort:** 1.5-2 hours.

### F3.11b: Per-source contribution emission for enhancements + editions — **DEFERRED 2026-05-29** to Phase 4 (after F4.38)

**Scope:** Emit per-source step events in `GameRoundManager.js` so each Fire/Water/Wood/Gold/Crystal/Ghost/Metal contribution surfaces as its own animation, with attribution text.

**The architectural opportunity:** The code already pushes contributions to `_cb.contributions[]` for logger consumption (e.g., `_cb.contributions.push({ source: '${enh.tier} Water (dep ${depLevel})', multiplyMult: _wMult })`). F3.11b can piggyback on these — at each `.push` site, also emit a step event with the same data. The data assembly is already done.

**Why deferred:** Wu Xing enhancement effect code is currently scattered across `GameRoundManager.js` (in the per-card scoring loop) but the consolidation in F4.38 will likely relocate this logic. Adding per-source emissions now risks orphaning them when F4.38 lands. Defer F3.11b to ride alongside F4.38's consolidation: when enhancement effects move to a central location, emit step events from the consolidated locations.

**Pre-condition:** F4.38 (Wu Xing enhancement effect code consolidation) complete.

**Implementation (post-F4.38):**
1. At each `_cb.contributions.push(...)` site in the (now-consolidated) enhancement effect code, also emit a step event with the same data structure
2. Add `_animateScoringEvent` handler for the new event type (e.g., `enhancement_contribution`) that renders the floating text with source attribution

**Effort post-F4.38:** 1.5-2 hours.

**Cross-references:**
- F3.11a (sibling — ships the no-architectural-risk portion now)
- F4.38 (pre-condition — Wu Xing consolidation enables clean emission points)
- F3.7c (analogous deferral pattern — UI feedback deferred until architecture supports it)
- F3.7b (overlaps with `field_score` event handling)

### F3.12: Card edition visibility (added during Phase 0 playtest 2026-05-06; scope minimalized 2026-05-29)

Card editions (Gold, Crystal, Ghost) currently have no visualization in the GameScene UI:
- Card tooltips don't include edition information
- No visual indicator on the card shows its edition

The data model exists (`card.edition` is set to `'gold'` / `'crystal'` / `'ghost'`). Heart Chakra and Golden Toad both apply editions successfully — they were tested during Phases 0-2. The display layer just hasn't been wired up. Recon (2026-05-29) confirmed "edition" appears in RunManager, SpiritEffects, consumables, spirits, and ShrineScene — but 0 hits in GameScene.js. The gap is purely cosmetic.

**Scope (minimalized per Robert 2026-05-29):** Testing/visibility aid. Phase 5 will deliver a comprehensive visual overhaul of card enhancements (chakra editions, wu xing enhancements, stamps, etc.). F3.12 makes editions visible enough during development for testing.

**Implementation:**
- **Top-right corner badge** for each edition (top-left is occupied by `_makeRibbonStampDot`):
  - Gold edition → gold circle
  - Crystal edition → light blue diamond
  - Ghost edition → lavender triangle
- **Tooltip line appended** showing edition + its mechanical bonus

**Edition effect summaries (per consumables.js descriptions):**
- Gold: +20 base points
- Crystal: +5 additive mult
- Ghost: ×1.5 multiplicative mult

**Out of scope (deferred to Phase 5):**
- Final visual treatment (custom art, animations, borders, etc.)
- Coordination with stamps and other modifiers
- Deck-list / capture-summary edition visibility (Phase 5 visual overhaul pass)

**Effort:** ~1-2 hours.

### F3.13: Negative spirit roster rendering correctness — **✅ EFFECTIVELY COMPLETE 2026-06-01** (silently fixed during F4.13 prep work / architectural refactor)

**Original problem (2026-05-07):** The roster UI bundled spirit objects by id without correctly accounting for the `isNegative` boundary. When multiple spirits shared an id and some were negative while others were regular, the UI did not render them as distinct entries — instead, it showed one entry per "negative group" and bundled any leftover negative into the regular display.

**Concrete bug pattern observed (2026-05-07):**

Data state (verified via console):
- 2 negative Pollens at stackCount=3 each (`isNegative: true`)
- 1 regular Pollen at stackCount=1 (`isNegative: false`)

UI displayed:
- 1 purple entry "x3" (one of the negatives, rendered correctly)
- 1 blue entry "x3" (regular's color), which when clicked expanded to 4 items with tooltip "Stacked x4" — bundling the OTHER negative (3) + the regular (1) into a single visual entry

**Closure status (2026-06-01):** F3.13 recon found the bug no longer reproduces. The fix landed silently during other architectural work:

1. **`_acquireSpiritStack` correctly filters negatives** when finding existing-stack candidates: `this._allSpirits.find(s => s.id === spiritDef.id && !s.isNegative)`. The `!s.isNegative` filter prevents new acquisitions from accidentally merging into a negative's stack count.

2. **`_addPastLifeCopy` short-circuits for negative targets:** `if (target.isNegative) { ... push parallel entry ... return; }`. Negatives never participate in stacking.

3. **`_renderSpiritColumn` iterates `run.allSpirits` one spirit at a time** with no grouping. Each spirit object renders as its own card with negative-aware visual treatment (`isNeg ? (spirit.powerLevel ?? 1) : (spirit.stackCount ?? 1)` for badge display).

4. **F4.13 architecture is partially-in-place** — the `powerLevel: N` field on negatives is already used in `_addPastLifeCopy`, `_acquireSpiritStack`'s transcendence path, and render code. This simplification eliminates the bug's root cause: there's no longer any reason to bundle negatives into a regular's stackCount.

**Verification (2026-06-01, Robert):** Obtained 2 transcended Clouds + purchased another Clouds from the shop. All three render as distinct entries in the spirit fan as expected.

**Effort:** 0 hours actual (closed as no-op).

**Cross-references:**
- F4.13 (architectural): the partial implementation of explicit `powerLevel` on negatives is what enabled this silent fix. F4.13's full scope (formalize `powerLevel` everywhere, remove residual `stackCount`-for-negative cruft) remains open.
- D0.24 (Past Life target selection): negative visibility for Past Life targeting is unblocked.

### F3.14: Past Life activation visual indicator — **⏸️ DEFERRED 2026-06-01** to Phase 5 polish (added 2026-05-07 during D0.24 design)

**Scope:** Past Life's activation status is shown via tooltip line "Activated: M/N elements (3-round hold)" per D0.24. For better at-a-glance information, a visual cue on the Past Life card itself (e.g., border color shift, glow effect, or "ready" badge overlay) would let players see activation status without needing to hover.

**Design intent:** Mirrors the Osprey tooltip pattern of "0/3 used" status, but elevated to the visual layer for spirits with strategically time-sensitive activation states.

**Why deferred:** Outside Phase 0/1 scope. The tooltip line introduced in D0.24 provides the strategic information. Visual enhancement is polish, not correctness.

**Closure (2026-06-01, Robert):** Deferred. The tooltip line from D0.24 already conveys Past Life maturity status — visual indicator is genuine polish, not correctness. Revisit during Phase 5 if visual feedback becomes valuable during early playtest.

**Effort:** ~2-3 hours (visual design choice + animation/state logic) — when revisited.

**Cross-references:**
- D0.24 (Past Life redesign): activation logic and tooltip status added there.
- General principle could be extended: any spirit with time-sensitive activation could use a similar visual cue.
- Phase 5 polish bucket.

### F3.15: F2.3.i UI polish (added 2026-05-07 from F2.3.i bugfix sweep playtest)

After F2.3.i bugfix sweep resolved the critical correctness issues, several UI-polish items remain. They don't block play but degrade UX:

1. **Cancel button for card-target mode** — 🔧 **STILL PENDING.** Currently ESC is the only way to abort an active card-target consumable use. ESC is unprecedented in the game's UI vocabulary. Add a visible Cancel button to all target modes (`_cardTargetMode`, `_spiritTargetMode`).

2. **Card edition visual indicator missing** — ✅ **SHIPPED IN F3.12** (2026-05-29). Gold/Crystal/Ghost badges render in top-right corner of cards; tooltip line shows edition + bonus.

3. **Earth element enhancement icon missing on card sprite** — ✅ **NO-OP (2026-06-01).** Per Robert: Earth icon is not missing; original report was an oversight.

4. **Crown Chakra card image not updating** — 🔧 **STILL PENDING.** After Crown Chakra copies one card's identity onto another, the target card behaves as the new identity (scoring, type, name) but the sprite still shows the original card image. Card sprite should refresh to match the new identity. **Note:** this is a correctness issue (visual identity mismatches mechanical identity), not just polish.

5. **White stamp retrigger score reflected in log but not score panel UI** — ✅ **Resolved-by-deferral to F2.10.** The compound retrigger model in F2.10 means there's no longer a separate scoring event to surface — the retrigger contribution becomes part of the primary event's totals, which the UI already displays correctly.

6. **Throat Chakra deck count clarity** — ✅ **RESOLVED (2026-06-01).** Per Robert: this was addressed during other Phase 2/3 work.

7. **Stamp icons all render as white** — ✅ **FIXED IN PHASE 2** (per Robert 2026-06-01). All 9 stamp colors now render correctly in inventory, card sprite indicators, and status/tooltip text.

8. **Tiger zodiac activation feedback** — ✅ **NO-OP (2026-06-01).** Per Robert: current state is acceptable; no further work needed.

**Active items remaining (2026-06-01):** Only items #1 (Cancel button) and #4 (Crown Chakra sprite refresh).

**Effort:** ~1-2 hours for the two remaining items. Originally 4-6h for all 8.

**Cross-references:**
- F3.12 (Card edition visibility): item #2 shipped here
- F2.10 (stamp mixing): items #5 and #7 resolved as side effects
- F2.3.i (parent): carry-over architecture this polishes

### F3.16: Scoring log overhaul — **⏸️ DEFERRED 2026-06-01** to Phase 4 (added 2026-05-08 during F2.10b verification)

**Background:** The current scoring log in `GameplayLogger.js` has accumulated structural cruft from multiple incremental additions:

- `logCaptureScoring` produces the per-card breakdown structure
- `logRetriggerScoring` exists but is now orphaned (it was called only by the deleted F2.10b stamp block; the new Phase 1.5 retriggers don't surface in the per-card breakdown at all)
- `_cb.contributions` vs `_cb.sources` naming inconsistency across the breakdown structure
- Scoring step events emit via `_onScoringStep` and go to TWO consumers (the `_scoringQueue` for animation, the logger for breakdown rendering)
- Some telemetry events emit but have no consumers (e.g., `engine_state_update`)
- F2.10b surfaced that retrigger contributions aren't represented in the per-card breakdown structure

**Design goal:** Restructure the scoring log to be **maximally readable for human playtest review AND maximally analyzable for automated playtest data collection across runs.**

Key design questions to resolve in the overhaul:

1. **Data structure for per-card breakdown:** flat list of contributions, or nested (primary + retriggers array)? Current is flat; for analytics, nested with explicit retrigger entries is cleaner.

2. **Telemetry vs. log output:** should telemetry events (scoring steps for animation) share structure with log-output events (breakdown), or remain separate channels? Current architecture has them as one channel with two consumers.

3. **Per-event vs. per-capture vs. per-round granularity:** what's the unit of analysis? The current log mixes all three.

4. **Schema versioning:** if we're going to analyze logs at scale, the data structure should be versioned so format changes don't break old playtest analyses.

5. **Field naming consistency:** standardize on `contributions` vs `sources`, `addPoints` vs `pts`, etc. across all log entries.

**Approach:** Schedule a dedicated session for this overhaul AFTER Phase 2 completes (so the math is stable) but BEFORE meaningful playtest data collection begins. Sequence:

1. Audit current logger structure: list all log entry types, their fields, their consumers
2. Design new schema (probably JSON-first, with human-readable rendering as a separate concern)
3. Migrate all emitters to the new schema
4. Migrate the consumer (currently just human-readable console output; future analytics scripts can consume the JSON directly)
5. Deprecate the orphaned methods (`logRetriggerScoring` etc.)

**Effort:** 4-6 hours (design + migration + log emitter audits + testing).

**Why deferred (2026-06-01):** F3.16 redesigns log schema, including breakdown structure (`_cb.contributions`), per-card retrigger representation, and field naming. But:

- **F4.20 (spirit logic centralization)** will move spirit effect logic, changing what spirits emit to the log
- **F4.38 (Wu Xing enhancement consolidation)** will consolidate enhancement contribution emissions
- **F3.11b (deferred sibling)** will add per-source contribution emissions

Redesigning log schema NOW means redoing it after F4.20/F4.38 land. Same pattern as F3.7c and F3.11b — UI/logging work that benefits from waiting for architectural consolidation.

The original plan note ("Schedule a dedicated session for this overhaul AFTER Phase 2 completes but BEFORE meaningful playtest data collection begins") still applies — meaningful playtest data collection is itself a Phase 4/5 activity, so the timing window remains open.

**Pre-conditions:**
- F4.20 (spirit logic centralization)
- F4.38 (Wu Xing enhancement consolidation)
- F3.11b (per-source contribution emissions) ships alongside this work

**Cross-references:**
- F2.10b (2026-05-08): surfaced the retrigger-not-in-breakdown gap; deferred the inline fix in favor of doing it properly during the overhaul
- F4.1 (dead method removal): orphaned `logRetriggerScoring` etc. would be cleaned up here naturally
- F3.11 (in-flight scoring animation): may inform what telemetry events the animation channel actually needs
- Future Phase 5+ playtest data collection: depends on this for analyzable output

### F3.17: Retrigger surfacing in current log — **⏸️ DEFERRED 2026-06-01** to Phase 4 (per F3.16; original plan recommendation honored)

**Background:** F2.10b shipped correct retrigger math but the contributions don't appear in the per-card breakdown (since the deleted stamp block was the only consumer of `logRetriggerScoring`). Math is correct, just less self-documenting.

**Closure (2026-06-01):** Per the original plan's recommendation ("Defer to F3.16. The math is correct... Doing the interim fix risks throwing away work when F3.16 redesigns the structure"), F3.17 ships alongside F3.16 in Phase 4. No interim fix.

**Effort:** 0h interim (deferred). Subsumed by F3.16's schema redesign.

**Cross-references:**
- F3.16 (parent — log schema redesign)
- F2.10b (correct math; visibility gap)

### F3.18: Card tooltip enrichment — **⏸️ DEFERRED 2026-06-01** to Phase 4 (added 2026-05-08 during F2.10a planning)

**Background:** Card tooltips currently don't surface a card's full state. A card may have:
- A Wu Xing enhancement (element + tier, plus depreciation level for Water)
- A ribbon stamp (color + effect)
- An edition (Gold / Crystal / Ghost)
- Card-specific mutations (promotion progress, Path/Tree conversion, Throat duplicate marker)

Visually, these are partially represented:
- Wu Xing enhancement shows as a colored badge (top-right)
- Ribbon stamp shows as a colored dot (top-left)
- Edition shows as a border treatment
- Conversion shows as a corner badge (bottom-right)

But the tooltip doesn't enumerate which of these are present, what they do, or their precise values. A player must memorize the visual encodings to read a card's state.

**Design goal:** Hovering over a card shows a comprehensive tooltip that lists every modifier and its effect description. This is the canonical "what's on this card" interface.

**Tooltip structure (target):**

```
Crane and Rising Sun
Bright · Month 1 (January)
Base: 20 pts

Enhancements:
  • Wu Xing: Base Fire (+10 pts on capture)
  • Stamp: Orange Stamp (when captured, draw +1 card and gain +3 ki)
  • Edition: Gold (+20 pts on capture)
```

**Implementation scope:**

1. **Tooltip layout extension:** Existing card tooltips show name + month + type. Extend to include modifier sections.
2. **Stamp description from `getStampDef`:** Already has `name` and `description` fields. Just pipe them through.
3. **Wu Xing description from element/tier:** Already exists as data; needs tooltip integration.
4. **Edition description:** Three editions with fixed effects (Gold +20 pts, Crystal +5 mult, Ghost ×1.5 mult). Inline definitions.
5. **Mutation markers:** Throat duplicates, Path/Tree conversions, promotion progress — surface as separate lines.

**Sequencing:** Originally planned as Phase 3 UI/UX work. Pairs naturally with F3.12 (card edition visibility — already shipped) and the broader tooltip ecosystem.

**Effort:** 2-3 hours when revisited.

**Why deferred (2026-06-01):** Tooltip code is currently scattered across the codebase:
- F3.12 added Gold/Crystal/Ghost edition lines to `_showCardTooltip`
- F3.5b added stack-aware dispatch branches for ~40 spirits via `tooltipBase` fields and contribution functions
- Existing `_showCardTooltip` handles Wu Xing enhancement display (Snow/Ice/Ember/etc.)
- Stamp tooltip data exists in `getStampDef` but isn't currently piped through

Per Robert's judgment (2026-06-01): the right approach is to consolidate all tooltip code into a single source of truth alongside the architectural work in Phase 4, rather than continuing to patch tooltips piecemeal. Doing F3.18 as a single coordinated sweep — after F4.20 (spirit logic centralization), F4.36 (effect-code migration), F4.37 (post-consolidation tooltip recomb) — produces a cleaner result than incremental work now.

This mirrors the F3.5b lesson: tooltip drift is structural, not symptomatic. The cure is structural consolidation, done once.

**Pre-conditions:**
- F4.20 (spirit logic centralization)
- F4.36 (effect-code migration to read from tooltipBase)
- F4.37 (post-consolidation tooltip recomb) — F3.18 may be absorbed into F4.37's scope

**Cross-references:**
- F2.10a (stamp mixing): the mixing system requires players to read current stamp state; tooltips are the canonical answer
- F3.12 (card edition visibility — shipped 2026-05-29): edition tooltip lines already in place
- F3.5b (stack-aggregated spirit tooltips): established the dispatch pattern this consolidation will extend
- F4.37 (post-consolidation tooltip recomb): natural sibling — F3.18 may merge into F4.37 during planning
- F1.x card mutation tracking (already-implemented features): tooltip surfaces the existing data

### F3.19: Disabled yaku display polish — **⏸️ DEFERRED 2026-06-01** to Phase 5 polish (added 2026-05-15 from Phase 2C hex_30 verification)

**Background:** During Phase 2C hex_30 Lí verification, observed that the disabled yaku's threshold renders as "(Infinity)" in the yaku reference UI. This is functionally correct (threshold = Infinity means unreachable) but reads awkwardly to players who don't understand the math abstraction.

**Closure (2026-06-01, Robert):** The "Infinity" display is functionally informative and not a correctness issue. Polish deferred to Phase 5 alongside broader UI cleanup. If a more readable indicator becomes valuable post-Phase 4 (e.g., during early playtest with new players), revisit then.

**Original scope (preserved for Phase 5 reference):**

Replace "(Infinity)" display with a more readable indicator for disabled-via-hexagram yaku:

Options:
- **"Disabled"** — clear and direct
- **"Forbidden"** — thematic (fits Lí trigram's "restriction" framing)
- **"—"** / **"⊘"** — symbolic, compact
- **Hide the threshold entirely** and show a "BLOCKED" badge or strikethrough on the yaku name

Recommended: **strikethrough on yaku name + "Forbidden" tooltip on hover** — visually distinctive at a glance, with details on demand.

**Effort:** 1 hour (when revisited).

**Cross-references:**
- Phase 2C hex_30 verification (origin)
- F3.3 (Yaku Reference uses dynamic thresholds — same UI area)
- Phase 5 polish bucket

### F3.20: Hex_29 yaku-disabled UX polish (added 2026-05-15 from Phase 2C hex_29 verification)

**Background:** During Phase 2C hex_29 verification, the engine's existing `continuePlay()` flow was discovered to be intentional architecture. When `disablesYaku()` is active, the engine puts the player into `yaku_decision` phase every turn, offering bank/continue-playing as a recurring decision. This gives hex_29 a coherent banking dynamic in the absence of yaku.

The mechanic works correctly. The UX has rough edges that need Phase 3 polish.

**Issues identified:**

1. **"Continue Playing" naming is confusing.** Under hex_29, the prompt fires every turn — the button just dismisses the modal and continues normal play. "Continue Playing" reads as redundant ("Continue... playing? As opposed to what?"). Clearer options:
   - "Continue" or "Keep Playing"
   - "Skip" or "Pass"
   - "Don't Bank" (explicit about what's being declined)
   
2. **No player education on the bank-every-turn mechanic.** First time players see the prompt under hex_29, they may think they triggered a yaku or made an error. A brief explanatory tooltip or first-time-only popup would help.

3. **Possible modal vs persistent button consideration.** Showing a modal every turn is intrusive. A persistent "Bank" button (always visible when bank is available) might be cleaner. This is a larger UX question potentially for F5.0a or future polish.

4. **Log noise** (lower priority): YAKU detection still runs and logs `YAKU: Hikari (2/2)` style entries even though yaku is disabled. Could gate logger output on `_disablesYaku` to reduce confusion during debugging. Not user-visible.

**Recommended scope:**

- Phase 3 polish: rename button (item 1)
- Phase 3 polish: explanatory tooltip (item 2)
- Defer to F5.0a: modal vs persistent UI question (item 3)
- Defer to Phase 3 / Phase 5 cleanup: log noise (item 4)

**Effort:** 1-2 hours for items 1+2.

**Cross-references:**
- Phase 2C hex_29 verification (origin)
- F5.0a (double-trigram redesign — broader UX considerations)
- F3.x (general UI polish bucket)

### F3.21: Deck-view overlay redesign — **✅ EFFECTIVELY COMPLETE 2026-06-01** / remaining scope deferred to Phase 5 (added 2026-05-15 from F2.8 verification)

**Original background:** F2.8 shipped a functional deck-view overlay during Phase 2D. The initial implementation used the same card-grid pattern as capture/discard overlays, which proved inadequate for the 48-card owned set. Quick fix shrunk cards to fit (OV_SCALE 0.5, ROW_MAX 12), but the result was incomplete UX.

**Closure (2026-06-01, Robert):** Core functionality is in place — players can see all cards in deck by clicking the deck. Per Robert: any further work (multi-tab views, sort/filter, smooth animations, composition summary) feels like Phase 5 polish rather than Phase 3 must-have.

**Original scope (preserved for Phase 5 reference):**

**Current state (post-F2.8 fix):**
- All 48 cards fit within 800×500 modal
- Cards are functional but small
- Type grouping (Brights/Animals/Ribbons/Plains) with month-sort within each
- Out-of-play cards (capture/discard) shown grayed
- No tooltip per card
- No filtering, no alternative views

**Scope for redesign:**

1. **Visual treatment:**
   - Consider larger cards with horizontal fanning per row (like spirit slots) for plains
   - OR multi-tab/page view (Brights tab, Animals tab, etc.) with full-size cards
   - OR resize the modal itself to a larger format that gives cards more breathing room
   - Aesthetic consistency with the rest of the game's visual language

2. **Card state surfacing:**
   - Per-card tooltip on hover (depends on F3.18 card tooltip enrichment for reusable tooltip infrastructure)
   - Enhancement, stamp, edition all visually clear at MVP card size
   - Visual indicator for specific location (Hand vs Field vs Captured vs Banked vs Discarded) — currently only "in play vs out of play" via single tint
   - Possibly a small badge or icon per card showing its location

3. **Sort and filter options:**
   - Toggle: "All cards" / "Draw pile only"
   - Toggle: Sort by month / Sort by enhancement / Sort by stamp
   - Toggle: Group by type / Group by month
   - Filter by enhancement element (Wood/Water/Fire/Earth/Metal)

4. **Interaction polish:**
   - Smooth open/close animations
   - Click outside to close (currently must click Close button or click deck sprite again)
   - Keyboard shortcut to open/close

5. **Composition summary:**
   - Header showing useful aggregate info (e.g., "5 Brights, 9 Animals, 10 Ribbons, 24 Plains" or "12 cards enhanced, 3 with editions")
   - Average base points, total deck value, etc.

**Effort estimate:** 4-6 hours including design exploration. Could pair with F3.18 (card tooltip enrichment) since tooltips are part of the polish.

**Pre-conditions:**
- F3.15 (UI polish — edition borders, Earth icons) provides the card sprite system polish that flows into the overlay automatically
- F3.18 (card tooltip enrichment) provides reusable tooltip infrastructure

**Cross-references:**
- F2.8 (parent feature)
- F3.15 (card sprite polish — feeds into overlay visual quality)
- F3.18 (card tooltip enrichment — needed for per-card tooltip)
- F2.3.j (Throat Chakra duplicate visibility — resolved by F2.8, refined here)

**Phase 3 total: ~34-48 hours (was 30-42; +4-6h for F3.21).**

### F3.22: Break-event UI opacity (added 2026-05-26 from Phase 2 testing bug B-9)

**Background:** During PostD1-6 testing of the Carbon Ember/Charcoal break event, UI opacity behaves unexpectedly. The visual layer doesn't properly transition during/after the break event, leaving partial-transparency state visible.

**Severity:** Low (visual only; gameplay correctness unaffected)

**Scope:**
- Reproduce the visual issue during a Carbon break event
- Identify which UI element loses correct opacity state (likely a tween or transition lifecycle issue)
- Fix the opacity restoration after the break animation completes

**Effort:** 0.5-1 hour.

**Cross-references:**
- B-9 in PHASE_2_TESTING.md bug log
- PostD1-6 test

### F3.23: Leaf-spawned field slot rendering (added 2026-05-26 from Phase 2 testing bug B-11)

**Background:** Cards played with Leaf enhancement that create their own field slot are invisible on the field, despite functioning correctly mechanically (captures work, scoring works).

**Severity:** Medium (gameplay correctness OK; UI failure causes serious confusion — player can't see their own field state accurately)

**Scope:**
- Find the rendering path for field slots in GameScene
- Verify it handles dynamically-created slots from Leaf enhancement
- Likely a missing render call or sprite-creation step when a new slot spawns mid-play
- May share infrastructure with F2.7c (UI re-render after consumable use)

**Effort:** 1-2 hours.

**Cross-references:**
- B-11 in PHASE_2_TESTING.md bug log
- PostD2-3 test
- F2.7c (mid-round UI re-render) — likely shares infrastructure

**Phase 3 total updated: ~36-51 hours (was 34-48; +2-3h for F3.22 + F3.23).**

### F3.24: Cross-scene interaction consistency — ShrineScene ↔ GameScene (added 2026-05-29 from F3.10 expansion; scope revised same day)

**Background:** During F3.10 (misc UI cleanups), three inconsistencies surfaced where ShrineScene treats spirits/consumables as view-only displays while GameScene treats them as fully interactive items. The player effectively loses functionality when entering the shrine, only to regain it on returning to the game.

**Three identified inconsistencies:**

1. **Sell consumables in ShrineScene:** Players cannot sell unwanted consumables until returning to GameScene. If a player buys a consumable they don't need, they're stuck with it taking up an inventory slot until the next round starts.

2. **Drag/reorder spirits in ShrineScene:** GameScene allows dragging spirits to reorder them (relevant for some spirit effects that depend on slot order, like Mirror which copies the spirit to its left). ShrineScene has no such interaction.

3. **Truncated spirit tooltips in ShrineScene:** GameScene shows full tooltip information including per-element accumulator state (totalPlayed, summonCount, etc.), live mult contributions, and so on. ShrineScene shows a truncated version, obscuring information that's relevant to purchase decisions (e.g., "should I add another stack to this Wildlife? what's it at now?").

**Scope (revised 2026-05-29):**

Per recon (2026-05-29) and Robert's decision: pursue **Approach 3 — targeted shared helpers, deferred full refactor.**

Recon revealed that GameScene and ShrineScene have substantial byte-for-byte identical rendering code (rotated SPIRITS labels, legendary spirit fan, etc.). The full unification of scene rendering is a substantial architectural task (8-15h) deserving its own scope. F3.24 takes targeted fixes for the player-visible gaps and defers the full unification to Phase 4.

**F3.24 scope (revised):**
1. **Extract spirit tooltip builder into shared module:** GameScene's `_getSpiritContrib` (and any tooltip-line helpers) → shared module callable from both scenes. ShrineScene replaces its truncated tooltip path with the shared call. Eliminates the truncation gap with minimal new code and establishes the shared-helper pattern for future unification.
2. **Add consumable sell button to ShrineScene:** Duplicate the button creation code from GameScene. Acknowledged as targeted duplication for now (will be eliminated when F4.35 unifies scene rendering).
3. **Drag/reorder spirits in ShrineScene: DEFERRED.** Not a current player frustration — players can reorder in GameScene before playing. Adding drag to shrine would be substantial duplication or premature extraction. Revisit if it becomes a real workflow issue.

**Effort (revised):** 2-3 hours (was 3-5h before scope cut).

**Cross-references:**
- F3.10 (Item 1 — sell refund extension to non-zodiacs already shipped)
- F3.4 (sidebar restructure — laid out the "scenes should share more state" pattern this extends)
- F3.5 (per-element tooltip mode — tooltip work in this task may inform that, or vice versa)
- **F4.35 (newly added)** — full scene rendering unification, where the broader duplication addressed

**Phase 3 total updated: ~38-54 hours (was 36-51; +2-3h for F3.24 revised).**

---

## Phase 4: Cleanup (4-6 hours)

Pure mechanical removal of dead code identified across slices.

### Design principle: Consolidate parallel implementations

Throughout the codebase, similar functionality often has 3-5 parallel implementations developed in different design stages. When a parallel-implementation pattern is identified during any task (not just Phase 4), the preferred fix is to **unify them onto a single helper** rather than fixing each in isolation.

Examples encountered so far:
- **F2.3 (planned):** Five spirit-acquisition paths (`buySpirit`, `summonSpirit`, `_addPastLifeCopy`, `fuseSpirits`, `addSpiritDirect`) each implementing subtly different stacking/transcendence logic. Unify onto a single `_acquireSpiritCopy(spiritDef, options)` helper.
- **Likely future cases:** F2.4 audit will surface more — Phase 4 cleanup should look for parallel patterns explicitly.

The pattern: when multiple call sites implement the same logical operation, replace them with a single helper. Benefits: eliminates correctness drift between call sites, makes future call sites trivial to add, isolates the operation in one testable place. Cost is local (refactor existing call sites); benefit is systemic.

### F4.1: Dead method removal (Slice 7 CL23)
- `logCardEnhanced`, `logCardEditionApplied`, `logCardTranscended`, `logShopOfferings`, `printToConsole` — defined, never called
- `undoLastCapture`, `fullReset` — managers, never called
- `toSnapshot()` cluster — keep if save/load planned (D0.12), else remove

**⚠ Cleanup discipline — distinguish dead from invalidated:**

Not every "unused" piece of code is safe to delete. Two distinct categories exist:

1. **Genuinely dead:** No callers, no design intent. The methods above fall here — defined and forgotten. Safe to delete.

2. **Temporarily invalidated:** Code that LOOKS dead (no longer functions) but represents an active design commitment awaiting rewire. Examples on file: `volatile_flow.modifyPushSuccess` and `stable_flow.modifyPushSuccess` in HexagramEffects.js are marked `OBSOLETE post-F2.6` — these are awaiting F2.6.b redesign, NOT abandoned.

Cleanup passes must check each candidate against the OVERHAUL_PLAN before deletion:
- Is there an active follow-up task that references this code?
- Does the surrounding context (e.g., hexagram still draftable, spirit still scorable) imply the code's design intent is preserved?
- Are there `OBSOLETE post-FX.Y` or `TODO(FX.Y)` comments pointing to rewire work?

If any of the above, leave it in place and verify with the relevant follow-up task is complete first.

Effort: 1 hour.

### F4.2: Legacy consumable_*pig/dog/rooster/horse removal — **RESOLVED 2026-05-07**

Legacy consumable entries removed in F1.x legacy cleanup. The `_dogProtection` and `_pigDoubleKi` GRM fields remain — they're now used by zodiac replacements (zodiac_rabbit reuses `_dogProtection`). Renaming GRM internals deferred to F4.2.b below.

### F4.2.a: ShrineScene dead method removal (post-F2.3.i)

After F2.3.i routed all consumable purchases through inventory, the in-shop apply methods became orphan dead code:
- `_showChakraOverlay` — old in-shop chakra apply
- `_showStampCardSelector` — old in-shop stamp card selector
- `_activateAlchemical` — old in-shop alchemical activator (note: GameScene has its own `_activateAlchemical` for in-round; the ShrineScene method is the dead one)
- `_showPracticeOverlay` — old in-shop Four Practices overlay (legacy from pre-Chakra design)

These are zero-caller methods. Remove them along with any helper UI they depend on (overlay rendering code, confirm/cancel buttons, etc.).

Effort: 1-2 hours (depends on how tangled the overlay helpers are with shared shop UI infrastructure).

### F4.2.b: GRM internal field rename for clarity + dead infrastructure removal

**(a) `_dogProtection` rename.** Used by `zodiac_rabbit` (5 refs in GRM), not by Dog. The current Dog zodiac retrieves cards from discard — has nothing to do with this flag. The "Dog" in the name is a fossil from an older Dog effect design.

Rename: `_dogProtection` → `_pushPenaltyNullified`

Update all references (5 in GRM + 1 in ConsumableEffects).

**(b) `_pigDoubleKi` dead fossil removal.** Surfaced during Phase 1 closeout investigation 2026-05-07: `_pigDoubleKi` has 5 refs in GRM (declaration, getter, init, 2 snapshot fields) but **0 assignments anywhere in the codebase**. The flag is infrastructure for an older "Pig doubles round-end ki" design that was superseded. Current `zodiac_pig` does an immediate `+10 ki` instead — fully self-contained, doesn't touch this flag.

Two options:

- **Remove the fossil:** Delete the declaration, getter, init, snapshot fields. Clean. Future Pig redesign rebuilds infrastructure if needed.
- **Wire current Pig to it:** Change Pig from "+10 ki" to "doubles round-end ki." Bigger design change; not recommended unless intentional.

Recommendation: remove the fossil. The infrastructure is dead weight.

**Effort:** 1 hour (was 0.5h; +0.5h for pigDoubleKi removal).

### F4.3: V4 result-object plumbing removal (subsumed by F1.5)

### F4.4: `cardsByTag` exported but unused (Slice 3 D17)
Either remove or document the intent (potential future hexagram tag-affinity feature).

Effort: 0.25 hours.

### F4.5: `_totalScore` accumulator removal (Slice 5 D36)
Used only in summary; remove if no display surface needs it.

Effort: 0.25 hours.

### F4.6: Speculative card data
Either remove from data or add a clearer "unimplemented" flag.

Effort: 0.5 hours.

### F4.7: Comment corrections
- `RunManager.js` line 53-54 (Wayside-Wayside-Grove comment) per D0.1 decision
- `HexagramEffects.js` line 366 destructive cycle comment per D0.2
- `StyleEngine.js` "12 combos" comment fixed to "11"
- `GameplayLogger.js` doc-strings noting V4 fields removed

Effort: 0.5 hours.

### F4.8: GameplayLogger console.log unconditional flooding (Slice 7 CL25)
Gate behind a `_consoleEcho` flag separately from buffer.

Effort: 0.5 hours.

### F4.9: Open question — three discount stacking patterns consolidation
This was already F1.2; verify all paths converged.

### F4.10: Three Marks naming legacy cleanup (Slice 7 CL23, Cleanup Catalog)

The Three Marks system was replaced by Chakra Tools (which absorbed marking functionality), Wu Xing elements, card editions, and stamps. The codebase has been mostly cleaned — `_markMode` was already renamed to `_cardTargetMode` in a prior pass — but several stale references remain.

**Items to clean up:**

1. **Stale comments referencing "Three Marks":**
   - `src/scenes/GameScene.js:190` — "Active Three Marks targeting state"
   - `src/scenes/GameScene.js:2280` — "── Three Marks (in-round targeting) ──"
   - `src/scenes/GameScene.js:2283` — "Enter mark mode for a Three Marks consumable"
   - `src/systems/DeckManager.js:153` — "used with RunManager._deck for Three Marks"
   - `src/systems/RunManager.js:1027` — "mutations (Three Marks) propagate"
   - `src/systems/RunManager.js:1519` — "Three Marks + Wu Xing"
   - `src/systems/GameRoundManager.js:977` — "── Three Marks helpers ──"
   - `src/systems/FieldManager.js:384` — "Used by Three Marks Non-being"

   All should be updated to describe current targeting/destruction mechanisms (Chakra Tools, Wu Xing, Stamps, Editions). Or simply removed if they describe behavior that no longer needs explanation.

2. **Dead helper methods to remove:**
   - `src/systems/GameRoundManager.js:984` — `removeCardFromHand(cardId)` (no callers)
   - `src/systems/GameRoundManager.js:993` — `removeCardFromField(cardId)` (no callers)

   Both were leftovers from the "Non-being" Three Marks consumable. Verified no remaining call sites.

**Why deferred:** Naming/comment cleanup that doesn't affect behavior. Best done as a focused pass alongside other Phase 4 cleanup work.

**Estimated effort:** 30-45 minutes.

### F4.11: Unify stack-tracking patterns (Pattern 2 throughout) — **MOVED to Phase 1 F1.8.b**

This work has been absorbed into F1.8.b (Per-element state for accumulator spirits). The per-element model implicitly unifies Pattern 1 and Pattern 2: per-element accumulation produces uniform increment semantics regardless of which pattern was previously used. See F1.8.b for the consolidated treatment.

The codebase currently uses TWO patterns for stack-aware spirits:

- **Pattern 1 (stacks at increment):** State counter increments by `stackCount` per event. Engine output uses raw counter. Examples: glacier, carbon, fossil, moths, ship, missing_number, kintaro, bullseye, wuji, badger.
- **Pattern 2 (stacks at engine output):** State counter increments by event count. Engine output multiplies by `stackCount`. Examples: ants, snails, algae, ducks, napoleon, lincoln/palace/decay (post-D0.23).

Both produce the same final mult contribution at scoring time. But Pattern 1 obscures player understanding (counter conflates events with stack-weighted events) and is fragile to mid-run stack changes (transcendence, hex modifiers).

**Goal:** unify all engine spirits under Pattern 2.

**Procedure for each Pattern 1 spirit:**

1. At the increment site (in GameRoundManager.js or RunManager.js), change `+= (spirit.stackCount ?? 1)` to bare `++` or `+= eventCount`.
2. In the engine `applyEngine` return, multiply the output by `spirit.stackCount ?? 1`.
3. Update the corresponding tooltip in GameScene.js to multiply the displayed value by stackCount.

**Why important:**
- Counter semantics become consistent: every spirit's state tracks "events that happened," not "stack-weighted events."
- Tooltip integrity: tooltip displays match what player did, not internal weighted accumulation.
- Mid-run stack changes (transcendence, hex modifiers) work correctly without retroactively reweighting historical state.
- Future stack-modifier mechanics (e.g., a hexagram that doubles effective stacks for a round) compose cleanly.

**Estimated effort:** 2-3 hours (sweep all Pattern 1 spirits, convert each, verify build, spot-check tooltips).

### F4.12: Per-element state tracking for accumulator spirits — **MOVED to Phase 1 F1.8.b**

Promoted to Phase 1 based on playtest evidence that the architectural debt is actively producing correctness bugs (mid-run state inheritance, transcendence aggregation incorrectness, sale-element state leakage). Detailed treatment retained below for historical context; current canonical reference is F1.8.b in Phase 1.

---

(F4.12: Per-element state tracking for accumulator spirits (added 2026-05-07 during D0.24 design discussion; refined 2026-05-07)

The current spirit model treats stacks as monolithic — a 2-stack Ants has ONE state object representing the whole stack, and `totalPlayed` is a single shared counter. This breaks down under three lifecycle scenarios:

1. **Acquisition mid-run.** Buying a second Ants when the first has totalPlayed=10 should not give the new copy 10 plays of history. The new copy should start at 0.

2. **Sale of one element from a stack.** Selling one element of a 2-stack Ants should remove that element's accumulated state, not split the shared counter arbitrarily.

3. **Transcendence to negative.** When 4 elements peel off into a negative, the negative aggregates their accumulated states into its own singleton state object — and continues accumulating from there at its powerLevel.

**Finalized data model:**

**Regulars** are stacks of separable elements. Each element has its own state object:
```js
{
  id: 'sym_ants',
  stackCount: 2,
  isNegative: false,
  elements: [
    { totalPlayed: 10, acquiredRound: 4 },
    { totalPlayed: 3, acquiredRound: 7 }
  ]
}
```

**Negatives** are unified singletons. After absorbing N elements via transcendence, they hold a single aggregated state object and continue accumulating:
```js
{
  id: 'sym_ants',
  stackCount: 1,
  isNegative: true,
  powerLevel: 3,           // F4.13
  state: { totalPlayed: 30 }  // = sum of absorbed elements' states (e.g., 20 + 10 + 0 + 0)
}
```
After transcendence, the negative continues incrementing per event. Its mult contribution scales by `powerLevel` explicitly.

**Aggregation helper:**
```js
function aggregateState(spirit, key) {
  if (spirit.elements) {
    // Regular: per-element history
    return spirit.elements.reduce((s, e) => s + (e[key] ?? 0), 0);
  }
  // Negative or non-accumulator: single state object
  return spirit.state?.[key] ?? 0;
}
```

**Increment helper:**
```js
function incrementPerEvent(spirit, key, amount = 1) {
  if (spirit.elements) {
    // Regular: increment each element by amount (each element gains the event)
    for (const el of spirit.elements) el[key] = (el[key] ?? 0) + amount;
  } else {
    // Negative: increment the singleton state object
    if (!spirit.state) spirit.state = {};
    spirit.state[key] = (spirit.state[key] ?? 0) + amount;
  }
}
```

**Engine reading (uniform pattern):**
```js
applyEngine({ spirit }) {
  const total = aggregateState(spirit, 'totalPlayed');
  if (total === 0) return null;
  // Regulars: per-element accumulation already encodes stack scaling (effectivePower = 1).
  // Negatives: singleton state, explicit powerLevel scaling.
  const scaling = spirit.isNegative ? (spirit.powerLevel ?? 1) : 1;
  return { addMult: total * 0.5 * scaling };
}
```

This unifies Pattern 1 and Pattern 2 (the F4.11 unification): all accumulator engines use `aggregateState` for the counter and the per-type scaling factor. Pattern-1-style `+= stackCount` increment sites become per-element `+= 1` increments via the helper.

**Math verification:**

- 2-stack regular Ants, 1 card played: elements [{tp:1}, {tp:1}], sum=2, scaling=1, addMult = `2 × 0.5 × 1 = 1.0` ✓ (matches old `totalPlayed=1 × 0.5 × stackCount=2 = 1.0`)
- Negative Ants powerLevel=3, post-transcendence state.totalPlayed=30, then 1 card played: state.totalPlayed=31, scaling=3, addMult = `31 × 0.5 × 3 = 46.5` ✓ (was 45 pre-card; gained +1.5 per card as designed)
- 3-stack regular Ants, post-3-cards-played: elements [{tp:3}, {tp:3}, {tp:3}], sum=9, addMult = `9 × 0.5 × 1 = 4.5` ✓ (matches 3 cards × 0.5 × 3-stack = 4.5)

**Acquisition:** new element starts with fresh state (e.g., `totalPlayed: 0, acquiredRound: <current>`). Append to `elements` array; increment `stackCount` accordingly.

**Sale of element:** pop the corresponding element from `elements` array. That element's accumulated state leaves with it. Remaining stack retains other elements unchanged.

**Transcendence to negative:** when peeling 4 elements:
- Aggregate their states (sum each tracked key) into a single state object
- Create a new negative spirit with `isNegative: true, stackCount: 1, powerLevel: 3, state: <aggregated>`
- Discard the elements (they no longer have separate identity)
- Negative continues accumulating per event from this state forward

**Affected spirits (accumulator type):**
- sym_ants, sym_snails, sym_algae, sym_caterpillar, sym_badger
- engine_lincoln, engine_palace, engine_glacier, engine_carbon, engine_fossil, engine_moths
- engine_velocity (T2 only; T1 is not state-tracked)
- engine_kintaro, engine_bullseye, engine_missing_number, engine_ship, engine_napoleon
- legend_wuji

**Not affected (non-accumulator):**
- sym_ducks (multValue toggles), sym_cuckoo_egg (countdown), decay_persimmon, decay_pear (countdowns)
- sym_crow, sym_magpie, sym_osprey (per-round transient or non-accumulating)

**Why important:** Without per-element tracking, the universal stacking principle has subtle violations:
- Players who acquire a "fresh" spirit copy mid-run unfairly inherit history they didn't earn.
- Players who sell one element of a stack lose state in unintuitive ways.
- Negatives don't reliably preserve the value they were created from.

**Implementation order within the refactor:**

F4.12 absorbs F4.11 (Pattern 1 → Pattern 2 unification) since the per-element model produces uniform increment semantics. The unified pattern is: each spirit's increment hook adds events to its state container (elements array OR singleton state); engine reads via aggregateState; scaling factor distinguishes regulars (1) from negatives (powerLevel).

**Cross-references:**
- D0.24 (Past Life): per-element acquisition tracking on Past Life is a special case of this general pattern. The `acquiredRound` per-element semantics generalize to all spirits if any need similar lifecycle tracking later.
- D0.17 (transcendence stack preservation): formalized here as "transcendence aggregates element states into singleton state." The negative continues accumulating from that aggregated baseline.
- F4.13 (negative powerLevel): negatives use `state` directly + explicit `powerLevel` scaling. Regulars use `elements` + scaling-of-1. The two refactors compose cleanly.

**Open design question — acquired-round on negatives.** Negatives no longer have per-element acquired rounds (singleton). For mechanics that read `acquiredRound` (currently only D0.24 Past Life), negatives can:
- (a) Have their own `acquiredRound` set at transcendence time (when the negative was created)
- (b) Track no acquired round — Past Life can either include or exclude negatives based on how D0.24 wants to handle this

Recommend (a): negatives have their own `acquiredRound` for any lifecycle-aware mechanic. Past Life's "held for 3 rounds" rule then applies to negatives the same way it applies to regulars.

**Estimated effort:** ~10-14 hours (data model refactor across ~17 spirits, increment site updates, transcendence/sale path reconciliation, comprehensive testing; absorbs F4.11 unification).

### F4.13: Explicit `powerLevel` field for negative spirits — **MOVED to Phase 1 F1.8.a**

Promoted to Phase 1 as the foundational data-model fix that unblocks F1.8.b and D0.24. Detailed treatment retained below for historical context; current canonical reference is F1.8.a in Phase 1.

---

(F4.13: Explicit `powerLevel` field for negative spirits (added 2026-05-07 during D0.11.5-2 verification)

**Problem:** Negative spirits currently encode their power level via `stackCount`. A 3x-power negative has `stackCount: 3, isNegative: true`. This conflates two semantically distinct concepts:

- **stackCount** for regulars: "this spirit has N copies stacked, occupying one slot"
- **stackCount** for negatives: "this spirit's effect is at N× power"

Negatives are mechanically singletons (they never stack — multiple negatives are independent objects). Using `stackCount` for power is a workaround that breaks down in subtle ways:

1. **UI rendering (F3.13):** any code reading stackCount alone treats 3x-power negatives identically to regular 3-stacks. Visual confusion in roster.
2. **Engine spirit reading:** any spirit-effect logic that reads `stackCount` to compute scaling will incorrectly apply 3× scaling to a singleton negative as if it were three units.
3. **Past Life copying (D0.24):** to copy "a Cold negative at 3x power," the implementation needs to preserve the power level distinct from the spawn's stackCount. Conflation makes this awkward.
4. **Future stacking work:** any future mechanic involving stack-related modifiers (hexagram effects, mid-run buffs) becomes ambiguous when applied to a negative.

**Proposed data model:**

```js
// Regular spirit
{ id: 'spring_pollen', stackCount: 3, isNegative: false }

// Negative spirit
{ id: 'spring_pollen', stackCount: 1, isNegative: true, powerLevel: 3 }
```

Negatives always have `stackCount: 1` (they're singletons). The `powerLevel` field captures their effect strength. Separating these unblocks correct UI rendering, eliminates accidental scaling, and supports D0.24's negative-copy mechanics cleanly.

**Affected code:**
- All spirit-add paths (`buySpirit`, `summonSpirit`, `addSymbiontSpirit`, `_addPastLifeCopy`): when creating a negative, set `stackCount: 1, powerLevel: <derived from transcendence stacks>`.
- Cascading transcendence: when peeling 4 elements, the resulting negative's `powerLevel` = 3 (the canonical pre-transcendence stack power).
- All engine spirit `applyEngine` functions: when computing scaling factors, use `powerLevel` for negatives, `stackCount` for regulars. Helper: `effectivePower(spirit) => spirit.isNegative ? spirit.powerLevel : spirit.stackCount`.
- `countStackedById`: returns sum of effective power across all instances. Existing usages expect stack-counted output, so this likely already does the right thing if updated to use `effectivePower`.
- Tooltip / display code: render `powerLevel` distinctly from `stackCount` when negative.

**Migration:** Existing in-progress runs would have `stackCount: 3` on their negatives. A migration step on load: `if (spirit.isNegative && spirit.stackCount > 1) { spirit.powerLevel = spirit.stackCount; spirit.stackCount = 1; }`. Defensive default if `powerLevel` is missing on a negative: 1.

**Why important:** Phase 0 and Phase 2 work has been accumulating workarounds for the conflation. F4.13 resolves the architectural debt cleanly. Combined with F4.12 (per-element state) and F4.11 (Pattern 2 unification), Phase 4 establishes a clean spirit-state model that the rest of the project can rely on.

**Cross-references:**
- F3.13 (UI distinction): once negatives have explicit `powerLevel`, the UI can render them distinctly without relying on `stackCount` for differentiation.
- D0.24 (Past Life): power-level copy mechanics depend on having a clear way to read and write power independent of stackCount.
- F4.12 (per-element state): negatives may also benefit from per-element accumulation, e.g., a negative spirit with internal state that reflects "frozen accumulation at transcendence." Compose the two refactors carefully.

**Estimated effort:** ~6-8 hours (data model change is small; the work is in updating every consumer of stackCount on negatives, plus migration, plus comprehensive testing).

### F4.14: Design Doc V5 reconciliation pass (added 2026-05-07; scope refined 2026-05-08)

**Status:** Added during Phase 0 closure. Originally scoped against CONSUMABLE_ROSTER_V4.md and SPIRIT_ROSTER_V5.md, which have since been **superseded by DESIGN_DOC_V5.md** as the authoritative spec. F4.14 now focuses on ensuring DESIGN_DOC_V5.md accurately reflects as-shipped behavior after all Phase 1 and Phase 2 corrections land.

**Key context for Phase 2B work:**
- **DESIGN_DOC_V5 is the authoritative source of truth** for all spirit, hexagram, and consumable specifications during F2.1, F2.2, F2.3 corrections.
- CONSUMABLE_ROSTER_V4.md and SPIRIT_ROSTER_V5.md are obsolete reference documents. If they conflict with DESIGN_DOC_V5, the design doc wins.
- The old roster docs may have historical value for understanding why code is currently in a particular state, but should NOT be treated as authoritative for current corrections.

**Reconciliation scope:**

During Phase 2B work, we'll be comparing code against DESIGN_DOC_V5 and making spec-vs-code calls. Each mismatch resolves one of:
- (a) Code is right → no doc change needed
- (b) Doc is right → code change shipped via F2.1/F2.2/F2.3
- (c) Both wrong → redesign, then update doc

F4.14 captures any **doc updates** generated as byproduct of Phase 2B work. The task accrues throughout Phase 2B rather than being a standalone effort.

**Known doc updates needed (carry-over from Phase 0/1):**

**From F1.8.a (negative spirit data model change):**
- Negatives use `stackCount: 1, powerLevel: N` instead of `stackCount: N`
- Tooltip header convention: "Negative (power ×N) — zero-slot"
- Sale refund: `cost × 0.5 × powerLevel` for shop-bought negatives

**From F1.8.b (per-element accumulator architecture):**
- 24 accumulator spirits use per-element state
- Tooltip displays "longest-held element value" for events-seen, aggregate for mult contribution
- Cascading transcendence aggregation uses longest-held

**From D0.11.5 (negative cap removal):** Spirits can have multiple negative copies of the same id.

**From D0.16:** Capstones never appear in shop offerings (Pearl recipe is sole creation path).

**From D0.18 (economy timing redesign):** Spirit-order chaining via slot order.

**From D0.19 (symbiont bug fixes):** Osprey 2-card-empty fallback, Algae increment guards.

**From D0.24 (Past Life redesign):** 3-round hold, power-uniform copy semantics, per-element acquired-round tracking.

**From F1.1 followup:** Recycling stack-scaling, Catcher Osprey-style redesign.

**From F2.7 cluster (2026-05-08):**
- Mid-round mutations propagate immediately to scoring engine
- Field slot configuration recomputes on demand
- Throat duplicate available same round

**From F2.10b (2026-05-08):** Retrigger compounding math correction.

**From F2.10a (2026-05-08):** Stamp mixing system with 7 valid mix combinations.

**From F2.6 (2026-05-08):** Push-driven commitment model for flow and interest.

**From F2.2 hexagram corrections (2026-05-14, Category 1 — mechanical bugs):**
- **hex_38 Kuí:** Remove "Kasu threshold -1" from doc spec — proportional yaku thresholds now handle this automatically. Doc text simplifies to "Bright cards removed from deck."
- **hex_06 Sòng:** Doc says "push failure costs up to 10 ki" — change to "push failure costs 10 ki" (floor at current ki balance still applies in implementation but doesn't need surfacing in doc).
- **hex_16 Yù:** See Category 3 entry below (combined redesign with hex_24).
- **hex_07 Shī:** Doc and code match at offerings +1; no doc change needed (in-game description was the outlier).
- **hex_54 Guī Mèi:** Doc and code match at -1 offerings + 25% discount; no doc change needed.
- **hex_10 Lǚ:** Doc and code match at +25% prices + 5 consumable slots; no doc change needed.

**From F2.2 hexagram corrections (2026-05-14, Category 4 — description rewrites + deck composition redesigns):**

Description-only fixes (mechanic correct, description rewritten):
- **hex_25 day_deck:** "All night cards removed. Remaining day cards duplicated."
- **hex_53 night_deck:** "All day cards removed. Remaining night cards duplicated."
- **hex_44 air_deck:** "All land cards removed. Remaining air cards duplicated."
- **hex_37 land_deck:** "All air cards removed. Remaining land cards duplicated."
- **hex_62 Xiǎo Guò:** Description clarified to specify "Each play triggers 2 deck flips instead of 1" (NOT preview/reveal — different from hex_51).

**From F2.2 hexagram corrections (2026-05-14, Category 2 — F2.6.b + F2.6.c push redesigns):**

New architecture: introduce two hooks `pushCurveSuccessAmplifier` and `pushCurveFailureAmplifier`. Each scales the delta-from-baseline of push curve outcomes. `getPushMultiplier(depth, outcome)` reads the appropriate amplifier and applies it as: `result = 1.0 + (baseMult - 1.0) * amplifier`. Default amplifier 1.0 = no change.

- **hex_64 Wèi Jì (volatile_flow):** `pushCurveSuccessAmplifier: 1.5`, `pushCurveFailureAmplifier: 1.5`, `modifyFlowDecay: 0.85`. Bigger wins, worse losses, faster decay. Remove dead `modifyPushSuccess`/`modifyPushFailure` hooks. Doc + description updated.
- **hex_63 Jì Jì (stable_flow):** `pushCurveSuccessAmplifier: 0.5`, `pushCurveFailureAmplifier: 0.5`, `modifyFlowDecay: 0.98`. Gentler wins and losses, slower decay. Remove dead hooks. Doc + description updated.
- **Capstone Time (capstone_time, legendary spirit):** Inline checks in `getPushMultiplier` and `applyFlowDecay` apply success amplifier ×1.5, failure amplifier ×0.5, decay rate 1.0 (no decay). Spirit and hexagram amplifiers compound multiplicatively. Tooltip description updated.

Cleanup follow-up: `modifyPushSuccess` and `modifyPushFailure` hook references can now be removed from `applyHook` documentation in HexagramEffects.js (no remaining consumers). F4.1 dead-code cleanup item.

Mechanic redesigns (Category 4, using speculative card system):
- **hex_29 Kǎn (match_by_rank):** REVERTED after playtest. Removing yaku disabling exposed a deeper issue: initial board layout still stacks by month, so a 4-stack of January cards from the initial deal coexists with rank-matched captures, producing incoherent board states. Yaku disable restored. Full redesign deferred — needs board layout to also respect rank-matching for the hexagram to feel coherent. Logged as future Phase 2 follow-up: **F2.2.x — hex_29 board layout redesign for rank-matching coherence.** Estimated effort: 4-6 hours (requires touching initial deal logic in GRM, not just capture matching).
- **hex_17 Suí (animal_deck):** Option A applied uniformly. Operating on speculative-augmented deck: every month's ribbon (base or speculative) becomes a duplicate of that month's animal (base or speculative). Result: 12 months × 2 animals + brights + plains. Speculative cards `january_bear`, `march_ladybugs`, `december_fox` come into play as targets; speculative `august_ribbon`, `december_ribbon` are the cards being replaced. Code, description, and doc updated.
- **hex_31 Xián (ribbon_deck):** Mirror of hex_17. Every month's animal becomes a duplicate of that month's ribbon (using speculative ribbons for Aug and Dec, replacing speculative animals for Jan/Mar/Dec). Result: every month has 2 ribbons. Code, description, and doc updated.
- **hex_39 Jiǎn (deck_36 → no-plains deck):** Redesign using speculative cards. Deck = 36 cards. Each month features 1 bright + 1 animal + 1 ribbon (using speculatives where needed: `february_scholar`/`april_pond`/`may_kite`/`june_kirin`/`july_farmer`/`september_bell`/`october_lantern` as brights for months lacking them; `january_bear`/`march_ladybugs`/`december_fox` as animals; `august_ribbon`/`december_ribbon` as ribbons). Field +1 preserved. Code, description, and doc updated.
- **hex_23 Bō (all-plains-only):** Inverted from current design. All brights, animals, ribbons removed. Each month has 2 distinct plains (November uses `november_plain_2`; December uses 2 Paulownia plains since `december_plain_3` is deprecated). All plains duplicated → 4 plains per month (2× plain_A + 2× plain_B). Deck = 48 cards. Code, description, and doc updated.
- **hex_20 Guān (deck_60):** Redesign. Deck = 60 cards consisting of 1 bright + 1 animal + 1 ribbon + 2 plains per month (uses all 13 speculative cards). Hand size +1 preserved. Code, description, and doc updated.
- **hex_38 Kuí (no-brights → bright+plain deck):** Redesign. Animal and ribbon cards removed (both base and speculative). Each month: 1 bright (speculative if needed) + 3 plains (duplicate one of the 2 distinct plains per month). 48 cards total. Removes the Kasu threshold modifier from original spec — proportional yaku thresholds handle this. Code, description, and doc updated.


**From F2.2 hexagram corrections (2026-05-14, Category 3 — design decisions):**
- **hex_21 Shì Kè (eight_spirits_graduated_tax):** Replace tax table (1/3/6/10 for spirit counts 5/6/7/8) with cleaner linear formula: 3 ki per spirit beyond 4, end of round. Negative spirits count toward total. So 5 spirits = 3 ki, 6 = 6 ki, 7 = 9 ki, 8 = 12 ki. Doc spec needs updating.
- **hex_24 Fù + hex_16 Yù economy separation:** These hexagrams were overlapping in what they zeroed out. Cleaner split:
  - hex_24 (Fù): Start with 50 ki, zero `modifyKiReward`, zero `modifyHandKi`, zero `modifyInterestRate`. Spirit/stamp/consumable ki still earned. Doc and description rewritten accordingly.
  - hex_16 (Yù): No hand-card ki bonus at round end. Each capture grants +3 ki. Push/Bank decision works normally. (Effect ID `no_banking_ki_plus_capture` may be renamed to `no_hand_ki_plus_capture` to match actual mechanic.) Doc and description rewritten.
- **hex_45 / hex_46 (style_ki_double / style_flow_double):** Code zeros the non-doubled resource (matches doc). Codebase descriptions still claim the non-doubled resource is "unchanged" — incorrect. No doc change needed.

**From F2.1 spirit audit (2026-05-15, doc-side reconciliation):**

Doc updates needed where code is correct but DESIGN_DOC_V5 does not match implementation:

- **S-002 — Symbiosis (§7.9 and §7.17):** Doc claims Symbiosis "summons N different symbionts per animal capture." Code (and intended design per Robert) is: "summons 1 symbiont species per captured animal, stacked at Symbiosis's stack count." Update §7.9 and §7.17 to reflect: 1-symbiont-per-animal, stacks via Symbiosis stack count, excess stacks (over 3) transcend into Negative copies. Phase 1 work refined this mechanic — design intent is locked.

- **S-004 — Cuckoo Egg (§7.17):** Doc claims auto-hatch after 3 rounds. Code (and intended design) is: "Per stack, 3-round maturity. Sell to hatch a random Tier-2 fusion spirit." Update §7.17 to reflect: 3-round maturity countdown, player sells the spirit to hatch into a random Tier-2 fusion (slot-limited).

- **S-005 — Ducks (§7.17):** Doc claims geometric doubling/halving formula. Code uses additive +1/-1 accumulator, floored at 0, multiplied by 0.2 × stacks. Temporary doc alignment to code; flag for **Phase 5 redesign** (Robert flagged as redesign candidate).

- **S-010 — Print spirit (§7.10.3 and §7.8):** Doc claims four spirits (Echo, Replica, Print, Collector) are "functional but with 'Coming soon' descriptions." Recon confirmed all four were genuinely non-functional. F2.1.b implemented Echo, Replica, Collector. **Print remains non-functional** pending F5.9 (Print is a major new feature — consumable-applier mechanic, see F5.9 for locked design). Update §7.10.3 to:
  - Echo, Replica, Collector: functional as of F2.1.b — descriptions updated in spirits.js
  - Print: non-functional pending F5.9 (per-round consumable applier — see F5.9 design)

- **S-013 — Catcher (§7.11.1):** Doc says caught cards go to field. Code (and intended design) returns cards to hand instead. Update §7.11.1 to reflect: "Catches up to N cards per round (N = stack count). Caught cards return to hand instead of being lost."

- **S-022 — Capstone Time (§7.16):** Doc claims push success ×1.3, push failure ×0.95, round-end decay ×0.98. Actual code:
  - Flow does not decay between rounds (×1.0, not ×0.98)
  - Push success amplifier scales delta-from-neutral by ×1.5 (so at depth 1: ×1.15, depth 2: ×1.375, depth 3: ×1.675)
  - Push failure amplifier scales delta-from-neutral by ×0.5 (so at depth 1: ×0.95, depth 2: ×0.90)
  - Effect SCALES WITH PUSH DEPTH — modest at depth 1, significant at depth 3+
  
  Update §7.16 to remove specific multiplier claims and replace with delta-amplification description matching code. Also note that Time COMPOUNDS multiplicatively with hexagram amplifiers (hex_64 Wèi Jì and hex_63 Jì Jì).

**From F2.1 audit (2026-05-15, header comments and code organization):**

- **spirits.js header comment** updated to reflect 113-spirit catalog (was outdated "28 foundation spirits"). Comment lists all tiers, channels, and notes which spirits are non-functional.
- **Bonds description** updated to remove misleading "+25% cap" claim. Now reads "+5% per stack" with no cap mentioned (per Phase A patch). Phase 5 tuning will revisit Bonds base value (F5.1).
- **Echo channel field** corrected from 'gameplay' to 'retrigger'.
- **Past Life channel field** corrected from 'utility' to 'meta'.

**From F2.3 audit (2026-05-15, doc-side reconciliations):**

- **§8.1 Crown Chakra description:** Update from "Copy identity, preserving target's enhancements" to "Copy all attributes (rank, month, axes, enhancement, stamp, edition) of one card onto another. Target becomes exact duplicate of source." Reference card unchanged; target card replaced including all decorations. Target's deck-slot id preserved for tracking.
- **§8.4 Stamp tier system:** 4 tiers explicit (Primary/Secondary/Tertiary/Quaternary). Gray Stamp moves from Tertiary to Quaternary tier — distinct from Black to reflect its retrigger-as-amplifier identity.
- **§8.4.5 / 8.4.3-4 Stamp mixing recipes:** Document the primary-pair → secondary stamp recipes that already exist in STAMP_MIX matrix (Red+Yellow → Orange, Blue+Yellow → Green, Blue+Red → Purple). Doc currently only mentions Sacred Grove as Secondary acquisition path; crafting is an additional path.
- **§8.4 Stamp tier-shuffle (Option C):** Document the full effect table. Each tier ascent shifts effects between triggers (within-pair swap at Secondary, three-way rotation at Tertiary). Replaces older Black "fire all three on any trigger" model.

| Stamp | Captured | Discarded | Yaku |
|---|---|---|---|
| Yellow | +3 ki | — | — |
| Red | — | — | Draw +1 |
| Blue | — | Free consumable | — |
| White | (universal retrigger ×1) | (universal retrigger ×1) | (universal retrigger ×1) |
| Orange | Draw +1 | — | +3 ki |
| Green | Free consumable | +3 ki | — |
| Purple | — | Draw +1 | Free consumable |
| Black | Free consumable | Draw +1 | +3 ki |
| Gray | Free consumable + retrigger ×3 | Draw +1 + retrigger ×3 | +3 ki + retrigger ×3 |

- **§8.5.1 Cat zodiac pool:** Update "16 candidates" to reflect dynamic Common pool (currently 27 Tier 1 commons; will expand if non-Tier-1 commons are added). Filter is by rarity, excludes symbionts.
- **§8.6.2 Amber:** Remove the "codebase restricts Amber to 3-stack inputs only — this is incorrect implementation" caveat. Amber correctly supports 1/2/3-stack inputs in code; doc was wrong.
- **§8.6.1 Pearl:** Change "Pearl preserves the components rather than consuming them" to "Pearl consumes the components (decrement stack by 1 per input)." Code is authoritative; doc was wrong about preservation.
- **§8.6.3 Lead:** Remove "Lead's pool excludes any rare spirit the player has already at 3-stack with an existing Negative copy" caveat. Lead now allows cascade transcendence — if a rolled Rare is already at 3-stack, the helper produces a new negative.
- **§8.2.2 Iron description:** "×1.5 mult when held in hand during scoring" (not "when captured" — was code-side description bug).
- **§8.2.2 Earth/Clay description:** "10% ki/round interest when held in hand" — clarification added in code description, already correct in doc.
- **§8.2 Wu Xing destructive cycle:** All 5 element descriptions now mention their destructive partner for consistency.

**From F2.3 audit Prompt B (2026-05-15, retrigger architecture):**

- **§7.x (new section to add) or §8.4.5 Stamp Mechanics:** Document the trigger-type-aware retrigger architecture:
  - Four trigger types: `'capture'`, `'held_in_hand'`, `'discard'`, `'yaku'`
  - `'capture'` covers both scoring math (Phase 1.5) and capture-trigger stamp effects (fire in same atomic event)
  - Rank retrigger spirits (Dew/Wish/Family/Rainbow) operate on `'capture'` for matching rank — retrigger both scoring AND any capture-trigger stamp on the matching card
  - Applause operates on `'held_in_hand'`
  - White stamp adds 1 retrigger to ANY trigger type; Gray adds 3
  - Spirit retriggers and stamp retriggers compose ADDITIVELY (not multiplicatively): Dew + White-stamped plain = 3 scorings total, not 4
  - Mirror/Memory meta-spirits inherit their target's trigger scope via delegation
- **Future spirit design space:** Architecture supports new spirits that retrigger `'discard'` or `'yaku'` events. No such spirits currently exist; design space remains open.

**Description rewrite scope (added 2026-05-08):**

Eventually, ALL in-game descriptions should be cleanly rewritten by hand:
- Spirit tooltips (all 100+ spirits)
- Consumable tooltips (chakras, alchemicals, zodiacs, stamps, elements, editions)
- Hexagram effect descriptions (64 hexagrams)
- Card mutation descriptions (enhancements, stamps, editions)

These were generated by Claude Code thus far and need editorial polish for consistency, voice, and clarity. This is **separate from F2.1/F2.2/F2.3 corrections** (which fix mechanics) and from F3.18 (which adds tooltip surface area). It's a focused editorial pass on the existing language.

**Sequencing:** This editorial rewrite should happen AFTER F2.1/F2.2/F2.3 ship (mechanics stable) and BEFORE Phase 5 playtest (players will read these descriptions). Most natural home is end of Phase 3 or beginning of Phase 4.

**Effort:** 4-6 hours for mechanical doc reconciliation; **additional 6-10 hours for editorial description rewrite** (separate sub-effort).

**Why Phase 4:** Doc reconciliation is cleanup work, not architecture. Phase 4's scope is "code cleanup and comment correction" — design doc reconciliation and description rewriting fit naturally.

### F4.15: Unify consumable activation paths (added 2026-05-08 from F2.7c investigation)

**Background:** During F2.7c implementation, mapping all activation paths surfaced that consumables are currently dispatched through three distinct code paths in `GameScene.js`:

1. `_activateCardTarget` — chakras, stamps, elements (card-target picker)
2. `_activateAlchemical` — all alchemicals (target picker or immediate execution)
3. Inline `else` branch in click handler — zodiacs (target picker via `_showZodiacTargetPicker` or immediate inline execution)

Each path independently handles:
- Pre-check for target requirements
- Show appropriate target picker (if needed)
- Execute the effect
- Consume the item, log, status message
- Re-render the UI

This fragmentation causes recurring bugs:
- The F2.7c re-render fix had to be applied to four different sites because each path manages its own render
- Adding a new consumable type requires deciding which path to extend and remembering to wire up all the per-path concerns
- The dispatch logic in the click handler is a growing if/else chain that's been edited multiple times across sprints

**Proposed unified design:**

```js
_useConsumable(cons, idx) {
  const effect = ConsumableEffects.get(cons.id);
  if (!effect) return;
  const targetType = effect.inputType ?? getTargetType(cons);
  if (!targetType) {
    this._executeAndFinalize(cons, idx, {});
    return;
  }
  this._showTargetPicker(cons, idx, targetType);
}

_executeAndFinalize(cons, idx, params) {
  const effect = ConsumableEffects.get(cons.id);
  const result = effect.execute({ roundManager: this._round, params });
  if (result.success) {
    run.consumeById(cons.id);
    this._setStatus(result.message ?? `Used ${cons.name}.`);
  } else {
    this._setStatus(result.message ?? `Cannot use ${cons.name}.`);
  }
  this._renderAll();  // ALWAYS — single source of truth for re-render
  return result;
}

_showTargetPicker(cons, idx, targetType) {
  switch (targetType) {
    case 'card':                                                   return this._showCardTargetPicker(cons, idx);
    case 'spirit': case 'spirit_pair': case 'spirit_single_transcendable': case 'spirit_pair_tier3':
      return this._showSpiritPicker(cons, idx, targetType);
    case 'slot':                                                   return this._showSlotPicker(cons, idx);
    case 'yaku':                                                   return this._showYakuPicker(cons, idx);
  }
}
```

Each picker ends by calling `_executeAndFinalize(cons, idx, pickedParams)`. Single render path. Single log path. Single status path.

**Benefits:**
- F2.7c becomes trivial (it's the existing behavior of `_executeAndFinalize`)
- Adding a new consumable: define `inputType` on its effect, register a picker if the type is new, otherwise zero GameScene changes
- The dispatch logic stops growing — categories become metadata, not control flow

**Costs:**
- Touches ~150-200 lines of GameScene refactoring
- All consumable activation flows re-routed; needs careful regression testing across all 30+ consumables
- Bundles well with other GameScene cleanup (Three Marks legacy F4.10, dead methods F4.1)

**Pre-conditions:**
- All current consumable activation paths working correctly (Phase 1 + F2.7 complete) ✓ as of 2026-05-08
- Consumable corrections from F2.3 stable
- No mid-flight refactors of the same code

**Effort:** 6-10 hours (refactor + regression testing across all consumable types).

**When to schedule:** Phase 4 (engine cleanup), bundled with F4.1/F4.10 for a single GameScene cleanup pass.

**UX flow simplification opportunity (added 2026-06-01 during F3.15 item 1 work):**

The engineering refactor above is necessary; the UX flow is a separate concern that should ride alongside. Robert mapped the current consumable activation flow (2026-06-01) and identified real redundancies:

**Current flow (varies by consumable type):**
1. Click consumable from area → "Use" + "Sell" buttons appear
2. Press "Use" → consumable rises in slot, "Activate: X" button appears at screen bottom
3. Press "Activate" → enters selection mode (most consumables), OR applies instantly (Sulfur), OR opens spirit picker (Cinnabar/Mercury/Amber/Pearl/Jade), OR for zodiacs shows "Activate X Zodiac" + "Sell" buttons before another commit
4. ESC currently only works during selection mode (step 3), NOT during "Use → Activate" phase (step 2)

**Observations:**
- The "Use → Activate" two-step is redundant. Both clicks commit to the same intent (use this consumable).
- ESC behavior is inconsistent across phases.
- Zodiac "Sell" mid-activation is a strange affordance (the player has already committed; selling there breaks the mental model).
- F3.15 item 1 (shipped 2026-06-01) adds Cancel buttons next to "Activate: X" for all consumables as a stopgap, but the underlying flow is still two-step where it could be one.

**Proposed UX simplification (Tier 2):**
- Single commit: clicking "Use" should enter selection mode directly (or apply instantly for non-target effects).
- Remove the intermediate "Activate: X" step entirely; the consumable raises in slot AND enters selection mode in one click.
- ESC + Cancel button work consistently across all phases.

**Proposed UX reinversion exploration (Tier 3, post-Tier 2):**
- Card-first model: select hand card, click consumable → applies to selected card.
- Inverted from current "consumable-first" model.
- Major UX paradigm shift; needs design exploration and user testing.
- Could affect speed-of-play significantly. Should ship alongside the consumable stacking system (separate work item) since stacking changes how players manage inventory.

**Sequencing:**
- F4.15 engineering refactor (unified dispatch) — necessary foundation
- Tier 2 UX simplification — clean up the two-step redundancy, ride alongside engineering refactor
- Tier 3 reinversion exploration — separate design effort, pair with consumable stacking implementation

**Effort revised:** 8-12 hours (was 6-10) to include the Tier 2 UX simplification alongside the engineering refactor. Tier 3 effort estimated separately when scheduled.

### F4.16: System reorganization — spirit logic seepage (added 2026-05-14 from F2.3 recon)

**Background:** During F2.3 (spirit acquisition unification), recon revealed that spirit-specific logic is currently scattered across three files instead of centralized in SpiritEffects.js. This is "logic seepage" — implementation details of one concept (a specific spirit's behavior) leak across system boundaries.

Examples surfaced during F2.3 recon:
- **`_fireCuckooHatch`** lives in RunManager.js (45 lines) — Cuckoo Egg-specific maturity/hatch logic, even though it's a spirit behavior. Lives in RunManager because it mutates run state, but semantically belongs in SpiritEffects.
- **`_addPastLifeCopy`** lives in RunManager.js — Past Life-specific logic in the run state container.
- **Cuckoo Egg maturity counting** lives in GameScene.js sale handler (`spirit.elements.slice(-quantity)` mature-count check). UI doing engine work; couples GameScene to Cuckoo Egg's implementation details.
- Likely more cases — full audit needed.

**Why this matters:**
1. **Discoverability:** modifying a spirit requires checking 3 files instead of 1.
2. **Coupling:** GameScene knowing about Cuckoo Egg's maturity rules means changes to either require coordinated edits.
3. **Pattern multiplication:** logic-scattered code accumulates parallel implementations (the F2.3 helper consolidation surfaced exactly this).
4. **Demo prep difficulty:** Phase 5 demo work typically requires rapid spirit iteration. Logic centralized in SpiritEffects accelerates this; scattered logic slows it down.

**Proposed approach:**
1. Audit all spirit IDs against the three files (SpiritEffects, RunManager, GameScene, GameRoundManager). For each spirit, note where its logic lives.
2. For spirits with scattered logic, design the move: keep state ownership where it must be (RunManager owns `_allSpirits`), but expose APIs that SpiritEffects calls. SpiritEffects becomes the single declarative location for "this spirit does X."
3. Move logic in passes — Cuckoo Egg, Past Life, then any others surfaced by the audit.
4. UI dispatches via API calls without knowing spirit internals.

**Effort:** 8-12 hours. Audit + spirit-by-spirit moves + regression testing.

**When to schedule:** Phase 4 (engine cleanup), after F2.3 ships. Pairs naturally with F4.15 (consumable activation unification) — both are about getting concept-specific logic to live where the concept's data lives.

**Notes:**
- This is NOT in scope for F2.3. F2.3 consolidates the spirit-acquisition PATH (one helper). F4.16 consolidates SPIRIT-SPECIFIC LOGIC (each spirit's full implementation in one place).
- May surface additional logic-seepage during the audit. Effort estimate is rough.

**Cross-references:**
- F2.7c (2026-05-08): four re-render sites surfaced the fragmentation problem
- F4.1 (dead method removal): same area of code, natural pairing
- F4.10 (Three Marks legacy): also touches consumable activation areas
- This is the third architectural smell pattern documented for Phase 4 cleanup, alongside dead-flag (F2.4 item 9) and iteration-asymmetry (F2.4 item 10) patterns

**Phase 4 total: ~10-16 hours (revised up; F4.15 adds 6-10h).**

---

### F4.17: Discard pipeline unification — ✅ COMPLETE (2026-06-06, 5-step campaign)

**✅ COMPLETE — see `docs/process/F4.17_campaign_ledger.md` and DECISIONS_LOG D-F4.17.**
All six discard sites now route through one canonical `_discardCard(card, source)` /
`_discardCards(cards, source)` on GameRoundManager; the asymmetry matrix is all ✅.

**⚠️ Stale-premise correction:** the "reveal-miss discards BYPASS the discard pipeline"
framing below (item 3, and the Phase 2C bullets) was STALE. Recon (`docs/recon/
discard_pipeline_recon.md`) confirmed hex_51 reveal-miss already routed through
`_handleFieldDiscard` and fired the full set — consistent with this doc's own hex_51 status
note ("unified reveal-miss with `_handleFieldDiscard`"). The feared "TANGLED" risk was absent;
verdict was DRIFTED-close-to-CLEAN. Other corrections vs. the plan below: **Ox IS a full
discard** (item under "Per-pathway" said "leave as-is" — reversed; catcher rescuing a stranded
stack to hand is Ox's signature mechanic); catcher is a GATE not a hooked side-effect;
bookkeeping uniformity + ki-reason unification (`recycling_overflow`→`recycling_discard`) were
deliberate [FIX]es. The original planning text is retained below for historical context.

**Background:** During F2.3 audit Prompt B verification, recon confirmed that the stamp discard-trigger dispatch lives ONLY in the `playHandCards` discard path. Consumable-driven discards (Horse: hand reset; Monkey: hand-discard equal to captured count) push to `_allDiscards` without firing the stamps' discard-trigger effects.

During Phase 2C hex_51 Zhèn (`deck_flip_revealed`) verification, a THIRD discard pathway was identified that also bypasses the discard pipeline: **reveal-miss discards** (when hex_51 reveals a top-of-deck card that doesn't match the field, it gets discarded without firing any discard event hooks).

**Three discard pathways currently identified:**

1. **Overflow discard** (field full) — fires stamp dispatch, Catcher, Recycling. WORKS.
2. **Consumable-driven discard** (Horse hand reset, Monkey hand discard, possibly others) — BYPASSES stamp dispatch. BUG per doc §8.5.1.
3. **Reveal-miss discard** (hex_51 active, top-of-deck doesn't match field) — BYPASSES stamp dispatch, Catcher, Recycling. BUG per Phase 2C verification.

**Doc §8.5.1 explicitly mentions Horse SHOULD fire discard-stamp effects:** "discarded cards from Horse can trigger discard-stamps (Blue, Green) on those cards, providing an indirect benefit beyond the reset."

**Hex_51 case (Phase 2C 2026-05-15):** Robert's verification found:
- Catcher does NOT catch revealed-then-discarded cards (catches only overflow discards)
- Recycling does NOT give +5 ki per reveal-discard (only overflow)
- Blue stamps fire only on overflow discards, not reveal-misses
- Osprey works because it bypasses the entire discard system (intercepts at deck-draw layer)

**Scope of unified fix:**

The proper architectural fix is a **unified discard event dispatch** — a single helper that:
1. Routes any card being "discarded" through a single dispatch function
2. Fires stamp discard-trigger effects (`_dispatchStampDiscardEffects`)
3. Fires Catcher's catch-eligible check
4. Fires Recycling's +5 ki effect
5. Fires any other discard-event listeners
6. Updates `_allDiscards` and discard count

Then EACH of the three pathways calls this unified dispatch instead of pushing to `_allDiscards` directly.

**Specific changes:**

- **Horse:** when `hand.clear()` + `_allDiscards.push(...oldHand)`, call unified dispatch per card.
- **Monkey:** when `_allDiscards.push(...toDiscard)`, call unified dispatch per card.
- **Ox:** STRANDED-stack clearing is debatable — the cards weren't player-chosen for discard, they were swept. Recommend leaving Ox as-is (no stamp dispatch on stranded sweeps). Robert: confirm during F4.17 design.
- **Hex_51 reveal-miss:** route through unified dispatch.

**Stamp description updates:** Remove "due to a full field" qualifier from Blue/Green/Purple/Black/Gray stamp descriptions. They should fire on any discard pathway. F4.14 doc accumulator + spirits.js descriptions.

**Implementation approach:** Extract the playHandCards discard-stamp dispatch logic into a helper method on GRM (e.g., `_processDiscard(card, source?)` or `_fireDiscardEvent(card)`), then call it from:
- playHandCards overflow path (existing)
- Horse consumable execution
- Monkey consumable execution
- Hex_51 reveal-miss path

This is consistent with the F4.15/F4.16 principle of centralizing event-triggered effect dispatch.

**Phase 2C interim:** A surgical patch for hex_51 specifically can be shipped now (route reveal-miss through `_dispatchStampDiscardEffects` and add Catcher/Recycling hooks). Full architectural unification happens in F4.17. Same applies to Horse/Monkey via F4.17.

**Effort:** 2-4 hours for unified pipeline + verification. Touches consumable execution paths, hex_51 path, and possibly future pathways. Hex_51 surgical patch (interim): 30-60 min.

**When to schedule:** Phase 4 (engine cleanup), bundled with F4.15 (consumable activation unification) and F4.16 (system reorganization). All three target consumable-effect-routing consolidation. Hex_51 surgical patch can ship in Phase 2C.

**Cross-references:**
- DESIGN_DOC_V5 §8.5.1 (Horse mentions discard-stamp interaction)
- F4.15 (Consumable activation paths)
- F4.16 (Spirit logic seepage; same family of consolidation work)
- F4.18 (Capture-event dispatch consolidation — sibling architectural cleanup)
- F2.3 audit Prompt B (where Horse/Monkey gap was identified)
- Phase 2C hex_51 verification (where reveal-miss case was added)

---

### F4.18: Capture-event dispatch consolidation (added 2026-05-15 from F2.3 audit Prompt B patch discussion)

**Background:** During F2.3 audit Prompt B follow-up patch (`scoring` → `capture` trigger-type rename), it was identified that the capture event currently fires through TWO separate loops in GRM:

1. **Phase 1.5 scoring loop** — iterates captured cards, computes per-card retrigger count, re-evaluates scoring math (points, mult, spirit chain processing).
2. **Capture-trigger stamp dispatch** — iterates captured cards again, computes per-card retrigger count, fires stamp effects (Yellow's ki, Orange's draw, etc.).

Conceptually these are ONE event ("card captured, all capture-time effects fire"). Architecturally they're two parallel loops, both iterating the same `cards` array, both computing the same retrigger count via `_computeRetriggerCount(card, 'capture')`.

**Why this matters:**
- Duplicate iteration over the same data
- Two places to maintain capture-event logic
- Two places to keep retrigger-aware
- Same pattern as F4.15 (consumable activation paths), F4.16 (spirit logic seepage) — parallel implementations of one logical concept

**Proposed consolidation:** Single loop over captured cards. For each card:
1. Compute `retriggerCount = _computeRetriggerCount(card, 'capture')`.
2. For each retrigger iteration:
   - Re-evaluate scoring math (current Phase 1.5 logic)
   - Fire stamp capture-trigger effects (current stamp dispatcher logic)

Or with a helper: `_dispatchCaptureEffects(card, fireCount)` that handles both scoring and stamp dispatch.

**Cross-references:**
- F2.3 audit Prompt B patch (where this gap was identified)
- F4.15 (consumable activation unification — same family)
- F4.16 (spirit logic seepage — same family)
- F4.17 (consumable-driven discards bypass stamps — same family)

**Effort:** 3-5 hours. Touches scoring math (high-trust code) so requires careful verification. Pairs well with F4.15/F4.16/F4.17 for a single capture-event-dispatch cleanup pass.

**Note:** The F2.3 audit Prompt B patch (rename `scoring` → `capture` for trigger-type semantics) does NOT consolidate the loops — it just unifies the trigger-type naming. The actual loop consolidation is this F4.18 task.

**Design revisit during F4.18:** Robert wants to reconsider whether 'capture' and 'scoring' should remain merged (current Prompt B patch behavior) or be re-separated when this task is tackled. There are interesting cases for each interpretation — merged enables Yellow+Dew ki compounding; separated keeps stamp side effects orthogonal to scoring math. The decision is deferred until playtesting gives concrete evidence for which produces better gameplay.

**Additional F4.18 scope (added 2026-05-15 from F2.3 audit Monkey patch):** When non-deck-flip capture sources (Monkey zodiac, possibly future consumables) complete a new yaku, the Push/Bank decision is currently not surfaced to the player. The yaku is detected via the scoring pipeline (cards captured count toward yakus), but the deck-flip-specific code path that transitions to `_phase = "yaku_decision"` doesn't fire.

For F2.3 audit closeout, Monkey ships with Option A (quiet scoring, no Push/Bank surfacing on Monkey yaku completion). Option B (full Push/Bank surfacing on Monkey-completed yakus, matching deck-flip behavior) is the long-term design goal, deferred to F4.18.

Implementation for Option B: extract the inline yaku-decision-surfacing logic from `playDeckPhase` (currently ~30 lines of detection + phase transition + status fields) into a reusable method `_surfaceYakuDecisionIfNeeded()`. Call from Monkey's path after `_addCapture` completes. Same method can be called from any other future consumable that triggers captures.

---

### F4.19: Monkey/Horse known issues — yaku detection, round-end UI transition, push/bank surfacing (added 2026-05-15 from F2.3 audit Monkey/Horse verification)

**Background:** During F2.3 audit Monkey/Horse mechanic-fix verification (May 15), Tests 1-5, 9, 10, 12 passed (Monkey scoring pipeline, Horse refill, basic dispatch). Tests 6, 7, 11 revealed deeper architectural gaps that were ruled out of scope for Phase 2.

**Three related issues, all rooted in the same architecture problem:**

1. **Yaku completed via Monkey doesn't trigger.** Monkey routes through `_addCapture(cards)` which executes the scoring pipeline cleanly (Phase 1 mult, Phase 1.5 retriggers, capture-trigger stamps, etc.). But yaku DETECTION (recognizing that a new yaku exists in the capture pile and scoring its points) happens at the call site in `playDeckPhase`, not inside `_addCapture`. Monkey's path doesn't run this detection step. Captured cards count toward yaku pile membership but the new-yaku event doesn't fire.

2. **Empty hand after Monkey/Horse doesn't transition UI.** GameRoundManager has `_checkRoundEndOnEmptyHand()` helper (added by F2.3 audit Monkey/Horse patch) that fires `onRoundEnd` hex hook and sets `_phase = 'round_over'`. But GameScene listens for `result.status === 'round_over'` returned from `playDeckPhase` / `bankScore` calls — NOT for `_phase` field changes. Consumable results don't surface through the same status-check switch in GameScene's main handler. Even though `_phase = 'round_over'` is set, the UI doesn't transition.

3. **Push/Bank surfacing on Monkey-completed yaku.** Deferred to F4.18 (extract yaku-decision-surfacing as reusable method). Same root cause as #1 and #2 — the inline logic in `playDeckPhase` needs to become a reusable method that consumables can also trigger.

**Architecture root cause:**

`playDeckPhase` is the canonical post-capture coordinator. After a deck-flip capture, it runs:
1. `_addCapture(cards)` — scoring pipeline (current call)
2. Yaku detection (inline) — find new yaku, score points
3. Status decision — `'yaku_decision'` if new yaku, `'round_over'` if hand empty, `'ok'` otherwise
4. Return `{status, ...}` to caller (GameScene)

GameScene's handler:
```js
switch (result.status) {
  case 'yaku_decision': this._renderAll(); this._showYakuDecision(result); break;
  case 'round_over':
  case 'banked':       this._renderAll(); this._showEndScreen(result); break;
}
```

Consumable execution (where Monkey/Horse live) doesn't return through this switch. The consumable system returns a different result shape. UI doesn't know to call `_showEndScreen` or `_showYakuDecision` from a consumable.

**Current Monkey state (post F2.3 audit, accepted as-is for Phase 2):**

- ✅ Routes captures through `_addCapture` (Phase 1 mult, Phase 1.5 retriggers, capture-trigger stamps, hex hooks, Goat, style combos all fire)
- ✅ Stamps on discarded hand cards fire (Blue/Green/Purple/Black/Gray discard-trigger effects)
- ✅ Captured cards count toward style combos
- ✅ Captured cards count toward yaku pile membership
- ❌ Does NOT detect new yakus completed by the capture
- ❌ Does NOT transition UI to round-over if hand goes empty
- ❌ Does NOT surface Push/Bank decision

**Current Horse state (post F2.3 audit, accepted as-is for Phase 2):**

- ✅ Draws equal count to discarded (not fixed 8)
- ✅ Clears hand BEFORE stamp dispatch (stamp draws fire onto empty hand)
- ✅ Stamps on discarded hand cards fire correctly
- ✅ Refill draws min(handSize, deckSize) — handles short deck correctly
- ❌ Does NOT transition UI to round-over if deck is empty (rare edge case but real)

**Player-visible impact:**

For Monkey:
- Player using Monkey on a slot that completes a yaku: yaku is in capture pile, will count if player completes the round naturally, but no immediate +points or Push/Bank decision fires from the Monkey use itself.
- Player using Monkey down to 0 hand cards: game doesn't end. UI shows empty hand. Spirits clickable/sellable. No way to play more cards (since hand is empty). Round is stuck.

For Horse:
- Player using Horse with empty deck: hand cleared, no refill (deck empty), no round transition. Same stuck-state as Monkey.

**Workaround for Monkey/Horse stuck-state:** None ideal. Player can't bank (no `bankScore` from consumable flow surfaces). Player could conceivably refresh the game if a save system existed (F5.2). For now, this is a "don't use Monkey/Horse if it would empty your hand or deck" rule.

**Proposed F4.19 scope:**

Extract the inline `playDeckPhase` post-capture logic into a reusable method on GRM, e.g., `_processCaptureCompletion(cards, { fromConsumable: false })`. The method:
1. Runs `_addCapture(cards)` (already does)
2. Detects new yakus via post-capture yaku snapshot diff
3. Scores yaku points if any new yaku
4. Decides status: yaku_decision / round_over / ok
5. Returns the same `{status, newYaku, allYaku, yakuPoints, ...}` shape as `playDeckPhase`

Monkey then calls `_processCaptureCompletion(cards, { fromConsumable: true })` and surfaces the resulting status. The consumable result needs to propagate up to GameScene's status switch — likely via a new shape like `{success: true, captureResult: {status, ...}}` that GameScene knows to handle.

Bundles with F4.18 (capture-event dispatch consolidation) and F4.17 (consumable-driven discards). All three resolve at the same architectural layer.

**Effort:** 4-7 hours including verification. Touches `playDeckPhase` (high-trust code) so requires careful testing.

**When to schedule:** Phase 4, alongside F4.15/F4.16/F4.17/F4.18 cleanup batch. The four+1 form a coherent "consumable activation + capture-event routing + stamp/yaku consolidation" theme.

**Cross-references:**
- F4.15 (consumable activation paths)
- F4.16 (spirit logic seepage)
- F4.17 (consumable discards bypass stamps — partially resolved by F2.3 audit Monkey/Horse patch)
- F4.18 (capture-event loop consolidation + Monkey Push/Bank yaku-decision surfacing)
- F2.3 audit Monkey/Horse patch (where these issues were identified and accepted as-is)

---

### F4.20: Migrate spirit effect logic to SpiritEffects.js (added 2026-05-15 from F2.1 audit recon)

**Background:** During F2.1 (Spirits) audit recon, identified that spirit effect logic is scattered across the codebase. Many spirits have empty `{}` stubs in `SpiritEffects.js` while their actual implementation lives elsewhere:

- `util_glory: {}` — draw-on-bright logic in `GameRoundManager._addCapture`
- `util_symbiosis: {}` — symbiont summoning in `GameRoundManager._addCapture` or `_handleCapture`
- `util_irrigation: {}` — (deprecated, see S-001)
- `econ_bonds: {}` — interest rate calculation in `RunManager`
- `econ_ingot: {}` — interest rate calculation in `RunManager`
- `econ_recycling: {}` — overflow ki in `GameRoundManager._handleFieldDiscard`
- `econ_lucky_charm: {}` — probability roll modifier in `RNGHook.js`
- `econ_reward: {}` — push-success ki in `GameRoundManager`
- `econ_piggybank: {}` — hand-card ki multiplier in `bankScore`
- `econ_coupon: {}` — shop price modifier in `RunManager.getEffectiveCost`
- `game_catcher: {}` — overflow-card routing in `GameRoundManager`
- `legend_gankyil: {}` — auto-capture threshold in `FieldManager`
- `legend_waidan: {}` — Sacred Grove exit hook in `ShrineScene`
- `util_past_life: {}` — release-time duplication in `RunManager.releaseSpirit`
- ... and others

**Architectural principle (per Robert):** Spirit effect logic should live in `SpiritEffects.js` unless there's a specific architectural reason to live elsewhere. The current scatter is the result of organic codebase evolution rather than deliberate design.

**Possible legitimate exceptions:**
- Effects that fundamentally modify other subsystems (e.g., Gankyil's auto-capture threshold is genuinely a FieldManager concern — the field's state machine decides when to auto-capture, not the spirit)
- Effects with deep RunManager state coupling (interest rate calculations may belong in RunManager because they involve compounding many sources)
- Effects whose timing is tied to non-capture events (Waidan's Sacred Grove exit is a scene transition, not a capture event)

**Migration approach:**
1. Audit each empty stub in SpiritEffects.js — locate where the logic currently lives
2. Categorize: migratable vs structurally-bound
3. Migrate the migratable ones by defining proper hooks/methods in SpiritEffects.js
4. For structurally-bound ones, add comments in SpiritEffects.js explaining WHERE the logic lives
5. Verify no behavior change via playtest

**Hook system migration (added 2026-05-15 from F2.1.b):**

F2.1.b created a spirit hook system in GRM (`_fireSpiritHook`, `onRoundStart`/`onRoundEnd`) and used it for Collector, Echo, and Replica. Existing inline patterns in GRM are now natural migration targets:

- **`bankScore` inline blocks:** Crow's consumable generation should migrate to `sym_crow.onRoundEnd`. Any other bank-end inline blocks for spirits.
- **`playDeckPhase` natural-round-end blocks:** Parallel migration target.
- **`startRound` symbiont resets block:** Osprey's `flipsUsedThisRound` reset and Catcher's `catchesUsedThisRound` reset should migrate to `sym_osprey.onRoundStart` and `game_catcher.onRoundStart`. The block's name is also misleading (Catcher isn't a symbiont) — rename or remove the block once everything migrates out.
- **New hook types as needed:** `onCaptureComplete`, `onSpiritEquipped`, `onSpiritReleased`, `onShopEnter`, etc. — add as migration uncovers needs.

**This is a sibling to F4.16 (spirit logic seepage) but addresses the inverse problem:** F4.16 is about non-spirit logic in SpiritEffects (e.g., RIBBON_STAMP_MAP). F4.20 is about spirit logic OUTSIDE SpiritEffects. Together they comprise "spirit code organization."

**Effort:** 6-10 hours for migration + verification. Touches many files but each individual change is small.

**Sub-investigation: Stacking pattern consolidation (added 2026-05-15 from F2.1 audit S-021 discussion):**

The spirit stacking system uses two distinct patterns across the codebase:

- **Pattern X (state-accumulator):** Spirits with per-element state. `incrementPerElement` writes to each element; `aggregateNumericState` sums across elements. Stack count is implicit in elements array size. Used by ~20 engine spirits (Devotion, Habitat, Wildlife, Glacier, Carbon, Fossil, etc.).

- **Pattern Y (instantaneous-multiplier):** Spirits without state. `effectivePower(spirit)` returns stack count directly; spirit's `applyEngine` multiplies its fixed value by this. Used by ~15 spirits (Hierarchy, decay spirits, Tengu, Wuji, retrigger_*, etc.).

Both produce correct behavior for their use cases, but the dual-pattern architecture makes spirit code harder to reason about. A developer reading a new spirit definition has to understand which pattern applies and why.

**During F4.20, evaluate whether these patterns can be unified.** Options:
1. Keep as-is, but document the choice clearly in SpiritEffects.js header (each pattern explained, examples given)
2. Unify under a single helper like `applyStackedEffect({ baseValue, scaleByStackCount, accumulator })` that handles both cases internally
3. Migrate Pattern X to use `effectivePower` directly where possible (eliminates element-machinery for cases that don't need it)

Note that Pattern X is NECESSARY for spirits with state that persists across captures and that needs to be frozen at transcendence (e.g., Wildlife's `seenAnimals` set, Devotion's `totalScored` counter). Migration would only target spirits where elements are unused.

This may be an over-engineering rabbit hole. Defer concrete decision until F4.20 implementation begins.

**When to schedule:** Phase 4, bundled with F4.16 as "spirit code organization" pass.

**Cross-references:**
- F4.16 (RIBBON_STAMP_MAP location, other non-spirit data in SpiritEffects)
- F4.21 (Spirit ID normalization — same family of cleanup)

---

### F4.21: Spirit ID system normalization (added 2026-05-15 from F2.1 audit)

**Background:** Spirit IDs in the codebase show organic evolution: most spirits use a function-based prefix (`engine_*`, `util_*`, `cond_*`, `cross_*`, `capstone_*`, `decay_*`, `retrigger_*`, `sym_*`, `econ_*`, `game_*`, `fusion_*`, `rank_*`, plus the season/axis prefixes). But there are inconsistencies:

**Demoted rares with `legend_` prefix (legacy):**
- `legend_wuji`, `legend_dao`, `legend_chi`, `legend_tengu`, `legend_waidan`, `legend_feng_shui`
- These were originally legendary, now rare. Doc §7.12 acknowledges the legacy.
- Should be renamed per their function (e.g., `engine_wuji`, `engine_dao`, `engine_chi`, `engine_tengu`, `util_waidan`, `engine_feng_shui`)
- `legend_gankyil` stays as `legend_*` (still legendary)

**Channel field mismatches with category/function:**
- `game_echo` has `channel: 'gameplay'` but is a retrigger spirit. Patched to `'retrigger'` in F2.1 quick-wins.
- `util_past_life` has `channel: 'utility'` but is a meta spirit. Patched to `'meta'` in F2.1 quick-wins.
- Other channel mismatches may exist — full audit needed.

**Other naming inconsistencies:**
- `engine_irrigation` is functionally a rank utility (per doc §7.9). After F2.1 quick-wins rename to `util_irrigation`, it joins util_glory/util_symbiosis/util_festival.
- `engine_applause` is functionally a retrigger spirit. Could be renamed `retrigger_applause`.
- `engine_radiance`, `engine_banner`, `engine_wildlife`, `engine_plenty` are rank-mult engines; the `engine_*` prefix fits.

**Scope of fix:**
1. Audit all 113 spirit IDs against their actual function
2. Categorize: matches function vs legacy artifact
3. Propose normalization scheme (Pattern A: function-based prefix throughout)
4. Plan ID migration:
   - Rename in `spirits.js`, `SpiritEffects.js`
   - Update all references across the codebase (hex effects, event hooks, save game serialization if applicable, achievements, logging)
   - Test for any persistence layer that stores IDs (save files would break)
5. Verify no broken references

**Effort:** 4-7 hours including comprehensive reference search and playtest. Lower risk if done before a save game system exists (F5.2). After save game implementation, this becomes much harder.

**When to schedule:** Phase 4, before F5.2 (Save game). Bundled with F4.16/F4.20 as "spirit code organization" pass.

**Cross-references:**
- F4.16 (non-spirit data in SpiritEffects)
- F4.20 (spirit effect logic migration to SpiritEffects)
- F5.2 (Save game — must precede this work or be migration-aware)

---

### F4.22: Duplicate card ID handling — Animal Deck systemic bug (added 2026-05-15 from F2.1 audit Garden investigation)

**Background:** During F2.1 audit verification of Garden spirit, Robert discovered that the Animal Deck hexagram creates DUPLICATE CARD IDs in the deck (e.g., two `october_deer`, two `july_boar`). The rest of the codebase appears to use `card.id` as identity in multiple critical systems, leading to all instances being treated as one entity.

**Confirmed bug symptoms (via console recon):**

1. **Enhancement targeting broken:** Applying Fire to one July Boar instance results in BOTH july_boar cards in deck having `enhancement: { element: 'fire', tier: 'base' }`. Same for Metal on June Butterflies, and presumably all Wu Xing/stamp/edition consumables. The intent of "apply enhancement to specific card I selected" is broken — all matching IDs get the enhancement.

2. **Capture pile / yaku counting broken:** When two cards with identical IDs are captured (e.g., matching May Bridge on field with May Bridge from hand), the capture pile shows them merged as 1 entry, and yaku detection counts them as 1 captured card instead of 2.

3. **Garden spirit affected:** Garden counts unique deck configurations via signature `(month|type|temporal|enhancement|stamp|edition)`. Since enhancements modify both copies identically, the signature stays the same for both — Garden never counts +1 for "one of a pair modified." This was the original observation that surfaced the bug.

**Root cause hypothesis:** The codebase treats `card.id` as canonical identity. Operations that should target a specific card instance (`applyEnhancement(cardId)`, `addToCapturePile(card)`, etc.) likely use ID-based lookups or storage. The standard deck has unique IDs per card (e.g., `january_plain_1`, `january_plain_2`), masking this issue. The Animal Deck hexagram intentionally creates duplicate IDs (2 copies of each animal card), exposing the bug.

**Systems likely affected:**

1. **Consumable application** (Wu Xing enhancements, stamps, editions, Solar Plexus rank promotion) — confirmed
2. **Capture pile storage** — confirmed (May Bridge merge observed)
3. **Yaku detection** — confirmed (May Bridge counted as 1 not 2)
4. **Garden spirit** — confirmed (counts identical configurations)
5. **Dao spirit** (counts unaltered cards) — likely affected
6. **Velocity spirit** (counts Iron-enhanced cards) — likely affected if enhancement application bug fixed
7. **Spirits with per-card state via id** — potential issues, audit needed
8. **Card promotion (Solar Plexus)** — likely affected (promoting "one card" may promote all matching)
9. **Crown Chakra duplicate detection** — bears specific check
10. **Achievement tracking** by card-id — bears specific check

**Cascading effects beyond Animal Deck:**

This bug is currently masked in the standard deck (unique IDs). But any future deck or hexagram that creates duplicate cards by ID would have the same issues. Long-term, this is an architectural issue, not just an Animal Deck issue.

**Fix approach (TWO options):**

**Option A: Add per-instance UUID to every card.**
- Every card gets a unique `instanceId` field (generated at deck construction)
- All identity-sensitive operations migrate from `card.id` to `card.instanceId`
- Standard deck unaffected (each card already unique anyway)
- Most invasive but most correct long-term

**Option B: Make duplicate-ID-aware operations.**
- Audit each system that uses `card.id` as identity
- Replace ID-based lookups with object-reference comparisons where appropriate
- Less invasive but error-prone (easy to miss a usage)

**Option A is recommended** for correctness. The migration is mechanical: every operation that currently does `card.id === targetId` becomes `card === targetCard` (object reference comparison) or `card.instanceId === targetInstanceId`.

**Effort estimate:** 8-15 hours including:
- Survey all card-identity usage sites (1-2h recon)
- Decide on Option A vs B (design discussion)
- Implementation (4-7h)
- Comprehensive playtest verification (2-3h)
- Documentation of identity contract (1-2h)

**Verification approach (post-fix):**

- Animal Deck: enhance one July Boar with Fire → verify the OTHER July Boar remains unenhanced
- Animal Deck: capture May Bridge on May Bridge → verify both copies appear in capture pile and Mountain Yaku (or similar) counts both
- Animal Deck: Garden count increases by 1 when one card of a pair is modified (becomes 2 distinct configurations within month)
- Standard deck: no regression (each card already unique)

**When to schedule:** Phase 4, before Phase 5 launch. This is a foundational fix that should be done before any save game work (F5.2) or new content generation. Without this fix, the Animal Deck and any future multi-copy deck designs are systemically broken.

**Cross-references:**
- F2.1 audit (where this was discovered via Garden investigation)
- F2.4 (tooltip + universal stack-aware engine audit — may surface more identity-coupling bugs)
- F4.20 (spirit logic migration — may overlap with id-based spirit lookups)
- F5.2 (Save game must follow this work)

**Note:** Garden was the canary in the coal mine. The visible Garden symptom is small. The underlying systemic bug is significant.

---

### F4.23: Spirit sale-price architecture — unify three sale paths + per-element bonus (added 2026-05-15 from F2.1.c Collector investigation)

**Background:** During F2.1.c verification of Collector, three separate spirit-sale code paths were identified in the codebase, each computing refunds independently:

1. **`releaseSpirit(index)` in RunManager** — used by "Release" confirmation dialog. F2.1.b updated this to include `sellPriceBonus` (`floor(cost/2) + bonus`).
2. **Stack-sell button "Sell Y¥X" in ShrineScene** (inline at ~L17232) — uses formula `Math.floor(cost / 2 * stackCount)`. Does NOT include `sellPriceBonus`. Also doesn't go through `releaseSpirit` — uses `removeSpirit` + `addKi` directly.
3. **`sellLegendarySpirit(i)` in RunManager** — for legendary slot spirits. Refund logic not yet recon'd; likely has its own formula.

Additionally, the ShrineScene "Release" confirmation handler logs `+0 ki` even though `releaseSpirit` returns a valid `kiRefund`. This was specified for fix in F2.1.b but didn't land.

**Root architectural issue:** Sale-price computation is scattered across three paths with three different formulas. Adding any new sale-price modifier (like Collector's bonus) requires updating all three paths and remembering to test all three. Easy to miss one (as F2.1.b did).

**Additional design insight from Robert (2026-05-15):**

Players can choose to sell INDIVIDUAL members of a stack rather than the whole stack. The current single `sellPriceBonus` field on the spirit object doesn't accommodate this — a 3-stack spirit has one bonus value, but selling 1 of 3 members should refund 1/3 of the total bonus, not all of it.

**Cleanest design:** Per-element sale prices. Each stack member tracks its own sell price (analogous to how accumulator spirits use `spirit.elements` for per-element state). Sale price for a whole stack = sum of (base + bonus) across elements. Selling individual members refunds that member's specific price.

**Implementation scope:**

1. **Centralize sale logic:**
   - Add `getSpiritSaleRefund(spirit, count?)` helper in RunManager
   - Optional `count` parameter: how many stack members to sell (default: all)
   - Returns ki refund + decrement/removal logic

2. **Per-element sale-price tracking:**
   - Spirits get an `elements` array (already exists for accumulator spirits)
   - Extend `elements` to ALL spirits (accumulator OR not) for sale-price purposes
   - Each element has `sellPriceBonus: 0` initialized at creation
   - Collector's hook adds to each element's `sellPriceBonus` rather than to the spirit-level field

3. **Unify three sale paths:**
   - `releaseSpirit` → calls helper
   - Stack-sell button → calls helper (and goes through `releaseSpirit` instead of `removeSpirit` + `addKi`)
   - `sellLegendarySpirit` → calls helper

4. **UI: per-member sale (NEW capability):**
   - Add UI affordance for "sell individual stack member" (currently only whole-stack or release-one)
   - Each sell action specifies which member is being sold (relevant for non-uniform bonus distributions)
   - Or: simplification — selling N members removes the N most-recent elements (or oldest, design call needed)

5. **Negative handling:**
   - Negative spirits use `powerLevel` instead of stack count
   - Frozen aggregate sale price at transcendence (analogous to frozen state)
   - Sale of Negative is whole-Negative, not per-element

6. **Migration:**
   - Existing spirits with `sellPriceBonus` (post-F2.1.b) need migration to per-element model
   - In-progress runs would have stale spirit objects — either migrate on load (save game work) or accept reset

**Effort estimate:** 6-10 hours including:
- Audit all sale-price call sites (~30 min recon)
- Design discussion on per-element distribution semantics (~30 min)
- Implement `getSpiritSaleRefund` helper + per-element extension (~2-3h)
- Migrate three sale paths to use helper (~1-2h)
- UI: per-member sale affordance OR simplification (~1-2h)
- Verification + edge case testing (~1-2h)

**Until F4.23 ships:** Collector's effect on spirits works as-is — bonus accumulates on spirit object, applies via `releaseSpirit` path. The stack-sell button doesn't include the bonus (visible bug). Players who want the bonus must use the "Release" confirmation flow rather than the inline "Sell" button. The Release confirmation logger shows "+0 ki" but ki IS credited.

**Acceptable interim state:** Collector functional, partially correct UI, players can sell-and-get-bonus through Release path. F2.1 audit closes with this known limitation logged.

**When to schedule:** Phase 4, possibly bundled with F4.20 (spirit logic migration) or F4.22 (duplicate card ID handling) since all three involve scattered logic that should be centralized. Strong candidate for an early-Phase-4 cleanup pass.

**Cross-references:**
- F2.1.b (where the partial sale-price system was created)
- F2.1.c (where the architectural issue was discovered via Collector testing)
- F4.20 (spirit effect logic migration — sale logic is one such case)
- F4.22 (duplicate card ID — similar "scattered logic with no single source of truth" problem)
- F5.1 (Phase 5 tuning — Bonds and sale-price magnitudes both revisit there)

**Cross-design note (Robert, 2026-05-15):**

The per-element approach has architectural symmetry with the existing per-element state mechanism used by accumulator spirits. Extending this pattern to economic state (sale prices) feels natural. Worth considering whether OTHER economic state should also be per-element — e.g., individual stack members each have their own `acquiredRound` for things like Past Life's per-element-acquired-round tracking. Could simplify or unify several disparate stacking semantics.

---

### F4.24: Codebase architecture catalogue — hook + helper reference in Design Doc (added 2026-05-15 from Phase 2C hex_52 patch insight)

> **⚠ ORDERING UPDATE (2026-06-04): F4.24 reframed into recurring diagnostic
> checkpoints (F4.24a) + a terminal prescriptive `ARCHITECTURE.md` (F4.24b).**
> The scheduling guidance further down this entry (late Phase 4 / early Phase 5)
> applies to **F4.24b only** — the prescriptive reference written against the
> stabilized end-state. The diagnostic enumeration (F4.24a) runs EARLY and
> REPEATEDLY: once at Phase 4 start (done — `F4.24_inventory_pass1.md`) and again
> at the end of major architectural chunks (end of Tier 2, end of Tier 3, etc.),
> each as a disposable delta-against-prior snapshot. Container decision resolved:
> separate `/docs/ARCHITECTURE.md`, not a DESIGN_DOC_V5 section. Full rationale:
> see `DECISIONS_LOG.md` → D-F4.24-ORDERING.

**Background:** During Phase 2C hex_52 verification, Robert's flow-decay-prevention patch initially proposed a multi-file approach (gate decay at GRM callsites). Recon revealed that `applyFlowDecay` already integrates a `modifyFlowDecay` hook — the patch became a single-line addition to `HexagramEffects.js`.

This is a recurring pattern throughout Phase 2 work:
- F2.1.b (Echo, Replica, Collector implementation) discovered hook mechanisms after writing redundant logic
- F2.1.c (Collector sale paths) discovered three separate sale paths instead of one
- Hex_01 patch discovered scoring-pipeline scattering
- Hex_51 patch discovered `_handleFieldDiscard` already existed and could be unified
- Hex_52 patch discovered `modifyFlowDecay` hook already existed

**The systemic issue:** The engine has well-designed reusable primitives (hooks, helpers, dispatch functions), but they are not documented anywhere. Each new feature work session starts by re-deriving them via recon. This causes:

1. **Reinvention.** First instinct is to write new code rather than use existing hook
2. **Architectural drift.** New features take path of least resistance (inline at callsites), creating the scattered patterns F4.17/F4.18/F4.20 are now cleaning up
3. **Onboarding friction.** Future Robert (or any collaborator) has to spelunk to find these patterns
4. **Lost design intent.** Hooks were created with specific use cases in mind, but those intentions live only in commit history

**Robert's insight (2026-05-15):** "When we do our revision of the Design Doc, we should add sections on the codebase itself — its organization, as well as a catalogue of these kinds of hooks/functions which are used by numerous different hexagrams/spirits/consumables, so future features can be built using these same tools instead of creating new ones."

**Scope:**

Add a new top-level section to DESIGN_DOC_V5.md (or a separate ARCHITECTURE.md companion doc — to be decided during F4.14 reconciliation). Sections:

1. **Codebase organization map**
   - Directory structure (`/src/systems/`, `/src/scenes/`, `/src/data/`, etc.)
   - File responsibilities at a high level
   - System dependency graph (which files depend on which)
   - Where to add new content (spirits → spirits.js, consumables → consumables.js, etc.)

2. **Hook reference catalogue**
   - Inventory ALL hooks usable by hexagrams/spirits/consumables
   - For each: name, signature, default value, what it gates, current users
   - Examples (from current codebase):
     - `modifyFlowDecay(base) → rate` — overrides flow decay rate (Capstone Time, hex_52)
     - `forceAutoBankOnYaku() → boolean` — bank-on-yaku trigger (hex_52)
     - `discardUnmatchedDeckFlip() → boolean` — reveal-miss discard (hex_51)
     - `revealsDeckFlip() → boolean` — show next deck card (hex_51)
     - `modifyPlaysPerTurn(base) → count` — multiple plays per turn (hex_58)
     - `overridesCaptureRule() → 'rank'|'adjacent_month'|null` — alternate matching rules (hex_29, hex_57)
     - `modifyYakuThreshold(yakuName, baseThreshold) → threshold` — per-yaku threshold overrides (hex_30)
     - `disablesYaku() → boolean` — full yaku system disable (hex_29)
     - `disableCaptureScoring() → boolean` — capture-no-score (hex_01)
     - `scoreFieldAtRoundEnd() → boolean` — field scoring at round end (hex_01)
     - `modifyDeck(cards) → cards` — deck mutation (hex_X "randomized_deck")
     - `modifyDeckFlipsPerTurn(base) → count` — multiple deck flips (hex_X "field_plus_two_double_flip")
     - `onRunStart(runManager)` — hexagram setup at run start
     - `onRoundStart()` — hexagram setup at round start
     - `onCardScored(card, ctx) → modifiers` — per-card scoring modifier
     - `computeFinalScore(points, mult, flow) → score` — custom final score formula
     - Plus any others discovered during F4.20 spirit logic migration

3. **Helper function reference catalogue**
   - Reusable methods on GRM, RunManager, etc.
   - For each: signature, what it does, when to use
   - Examples (from current codebase):
     - `_handleFieldDiscard(card)` — unified discard handler (Catcher, Recycling, Ship, stamp dispatch)
     - `_dispatchStampDiscardEffects(card)` — stamp discard-trigger dispatcher
     - `_peekNextDeckFlip()` — refresh next-deck preview after deck-modifying actions
     - `_fireSpiritHook(hookName)` — fire spirit lifecycle hook on all spirits
     - `_computeRetriggerCount(card, triggerType, isFirstCardOfCapture)` — calculate retrigger counts
     - `effectivePower(spirit)` — stack count for regulars, powerLevel for negatives
     - `incrementPerElement(spirit, key, value)` — per-element state accumulation
     - `aggregateNumericState(spirit, key)` — sum across spirit's elements
     - `ACCUMULATOR_SPIRIT_IDS` — set of spirit IDs using accumulator state pattern
     - `applyHook(name, base, ...args)` — invoke hexagram hook with default

4. **Common interaction patterns**
   - "If you need X, use Y" recipes:
     - "Prevent flow decay" → return 1.0 from `modifyFlowDecay` hook
     - "Modify how a yaku triggers" → use `modifyYakuThreshold` hook
     - "Handle a discard event with all side effects" → call `_handleFieldDiscard(card)`
     - "Add per-stack-member state to a spirit" → add to ACCUMULATOR_SPIRIT_IDS, use per-element state
     - "Make a new hexagram effect" → declare a hook object in HEXAGRAM_EFFECTS
     - "Make a new spirit with engine semantics" → add `applyEngine` method in SpiritEffects.js
     - "Make a new spirit with per-card scoring" → add `onCardScored` method
     - "Make a new spirit with lifecycle behavior" → add `onRoundStart` or `onRoundEnd` method

5. **State models**
   - How `_allSpirits` differs from `activeSpirits`, `scoringSpirits`, etc.
   - Per-element state vs. shared spirit state
   - Captured-state vs. scoring-state (post-F5.0 audit)
   - Round-local vs. run-local state

6. **Anti-patterns / common mistakes**
   - "Don't write new flow decay logic — use modifyFlowDecay hook"
   - "Don't push to _allDiscards directly — call _handleFieldDiscard"
   - "Don't check spirit.id === X inline — use SpiritEffects.js entry"
   - Etc.

**Effort estimate:** 8-12 hours total:
- Codebase walkthrough to inventory hooks + helpers (~3-4h)
- Documentation writing (~4-6h)
- Cross-reference review against existing F-tasks (~1-2h)

**Pre-conditions for full quality:**

- F4.17 (discard pipeline unification) — finalizes `_handleFieldDiscard` as the single source of truth for discards
- F4.18 (capture-event dispatch consolidation) — finalizes the unified scoring entry point
- F4.20 (spirit logic migration to SpiritEffects.js) — finalizes spirit hook organization
- F4.22 (duplicate card ID handling) — finalizes card-instance identity model
- F5.0 (capture/scoring semantic audit) — finalizes capture vs scoring distinction

After these architectural cleanup tasks land, the catalogue can document the final state rather than a moving target. Running F4.24 BEFORE Phase 4 cleanup would mean documenting tech debt; running it AFTER produces the canonical reference.

**Optionally:** Some scaffolding can happen during Phase 2C/2D (hooks are stable enough). The full catalogue lands after Phase 4.

**When to schedule:** Late Phase 4 or early Phase 5 (after F5.0 capture/scoring audit but before F5.1 tuning). Could pair with F4.14 (doc reconciliation) since both are documentation work.

**Cross-references:**
- F4.14 (doc reconciliation — F4.24 may be a major section addition OR a companion doc)
- F4.17 (discard pipeline — catalogue documents the unified version)
- F4.18 (capture dispatch — catalogue documents the unified version)
- F4.20 (spirit migration — catalogue documents the migrated structure)
- F5.0 (capture/scoring audit — catalogue documents the post-audit semantics)
- All Phase 2C hex patches (reveal the patterns that should be catalogued)

**Philosophy note:** This is a "build the tool" task — the catalogue IS the tool that prevents future architectural drift. Worth investing the time once Phase 4 cleanup completes, because every future content addition (new spirit, new consumable, new hexagram) becomes faster and lower-drift with the catalogue in place.

### F4.25: Declarative spirit formula refactor — THREE-PLACE DUPLICATION (added 2026-05-22 from F2.5 design session; expanded 2026-05-22 from Phase B.1 implementation)

**The duplication problem:**

After F2.5 Phase B.1 ships, accumulator-spirit formula data is duplicated across **three** locations. Each place was added at a different point in the codebase's history with a different purpose, but they now redundantly encode the same information.

**Where the duplication lives (using `sym_algae` as illustrative example):**

| Location | Purpose | Contains |
|---|---|---|
| `ACCUMULATOR_INIT` (RunManager.js) | Declares initial per-element state shape | `summonCount: 0` (key name only) |
| `applyEngine` (SpiritEffects.js) | Computes regular + negative engine output | `summonCount` key, scaling `0.1`, mode `multiplyMult`, base `1` |
| `NEGATIVE_SNAPSHOT` (SpiritEffects.js) | Computes preTranscendTotal at transcend boundary | `summonCount` key, scaling `0.1`, mode `multiplyMult` |

**Drift risk:** Changing any scaling value (e.g., for F5.1 balance tuning) requires touching `applyEngine` AND `NEGATIVE_SNAPSHOT`. Forgetting one causes silent miscalculation across the transcend boundary.

**Affected spirits:** ~21 Cat 1 spirits (single-key + dual-key + exponential variants).

**Why this happened — organic growth, not bad design:**

- **ACCUMULATOR_INIT** existed first (Phase 0/1): declares "what state does a fresh spirit start with."
- **applyEngine** existed second (Phase 0/1): formula execution. Each spirit's math written inline for clarity.
- **NEGATIVE_SNAPSHOT** added in F2.5 Phase A (2026-05-22): captures pre-transcend output for the new Idea D negative semantics. Needed scaling+key+mode metadata that wasn't previously consolidated.

Each location is correct in isolation; the duplication only becomes visible when you observe that the formula structure (`base + aggregate × scaling`) is identical across applyEngine and NEGATIVE_SNAPSHOT.

**Cleaner architecture (target end-state):**

Each spirit declares a single `formula` metadata object. Both `applyEngine` and the negative snapshot derive from it via generic helpers.

**Sketch:**
```js
sym_algae: {
  formula: {
    type: 'linear_aggregate',
    key: 'summonCount',
    scaling: 0.1,
    base: 1,         // mult-mult uses 1, addMult uses 0
    mode: 'multiplyMult',
  },
  // applyEngine + snapshotForNegative auto-generated from formula above by helpers.
  // ACCUMULATOR_INIT also derives from formula.key (eliminates third duplication).
},
```

A generic `applyEngine(spirit, formula)` helper handles linear-aggregate spirits. Outliers (Velocity Cat 1' exponential, Cat 2/4 array-based, Cat 5 maturation) keep custom code or extend the schema.

**Trade-offs:**
- ✅ Single source of truth per spirit (eliminates all three duplications)
- ✅ Easier balance retuning (change scaling in one place)
- ✅ Better foundation for future accumulator spirits
- ✅ ACCUMULATOR_INIT becomes derivable, removing a second drift point
- ❌ Spirit definitions become more abstract (formula spec vs. literal math)
- ❌ Generic helper handles many variations — risk of complexity creep
- ❌ Cat 1' / Cat 2 / Cat 4 / Cat 5 still need custom code; refactor only helps Cat 1

**Why deferred from F2.5:**

F2.5's NEGATIVE_SNAPSHOT registry approach is the pragmatic MVP. The duplication is bounded (~21 spirits, simple values) and the natural ordering is:
1. F2.5 ships with three-place duplication (correctness over elegance)
2. F4.25 refactors to declarative formulas (eliminates duplication, builds tool for future)
3. F5.1 tunes balance values using the clean spec

Doing F4.25 before F2.5 ships would block player-facing fixes. Doing it after F5.1 means we tune in the messy world. Mid-Phase-4 is the sweet spot.

**Effort estimate:** 3-5 hours:
- Define `formula` schema (1 hour)
- Build generic `applyEngine` helper (1-2 hours)
- Build generic `snapshotForNegative` helper (30 min)
- Migrate ~21 Cat 1 spirits (1-2 hours, mostly mechanical)
- Update ACCUMULATOR_INIT derivation from `formula.key` (30 min)
- Verification across all Cat 1 spirits (30 min)

**Cross-references:**
- F2.5 (originating task — F4.25 cleans up tech debt introduced here)
- F4.24 (codebase architecture catalogue — F4.25's declarative spec should be documented there)
- F5.1 (threshold tuning — beneficiary of clean formula spec)

**When to schedule:** Mid-to-late Phase 4, after F4.17/F4.18/F4.20 land but before F4.24 catalogue finalizes (so catalogue documents the post-refactor state).

**Operational note for F2.5 implementation:** If a Cat 1 spirit's scaling value needs to change while F2.5 is being implemented (e.g., a typo or balance tweak surfaces during verification), remember to update BOTH `applyEngine` AND `NEGATIVE_SNAPSHOT`. Until F4.25 lands, these two locations must stay in sync manually.

### F4.26: Transcendence powerLevel semantics revisit — "all 4 contribute" alternative (added 2026-05-22 from F2.5 Phase A implementation)

**Background:** During F2.5 Phase A implementation, an inconsistency surfaced in transcendence semantics:

**Current behavior (Option A — locked for F2.5):**
- 4th stack member acts as a "transcendence catalyst"
- Only the first 3 elements contribute to the negative's state
- Negative powerLevel = 3 (= `stackCount - 1`)
- 4th element's state is discarded
- Amber transcendence is separate: powerLevel = stackCount (no catalyst, Amber IS the trigger)

**Alternative (Option B — logged for future):**
- All 4 stack members contribute to the negative
- Negative powerLevel = 4 (matches full stack count)
- Each element's state is preserved
- Stacking and Amber behave consistently (powerLevel = stackCount in both)

**Why this matters:**

Option B is mathematically cleaner — eliminates the powerLevel mismatch (stack of 4 collapses into powerLevel-3 negative). It also makes the catalyst element "count" rather than being discarded.

But Option B has gameplay implications:
- Negatives become more powerful (powerLevel 4 instead of 3)
- All formulas with `× powerLevel` scaling get boosted
- Stacking + transcending becomes more efficient
- Existing balance assumes powerLevel ≤ 3; would need rebalancing
- Cuckoo Egg currently has `Math.min(3, ...)` cap — change required

**Decision deferred:**

Robert raised interest in pursuing Option B (2026-05-22) but chose not to disrupt in-progress F2.5 implementation. F2.5 ships with Option A as-is; Option B is logged for Phase 4 evaluation.

**Scope of F4.26 work (if Option B is chosen):**

1. Update transcendence block in `_acquireSpiritStack`:
   - Change `snapshotPower = Math.min(3, existing.stackCount - 1)` to `snapshotPower = existing.stackCount` (or remove the `- 1`)
   - The cap at 3 may need to stay (max powerLevel = 3) or be lifted entirely
2. Update F2.5 snapshot helpers — remove the `slice(0, powerLevel)` and aggregate over ALL elements
3. Update Cuckoo Egg hatch logic — the `Math.min(3, matureStacks)` cap
4. Rebalance any spirit that becomes too powerful at powerLevel 4 (likely Algae, the symbionts, and the dual-key engines)
5. Update F2.5 documentation to reflect Option B math (preTranscendTotal computed over all elements)

**Pre-conditions:**
- F2.5 complete and verified (Option A baseline established)
- Some playtest data on negative power balance (to inform whether powerLevel 4 is desirable)

**Effort:** 2-4 hours for the architectural change + 4-8 hours for balance rework. Total 6-12 hours.

**Cross-references:**
- F2.5 (Phase A snapshot semantics)
- F5.1 (threshold tuning — may need to coordinate with this if F4.26 lands first)

**When to schedule:** Phase 4 architectural cleanup phase, after F2.5 ships and is verified. Best done before F5.1 tuning so balance work happens against the chosen powerLevel semantics.

### F4.27: Cat 5 maturation spirits — Past Life & Cuckoo Egg migration (added 2026-05-23 from F2.5 Phase B.6 recon, deferred from F2.5)

**Background:** F2.5 Phase B was originally scoped to convert all 29 accumulator spirits to Idea D semantics. 26 spirits were successfully converted (Phases B.1 through B.5). Past Life and Cuckoo Egg (Cat 5 maturation) were deferred during the Phase B.6 recon when implementation revealed architectural complexity beyond F2.5's scope.

**Current state of Past Life and Cuckoo Egg:**

Logic is spread across multiple files instead of being unified in SpiritEffects.js:

| Location | Code |
|---|---|
| SpiritEffects.js | Empty effect blocks (`util_past_life: {}`, `sym_cuckoo_egg: {}`) |
| RunManager.js | `_firePastLifeCopy`, `_addPastLifeCopy`, `_fireCuckooHatch` methods |
| GameScene.js @40042 | Sell handler with inline maturity logic (`run.round - el.acquiredRound >= 3`) |
| GameScene.js @60969 | Past Life tooltip duplicating maturity calculation |
| GameScene.js @65166 | Cuckoo Egg tooltip duplicating maturity calculation |

Maturity is computed in THREE places in GameScene alone. The spirit effect blocks are empty stubs while all behavior is imperative external code.

**Locked F2.5 design (preserved for F4.27 implementation):**

1. **Cat 5 maturation state shape:** `{roundsHeld: 0}` per element for regulars, `{numerator: X, denominator: powerLevel × 3}` for negatives
2. **Round-end increment:** Per-element `roundsHeld += 1` for regulars; `state.numerator += 1` for negatives
3. **Maturity check:** Regular: `el.roundsHeld >= 3`; Negative: `state.numerator >= state.denominator`
4. **Past Life sale, regular target:** Adds N stacks to target (may cascade-transcend), N = powerLevel of copier
5. **Past Life sale, negative target:** Creates parallel negative entry at COPIER's powerLevel with FRESH zero-state (no compounding) — locked as Option A
6. **Cuckoo Egg sale, regular Cuckoo:** Hatches Tier-2 fusion as a regular spirit at powerLevel = matureStacks (current behavior)
7. **Cuckoo Egg sale, negative Cuckoo:** Hatches NEGATIVE Tier-2 fusion at COPIER's powerLevel (currently broken — produces regulars regardless of source)

**Implementation challenges discovered during recon:**

1. **`_addPastLifeCopy` has a latent bug:** Creates negatives with `state: null`, which works for spirits without `applyEngine` (like Past Life itself) but would break Wildlife/Plenty/Radiance/Banner/Algae negatives. A proper `_freshNegativeState(spiritId, powerLevel)` helper is needed to generate category-appropriate zero state.

2. **Maturity logic duplicated across three GameScene locations:** Migration requires updating sell handler + two tooltip blocks consistently, or extracting to a `_isElementMature(spirit, element)` helper.

3. **`_fireCuckooHatch` regular-only behavior:** Needs refactor to accept source's negative status and powerLevel, producing negative fusions when source is negative.

4. **`acquiredRound` vs `roundsHeld` decision:** Currently `_freshAccumulatorElement` adds `acquiredRound` to every accumulator element. Adding `roundsHeld` is redundant if maturity can be computed from `run.round - acquiredRound`. Either approach works; pick one for consistency with F2.5's pattern (other Cat 5 negatives need `numerator/denominator` state, so the `onRoundEnd` increment pattern is needed regardless).

**Scope of F4.27 work:**

1. Add `onRoundEnd` hooks to Past Life and Cuckoo Egg spirit effect blocks
2. Migrate sale handler maturity logic from GameScene to a centralized helper (possibly on SpiritEffects or RunManager)
3. Update ACCUMULATOR_INIT for both spirits to track `roundsHeld` (if we go with explicit tracking) — or document `acquiredRound`-derived approach
4. Create `_freshNegativeState(spiritId, powerLevel)` helper using NEGATIVE_SNAPSHOT against synthetic empty elements
5. Update `_addPastLifeCopy` to use the new helper for negative state initialization
6. Refactor `_fireCuckooHatch` to be source-aware (regular or negative)
7. Update tooltips to use centralized maturity helper
8. Verification: Past Life transcend continuity preserved, Cuckoo Egg negative produces negative fusion at correct powerLevel

**Why deferred from F2.5:**

The F2.5 primary goal (Idea D transcendence continuity across accumulator spirits) is 90%+ achieved with 26/29 spirits. Past Life and Cuckoo Egg's transcend continuity gap is **edge-case** (rare for a player to stack 3 copies without selling them; these spirits don't generate score-mult directly). The full migration work belongs to F4.24's broader spirit-logic-migration scope, which establishes the proper pattern for ALL spirits with logic outside SpiritEffects.

Forcing this work into F2.5 would:
- Create patterns we'd then re-establish during F4.24
- Possibly create throwaway code if F4.24 chooses different architecture
- Significantly expand F2.5's scope (12-17 hours → 18-22+ hours)
- Provide minimal player-facing benefit relative to the engineering investment

**Cross-references:**
- F2.5 (parent task — F4.27 completes the remaining 2/29 spirit conversions)
- F4.24 (codebase architecture catalogue — F4.27 should follow F4.24's established patterns for spirit-logic migration)
- F4.25 (declarative formula refactor — Cat 5 spirits should fit into the unified `formula` spec)

**When to schedule:** Mid-Phase-4, after F4.24 establishes the spirit-logic-migration pattern. Best done before F5.1 tuning so balance work has a complete F2.5 implementation.

**Effort estimate:** 3-5 hours (less than originally projected for F2.5 B.6 because F4.24 will have established helpers and patterns).

### F4.28: Spirit stacking math audit + canonical pattern (added 2026-05-26 from Phase 2 testing observations)

**Background:** During Phase 2 closeout testing, multiple spirits were observed stacking MULTIPLICATIVELY where players may expect ADDITIVE behavior. Examples surfaced in E2a-5/6/7 testing:
- **Horizon:** 2-stack gives ×4, 3-stack gives ×8 (each stack member compounds the ×2 baseline)
- **Dream:** same multiplicative pattern
- **Hierarchy:** 2-stack with 2 ranks matched gives ×5.0625 (1.5⁴) — not the ×9 that "fires twice" would give

This is consistent with F2.5's `multiplyMult` semantics for accumulators (compounding pow(N) for the B-4 Memory/Mirror fix), but the broader question is: **what is the canonical stacking pattern for spirits?**

**Three patterns exist in the codebase:**
1. **Multiplicative compound:** Each stack member compounds the previous mult (Horizon, Dream)
2. **Additive scaling:** Each stack member adds a flat contribution (Devotion, Lincoln — engine spirits with `addMult`)
3. **"Fires N times" (per-scoring):** Each stack member fires the effect once per card (Movement, Echo)

**Scope:**
1. Audit every spirit with potential stack > 1. Categorize into one of the three patterns.
2. For each category, document the intended canonical behavior in V6 design doc
3. Identify outliers and decide: fix the spirit OR document the exception
4. Cross-reference with the B-4 fix's `_scaleEngineOutput` helper (currently uses pattern 1 for multiplyMult, pattern 2 for addMult/addPoints — should this be the canonical decision?)
5. Update tooltips to clearly communicate which pattern applies (e.g., "Stack of N: compounds N times" vs "Stack of N: +N× contribution")

**Effort:** 4-6 hours (audit + decision + light implementation tweaks; full balance retune is F5.1 territory)

**Cross-references:**
- B-4 (Memory/Mirror stacking) — established the `_scaleEngineOutput` helper that this audit codifies
- F4.24 (architecture catalogue — stacking math is part of the canonical reference)
- F4.25 (declarative formula refactor — stacking pattern should be a declarative property of each spirit)
- F5.1 (balance tuning — depends on stacking math being canonical first)

### F4.29: Hook-firing centralization audit (added 2026-05-26 from Phase 2 testing patterns)

**Background:** Multiple bugs surfaced during Phase 2 testing where specific code paths bypassed centralized helpers, resulting in failed-to-fire spirit hooks:
- **B-2 (fixed):** Horse zodiac bypassed Ship's `cardsDiscarded` increment
- **B-5 (fixed):** Third Eye Chakra bulk-filter bypassed `deleteCard`'s `_fireCardDestroyedEvent` → Wuji missed destruction events

Both bugs followed the pattern: "this code path mutates the deck/hand directly without calling the centralized helper that fires the relevant hooks." Other paths are likely affected.

**Scope:**
1. Inventory all code paths that mutate cards (deck, hand, field, discard pile)
2. Verify each routes through the centralized helpers (`deleteCard`, etc.) OR inlines the hook firing
3. Identify any remaining cases that bypass — likely candidates include:
   - Specific consumable effects (other zodiacs, alchemicals)
   - Specific chakra paths
   - Spirit-triggered destruction/discard (e.g., some legendaries)
4. Create new centralized helpers where they don't exist (e.g., `_discardHandCards(cards)` that combines stamp dispatch + Ship increment + any other hooks)
5. Document the pattern in V6 design doc + F4.24 architecture catalogue

**Effort:** 3-5 hours (audit + 2-4 new helpers + refactor of identified bypass paths)

**Cross-references:**
- B-2, B-5 (origin bugs — both fixed by inlining the missing hook in the bypass path)
- F4.17 (Discard pipeline unification — closely related, may merge)
- F4.18 (Capture-event dispatch consolidation — same pattern, different event type)
- F4.24 (architecture catalogue)

### F4.30: Gankyil auto-capture threshold + spirit reconsideration (added 2026-05-26 from Phase 2 testing bug B-6)

**Background:** Gankyil's 3-stack auto-capture threshold reduction doesn't fire (B-6, C-16 test failed). Player reconsidering whether Gankyil should remain in the legendary roster.

**Decision needed:**
- (a) Fix Gankyil's hook wiring (likely `modifyAutoCaptureThreshold` or similar — the spirit's effect block declares the hook but GRM's auto-capture check doesn't query it)
- (b) Remove Gankyil from the legendary roster (per Robert's reconsideration)
- (c) Replace with a different mechanic

**If (a):**
- Find GRM's auto-capture threshold check
- Verify it calls `applyHook('modifyAutoCaptureThreshold', 4, 4)` or equivalent
- Wire Gankyil's effect block to that hook name
- Effort: 1-2 hours

**If (b)/(c):**
- Update SPIRIT_CATALOG to remove or replace
- Document in V6 design doc
- Verify no other spirit references Gankyil
- Effort: 1-2 hours

**Cross-references:**
- B-6 in PHASE_2_TESTING.md
- PostD9c-15 (Gankyil currently the ONLY Sacred Grove Legendary pool member — removal would need replacement or pool restructuring)

### F4.31: Snow/Ice and Clay/Pottery proc timing (added 2026-05-26 from Phase 2 testing bugs B-7 and B-8)

**Background:** Two related Wu Xing tier-1/tier-2 proc-timing issues surfaced during PostD1 testing:
- **B-7:** Snow/Ice depreciation fires at round end, not after each use (per player expectation)
- **B-8:** Clay/Pottery procs per scoring event, not at round end (per design doc — but possibly correct since Fossil's tier-aware tracking is per-proc)

**Scope:**
1. Re-read design doc V5 for the canonical timing intent of each
2. For Snow/Ice: determine whether depreciation should be per-use or per-round; align implementation
3. For Clay/Pottery: determine whether the issue is the ki credit timing (already once-per-round per F2.D.x Test 2) or Fossil's increment timing (currently per-proc — possibly correct)
4. Cross-reference with hex_06 Sòng bank cost ordering (F2.D.x established Earth interest computes AFTER Sòng cost)
5. Update implementation OR design doc to match (whichever is canonical)

**Effort:** 2-3 hours (mostly design clarification; implementation changes are small if needed)

**Cross-references:**
- B-7, B-8 in PHASE_2_TESTING.md
- F2.D.x Test 2 (verified Earth interest credit timing)
- F4.14 (Design Doc V5 reconciliation — V5 should canonically answer these timing questions; V6 should bake the answers in)

### F4.32: Silk anti-stranding scope verification (added 2026-05-26 from Phase 2 testing bug B-10)

**Background:** Silk anti-stranding appears to only fire in the deck-flip-lock scenario, not other stranding scenarios (B-10, surfaced by PostD2-3, blocked further Silk testing PostD2-4 through PostD2-11).

**Scope:**
1. Find Silk's anti-stranding implementation
2. Compare against the F2.10c/PostD2 design that introduced multiple stranding scenarios
3. Determine if narrow scope is intentional (current design) or regression from wider intent
4. If regression: extend Silk's effect to cover additional stranding scenarios
5. If intentional: update PostD2-4 through PostD2-11 tests to match the actual scope, and verify them
6. Update design doc with clarified Silk scope

**Effort:** 2-3 hours (recon + decision + possible implementation expansion)

**Cross-references:**
- B-10 in PHASE_2_TESTING.md
- F2.10c (stamp visualization — Silk's design context)
- PostD2-4 through PostD2-11 (deferred Silk tests)

### F4.33: Festival per-round cap + proportional threshold deck-size scaling (added 2026-05-26 from Phase 2 testing bugs B-13 and B-14)

**Background:** Two balance/formula issues surfaced during PostD8/PostD9a testing:
- **B-13:** Festival has no per-round cap on stamp generation — potentially too powerful per player observation
- **B-14:** Proportional yaku thresholds locked to 48-card deck — at smaller deck sizes, all proportions rise, making yaku disproportionately punitive

**Scope:**

**Part 1: Festival per-round cap**
- Decide: cap per round (e.g., max 3 per round), cooldown between activations, or scale output down
- Implement chosen cap in Festival's effect block
- Update tooltip to communicate the cap
- Possibly F5.1 territory if it's a balance-tuning decision

**Part 2: Deck-size-aware proportional thresholds**
- Find `getProportionalYakuThreshold` in `/src/data/yakuThresholds.js`
- Replace any hardcoded `48` with `run.getDeck().length` (live deck size)
- Verify the desired behavior: "yaku ratios scale with deck" vs "yaku absolute counts scale with deck"
- Update related tooltips/UI if needed

**Effort:** 2-4 hours (Part 1 design-dependent; Part 2 is concrete code change)

**Cross-references:**
- B-13, B-14 in PHASE_2_TESTING.md
- PostD8-8 through PostD8-14 (Festival tests)
- PostD9a (proportional thresholds — all passing in current implementation but at 48-card baseline only)
- F5.1 (balance tuning — Festival cap is balance-adjacent)

### F4.34: Water depreciation source-of-truth consolidation (added 2026-05-29 from F3.7 recon)

**Background:** During F3.7 (badge consolidation) recon, two parallel sources of truth for Snow/Ice depreciation multipliers surfaced:

1. **ScoringEngine.js exports `SNOW_MULT` and `ICE_MULT` constants:**
   ```js
   export const SNOW_MULT = [2.0, 1.75, 1.5, 1.25, 1.0, 0.75, 0.5];
   export const ICE_MULT  = [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.25];
   ```
   Used by the scoring math itself.

2. **HexagramEffects.js exports `getWaterMult(tier, depLevel)`:**
   ```js
   export function getWaterMult(tier, depLevel) {
     const base  = tier === 'upgraded' ? 4.0 : 2.0;
     const floor = tier === 'upgraded' ? 0.25 : 0.5;
     const rate  = applyHook('modifyWaterDepreciation', tier === 'upgraded' ? 0.5 : 0.25, tier);
     return Math.max(floor, base - (depLevel ?? 0) * rate);
   }
   ```
   Used by tooltips (post-F3.6) and badges (post-F3.7). Responds to the `modifyWaterDepreciation` hook.

**The discrepancy:** At zero hex modifiers, both paths produce identical values. But if any hexagram modifies `modifyWaterDepreciation`, **the badge/tooltip display will reflect the modifier while the actual scoring math won't** — silently producing inconsistent player-facing math.

This is a **latent bug**, not currently triggering in normal play (no shipped hex appears to use `modifyWaterDepreciation`), but ready to fire as soon as such a hex is added or activated.

**Scope:**

1. Find every consumer of `SNOW_MULT` / `ICE_MULT` in ScoringEngine.js (and anywhere else they're imported from ScoringEngine)
2. Route each consumer through `getWaterMult(tier, depLevel)` instead
3. Remove the `SNOW_MULT` / `ICE_MULT` exports from ScoringEngine.js (or keep as deprecation-tagged, depending on import surface)
4. Verify scoring math at various depLevels still matches the pre-fix output (regression check)
5. Verify a hex modifying `modifyWaterDepreciation` now propagates to BOTH display AND scoring

**Effort:** 1-2 hours (small refactor; well-defined endpoints)

**Cross-references:**
- F3.6 (added `getWaterMult` usage in tooltips)
- F3.7 (added `getWaterMult` usage in badges)
- F4.24 (architecture catalogue should document this as the canonical "depreciation source" pattern; same pattern may apply to other element multipliers if they have similar parallel exports)
- B-7 (Snow/Ice depreciation timing — separate concern, but adjacent area)
- F2.6.b/Phase 2C — hex_43/48 water-related hexagrams (the hooks this fix enables full propagation for)

### F4.35: Scene rendering unification — GameScene ↔ ShrineScene shared module (added 2026-05-29 from F3.24 recon)

**Background:** During F3.24 recon (cross-scene interaction consistency), recon revealed substantial byte-for-byte identical rendering code duplicated across GameScene and ShrineScene. Both scenes independently implement ~80% of the same rendering pipeline:

- Spirit fan rendering (regulars + legendaries) with rotated SPIRITS/LEGENDARIES labels
- Spirit card visual treatment (rarity-colored borders, name truncation, etc.)
- Consumable rendering structure
- Layout constants (SPIRIT_FAN_LEFT, SPIRIT_Y, etc.) — duplicated as constants in each scene file
- **(added 2026-05-29 from F3.5):** Fan-out infrastructure (`_expandSpiritStack`, `_renderExpandedCard`, peek-card rendering) — F3.5 ports this from GameScene to ShrineScene as targeted duplication; F4.35 absorbs both copies into shared module

F3.24 and F3.5 took targeted-helpers approaches (extract tooltip builder, duplicate sell button, duplicate fan-out) to ship the player-visible fixes without committing to the larger refactor. F4.35 completes the architectural unification.

**Scope:**

1. **Audit identical/near-identical rendering blocks** between GameScene and ShrineScene. Specifically:
   - Spirit fan rendering (`_renderSpirits` in GameScene vs whatever the equivalent is in ShrineScene)
   - Legendary spirit fan rendering
   - Consumable rendering
   - **Fan-out / peek-card rendering** (`_expandSpiritStack`, `_renderExpandedCard` — duplicated to ShrineScene during F3.5)
   - Rotated column labels (SPIRITS, LEGENDARIES, CONSUMABLES)
   - Layout constants (SPIRIT_FAN_LEFT, SPIRIT_W, SPIRIT_H, etc.)
   - **Consumable sell button** (duplicated to ShrineScene during F3.24)

2. **Decide the extraction pattern.** Two reasonable approaches:
   - **Shared module:** `/src/scenes/shared/SpiritRenderer.js` etc. Each scene imports and calls helper functions. Functions return Phaser game objects which the scene tracks for cleanup.
   - **Base class:** `BaseGameScene extends Phaser.Scene` with the shared rendering as methods. GameScene and ShrineScene extend the base.
   
   Decide based on how much state the rendering needs to access (`this._spiritObjs`, `this._round`, drag state, etc.). If state is heavy, base class. If state is light, shared module with explicit parameters.

3. **Extract the shared rendering** into the chosen structure. Replace inline implementations in both scenes with calls to the shared code.

4. **Verify behavior parity** — both scenes render identically to their pre-refactor versions for the shared portions. Differences should be only in scene-specific parts (interaction handlers, shop quadrants, etc.).

5. **Eliminate the targeted duplications** from F3.24 and F3.5:
   - Consumable sell button (currently duplicated in both scenes after F3.24)
   - Fan-out infrastructure (`_expandSpiritStack`, `_renderExpandedCard`, related state like `_expandedStack` / `_expandedShrine`) — duplicated after F3.5

**Effort:** 10-15 hours (revised upward from 8-15 originally — F3.5's fan-out duplication adds to the scope). Large because it's a careful refactor of UI code with high regression risk — both scenes must continue rendering correctly.

**Pre-conditions:**
- F3.4, F3.5, F3.10, F3.24 all complete (so we're not refactoring code that's about to change)
- Possibly F3.21 (deck-view overlay redesign) complete to avoid touching its area twice

**Targeted duplications to eliminate (current snapshot):**
- F3.24: consumable sell button duplicated in ShrineScene's `_drawPersistentConsumables`
- F3.5: fan-out methods `_expandSpiritStack`, `_renderExpandedCard`, per-element hover handlers — duplicated in ShrineScene
- (Pre-existing) `_drawPersistentSpirits` / `_renderSpirits` shared rendering
- (Pre-existing) Layout constants in both scene files

**Cross-references:**
- F3.24 (player-visible fixes; ship first to deliver value; this task eliminates the duplication those fixes created)
- F3.5 (per-element tooltip mode + ShrineScene fan-out — additional duplication this task absorbs)
- F4.24 (codebase architecture catalogue — should document the scene rendering pattern here as canonical)
- F4.16 (system reorganization — spirit logic seepage; analogous problem at a different layer)

### F4.36: Effect-code migration to read from spirits.js tooltipBase fields (added 2026-05-29 from F3.5b decision)

**Background:** F3.5b establishes `tooltipBase` fields in spirits.js as the canonical source of truth for spirit base values used in tooltips (e.g., Pollen's `tooltipBase.points = 20`). However, the effect code in SpiritEffects.js (and possibly other locations) still hardcodes these same values inline (e.g., `cardPoints += 20` for spring cards).

To preserve single source of truth, the effect code must be updated to read from `getSpiritDef(id).tooltipBase` rather than carrying duplicated constants. F3.5b deferred this migration to avoid bundling tooltip-only changes with score-influencing effect changes (which would have made debugging post-shipment regressions much harder).

**Scope:**

1. **Audit hardcoded base-value sites in effect code.** Sites are flagged during F3.5b shipment with `TODO(F4.36)` comments referencing the canonical `tooltipBase` field. Catalog all such sites.

2. **Replace each hardcoded value** with `getSpiritDef(spirit.id)?.tooltipBase?.<field> ?? <fallback>` reads. The fallback value should match the hardcoded value to preserve behavior if the field is missing.

3. **Verify no behavior change.** Both the tooltip AND the effect code should now compute identical values. Run a focused testing pass on F3.5b-covered spirits to confirm.

4. **Document the pattern** in F4.24's architecture catalogue. The "single source of truth" pattern (data declares value; effect + tooltip both read from data) is broadly applicable.

5. **Verify Lincoln's "bank without pushing" clause.** F3.5b's description for engine_lincoln specifies "+0.1 additive mult each time you bank without pushing." If the implementation increments on any bank (including post-push banks), this is a mechanic bug to fix as part of F4.36 since it's effect-code territory.

**Pre-conditions:**
- F3.5b complete (tooltipBase fields established)
- F4.16 / F4.20 (spirit logic migration to SpiritEffects.js) ideally complete to centralize the migration target

**Effort:** 3-5 hours. Mechanical refactor across ~40 spirits, with the Lincoln verification adding a small dynamic-state test.

**Cross-references:**
- F3.5b (parent — established the tooltipBase fields)
- F4.20 (spirit logic centralization — same migration target)
- F4.28 (stacking math audit — F3.5b's "display additive" approach may surface stacking inconsistencies that need similar source-of-truth fixes)

### F4.37: Post-consolidation tooltip recomb across all spirits (added 2026-05-29 from F3.5b shipment observations)

**Background:** F3.5b attempted to update tooltips for ~40 spirits in a single pass, ahead of the broader architectural consolidation (F4.16, F4.20, F4.24, F4.36). The shipment partially landed — many tooltips work correctly, but several have visible drift bugs that surfaced immediately during testing:

- **decay_pear:** Base points scale with stack (`+150 → +300 at 2-stack`) but decay rate doesn't (`loses 5 per round` regardless of stack)
- **econ_coupon:** Shows static "15%" even at 2-stack (should show 30%)
- (Other spirits may have similar latent drift — full audit deferred to this task)

The root cause is structural: **tooltip code and effect code are maintained in separate locations with no enforced consistency.** Each individual tuning change risks introducing drift. F3.5b's targeted dispatch branches are the best we can do until effect code and tooltip data share a single source of truth.

**Pre-conditions (all required):**

- **F4.16 / F4.20:** Spirit logic migration to SpiritEffects.js. Spirit effect code currently lives in scattered locations; the consolidation makes the "single source of truth" approach achievable.
- **F4.24:** Architecture catalogue. Documents the canonical patterns for hooks, effects, and tooltip data.
- **F4.36:** Effect-code migration to read from `tooltipBase` fields. After this, hardcoded constants in effect code are eliminated in favor of declarative `spirits.js` data.
- **F4.28:** Stacking math audit. F3.5b's "display additive even where code compounds" principle exposed several stacking inconsistencies; the audit normalizes them.

**Scope:**

1. **Comb through every spirit's tooltip** after the architectural consolidation is complete.
2. **Verify each dispatch branch** computes the correct stack-aware value for every field in `tooltipBase` (not just the primary one — Pear's `lossPerRound` and Coupon's `discountPct` are examples of secondary fields that drifted in F3.5b).
3. **Re-evaluate deferred spirits** from F3.5b (Grace, Piggy Bank, Mirror, Memory, Festival, Print, Past Life, Caterpillar, Ducks) — by this point their mechanics should be settled, and their tooltips can be added.
4. **Verify the dispatch model itself remains the right pattern**, or consider migrating to a declarative `tooltipTemplate` field per spirit (e.g., spirit's data declares `tooltip: (n) => \`+${20*n} points per...\`` rather than tooltipTooltip.js holding the dispatch).
5. **Test all tooltips against live game state** with multiple stack counts. Document a verification checklist for future tooltip changes.

**Effort:** 4-6 hours after pre-conditions complete. Lower than F3.5b's original estimate because the architectural foundation eliminates the drift risk.

**Why defer rather than fix now:** Patching individual drift bugs piecemeal (fix Pear's decay, fix Coupon's discount, find the next three the next day...) treats symptoms while the cause remains. The cause is structural; the cure is structural. Fixing individual spirits now adds work that F4.37 will redo. Better to accept some tooltip drift during Phases 3-4 testing and address it once, comprehensively, after consolidation.

**Cross-references:**
- F3.5b (parent — established the tooltip dispatch pattern)
- F4.16, F4.20, F4.24, F4.36, F4.28 (pre-conditions)

### F4.38: Wu Xing enhancement effect code consolidation (added 2026-05-29 from F3.7c recon)

**Background:** During F3.7c recon (proc event surfacing for Snow/Ice depreciation, Ember/Charcoal break, Clay/Pottery interest, Meteorite jackpot), the recon failed to locate the actual proc-firing sites despite searching across ScoringEngine, RunManager, HexagramEffects, SpiritEffects, ConsumableEffects, Round, Capture, and Deck. The configuration values and getter functions are in HexagramEffects.js (`getFireBreakChance`, `getMeteoriteJackpotChance`, `getWaterMult`, etc.), but the actual proc execution logic — incrementing `depLevel`, rolling `Math.random() < breakChance`, mutating card state — is genuinely scattered or hidden behind unfamiliar terminology.

This mirrors F4.16's "spirit logic seepage" pattern at a different layer. Wu Xing enhancement effect code is **fragmented across multiple files with no central location**, making it hard to:
- Find proc-firing sites for UI feedback (F3.7c)
- Audit timing inconsistencies (Robert flagged 2026-05-29: Snow/Ice depreciation and Ember/Charcoal break currently fire at round-end, when ideally they'd fire post-scoring pre-capture — a real bug awaiting this consolidation)
- Verify state-mutation correctness (depLevel increments, break rolls, interest procs)
- Modify or rebalance enhancement mechanics without checking many files

**Scope:**

1. **Audit Wu Xing proc-firing sites** across the codebase:
   - Water depreciation: where does `card.enhancement.depLevel` get incremented after each use? (Snow depreciation, Ice depreciation — distinct events)
   - Fire break: where does the `Math.random() < breakChance` roll happen for Ember and Charcoal cards? What state mutation results from a break (card destroyed? enhancement removed? card kept?)
   - Earth interest: where does Clay/Pottery's per-use interest proc fire? How does it propagate to ki rewards?
   - Metal jackpot: where does Meteorite's jackpot roll happen and ki bonus apply?
   - Wood slot-creation / silk anti-strand: these are NOT proc events per Robert (already visually apparent), but their effect logic is likely scattered too — audit for completeness.

2. **Consolidate to a central location.** Options:
   - **New file `/src/systems/EnhancementEffects.js`** mirroring SpiritEffects.js pattern — declarative per-enhancement handlers (Snow, Ice, Ember, Charcoal, Clay, Pottery, Iron, Meteorite, Leaf, Silk).
   - **Extend HexagramEffects.js** to host the effect logic alongside its existing configuration getters. Adds responsibility but keeps Wu Xing config + execution in one file.
   
   Decide based on file sizes and conceptual fit. SpiritEffects pattern is well-established and likely the better model.

3. **Fix timing inconsistencies** flagged 2026-05-29:
   - Snow/Ice depreciation should fire post-scoring, pre-capture (not at round-end as currently)
   - Ember/Charcoal break should fire post-scoring, pre-capture (not at round-end as currently)
   - Other proc timings should be audited for similar drift

4. **Emit events for UI consumption.** After consolidation, each proc site emits a structured event (e.g., `{ type: 'water_depreciation', tier: 'base', card: 'january_crane' }`) that F3.7c's UI can consume cleanly.

5. **Unify capture and field-end scoring paths.** F3.7b duplicated the per-card enhancement/edition/hex/spirit-hook logic from the capture scoring path into `_scoreFieldCards` (intentional duplication, preserved here to ship F3.7b's log visibility). Both paths fire `card_points` events identically and apply the same math; consolidating them eliminates a real source of drift risk.

   **Sub-tasks during this consolidation:**
   - Extract the per-card scoring loop into a shared helper (e.g., `_scoreCard(card, context)`) called by both capture and field-end paths.
   - **Remove the dead `field_score` case from `_animateScoringEvent` in GameScene.js** (added during F3.11a; never fires because `_scoreFieldCards` emits via `_onScoringStep` as `capture_complete`, not `field_score`. The `field_score` entry exists only in `_scoringEvents` for the round-end overlay's capture summary list).
   - Decide whether field-end scoring should have a distinct visual signal (e.g., a "Field Scoring" banner before per-card animations begin) or remain visually identical to capture scoring as it does today. F3.7b deemed the visual signal unnecessary; revisit during consolidation if appropriate.

**Pre-conditions:**
- F4.16 (spirit logic seepage) complete — establishes the consolidation pattern Wu Xing should mirror
- F4.18 (capture-event dispatch consolidation) ideally complete — clarifies the post-scoring pre-capture timing boundary

**Effort:** 8-12 hours. Audit + consolidation + timing fixes + event emission + scoring-path unification + dead-code cleanup. Revised up from 6-10h to absorb F3.7b's duplicated scoring path consolidation.

**Unblocks:**
- F3.7c (Wu Xing proc event surfacing UI) — can ship cleanly once events emit from a central location
- F3.11b (per-source enhancement contribution emissions) — also benefits from consolidated emission points
- Future Wu Xing balance work — can iterate values without grepping multiple files
- Phase 5 enhancement visual overhaul — single source of truth for animations to hook into

**Cross-references:**
- F4.16 (spirit logic seepage — same pattern at spirit layer)
- F4.31 (Snow/Ice and Clay/Pottery proc timing) — directly absorbed by this task; this consolidation IS where that timing fix happens
- F3.7b (parent of the duplicated scoring path — F3.7b shipped log visibility; F4.38 consolidates the duplication)
- F3.7c (deferred consumer of this work — Wu Xing proc events)
- F3.11b (deferred consumer of this work — per-source enhancement contribution emissions)
- F3.5b (analogous lesson: building UI before consolidation creates churn)

---

## Phase 5: §17 deferreds (60-100+ hours)

These are the demo-readiness blockers. Phase 1-4 establishes correctness; Phase 5 builds the actual demo experience.

### F5.0: Capture vs Scoring semantic audit (added 2026-05-15 from Phase 2C hex_01 testing, moved from F2.11)

**Background:** During Phase 2C hex_01 Qián (`score_field_at_round_end`) testing, a fundamental semantic distinction surfaced that had been latent in the codebase: **"capture" and "scoring" have been used synonymously**, but under hex_01 they decouple. Cards captured during the round don't score. Cards on the field at round-end score but aren't captured.

This is the first hexagram where capture ⇔ scoring breaks. Future hexagrams discovered in Phase 2C (hex_30, hex_51, hex_52, hex_57, hex_58, hex_29) may also expose similar divergence in different ways. Each hexagram receives a **partial fix during Phase 2C** to be functional; comprehensive semantic classification is deferred to F5.0.

**Why F5.0 (start of Phase 5, not Phase 2):**

Phase 4 architectural cleanup provides the foundation needed for this audit:
- **F4.18** (capture-event dispatch consolidation): unifies multiple scoring code paths into one entry point, making "capture" and "scoring" identifiable as distinct events in code
- **F4.20** (spirit logic migration to SpiritEffects.js): centralizes spirit effects, making classification much more tractable
- **F4.22** (duplicate card ID handling): clarifies card-instance identity, foundational for capture event tracking
- **F4.23** (sale-price architecture): establishes per-element state extension patterns that the capture/scoring distinction may need

Running this audit BEFORE Phase 4 would mean classifying spirits whose code is about to be reorganized. Running it AFTER Phase 4 (start of Phase 5) gives a clean foundation. Running it BEFORE the rest of Phase 5 ensures all subsequent tuning + content work uses correct semantics.

**The semantic split:**

- **Capture events:** Cards move field → capture pile, captured-state accumulates, yaku detection runs against captured set.
- **Scoring events:** Points computed and added to running score. Reads captured-state but doesn't necessarily produce more.

Under normal play, these are coupled — a capture event IS a scoring event. Under hex_01 (and possibly other hexagrams), they decouple.

**Robert's design intent (locked 2026-05-15):**

- **Additive and mult-mult engines should still apply to scoring** in any scoring context. Wildlife, Devotion, Wolf, Wind, etc. contribute when their cards score, regardless of whether scoring is via capture or field-end.
- **Captured-state accumulators should still increment on captures** — even if those captures don't score under a divergent hexagram. State updates happen on capture events; engines fire on scoring events.
- **Capture-trigger retriggers and stamps fire only on actual capture events** — Dew/Wish/Family/Rainbow retriggers, capture-trigger stamps (Yellow/Orange/Green/Blue/Purple/Black/Red), Echo.
- **Yaku detection runs on capture events**, but yaku-driven scoring requires the scoring path to be active. Under capture/scoring divergence, this means yaku may "fire" structurally without contributing score.

**Scope of the audit:**

For each of the ~113 spirits and ~30 consumables, classify by:

1. **State accumulation context:** Capture event, scoring event, round-start, round-end, shop visit, ki spent, etc.
2. **Scoring contribution context:** Capture event only? Scoring event only (works under hex_01 field-end)? Both? Other?
3. **State scope:** Per-capture-event, cumulative across run, per-round, per-stack-member, etc.

Each classification becomes part of the spirit's metadata (likely a `triggers` or `contributesAt` field on the SpiritEffects entry).

**Concrete classifications to verify (incomplete list):**

- **Wildlife:** State += per capture event. Scoring via applyEngine, per scoring event. Under hex_01: state accumulates during round captures, applies at field-end scoring.
- **Devotion:** Same pattern as Wildlife.
- **Wolf:** No state. Scoring via onCardScored per-bright-scored. Under hex_01: fires per bright at field-end scoring only.
- **Wind (rank engine):** No state. Scoring via onCardScored per-air-scored. Same as Wolf.
- **Dew:** Capture-trigger retrigger spirit. Under hex_01: doesn't fire on captures (no scoring math), doesn't fire on field-end (not a capture event).
- **Echo:** First-card-of-capture retrigger. Under hex_01: doesn't fire on field-end.
- **Irrigation:** onCardScored writes permanent mutation + immediate bonus. Under hex_01: doesn't fire on captures (no scoring math); permanent mutations from prior captures DO apply if those cards reach field-end.
- **Bonds, Ingot, Grace, etc.:** Operate outside scoring. No hex_01 interaction.
- **Echo, Replica, Collector:** Lifecycle hooks (round-start, round-end). Work normally under hex_01.

**Likely code-level fixes:**

After the audit, some spirits may be miscategorized — designed for "scoring" but coded as "capture" or vice versa. These need code corrections. Estimate ~5-10 spirits will need adjustment, with stamps and retriggers possibly needing more.

**Documentation work:**

Doc §7 needs a new sub-section clarifying "Capture vs Scoring" — explaining the distinction, when they coincide (normal play) and when they diverge (hex_01 and any other Phase 2C-surfaced hexagrams).

**Effort estimate:** 10-15 hours total:
- Spirit-by-spirit classification (~3-5h)
- Consumable classification (~1-2h)
- Code corrections for miscategorized spirits (~3-5h)
- Doc updates (~2-3h)
- Verification playtest under hex_01 and other relevant hexagrams (~2-3h)

**Pre-conditions:**

- F4.18 (capture-event dispatch consolidation) — must precede F5.0
- F4.20 (spirit logic migration) — should precede F5.0
- F4.22 (duplicate card ID handling) — may precede F5.0 or run in parallel
- All Phase 2C verifications complete — provides input data on which hexagrams have semantic divergence

**Interim state (Phase 2C and Phase 3-4):**

Hexagrams that surface capture/scoring divergence receive partial fixes during Phase 2C. These make the hexagrams functional with the obvious behaviors (engine spirits work, per-card scoring spirits work) and defer semantic edge cases (retriggers, capture-trigger stamps under divergent hexagrams) to F5.0.

Effect on playability between Phase 2C and F5.0: hexagrams are playable but may have subtly incorrect spirit interactions. F5.0 fixes them definitively.

**Cross-references:**

- Phase 2C hex_01 partial fix (the trigger for this scope)
- F2.4 (tooltip + engine audit — Phase 2D, may surface additional spirits needing classification)
- F4.14 (doc reconciliation — F5.0 adds new doc sections)
- F4.18 (capture-event dispatch consolidation — F5.0's architectural foundation)
- F4.20 (spirit logic migration — F5.0's organizational foundation)
- F4.22 (duplicate card ID — F5.0's identity foundation)
- Future Phase 2C findings: hex_57, hex_29, hex_52, hex_30 may surface further divergences

---

### F5.0a: Double-trigram hexagram redesign overhaul (added 2026-05-15 from Phase 2C verification work)

**Background:** Phase 2C verified all 7 effect-bearing double-trigram hexagrams. Each was made mechanically functional via partial fixes, but several need genuine design completion or architectural restructuring that exceeds Phase 2C's surgical-patch scope. This task bundles those design/architectural needs into a single coordinated overhaul, scheduled after Phase 4 cleanup lands so the work happens on a clean foundation.

**Per-hexagram findings from Phase 2C verification:**

**hex_01 Qián (`score_field_at_round_end`):**
- ✅ Patched + Verified: engine + per-card spirits fire at field-end scoring
- 🔲 Deferred: retrigger logic, universal stamps, capture-trigger stamps at field-end — pending F5.0 capture/scoring audit
- Status: mechanically functional, semantic refinement needed via F5.0

**hex_30 Lí (`one_yaku_disabled`):**
- ✅ Patched + Verified: random no-repeat selection, no threshold compensation
- 🔲 Possible F5.1 toggle: switch to pure random (Option A) if Option B feels too easy
- Status: complete, F5.1 may revisit difficulty

**hex_51 Zhèn (`deck_flip_revealed`):**
- ✅ Patched + Verified: unified reveal-miss with `_handleFieldDiscard`, push re-peek
- ✅ Architecture: F4.17 COMPLETE (2026-06-06) — reveal-miss + Horse/Monkey/Ox/hand-overflow all route through canonical `_discardCard`
- Status: complete (F4.17 unification done)

**hex_52 Gèn (`yaku_ends_round`):**
- ✅ Patched + Verified: `modifyFlowDecay: () => 1.0` keeps late-game viable
- 🔲 Design completion: hexagram feels "mechanically thin" compared to transformative hexagrams. Candidate directions (Mountain endurance / Mountain weight / Mountain accumulation) logged in F5.1.
- Status: mechanically functional, design completion in F5.1

**hex_58 Duì (`play_two_cards`):**
- 🟡 Design locked, patch deferred: Reading 1 ("Two plays, one resolution moment") requires multi-pending-slot support in FieldManager
- **Architectural blocker:** FieldManager assumes single pending slot at a time. `getPendingSlot()` and `hasPendingMatch()` operate as singular. Implementing Reading 1 means changing this assumption across every callsite and the flip-resolution logic.
- **Known bugs:**
  - Play 1 pending resolves at start of Play 2 (lines @25111-@25217 in GRM), preventing deck flip from interacting with Play 1's match
  - Two same-month hand cards to empty slot don't auto-capture under hex_58 (related to pending state mismanagement)
- **Robert's locked design:** Both plays remain pending until deck flip resolves. Deck flip can interact with EITHER play's pending state OR neither. If neither, flip goes to empty slot or discards.
- **Same-month-stack interpretation locked (2026-05-15):** Play 1 + Play 2 same month → both stack into the same pending slot (Interpretation A). This makes hex_58 strategically interesting: playing different months in plays 1 + 2 gives multiple opportunities for deck flip to bank a capture, while playing the same month puts all eggs in one basket.

**hex_57 Xùn (`match_by_adjacent_month`):**
- 🟡 Mechanically partially functional, deep architectural issues identified during Phase 2C verification (2026-05-15)
- **Working:** Wraparound (Dec ↔ Jan), same-month NOT matching (correct rule), distant-month not matching, yaku detection, push/bank
- **Broken (cascade of related bugs from same root cause — FieldManager's same-month stacking assumption):**
  - **Initial deal:** stacks cards by same-month grouping (same as hex_29 issue)
  - **3-stack lock fails:** May + June played as match → flip is July → should lock as 3-stack; instead auto-captures May+June and July takes the empty slot
  - **Empty-slot placement broken:** Playing June with no May on field should go to empty slot; instead stacks on top of a July card
  - **Cross-slot merging:** Cards merge across slots when adjacency criteria satisfied — February on March stack somehow merges with January in a different slot, producing scrambled month order (March-on-February-on-March-on-January-type chains)
  - **Auto-capture from scrambling:** Cross-slot merging creates stacks of 4+, which auto-capture incorrectly (as if they were a single-month set)
- **Root cause:** `overridesCaptureRule()` only overrides the matching CHECK. It does NOT override:
  1. Slot-stacking semantics (still keyed to same-month)
  2. Pending state semantics (still keyed to same-month completion)
  3. Auto-capture trigger semantics (still keyed to same-month full set)
  4. Find-matching-slot semantics for hand plays (creates incorrect cross-slot merges)
- **Scope under F5.0a:** Fix is genuinely architectural — FieldManager's slot management must be parameterized on the active capture rule.

**hex_29 Kǎn (`match_by_rank`):**
- 🔲 Untested in current session; F2.2.x is logged for the redesign work
- Initial board stacks by month, matching is by rank — fundamentally incoherent until initial deal logic respects matching rule
- **Likely shares the same family of bugs identified in hex_57:** Cross-rank merging, wrong pending semantics, etc.
- F2.2.x scope now BUNDLED into F5.0a — F2.2.x is the canonical task for hex_29 redesign but the work happens alongside hex_57

**Scope of F5.0a overhaul:**

For each remaining hexagram, complete the design and ship the supporting architectural work:

1. **hex_58 multi-pending-slot architecture:**
   - Update FieldManager to truly support multiple pending slots simultaneously
   - Update `getPendingSlot()` → `getPendingSlots()` returning array
   - Update `_doDeckPhase` flip resolution to iterate pending slots
   - Decide deck-flip-matches-multiple-pending precedence (likely chronological: Play 1's pending matches first)
   - Remove the Play 2 start pending-resolution (lines @25111-@25217 in GRM)
   - Fix the related auto-capture-pair-to-empty-slot bug
   - Yaku detection runs once after combined resolution (already works post-fix)
   - Estimated effort: 3-5 hours

2. **hex_52 design completion (from F5.1 candidate list):**
   - Decide between Mountain endurance / weight / accumulation
   - Implement chosen direction
   - Estimated effort: 1-3 hours depending on direction

3. **hex_57 + hex_29 architectural redesign (broader than initial deal):**
   - **The `overridesCaptureRule()` abstraction is incomplete.** It only overrides the matching CHECK but not slot management, pending semantics, auto-capture triggers, or find-matching-slot logic.
   - FieldManager's core assumption — "a slot contains cards of one month" — must be parameterized on active capture rule.
   - Specifically:
     - Initial deal: respects matching rule (adjacent-month grouping for hex_57, rank grouping for hex_29)
     - Slot-stacking semantics: a "valid stack" is defined by the capture rule
     - Pending state semantics: pending means "match-criteria-met, awaiting completion to full set"
     - Auto-capture trigger: "full set" definition depends on rule (4 same-month for default, 4 adjacent for hex_57?, 4 same-rank for hex_29?)
     - Hand-play targeting: respects slot boundaries; doesn't merge across slots arbitrarily
   - Per-bug fixes from Phase 2C hex_57 verification:
     - Fix 3-stack lock when adjacent flip arrives (don't auto-capture 2-card adjacent pair, wait for 3rd)
     - Fix empty-slot placement (don't merge into adjacent stack when player intent is clearly a new slot)
     - Fix cross-slot merging (slot boundaries respected)
   - Estimated effort: 6-10 hours (significant FieldManager refactor)

4. **hex_01 semantic refinement (via F5.0 outputs):**
   - F5.0's capture/scoring classification informs which retriggers and stamps should fire at hex_01 field-end
   - May add universal stamp support and/or restricted retrigger semantics
   - Estimated effort: 1-2 hours (mostly applying F5.0's classifications)

5. **hex_30 + hex_51 verification under new foundation:**
   - Confirm no regressions from architectural changes
   - Estimated effort: 1 hour

6. **Doc updates:**
   - Update DESIGN_DOC_V5 with finalized hexagram behaviors
   - May replace F2.2.x as the canonical task for hex_29/hex_57 redesigns
   - Estimated effort: 2-3 hours

**Total effort estimate: 14-24 hours** for the full overhaul (expanded from 12-20h based on hex_57 verification findings revealing deeper FieldManager refactor scope).

**Pre-conditions:**

- F4.17 (discard pipeline) — completed
- F4.18 (capture-event dispatch consolidation) — completed
- F4.20 (spirit logic migration) — completed
- F4.22 (duplicate card ID handling) — completed
- F5.0 (capture/scoring semantic audit) — completed, provides classification data for hex_01 refinement
- Playtest data from hex_30 and hex_52 — informs whether design candidates need tuning

**When to schedule:** After F5.0 lands, before F5.1 tuning begins. The overhaul provides the "design-complete" hexagram set that F5.1 tunes against.

**Why grouping is the right approach (Robert's reasoning, 2026-05-15):**

Looking at all 7 effect-bearing double-trigrams together may reveal better designs than fixing each individually. The hexagrams form a system — interactions, difficulty curve, thematic coherence are all considerations. Plus the architectural prerequisites (F4.17, F4.18, F4.20, F4.22, F5.0) cleanup the foundation so the redesign work doesn't accumulate more tech debt.

**Cross-references:**

- All Phase 2C hexagram verifications (the input data)
- F2.2.x (hex_29 redesign — now bundled into F5.0a)
- F4.14 (doc reconciliation — F5.0a updates doc as byproduct)
- F4.24 (codebase architecture catalogue — finalized after F5.0a)
- F5.0 (capture/scoring audit — F5.0a's foundation)
- F5.1 (Phase 5 tuning — runs after F5.0a's design-complete hexagrams)

---

### F5.1: Threshold tuning (§17.1, §17.5)

After Phase 1's stack fix and ki-component fix, the actual game economy is dramatically different from current playtest:
- 3-stack Bonds now gives +15% interest (was 5%), so late-run runs are richer
- 3-stack Coupon now gives 45% discount (was 15%), so deeper builds are more achievable
- Per-yaku and per-push ki bonuses add 5-15+ ki per round to most rounds

Old thresholds (50, 70, ..., 500000 across 36 rounds) are now too easy. Re-tune via:
1. Run synthetic playthroughs at 3 archetypes (economy build, points build, mult build) and record per-round score distributions
2. Set thresholds at the 25th-percentile of "competent play" per round
3. Verify difficulty curve (steeper at act ends?)

**Effort:** 15-25 hours of playtesting + adjustment.

**Phase 5 tuning items to revisit (logged 2026-05-15 from F2.3 audit verification):**
- **Gray stamp retrigger multiplier:** Currently +3 retriggers (4× total firing). Robert flagged as overpowered in playtest. Tuning candidate: drop to +2 or +1 if playtest confirms imbalance. One-line change once playtest informs the target value.
- **Black stamp effect distribution:** Current Option C shuffle assigns: Captured → consumable, Discarded → draw, Yaku → +3 ki. Robert noted possible interest in alternate distributions. Playtest will inform whether current mapping needs adjustment.
- **Bonds base value:** F2.1 Phase A removed Bonds' artificial cap (was claimed +25%, actual +15% at 3-stack). Without cap, Bonds compounds via transcendence. Per-stack value of +5% may need to drop (likely +2-3% per stack) once playtest data shows the impact of unbounded stacking + Phase 1's push/bank interest interactions.
- **Comprehensive ki/sell-price overview (added F2.1.b):** F2.1.b enabled spirit sell-price refund (`Math.floor(cost/2)` base + Collector bonus) — the FIRST functional spirit release refund. All spirit costs and consumable costs should be re-tuned holistically once playtest data is available. Sell-price percentages (currently 50% for both) may need adjustment based on how spirits-as-investments vs spirits-as-commitments plays out.
- **hex_30 Lí difficulty (added 2026-05-15 from Phase 2C verification):** Currently uses Option B (no-repeat random) — disabled yaku cannot repeat across consecutive rounds. If playtest shows hex_30 still feels too easy after the F2C patch (which removed the threshold discount and randomized the cycle), consider switching to Option A (pure random, including possible consecutive repeats). One-line code change in `one_yaku_disabled.onRoundStart` to remove the no-repeat filter.

- **hex_52 Gèn design completion (added 2026-05-15 from Phase 2C verification):** Phase 2C shipped a flow-decay-prevention patch to make hex_52 mechanically viable late-game. The broader design instinct remains: hex_52 feels "mechanically thin" compared to other transformative double-trigrams (hex_01 inverts capture incentive, hex_30 disables yaku paths, hex_51 adds reveal mechanic). hex_52 only REMOVES the push option — no transformation, no positive mechanic.

  Candidate design directions for Phase 5 tuning:
  
  - **"Mountain endurance" (lightest touch):** Flow does not decay during a round under hex_52 (round-internal flow stability). Between rounds, flow decay still applies. *Status: round-end flow decay prevention already shipped in Phase 2C — this candidate would require round-INTERNAL stability if such decay exists in the engine.*
  
  - **"Mountain weight" (mid touch):** Yaku-triggered force-bank applies at ×1.5 or ×2.0 multiplier instead of depth-0 ×1.0. The "still" mountain becomes "heavy" — single strikes hit harder when they land. Compensates for lost push upside.
  
  - **"Mountain accumulation" (heavier touch):** Flow does not decay at all under hex_52 (already shipped in Phase 2C). Plus an additional positive mechanic — perhaps captures during a hex_52 round build flow more aggressively than baseline, or the yaku trigger awards a flat ki/score bonus.
  
  Playtesting after Phase 2 completion will inform which direction to take. Possibly a combination.

### F5.2: Save game + run resumption (§17.4)

Architecturally, the `toSnapshot()` methods are seed-work. Implementation:
1. Snapshot full run state at end of each round (ki, score, spirits, consumables, deck, hex, blessing state)
2. Persist to localStorage (single slot for v0.2)
3. Resume on MenuScene "Continue" button if save exists
4. Clear save on run end

**Effort:** 12-15 hours including testing edge cases (mid-shop save, partial-yaku decisions).

### F5.3: First-run tutorial (§17.5)

Currently first run uses hex_02 (no_effect), bypasses divination, hexagram unlock progress hidden. Tutorial needs:
1. Annotated overlays explaining hand/field/deck
2. Guided first capture
3. Guided first push/bank decision
4. Guided first shop visit
5. Guided first yaku achievement
6. Reveal of divination + hexagram system at run 2

**Effort:** 20-30 hours including writing copy and integrating overlay system.

### F5.4: Speculative card art + integration (§17.x, Slice 3 D12, Slice 6 C60)

13 speculative cards need art. Plus:
- BootScene preloads them
- Shop pool includes them
- Symbiont symbiont_garden/wolf/badger references resolve (currently reference cards not in deck)

**Effort:** Art is external; integration is ~3 hours.

### F5.4b: Deck-modification hexagram redesign + speculative card integration (added 2026-05-07 during D0.11-5 verification)

Deck-modification hexagrams (e.g., `animal_deck`) currently exist as design slots without finalized mechanics. These are the natural home for incorporating speculative cards: a "deck of animals" mode could include Bear (January), Ladybugs (March), and Fox (December), naturally activating Wolf/Garden/Badger symbionts under those hexagrams.

**Scope:**
1. Redesign `animal_deck` and similar deck-modification hexagrams with full mechanic specification
2. Define which speculative cards belong in which alternate decks (animal-heavy, plain-heavy, etc.)
3. Verify yaku thresholds scale appropriately with shifted card-type concentration (D0.11-5 playtest noted thresholds appeared correct — confirm under formal redesign)
4. Coordinate with F5.4 (speculative card art delivery) for content unblock

**Cross-references:**
- D0.11-5 verification (TESTING_NOTES_V2.md): Wolf/Garden/Badger inert in normal deck because their source animals aren't present
- F5.4: speculative card art is upstream blocker

**Effort:** 8-12 hours (mechanic design + balance review + integration with art-delivered speculative cards).

### F5.4c: Fire enhancement axis preservation (added 2026-05-07 during D0.14-3 verification)

Currently Fire-enhanced cards strip their month AND axes (vertical/temporal/seasonal/rank), making them wildcards for matching but excluded from spirit triggers that depend on axes. This heavily debuffs Fire enhancement.

**Proposed redesign:** preserve axes on Fire-enhanced cards while only stripping the month. This way, a Fire-enhanced Crane (originally air+day) remains air+day for cross_yang's `air AND day → ×4.0` trigger, but plays as any month for matching/yaku purposes.

**Design intent:** Fire becomes a pure wildcard (any month, any yaku) without crippling its access to scoring spirits. The card's original axes are part of its identity; Fire grants flexibility in WHEN the card plays, not WHAT it is.

**Scope:**
1. Update Fire-enhancement application logic to preserve `vertical`, `temporal`, `seasonal`, `rank` properties
2. Audit Fire-related spirit triggers to ensure no double-counting (Fire-enhanced cards triggering hexagram axis bonuses might compound differently)
3. Re-run D0.4 / D0.14 verification suite under new Fire semantics
4. Review balance implications (Fire becomes more powerful in mult-stack builds)

**Cross-references:**
- D0.14-3 verification (TESTING_NOTES_V2.md): current Fire bypass behavior confirmed working but flagged for redesign
- D0.4 boost-axis hexagrams: interact with Fire's wildcard semantics

**Effort:** 4-6 hours (mechanical change + balance review + verification).

### F5.4d: Ducks effect redesign (added 2026-05-22 from F2.5 scope review)

**Background:** During F2.5 design (negative accumulator semantics), Ducks (`sym_ducks`) was found to use flat state `multValue` (net deck-flip matches minus strands) rather than the per-element accumulator pattern. Converting it to a Cat 1 accumulator would balance-shift the spirit (3-stack output goes from ×2.8 → ×6.4 at same conditions).

Robert's call (2026-05-22): defer Ducks to Phase 5 because the whole effect needs to be re-designed, not just the architecture. Bundling with other Phase 5 redesigns makes sense.

**Current behavior:**
```js
applyEngine({ spirit }) {
  const v = spirit.state?.multValue ?? 0;
  if (v === 0) return null;
  const stacks = effectivePower(spirit);
  return { multiplyMult: 1 + v * 0.2 * stacks };
}
```

`multValue` is net deck-flip outcomes (matches +1, strands -1). Multiplied by stacks externally rather than via per-element aggregation.

**Scope of redesign:**

1. **Effect re-design:** Is "net match minus strand" the right mechanic? Reconsider thematic fit (Ducks = paired birds, swimming together) and whether match/strand asymmetry creates meaningful decisions.

2. **State architecture:** Pick one of:
   - Convert to Cat 1 accumulator (per-element multValue, increment together, remove `× stacks` external multiplier)
   - Keep flat state but redesign formula
   - Different state model entirely

3. **Balance review:** Current 1-stack output: `1 + v × 0.2`. 3-stack: `1 + v × 0.6`. After Cat 1 conversion: 3-stack at sum=v: `1 + v × 0.2` (same, no × stacks since aggregateNumericState already powerLevel-weights sum). Means Cat 1 conversion ALONE doesn't change balance if `multValue` stays interpretable as per-stack contribution.

   Wait — that's actually fine. Cat 1 conversion is balance-neutral if `multValue` is reinterpreted. Each element's `multValue` tracks "matches minus strands while this element was held." Sum across elements gives total.

**Possible Phase 5 outcome:** Ducks may just need Cat 1 conversion (no effect change), in which case re-bundle into F2.5b cleanup. OR effect gets meaningful redesign and stays in Phase 5.

**Effort:** 1-3 hours depending on redesign scope.

**Cross-references:**
- F2.5 (deferred from here)
- F5.0a (double-trigram redesign — sibling redesign work)

### F5.5: Audio integration (per memory: partner handles audio)

Hooks for: card play, capture, yaku trigger, push, shop transitions, hex reveal, capstone fusion, etc.

**Effort:** 5-8 hours integration; production is parallel.

### F5.6: Bundling + distribution (§17.x)

- Vite production build optimization
- Tauri or Electron wrapper for desktop distribution
- Asset compression
- Browser compatibility check (Phaser.js works on Chromium-derived; Safari quirks?)

**Effort:** 8-15 hours.

### F5.7: Polish + bugtesting

After all above, full bugtesting pass with cleanup catalog cross-check.

**Effort:** Open-ended; budget 15-20 hours.

### F5.8: Earth ki bonus timing redesign (added 2026-05-15 from F2.3 audit Prompt B verification)

**Background:** Currently, Clay/Pottery (Earth Wu Xing) generates ki interest **once at round end**, computed as (rate × current_ki) per Earth-enhanced card in hand. Matches DESIGN_DOC_V5 §8.2.2 spec.

Robert wants to redesign this to fire **per capture** during scoring, mirroring Iron/Meteorite's held-in-hand mult pattern but contributing flat ki instead of multiplicative mult.

**Implications of redesign:**

1. **Magnitude rebalance.** Current Clay = 10% of current ki at round end. Under per-capture model, 10% per capture × 5+ captures = 50%+ effective rate. Likely needs to drop to ~2% per capture, or use a flat-ki formula instead of percentage-based.

2. **Engine Fossil interaction.** Fossil rewards Earth interest events. Per-capture firing changes proc cadence (one proc per capture vs one per round end). Fossil's stack scaling may need rebalancing.

3. **Strategic positioning shifts.** Round-end Earth pairs with ki-banking builds (Piggy, Bonds). Per-capture Earth pairs with high-capture builds (Family, Goat, Monkey). Both are valid archetypes; the redesign just changes which archetype Earth supports.

4. **Doc updates.** §8.2.2 needs full rewrite to describe per-capture timing.

5. **Held-in-hand retrigger semantics.** Already wired correctly (Applause + white/gray apply per held card per capture). The retrigger framework migrates naturally.

**Where this lives in code:**
- `_computeEarthKiBonus` in GRM is called at round end via `result.earthKiBonus → calculateKiReward`
- Per-capture version would integrate into the same held-in-hand loop where Iron's mult fires (GRM capture event handler, alongside `getMetalHeldMult`)
- Likely delete `_computeEarthKiBonus` entirely; logic moves to per-capture site

**Effort estimate:** 3-5 hours implementation + balance tuning. Pairs naturally with F5.1 (threshold tuning) since both require playtest data.

**When to schedule:** Phase 5, alongside threshold tuning. Both need playtest data before fixing magnitudes.

### F5.9: `econ_print` spirit — consumable-applier mechanic (added 2026-05-15 from F2.1.b discussion)

**Background:** During F2.1 audit, `econ_print` was identified as non-functional (S-010). The current spirits.js description ("Generate bonus ki each time ki is spent in the shop") is **wrong** — it doesn't reflect the actual design intent.

**Correct design intent (LOCKED 2026-05-15):** Print is a "consumable applier" spirit. A consumable is attached to Print (via UI affordance). Each round, Print applies that consumable's effect to the **first N cards scored** (N = stack count). Consumable persists in Print indefinitely; per-round throughput is the gate.

**Example:** Attach a Yellow Stamp consumable to Print at round 5. From round 6 onward, the first card scored each round automatically gains a Yellow Stamp. With 3-stack Print, the first 3 cards scored each round gain Yellow Stamps. The Yellow Stamp consumable is never "used up" — Print holds it permanently.

**Locked design parameters:**

1. **Eligible consumables:** Card-enhancement consumables only — Wu Xing (Water, Wood, Fire, Metal, Earth), all stamps (Yellow, Red, Blue, White, plus their fusion products), Heart Chakra. NOT eligible: zodiac (mechanical actions), Cat/Lead/Sulfur/Amber/Pearl (run-state changes), Crown Chakra (different mechanic).

2. **Per-round throughput:** N applications per round where N = stack count. Applied to the **first N cards scored** in the round (deterministic ordering, no player choice — keeps implementation simple).

3. **Consumable persistence:** The attached consumable stays in Print indefinitely. Not consumed by use. Replaced only if player explicitly attaches a new consumable (overwrites previous).

4. **No multi-consumable slot:** Print holds at most ONE consumable. Attaching a new one overwrites the old (player loses the previous consumable). To chain enhancements (Water → Snow → Ice via Metal upgrade), player needs TWO separate Print spirits with different consumables.

5. **Stacking:** N-stack Print = N applications per round of the SAME attached consumable. (Not "N different consumables" — single attached consumable, N apply-count.)

6. **Negative behavior:** Frozen at transcendence — Negative Print keeps whatever consumable was attached at transcendence, applies at frozen powerLevel count per round.

**This is a genuinely new gameplay system, not a spirit-effect fill-in.** Implementation requires:

1. **UI affordance for attachment.** Player needs a way to slot a consumable into Print. Drag-and-drop from inventory onto Print spirit slot. Alternative: right-click consumable → "Attach to Print" if exactly one Print is equipped (or popup if multiple).

2. **Print state.** `spirit.state.attachedConsumable = {id, params}` — stored snapshot of the consumable definition (since the consumable instance is destroyed on attachment).

3. **Scoring-time integration.** First N cards scored each round have the attached consumable's enhancement applied DURING scoring (before per-card scoring logic that depends on the enhancement). Likely a new step at the top of the Phase 1 scoring loop:
   ```js
   // At start of capture scoring:
   const printSpirits = run.allSpirits.filter(s => s.id === 'econ_print' && s.state?.attachedConsumable);
   const printApplicationsRemaining = printSpirits.reduce((sum, s) => sum + effectivePower(s), 0);
   // Decrement as cards score; apply enhancement when applicable
   ```

4. **Discoverability:** New mechanic needs tooltip / tutorial. Player learns by:
   - Hover Print → tooltip explains "Attach a card-enhancement consumable; first N cards scored each round receive it"
   - Drag visual feedback when dragging consumable over Print (highlight as valid target)

**Effort estimate:** 8-15 hours including:
- UI implementation (3-5h) — drag-drop, visual feedback, attached consumable display
- Engine integration (2-3h) — round reset, scoring loop, enhancement application
- Tooltip + tutorial integration (1-2h)
- Verification + balance tuning (2-3h)

**When to schedule:** Phase 5, after Phase 4 architectural cleanup. Could pair with F5.3 (tutorial) since it needs explicit teaching.

**Until F5.9 ships:** `econ_print` stays at `rarity: null` (set in F2.1 Phase A). Spirit is acquirable only via developer console / cheat codes / testing.

**Cross-references:**
- F2.1 audit (where this was uncovered)
- F2.1 Phase A (set rarity null)
- F2.1.b (decided NOT to ship in Phase 2; properly belongs as Phase 5 feature)
- F5.1 (balance tuning may interact with Print)
- F5.3 (tutorial design for new mechanic)

### F5.10: Consumable stacking system + Waidan removal (added 2026-05-15 from F2.1.b Replica discussion)

**Background:** During F2.1.b implementation discussion, Robert raised a planned redesign of the consumable system. The current model is "slot-per-instance" (3 slots = 3 individual consumables). The proposed redesign is "slot-per-type with stacking inside" — analogous to how spirits stack and transcend.

**Proposed mechanic:**

- Player has 3 consumable slots (or more with blessings/expansions)
- Acquiring a consumable of a type the player already owns STACKS rather than taking a new slot
- Stacking up to 3 copies of a single consumable type behaves identically to 3 separate instances (3 uses available)
- A 4th copy of the same type triggers consumable transcendence: a **Negative** consumable is created
- Negative consumables:
  - Identical effect to singleton
  - No power level (unlike spirit negatives)
  - Take NO slot space
  - Persist for the rest of the run, providing one use per round? Or one use per shop visit? (TBD)

**Implications for existing systems:**

- **Waidan deprecation:** Waidan currently creates a negative copy of a random consumable on Sacred Grove exit. Under the new system, players reach negative consumables via stack-to-4. Waidan becomes redundant.
- **Replica behavior extends naturally:** Replica duplicates a random consumable. Under the new system, duplicating an already-stacked consumable increments the stack rather than taking a new slot. If duplicating triggers transcendence (3-stack + 1 = 4), a negative is created.
- **Symbiont consumable interactions:** Sym_crow generates a random consumable at round-end. Generated consumables should auto-stack with existing ones of the same type.
- **UI changes:** Consumable slot needs to display stack count badge. Multiple stacks of one type compact into one slot visually.

**Implementation scope:**

1. **Refactor consumable storage** from `Array<Consumable>` to `Array<{id, stackCount, isNegative?, powerLevel?}>`.
2. **Update `addConsumable`/`buyConsumable`/`generateRandomConsumable`** to auto-stack matching types.
3. **Implement transcendence logic** when stack reaches 4 (similar to spirit transcendence).
4. **Add Negative consumable inventory** — separate storage that doesn't count toward slot capacity.
5. **Update `useConsumable`** to decrement stack count instead of removing instance.
6. **Update UI** to display stack badges and negative consumable indicator.
7. **Remove Waidan** from spirits.js and related code (verify no fusion dependencies).
8. **Verify Replica naturally extends** to new system without code changes.

**Effort estimate:** 8-15 hours including:
- Refactor consumable data structures (2-3h)
- Update acquisition/use/RNG paths (2-3h)
- Transcendence logic + negative consumable system (2-3h)
- UI changes (2-3h)
- Waidan removal + verification (1-2h)
- Playtest balance verification (1-2h)

**When to schedule:** Phase 5. Could pair with F5.9 (Print) since both are consumable-system changes.

**Cross-references:**
- F2.1.b (Replica was designed with current consumable system; F5.10 extends naturally)
- F5.9 (Print attaches consumable to spirit — interacts with consumable acquisition)
- Waidan spirit removal (current: legend_waidan in spirits.js with 8 ki cost, rare)

**Phase 5 total: 60-100+ hours, mostly external (art, audio) or playtesting.**

---

## Cross-cutting recommendations

### R1: Adopt `countStackedById(id)` as the canonical stack-count helper
Single helper, used everywhere. Eliminates the "filter().length" antipattern. Worth a CONTRIBUTING note: "For any stack-aware effect, use countStackedById, not filter.length."

### R2: Single source of truth pattern
For values referenced in multiple places (hexagram description text, Wu Xing tier values, Snow/Ice mult tables), centralize in the systems file and have UI/data files import. Drift is mostly a "data lives in two places" failure.

### R3: Hexagram description renderer
Replace `data/hexagrams.js` description strings with description-generators that read live values from the implementation:
```js
// Instead of:
description: 'Wood-enhanced cards score ×2 points and apply effects twice.'
// Have:
description: () => `Wood enhancement bonus ×${getWoodScoringMult('upgraded').toFixed(1)}; weakens ${cycle === 'destructive' ? 'Earth' : 'Fire'}.`
```

This way descriptions can never drift from implementation. Effort: 4-6 hours; eliminates an entire class of bugs going forward.

### R4: Establish a "stable" set of values vs "tuning placeholder" set
Many findings hinge on doc magnitudes that are explicitly placeholder per §17.1. Codify which values are "fixed by mechanic" (e.g., yaku thresholds in proportional brackets) vs "tunable for balance" (e.g., spirit costs, hex magnitudes). Tunable values can ride atop a config object that's clearly separated from mechanic.

### R5: Test scaffolding for stack behavior
Once F1.1 lands, write a small test harness that synthesizes a run, equips N stacks of each economy spirit, and asserts the doc-stated outcomes. ~30 minutes per spirit, ~5 hours total. Catches regression of the stack-fix.

### R6: Audit-driven cleanup catalog refresh
After Phase 4, regenerate `DEFERRED_CLEANUP_ITEMS.md` from the residual findings. Old catalog has redundancies and confirmed-now-fixed items.

---

## Recommended execution order

**Week 1: Phase 0 + Phase 1**
- Day 1: Triage decisions (Phase 0). Document each in a decisions log.
- Day 2-3: F1.1 (stack scaling unified fix) + F1.2 (unified shop pricing). These two fixes alone resolve ~25 findings.
- Day 4: F1.3 (missing ki components) + F1.5 (V4 residue removal).
- Day 5: F1.6 (logger improvements) + F1.7 (semantic addKi) + verification.

**Week 2: Phase 2 (parallelizable)**
- Spirits track: F2.1.a, F2.1.b, F2.1.d, F2.1.e (~5 days of work)
- Hexagrams track: F2.2 cluster (~5 days of work)
- Consumables track: F2.3 cluster (~3 days of work)

If solo: serialize, ~2.5-3 weeks for Phase 2.

**Week 3-4 (or later): Phase 3 + Phase 4**
- UI correctness pass with active hexagrams visible, value displays accurate
- Cleanup pass

**Week 5+: Phase 5 (demo work)**
- Threshold tuning informed by accurate Phase 1-4 economy
- Tutorial design + implementation
- Save/load
- Art integration as it arrives
- Audio integration with partner
- Bundling

---

## Risk register

| Risk | Mitigation |
|---|---|
| Phase 0 decision delays cascade | Document recommended defaults in this plan; if no decision in 24h, proceed with recommendation. Most can be reversed. |
| F1.1 (stack fix) breaks existing balance | Expected — Phase 5 retunes. But playtesting in Phases 2-3 will feel different. |
| F2.2 (hexagram fixes) introduce regressions in unlock progression | Localstorage `hanatu_beaten_hexagrams` is preserved across changes; a player who beat hex_30 (rotating yaku) before F2.2.d still has the unlock after the change to fixed-yaku. |
| Phase 5 threshold tuning takes longer than estimated | Bracket: cap at 40 hours and accept rough thresholds for v0.2 demo. Refine post-demo. |
| Audio/art partner timeline | Decouple: F5.4/F5.5 can land in parallel; demo can ship without final audio. |
| Save/load corruption | Version snapshots with schema_version field; on schema mismatch, gracefully discard save. |

---

## Sequencing diagram

```
Phase 0 (decisions)
       │
       ▼
Phase 1 (foundation correctness)
   ├── F1.1 stack scaling ──────────┐
   ├── F1.2 unified pricing         │
   ├── F1.3 missing ki components   │ (cross-cutting)
   ├── F1.5 V4 residue              │
   ├── F1.6 logger fixes            │
   └── F1.7 semantic addKi          │
                                    ▼
Phase 2 (system-level correctness)
   ├── F2.1 spirits  ── F2.1.a..f
   ├── F2.2 hexagrams ── F2.2.a..f
   └── F2.3 consumables ── F2.3.a..h
                                    │
                                    ▼
Phase 3 (UI correctness)
   ├── F3.1-9 value displays correct
   └── F3.10 misc affordances
                                    │
                                    ▼
Phase 4 (cleanup) — F4.1-9
                                    │
                                    ▼
Phase 5 (deferreds) — Demo build
   ├── F5.1 threshold tuning
   ├── F5.2 save/load
   ├── F5.3 tutorial
   ├── F5.4 speculative integration
   ├── F5.5 audio
   ├── F5.6 bundling
   └── F5.7 polish
```

---

## Appendix A: Findings index by phase

For traceability, here's where each audit finding maps:

**Phase 0:** D0.1 (Slice 5 C44), D0.2 (Slice 4 C29), D0.3 (Slice 4 C30), D0.4 (Slice 4 C35), D0.5 (Slice 5 C45), D0.6 (Slice 5 C46), D0.7 (Slice 2 C13), D0.8 (Slice 3 C19), D0.9 (Slice 3 C24), D0.10 (Slice 4 C38), D0.11 (Slice 3 D12), D0.12 (Slice 7 CL23), D0.13 (Slice 4 C43)

**Phase 1:**
- F1.1: Slice 5 C46, Slice 2 D11
- F1.2: Slice 5 C47, Slice 2 C12
- F1.3: Slice 1 C3, Slice 5 C48
- F1.5: Slice 7 C63, C62; Slice 1 D2
- F1.6: Slice 7 C64, C65
- F1.7: Slice 7 C66

**Phase 2:**
- F2.1.a: Slice 2 C13, Slice 3 C19, Slice 5 C45
- F2.1.b: Slice 2 C16
- F2.1.c: Slice 2 C9 (cluster)
- F2.1.d: Slice 2 C10
- F2.1.e: Slice 2 C11
- F2.2.a/b: Slice 4 C29, C30
- F2.2.c: Slice 4 C32, C33, C40, C41 + Slice 4 misc magnitudes
- F2.2.d: Slice 4 C34, C36, C37, C38, C39, C42
- F2.2.e: Slice 4 misc descriptions
- F2.2.f: Slice 4 D29
- F2.3.a: Slice 3 C20, C21
- F2.3.c: Slice 3 C22
- F2.3.d: Slice 3 C23
- F2.3.e: Slice 3 C25
- F2.3.f: Slice 3 C26
- F2.3.g: Slice 3 C24
- F2.3.h: Slice 3 C28

**Phase 3:**
- F3.1-2: Slice 6 C54, C55
- F3.3: Slice 6 C56
- F3.4: Slice 6 C57
- F3.5: Slice 6 C58
- F3.6: Slice 4 D30, Slice 6 C59
- F3.7: Slice 7 C61
- F3.8: Slice 6 C52
- F3.9: Slice 5 C49

**Phase 4:**
- F4.1: Slice 7 CL23
- F4.2: Slice 1 D1, Slice 5 C51
- F4.4: Slice 3 D17
- F4.5: Slice 5 D36
- F4.7: comment cleanups across slices
- F4.8: Slice 7 CL25

**Phase 5:**
- F5.1: §17.1, §17.5; Slice 5 TD14
- F5.2: §17.4; Slice 7 CL23 toSnapshot
- F5.3: §17.5
- F5.4: §17.x; Slice 3 D12, Slice 6 C60
- F5.6: §17.x

---

## Appendix B: Total effort estimate

| Phase | Hours | Notes |
|---|---|---|
| 0 (Triage) | 1-2 | Decision-making |
| 1 (Foundation) | 12-15 | High-leverage cross-cutting fixes |
| 2 (Systems) | 25-30 | Per-spirit/hex/consumable corrections |
| 3 (UI) | 8-10 | Value display fixes |
| 4 (Cleanup) | 4-6 | Dead code removal |
| **Subtotal correctness** | **50-63 hours** | **~2-3 weeks solo** |
| 5 (Demo deferreds) | 60-100+ | Threshold tuning, tutorial, save/load, art integration, audio, bundling |
| **Total to demo-ready** | **110-165+ hours** | **~5-8 weeks solo** |

Phase 5 estimate is wide because external dependencies (art, audio production) drive the timeline.

---

*Plan complete. Ready for review and prioritization. The next concrete step is Phase 0 — work through the 13 design decisions and document them in a decisions log. Phase 1 work can begin as soon as F1.1, F1.2, F1.3 decisions are confirmed.*
