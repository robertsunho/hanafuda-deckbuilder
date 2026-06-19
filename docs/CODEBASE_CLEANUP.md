# Codebase Cleanup — canonical code-task log

**Purpose:** The canonical log of **CODE** cleanup tasks (deferred — mostly Phase-6 semantic/naming cleanup, plus a few dead-code removals). These are distinct from *design* deferrals (now in `ROADMAP.md`) and from doc-reconciliation (the archived `DESIGN_DOC_PATCHES.md` worklist). **All future code-cleanup items go here.**

**Seeded:** Campaign 3c (2026-06-15), from the DP-pending dossier's code-grounded findings. Each item: location · what · why-deferred.

> Note: this supersedes the scattered `DEFERRED_CLEANUP_ITEMS.md` references throughout the old §17.7 (the §17.7 items were reparceled here in the 2026-06-19 restructure; `V6_EXTRACTED_SECTIONS.md` is deleted).

---

## Dead code

- **`RunManager.applyInterest()`** — `src/systems/RunManager.js` (~line 1359). Zero callers in `src/` (the live interest path is the `interest` term inside `calculateKiReward`, push-scaled). It is the literal embodiment of the obsolete "round-start passive interest" model. **Remove.** Why deferred: behavior-neutral, low priority. (Dossier Unfiled #7.)

## Naming / semantic renames

- **`card.ribbonStamp` (current code) → `card.stamp` (intended)** — rename direction: current code uses `card.ribbonStamp` everywhere (`GameRoundManager.js` reads it at every stamp dispatch site; `shopCards.js` / `consumables.js` `mixStamps` write it; `SpiritEffects.js` / `_computeRetriggerCount` read it; the test suite asserts `.ribbonStamp` as `[PRESERVE]`). The design-doc / canonical name is `card.stamp`. `ribbonStamp` is also *misleading* — stamps apply to ANY card, not just ribbons (the apply path stamps plains in tests), so `stamp` is both cleaner and more accurate. Why deferred: pervasive find-replace touching every stamp path plus the `[PRESERVE]` tests — do it in one focused pass. (Dossier Unfiled #12; §8.4.5 already notes the doc-vs-code name gap.)
- **`legend_*` → `rare_*` ID prefix for the demoted rares** — the 5 former demoted rares are already `engine_*` in code (engine_wuji/dao/chi/tengu/feng_shui), so the old "rename `legend_*` → `rare_*`" task is partly moot; verify no `legend_*` IDs remain (Gankyil was cut). Why deferred: ID renames ripple through save-state keys and references. (Dossier Unfiled, ex-§16/§17.7.)
- **`tooltipBase` → scoring-values rename + `_tb` accessor** — see `ROADMAP.md` 5A (D1, Phase-5 semantic rename; sequenced after Wave B). Logged there as a *design* item; the code task lives under it.
- **`_dogProtection` flag → `_pushPenaltySuppression` / `_rabbitActive`** — legacy name from the deprecated `consumable_dog`; Rabbit (`zodiac_rabbit`) is the current consumer. (§8.5.2 documents the legacy artifact.)

## Stale data-strings (code-side description lag)

- **`zodiac_cat` description** — `src/data/consumables.js` still reads "...Tier 1 Foundation spirit". Actual pool is all Tier-1 commons (currently 27, by rarity, symbionts excluded). V6 §8.5 is corrected; the code string lags. (DP-24.)
- **"Coming soon" description fields** — `econ_replica`, `econ_collector` are functional but their `description` reads "Coming soon" (label cleanup). NOTE: `econ_print` is *intentionally* non-functional (`rarity: null`, pending F5.9) — leave it. `game_echo`'s description was already corrected. (DP-07; dossier Unfiled #10.)
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
- **Legacy `consumable_*` entries** (horse/dog/pig/rooster) superseded by zodiac equivalents but still in code.
- **`_markMode`-family renames** — `_markMode`→`_cardTargetMode` was done in a prior pass; verify/finish `_activateMark`→`_activateCardTarget`, `_onMarkCardSelected`→`_onCardTargetSelected`, `_showBoosterPack(markDef)`→`(consumableDef)`.

**Card data:**
- **`december_plain_3` deprecated entry** in `cards.js` (replaced by `december_ribbon`).
- **May/September animal naming** — display names "Iris Fireflies"→"Iris Dragonfly", "Chrysanthemum Cricket"→"Chrysanthemum Fireflies" (IDs stay). (Also a design-name note in §17.3.)

**Architectural (lower priority):**
- **`calculateFinalScore()` vestigial method** (ScoringEngine) — output discarded by all callers, retained only for the metal-proc side effect; the two-scoring-paths debt.
- **`addKi`/`spendKi` 'unspecified' reason strings** — many callers pass 'unspecified' instead of meaningful telemetry tags.
- **Paramita / Yaku-Upgrades obsolete code** — `RunManager.buyYakuUpgrade()` + related state from the removed scoring system; audit + removal.

**Terminology (from §17.3):**
- **"Three Marks" terminology** — stale label for persistent card mutations (Demon, etc.); replace with current terms.
