# tier4_scoping.md — Tier-4 (UI/UX cleanup) scoping & task breakdown

> **Standing doc** (process/, consulted by Tier-4 execution). Read-only recon output, 2026-06-12,
> against current source after step-1 hygiene landed (`3b2263c`/`7cf9c0f`). Step 2 of the
> `PHASE4_COMPLETION_PLAN.md` 6-step sequence is **Tier-4 scoping** — this doc turns the Tier-4
> *headline* ("F4.35 + F4.36/F4.37 + F3.16") into actual sequenced campaigns. No code was changed.
>
> **Method:** all anchors re-grepped against current source (line numbers shifted after step 1). Three
> mapping passes (one per cluster) classified the actual migration/unification/redesign surface. The
> mandatory cross-step check (does any Tier-4 item secretly depend on a step-3 design ruling?) was run.

---

## Part 0 — Handoff + the three-cluster shape

**Sync confirmed.** PHASE4_STATE §3 + PHASE4_COMPLETION_PLAN agree: Tier 3 closed 2026-06-11; step 1
(groupings 1+2+3 hygiene) DONE 2026-06-12 (`F4-TIER5-STEP1`); **step 2 (Tier-4, opening with this
scoping) is current.** Build/suite were green at 151/1 at step-1 close.

Tier 4 is **not four independent tasks**. It's **three clusters** with different risk/dependency profiles:

| Cluster | Items | Internal order | Rough size | Risk | Step-3 dependency? |
|---|---|---|---|---|---|
| **1 — Tooltip / data-source-of-truth** | F4.36 → F4.37 → F3.18 | strict | F4.36 large-mechanical; F4.37 medium; F3.18 small-medium | low (F4.36) → medium (F4.37) | **F4.37 soft-depends** on F4.26 + F4.28 |
| **2 — Scene-rendering dedup** | F4.35 | n/a | small-medium (⅓ extract, ⅔ contain) | low | **none** |
| **3 — Scoring-log redesign** | F3.16 + F3.17 | F3.17 rides F3.16 | medium (real redesign) | medium-high | **F3.16 HARD-depends** on F4.26 |

**Headline conclusion (the cross-step find):** Tier 4 is **NOT monolithically before step 3.** The two
items that merely *restructure code/data* (F4.36 SSOT migration, F4.35 scene dedup) are fully
independent and **execution-ready now**. The two that *present scored values* (F4.37 tooltip recomb,
F3.16 scoring log) depend on step-3 rulings that *change* those values — chiefly **F4.26 powerLevel
semantics** (step 3a). Doing them before F4.26 risks redesigning twice. See Part 4.

---

## Part 1 — Cluster 1: Tooltip / data-source-of-truth (F4.36 → F4.37 → F3.18)

### F4.36 — effect-code migration to read base values from `tooltipBase`

**The premise correction (recon flag).** OVERHAUL_PLAN ~:1800/:4230 states F3.5b left a `TODO(F4.36)`
comment at every effect site marking `tooltipBase` as canonical. **This is stale: ZERO `TODO(F4.36)`
markers exist in source.** The only `TODO` in `SpiritEffects.js` is `:516` (`util_glory` draws-vs-stacks
reconciliation — a different concern). Worse: **`SpiritEffects.js` does not import `getSpiritDef` and
contains zero references to `tooltipBase`** — so **no effect currently reads from tooltipBase** (bucket
"already-reads" is empty). The migration surface must be derived fresh; the markers can't seed it.

**The surface (current source):** `spirits.js` carries **~90 `tooltipBase` declarations** (~9–10 are
empty `{}` structural placeholders; ~80 carry a numeric field). Of those, **~74 spirits hardcode the
same constant in `SpiritEffects.js`** that `tooltipBase` also declares — that's the F4.36 target. By
literal-occurrence the surface is larger (**~130–150 sites**) because the accumulator engines duplicate
each constant **2–3×** (regular `applyEngine` branch + `isNegative` branch + the `NEGATIVE_SNAPSHOT`
scaling arg at `SpiritEffects.js:295-337`).

**Two sub-populations, sharply different difficulty:**
- **F4.36a — per-card spirits (~38, EASY).** Seasonal/axis/fusion/rank/cross + `sym_wolf`,
  `util_irrigation`. The constant is a single factory-call arg (`monthPointAdd([3,4,5], 20)`,
  `SpiritEffects.js:346`) or one inline literal in an `onCardScored` return (`rank_shine`
  `{addPoints:80, addMult:8}`, `:392`). Clean 1:1 swap to `getSpiritDef(id).tooltipBase.<field>`.
  Low risk, ~1 edit each.
- **F4.36b — accumulator/engine spirits (~30, HARD).** Each scaling constant is duplicated 2–3× and
  must stay in sync; the surrounding `1 +` base, `?? 1`/`?? 0` seeds, and `(powerLevel ?? 1)` scaling
  are **structural, NOT in tooltipBase** (do not migrate them). `engine_velocity`'s `1.5` is entangled
  in `Math.pow(1.5, …)` + a different snapshot form. **Decision required up front:** does tooltipBase
  become the source for the negative-branch + snapshot args too, or only the regular path? That choice
  halves or doubles the engine-bucket edit count.

**Spirits to flag during F4.36 (not blockers, but decide):**
- `engine_banner` — `tooltipBase:{}` (empty) but the effect hardcodes a `+1.0` mult with no field to
  migrate *to*. Inverse problem: tooltipBase is *missing* `mult:1`. Add the field or leave as bucket-C.
- `econ_reward` (`kiPct:10` → code `0.10`), `econ_bonds`/`econ_coupon`/`econ_lucky_charm` — pct-vs-fraction
  conversions; several have `{}` effect bodies (logic lives in RunManager/shop), so not migratable in
  `SpiritEffects.js` anyway.
- `decay_persimmon`/`decay_pear` — only `lossPerRound` (3/5) lives in `SpiritEffects.js`; `startMult:30`
  / `startPoints:150` are seeded in RunManager `_initSpiritState`. A SpiritEffects-only F4.36 migrates
  the loss rate, not the start value.
- `util_glory` — `{draws:2}` migratable, but `:516` flags a separate stacks-vs-flat behavior bug; keep
  the literal swap and the behavior fix distinct (don't bundle a [FIX] into the [PRESERVE] migration).

**Tagging:** F4.36 is a **[PRESERVE]** refactor (fallbacks match hardcoded values → zero behavior
change) — except the explicitly-flagged Lincoln "bank without pushing" clause (`:1015` tooltip vs
`engine_lincoln` increments every bank), which the plan calls out as a **[FIX]** to verify and is
effect-code territory. Keep them as separate changes within the campaign.

**Verdict:** **stage as F4.36a (per-card, ship first, low-risk [PRESERVE]) then F4.36b (engines,
needs the negative-branch/snapshot scope decision).** Not one undifferentiated sweep.

### F4.37 — post-consolidation tooltip recombination

`spiritTooltip.js` (the `getSpiritContrib`/`getElementContrib` dispatch) is **already** the consolidated
tooltip home and **already reads `tooltipBase` via the `_tb` helper for the per-card (Cat-1) block**
(`spiritTooltip.js:36-97`). But the **engine block hardcodes its own copies** of the same scaling
constants (`engine_devotion` `*4` at `:239`, `sym_algae` `*0.1` at `:153`, etc.) — a *third* copy of the
constants beyond the two in `SpiritEffects.js`. So after F4.36 lands, F4.37's job is: **point the tooltip
dispatch at the same `tooltipBase` fields the effect code now reads**, eliminating the tooltip's private
copies, and fix the known drift bugs (decay_pear decay-rate doesn't scale; econ_coupon static 15%).
F4.37 genuinely depends on F4.36 (can't unify on a source that effect code doesn't yet use).

**Soft step-3 dependencies (per OVERHAUL_PLAN ~:4261-4266, confirmed):** F4.37's stated preconditions
include **F4.28** (stacking-math audit — grouping 6 / **step 3b**) and **F4.24** (architecture catalogue
— **step 6**, written last). Both are sequenced *after* Tier 4. F4.37 also verifies *stack-aware* tooltip
values, which **F4.26 powerLevel** (step 3a) can change. See Part 4 — these make F4.37 a "do against
current semantics and accept a re-touch, OR defer past step 3a" decision, not a clean step-2 item.

### F3.18 — card tooltip enrichment

**Confirmed** it's the OVERHAUL_PLAN-sequenced "after F4.20+F4.36+F4.37" item (~:2281-2288). **But its
actual content is largely independent of the spirit-constant work:** F3.18 surfaces *card* state (Wu Xing
enhancement, ribbon stamp via `getStampDef`, edition, mutation markers) in the card hover tooltip — a
different surface from spirit tooltips. The "after F4.36/F4.37" sequencing is about *shared tooltip
infrastructure cleanliness*, not a hard data dependency. It could run independently; keeping it last in
the cluster is fine but it is **not gated** on F4.36's outcome the way F4.37 is.

**Cluster-1 verdict:** **staged, not one coordinated sweep.** F4.36 (a then b) is the load-bearing
prerequisite and is step-2-ready. F4.37 is gated on F4.36 *and* soft-gated on step-3 (F4.26/F4.28).
F3.18 is loosely-coupled polish that can ride last or run parallel.

---

## Part 2 — Cluster 2: Scene-rendering dedup (F4.35)

`src/scenes/shared/` holds exactly two modules today (`SpiritLayout.js`, `spiritTooltip.js`); any F4.35
extract is a third. Three `TODO(F4.35)` markers in `ShrineScene.js` (re-grepped: **block header ~:1114,
`_showShrineCardPicker` ~:1140, `_showShrineSpiritPicker` ~:1278**).

**Picker 1 — card target.** Shrine `_showShrineCardPicker` (~:1141-1245, helpers `_shrineCardParams`
~:1133, `_finishCardConsumable` ~:1248) vs GameScene `_activateCardTarget` (~:2229) + `_onCardTargetSelected`
(~:2268) + inline hooks in `_renderHand`/`_renderField`. **Structurally different widgets:** the shrine
builds a **self-contained modal grid** over a **fresh random-8 deck subset** (per the D-G ruling); the
GameScene sets a `_cardTargetMode` flag and tints the **live in-round hand/field in place** (no modal),
reaching into `this._round.deck` for chakra cards (impossible at the shrine — no round). → **Verdict:
PARTIAL-UNIFY.** Keep both UI shells per-scene; extract the genuinely-shared tails: (1) the
**stripped-enhancement → return-base-consumable** block (a ~12-line byte-twin: ShrineScene ~:1254-1262 ≈
GameScene ~:2297-2312) and (2) a shared **card-param builder**.

**Picker 2 — spirit/alchemical target.** Shrine `_showShrineSpiritPicker` (~:1279-1358) vs GameScene
`_showAlchemicalTargetPicker` (~:2148-2220, entry `_activateAlchemical` ~:2126). **Closest-matching
pair:** same modal skeleton, same `isPair` derivation, same select→`effect.execute`→`consumeById`+
`logConsumableUse` core, same Lead/Sulfur no-target fast path. → **Verdict: PARTIAL-UNIFY (clean once a
gap is resolved)** — extract the shell + select/execute core to `shared/spiritTargetPicker.js` with
injected callbacks. **The real find:** the shrine picker does **inputType-based eligibility gating**
(tier/stack filters, ~:1297-1313, aborts "No eligible spirits") that **GameScene's picker entirely
lacks**. Before extracting, Robert must rule whether that asymmetry is a latent GameScene gap (should
gate) or intentional (in-round alchemicals don't gate). The shared helper should take an explicit
eligibility predicate so the answer is deliberate, not accidental.

**`_renderHexagramSymbol` twin (lost-and-found, F4.35-adjacent).** **Confirmed byte-identical:** GameScene
~:3657-3671 ≡ ShrineScene ~:225-239 (same signature, constants, loop, math; only `this.add.rectangle`
binds it to the scene). → **CLEAN-EXTRACT** to a pure `shared/` helper taking `scene`/`scene.add`. The
cleanest, zero-risk win in F4.35.

**Cluster-2 verdict:** roughly **⅔ document-and-contain** (the card-picker UI shells — different widgets
on different surfaces; unifying relocates complexity) and **⅓ clean-extract** (`_renderHexagramSymbol`
twin + the stripped-base block + the spirit-picker core, the last gated on the eligibility ruling).
**Fully independent of step-3 rulings — execution-ready now.** Same document-and-contain judgment posture
as the named spirit hand-offs.

---

## Part 3 — Cluster 3: Scoring-log redesign (F3.16 + F3.17)

Logger is `src/systems/GameplayLogger.js`. Breakdown is built in `GameRoundManager.js` at two
near-identical sites (`_scoreFieldCards` ~:411, capture path ~:1410).

**Inventory.** `logCaptureScoring` is **LIVE** (GRM ~:479, ~:1616). `logRetriggerScoring` (~:432) is
**confirmed ORPHANED** (zero callers — the F2.10b stamp block that called it was deleted). Every other
logger method is live. The orphan deletion is the one trivially-mechanical sliver.

**Structure & naming.** Per-card `_cb = {cardName, meta, basePoints, contributions:[], totalCardPts}`;
each `contributions[]` entry is `{source, addPoints, addMult, multiplyMult}`. Aggregate
`_bd = {cards, heldEffects, engines}`. **Naming inconsistency confirmed but nuanced:** there is **no
`.sources` field anywhere** (the plan's "`contributions` vs `.sources`" is directionally right but
imprecise). The actual issue: **three structurally-identical arrays under three names** —
`contributions` (per-card), `heldEffects`, `engineSpirits` (capture-level) — with the entry label field
named `source` (singular). Normalizing these is a schema decision.

**Retrigger surfacing.** Retriggers (Phase 1.5, GRM ~:1523-1564) call `_applyCardEnhancements(card, …,
null)` — **passing `null` for the contributions array deliberately** (comment ~:1531). So retrigger
contributions **do not appear in the per-card breakdown** at all; they surface only as transient
`_onScoringStep({type:'retrigger'})` animation events. F3.17 (ride-along) = decide how retriggers
re-enter the breakdown (new entry / nested sub-array / separate list) — i.e. the **nested-vs-flat**
design decision.

**Two redundant channels (confirmed).** The same scoring numbers are assembled twice from the GRM loop:
**Channel A** = `logger.logCaptureScoring` (persistent text transcript); **Channel B** =
`this._onScoringStep` events drained by `GameScene` `_scoringQueue`/`_animateScoringEvent` (animation).
They are separate objects with overlapping-but-divergent shapes (the `spirit_effect` event carries
`prevPts/prevMult`; the `_cb` entry does not). Some Channel-B events (`engine_state_update`) may lack
consumers. No `schemaVersion` exists anywhere.

**Assessment — redesign, not cleanup.** Only the orphan deletion is settled. The rest carries **real
open design**: (1) unify-or-keep the two redundant assembly channels; (2) nested-vs-flat retrigger
representation; (3) normalize the three-array / `source`-key naming; (4) optional schema versioning for
analytics. **F3.16 is NOT execution-ready** — it is a schema redesign with open decisions, meatier than
"UI polish." It belongs nearer the design stream than its step-2 "scoring log" headline implies.

**Cluster-3 verdict:** F3.17 subsumed into F3.16 (no interim fix). F3.16 needs a **design pass** (resolve
the four open decisions) before an execution campaign — and is **hard-gated on a step-3 ruling** (next).

---

## Part 4 — The cross-step dependency check (mandatory)

**Question:** does any Tier-4 cluster secretly depend on a step-3 design ruling sequenced AFTER it
(grouping 5 + F4.26 powerLevel / F4.33 Festival / F4.38(a) Wu Xing timing; grouping 6 F4.28 stacking)?

**FINDING 1 — F3.16 ↔ F4.26 (powerLevel). HARD dependency. The most expensive one.**
The scoring-log breakdown **already bakes `effectivePower(spirit)` into both the numbers and the
human-readable labels**: source strings like `spirit ${name} (power ${effectivePower})` (GRM ~:1496),
`${name} ×${count}` (~:441), `${name} (stack ${effectivePower})` (~:466/:1598), and per-contribution
`addPoints`/`addMult` are pre-multiplied by `count = effectivePower`. **F4.26 (Option A: powerLevel =
min(3, stackCount-1) vs Option B: all-4-contribute) changes what powerLevel *means* and therefore what
the breakdown should display** (base-per-stack × N vs the rolled-up product; how a Negative's baked
power attributes). **If F3.16's schema is finalized before F4.26 rules, the spirit-attribution structure
gets redesigned twice.** → **Recommendation: sequence F3.16's schema-design after the F4.26 ruling
(step 3a).** The orphan-deletion sliver can ship anytime; the redesign should wait.

**FINDING 2 — F4.37 ↔ F4.28 + F4.26. SOFT dependency.**
F4.37's own preconditions (OVERHAUL_PLAN ~:4261-4266) list **F4.28** (stacking-math audit — step 3b)
and **F4.24** (architecture catalogue — step 6, written last), both sequenced *after* Tier 4; and F4.37
verifies *stack-aware* tooltip values that **F4.26** can change. None hard-blocks a recomb against
*current* semantics, but doing F4.37 in step 2 means accepting a **re-touch** if F4.26/F4.28 later move
the numbers. → **Recommendation: either (a) defer F4.37 past step 3a alongside F3.16, or (b) do it in
step 2 against current semantics with eyes open to the re-touch.** Robert's call; the data favors (a)
since F4.36 (its hard prerequisite) and F4.37 don't have to be adjacent.

**NO dependency — explicitly cleared (valuable confirmations):**
- **F4.36** (effect-code base-constant migration): migrates *base* constants; the powerLevel *scaling*
  (×N via `effectivePower`) is applied separately and untouched. **Independent of F4.26/F4.28.**
  Execution-ready.
- **F4.35** (scene pickers + hex-symbol twin): pure UI/rendering dedup. **Independent of all step-3
  rulings.** Execution-ready.
- **F3.16 ↔ F4.33 (Festival cap):** `util_festival` returns `null` from `onCardScored` (contributes no
  points/mult) — it never produces a breakdown entry. A per-round Festival cap is generation-side and
  doesn't touch the scoring-log schema. **No dependency.**
- **F3.16 ↔ F4.38(a) (Wu Xing proc timing):** scoring-time Wu Xing multipliers are already in
  `_cb.contributions` (`_applyCardEnhancements` ~:1252); round-end procs (depLevel++, break roll) are a
  *separate* logger surface (`logRoundEnd.enhancementEvents`, post-scoring ~:746). A *timing* ruling
  doesn't change what the per-card schema captures. **No dependency** (one-line caveat: if F4.38(a) ever
  moved a proc's *effect* into scoring-time, that would then need a `contributions` entry).

**Net:** the cross-step risk is real but **localized to the two value-presenting items** (F3.16 hard,
F4.37 soft) and both point at the same ruling, **F4.26 powerLevel (step 3a)**. The code/data-restructuring
items (F4.36, F4.35) are clean. This is the "does it secretly need a later ruling?" check paying off:
**Tier 4 should not be executed as one block before step 3 — it should be split across the step-3
boundary.**

---

## Part 5 — Proposed Tier-4 task breakdown + sequence

Tier 4 = **6 campaigns** in two waves around the step-3 F4.26 ruling.

### Wave A — execution-ready now (step 2, before step-3 rulings)

| # | Campaign | Tag | Depends on | Notes |
|---|---|---|---|---|
| **T4.1** | **F4.36a** — per-card effect-code → `tooltipBase` reads (~38 spirits) | [PRESERVE] | — | Easy 1:1 swaps; fallbacks match literals → zero behavior change. Ship first. |
| **T4.2** | **F4.36b** — engine/accumulator effect-code → `tooltipBase` reads (~30 spirits) | [PRESERVE] | T4.1 | **Decide first:** migrate negative-branch + `NEGATIVE_SNAPSHOT` args too, or regular path only. Leave structural seeds (`1+`, `?? 1`, `powerLevel`) alone. Add missing `engine_banner` field or leave bucket-C. |
| **T4.2-fix** | **Lincoln "bank without pushing" clause** | [FIX] | — | Separate change from T4.2 (don't smuggle a [FIX] into [PRESERVE]). Verify `engine_lincoln` increments only on no-push banks. |
| **T4.3** | **F4.35** — scene-picker dedup + `_renderHexagramSymbol` extract | [PRESERVE] | — | Clean-extract: hex-symbol twin → `shared/`; stripped-base block → helper; spirit-picker core → `shared/spiritTargetPicker.js`. Document-and-contain the two card-picker UI shells. **Needs one ruling:** the spirit-picker eligibility-gating asymmetry (shrine gates, GameScene doesn't) — resolve before the core extract. |

### Wave B — gated on the F4.26 powerLevel ruling (step 3a) — sequence AFTER it

| # | Campaign | Tag | Depends on | Notes |
|---|---|---|---|---|
| **T4.4** | **F3.16 design pass** — resolve the 4 open schema decisions (channel unify, nested-vs-flat retrigger, naming normalize, versioning) | design | **F4.26** | Spirit-attribution schema bakes `effectivePower` → must reflect the F4.26 ruling. This is design deliberation, not a code campaign. |
| **T4.5** | **F3.16 + F3.17 execution** — migrate emitters/consumers to the new schema; delete orphaned `logRetriggerScoring`; surface retriggers per T4.4's decision | [FIX] | T4.4 | The orphan-delete sub-step can ship anytime as trivial cleanup; the schema migration waits for T4.4. |
| **T4.6** | **F4.37** — tooltip recomb (point dispatch at the F4.36 `tooltipBase` source; fix decay_pear/econ_coupon drift) | [FIX] | T4.2, **F4.26** (soft), F4.28 (soft) | Either defer here (recommended — values settled) or do in step 2 accepting a re-touch. |
| **T4.7** | **F3.18** — card tooltip enrichment (stamp/edition/enhancement/mutation lines) | [FIX] | (loose) T4.6 | Largely independent of the spirit-constant work; can ride last or run parallel. Not hard-gated. |

### Execution-readiness summary

- **Ready now (no ruling needed):** T4.1, T4.2 (after the negative-branch scope decision — an internal
  one, not a step-3 ruling), T4.2-fix, T4.3 (after the eligibility-gating decision — internal).
- **Needs a step-3 ruling first (F4.26 powerLevel):** T4.4/T4.5 (F3.16, hard), T4.6 (F4.37, soft).
- **Loose:** T4.7 (F3.18).

**Recommended first Tier-4 campaign:** **T4.1 (F4.36a)** — the largest-surface, lowest-risk, fully
independent [PRESERVE] migration; it unblocks T4.2 and is the hard prerequisite the whole tooltip cluster
sits on. **T4.3 (F4.35)** can run in parallel (disjoint files, independent). Hold Wave B until the F4.26
ruling lands in step 3a — surfacing that gate now is this scoping pass's highest-value output.

---

## Appendix — anchors re-grepped (current source, 2026-06-12)

- `TODO(F4.36)` / `tooltipBase` / `getSpiritDef` in `SpiritEffects.js`: **zero** (premise stale).
- `tooltipBase` declarations in `spirits.js`: ~90 (~80 non-empty); ~74 duplicated in `SpiritEffects.js`.
- `TODO(F4.35)`: `ShrineScene.js` ~:1114 (header), ~:1140, ~:1278.
- `_renderHexagramSymbol`: GameScene ~:3657-3671 ≡ ShrineScene ~:225-239 (byte-identical).
- `logRetriggerScoring`: `GameplayLogger.js:432`, **zero callers** (orphan).
- breakdown build sites: `GameRoundManager.js` ~:411, ~:1410; `_applyCardEnhancements` ~:1252; retrigger
  `null`-pass ~:1531-1533; post-round procs ~:746.
- `effectivePower` in breakdown labels/math: GRM ~:441, ~:466, ~:1496, ~:1598.

*(Line numbers drift; re-confirm before acting, per the recon gate.)*
