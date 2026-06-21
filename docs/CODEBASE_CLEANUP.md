# Codebase Cleanup — canonical code-task log

**Purpose:** The canonical log of **CODE** cleanup tasks (deferred — mostly Phase-6 semantic/naming cleanup, plus a few dead-code removals). These are distinct from *design* deferrals (now in `ROADMAP.md`) and from doc-reconciliation (the archived `DESIGN_DOC_PATCHES.md` worklist). **All future code-cleanup items go here.**

**Seeded:** Campaign 3c (2026-06-15), from the DP-pending dossier's code-grounded findings. Each item: location · what · why-deferred.

> Note: this supersedes the scattered `DEFERRED_CLEANUP_ITEMS.md` references throughout the old §17.7 (the §17.7 items were reparceled here in the 2026-06-19 restructure; `V6_EXTRACTED_SECTIONS.md` is deleted).

---

## Dead code

- ✅ **DONE** (subtractive pass, 2026-06-21) — **`RunManager.applyInterest()`** — `src/systems/RunManager.js` (~line 1359). Zero callers in `src/` (the live interest path is the `interest` term inside `calculateKiReward`, push-scaled). It is the literal embodiment of the obsolete "round-start passive interest" model. **Remove.** Why deferred: behavior-neutral, low priority. (Dossier Unfiled #7.)

## Naming / semantic renames

- **`card.ribbonStamp` (current code) → `card.stamp` (intended)** — rename direction: current code uses `card.ribbonStamp` everywhere (`GameRoundManager.js` reads it at every stamp dispatch site; `shopCards.js` / `consumables.js` `mixStamps` write it; `SpiritEffects.js` / `_computeRetriggerCount` read it; the test suite asserts `.ribbonStamp` as `[PRESERVE]`). The design-doc / canonical name is `card.stamp`. `ribbonStamp` is also *misleading* — stamps apply to ANY card, not just ribbons (the apply path stamps plains in tests), so `stamp` is both cleaner and more accurate. Why deferred: pervasive find-replace touching every stamp path plus the `[PRESERVE]` tests — do it in one focused pass. (Dossier Unfiled #12; §8.4.5 already notes the doc-vs-code name gap.)
- ✅ **DONE** (Gate-0 verified 2026-06-20: `legend_` → 0 in `src/`) — no `legend_*` IDs remain; the demoted rares are `engine_*` (engine_wuji/dao/chi/tengu/feng_shui), Gankyil was cut. The `legend_*`→`rare_*` rename is moot. (Dossier Unfiled, ex-§16/§17.7.)
- **`tooltipBase` → scoring-values rename + `_tb` accessor** — see `ROADMAP.md` 5A (D1, Phase-5 semantic rename; sequenced after Wave B). Logged there as a *design* item; the code task lives under it.
- ✅ **DONE** (Gate-0 verified 2026-06-20: `_dogProtection` → 0 in `src/`) — the live flag is `_pushPenaltyWaived` (set by `zodiac_rabbit`). The rename's intent is satisfied; the adopted name differs from the suggested `_pushPenaltySuppression`/`_rabbitActive`. (§8.5.2.)

## Stale data-strings (code-side description lag)

- **`zodiac_cat` description** — `src/data/consumables.js` still reads "...Tier 1 Foundation spirit". Actual pool is all Tier-1 commons (currently 27, by rarity, symbionts excluded). V6 §8.5 is corrected; the code string lags. (DP-24.)
- **"Coming soon" description fields** — ✅ `econ_replica` / `econ_collector` **DONE** (Gate-0 verified 2026-06-20: both now carry real descriptions; only `econ_print` still reads "(Coming soon)" at `spirits.js:697`, and it is *intentionally* non-functional pending F5.9 — **leave it**). `game_echo` was already corrected. (DP-07; dossier Unfiled #10.)
- **`hexagrams.js` flavor text for `volatile_flow` / `stable_flow`** — the in-code player-facing descriptions are stale vs the push-curve-amplifier implementation (V6 §9.3.8 / §5.6 are now correct; the code flavor strings are not). Low priority. (§9.4 note; dossier Unfiled #6.)

## Already done (no action — recorded for closure)

- **`consumables.js` Crown Chakra data-string** — already corrected to "Copy all attributes… exact duplicate". V6 §8.1 was the lagging side (fixed in 3c). No code action.
- **`spirits.js` header comment** — already reads 110 total / 78 Tier 1, matching the live array. No code action. (DP-15.)
- **`econ_bonds` / `interestRate()`** — already uncapped (+5%/stack, no clamp); the old "+25% hard cap" cleanup is moot (cap never existed in the current code). No code action. (DP-10.)

---

## From V6 §17.7 (reparceled 2026-06-18 — verify each against current code before actioning)

The code-vs-design items that lived under the old V6 §17.7 (formerly staged in `V6_EXTRACTED_SECTIONS.md`, since deleted), reparceled here per the line-7 note above. **The §17.7 audit is V5/V6-era (pre-overhaul); several may already be resolved — verify before actioning.** Items already captured above (`ribbonStamp`, `legend_*`, "Coming soon", `_dogProtection`, Bonds-cap-moot) are NOT repeated.

**Stamps** (design decided, code partial — may be subsumed by the Phase-5 stamp rethink, ROADMAP 5A):
- **White/Gray retrigger semantics** — only fire on capture and don't re-roll jackpot/break/depreciation; should fire on any trigger and re-roll randomness per retrigger.
- **Black stamp trigger semantics** — only fires on capture; should fire on captured/discarded/yaku.
- **Stamp tier system** — code uses 3 tiers; design intent is 4 (Gray as quaternary).

**Spirits / economy:**
- **Amber alchemical 3-stack restriction** — blocks 1×/2× inputs; design intent is any stacked spirit. (Distinct from the Amber *balance* rethink, ROADMAP §3 / D7.)
- **Piggybank / Grace ×4 hard caps** — design intent: no hard caps (Bonds is already uncapped, above; verify Piggybank/Grace).
- **Ingot fractional truncation** at low ki — the code side of the Ingot redesign (design side is surfaced for ROADMAP).

**Hexagrams:**
- **Tropic/Arctic month ranges** — code uses 4-month exclusionary sets; should be 6-month half-years.
- **Hexagram description discrepancies (broad)** — axis hexagrams describe by month not axis; boost hexagrams omit debuffs; rank hexagrams omit threshold modification; Wu Xing cycle hexagrams oversimplify. (`volatile`/`stable_flow` flavor is already logged above.)

**Consumables / card-targeting naming:**
- ✅ **DONE** (Gate-0 verified 2026-06-20: `consumable_horse/dog/pig/rooster` → 0 in `src/`) — the legacy `consumable_*` entries are gone (superseded by zodiac equivalents).
- ✅ **DONE** (Gate-0 verified 2026-06-20) — `_markMode`-family renames complete: `_markMode`/`_activateMark`/`_onMarkCardSelected`/`_showBoosterPack` → 0 in `src/` (current: `_cardTargetMode`/`_activateCardTarget`/`_onCardTargetSelected`).

**Card data:**
- **`december_plain_3` deprecated entry** in `cards.js` (replaced by `december_ribbon`).
- **May/September animal naming** — display names "Iris Fireflies"→"Iris Dragonfly", "Chrysanthemum Cricket"→"Chrysanthemum Fireflies" (IDs stay). (Also a design-name note in §17.3.)

**Architectural (lower priority):**
- **`calculateFinalScore()` vestigial method** (ScoringEngine) — output discarded by all callers, retained only for the metal-proc side effect; the two-scoring-paths debt.
- **`addKi`/`spendKi` 'unspecified' reason strings** — many callers pass 'unspecified' instead of meaningful telemetry tags.
- ✅ **DONE** (Gate-0 verified 2026-06-20: `buyYakuUpgrade`/`paramita` → 0 in `src/`) — the Paramita / Yaku-Upgrades obsolete code (and `RunManager.buyYakuUpgrade()`) is gone.

**Terminology (from §17.3):**
- ✅ **DONE** (code side — Gate-0 verified 2026-06-20: the 3 mark ids / `THREE_MARKS` / `getMarkDef` → 0 in `src/`) — "Three Marks" code removed. (Any stale doc-terminology is a separate concern.)

---

## Gate-0 findings (logged 2026-06-20 — code removal pending)

Dead code + stale comments surfaced by the Gate-0 audit (`docs/process/GATE_0_FINDINGS.md`), each verified against the live tree before logging. **No code removed here** — this is the tracking record; removal is the code-fix campaign or a later pass.

**Dead code:**
- **`engine_surplus` dead `tooltipBase`** — `spirits.js:951` declares `{ mult:1, kiDivisor:3 }`, but the effect (`SpiritEffects.js:1289-1296`) hardcodes `Math.floor(ki/3)*stacks` and reads neither field. Tuning either silently no-ops. Fix: read via `_tb`, or drop the dead fields. (G0-004.)
- **decay spirits' dead `startMult`/`startPoints`** — `spirits.js:1042` (`startMult:30`, decay_persimmon) / `:1053` (`startPoints:150`, decay_pear) are never read; `remaining` is seeded from literals in `RunManager._initSpiritState` (`:547-548`). **`lossPerRound` is LIVE — do NOT touch.** Fix: seed from `_tb`, or drop the dead start fields. (G0-005.)
- ✅ **DONE** (subtractive pass, 2026-06-21 — recon upgrade: the *whole* `spiritsByRarity` export had 0 consumers, so the entire export + the `'legendary'` token were removed, not just the bucket) — **`spiritsByRarity.legendary` always-empty bucket** — `spirits.js:1196` filters `rarity==='legendary'`, but no def carries it (capstones are `rarity:null`); the `'legendary'` rarity token in the header (`:41`) is vestigial. Fix: drop the empty bucket / token (low priority). (G0-010.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **`FieldManager.playHandCard()` (singular) dead/parallel path** — `FieldManager.js:180`, zero callers (the live path is `playHandCards()` plural). Its divergent impl is a drift trap. Fix: remove it + fix the GRM header comment that references it (`GameRoundManager.js:7`, also `:43`/`:532`). (G0-037.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **dead `getFireFlatPoints` import** — `ScoringEngine.js:32` imports it but never uses it (leftover from when scoring math lived there). Fix: drop the import. (G0-025 tail.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **dead `logShopFusion`** — `GameplayLogger.js:250`, zero callers (fusion is consumable-driven now). Fix: remove the method. (G0-044 tail.)

**Stale comments / JSDoc (no behavior impact):**
- ✅ **DONE** (subtractive pass, 2026-06-21) — **`ConsumableEffects.js:14-16`** — claims Wu Xing/chakra apply "still live on RunManager (… migration in progress)"; the migration is complete (no `RunManager.applyElement`). Fix: update/remove. (G0-024.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **`yakuPoints` in GRM JSDoc** — named in two return-shape blocks (`GameRoundManager.js:38`, `:1980`) but never computed/returned (correct per design — yaku don't score). Fix: scrub from both. (G0-027.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **`roundInAct` comment** — `RunManager.js:1134` says "(1–3)" but returns 1–6 (`ROUNDS_PER_ACT=6`). Fix: correct to (1–6). (G0-032.)
- ✅ **DONE** (subtractive pass, 2026-06-21) — **`CaptureManager.js:226-227`** — JSDoc point values "(bright=20, animal=10, ribbon=5, plain=1)" are stale; actual is 20/12/10/3 (`rawCardPoints` uses `getCardPoints`, so no behavior impact). Fix: correct the comment. (G0-038.)
- ✅ **DONE** (subtractive pass, 2026-06-21 — Robert ruling: removed the cap claim entirely; comment now states "+5% interest per stack", no ceiling) — **dead `econ_bonds` "+25%" comment** — `SpiritEffects.js:550` `// +5% interest (stacks to +25%)`; the "+25%" is stale (math is +5%/stack → +15%). Fix: remove/correct. (G0-009 tail.)
- ✅ **DONE** (subtractive pass, 2026-06-21 — orphan removed; note the live `_addCapture` site still has no JSDoc, a possible relocate-rather-than-delete follow-up) — **orphaned `_addCapture` JSDoc** — `GameRoundManager.js:777-783`: a dangling JSDoc ("Add captured cards to the capture pile and accumulate base points… @param cards") that documents the relocated `_addCapture` (now at `:1277`), sitting directly above the `_fireRoundEndUnplayedHooks` JSDoc (`:784`). Exposed (not caused) by the G0-035 scaffold removal. Fix: remove the orphan. (Gate-0 follow-up.)
