# DESIGN_DOC_V5.md Patches Worklist

**Purpose:** This document inventories every known design doc discrepancy surfaced during the Hanatu codebase audit (Phases 0-3). Each patch entry includes the source decision, the design doc section affected, what the doc currently says (when known), what it should say, and verification guidance.

**Status (2026-06-02):** Worklist compiled at end of Phase 3 for handoff to a fresh conversation where the patches will be applied with the actual design doc in context.

**Source-of-truth note:** DESIGN_DOC_V5.md is the authoritative reference document for Hanatu. CONSUMABLE_ROSTER_V4.md and SPIRIT_ROSTER_V5.md are obsolete and should be disregarded if they conflict. F4.14 in OVERHAUL_PLAN.md is the parent task; this file is its applied worklist.

**How to use this document:**

1. Open the actual DESIGN_DOC_V5.md
2. Work through each patch entry in order (sections are organized roughly by design doc structure)
3. For each entry: locate the doc section, compare against current code, apply the correction
4. Mark each patch as ✅ applied or ⏸️ deferred (with reason) as you go
5. If a patch entry is unclear or the doc state has changed since the audit captured it, verify against the live codebase and use DECISIONS_LOG.md for full context

**Effort estimate:** 4-6 hours for mechanical doc reconciliation. An additional 6-10 hour editorial description rewrite pass is logged separately (see §"Editorial rewrite scope" at the end).

---

## §6 (Run Structure)

### DP-01: Sacred Grove cadence
**Source:** OVERHAUL_PLAN.md §Initial findings; DECISIONS_LOG.md line 21
**Issue:** Design doc says "Grove every act end" (6 visits/run). Code shipped "Grove every 3 rounds" (12 visits/run).
**Decision:** Keep code as-is; update doc.
**Patch:** §6.2 should describe Grove cadence as "every 3 rounds (12 Groves per 36-round run, at rounds 3, 6, 9, ..., 36)" rather than act-end.

---

## §7 (Spirits)

### DP-02: Negative spirit data model
**Source:** F1.8.a; DECISIONS_LOG.md line 2839
**Issue:** Doc treats negatives as using `stackCount: N`. Implementation uses `stackCount: 1, powerLevel: N`.
**Patch:** §7 wherever negative spirits are discussed:
- Negatives have `stackCount: 1` and `powerLevel: N` (not `stackCount: N`)
- Tooltip header convention: "Negative (power ×N) — zero-slot"
- Sale refund formula for shop-bought negatives: `cost × 0.5 × powerLevel`
- F4.13 (Phase 4) will formalize this further; the doc-side update describes current behavior

### DP-02b: Transcendence powerLevel semantics (F4.26 — Option B)
**Source:** F4.26 ruling (DECISIONS_LOG, 2026-06-12)
**Issue:** Natural cascade transcendence previously created a Negative at `powerLevel = min(3, stackCount-1)`
(= 3, the 4th stack consumed as catalyst), inconsistent with Amber's full-power transcend.
**Patch:** §7 (transcendence): natural transcendence `powerLevel = stackCount` (all 4 contribute,
**lossless** — free a slot, keep full power); natural and Amber transcendence are now unified at full
power. (Amber's "full power for a permanent field slot" niche is now dominated by free natural
transcendence — pending a Phase-5 rebalance; note the open item rather than documenting Amber as a
distinct power tier.)

### DP-03: Per-element accumulator architecture
**Source:** F1.8.b; DECISIONS_LOG.md line 2844
**Issue:** Doc doesn't describe per-element state architecture.
**Patch:** Document that 24 accumulator spirits use per-element state. Tooltip displays "longest-held element value" for events-seen, aggregate for mult contribution. Cascading transcendence aggregation uses longest-held element.

### DP-04: Symbiosis (S-002)
**Source:** F2.1; DECISIONS_LOG.md line 2920
**Issue:** Doc §7.9 and §7.17 say Symbiosis "summons N different symbionts per animal capture."
**Patch:** Update to "summons 1 symbiont species per captured animal, stacked at Symbiosis's stack count." Excess stacks (over 3) transcend into Negative copies.

### DP-05: Cuckoo Egg (S-004)
**Source:** F2.1; DECISIONS_LOG.md line 2922
**Issue:** Doc §7.17 says Cuckoo Egg auto-hatches after 3 rounds.
**Patch:** Update to "Per stack, 3-round maturity countdown. Player sells the spirit to hatch into a random Tier-2 fusion spirit (slot-limited)."

### DP-06: Ducks (S-005)
**Source:** F2.1; DECISIONS_LOG.md line 2924
**Issue:** Doc claims geometric doubling/halving formula. Code uses additive +1/-1 accumulator, floored at 0, multiplied by 0.2 × stacks.
**Patch:** Temporarily align doc to code. Flag for Phase 5 redesign (Robert flagged as redesign candidate).

### DP-07: Print spirit (S-010)
**Source:** F2.1; DECISIONS_LOG.md line 2926
**Issue:** Doc §7.10.3 and §7.8 say Echo, Replica, Print, Collector are "functional but with 'Coming soon' descriptions." Recon confirmed all four were non-functional pre-F2.1.b.
**Patch:**
- Echo, Replica, Collector: functional as of F2.1.b — describe their current mechanics
- Print: non-functional pending F5.9 (per-round consumable applier — see F5.9 design)

### DP-08: Catcher (S-013)
**Source:** F2.1; DECISIONS_LOG.md line 2930
**Issue:** Doc §7.11.1 says caught cards go to field. Code returns cards to hand.
**Patch:** Update §7.11.1 to "Catches up to N cards per round (N = stack count). Caught cards return to hand instead of being lost."

### DP-09: Capstone Time (S-022)
**Source:** F2.1, F2.6.c; DECISIONS_LOG.md line 2932
**Issue:** Doc §7.16 claims push success ×1.3, push failure ×0.95, round-end decay ×0.98. Actual code:
- Flow does not decay between rounds (×1.0)
- Push success amplifier scales delta-from-neutral by ×1.5 (depth 1: ×1.15, depth 2: ×1.375, depth 3: ×1.675)
- Push failure amplifier scales delta-from-neutral by ×0.5 (depth 1: ×0.95, depth 2: ×0.90)
- Effect SCALES WITH PUSH DEPTH
- Compounds multiplicatively with hexagram amplifiers (hex_64 Wèi Jì and hex_63 Jì Jì)
**Patch:** Update §7.16 to remove specific multiplier claims, replace with delta-amplification description.

### DP-10: Bonds description
**Source:** F2.1; DECISIONS_LOG.md line 2943
**Issue:** Doc mentions "+25% cap" on Bonds, which doesn't exist in code.
**Patch:** Update to "+5% per stack" with no cap. (Phase 5 tuning F5.1 will revisit base value.)

### DP-11: Echo channel correction
**Source:** F2.1; DECISIONS_LOG.md line 2944
**Patch:** Echo channel field corrected from 'gameplay' to 'retrigger' in spirits.js. Doc should reflect this if channels are listed.

### DP-12: Past Life channel correction
**Source:** F2.1; DECISIONS_LOG.md line 2945
**Patch:** Past Life channel field corrected from 'utility' to 'meta'. Doc should reflect this if channels are listed.

### DP-13: Past Life mechanics
**Source:** D0.24; DECISIONS_LOG.md line 2857
**Patch:** §7 wherever Past Life is described:
- 3-round hold mechanic
- Power-uniform copy semantics
- Per-element acquired-round tracking
- F3.14 (deferred to Phase 5) would add a visual activation indicator; tooltip already conveys maturity status

### DP-14: Symbiosis cascade transcendence
**Source:** F1.1 followup
**Patch:** Document Recycling stack-scaling and Catcher Osprey-style redesign as part of the symbiosis architecture.

### DP-15: spirits.js header comment
**Source:** F2.1; DECISIONS_LOG.md line 2942
**Patch:** Codebase comment updated to reflect 113-spirit catalog (was "28 foundation spirits"). Doc should reflect the current spirit total — verify against current spirit count in code.

### DP-16: Engine Lincoln "without pushing" clause
**Source:** OVERHAUL_PLAN.md line 1813
**Issue:** `engine_lincoln` description specifies "+0.1 additive mult each time you bank without pushing." Implementation may not enforce the "without pushing" clause.
**Patch:** Verify implementation in code first. If code is correct, no doc change. If code is wrong, F4.36 or testing pass will fix; then doc should match.

### DP-17: Negative transcendence semantics
**Source:** D0.21; DECISIONS_LOG.md line 2150
**Patch:** Document "preservation of pre-transcend regular mult contribution" semantics in the transcendence section of design doc and (if it exists) SPIRIT_ROSTER_V5.md.

---

## §8 (Consumables — Chakras, Stamps, Elements, Editions, Alchemicals)

### DP-18: Crown Chakra description
**Source:** F2.3; DECISIONS_LOG.md line 2949
**Issue:** Doc §8.1 says "Copy identity, preserving target's enhancements."
**Patch:** Update to "Copy all attributes (rank, month, axes, enhancement, stamp, edition) of one card onto another. Target becomes exact duplicate of source. Reference card unchanged; target card replaced including all decorations. Target's deck-slot id preserved for tracking."

(Note: F3.15 item 4 shipped `target.baseImageId = source.baseImageId ?? source.id` to ensure visual identity also copies. Mention this if §8.1 discusses sprite rendering.)

### DP-19: Stamp tier system (4 tiers)
**Source:** F2.3; DECISIONS_LOG.md line 2950
**Patch:** §8.4 should explicitly list 4 stamp tiers:
- Primary
- Secondary
- Tertiary
- Quaternary

Gray Stamp moves from Tertiary to Quaternary tier (distinct from Black, to reflect its retrigger-as-amplifier identity).

### DP-20: Stamp mixing recipes
**Source:** F2.3, F2.10a; DECISIONS_LOG.md line 2951
**Patch:** §8.4.5 (or 8.4.3-4) should document the primary-pair → secondary stamp recipes that exist in STAMP_MIX matrix:
- Red + Yellow → Orange
- Blue + Yellow → Green
- Blue + Red → Purple

Doc currently only mentions Sacred Grove as the Secondary acquisition path; crafting is an additional path.

### DP-21: Stamp tier-shuffle effects (Option C)
**Source:** F2.3; DECISIONS_LOG.md line 2952
**Patch:** §8.4 should document the full stamp effect table with tier-aware effect shifting:

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

Each tier ascent shifts effects between triggers (within-pair swap at Secondary, three-way rotation at Tertiary). This replaces older Black "fire all three on any trigger" model.

### DP-22: Retrigger architecture
**Source:** F2.3 Prompt B; DECISIONS_LOG.md line 2976
**Patch:** Add new section (or extend §8.4.5) documenting trigger-type-aware retrigger architecture:
- Four trigger types: `'capture'`, `'held_in_hand'`, `'discard'`, `'yaku'`
- `'capture'` covers both scoring math (Phase 1.5) and capture-trigger stamp effects (fire in same atomic event)
- Rank retrigger spirits (Dew/Wish/Family/Rainbow) operate on `'capture'` for matching rank — retrigger both scoring AND any capture-trigger stamp on the matching card
- Applause operates on `'held_in_hand'`
- White stamp adds 1 retrigger to ANY trigger type; Gray adds 3
- Spirit retriggers and stamp retriggers compose ADDITIVELY: Dew + White-stamped plain = 3 scorings total, not 4
- Mirror/Memory meta-spirits inherit their target's trigger scope via delegation
- Future design space: spirits that retrigger `'discard'` or `'yaku'` events remain open

### DP-23: Compound retrigger math correction
**Source:** F2.10b; DECISIONS_LOG.md line 2866
**Patch:** Document the F2.10b retrigger compounding correction. Verify the doc's current retrigger math against the F2.10b spec.

### DP-24: Cat zodiac common pool
**Source:** F2.3; DECISIONS_LOG.md line 2966
**Issue:** Doc §8.5.1 says "16 candidates."
**Patch:** Update to reflect dynamic Common pool (currently 27 Tier 1 commons; expands if more are added). Filter is by rarity, excludes symbionts.

### DP-25: Amber alchemical
**Source:** F2.3, D0.21; DECISIONS_LOG.md line 2967
**Issues:**
- Doc has caveat "codebase restricts Amber to 3-stack inputs only — this is incorrect implementation." Code is correct: supports 1/2/3-stack inputs.
- Amber "any spirit" + stack-preservation rule (D0.21)
- Amber transcendence costs 1 field slot for the rest of the run (Robert clarification 2026-06-02)
**Patch:** §8.6.2:
- Remove the caveat about 3-stack only
- Document "any spirit" + universal stack-preservation rule
- Document field slot cost per transcendence

### DP-26: Pearl alchemical
**Source:** F2.3; DECISIONS_LOG.md line 2968
**Issue:** Doc §8.6.1 says "Pearl preserves the components rather than consuming them."
**Patch:** Update to "Pearl consumes the components (decrement stack by 1 per input)." Code is authoritative.

### DP-27: Lead alchemical
**Source:** F2.3; DECISIONS_LOG.md line 2969
**Issue:** Doc §8.6.3 has caveat "Lead's pool excludes any rare spirit the player has already at 3-stack with an existing Negative copy."
**Patch:** Remove the caveat. Lead now allows cascade transcendence — if a rolled Rare is already at 3-stack, the helper produces a new negative.

### DP-28: Iron description
**Source:** F2.3; DECISIONS_LOG.md line 2970
**Issue:** Description bug.
**Patch:** §8.2.2 should describe Iron as "×1.5 mult when held in hand during scoring" (not "when captured").

### DP-29: Earth/Clay description
**Source:** F2.3; DECISIONS_LOG.md line 2971
**Patch:** §8.2.2 should describe Earth as "10% ki/round interest when held in hand."

### DP-30: Wu Xing destructive cycle consistency
**Source:** F2.3; DECISIONS_LOG.md line 2972
**Patch:** §8.2 — all 5 Wu Xing element descriptions should mention their destructive partner for consistency.

### DP-31: Wu Xing hexagram cycle separation
**Source:** DECISIONS_LOG.md line 127
**Patch:** §9.5 should note: "Wu Xing hexagrams operate on the destructive cycle. The generative cycle is reserved for the deck-mod upgrade system."

### DP-32: Stamp description discard qualifier
**Source:** OVERHAUL_PLAN.md line 3194
**Issue:** Blue/Green/Purple/Black/Gray stamps have "due to a full field" qualifier in descriptions.
**Patch:** Remove qualifier. They should fire on any discard pathway. (Also applies to spirits.js descriptions — code-side fix tracked under F4.14 + spirits.js descriptions cleanup.)

### DP-33: Consumable roster cleanup (legacy entries)
**Source:** DECISIONS_LOG.md line 2622
**Background:** ConsumableEffects.js previously had 4 legacy consumables (Horse, Dog, Pig, Rooster — pre-V1) that were dead code. These were removed and the natural names freed up for the 12 zodiac consumables.
**Patch:** Verify §8.5 documents only the current zodiac consumable roster (13 zodiacs total: rat, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog, pig, cat).

### DP-34: Sacred Grove fusion removal
**Source:** DECISIONS_LOG.md line 395-399
**Issue:** Sacred Grove had a free fusion ritual UI section that bypassed alchemicals. Removed.
**Patch:** §8.6 should specify fusion happens exclusively through Cinnabar (T2/T3 fusion) and Pearl (T4 capstone fusion). The Sacred Grove free fusion path is removed.

### DP-35: Capstones never in shop
**Source:** D0.16; DECISIONS_LOG.md line 2851
**Patch:** Document that capstones never appear in shop offerings. Pearl recipe is sole creation path.

---

## §9 (Hexagrams)

### DP-36: hex_38 Kuí spec simplification
**Source:** F2.2 Category 1; OVERHAUL_PLAN.md line 2873
**Patch:** Remove "Kasu threshold -1" from doc spec. Proportional yaku thresholds handle this automatically. Doc text simplifies to "Bright cards removed from deck."

### DP-37: hex_06 Sòng push failure cost
**Source:** F2.2 Category 1; OVERHAUL_PLAN.md line 2874
**Issue:** Doc says "push failure costs up to 10 ki."
**Patch:** Change to "push failure costs 10 ki." (Floor at current ki balance still applies in implementation but doesn't need surfacing in doc.)

### DP-38: hex_64 Wèi Jì (volatile_flow)
**Source:** F2.2 Category 2 / F2.6.b; OVERHAUL_PLAN.md line 2893
**Patch:** §9 should describe hex_64 as using new push-curve amplifier architecture:
- `pushCurveSuccessAmplifier: 1.5`
- `pushCurveFailureAmplifier: 1.5`
- `modifyFlowDecay: 0.85`
- Effect: bigger wins, worse losses, faster decay

### DP-39: hex_63 Jì Jì (stable_flow)
**Source:** F2.2 Category 2 / F2.6.b; OVERHAUL_PLAN.md line 2894
**Patch:** §9 should describe hex_63 as:
- `pushCurveSuccessAmplifier: 0.5`
- `pushCurveFailureAmplifier: 0.5`
- `modifyFlowDecay: 0.98`
- Effect: gentler wins and losses, slower decay

### DP-40: Deck composition hexagrams (descriptions)
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md lines 2883-2887
**Patch:** §9 entries for these hexagrams should match their corrected descriptions:
- **hex_25 day_deck:** "All night cards removed. Remaining day cards duplicated."
- **hex_53 night_deck:** "All day cards removed. Remaining night cards duplicated."
- **hex_44 air_deck:** "All land cards removed. Remaining air cards duplicated."
- **hex_37 land_deck:** "All air cards removed. Remaining air cards duplicated."
- **hex_62 Xiǎo Guò:** Description clarified to "Each play triggers 2 deck flips instead of 1" (NOT preview/reveal — different from hex_51).

### DP-41: hex_17 Suí (animal_deck) redesign
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2901
**Patch:** §9 should describe hex_17 as redesigned: operates on speculative-augmented deck. Every month's ribbon (base or speculative) becomes a duplicate of that month's animal. Result: 12 months × 2 animals + brights + plains.

### DP-42: hex_31 Xián (ribbon_deck) redesign
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2902
**Patch:** Mirror of hex_17. Every month's animal becomes a duplicate of that month's ribbon (using speculative ribbons for Aug and Dec). Result: every month has 2 ribbons.

### DP-43: hex_39 Jiǎn (deck_36 → no-plains)
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2903
**Patch:** §9 should describe redesigned hex_39: Deck = 36 cards. Each month features 1 bright + 1 animal + 1 ribbon (using speculatives where needed). Field +1 preserved.

### DP-44: hex_23 Bō (all-plains-only)
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2904
**Patch:** §9 should describe inverted hex_23: All brights, animals, ribbons removed. Each month has 2 distinct plains (November uses `november_plain_2`; December uses 2 Paulownia plains since `december_plain_3` is deprecated). All plains duplicated → 4 plains per month. Deck = 48 cards.

### DP-45: hex_20 Guān (deck_60) redesign
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2905
**Patch:** Deck = 60 cards consisting of 1 bright + 1 animal + 1 ribbon + 2 plains per month (uses all 13 speculative cards). Hand size +1 preserved.

### DP-46: hex_38 Kuí (no-brights → bright+plain)
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2906
**Patch:** Each month: 1 bright (speculative if needed) + 3 plains (duplicate one of the 2 distinct plains per month). 48 cards total. Removes Kasu threshold modifier (DP-36).

### DP-47: hex_29 Kǎn — REVERTED, redesign deferred
**Source:** F2.2 Category 4; OVERHAUL_PLAN.md line 2900
**Status:** F2.2 attempted redesign was reverted after playtest. Full redesign deferred to **F2.2.x — hex_29 board layout redesign for rank-matching coherence**.
**Patch:** §9 should describe current hex_29 as still using `match_by_rank` + `disablesYaku`. (Phase 3 F3.20 added explanatory UX subtitle.) Flag for future redesign in §17 deferreds.

### DP-48: hex_21 Shì Kè (graduated spirit tax)
**Source:** F2.2 Category 3; OVERHAUL_PLAN.md line 2910
**Patch:** Replace tax table (1/3/6/10 for spirit counts 5/6/7/8) with cleaner formula: "3 ki per spirit beyond 4, end of round. Negative spirits count toward total." So 5 spirits = 3 ki, 6 = 6 ki, 7 = 9 ki, 8 = 12 ki.

### DP-49: hex_24 Fù + hex_16 Yù economy separation
**Source:** F2.2 Category 3; OVERHAUL_PLAN.md line 2911-2913
**Patch:**
- **hex_24 (Fù):** Start with 50 ki, zero `modifyKiReward`, zero `modifyHandKi`, zero `modifyInterestRate`. Spirit/stamp/consumable ki still earned.
- **hex_16 (Yù):** No hand-card ki bonus at round end. Each capture grants +3 ki. Push/Bank decision works normally. (Effect ID `no_banking_ki_plus_capture` may be renamed to `no_hand_ki_plus_capture` to match actual mechanic.)

### DP-50: hex_45 / hex_46 (style_ki_double / style_flow_double)
**Source:** F2.2 Category 3; OVERHAUL_PLAN.md line 2914
**Issue:** Codebase descriptions claim the non-doubled resource is "unchanged" — incorrect (code zeros it).
**Patch:** Update in-game descriptions. Doc text already correct; no doc change needed (only description text fix).

### DP-51: hex_07 Shī, hex_54 Guī Mèi, hex_10 Lǚ — no doc change needed
**Source:** F2.2; OVERHAUL_PLAN.md lines 2876-2878
**Status:** Doc and code already match for these hexagrams. In-game descriptions were the outliers (now fixed). No design doc changes needed; recorded here for completeness.

---

## §11 (Economy / Push-Bank)

### DP-52: Style combo ki — per-combo mid-round
**Source:** F2.6 / D0.18; DECISIONS_LOG.md line 1265
**Patch:** §11 economy section should reflect:
- Style combo ki is per-combo mid-round, with spirit-order chaining
- Round-end ki = base + hand + Earth + interest (computed pre-credit)

### DP-53: Push-driven commitment model
**Source:** F2.6; DECISIONS_LOG.md line 2870
**Patch:** §11 should describe Flow and Interest as push-driven, not passive:
- Flow decay applies on push outcomes
- Interest accrues based on push commitments
- Round-end ki decomposition: flat + hand + Earth + interest + hookDelta (F3.9 shipped per-component logging)

### DP-54: hex_64/hex_63/Capstone Time interactions
**Source:** F2.6 / F2.2; OVERHAUL_PLAN.md lines 2893-2895
**Patch:** §11 should note that hex_64, hex_63, and Capstone Time spirit all use the same push-curve amplifier architecture (`pushCurveSuccessAmplifier`, `pushCurveFailureAmplifier`). They compound multiplicatively.

### DP-55: Interest is push-driven, not passive
**Source:** F2.6.c; DECISIONS_LOG.md line 2431
**Patch:** §11 must clarify that interest accrues based on push commitments, not as passive per-round growth. This is a significant doc impact.

---

## §12 (Deck and Card Pools)

### DP-56: Shop card pool source
**Source:** OVERHAUL_PLAN.md line 486
**Patch:** §12.2 should specify that shop uses `speculativeCards` (the full pool including speculative entries), not `baseCards`.

### DP-57: Speculative cards milestone
**Source:** D0.11; OVERHAUL_PLAN.md line 133
**Status:** Speculative card art production is a milestone gate. Speculative cards currently exist as data definitions only; full shop integration awaits art.
**Patch:** §17 should document speculative-integration milestone alongside save/load.

### DP-58: 48-card base deck composition
**Status:** This is foundational and unchanged across Phase 0-3 work, but the redesigns above (DP-41 through DP-46) change which speculative cards substitute in for certain hexagrams.
**Patch:** Verify §12 base deck section is current — should still describe 48-card traditional hanafuda deck. Document the 13 speculative cards as additional data definitions used by deck-modifying hexagrams.

---

## §17 (Deferreds / Future Work)

### DP-59: F2.2.x hex_29 future redesign
**Source:** F2.2 Category 4 reverted; OVERHAUL_PLAN.md line 2900
**Patch:** Add to §17 deferreds: "hex_29 Kǎn — board layout redesign for rank-matching coherence. Initial board layout still stacks by month; needs rank-aware layout for hexagram to feel coherent. Estimated 4-6h."

### DP-60: Save/load, tutorial, art, score threshold tuning
**Status:** These are Phase 5 work items per the OVERHAUL_PLAN. Verify §17 lists them as deferreds with appropriate scope.

### DP-61: F4.24 architecture catalogue
**Source:** Robert's insight 2026-05-15; OVERHAUL_PLAN.md line 3613-3635
**Patch:** Consider adding a new top-level architecture section to DESIGN_DOC_V5.md (OR a separate `ARCHITECTURE.md` companion doc) cataloguing:
- Codebase organization
- Hook and helper reference (which hooks/functions are used across hexagrams/spirits/consumables)
- Patterns for building new features using existing tools

**Decision needed during reconciliation:** main doc section or companion doc? F4.24 task tracks this; resolve at patch time.

---

## §Other (cross-cutting)

### DP-62: Phase 2/3 architectural patterns to document
**Status:** These are systems established or refined during Phase 0-3 that may not have explicit design doc coverage. Consider adding sections or notes describing:

- **`baseImageId` mechanism** (F3.15 item 4): How card sprite identity overrides work for Crown Chakra, hex-duplicate cards, and speculative cards.
- **Tooltip dispatch architecture** (F3.5b): Stack-aware tooltip composition via `tooltipBase` fields and per-spirit contribution functions.
- **Round-end overlay sizing** (F3.22): Pattern for modal overlays that fit within the play area lane.
- **`Math.max(maxSlots, slots.length)` field iteration** (F3.23): How field rendering handles bonus slots from Leaf/Rooster.
- **Ki decomposition with reason coding** (F3.9): Round-end ki components and their semantic labels.
- **Cancel button pattern** (F3.15 item 1): UI affordance for cancelling all consumable activations.
- **Yaku-disabled UX** (F3.20): How hexagrams that disable yaku surface their interaction model.

These can be documented either in the relevant per-system section (e.g., F3.5b in §7, F3.22 in §UI) or in the new architecture catalogue (DP-61).

### DP-63: Transcripts include hexagram context
**Source:** DECISIONS_LOG.md line 2550
**Patch:** Log transcripts now include hexagram context — important for design doc reconciliation when reviewing playtest sessions. Mention in any §section on logging/observability.

### DP-64: Field slot configuration recomputes on demand
**Source:** F2.7; DECISIONS_LOG.md line 2863
**Patch:** Document that mid-round mutations propagate immediately to scoring engine; field slot configuration recomputes on demand; Throat duplicate available same round.

### DP-65: `tooltipBase` → scoring-values rename (Phase-5 semantic, post-Wave-B)
**Source:** Wave A role-inversion (F4.36 — T4.1/T4.2a/T4.2b); banked 2026-06-12.
**Issue:** `tooltipBase` now sources all spirit scoring constants — the effect code reads it via the `_tb`
accessor in scoring calculations, and the tooltip is now just ONE consumer rather than the field's purpose.
The name describes a downstream use, not what the field IS (a reader seeing `_tb(spirit, 'mult', 4)` inside
a scoring formula would reasonably wonder why scoring depends on a "tooltip" field).
**Patch (Phase 5, AFTER Wave B settles the field shape):** rename to reflect canonical scoring/tuning
values (`scoringBase` / `baseValues` / `tuningValues` / `spiritBase` — pick in Phase 5); rename the `_tb`
accessor to match; reconsider the internal keys under the new framing (`jackpotMult` is actually a
`Math.pow` exponent base, not a mult — possibly its own rename). Behavior-preserving semantic cleanup, not
a quick find-replace (it's a small naming cluster). Sequenced after Wave B because F3.16 (scoring-log
schema redesign) and F4.37 (tooltip recomb) still read/may reshape this field — rename ONCE against the
settled shape (the F4.24b / V6 "don't refactor against a churning state" discipline).

### DP-66: Remove Gankyil EVERYWHERE in V5 + correct stale spirit counts
**Source:** F4-LEG3-ROSTER-CUTS (Gankyil cut, Robert's ruling, 2026-06-13); extended by the Gankyil
comment-sweep (2026-06-14), which found V5 residue far beyond §7.13.
**Issue:** `legend_gankyil` was cut from code entirely; the spirit no longer exists. V5 references it in
~10 places, and the spirit-count tables carry stale totals. The counts ALSO had a pre-existing +1
over-count (independently found and corrected in `spirits.js`): the TRUE counts, verified against the
current catalog (12 T0 + 78 T1 + 8 T2 + 8 T3 + 4 T4), are **110 total / 78 Tier 1**, NOT 113/81 and NOT
the naive −2 of 111/79. Auto-capture is now fixed at 4 (FieldManager default; no spirit lowers it).

**Patch (V6) — remove/correct ALL of (line numbers per 2026-06-14 grep; re-verify, V5 may drift):**
- **§7.13 Tier 1 Legendary — Gankyil** (`:1754`–`:1771`) → DELETE the subsection wholesale.
- **TOC entry** for §7.13 (`:88`) → remove the "7.13 Tier 1 Legendary — Gankyil" line.
- **§ 3-card auto-capture** (`:777`, "3-card stack auto-capture (Gankyil spirit)") → DELETE the bullet;
  auto-capture is fixed at 4, no spirit lowers it.
- **§15.1 spirits intro** (`:1318`, "roster of **113 spirits**") → 110.
- **§15.1 Wayside Shrine spirits** (`:1326`, "Tier 1, 81 spirits … and the Tier 1 legendary (Gankyil)")
  → "Tier 1, 78 spirits"; remove the "and the Tier 1 legendary (Gankyil)" clause and the "Rarity ranges
  common to legendary" tail (no Tier-1 legendary remains; demoted rares top out at rare).
- **§ legendary slots prose** (`:1335`, "5 spirits total: Gankyil + 4 capstones") → "4 spirits total: the
  4 capstones" (the 2 legendary slots now hold only the Pearl-created capstones).
- **§ capstone mechanics** (`:1902`, "any combination of Gankyil + capstones") → "any combination of the
  4 capstones".
- **§15.2 catalog intro** (`:3555`, "The full 113 spirits across 17 categories") → 110; VERIFY the "17
  categories" figure — removing the Tier-1-Legendary category may make it 16 (recount in the V6 pass).
- **§15.2.1 Tier Summary table** (`:3562`/`:3567`): Tier 1 count `81 → 78`; in the Tier-1 Acquisition
  cell remove "(Legendary 15% in Grove only)" → just "Wayside Shrine, Sacred Grove" (the 15% Grove roll
  is removed — see DP-67); **TOTAL** `113 → 110`.
- **§15.2.2 Tier-1-by-category table** (`:3582`–`:3586`): DELETE the "Tier 1 Legendary | 1 | Gankyil"
  row (`:3583`); "Demoted Rares | 6 | …Waidan…" → "Demoted Rares | 5 | Wuji, Dao, Chi, Tengu, Feng Shui"
  (`:3582`); recompute "**Sum (categorized)**" (`:3584`, was 82 → 80 after dropping Gankyil(1)+Waidan(1)).
  ⚠ The categorized sum (80) STILL won't match the true Tier-1 count (78) — a residual +2 categorization
  over-count predating the cuts. The `:3586` footnote blames `util_irrigation` (a "deprecated duplicate"
  to be removed) for part of it — but `util_irrigation` STILL EXISTS in code (`src/data/spirits.js:989`)
  as of 2026-06-14, so that cleanup never happened. **FLAG, do not assume:** the V6 pass must recount the
  category rows against current code and reconcile the residual +2 (and decide util_irrigation's fate)
  as its own item — do NOT just paper over it with a number.
- **§ status/version table** (`:3821`, "Total spirits | 113 | 7") → 110.
- **§ implementation status** (`:3882`, "Tier 1 spirits (81 total)") → 78.
- **§ spirit-count expansion** (`:4086` Gankyil acquisition note → remove entirely; `:4244` "113 total …
  81 Tier 1 (incl. Gankyil legendary)" → "110 total … 78 Tier 1", drop "(incl. Gankyil legendary)").

**NOTE (no-rewrite-history):** DECISIONS_LOG / OVERHAUL_PLAN / tier5_reconciliation Gankyil mentions are
historical point-in-time records — left as-is. This patch governs V5→V6 only. (Likewise V5's `:930`–`:931`
"2.0 + 80 = 82.0" is a SCORING example, NOT a spirit count — do not touch.)
**Cross-refs:** DP-67 (the 15% Grove legendary-roll removal — paired with the §15.2.1 acquisition-cell
edit here); DP-68 (Waidan §7.12/§8.7 — the demoted-rares count change here is consistent with it).

### DP-67: §12.2 (Offering Generation, spirit quadrant) — REMOVE 15% legendary roll
**Source:** F4-LEG3-ROSTER-CUTS Option 2 (Robert's ruling, 2026-06-13).
**Issue:** §12.2 states "Sacred Grove: 15% chance per slot to roll a Tier 1 Legendary instead." The 15%
Grove roll + `_pickRandomLegendary` machinery was removed from the shop (Option 2).
**Patch (V6):** remove the 15%-legendary-roll rule. The Sacred Grove spirit quadrant now offers the same
tier-1-non-legendary pool as Wayside (more slots only, no legendary chance). NOTE for V6 author: legendary
*offering* is deferred to the Phase-5 shop revamp ("rebuilt fresh after the larger shop reorganization") —
this is a deferral, not a permanent removal of the concept from the design. Buy-side legendary purchase
routing + `addLegendarySpirit`/`canAddLegendary` + the capstone/Pearl path remain live (dormant) infra.

### DP-68: §7.12 (demoted rares prose) + §8.7 (acquisition-paths table) — REMOVE Waidan
**Source:** F4-LEG3-ROSTER-CUTS (Robert's ruling, 2026-06-13).
**Issue:** `util_waidan` was cut entirely. §7.12 has a Waidan bullet in the demoted-rares prose; §8.7's
acquisition table has a "Spirit Waidan — Negative copies of consumables on Sacred Grove exit" row.
**Patch (V6):** remove the Waidan bullet from §7.12 and the Waidan acquisition row from §8.7. NOTE for V6
author: the negative-consumables SYSTEM itself is NOT removed from the design — it is a Phase-5 build; only
Waidan-as-its-source is cut. The general `addNegativeConsumable`/`_negativeConsumables` infra is retained.

### DP-69: Alchemical fusion is one-operation-per-use + Pearl consumes components
**Source:** F4-LEG3-CINNABAR-SINGLEOP (this session); D0.16 (Pearl consume).
**Issue:** §8.6 / §8.6.1 (a) still says Pearl "preserves the components" / "effectively a
duplicator" — STALE: Pearl consumes its inputs (D0.16, shipped). (b) Does not state the
one-operation-per-use rule for any alchemical.
**Patch for V6:**
- §8.6 Pearl row: drop "Components preserved"; Pearl CONSUMES its two T3 inputs (one each).
- §8.6.1: remove the "duplicator" framing; all fusion alchemicals consume inputs. To preserve
  components, pre-stack via Jade/Mirror/Memory before fusing.
- Add explicit one-op rule: each fusion alchemical performs exactly ONE operation per use
  regardless of input stack depth — Cinnabar fuses one stack from each input (a 2-stack pair
  yields one fusion + one leftover of each input); Mercury de-fuses one fusion stack; Pearl
  consumes one of each T3 input to make one capstone.

### DP-70: Consumable-consumption policy (used ⟺ spent ⟺ Badger)
**Source:** D-F4-LEG3-CANDIDATE-H (this session).
**Issue:** the design doc does not state the consume policy: when a consumable is / isn't spent,
and how that relates to the Badger counter.
**Patch (V6):** document the policy in §8 (Consumables): a consumable is used / spent /
Badger-counted whenever it produces any real effect, including PARTIAL effects (draw-2 draws 1,
multi-target where some resolve) and DELIBERATE-COST effects (Amber −slot, Tiger forced push); it
is NOT consumed only when it genuinely cannot act (no valid target, hand full, empty pile, no-op).
"used", "spent", and "Badger counts" are ONE event, never decided separately — including
alchemicals (which previously consumed without counting for Badger; fixed this session).
Implementation note for V6/architecture: the decision lives in one shared predicate
(`scenes/shared/consumePolicy.js` `consumableHadEffect`) consulted by every result-tail; result
contracts remain per-family adapters (element reports via `action`, others via `success`) — NOT
normalized (consumable_inventory_pass1.md).

### DP-71: Silk anti-strand scope (per-card, hand-play + deck-flip)
**Source:** F4.32 (this session).
**Issue:** §3.3 and §8.2.2 describe Silk as "immune to stranding" / "prevents stranding" without
specifying scope. The implementation (pre-fix) only covered deck-flip stranding, not hand-play.
**Patch (V6):** state Silk's scope precisely — Silk prevents stranding of any pending stack it is
PART OF (per-card, not field-wide), in BOTH the deck-flip case and the hand-play case (a hand-
formed 3-stack containing Silk resolves to a capture rather than stranding). The capture resolves
in the deck-flip phase like all captures. A Silk card placed alone (or in a non-matching
placement) is NOT auto-captured — it only resists stranding of a real pending stack.

### DP-72: Earth (Clay/Pottery) — document round-end as canonical + F5.8 forward-pointer
**Source:** F4.31/F4.38a gate close-out (2026-06-14).
**Issue:** V6 must state Earth's timing. Current code = round-end % interest; an intended per-capture
flat-ki redesign is logged (speculative) as F5.8.
**Patch (V6):** §8.2.2 Clay/Pottery — document CURRENT behavior as canonical: round-end ki interest
(Clay 10% / Pottery 20% of current ki per Earth card held at round end), feeds Fossil. Add a forward-
note: "A per-capture flat-ki redesign (Clay +3 ki/scoring, Pottery +3 ki +1 interest/scoring) is a
planned but SPECULATIVE Phase-5 change (F5.8); magnitudes pending playtest. V6 documents current
behavior; F5.8 will update this section when built." Keep the existing (already-reconciled) note that
the held-in-hand mult channel is ×1.0 except under boost_earth (hex_15).
**Note:** §8.2.2's mult-channel overstatement flagged by scoring_loop_inventory_pass1.md §7 is ALREADY
fixed in V5 — line 2043 already qualifies the ×1.0 / boost_earth (hex_15) gating AND already forward-
points to F5.8. So this DP is the forward-pointer only; NO mult-channel correction needed in §8.2.2.
ADJACENT (outside §8.2.2, for the V6 author): the §5 held-in-hand list (V5:857, "Earth-enhanced cards
in hand multiply mult") states the Earth mult channel unqualified — align it with §8.2.2's ×1.0-except-
boost_earth caveat for internal consistency. Also the §8.2 enhancement-summary line (V5:522, "held-in-
hand mult contribution" for Earth) is terse/unqualified — optional polish.

---

## Editorial rewrite scope (separate sub-effort, 6-10 hours)

Eventually, ALL in-game descriptions should be cleanly rewritten by hand:
- Spirit tooltips (all 100+ spirits)
- Consumable tooltips (chakras, alchemicals, zodiacs, stamps, elements, editions)
- Hexagram effect descriptions (64 hexagrams)
- Card mutation descriptions (enhancements, stamps, editions)

These were generated by Claude Code thus far and need editorial polish for consistency, voice, and clarity. This is **separate from the mechanical patches above** (which fix factual content) and from F3.18 (which adds tooltip surface area, deferred to Phase 4).

**Sequencing:** Most natural home is alongside DESIGN_DOC_V5 reconciliation OR as a polish pass after Phase 4 architecture work completes.

---

## Working notes for the patch-applying Claude

1. **Read DESIGN_DOC_V5.md once before starting.** Get a feel for its structure; some patches reference sections by number that may have shifted.

2. **Verify each patch against current code before applying.** The audit captured these between May 4 and June 2, 2026; code has continued to evolve. A patch may already be reflected in the doc; another may have been further refined in code.

3. **Use DECISIONS_LOG.md for full context.** Line numbers cited in each patch reference the May 20 snapshot of DECISIONS_LOG.md (in /mnt/user-data/outputs/). The full decision rationale lives there.

4. **Don't be afraid to defer.** If a patch is ambiguous (e.g., DP-61's "main doc or companion doc?" question), flag it and continue. Better to apply 50 clear patches than to stall on 5 ambiguous ones.

5. **Capture new discrepancies as you go.** If reading the doc surfaces issues NOT in this worklist, add them under a new "DP-XX (discovered during reconciliation)" entry.

6. **Final pass:** After applying, do a quick read-through of each amended section to catch any internal contradictions introduced by the patches.

---

## Patch status tracker

(To be filled in during application — leave blank in this version.)

| Patch ID | Status | Notes |
|---|---|---|
| DP-01 | ⏸️ | |
| DP-02 | ⏸️ | |
| ... | ⏸️ | |

(Or use whatever tracking format suits you — a separate spreadsheet, a checklist, or commit-by-commit log.)
