# Codebase Cleanup — canonical code-task log

**Purpose:** The canonical log of **CODE** cleanup tasks (deferred — mostly Phase-6 semantic/naming cleanup, plus a few dead-code removals). These are distinct from *design* deferrals (`DESIGN_DEFERRED.md`) and from doc-reconciliation (the DP worklist in `DESIGN_DOC_PATCHES.md`). **All future code-cleanup items go here.**

**Seeded:** Campaign 3c (2026-06-15), from the DP-pending dossier's code-grounded findings. Each item: location · what · why-deferred.

> Note: this supersedes the scattered `DEFERRED_CLEANUP_ITEMS.md` references throughout the old §17.7 (now extracted to `V6_EXTRACTED_SECTIONS.md`). Reparcel those into this file in a later pass.

---

## Dead code

- **`RunManager.applyInterest()`** — `src/systems/RunManager.js` (~line 1359). Zero callers in `src/` (the live interest path is the `interest` term inside `calculateKiReward`, push-scaled). It is the literal embodiment of the obsolete "round-start passive interest" model. **Remove.** Why deferred: behavior-neutral, low priority. (Dossier Unfiled #7.)

## Naming / semantic renames

- **`card.ribbonStamp` (current code) → `card.stamp` (intended)** — rename direction: current code uses `card.ribbonStamp` everywhere (`GameRoundManager.js` reads it at every stamp dispatch site; `shopCards.js` / `consumables.js` `mixStamps` write it; `SpiritEffects.js` / `_computeRetriggerCount` read it; the test suite asserts `.ribbonStamp` as `[PRESERVE]`). The design-doc / canonical name is `card.stamp`. `ribbonStamp` is also *misleading* — stamps apply to ANY card, not just ribbons (the apply path stamps plains in tests), so `stamp` is both cleaner and more accurate. Why deferred: pervasive find-replace touching every stamp path plus the `[PRESERVE]` tests — do it in one focused pass. (Dossier Unfiled #12; §8.4.5 already notes the doc-vs-code name gap.)
- **`legend_*` → `rare_*` ID prefix for the demoted rares** — the 5 former demoted rares are already `engine_*` in code (engine_wuji/dao/chi/tengu/feng_shui), so the old "rename `legend_*` → `rare_*`" task is partly moot; verify no `legend_*` IDs remain (Gankyil was cut). Why deferred: ID renames ripple through save-state keys and references. (Dossier Unfiled, ex-§16/§17.7.)
- **`tooltipBase` → scoring-values rename + `_tb` accessor** — see `DESIGN_DEFERRED.md` D1 (Phase-5 semantic rename; sequenced after Wave B). Logged there as a *design* deferral; the code task lives under it.
- **`_dogProtection` flag → `_pushPenaltySuppression` / `_rabbitActive`** — legacy name from the deprecated `consumable_dog`; Rabbit (`zodiac_rabbit`) is the current consumer. (§8.5.2 documents the legacy artifact.)

## Stale data-strings (code-side description lag)

- **`zodiac_cat` description** — `src/data/consumables.js` still reads "...Tier 1 Foundation spirit". Actual pool is all Tier-1 commons (currently 27, by rarity, symbionts excluded). V6 §8.5 is corrected; the code string lags. (DP-24.)
- **"Coming soon" description fields** — `econ_replica`, `econ_collector` are functional but their `description` reads "Coming soon" (label cleanup). NOTE: `econ_print` is *intentionally* non-functional (`rarity: null`, pending F5.9) — leave it. `game_echo`'s description was already corrected. (DP-07; dossier Unfiled #10.)
- **`hexagrams.js` flavor text for `volatile_flow` / `stable_flow`** — the in-code player-facing descriptions are stale vs the push-curve-amplifier implementation (V6 §9.3.8 / §5.6 are now correct; the code flavor strings are not). Low priority. (§9.4 note; dossier Unfiled #6.)

## Already done (no action — recorded for closure)

- **`consumables.js` Crown Chakra data-string** — already corrected to "Copy all attributes… exact duplicate". V6 §8.1 was the lagging side (fixed in 3c). No code action.
- **`spirits.js` header comment** — already reads 110 total / 78 Tier 1, matching the live array. No code action. (DP-15.)
- **`econ_bonds` / `interestRate()`** — already uncapped (+5%/stack, no clamp); the old "+25% hard cap" cleanup is moot (cap never existed in the current code). No code action. (DP-10.)
