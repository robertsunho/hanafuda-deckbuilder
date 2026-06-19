# Gate 0 — Codebase ⇄ Documentation Discrepancy Audit — Findings

**Status:** COMPLETE — full `/src` sweep + forward-doc reconciliation + coverage backstop. 48 findings.
**Run:** 2026-06-19. Auditor: fresh Claude Code conversation, MAX EFFORT.

## What this is

A blind, full-codebase sweep of `/src` against the three reference-doc rubrics:
- **`docs/DESIGN_DOC_V6.md`** — behavior/design rubric (what mechanics DO).
- **`docs/ARCHITECTURE.md`** — structure/mechanism rubric (how the code is organized; counts, hooks, boundaries).
- **`docs/ENGINEERING_RULES.md`** (+ indexed `docs/reference/`) — operational invariants.

Each finding presents BOTH sides (doc claim vs live code, with file:line), my **read** (which side *seems*
right + why — an assessment, **NOT a verdict**; Robert rules), and **suggested routing IF Robert agrees**.
**No code or reference doc was edited.** The only file created is this one.

Routing legend: `code-wrong` → ROADMAP / CODEBASE_CLEANUP · `doc-wrong` → CHANGELOG
(`[design]`/`[architecture]`/`[engineering]`) + DECISIONS_LOG when worked.

---

## Summary table

**48 findings (G0-001…G0-048).** Type: `V6`=code-vs-DESIGN_DOC_V6 · `ARCH`=code-vs-ARCHITECTURE ·
`ENG`=code-vs-ENGINEERING · `INT`=code-internal (stale comment/dead code). My-read is an **assessment, not a
verdict**. Tally: ~31 doc-stale/doc-error (code is right, docs drifted), ~9 code-cleanup/dead-code, and
**8 genuine behavioral code↔doc gaps that need Robert's direction ruling** (flagged ⚠).

| ID | Type | One-line | My read |
|---|---|---|---|
| G0-001 | V6 | Radiance "exponential" but effect is linear ×(1+2n) | doc-stale (likely) |
| G0-002 | V6 | §15.2 Foundation example "Falcon" (absent) / "Crow" (is a symbiont) | doc-error |
| G0-003 | ENG | SPIRIT_SET_ITERATION_RULE F5.12 block describes pre-fix state (shipped) | doc-stale |
| G0-004 | ARCH | `engine_surplus` declares `tooltipBase` fields it never reads | code-cleanup |
| G0-005 | ARCH | decay `startMult/startPoints` dead; `remaining` seeded from literals | code-cleanup |
| G0-006 | INT | ⚠ Glory tooltip shows draws×stacks; effect (+V6) draws flat 2 | code/tooltip — ruling |
| G0-007 | V6 | ⚠ `econ_collector` sell-price buff vs §7.10.3 flat ki income | doc-stale likely — ruling |
| G0-008 | V6 | §15.2.3 lists nonexistent T2 fusions "Hibernation/Mountain" | doc-error |
| G0-009 | V6 | `econ_bonds` "+25%" stale (math is +5%/stack→+15%) | doc-stale |
| G0-010 | V6/ARCH | `spiritsByRarity.legendary` always-empty; rarity token vestigial | dead-code |
| G0-011 | V6 | Axis debuff is ×0.75 in code vs ×0.5 in §9.1.3/§9.3 headers | doc-stale (likely) |
| G0-012 | V6 | ⚠ Seasonal hex debuffs OPPOSITE season (not cycle); ×2.0 not ×2.5 | ambiguous — ruling |
| G0-013 | V6 | Rank-hex multipliers all differ; "+1 threshold" not implemented | doc-stale (likely) |
| G0-014 | V6 | §9.3.7 misattributes Fire-param changes to `boost_wood` | doc-error |
| G0-015 | V6 | §9.4 "known-issues" list contains already-FIXED items | doc-stale |
| G0-016 | V6 | §9.3.4/§9.4 reference deleted `DEFERRED_CLEANUP_ITEMS.md` | doc-stale |
| G0-017 | V6 | Tropic/Arctic 4-month sets (already-tracked code bug) | code-bug (tracked) |
| G0-018 | V6 | §15.3.1 wrong effects for Root/Sacral chakra (Akumon/random-elem) | doc-stale |
| G0-019 | V6 | Green stamp +3 ki (code/§8.4) vs +8 ki (§15.3.4) | doc-stale |
| G0-020 | V6 | §15.3.4 trigger column mislabels compound stamps single-trigger | doc-stale |
| G0-021 | V6 | §8.5.2 `_dogProtection` naming note describes a dead flag | doc-stale |
| G0-022 | V6 | ⚠ Horse "draw 8 fresh" vs code "draw = prior hand size" | ambiguous — ruling |
| G0-023 | V6 | Cat pool "currently 27" vs dynamic catalog filter | doc-stale (minor) |
| G0-024 | ARCH | `ConsumableEffects.js:16` stale "migration in progress" comment | code-cleanup |
| G0-025 | V6 | `calculateFinalScore()` gone; §5.11 treats it as live (vestigial) | doc-stale |
| G0-026 | V6 | "12 style combos" prose vs 11 actual (code + V6's own tables) | doc-stale |
| G0-027 | V6/INT | `yakuPoints` in GRM JSDoc but no such field | code-cleanup (comment) |
| G0-028 | V6 | ⚠ Sacred Grove cadence off-by-one → 11 visits, not 12 | code↔doc gap — ruling |
| G0-029 | V6 | ⚠ Spirit-offering "exclude maxed" filter not implemented | doc-vs-unbuilt — ruling |
| G0-030 | V6 | Speculative-card price doc 10–20 ki vs code base 3 (+surcharge) | doc-stale (likely) |
| G0-031 | ARCH | §1.2 lists RM fields `_act/_totalScore/_styleBase` that don't exist | doc-stale |
| G0-032 | INT | `roundInAct` comment "(1–3)" but returns 1–6 | code-cleanup (comment) |
| G0-033 | V6 | Coupon discount not clamped at 45% (transcended-Negative edge) | minor edge |
| G0-034 | V6 | ⚠ Documented "+5 full-month bonus" is absent from scoring | code↔doc gap — ruling |
| G0-035 | V6 | ⚠ `_checkNaturalCaptures()` defined but never called (dead feature) | code-bug/dead — ruling |
| G0-036 | V6 | §4.4 push table (×1.1 compounding) vs live commitment curve | doc-stale |
| G0-037 | ARCH | `FieldManager.playHandCard()` single-card dead/parallel path | dead-code |
| G0-038 | INT | `CaptureManager.js:233` stale point-values comment | code-cleanup (comment) |
| G0-039 | V6 | §15.1.3 per-rank "with speculatives" counts wrong (7/16/11/27) | doc-error |
| G0-040 | V6 | §2.3 prose "brights (8 of 13)" vs table/code (7) | doc-error |
| G0-041 | V6 | 14th speculative `december_plain_3` (doc counts 13) | code-debt (tracked) |
| G0-042 | V6 | §2.8 claims a `cardsByTag` helper that doesn't exist | doc-error |
| G0-043 | V6 | §13.12 per-chakra overlays + booster-pack UX doesn't exist | doc-stale |
| G0-044 | V6 | §13.11/§13.12 Grove fusion section + overlays absent | doc-stale |
| G0-045 | V6 | §14.2/§14.5 list logger methods that don't exist | doc-stale |
| G0-046 | V6 | §13.8/§13.13 name RunManager accessors that don't exist | doc-stale (precision) |
| G0-047 | V6 | §13.10 info-cluster list off; Forfeit "two-step" overstated | doc-stale (minor) |
| G0-048 | V6 | §13.2 Dev Mode/first-run timing + §13.3 coin-value mapping | doc-stale (minor) |

**The 8 ⚠ ruling-needed items** (everything else is a fairly clear doc-fix or code-cleanup):
G0-006 (Glory), G0-007 (Collector), G0-012 (seasonal hex), G0-022 (Horse), G0-028 (Grove cadence),
G0-029 (offering filter), G0-034 (+5 bonus), G0-035 (natural captures). **G0-034 and G0-035 are the two
MAJOR behavioral gaps** (documented behavior absent from code).

---

## Findings by subsystem

### A. Spirits — foundation / engine / conditional / retrigger / rank

**Structural checks — ALL CONFIRMED** against live code: `_effects` = 110 (95 hook-defining + 15 `{}`
stubs); onCardScored 43 (19 literal + 24 factory), applyEngine 39, onCardSeen 8, getRetriggerCount 8,
onRoundEnd 8, applyKiBonus 2, onFieldDiscard 2; all Tier-2 hooks 1 each; `ACCUMULATOR_SPIRIT_IDS` = 28
with exact 1:1 `ACCUMULATOR_INIT` parity; **spirits.js ↔ `_effects` is a perfect 110↔110 bijection (zero
orphans either way)**. `_tb` "keep them equal" holds for all spot-checked spirits **except** the two
dead-field cases (G0-004/G0-005). Negative-inclusion invariant holds (the only deliberate `isNegative`
early-return is `econ_reward`, in the economy slice — documented legacy).

**G0-001 — `code-vs-V6`** — Radiance described "exponential" but effect is linear (×(1+2n)).
- **Where:** `SpiritEffects.js:437-444` — `engine_radiance` returns `multiplyMult: 1 + n*_tb(spirit,'mult',2)` (its own docstring `:430` says "×(1 + n×2)"); `spirits.js:408` description says "exponential stacking".
- **Rubric:** V6 §7.6.1 (`DESIGN_DOC_V6.md:1489`, `:1494` "Radiance's **exponential** ×2.0 stacking").
- **Discrepancy:** Per-capture multiplier is linear in unique brights seen (1→×3, 2→×5, 3→×7), not exponential (×2/×4/×8). Effect body + docstring agree on linear; V6 prose + the spirits.js description both say "exponential".
- **Read (assessment):** Doc/description-stale far more likely. Linear multiplicative stacking is the canonical rule (F5.12 / SPIRIT_SET_ITERATION_RULE); "exponential" is loose legacy wording (the per-round cross-capture compounding *feels* explosive, which likely seeded it). If Robert actually wants true exponential, then effect+docstring are the bug instead.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (V6 §7.6.1 + the `engine_radiance` description string). If design wants exponential → code-wrong → ROADMAP.

**G0-002 — `code-vs-V6`** — V6 §15.2 Foundation example cites nonexistent "Falcon" and miscategorizes "Crow".
- **Where:** `spirits.js` — no `Falcon` exists; `sym_crow` (`:515`) is a Tier-0 **symbiont**, not foundation.
- **Rubric:** V6 §15.2.2 (`DESIGN_DOC_V6.md:3563`) — "Foundation Spirits | 20 | Pollen, Bees, **Falcon, Crow** …".
- **Discrepancy:** The example names are wrong (Falcon absent; Crow is a symbiont). The count (20) and its sub-breakdown are correct.
- **Read (assessment):** Doc-wrong, unambiguous — stale illustrative examples; code is correct. Low impact.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (fix the two example names).

**G0-003 — `code-vs-ENGINEERING` (doc-stale)** — SPIRIT_SET_ITERATION_RULE's F5.12 deferral block describes a pre-fix state that already shipped.
- **Where:** Live code: conditionals are **linear** in stacks (`SpiritEffects.js:1104` `cond_horizon` = `_tb(…,2.0)*effectivePower`; `:1114` `cond_dream`; `:1127` `cond_hierarchy` = `Math.pow(_tb(…,1.5), n_ranks) * stacks` — the pow is over *ranks*, not stacks). No conditional uses `Math.pow(base, effectivePower)`. 6/7 live-state/conditional spirits now carry `tooltipBase`+`_tb`.
- **Rubric:** `SPIRIT_SET_ITERATION_RULE.md:142-154` — still states "Conditionals: inline `Math.pow(base, effectivePower)` — exponential compounding" and presents the [FIX] as pending (F5.12).
- **Discrepancy:** ROADMAP marks **F5.12 ✅ DONE 2026-06-14**; DECISIONS_LOG documents the exact linearization + tooltipBase additions present in code. The reference doc was never updated when F5.12 landed.
- **Read (assessment):** Doc-stale, high confidence. This is the actual source of the audit brief's "known-deferred" framing — the item is **closed**, not pending. Dedupe, don't re-defer.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[engineering]` (update SPIRIT_SET_ITERATION_RULE §"Stack scaling": conditionals are linear-in-stacks; 7-spirit tooltipBase work done except `engine_chi`, which has no constant to host).

**G0-004 — `code-vs-ARCHITECTURE`** — `engine_surplus` declares `tooltipBase` fields its effect never reads (dead single-source).
- **Where:** `SpiritEffects.js:1289-1296` hardcodes `Math.floor(ki/3)*stacks` (no `_tb`); `spirits.js:951` `tooltipBase:{ mult:1, kiDivisor:3 }`.
- **Rubric:** ARCHITECTURE §1.3 (`ARCHITECTURE.md:102-105`) — tooltipBase is the single source; "keep them equal".
- **Discrepancy:** Body bypasses `_tb`; both tooltipBase fields are dead. A future tune to either would silently not change the effect.
- **Read (assessment):** Code-consistency gap, low severity (value-equal today, no behavior bug). Most likely the F4.36 `_tb` sweep (accumulator-focused) skipped this non-accumulator.
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (read via `_tb`, or drop the dead fields).

**G0-005 — `code-vs-ARCHITECTURE`** — Decay spirits' `startMult`/`startPoints` tooltipBase fields are dead; `remaining` seeded from literals.
- **Where:** `RunManager.js:547-548` — `_initSpiritState` seeds `decay_persimmon` `{remaining:30}` / `decay_pear` `{remaining:150}` (hardcoded); `spirits.js:1042,1053` declare `tooltipBase.startMult:30` / `startPoints:150` (never read). `lossPerRound` IS single-sourced (`SpiritEffects.js:1183/1201`).
- **Rubric:** ARCHITECTURE §1.3 (`ARCHITECTURE.md:102-105`).
- **Discrepancy:** Only the *initial* value is duplicated; tuning `tooltipBase.startMult` would not move the seed (silent drift). Tooltip reads `state.remaining`, so follows the literal, not the base.
- **Read (assessment):** Code-consistency gap, low severity (30==30, 150==150 today). Seed predates the tooltipBase fields.
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (seed from `_tb(…,'startMult'/'startPoints')`, or remove dead fields).

**G0-006 — `code-internal` (tooltip-vs-effect; also corroborated by 2nd auditor)** — Glory draws flat 2, but the tooltip renders 2×stacks.
- **Where:** `SpiritEffects.js:525-529` — `util_glory` returns `{ draw: 2 }` flat, with a standing in-source `TODO(F4.x)` noting the mismatch; `spirits.js:456` `tooltipBase:{ draws:2 }`; tooltip `spiritTooltip.js:91` renders `draw ${_tb('draws')*n} cards`.
- **Rubric:** V6 §7.9 (`DESIGN_DOC_V6.md:1617`, `:1624`) — "draw **2** cards" (no per-stack scaling).
- **Discrepancy:** Effect + V6 say flat 2; tooltip claims `2×n` (a 3-stack Glory tooltip reads "draw 6"). Self-flagged by the in-code TODO.
- **Read (assessment):** Tooltip is the wrong surface — effect and V6 agree on flat 2. (Or, if design wants stack-scaled draws, the effect under-delivers and V6 would need updating too — but V6 currently says flat 2.) Already tracked via the TODO; dedupe against it.
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (reconcile the Glory tooltip to flat 2). If stack-scaling is desired instead → ROADMAP.

### B. Spirits — economy / meta / fusion / capstone / symbiont / transcendence

**Structural checks — ALL CONFIRMED:** transcension at 4 (cascade, `RunManager.js:872-879`) OR Amber
(`ConsumableEffects.js:416`), both routing through the single `_buildTranscendedNegative` (RM:670);
F4.26 Option-B lossless in-place splice (`snapshotPower=existing.stackCount`, `splice(idx,1,…)` RM:873/879);
`effectivePower` (RM:1599) returns powerLevel/stackCount correctly; `maxLegendarySlots`=2 (RM:468);
`addLegendarySpirit` dedupes by id, stores `{id,name,legendary:true}` (RM:963-971); **zero `legend_` ids
in spirits.js**; 4 capstones carry `legendary:true,capstone:true` with `{}` `_effects` stubs;
`ANIMAL_SYMBIONT_MAP` = 12 (one per animal card, keys all valid `cards.js` ids); NEGATIVE_SNAPSHOT
registry has all 5 helpers + 28 entries = the 28 accumulators; fusionRecipes match V6 §7.12/7.13 (8 T2 + 8
T3 + 4 T4, all outputs resolve). KNOWN-DEFERRED legendary↔chain coupling matches ARCHITECTURE §6.2's
described current-state → **not flagged** (deliberate-for-now per Candidate I).
**(Glory draw/tooltip mismatch, independently found here too → deduped to G0-006.)**

**G0-007 — `code-vs-V6`** — `econ_collector` effect (sell-price buff) contradicts V6 §7.10.3 (flat ki income).
- **Where:** `SpiritEffects.js:597-603` — `onRoundEnd` adds `effectivePower(spirit)` to every owned spirit's & consumable's `sellPriceBonus`; def `spirits.js:705-714` description agrees ("+1 ki per stack to the sell price of each owned spirit and consumable each round").
- **Rubric:** V6 §7.10.3 (`DESIGN_DOC_V6.md:1674`) — "Collector | Each round held earns **+3 ki bonus at round end**".
- **Discrepancy:** Code = sell-value engine (+1/stack to each item's resale, per round). V6 table = flat +3 ki income. Different mechanism AND number.
- **Read (assessment):** Doc-stale more likely — code and the in-game description string agree (sell-price), and §7.10.3's prose admits the descriptions are "working design intent" while the *table* row looks un-updated from an older income design. Less likely: code drifted from a +3-income spec. Robert picks which Collector he wants.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (V6 §7.10.3). If code-wrong → ROADMAP.

**G0-008 — `code-vs-V6`** — V6 §15.2.3 lists nonexistent Tier-2 fusion names "Hibernation, Mountain".
- **Where:** T2 fusion defs `spirits.js:256-354` are Bloom/Thunderstorm/Decay/Blizzard/Atmosphere/Continent/Sun/Moon; no "Hibernation"/"Mountain" exist.
- **Rubric:** V6 §15.2.3 (`DESIGN_DOC_V6.md:3579`) — "Tier 2 Fusion | 8 | Bloom, Thunderstorm, **Hibernation, Mountain**".
- **Discrepancy:** Summary example cell carries leftover names from an earlier design; the authoritative §7.12 (lines 1728-1740) lists the correct 8.
- **Read (assessment):** Doc-wrong (examples-only typo); no code implication.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (V6 §15.2.3).

**G0-009 — `code-vs-V6` (minor; doc half-admits it)** — `econ_bonds` "+25%" claim stale on both sides.
- **Where:** `RunManager.js:1346-1349` — `rate += bondsCount * 0.05` (caps +0.15 at 3 stacks); matches `spirits.js` description ("+5% per stack"). A dead legacy comment `SpiritEffects.js:550` still says "stacks to +25%".
- **Rubric:** V6 §7.10.1 (`DESIGN_DOC_V6.md:1637`) — still carries a parenthetical "codebase description claiming +25% is incorrect".
- **Discrepancy:** Math is correct (+5%/stack → +15% headline). The V6 parenthetical now refutes a description string that no longer exists; only the `SpiritEffects.js:550` comment is the stale "+25%" note.
- **Read (assessment):** Doc/comment staleness, not a code bug.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (drop the stale V6 parenthetical); the `SpiritEffects.js:550` dead comment → CODEBASE_CLEANUP (cosmetic).

**G0-010 — `code-vs-V6/ARCHITECTURE` (cosmetic/dead code)** — `spiritsByRarity.legendary` bucket can never populate; `'legendary'` rarity token vestigial.
- **Where:** `spirits.js:1196` `legendary: SPIRIT_CATALOG.filter(s => s.rarity==='legendary')`; header `:41` lists `'legendary'` as a rarity. No def has `rarity:'legendary'` (all 4 capstones use `rarity:null`, `spirits.js:590-593`).
- **Rubric:** ARCHITECTURE §6.2 (`ARCHITECTURE.md:570-574`) — "legendary today means a fused capstone, not a rarity-classed spirit"; V6 §7.14.
- **Discrepancy:** The bucket is always `[]`; the header rarity token names a value no def uses.
- **Read (assessment):** Code-vestige, consistent with design (capstones gated by fusion, correctly `null`). Harmless dead bucket — matches ARCHITECTURE's stated current-state, so not a behavior bug.
- **Routing if confirmed:** code-wrong (dead code) → CODEBASE_CLEANUP (drop the empty bucket / header token, or leave as documented vestige).

### C. Hexagrams

**Structural checks — ALL CONFIRMED:** `HEXAGRAM_EFFECTS` = **64** effect IDs; **64 hexagram defs ↔ 64
effects, perfect bijection** (zero dangling/orphan; runtime warn-guard at `HexagramEffects.js:763`); **44
distinct hook names**, all catalogued in the file header (`:1-93`) and used — "0 doc/use discrepancies"
holds; the 3 dispatch classes behave as documented (Class-1 via `applyHook`, Class-2 via direct
`getActiveEffect()?.hook`, Class-3 only via `getX()` wrappers); all **8 Class-3 getters** exist & are
exported (`:793-831`); **anti-pattern 1 = ZERO** `hex.effect==='xyz'` name-checks in GRM/RunManager/
ScoringEngine/GameScene (the only `.effect` reads are a display label `GRM:1594` and blessing `.effect`).
§15.4 quick-ref counts (8/4/4/4/4/4/5/2/2/4/4/10/7/1/1 = 64) match the data. HexagramGenerator + §6.4
scoping consistent.

> **Theme:** the hexagram *engine* is clean and matches ARCHITECTURE exactly. The discrepancies are all in
> **V6 §9.3's catalog magnitudes/descriptions** and in **V6 §9.4's stale "known-issues" list** — the doc
> side has drifted from the code, not vice versa (except the one Tropic/Arctic item V6 already flags as a
> code bug).

**G0-011 — `code-vs-V6`** — Axis boost/debuff penalty is ×0.75 in code, not ×0.5.
- **Where:** `HexagramEffects.js:142-172` — axis-individual (e.g. `boost_air` debuffs opposite axis `multiplyMult:0.75`); `:179-225` axis-combined uses 0.75 factors (compounding 0.75×0.75 = 0.5625).
- **Rubric:** V6 §9.1.3 (`DESIGN_DOC_V6.md:2315`, `:2320` "×0.5"), §9.3.2 header (`:2390`), §9.3.3 header (`:2399`).
- **Discrepancy:** code opposite-axis debuff = ×0.75; V6 §9.1.3/§9.3.2 headers say ×0.5. (§9.3.3's cross-quadrant ×0.5625 body is consistent with 0.75²; only the headers + §9.1.3 generalize to ×0.5.)
- **Read (assessment):** Doc-stale likelier — §9.4 (`:2548`) and CODEBASE_CLEANUP.md:52 both already log the axis-debuff as a known description gap, implying 0.75 is accepted reality; the 0.75 is internally consistent across all 8 axis effects.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]`.

**G0-012 — `code-vs-V6`** — Seasonal-individual debuffs the OPPOSITE season (not "next in cycle"); buff ×2.0 not ×2.5.
- **Where:** `HexagramEffects.js:276-310` — `boost_spring` buffs spring ×2.0, debuffs **autumn** ×0.5 (and the inline comment `:274` says "debuffs its opposite season"); summer↔winter likewise.
- **Rubric:** V6 §9.3.5 (`DESIGN_DOC_V6.md:2421` "×2.5, debuff next season in cycle"; `:2430` explicitly "`boost_spring` doesn't debuff Autumn directly").
- **Discrepancy:** code does exactly what V6 says it does NOT — spring debuffs autumn (opposite), and the buff is ×2.0 vs the doc's ×2.5.
- **Read (assessment):** **Sharpest discrepancy in this slice; needs Robert's ruling.** Code's opposite-season symmetry is the natural design and matches its own comment; V6 describes a unidirectional cycle the code never implements. Likeliest doc-stale (abandoned cycle design), but if the cycle was the intended design, the code is wrong. ×2.5-vs-×2.0 is a separate magnitude mismatch in the same effects.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (likely); if cycle was intended → code-wrong → ROADMAP.

**G0-013 — `code-vs-V6`** — Rank-hexagram multipliers all differ from the catalog, and "+1 yaku threshold" is not implemented.
- **Where:** `HexagramEffects.js:317-347` — brights ×1.5/plains ×0.9; animals ×2.0/bright ×0.5; ribbons ×2.0/animal ×0.7; plains ×3.0/ribbon ×0.7. No rank effect defines `modifyYakuThreshold` (the sole threshold dispatch is `GRM:183`, unsupplied by any rank hex).
- **Rubric:** V6 §9.3.6 (`DESIGN_DOC_V6.md:2432` header + `:2436-2439`: brights ×2.0/hikari+1, animals ×1.5/tane+1, ribbons ×1.3/tanzaku+1, plains ×1.2/kasu+1).
- **Discrepancy:** every multiplier differs; the "+1 threshold" behavior is entirely absent.
- **Read (assessment):** Doc-stale on the multipliers (code's spread is self-consistent with an "inverse-rarity" comment). On the threshold, V6 §9.3.6 is internally contradicted by V6 §9.4 (`:2551` "Rank hexagrams omit the yaku threshold modification") AND CODEBASE_CLEANUP.md:52 — both frame it as absent. Whether the threshold *should* exist is a design call.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (catalog values); the should-it-exist threshold → ROADMAP if Robert wants it built.

**G0-014 — `code-vs-V6`** — §9.3.7 Wu Xing catalog misattributes Fire-parameter changes to `boost_wood`.
- **Where:** `HexagramEffects.js:430-434` (`boost_wood` defines only wood-scoring + Metal suppression, NO Fire hooks); `:447-452` (`boost_metal` is what sets `modifyFirePoints` 50/15 + `modifyFireBreakChance` 0.20/0.40).
- **Rubric:** V6 §9.3.7 (`DESIGN_DOC_V6.md:2449`) attributes the Fire-points/break changes to `boost_wood`.
- **Discrepancy:** the Fire changes the doc pins on `boost_wood` actually belong to `boost_metal`; `boost_wood`'s real off-target effect (Metal suppression) is omitted.
- **Read (assessment):** Doc-stale / authoring error — the hexagrams.js player description for hex_50 (`:234`) correctly says boost_wood suppresses Metal; §9.4 (`:2552`) admits the Wu Xing rows "oversimplify."
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]`.

**G0-015 — `code-vs-V6` (doc-stale)** — V6 §9.4's "known-issues" list contains items already FIXED.
- **Where:** `hexagrams.js:272/279/306` — `volatile_flow`/`stable_flow`/`balanced_scoring` descriptions now MATCH the code (`HexagramEffects.js:351-361`, `:377-382`).
- **Rubric:** V6 §9.4 (`DESIGN_DOC_V6.md:2548` "volatile_flow and stable_flow descriptions are completely wrong"; `:2550` "balanced_scoring claims spirits are removed").
- **Discrepancy:** §9.4 asserts these descriptions are wrong, but they're correct in current code (flow amp/decay stated accurately; balanced_scoring says spirits "function normally", not "removed").
- **Read (assessment):** Doc-stale — §9.4 is a point-in-time snapshot; these items were resolved but not pruned. (Items in §9.4 that DO still hold: axis-by-month, omitted axis debuff, four_spirits Fire-reference, rank threshold omission, Wu Xing oversimplification.)
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (prune the resolved items from §9.4).

**G0-016 — `code-vs-V6` (doc-stale)** — V6 §9.3.4/§9.4 reference `DEFERRED_CLEANUP_ITEMS.md`, which no longer exists.
- **Where:** Glob `**/DEFERRED_CLEANUP_ITEMS.md` → no file; superseded per `CODEBASE_CLEANUP.md:7` (reparceled in the 2026-06-19 restructure).
- **Rubric:** V6 §9.3.4 (`DESIGN_DOC_V6.md:2419`) + §9.4 (`:2544`) point readers to `DEFERRED_CLEANUP_ITEMS.md`.
- **Discrepancy:** dangling cross-reference left by the restructure; the underlying items survive in CODEBASE_CLEANUP.md (:51-52).
- **Read (assessment):** Doc-stale, unambiguous.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (repoint to `CODEBASE_CLEANUP.md`).

**G0-017 — `code-vs-V6` (code-bug, already tracked)** — Tropic/Arctic use non-overlapping 4-month sets, not 6-month half-years.
- **Where:** `HexagramEffects.js:251-271` — `boost_tropic` buffs Apr/May/Jul/Aug, debuffs Oct/Nov/Jan/Feb (boundary months Mar/Jun/Sep/Dec excluded from both); `boost_arctic` mirror.
- **Rubric:** V6 §9.3.4 (`DESIGN_DOC_V6.md:2414-2419`) — intent is 6 warm vs 6 cold months; `:2419` explicitly "This is incorrect per design intent."
- **Discrepancy:** 4-month exclusionary sets vs intended 6-month half-years.
- **Read (assessment):** Code-buggy by Robert's own prior ruling — already classified as a code bug in V6 §9.3.4 AND CODEBASE_CLEANUP.md:51. Reported only to confirm it still reproduces (the only *stale* part is the file pointer, G0-016).
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (already logged :51).

### D. Consumables

**Structural checks — ALL CONFIRMED:** stamp `_applyStamp` auto-registers via `for (STAMPS)` (`:621-637`,
sets `card.ribbonStamp`); Wu Xing `_applyElement` auto-registers via `for (WUXING_CONSUMABLES)` (`:671-716`,
sets `card.enhancement`, the **only** family returning `{action}` not `{success}`); **no
`RunManager.applyElement`** (only a doc-comment cross-ref at RM:1562); **chakras + alchemicals notify, never
spend** (charged at purchase) — verified across all 7+7 handlers; `consumePolicy.consumableHadEffect` keys
element via `action`, others via `success` (`:17-21`); generative/destructive cycle maps exact-match memory
+ V6 §8.2.1; **editions implemented** (applied Heart-chakra/Golden-Toad, consumed in GRM scoring +
Kintaro); **full consumable id ↔ `_effects` bijection** (13 zodiac + 7 alch per-id; 9 stamp + 5 element + 7
chakra auto-registered; zero orphans); **Three Marks fully removed** (zero hits for the 3 ids / `THREE_MARKS`
/ `getMarkDef` anywhere in `src/`). spiritTargetPicker matches recipes 9-10.

**G0-018 — `code-vs-V6` (doc-stale)** — §15.3.1 catalog lists wrong effects for Root & Sacral chakra.
- **Where:** `consumables.js:9-24` + `ConsumableEffects.js:479-530` — Root toggles day/night `card.temporal`; Sacral advances `card.month`.
- **Rubric:** V6 §15.3.1 (`DESIGN_DOC_V6.md:3594-3595`) — Root = "Mark a card as Demon (Akumon)…"; Sacral = "Apply a random Wu Xing element".
- **Discrepancy:** no "Akumon/Demon" code exists anywhere (grep empty); no random-element-on-chakra path. V6 §8.1 (`:1916-1917`) describes Root/Sacral *correctly* — only §15.3.1 is the older snapshot.
- **Read (assessment):** Doc-stale, high confidence (§8.1 supersedes §15.3.1; §15.3 was never reconciled). Not a code bug.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]`.

**G0-019 — `code-vs-V6` (internal V6 inconsistency)** — Green stamp discard reward: code + §8.4 say +3 ki; §15.3.4 says +8 ki.
- **Where:** `consumables.js:218-227` — Green discard reward "+3 ki"; V6 §8.4.2 (`:2041`) + matrix (`:2097`) agree (+3).
- **Rubric:** V6 §15.3.4 (`DESIGN_DOC_V6.md:3635`) — Green "+8 ki".
- **Discrepancy:** §15.3.4 is the lone outlier vs the data def + two other V6 sections.
- **Read (assessment):** Doc-stale (§15.3.4 quick-ref out of sync with §8.4 + def). _(Closable fully by reading the GRM dispatch arithmetic at GRM:1629; the def/section comparison already strongly favors +3.)_
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]`.

**G0-020 — `code-vs-V6` (doc oversimplified)** — §15.3.4 trigger column mislabels the compound (Orange/Green/Purple/Black/Gray) stamps as single-trigger.
- **Where:** `consumables.js:208-259` (`trigger` is a single primary tag) + the split firing across GRM:979/1629/2099; V6 §8.4 matrix (`:2090-2102`) spells out the multi-trigger model.
- **Rubric:** V6 §15.3.4 (`DESIGN_DOC_V6.md:3634-3638`) lists single triggers.
- **Discrepancy:** quick-ref flattens the split-trigger compounds that §8.4 (and code) implement.
- **Read (assessment):** Doc-stale/oversimplified; code matches §8.4. Internal-doc inconsistency, lower severity.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]`.

**G0-021 — `code-vs-V6` (doc-stale)** — §8.5.2 "Code Naming Note: `_dogProtection`" describes a flag that no longer exists.
- **Where:** Rabbit sets `roundManager._pushPenaltyWaived` (`ConsumableEffects.js:89`; used GRM:265/1011/2125). Grep for `_dogProtection` / `_rabbitActive` → **zero** hits in `src/`.
- **Rubric:** V6 §8.5.2 (`DESIGN_DOC_V6.md:2177-2181`) + §8.5 parenthetical (`:2164`) — claim the flag is `_dogProtection`, that Rabbit also sets `_rabbitActive`, and that searching `_dogProtection` finds push-penalty mechanics.
- **Discrepancy:** the rename to `_pushPenaltyWaived` already happened; neither legacy name survives. The whole §8.5.2 subsection would send a code-searcher to a dead symbol.
- **Read (assessment):** Doc-stale, high confidence — code is in the clean end-state the note wished for.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (rewrite/remove §8.5.2 + the §8.5:2164 parenthetical).

**G0-022 — `code-vs-V6` (ambiguous — needs ruling)** — Horse: description "draw 8 fresh" vs code "draw equal to prior hand size".
- **Where:** `ConsumableEffects.js:124-143` — computes `handSize=oldHand.length`, then `_drawIntoHand(handSize)` (clamped). The in-game `description` string (`consumables.js:148`) says "draw 8 fresh cards".
- **Rubric:** V6 §8.5 (`:2137`), §8.5.1 (`:2150`), §15.3.5 (`:3656`) — all "draw 8".
- **Discrepancy:** code redraws the discarded count (prior hand size), not a fixed 8; they coincide only at a full 8-card hand.
- **Read (assessment):** **Genuinely ambiguous.** If design = "refill to 8", code under-draws below 8 (code-bug). If design = "replace hand 1-for-1", code is right and 3 doc sites + the in-game string are stale. Leaning doc/def-stale (code's behavior matches its own JSDoc "draw an equal number"), but the fixed "8" appears in-game too — so flag for a ruling.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` + fix the in-game `description` (code file → CODEBASE_CLEANUP). If code-wrong → ROADMAP/CODEBASE_CLEANUP.

**G0-023 — `code-vs-V6` (minor; self-labeled)** — Cat pool "currently 27" vs dynamic catalog filter.
- **Where:** `ConsumableEffects.js:249-260` derives the pool live (`rarity==='common'` minus symbionts); no hardcoded 27.
- **Rubric:** V6 §8.5 (`:2143`), §8.5.1 (`:2175`) — "dynamic pool (currently 27 …)".
- **Discrepancy:** the "27" is a moving snapshot; not re-counted here.
- **Read (assessment):** Low-severity — doc self-labels it "currently"; code behavior (dynamic) matches the prose intent. Refresh the number if precision matters.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (number refresh only).

**G0-024 — `code-vs-ARCHITECTURE` (stale in-code comment)** — `ConsumableEffects.js:14-16` claims Wu Xing/chakra apply "still live on RunManager (migration in progress)".
- **Where:** `ConsumableEffects.js:14-16` header comment.
- **Rubric:** ARCHITECTURE §4 recipe 10 (`:446`) — the attach now lives only in ConsumableEffects; RunManager.applyElement was removed.
- **Discrepancy:** the migration is complete (confirmed: no `RunManager.applyElement`); the comment describes an in-progress state that no longer exists.
- **Read (assessment):** Code-comment stale, low severity.
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (update/remove the comment).

**Noted, already tracked (not numbered):** `card.ribbonStamp` storage vs V6's `card.stamp` (§8.4.5 `:2110`) —
V6 itself self-corrects and flags this as a deferred naming-cleanup item; no new action. _(Aside, out of
doc-scope: the user's `MEMORY.md` still references `getMarkDef`/`addConsumable` for the removed Three Marks
— memory drift, not a reference-doc finding; flagged to Robert separately.)_

### E. Scoring (ScoringEngine / StyleEngine / GRM scoring pipeline)

**Structural checks — CONFIRMED:** ScoringEngine is stateless, `evaluate(cards, thresholds)` returns
`{name,count,threshold}` (no `bonus`), exactly 4 yaku; **yaku are gates only** — running score grows solely
via `_runningScore += points×mult×flow` (`GRM:1577-1580`), no yaku value feeds it; **`_scorePipeline` is
the single shared path** for `_addCapture` + `_scoreFieldCards` (no 4th scoring dispatch); ScoringEngine→
SpiritEffects **severed** (imports only `getFireFlatPoints` + `getCardPoints`, zero SpiritEffects refs);
StyleEngine filters Fire cards from combos; §5.1 pipeline order, §5.5 proportional thresholds (incl. the
base-48 Hikari2/Tane3/Tanzaku3/Kasu6), and §5.7 chain order all match.
**DIVERGES:** `calculateFinalScore()` (→ G0-025); and **SNOW_MULT/ICE_MULT are no longer exported** (deleted
F4.34; Water mult now flows via `getWaterMult`) — consistent with V6, diverges only from the project
`MEMORY.md`/`CLAUDE.md` "ScoringEngine exports SNOW_MULT, ICE_MULT" note (out of formal rubric scope; flagged
to Robert as memory drift).

**G0-025 — `code-vs-V6` (doc-stale)** — `calculateFinalScore()` does not exist; V6 §5.11 treats it as a live (vestigial) method.
- **Where:** `ScoringEngine.js` (entire file — only `evaluate()` + yaku checkers); repo-wide grep `calculateFinalScore` → **zero** matches.
- **Rubric:** V6 §5.11 (`DESIGN_DOC_V6.md:1204` "ScoringEngine.calculateFinalScore() exists but only serves the metal proc…"; `:1224` "could be removed entirely"). (ARCHITECTURE §1.1 already describes it as `evaluate`-only — consistent with code.)
- **Discrepancy:** the method (and its metal-proc plumbing) is entirely gone; V6 §5.11 says it exists and lists "remove it" as still-deferred debt.
- **Read (assessment):** Doc-stale — the deferred removal already happened. Also: `getFireFlatPoints` is imported by ScoringEngine but unused (harmless dead import, leftover from when scoring math lived here).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (strike the §5.11 vestigial-method paragraph + debt bullet); dead import → CODEBASE_CLEANUP.

**G0-026 — `code-vs-V6` (doc-stale, internal V6 inconsistency)** — "12 style combos" prose vs **11** actual combos.
- **Where:** `StyleEngine.js` `STYLE_COMBOS` = exactly **11** entries (the file header `:4` itself says "11 combos").
- **Rubric:** V6 §5.6 (`DESIGN_DOC_V6.md:1025`, `:1047`) + §15.7 (`:3733`) say "12" — yet the two V6 tables that enumerate them (`:1027-1039`, `:3735-3747`) each list **11 rows**.
- **Discrepancy:** code = 11; V6 prose says 12 in three places but its own tables list 11.
- **Read (assessment):** Doc-stale prose (stale headcount); tables + code agree at 11.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (12→11 at §5.6 ×2 + §15.7).

**G0-027 — `code-vs-V6` (stale JSDoc comment)** — `yakuPoints` field referenced in GRM JSDoc but never exists.
- **Where:** `GameRoundManager.js:38` + `:2008` JSDoc list `yakuPoints:number` in a return shape; grep finds it ONLY in those two comments — never computed or returned.
- **Rubric:** V6 §5.3 (`:918` "Yaku do NOT contribute to score") + §5.11 (`:1208`, the `bonus` field removed).
- **Discrepancy:** JSDoc advertises a return field the code (correctly, per design) doesn't produce.
- **Read (assessment):** Code-comment stale, consistent with design (lowest severity).
- **Routing if confirmed:** code-wrong (comment) → CODEBASE_CLEANUP (scrub `yakuPoints` from the two JSDoc blocks).

### F. Economy / Run structure / Shop / Blessings (RunManager + data)

**Structural checks — CONFIRMED:** `couponDiscountPct`/`piggybankHandKiMult` single-source (read by both
the RM formula AND the tooltip — can't drift); Bucket-B inline formula spirits (`econ_coupon`/`piggybank`/
`bonds`/`ingot` live inline in their formulas, with empty `{}` `_effects` stubs — matches ARCHITECTURE §5);
push curve `PUSH_CURVE` + `getPushMultiplier` extrapolation; interest push-scaled at resolution depth;
blessings **pull-model** (all 7 effect keys have live read sites; `addBlessing` dedupes/logs); **§12.8
blessing-acquisition genuinely Not-Yet-Implemented** (zero `addBlessing` callers in scenes; the tier-2
`requires` field is never read); `spiritSlots` reads `plus_spirit_slot` (not field-slot); §11.1 ki
decomposition `{flat:5, hand, earth, interest, hookDelta}`; §11.2 interest composition (base 10% + bonds
5%/stack + ingot + hex); §15.8 cost table; §15.9 constants; the **Seven Lucky Gods** 7 pairs; acts/rounds
6×6=36. `applyInterest()` is dead but already tracked in CODEBASE_CLEANUP:13.

**G0-028 — `code-vs-V6` (behavioral; HEADLINE — needs ruling)** — Sacred Grove cadence is off-by-one → 11 visits, not 12.
- **Where:** `RunManager.js:223` `GROVE_ROUNDS=[3,6,…,36]`; `:1157` `nextIsGrove = GROVE_ROUNDS.includes(this._round-1)` (evaluated AFTER `advanceRound` in `GameScene.js:2884-2957`, AND after the `isRunComplete` check at `:2886`).
- **Rubric:** V6 §6.2 (`DESIGN_DOC_V6.md:1248-1265`, incl. the ASCII diagram placing the first grove between R2↔R3), §12.1 (`:2829-2834`, "23 Wayside + 12 Grove"), §15.9 (`:3786`).
- **Discrepancy:** Two real divergences. (1) *Boundary:* doc places groves **before** rounds {3,6,…} (first grove after R2); code fires a grove when the round *just completed* is in {3,6,…} (first grove after R3). (2) *Count:* the grove-after-R36 is preempted by `isRunComplete` (`_round>36`), so groves fire after R3,6,…,33 = **11**, not 12; §12.1's "23 Wayside + 12 Grove = 35" derives from the wrong count.
- **Read (assessment):** Real code↔doc divergence, not phrasing — the two sides disagree on *which* inter-round gap holds the first grove, and the count genuinely resolves to 11. Can't tell intent from code alone: if code's "after R3,6,…" is intended → fix V6 §6.2/§12.1/§15.9 (12→11, reword boundary, 23→? Wayside); if doc is intended → shift `nextIsGrove` one round earlier and handle the R36 boundary so the 12th grove isn't eaten.
- **Routing if confirmed:** code-canonical → CHANGELOG `[design]`; doc-canonical → ROADMAP/bug (code fix).

**G0-029 — `code-vs-V6` (documented-but-unbuilt)** — Spirit-offering "exclude maxed spirits" filter is not implemented.
- **Where:** `ShrineScene.js:136-151` `_generateSpiritOfferings` — pool filter is only `tier!==1` / `legendary`; no stack/Negative check anywhere.
- **Rubric:** V6 §12.3 (`DESIGN_DOC_V6.md:2864-2873`) — "excluded if the player has 3 stacks AND already has a Negative copy."
- **Discrepancy:** doc describes a maxed-spirit exclusion; code applies none.
- **Read (assessment):** Likely documented-but-unbuilt (§12.3 itself hedges "rules need refinement"); the simple tier/legendary filter reads as a first pass. Low risk.
- **Routing if confirmed:** implement → ROADMAP, or soften §12.3 to "not yet implemented" → CHANGELOG `[design]`.

**G0-030 — `code-vs-V6` (data/economy)** — Speculative-card price: doc 10–20 ki vs code base 3 ki (+surcharges).
- **Where:** `shopCards.js:49` `let price=3` + enhancement (+3/+6) + stamp (+3/6/9/12); speculative cards in `cards.js` carry no `cost`.
- **Rubric:** V6 §11.4 (`DESIGN_DOC_V6.md:2760`) + §15.8 (`:3766`) — "Speculative cards | 10–20 ki".
- **Discrepancy:** real model is 3 (base) + 0/3/6 + 0/3/6/9/12 → bare card 3 ki, maxed ≈21; "10–20" matches neither.
- **Read (assessment):** Likely doc-stale/aspirational (the layered model is fully built + self-consistent); possibly an intended intrinsic 10–20 base is absent in code.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (reconcile §11.4/§15.8 to the 3+surcharge model); if an intrinsic base is intended → ROADMAP/data.

**G0-031 — `code-vs-ARCHITECTURE` (doc-internal, minor)** — ARCHITECTURE §1.2 lists RunManager state fields that don't exist.
- **Where:** `ARCHITECTURE.md:60` lists "`_round`/`_act`; `_totalScore`; `_styleBase`". Code: `act` is a computed getter (`RunManager.js:1131`), and there is **no** `_act`/`_totalScore`/`_styleBase` field (grep empty). `_flow` does exist.
- **Rubric:** ARCHITECTURE §1.2 (RunManager state model).
- **Discrepancy:** three named persistent fields are absent/derived.
- **Read (assessment):** Doc drift (copy-forward from an earlier state model); cosmetic. (MEMORY.md repeats the same three — collateral.)
- **Routing if confirmed:** doc-wrong → CHANGELOG `[architecture]` (trim §1.2's field list; note `act` is a getter).

**G0-032 — `code-internal` (minor)** — stale `roundInAct` comment says "(1–3)" but returns 1–6.
- **Where:** `RunManager.js:1134` `get roundInAct()` comment "(1–3)"; `ROUNDS_PER_ACT=6` → returns 1–6.
- **Read (assessment):** Leftover from a 3-round-act era; math correct, comment lies. Contradicts the confirmed 6-rounds-per-act structure.
- **Routing if confirmed:** code-wrong (comment) → CODEBASE_CLEANUP.

**G0-033 — `code-vs-V6` (minor edge)** — coupon discount not clamped at 45%.
- **Where:** `RunManager.js:193` `couponDiscountPct = stacks*15` (no clamp); `getEffectiveCost:377` clamps only `remainingPct≥0`. A coupon **Negative** (powerLevel 4 via lossless transcendence) can exceed 45%.
- **Rubric:** V6 §11.5 + `econ_coupon` desc (`spirits.js:675`) "stacks up to 45%".
- **Discrepancy:** "up to 45%" holds for regular 3-stack cap; a transcended Negative exceeds it (cost floor at 0 prevents negative prices).
- **Read (assessment):** Benign edge; the doc phrasing doesn't anticipate transcension. Mention only.
- **Routing if confirmed:** doc-wrong (clarify) → CHANGELOG `[design]`, or code clamp → CODEBASE_CLEANUP.

### G. Round loop / sub-managers (GRM / Field / Hand / Deck / Capture)

**Structural checks — CONFIRMED:** `_resetRoundState` called from BOTH constructor + `startRound`;
`_resetScoringState` runs AFTER `onRoundStart` hooks (timing contract); `startRound` resets/fires/deals in
the documented order; **two push axes are real and distinct** — `_pushCount` (attempts → deal-curve
`_getNextPushDealCount`) vs `_pushDepth` (successes → flow-curve `PUSH_CURVE`); push **commitment model**
(flow never mutated per-push; resolved only at bank/fail); Leaf/Silk slot bypass + anti-strand present;
§4.1 phase machine, §4.2 matching, §4.3 multi-card plays, §4.5/§4.6 round-end/exhaustion, and §3.4/§3.5/§3.6
pile semantics (banked = filtered view via `_spentCardIds`, not a separate pile) all match.
**Nuance:** `getSlots()` returns the **fixed-position array including `null` gaps**, not "occupied slots
only" — the code is correct (rendering iterates `Math.max(maxSlots, slots.length)`), but the *CLAUDE.md
pitfalls* wording "getSlots() returns OCCUPIED slots only" is imprecise (out of formal rubric scope; noted
for CLAUDE.md touch-up).

**G0-034 — `code-vs-V6` (MAJOR; cross-slice with Scoring)** — the "+5 full-month bonus" for a 4-card capture is documented but absent from code.
- **Where:** `GameRoundManager.js:1281` (`_addCapture` sums only `getCardPoints`) + the whole `_scorePipeline` (`:1308-1643`); `CardMutations.js:10-13` (`getCardPoints` = points+bonus, nothing more). Grep `+5|full.?month` in `src/systems` → no scoring bonus. The 4-card auto-capture *trigger* IS implemented (`FieldManager autoCaptureThreshold=4`); only the points award is missing.
- **Rubric:** V6 §3.3 (`:601`), §4.2 (`:746`), §5.4 (`:850`), and the §5.6 worked example (`:1178` "= 36 + 5 (full month) = 41").
- **Discrepancy:** V6 repeatedly specifies +5 base points on a full-month (4-card) capture; no code path adds it.
- **Read (assessment):** Real missing-feature OR stale doc — the worked example even bakes +5 into a stated total, and the absence is total/greppable, so likely the doc describes an intended/older rule. Robert rules direction. (The Scoring auditor (Section E) owns `_scorePipeline` math; coordinate before any pipeline edit.)
- **Routing if confirmed:** implement (`cards.length>=4` → +5) → ROADMAP; or strike +5 from §3.3/§4.2/§5.4 and fix the §5.6 example (41→36) → CHANGELOG `[design]`.

**G0-035 — `code-vs-V6` (MAJOR; dead feature)** — `_checkNaturalCaptures()` (round-start full-month-in-hand auto-capture) is defined but never called.
- **Where:** `GameRoundManager.js:790` is the ONLY occurrence (the definition); `startRound` (`:326-388`) never calls it. `_naturalCaptures` is set `[]` (`:260`), read only by the getter (`:149`) → consumed by `GameScene.js:3341-3353` (a "Natural full month captured" message that can never fire).
- **Rubric:** V6 §3.1 / §4.1 (`:716`) deal phase; the method's own JSDoc ("each complete month is immediately moved from hand to the capture pile").
- **Discrepancy:** the helper exists + is correct, but nothing runs it, so a natural full month dealt to hand is NOT auto-captured; V6's deal description and the live GameScene branch both assume it fires.
- **Read (assessment):** Confirmed dead path. Either intentionally cut (orphaned leftovers) or lost in a refactor (regression) — the still-active GameScene branch suggests the latter, but V6 doesn't emphasize naturals, so intent is ambiguous.
- **Routing if confirmed:** if intended-live → call `_checkNaturalCaptures()` in `startRound` after the deal (ROADMAP); if intended-cut → remove the method + `_naturalCaptures` + getter + GameScene branch (CODEBASE_CLEANUP). Log in DECISIONS_LOG either way.

**G0-036 — `code-vs-V6` (doc-stale)** — V6 §4.4 push table (flat ×1.1 "compounds 1.1×1.1") contradicts the live commitment curve.
- **Where:** `RunManager.js:232-238` `PUSH_CURVE` ({1:1.10/0.90, 2:1.25/0.80, 3:1.50/0.65, 4:2.00/0.50}), applied once at resolution; flow read live, mutated only at bank/fail.
- **Rubric:** V6 §4.4 (`DESIGN_DOC_V6.md:766-779`) — every push "×1.1" with "(compounds: 1.1×1.1=1.21)".
- **Discrepancy:** V6 = compounding per-push ×1.1/×0.9; code = single non-compounding depth-indexed multiplier at resolution (depth-1 coincides at 1.10/0.90, masking the divergence). Depth-2 success is ×1.25 not ×1.21.
- **Read (assessment):** Doc-stale — code matches the F2.6 commitment model (MEMORY + ARCHITECTURE §1.2); V6 §4.4 wasn't updated. The worked compounding example is actively misleading.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (rewrite §4.4 to the PUSH_CURVE/resolution-depth model).

**G0-037 — `code-vs-ARCHITECTURE/CLAUDE` (dead/parallel path)** — `FieldManager.playHandCard()` (single-card) is dead; only `playHandCards()` (plural) is used.
- **Where:** `FieldManager.js:180-216` `playHandCard`; the only live caller path is `playHandCards` (plural, `GameRoundManager.js:497`). The singular appears only in its own def + two GRM header comments (`:7`, `:540`).
- **Rubric:** ARCHITECTURE §1.1 (sub-managers) + CLAUDE.md "don't create parallel paths". The GRM header (`:7`) documents the flow via the wrong (`playHandCard`) method.
- **Discrepancy:** the singular has a now-divergent impl (no Silk anti-strand branch); a latent parallel path / drift trap.
- **Read (assessment):** Dead/parallel code — benign today but a hazard (a future capture-rule edit could land on the wrong method).
- **Routing if confirmed:** code-wrong → CODEBASE_CLEANUP (remove `playHandCard` / fix the GRM header reference).

**G0-038 — `code-internal` (nit)** — stale point values in `CaptureManager.js:233` comment.
- **Where:** `CaptureManager.js:233` JSDoc says "(bright=20, animal=10, ribbon=5, plain=1)"; `GameRoundManager.js:807-809` comment says "(bright=20, animal=12, ribbon=10, plain=3)". The two disagree; cards.js + `getCardPoints` use 20/12/10/3 (GRM comment is right).
- **Read (assessment):** Trivial comment rot in CaptureManager (no behavioral impact — `rawCardPoints` uses `getCardPoints`, not the literals).
- **Routing if confirmed:** code-wrong (comment) → CODEBASE_CLEANUP.

**Observation (low confidence, not filed):** V6 §4.6/§3.2 say push "deals from the discard pile if present", but `DeckManager.draw` pulls only from the draw pile. In practice `resetWithCards` empties the discard each round and in-round discards aren't reshuffled mid-round, so there's no discard pile to draw from during a round — likely not load-bearing, flagged for Robert's awareness.

### H. Cards / card data / mutations

**Structural checks — CONFIRMED:** base deck = exactly **48** cards; card dimensions (month/type/vertical/
temporal present; season derived from month per §2.6; enhancement/edition/stamp runtime-only, absent from
static data); type composition per month exact incl. the Aug/Nov/Dec irregularities; **axis distributions
EXACT** (air/land 24/24, day/night 24/24, quadrants 12/12/12/12, and every by-month + by-rank breakdown
matches §2.7 down to named cards); ribbon colors / animal subtypes / seasons groupings exact (no `color`/
`season` field, none claimed); `getCardPoints` = points+bonus, `isSilk` = wood+upgraded (line numbers
:10/:20/:32 exact); `_tex(card)=baseImageId??id` + `cardImageMap` coverage (47 entries; `december_plain_1_dup`
resolves via `baseImageId`) confirmed; §2.10 legacy ids (`may_bridge`, `september_sake`) still present.
**DIVERGES:** speculative count is **14**, not 13 (the 14th is doc-acknowledged deprecated — G0-041).

**G0-039 — `code-vs-V6` (doc-error)** — §15.1.3 per-rank "with speculatives" counts are wrong.
- **Where:** `cards.js` (base 5/9/10/24 + the §2.3 speculative set 7/3/2/1) = **Brights 12 / Animals 12 / Ribbons 12 / Plains 25** (total 61).
- **Rubric:** V6 §15.1.3 (`DESIGN_DOC_V6.md:3527-3533`) claims Brights 7 / Animals 16 / Ribbons 11 / Plains 27.
- **Discrepancy:** the doc's per-rank column contradicts BOTH the code AND the doc's own §2.3 table; only the total (61) is right.
- **Read (assessment):** Doc transcription error — code + §2.3 agree (code authoritative). The "16 animals" looks like a stale earlier (animal-heavy) speculative roster.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (fix §15.1.3 to 12/12/12/25).

**G0-040 — `code-vs-V6` (doc-error)** — §2.3 prose "brights (8 of 13)" contradicts its own table (7) and code (7).
- **Where:** `cards.js:632-779` — 7 speculative brights; §2.3 table also lists 7.
- **Rubric:** V6 §2.3 (`DESIGN_DOC_V6.md:370`) prose "Most speculative additions are brights (8 of 13)".
- **Discrepancy:** off-by-one in the prose; table + code say 7.
- **Read (assessment):** Doc-error (code authoritative).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` ("8 of 13" → "7 of 13").

**G0-041 — `code-vs-V6` (tracked code-debt)** — a 14th speculative card `december_plain_3` still exists; doc counts 13.
- **Where:** `cards.js:823-835` (`december_plain_3`, `speculative:true`, and it uniquely carries non-empty `tags`); `:846` comment "13+1".
- **Rubric:** V6 §2.3 title "(13 cards)" + §15.1.3; §2.3 (`:374`) explicitly calls it "deprecated… should be removed".
- **Discrepancy:** code has 14 speculatives; doc treats them as 13.
- **Read (assessment):** Known, doc-acknowledged debt (not silent). Doubles as the reason §15.1.3 Plains is ambiguous (25 vs 26) and the lone exception to "speculatives have empty tags" (§2.3/§2.8) — both subsumed here.
- **Routing if confirmed:** already routed by the doc — delete `december_plain_3` (CODEBASE_CLEANUP); no doc change beyond what §2.3 says.

**G0-042 — `code-vs-V6` (doc-error)** — §2.8 claims a `cardsByTag` lookup helper that does not exist.
- **Where:** `cards.js` exports `cardsByMonth/Type/Vertical/Temporal/Quadrant` + `getBaseCard/baseCards/speculativeCards/cards` — **no `cardsByTag`** (grep `cardsByTag` across `src/` → zero). Tags are read directly off `card.tags`.
- **Rubric:** V6 §2.8 (`DESIGN_DOC_V6.md:454`) — "Tags are accessed via the `cardsByTag` lookup helper in cards.js".
- **Discrepancy:** the named helper was never built; nothing needs it.
- **Read (assessment):** Doc-error / aspirational API stated as fact (code authoritative).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (remove the sentence), or add the trivial helper → CODEBASE_CLEANUP.

**Naming aside (not a defect):** the base array is exported as `baseCards` (48) / `speculativeCards` (14) /
`cards` (62) — there is no symbol literally named `ALL_CARDS`; it's a per-file import alias that means
*different sets* in different files (base in DeckManager, speculative in shopCards). Project `MEMORY.md`'s
"48-card array (ALL_CARDS)" is loosely true only via DeckManager's alias — worth a one-line memory/CLAUDE
clarification (out of rubric scope).

### I. Scenes / UI / Logging

**Structural checks — CONFIRMED:** scene flow Boot→Menu→Game↔Shrine (+ Divination/HexagramCollection), all
registered in `main.js:16`; canvas 1280×720; `SpiritLayout.computeFanPositions` signature + fan-chain
constants (SPIRIT→LEGENDARY→CONS) exact; §13.5 layout-constant table, §13.6 hexagonal field (8→3/2/3, 9→3/2/4,
10→4/2/4; iterate `Math.max(maxSlots,len)`), §13.7 drag-and-drop (8px threshold, fan from `allSpirits`,
fan-gap unstack), §13.9 tints/rarity/capture-fan, §13.11 ShrineScene 4-quadrant shop, §13.13 persistence,
**§13.14 Future/Planned UI genuinely unbuilt** (blessing acquisition/collection UI, stamp-tier indicator,
hex arrow panel — all absent), §14.1 logger architecture, §14.3 transcript format — all match.
**Note:** the project `MEMORY.md` "ShrineScene right column (Paramita h=140 / Forge h=80 / Fusion Ritual)"
layout **does not exist** — V6 §13.11's 4-quadrant description is the accurate one (the MEMORY cross-check
premise was stale). §13.1's nav diagram omits BootScene (minor doc completeness). Stale GameScene top-of-file
comments say `FIELD_CX=500` but live const is 596 (→ CODEBASE_CLEANUP).

**G0-043 — `code-vs-V6` (doc-stale)** — §13.12 per-chakra overlays + booster pack describe UX that doesn't exist; ShrineScene uses one generic picker.
- **Where:** `ShrineScene.js:1088` `_dispatchConsumable` → `:1108` `_showShrineCardPicker` (one generic random-8 grid handling `card`/`card_multi`/`card_pair`). No `_showBoosterPack`, no Akumon/month-grouping, no rank-cycle/edition-probability preview (greps empty). In-code comment `:1106-1107` (F4.35) confirms the generic-picker is deliberate. The Crown `card_pair` two-click picker DOES exist (matches doc conceptually).
- **Rubric:** V6 §13.12 (`DESIGN_DOC_V6.md:3313-3340`) — 7 distinct chakra overlays (Root "Akumon highlight", Solar Plexus "rank-cycling preview", Heart "edition probability 60/30/10"), a stampability-filtered stamp selector, and a booster-pack overlay.
- **Discrepancy:** doc claims rich per-item overlays; code is a single generalized 8-card grid picker.
- **Read (assessment):** Doc-stale — §13.12 reads as aspirational UX that was consolidated (F4.35 comment supports deliberate consolidation, not regression).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (describe the unified picker; drop per-chakra previews + booster pack), or file UI tasks if previews are wanted → ROADMAP.

**G0-044 — `code-vs-V6` (doc-stale)** — §13.11/§13.12 "Sacred Grove fusion section" + fusion/alchemical overlays are absent; fusion runs via alchemical consumables.
- **Where:** `ShrineScene.js` draws no fusion section; `getAvailableFusions` only adds a **gold glow** to fusable spirits in the fan (`:255`, `:304-308`). Fusion executes in `ConsumableEffects.js:302` (`alch_cinnabar`); `logShopFusion` (`GameplayLogger.js:250`) has **zero callers**.
- **Rubric:** V6 §13.11 (`:3309-3311`) "fusion section … recipe buttons → confirm overlay"; §13.12 (`:3334-3341`) "Fusion confirm" + "Alchemical result" overlays.
- **Discrepancy:** doc describes a dedicated Grove crafting section + overlays; code has neither — fusion is the Cinnabar/Mercury consumable family applied via the generic spirit-pair picker; the gold-glow cue is undocumented.
- **Read (assessment):** Doc-stale — fusion was redesigned from shop-section to consumable; the dead `logShopFusion` corroborates the removed shop path.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (rewrite §13.11/§13.12 fusion prose to the consumable flow + gold-glow cue); `logShopFusion` dead → CODEBASE_CLEANUP.

**G0-045 — `code-vs-V6` (doc over-specifies)** — §14.2/§14.4/§14.5 list logger methods that don't exist.
- **Where:** `GameplayLogger.js` — absent (grep-confirmed): `logCardEnhanced`, `logCardEditionApplied`, `logCardTranscended`, `logShopOfferings`, `logRetriggerScoring`, `printToConsole`. Present exports: `getTranscript()` (`:471`), `copyToClipboard()` (`:478`); console hook is `window.gameLog = logger` (`main.js:24`).
- **Rubric:** V6 §14.2 (`:3396-3401`), §14.4 (`:3453`, a full `logRetriggerScoring` paragraph), §14.5 (`:3463-3469`, lists `printToConsole()`).
- **Discrepancy:** doc enumerates a logging surface the code doesn't implement (retrigger logging + card-mutation events doubly-documented yet absent).
- **Read (assessment):** Doc over-specifies / aspirational telemetry (planned-but-unbuilt).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (trim §14.2/§14.4/§14.5 to what exists or move missing ones to §14.7 Future; implement or drop `printToConsole`).

**G0-046 — `code-vs-V6` (doc precision)** — §13.8/§13.13 name RunManager accessors that don't exist.
- **Where:** real getters: `ki/flow/hexagramId/spiritSlots/maxConsumableSlots/spirits/…/round/act/threshold/getDeck()`. **No** `run.fieldSlots`/`maxHandSize`/`cardsDealt`/`deck`/`activeHexagram` (field/hand/deal computed in GRM `_recomputeFieldSlots`; deck via `getDeck()`; hexagram via `hexagramId`+`getHexagram()`).
- **Rubric:** V6 §13.8 (`:3179/3185/3200`) + §13.13 (`:3349-3350`).
- **Discrepancy:** the *mechanism* §13.8 describes (dynamic recompute from blessings/hex/Amber/Rooster) is correct; the specific accessor *names* are wrong.
- **Read (assessment):** Doc precision drift (written against an intended/older accessor surface); behavioral claims hold.
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (correct the getter names or soften to "read at render time from RunManager/GRM").

**G0-047 — `code-vs-V6` (minor)** — §13.10 info-cluster field list is slightly off; Forfeit "two-step" overstated.
- **Where:** `GameScene.js:2629-2642` run-state cluster shows Hex/Act/Ki/**Interest**/Target; Flow is in the separate score block (`:288`); hexagram name+desc are hover-only (`:258`); `_showForfeitConfirm` (`:3846`) is a single modal.
- **Rubric:** V6 §13.10 (`DESIGN_DOC_V6.md:3236-3256`) — cluster lists Flow + "Active hexagram name and short description"; "Two-step confirmation prevents accidental forfeit".
- **Discrepancy:** Flow is shown but in the score readout (not the cluster); hex name/desc are hover (inline is just "Hex NN"); §13.10 omits the Interest line that IS present; forfeit is one-step.
- **Read (assessment):** Minor doc-accuracy drift (all info reachable; grouping + "two-step" imprecise).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (touch-ups to §13.10).

**G0-048 — `code-vs-V6` (minor)** — §13.2 Dev Mode / first-run-flag timing + §13.3 coin-value mapping.
- **Where:** `MenuScene.js:58-61` Dev Mode routes *through* DivinationScene (not a direct bypass); first-run flag set on New-Run click (`:69`), not on success. `HexagramGenerator.js:19-23` line = 3-coin majority, not summed 6/7/8/9 values.
- **Rubric:** V6 §13.2 (`:3006/3011`) "bypasses normal setup" + "flag set after first successful run"; §13.3 (`:3021`) "sum determines line value (6=yin…9=yin)".
- **Discrepancy:** Dev Mode still visits Divination; flag set at run *start*; the classical 6–9 line-value description doesn't match the 3-coin-majority impl (outcome distribution is equivalent, mechanic differs).
- **Read (assessment):** Minor descriptive inaccuracies (behavioral outcomes close).
- **Routing if confirmed:** doc-wrong → CHANGELOG `[design]` (small §13.2/§13.3 wording fixes).

**(Glory tooltip ×stacks vs flat-2 effect, independently re-found here against `tooltip_verification_checklist`
→ deduped to G0-006.)**

### J. Structural-count verification (ARCHITECTURE precise claims)

ARCHITECTURE.md makes unusually precise, checkable claims (counts, line numbers, registry sizes). These were
verified against live code across sections A–I. **The doc is remarkably accurate** — the overwhelming
majority confirmed *exactly*. Roll-up:

| ARCHITECTURE claim | Result | Evidence (§) |
|---|---|---|
| `SpiritEffects._effects` = 110 (95 hook + 15 `{}` stubs) | ✅ CONFIRMED | A |
| onCardScored 43 (19 literal + 24 factory), applyEngine 39, onCardSeen 8, getRetriggerCount 8, onRoundEnd 8, applyKiBonus 2, onFieldDiscard 2, Tier-2 hooks ×1 | ✅ CONFIRMED (all) | A |
| `ACCUMULATOR_SPIRIT_IDS` = 28, 1:1 with `ACCUMULATOR_INIT` | ✅ CONFIRMED | A |
| spirits.js ↔ `_effects` perfect 110↔110 bijection | ✅ CONFIRMED | A/B |
| `tooltipBase`/`_tb` single-source ("keep them equal") | ✅ except `engine_surplus` + decay start-values (G0-004/005) | A |
| Transcendence single path `_buildTranscendedNegative`; F4.26 lossless in-place splice; `effectivePower`; `maxLegendarySlots`=2; zero `legend_` ids; capstones `legendary:true`+`{}` stubs; `ANIMAL_SYMBIONT_MAP`=12; NEGATIVE_SNAPSHOT 5 helpers+28 entries | ✅ CONFIRMED (all) | B |
| `HEXAGRAM_EFFECTS` = 64; 64↔64 bijection; 44 distinct hooks; 3 dispatch classes; 8 Class-3 getters; **anti-pattern 1 = ZERO** name-checks | ✅ CONFIRMED (all) | C |
| Stamp/element auto-register loops; element-only `{action}`; **no `RunManager.applyElement`**; chakra/alch notify-not-spend; consumePolicy predicate; cycle maps; consumable bijection; Three Marks removed | ✅ CONFIRMED (all) | D |
| ScoringEngine stateless `evaluate`-only; yaku gates-only; single `_scorePipeline` (no 4th path); **ScoringEngine→SpiritEffects severed** (§6.1 #3); StyleEngine Fire-filter | ✅ CONFIRMED | E |
| `calculateFinalScore()` exists (vestigial) | ❌ DIVERGES — gone (G0-025) | E |
| `couponDiscountPct`/`piggybankHandKiMult` single-source; Bucket-B inline (4× `{}`); push curve; blessings pull-model; §12.8 NYI; `spiritSlots`→`plus_spirit_slot`; §11.1 decomposition; §15.8/§15.9; 7 blessing pairs; 6×6=36 | ✅ CONFIRMED (all) | F |
| ARCHITECTURE §1.2 RunManager fields `_act`/`_totalScore`/`_styleBase` | ❌ DIVERGES — absent/derived (G0-031) | F |
| GRM two reset methods + `onRoundStart` timing; **two push axes**; commitment model; Leaf/Silk | ✅ CONFIRMED | G |
| `getSlots()` "occupied slots only" (CLAUDE.md wording) | ⚠ NUANCE — returns sparse array incl. nulls (code correct, wording imprecise) | G |
| base deck 48; axis distributions exact; CardMutations :10/:20/:32; `_tex`/`baseImageId` | ✅ CONFIRMED | H |
| 13 speculative cards | ❌ DIVERGES — 14 (deprecated dup, G0-041) | H |
| scenes flow + shared leaves; canvas 1280×720; SpiritLayout; §13.14 unbuilt; logger arch/transcript | ✅ CONFIRMED | I |
| §14.2/§14.5 logger method surface; §13.8/§13.13 accessor names | ❌ DIVERGES (G0-045 / G0-046) | I |
| Import cycles §6.1: #3 ScoringEngine→SpiritEffects severed | ✅ CONFIRMED | E (#1/#2 are "accepted-and-contained" — existence not a divergence) |

**Takeaway:** every divergence from ARCHITECTURE is already captured as a finding (G0-004/005/025/031/041/045/
046) or a noted nuance. ARCHITECTURE's hook/registry/boundary claims are otherwise exact — the doc is in
excellent shape; the drift in this audit is concentrated in **V6's catalog/quick-ref sections and §9.4/§14.2
"status" lists**, not in ARCHITECTURE.

---

## Forward-doc reconciliation (ROADMAP.md + CODEBASE_CLEANUP.md)

Second pass: each actionable forward-doc entry checked against live code. **Flag-only** — Robert rules.

### Already done (candidate stale entries to RETIRE)

- **CODEBASE_CLEANUP:20 — `_dogProtection` rename** → **DONE.** Zero `_dogProtection` in `src/`; the live flag is `_pushPenaltyWaived` (`GameRoundManager.js:265`), set by `zodiac_rabbit`. (The doc's suggested target names `_pushPenaltySuppression`/`_rabbitActive` were never adopted — current name differs.) Retire. _(Underlies G0-021.)_
- **CODEBASE_CLEANUP:18 — verify no `legend_*` ids remain** → **DONE.** Zero `legend_*` in `src/`. Retire. _(Corroborates G0-010/B.)_
- **CODEBASE_CLEANUP:25 — stale "Coming soon" data-strings** → **DONE for the named two** (`econ_replica` `spirits.js:686`, `econ_collector` `:707` now carry real descriptions); only `econ_print` (`:697`) still says "(Coming soon)", which the item says to LEAVE. Retire the actionable half.
- **CODEBASE_CLEANUP:55 — legacy `consumable_horse/dog/pig/rooster`** → **DONE.** Zero matches in `src/`. Retire.
- **CODEBASE_CLEANUP:56 — `_markMode`-family renames** → **DONE.** Zero `_activateMark`/`_onMarkCardSelected`/`_markMode`/`_showBoosterPack`; current names are `_cardTargetMode`/`_activateCardTarget`/`_onCardTargetSelected`. Retire. _(Note: project MEMORY.md still documents the old names.)_
- **CODEBASE_CLEANUP:65 — Paramita/Yaku-Upgrades obsolete code (`buyYakuUpgrade`)** → **DONE.** Zero `buyYakuUpgrade`/`paramita`/Rice/Tea/Broth/Honey in `src/`. Retire. _(Note: MEMORY.md's "Paramita Upgrades h=140" Shrine layout is stale — see G0-044 note.)_
- **CODEBASE_CLEANUP:68 — "Three Marks" terminology** → **DONE (code side).** Zero residue in `src/`. Retire as a code task.
- **ROADMAP:110 — `[VERIFY]` Waidan Grove-exit coupling removed** → **DONE.** Zero `Waidan` in `src/`. Strike the `[VERIFY]`.
- **ROADMAP:210 — `[VERIFY]` F5.12** → **DONE & self-marking** (entry already says "✅ DONE 2026-06-14… strike"). Code confirms (no `Math.pow(base, effectivePower)` conditionals). _(This is G0-003: the SPIRIT_SET_ITERATION_RULE deep-doc wasn't updated to match this DONE state.)_
- **ROADMAP D5 — `_pickRandomLegendary` random-legendary offering removed** → **DONE.** Zero matches; dormant `addLegendarySpirit`/`canAddLegendary` remain live (intended). Accurate as written.

### Incorrect vs current code (candidate corrections)

- **ROADMAP F5.4 (:88) + `cards.js:10` header "13 speculative cards"** vs code. **Verified count = 14** (13 intended + the deprecated `december_plain_3`; `cards.js:843-846`). _(I resolved a sub-auditor disagreement here: one agent reported 15 by double-counting the comment line `cards.js:13` `// Marked with \`speculative: true\``; direct verification confirms 14 card objects.)_ The "13" is the *intended* end-state; code is at 14 until `december_plain_3` is deleted. Read: reconcile once G0-041 is actioned. _(Ties G0-039/040/041.)_
- **Decay-spirit dead `tooltipBase` scoping (for any future cleanup entry):** `lossPerRound` is **LIVE** (`SpiritEffects.js:1183/1201`, `spiritTooltip.js:233/237`); only `startMult`/`startPoints` are dead. Scope G0-005 accordingly — do NOT touch `lossPerRound`.

### New first-pass items — tracked or untracked?

| First-pass item | Status |
|---|---|
| `applyInterest()` dead (RM:1359, no callers) | TRACKED — CODEBASE_CLEANUP:13 |
| Tropic/Arctic 4-month bug (HexEffects:251-271) — G0-017 | TRACKED — CODEBASE_CLEANUP:51 |
| `card.ribbonStamp`→`card.stamp` rename | TRACKED — CODEBASE_CLEANUP:17 |
| Candidate I legendary/spirit decoupling | TRACKED — ROADMAP:81 (coupling confirmed live: RM:459/461, GRM:1325-1327) |
| `december_plain_3` deprecated dup — G0-041 | TRACKED — CODEBASE_CLEANUP:59 |
| `_checkNaturalCaptures()` dead (GRM:790) — G0-035 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| `FieldManager.playHandCard()` dead/parallel (FM:180) — G0-037 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| `ConsumableEffects.js:16` stale migration comment — G0-024 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| `logShopFusion` dead (GameplayLogger.js:250) — G0-044 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| `engine_surplus` + decay `startMult/startPoints` dead `tooltipBase` — G0-004/005 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| `spiritsByRarity.legendary` always-empty bucket — G0-010 | **UNTRACKED** → suggest CODEBASE_CLEANUP (check whole `spiritsByRarity` export for use) |
| `getFireFlatPoints` dead import in ScoringEngine (:32) — G0-025 | **UNTRACKED** → suggest CODEBASE_CLEANUP |
| Documented-but-absent "+5 full-month bonus" — G0-034 | **UNTRACKED** in these two → routes to V6/design reconciliation, not CLEANUP/ROADMAP |

### Still open / accurate (confirms coverage — no action)

CODEBASE_CLEANUP entries that correctly describe outstanding work: `applyInterest` removal (:13), `ribbonStamp`→`stamp` (:17), `tooltipBase`→scoring-value rename + `_tb` per D1/Cand-C (:19 — confirmed ~103 `tooltipBase` usages, genuinely unrenamed), `zodiac_cat` "Tier 1 Foundation" string (:24), volatile/stable_flow flavor text (:26), Tropic/Arctic 6-month fix (:51), broad hexagram description discrepancies (:52 — overlaps G0-011..014), `calculateFinalScore` vestigial (:63 — but see G0-025: it's already *gone*, so this entry may also be retireable), addKi/spendKi 'unspecified' tags (:64), May/Sept animal display names (:60). The CLEANUP "Already done" section (3 items) is accurate. ROADMAP's Phase-5/6/7 design+tuning entries (5A/5B/§3/§4) are forward plans, not code-state claims — not reconcilable against current code except the DONE items above.

---

## Coverage backstop note

**Method.** The sweep ran as 9 parallel read-only sub-audits (spirits ×2, hexagrams, consumables, scoring,
economy/run/shop/blessings, round-loop/managers, cards, scenes/UI/logging) + a forward-doc reconciliation
pass, each reading the exact rubric sections + live code and returning findings; the auditor (this
conversation) verified the ARCHITECTURE structural claims, resolved cross-auditor disagreements, classified,
and wrote the report. No code, no reference doc, and no forward doc were edited — only this file was created.

**Files covered (read in full unless noted):**
- **/systems/:** SpiritEffects, RunManager, GameRoundManager (full), HexagramEffects, ConsumableEffects,
  ScoringEngine, StyleEngine, scoringLabels, FieldManager, HandManager, DeckManager, CaptureManager,
  CardMutations, HexagramGenerator, GameplayLogger, RNGHook (touched via dispatch checks).
- **/data/:** cards, cardImageMap, spirits, consumables, hexagrams, blessings, fusionRecipes, shopCards,
  yakuThresholds.
- **/scenes/:** Boot, Menu, Divination, HexagramCollection, GameScene (layout/create/static-UI/fans/info +
  method-name inventory of the deep activation flows), ShrineScene (constants/build-UI/shop/pickers),
  shared/ (SpiritLayout, spiritTooltip, spiritTargetPicker, consumePolicy).
- **Rubric:** all of ARCHITECTURE + ENGINEERING_RULES + SPIRIT_SET_ITERATION_RULE; V6 §2–§16 by section;
  tooltip_verification_checklist. Forward: ROADMAP + CODEBASE_CLEANUP (full).

**Backstop confirmations the brief asked for:**
- **Late-finished mechanical work (recent spirit/consumable/hexagram changes):** COVERED (Sections A–D). The
  F4 consolidations (the 110/64 registries, accumulator `_tb` single-sourcing, the auto-register loops, the
  severed ScoringEngine→SpiritEffects edge, the migrated element/chakra attach) all verified as landed.
- **In-game render-layer / UI (ROADMAP §4 polish class):** COVERED (Section I) at the structural/behavioral
  level — scene graph, fan layout, shop quadrants, slot mechanics, the §13.14 "planned/unbuilt" inventory,
  logger surface. Glory tooltip drift confirmed (G0-006).

**Areas NOT fully reached (so completeness is honest):**
- **GameScene.js deep bodies** (`~:1434-2624` zodiac/alch/card-target activation flows; `~:2677-3845` end
  screen + overlay builders): method *presence* verified, bodies skimmed not line-read. **ShrineScene.js
  `~:340-832`** (expand/sell, per-quadrant card draw, tooltip lines): partial. Pixel-exact coordinates were
  intentionally not audited (out of scope per the UI slice).
- **Wu Xing scoring constant *values*** (Fire 30/100, Water/Wood/Metal/Earth mult tiers): confirmed to live
  in `HexagramEffects` getters and be consumed at `GRM:1169`, but their exact numeric match to V6 §8 was
  only spot-checked (Fire 30/100 matched §8); a full §8-value-by-value cross-check of the getters is a small
  residual.
- **CODEBASE_CLEANUP §17.7 V5/V6-era sub-items** (stamp-tier semantics, Amber 3-stack restriction,
  Piggybank/Grace caps, Ingot truncation): not re-verified line-by-line — the doc itself flags them
  "verify before actioning."
- **One cross-auditor disagreement resolved by direct check:** speculative-card count = **14** (not 15).

**Test baseline (close-out).** `npm test` at the start of the run (no code touched since): **42 files passed,
318 passed + 1 skipped (319)**, exit 0. Unchanged — this audit created only `GATE_0_FINDINGS.md`.

**Completeness self-assessment.** High confidence on the structural/registry claims (grep-verified counts +
bijections) and the dead-code findings (zero-caller greps). The behavioral discrepancies (G0-028 Grove
cadence, G0-034 +5 bonus, G0-035 natural captures, G0-012 seasonal hex) are confirmed code↔doc gaps;
*direction* (fix code vs fix doc) is left to Robert as designed. The dominant pattern: **code is in good
shape and ARCHITECTURE is accurate; the drift is concentrated in V6's catalog/quick-ref tables (§15.x), V6's
own "status/known-issues" lists (§9.4, §14.2), and a handful of post-restructure dangling references.**
