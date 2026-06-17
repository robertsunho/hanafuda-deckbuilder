# Hanatu — Deferred Design (V7 seed)

**Purpose:** Forward-looking / deferred-design content that does NOT belong in `DESIGN_DOC_V6.md` (which documents only current, shipped behavior). This file collects the Phase-5 design intents that were stripped out of V6 during Campaign 3b so they are not lost; it seeds a future V7 once Phase 5 ships.

**Convention:** Each entry states (a) the current behavior (as documented in V6), (b) the deferred intent, and (c) its F5.x / Phase-5 pointer. When a Phase-5 item ships, fold its resolved spec into V7 and remove it here.

**Source:** Campaign 3b (2026-06-15), Parts C3 + D. DP references point to `process/DESIGN_DOC_PATCHES.md`.

---

## D1 — `tooltipBase` → scoring-values rename (DP-65 / Phase 5)

- **Current (V6):** Spirit scoring constants live in a `tooltipBase` field, read via the `_tb` accessor inside the scoring formulas; the tooltip is now just one consumer of it, not the field's purpose. (V6 does not surface the field name in prose, so no inline V6 text was changed.)
- **Deferred intent:** Rename `tooltipBase` to reflect that it holds canonical scoring/tuning values (candidates: `scoringBase` / `baseValues` / `tuningValues` / `spiritBase`), rename the `_tb` accessor to match, and reconsider the internal keys under the new framing (e.g. `jackpotMult` is actually a `Math.pow` exponent base, not a mult). Behavior-preserving semantic cleanup, not a find-replace — a small naming cluster.
- **Sequencing:** Phase 5, AFTER Wave B settles the field shape (F3.16 scoring-log schema redesign + F4.37 tooltip recomb still read / may reshape it). Rename once against the settled shape.

## D2 — Earth (Clay/Pottery) per-capture redesign (DP-72 / F5.8)

- **Current (V6, §8.2.2):** Earth-enhanced cards generate round-end ki interest — Clay 10% / Pottery 20% of current ki per Earth card held at round end — feeding the Fossil engine. The held-in-hand mult channel is ×1.0 except under `boost_earth` (hex_15).
- **Deferred intent:** Replace the round-end % interest with a per-capture flat-ki model — Clay +3 ki per scoring, Pottery +3 ki + 1 interest per scoring — and retire the no-op mult channel. Magnitudes pending playtest.
- **Status:** SPECULATIVE. F5.8 will update §8.2.2 when built.

## D3 — Negative-aware fusion (DP-73 / F5.11)

- **Current (V6, §8.6.1):** Negative (transcended) spirits cannot be used as Cinnabar/Pearl fusion inputs — only regular spirits fuse (incidental: the fusion paths read the regulars-only spirit set). The Cuckoo Egg hatch is the one negative-aware fusion path (a Negative Cuckoo hatches a Negative Tier-2 fusion).
- **Deferred intent:** Make negatives fusable — negative + regular → regular fusion; negative + negative → negative fusion at the lower `powerLevel`; the negative's `powerLevel` decrements per use.
- **Open sub-rulings:** Mercury de-fusion of negatives; Jade `powerLevel`-up interaction; Amber/Sulfur exclusion. Not finalized.
- **Status:** SPECULATIVE / Phase 5; magnitudes and Mercury/Jade interactions not yet decided.

## D4 — Festival per-round cap (DP-74 / F5.1)

- **Current (V6, §7.9):** Festival generates one stamp of the captured ribbon's color per stack, per ribbon captured, hard-gated only by free consumable-inventory slots — there is no separate per-round cap; the slot gate IS the cap.
- **Deferred intent:** An explicit per-round cap / cooldown / scale-down. B-13 flagged unbounded generation as a balance risk; ruled ratify-current for now.
- **Status:** SPECULATIVE Phase-5 balance task (F5.1).

## D5 — Legendary offering re-enable (DP-67 / Phase-5 shop revamp)

- **Current (V6, §12.2 / §13.11):** The Sacred Grove spirit quadrant offers the same Tier-1 (non-legendary) pool as Wayside — more offering slots, no legendary roll. The old 15% Grove legendary roll + `_pickRandomLegendary` machinery was removed from the shop.
- **Deferred intent:** Re-introduce legendary *offering* as part of the larger Phase-5 shop reorganization (rebuilt fresh after the shop revamp). This is a deferral, not a permanent removal of the concept.
- **Dormant infra retained:** Buy-side legendary purchase routing + `addLegendarySpirit` / `canAddLegendary` + the capstone/Pearl creation path remain live (dormant).

## D6 — Misc-engine diversity pass (Robert's note / Phase 5)

- **Current (V6, §7.6.4):** Miscellaneous Engines is a large bucket — Missing Number, Palace, Ship, Surplus, Kintaro, Bullseye, Lincoln, Napoleon, plus the 5 former "demoted rares" (Wuji, Dao, Chi, Tengu, Feng Shui) folded in during Campaign 3b.
- **Deferred intent:** Evaluate this bucket in Phase 5 for build-diversity — change/add effects so the cluster supports more distinct archetypes rather than a pile of overlapping mult-mult engines.
- **Status:** Design note, Phase 5.

## D7 — Amber rebalance (DP-02b / Phase 5)

- **Current (V6, §7.2):** Natural transcendence is lossless (`powerLevel = stackCount`, 4× base, free) and unified with Amber via the same `_buildTranscendedNegative` path. Amber additionally costs −1 permanent field slot.
- **Deferred intent:** Amber's niche — full power in exchange for a permanent field slot — is now dominated by free lossless natural transcendence. A Phase-5 rebalance should restore a distinct value for Amber (its unique lever is forced transcendence at sub-4 stacks; the slot cost and power tradeoff need revisiting).
- **Status:** Open balance item, Phase 5.

## D8 — Ducks redesign (DP-06 / Phase 5)

- **Current (V6, §7.15):** Ducks keeps a counter (+1 per deck-flip match, −1 per strand, floored at 0) and contributes ×(1 + counter × 0.2 × stacks).
- **Deferred intent:** Redesign candidate — the additive-counter model is a placeholder for a more interesting deck-flip/strand mechanic.
- **Status:** SPECULATIVE / Phase 5.

## D9 — Double-trigram (8 modes) redesign, incl. hex_29 board layout (DP-47 / DP-59 / Phase 5)

- **Current (V6, §9.2):** The 8 double-trigram hexagrams are documented at current behavior. hex_29 (Kǎn) uses `match_by_rank` + `disablesYaku`; its in-code description already notes "undergoing redesign."
- **Deferred intent:** A Phase-5 redesign and reimplementation of all 8 double-trigram modes, including a rank-aware board layout for hex_29 so rank-matching feels coherent (the F2.2 attempt was reverted after playtest). ~4–6h for the hex_29 piece.
- **Status:** Deferred, Phase 5.

## D10 — Pre-release production: tutorial + art (DP-60 / DP-57 / Phase 5)

- **Current (V6, §16.13):** Tutorial/onboarding is not implemented; final art production is ongoing. Speculative cards are already shop-integrated (the old "shop integration awaits art" premise was stale — the shop draws from the speculative pool today).
- **Deferred intent:** Phase-5 pre-release work — a tutorial/onboarding flow and final art-asset production (the latter is the real milestone gate; speculative *shop* integration is already done).
- **Status:** Phase 5 / pre-release.

---

## Also tracked elsewhere (pointers, not owned by this file)

- **Negative-consumables system** — the `addNegativeConsumable` / `_negativeConsumables` infra is retained; only Waidan-as-its-source was cut. A Phase-5 build will re-source it. (DP-68)
- **hex_29 (Kǎn) board-layout redesign** — deferred to the Phase-5 double-trigram redesign (see D9). The hex_38 / DP-36-vs-DP-46 conflict was **resolved in Campaign 3c**: code ships DP-46 (`bright_and_plains`) and V6 §9.3.12 now matches.
- **Mirror/Memory `^n` copy-scaling** — a known deviation from the linear-stacking canon (DP-75), under its own deferred recon (banked in `OVERHAUL_PLAN.md`). V6 does NOT claim Mirror/Memory are linear-consistent.
