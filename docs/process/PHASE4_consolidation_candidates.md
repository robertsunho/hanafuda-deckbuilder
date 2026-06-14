# Phase 4 — Consolidation Candidate Tasks (deferred / backlog)

**Created:** 2026-06-06. **Status:** BACKLOG — not scheduled; captured so the reasoning
isn't lost. Surfaced during the F4.17 step-1 discussion (the `countStackedById` vs
`incrementPerElement` counting-mechanism observation).

These are candidate tasks, deliberately NOT folded into any active campaign (avoiding scope
creep). Each is its own task with its own timing and risk. Recorded per the
iterative-reorganization principle (D-F4.18b): notice it, write it down, scope it, don't let
it derail current work.

> **This doc is a candidate REGISTRY spanning Phase 4 AND Phase 5 — not a Phase-4 to-do list.** Each
> entry carries its own phase gating (the per-entry **SWEEP STATUS** / phase line). Several are
> deliberately gated to late Phase 4 or banked to Phase 5: Candidate C (gated on F4.24b), Candidate G's
> UX-completion half (→ Phase 5), Candidate H (Phase TBD), Candidate I (campaign Phase 5), plus the
> embedded Phase-5 notes (Wu Xing timing, Mirror/Memory slot-vs-adjacency, velocity magnitude).
> **Not all entries here will close by Phase-4 end — that is by design, not slippage.** At Phase-4
> close, the phase-level closeout sweep (PHASE4_STATE §6 / INFRASTRUCTURE_DECISIONS doc-lifecycle)
> collects the Phase-5-bound entries into Phase-5 planning rather than treating them as dropped or done.
> A task's phase is set by its dependencies, not by its presence in this doc.

---

## Background — the observation that surfaced these

While migrating `econ_recycling` and `engine_ship` onto `onFieldDiscard` (F4.17#1), two
different "counting" mechanisms appeared side by side:
- `countStackedById(id)` — a **stateless instantaneous read**: "how many stacks of this
  spirit do I have right now?" (recycling: payout = `5 × current stacks`).
- `incrementPerElement` / `aggregateNumericState` — a **stateful accumulator**: a running
  total of event-counts built up over a run, tied to per-element state and the
  transcendence (negative-spirit) snapshot machinery (ship: `cardsDiscarded` grows over time).

They look parallel but solve different problems (read-current-multiplicity vs.
accumulate-events-over-time). They should NOT be merged into one function — recycling has
nothing to accumulate; ship would lose its history. BUT the observation surfaced three
genuine, separable consolidation opportunities:

---

## Candidate A — Effect-magnitude accessor unification

> **SWEEP STATUS (2026-06-10): OPEN — no closing record.** Incidental adoption only (F4.17#1 routed
> `econ_recycling` through `effectivePower`), but the codebase-wide standardization on one accessor was
> never run as a named task. No DECISIONS_LOG entry closes it. Still a live candidate.

**What:** Spirits currently read "how strong is this instance right now" in at least three
inconsistent ways: `countStackedById(id)`, `effectivePower(spirit)`, and direct `stackCount`
reads. These ARE the same question and the inconsistency is real seepage (the F4.20 audit
family). Standardize on one accessor (likely `effectivePower(spirit)` inside hooks — which
F4.17#1 already does for recycling).

**Scope/risk:** Low–medium. Mechanical, but touches many call sites. Possible genuine code
consolidation (not just renaming).

**Timing:** Mid/late Tier 2, after the structural migrations settle (renaming/rerouting
accessors before the structure stops moving = wasted churn).

---

## Candidate B — Accumulator-cluster abstraction

> **SWEEP STATUS (2026-06-14): ❌ DROPPED — see DECISIONS_LOG `F4.25/F4.28`.** B's purpose was to solve
> the accumulator scaling-VALUE drift problem (the three-place duplication F4.25 targeted). The
> F4.25/F4.28 verification confirmed that drift problem is ALREADY SOLVED — `_tb(spirit, field, fallback)`
> (= tooltipBase) is the single source both `applyEngine` and `NEGATIVE_SNAPSHOT` read. Building the
> cluster abstraction now is complexity with no remaining problem. **Banked: revisit ONLY if a future
> accumulator spirit proves the `_tb` approach insufficient** (not expected). The canonical pattern is
> documented in `SPIRIT_SET_ITERATION_RULE.md` §"Accumulator-spirit scoring pattern". _(Original
> 2026-06-10 SWEEP STATUS + body preserved below.)_

> **SWEEP STATUS (2026-06-10): OPEN — deliberately late.** No closing record; explicitly gated "do it
> when the transcendence system is otherwise stable." Candidate F (the accumulator negative-iteration
> audit, now RESOLVED) read much of the machinery B would abstract over, so B can now be built against a
> settled correctness baseline — but B itself is unstarted.

**What:** `incrementPerElement` + `aggregateNumericState` + the transcendence snapshot
(`snapshotCat1Linear` etc.) form a cluster used by many engine spirits with different keys
(ship `cardsDiscarded`, lincoln `banks`, napoleon `pushFails`, ants `totalPlayed`, palace
`cardsAdded`, missing_number `totalStacks`, glacier/carbon/fossil tier procs...). Evaluate
whether a cleaner shared "event-counter spirit" abstraction is warranted.

**Scope/risk:** Higher. Touches the transcendence math, which is delicate. This is its own
careful task, NOT a quick cleanup.

**Timing:** Late — do it when the transcendence system is otherwise stable, so the
abstraction is built against settled behavior.

---

## Candidate C — Codebase-wide naming / vocabulary cohesion

> **SWEEP STATUS (2026-06-10): OPEN — deliberately late, gated on F4.24b.** No closing record; banked in
> PHASE4_STATE §4 as the recurrence prophylactic for the wrong-spirit-set bug class. Explicitly
> coordinated with the terminal ARCHITECTURE.md (name the architecture once it has stopped moving).

**What:** (Robert's framing.) Even where two pieces of code stay separate, their NAMES should
reflect when they're operating on the same underlying concept. The motivating example:
`countStackedById` and `incrementPerElement` both ultimately concern *how spirit-stack
multiplicity influences output* — but their names emphasize mechanism and hide the shared
root. Good naming would make the common concept legible while still distinguishing the two
*applications* (instantaneous read vs. accumulated total).

**Another concrete example:**
- `activeSpirits` / `scoringSpirits` / `allSpirits` are named by set-membership, not by the
  REASON to choose each. The real distinction: negatives (transcended) score normally but
  must NOT be re-incremented for live-accumulator events (their value is frozen at
  transcendence via the snapshot machinery). The getter names hide this, which is why the
  correct choice isn't obvious at call sites — and is the root of the recurring
  regular-vs-negative iteration bug class (F2.4 item 10, Osprey/Catcher reset bug).
  A vocabulary pass should name these by intent (e.g. 'scores' vs 'accumulates-live-events').

**Critical constraint:** naming cohesion is a CODEBASE-WIDE property, not a spot fix.
Renaming one pair in isolation creates local consistency that's inconsistent with the next
pair — wasted churn that doesn't generalize, and a new flavor of debt. The vocabulary must be
decided once and applied uniformly.

**Shape of the task:** its own recon→decide-vocabulary→apply exercise:
1. Catalog the *concepts* the codebase traffics in (effect magnitude, accumulated event
   counts, stack multiplicity, lifecycle hooks, intents, etc.) and the *names* currently used
   for each.
2. Surface inconsistencies; propose ONE vocabulary.
3. Apply codebase-wide as a deliberate task, vocabulary fixed up front.

**Timing:** LATE — explicitly gated on structural consolidation being substantially done
(same logic as F4.24b: don't name the architecture until it has stopped moving). **Likely
coordinated with F4.24b** (the prescriptive ARCHITECTURE.md): naming cohesion and the
architecture doc are arguably the same late phase — both describe the stabilized system in
consistent language, one in identifiers and one in prose. The vocabulary the ARCHITECTURE.md
uses should be the vocabulary the code uses.

---

## Candidate D — Hand-capacity / hand-management consolidation

> **SWEEP STATUS (2026-06-10): ✅ RESOLVED — record `D-F4-HANDCAP-TIER3`** (commits `c9e22c2` E1,
> `a6dbca2` E1c, `2ec9cfb` E2). The recon RESHAPED the candidate: the "two competing cap fields" framing
> was REFUTED (one real cap `HandManager.maxSize`; `_handSizeCap` was vestigial, now DELETED), and the
> leak was one bug / eight instances. Shipped `_drawIntoHand` (deck-integrity, hand-identical) across the
> draw-pile sites + a discard-clamped `zodiac_dog` + `sym_osprey` respecting the cap. Inherited N2
> (resolved). Surfaced **Candidate H** (consumable-consumption-consistency). The provisional rule below
> ("DECIDE the ONE cap field") landed: maxSize is the one cap; no cap rises (deals respect the cap).

**Surfaced:** F4.17 step 5 (Horse / catcher / hand-cap deliberation), 2026-06-06.

**The fragmentation.** "How many cards fit in the hand, and what happens when more arrive than
fit" is currently decided independently at every site that grows the hand — with *inconsistent*
rules — and there are TWO competing notions of the cap itself:

- **Two cap fields.** `HandManager.maxSize` (the real limit, set each round at
  `GameRoundManager.startRound` from `HAND_SIZE + bonus`, via the `modifyHandSize` hook) AND a
  separate `_handSizeCap` field on GRM that `sym_osprey` gates on as `this._handSizeCap ?? 99`
  (`GameRoundManager.js` ~1807). These are not the same number and not kept in sync — Osprey's
  soft check (`< _handSizeCap ?? 99`) is effectively "no cap" while `_hand.add` enforces the
  real `maxSize`. One of these is likely vestigial; recon must establish which.
- **Each hand-growth site handles overflow differently.** Catcher gates on
  `_hand.availableSlots > 0`; Osprey gates on `< _handSizeCap ?? 99`; Horse (post-F4.17#5)
  clamps its redraw to `min(handSize, drawPile, availableSlots)`; stamp `fireDraw`
  (`_dispatchStampDiscardEffects`) draws into hand with **no cap check at all** (recon
  `discard_pipeline_recon.md` §8); `HandManager.add` silently clamps as the final backstop.
  Four different pre-checks guarding one underlying invariant, plus a silent clamp — exactly
  the "every system reinvents the same decision" smell.
- **Stale contract.** `HandManager`'s constructor JSDoc claimed `add` "throws a RangeError"
  beyond the cap; it actually silently clamps. (Corrected in F4.17#5, but the divergence is a
  symptom: the capacity contract wasn't legible enough that callers trusted it — so they each
  added their own pre-check instead of relying on `add`.)

**The shape of the consolidation (provisional).** A single, legible hand-capacity contract:
`add` clamps and *reports* what it dropped (or callers ask `availableSlots`/`isFull()` and
trust them), so no site needs a bespoke pre-check. Possibly one canonical "draw N into hand,
leftover stays in deck" helper (the push/bank convention Horse now follows by hand) that
Osprey / stamp-draw / Rat / catcher all route through, instead of each composing draw + add +
its own clamp. Decide the ONE cap field and delete the other.

**Recon-first caveat (same discipline that corrected the hex_51 premise).** Before deciding
the shape, recon must map a possible **RunManager-side** piece: hand size is partly governed by
run-level state (Blessings / `modifyHandSize` / `modifyCardsDealt` hooks, any persistent
hand-size mods), so the "cap" is not purely a HandManager concern. Map every reader and writer
of both `maxSize` and `_handSizeCap`, and every site that adds to the hand, before proposing
the unified contract — the F4.17 lesson was that the planned premise (hex_51 "bypasses") was
stale; assume the same here and verify against current code.

**Timing.** Independent of the discard campaign (F4.17 is closed). Could pair with the
Blessings hand-cap pass (where the stamp-draw-lacking-cap-check observation was filed to be
revisited). Not urgent; no known active bug — the silent clamp makes the current fragmentation
*safe but illegible*. A cleanup-for-clarity candidate, not a bug fix.

---

## Candidate E — Field slot-model / slot-creation pipeline recon

> **SWEEP STATUS (2026-06-10): OPEN — recon not yet run.** No closing record; the deliverable (a
> `FieldManager` slot-model map + a verdict on whether a consolidation exists) has not been produced.
> Independent of the GRM/RunManager destination audit (different file). Still a live recon-first candidate.

**Status:** RECON-FIRST CANDIDATE. The deliverable is a MAP + a verdict on whether a
consolidation even exists — NOT a campaign. Do not scope a campaign from fragments.

**The instinct (Robert, 2026-06-06):** there are several pathways to "slot creation" in the
game — Leaf/Silk (Wood) cards, the Rooster zodiac (9th slot), and others — and it's worth
checking whether these pipelines are separate or share something unifiable.

**The crucial distinction to resolve FIRST (why this needs recon, not a guess):** "slot
creation" appears to mean (at least) two DIFFERENT things, which may share only the word:
1. **Field CAPACITY changes** — how many slots the field has. Rooster
   (`_roosterBonusThisRound`), blessing `plus_field_slot`, Amber's permanent mod, and the
   `modifyFieldSlots` hexagram hook all funnel through `GameRoundManager._recomputeFieldSlots()`
   → `field.setMaxSlots(...)`. This is a *capacity* pipeline.
2. **A WOOD slot coming into existence** — what `engine_moths` `t1Procs` counts. Comes back as
   `handResult.woodSlotCreated` from `FieldManager.playHandCards`, tied to placing a
   Wood-element (Leaf/Silk) card. This is about a slot's *kind/nature* at placement, not field
   capacity.
   (Also nearby: Leaf-spawned field slots — a Phase 3 fix area, `Math.max(maxSlots, slots.length)`
   iteration — which may be a third distinct notion.)

These *sound* unifiable (all say "slot" + "create") but may be mechanically unrelated — capacity
vs. slot-kind vs. spawned-slot. **The recon's job is to determine whether they share underlying
operations or are legitimately separate mechanisms that share a noun** (the same lexical-overlap
trap the discard recon caught with the stale hex_51 "bypasses everything" premise).

**Recon deliverable (a `FieldManager` slot-model map):**
- How does `FieldManager` represent a slot (shape, state, "kind"/element, pending/normal/stranded)?
- Enumerate every distinct "create / modify / change-capacity-of a slot" pathway: Rooster
  capacity bump, blessing/Amber capacity, the `modifyFieldSlots` hook, wood-slot creation at
  placement, Leaf-spawned slots, stranded→normal transitions, etc.
- For each: where does it live, and does it touch shared code or its own path?
- Verdict: is there genuine duplication / smeared ownership (a real consolidation), or are these
  separate concerns that only share vocabulary (→ at most a Candidate-C naming clarification)?

**Placement / sequencing:**
- The slot model lives in `FieldManager` — a DIFFERENT file from the GRM/RunManager audit
  (D-F4-SCOPE), so this is its own small recon, not part of that audit (though it may attach to
  any future FieldManager-area work).
- Let recent churn settle first: Leaf-spawned field slots were a Phase 3 fix area, so the slot
  model may still be moving there.
- Connection: rhymes with the category-reorg / Candidate-C thinking — "slot creation" MIGHT be a
  concept smeared across owners (FieldManager placement + GRM `_recomputeFieldSlots` + capacity
  modifiers + the hexagram hook). But *might be* — the recon decides.
- NOT part of the engine_moths migration (which only counts the wood-slot event that already
  fires; it does not require understanding the slot model). Banked separately so it doesn't
  derail a clean low-risk migration.

---

## Candidate F — Accumulator-engine negative-iteration consistency audit

> **SWEEP STATUS (2026-06-10): ✅ RESOLVED — both halves shipped.** AUDIT half CLOSED: archived
> `docs/archive/phase4/F4.20_candidate_F_audit_findings.md` (CLOSED 2026-06-07) — determination: per the
> locked F2.5 design, negatives are DESIGNED to keep accruing post-transcendence, so `allSpirits` is
> correct and the `activeSpirits`-only Group-2 sites were bugged. [FIX] half SHIPPED under **F4.20-FIX /
> F4.20-FIX2** (the F4.20 block is FULLY CLOSED 2026-06-07; PHASE4_STATE §3 lists "Candidate F audit +
> getter recon" + "F4.20-FIX (neg accumulators)" + "F4.20-FIX2"). Code spot-verified 2026-06-10: every
> flagged Group-2 site now iterates `run.allSpirits` — `engine_ship` (`_fireFieldDiscardHooks`),
> `engine_moths` (`_fireWoodSlotCreatedHooks`), glacier, carbon, fossil, velocity, `sym_badger`,
> `engine_missing_number`, `engine_bullseye`. (The fixes rode F4.20-FIX2 with inline comments rather than
> a single dedicated record; the F4.20-FULLY-CLOSED status is the closing record.)

**Status:** RECON-FIRST + CORRECTNESS audit. Unlike Candidate C (pure naming/vocabulary), this
one has a BEHAVIORAL correctness answer hiding in it — a likely double-/half-counting scoring
bug on transcended (negative) copies. The recon must read the actual negative-accumulator
semantics, not just rename things.

**The trigger (concrete):** all three are accumulator engines, yet they disagree on which
spirit set the live-event INCREMENT iterates:
- `sym_ants` (`totalPlayed`) — increments over **`run.allSpirits`** (INCLUDES negatives).
- `engine_ship` (`cardsDiscarded`) — increments over **`run.activeSpirits`** (EXCLUDES negatives).
- `engine_moths` (`t1Procs`/`t2Procs`) — increments over **`run.activeSpirits`** (EXCLUDES negatives).

They cannot all be right on principle. Either negatives keep accruing live events
post-transcendence (then Ship/Moths are under-counting — a "half-counting" bug) or negatives are
frozen at the transcendence snapshot (then Ants is double-counting against its own snapshot).
Either way the wrong ones produce a real scoring error that only manifests with a TRANSCENDED
copy of that spirit — i.e. late-game, easy to miss.

**The crux question the recon must answer:** what are the intended semantics of a transcended
accumulator's value? Each negative `applyEngine` branch computes roughly
`preTranscendTotal + newEvents × rate × powerLevel`. So:
- If `newEvents` is DESIGNED to keep counting events AFTER transcendence (scaled by powerLevel),
  then incrementing the negative is CORRECT → `allSpirits` (Ants) is right, Ship/Moths are bugged.
- If the negative's value is meant to be FROZEN at snapshot (`preTranscendTotal` only, `newEvents`
  should stay 0), then incrementing the negative double-counts → `activeSpirits` (Ship/Moths) is
  right, Ants is bugged.
- There may be a THIRD category (or more): non-accumulator counters, spirits that legitimately
  freeze, spirits that legitimately keep accruing — the audit should not assume exactly two.

**Scope (expanded per Robert):** audit ALL accumulator-engine spirits — not just these three —
for their activeSpirits-vs-allSpirits increment behavior. Known/likely accumulators to include
(verify against source, don't trust this list): sym_ants, sym_snails, sym_algae, sym_badger,
sym_ducks, engine_ship, engine_moths, engine_lincoln, engine_napoleon, engine_devotion/habitat/
ceremony/agriculture (the onCardSeen rank counters), engine_plenty, engine_radiance/banner
(per-round array resets), decay_persimmon/pear, engine_palace, engine_missing_number,
engine_northern_lion (pushesWitnessed), plus anything `incrementPerElement` touches. For each:
record (a) the increment site(s) and which spirit-set they iterate, (b) whether it goes through
`incrementPerElement` (which routes negatives to `newEvents`) or a bespoke increment, (c) what its
negative `applyEngine` branch does with `preTranscendTotal`/`newEvents`.

**Deliverable:**
1. A table: every accumulator engine × {increment iteration set, increment mechanism, negative
   applyEngine treatment}.
2. A determination: are there correct REASONS for the differences (→ document them and add a
   naming/comment fix so the intent is legible — Candidate C overlap), or is one category simply
   implemented incorrectly (→ a deliberate [FIX] campaign making them consistent), or are there
   MORE than two categories (→ name and define each)?
3. If a [FIX] is warranted: per-spirit, which way each wrong one moves, with a test asserting the
   transcended-copy scoring is now correct.

**Relationship to existing candidates / history:**
- This is the SAME bug class as: the Negative Osprey/Catcher counter-reset bug (DECISIONS_LOG),
  F2.4 item 10 ("broader regular-vs-negative iteration asymmetry audit"), the ship-hook `!isNegative`
  guard added in F4.17, and F1.8.b followup #3 (which already distinguished accumulator vs
  non-accumulator increment sites and switched some to broader iteration). Candidate F is the
  systematic version of that recurring whack-a-mole.
- Overlaps **Candidate B** (accumulator-cluster abstraction — the transcendence-snapshot /
  `incrementPerElement` / `aggregateNumericState` machinery is exactly what must be read to answer
  the crux question) and **Candidate C** (the activeSpirits/scoringSpirits/allSpirits getters are
  named by membership, not intent — the legibility fix rides here). Consider doing F as the
  correctness-recon that B's abstraction is then built on top of.

**Sequencing:** do the AUDIT (read-only, produces the table + determination) at a Tier-2 lull —
it's read-only and low-risk and would de-risk every future accumulator migration. Defer any
[FIX] campaign until the audit's determination is in hand. Do NOT fix anything reactively during
the in-flight migrations — preserve existing behavior (as the Moths/Ants migrations correctly
did) and let this audit decide the corrections deliberately.

**Note:** F4.20 migrations to date PRESERVED each spirit's existing iteration exactly (Ants
allSpirits, Ship/Moths activeSpirits) — correctly, since preservation is the migration rule and
the correct semantics weren't yet determined. So no migration "introduced" this; they faithfully
carried forward a pre-existing inconsistency, now flagged for deliberate resolution.

---

## Candidate G — Shrine card-enhancement application flow

> **SWEEP STATUS (2026-06-10): ◐ PARTIALLY RESOLVED.** The **architectural half SHIPPED** — records
> `D-G` (G1 deleted the 962-line dead shrine application cluster + Four Practices; G2 built the random-8
> shrine application surface, superseding F4.2.a's no-application premise) + `D-F4-CONSUMABLES-TIER2`
> (the block umbrella). The **UX-completion half remains, banked to Phase 5** (random-8 TUNING: subset
> size, gating, family eligibility, cost-scaling — the SHAPE is shipped, the tuning is calibration). The
> new shrine pickers are also flagged for F4.35 (picker unification). NOT closed.

**Surfaced:** Consumable-block A1 (stamp migration), 2026-06-07 — observing that the shrine
can apply *some* card enhancements (stamp selector, element booster path, chakra overlays) but
through a patchwork of bespoke per-family handlers, not one coherent application surface.
**Sharpened by the chakra sub-recon** (2026-06-07) — see the two evidence points below.

**Two-half framing (Robert).** The architectural half (dispatch/wiring unification) is Phase 4 /
this block; the UX-completion half is Phase 5. Filing the whole thing as Phase 5 would lose the
architectural half to the exact "surfaced reactively, never audited as a category" gap that
D-F4-SCOPE exists to close.

**The fragmentation.** "Apply a card-enhancement at the shrine" is currently implemented once
per family, each with its own overlay, its own target-picker, and its own post-apply bookkeeping:
- **Stamp** — `ShrineScene._showStampCardSelector` (now routes its *effect* through
  `ConsumableEffects` after A1, but the overlay/picker is still bespoke).
- **Wu Xing element** — the booster-pack / element apply path (`run.applyElement` at the shop,
  with the stripped-element refund + `addConsumable` dance inline in the scene).
- **Chakra** — per-chakra overlays (`_showRootOverlay … _showCrownOverlay`, dispatched by
  `_showChakraOverlay`) + `RunManager.applyChakra*` (the chakra sub-recon's Option-A migration
  target).
Each reinvents: build overlay → pick card(s) → call apply → handle cancel → `_buildUI()`.
Same shape, N implementations — the shrine-side analogue of the GameScene three-path
fragmentation F4.15 targets.

**Chakra-sub-recon evidence (two sharpenings):**
1. **A picker primitive already PARTIALLY exists, and the seven chakra overlays are
   near-identical.** Every one funnels through the same shared `_buildPracticeGrid({ title,
   instruction, cards, selectedIds, onSelect, onAction, onCancel })`, and each defines the same
   `refund = () => { run.addKi(def.cost); destroy _confirmObjs; _buildUI() }` plus the same
   `render()` wrapper — differing only in target-count cap (1/2/3), label text, and which
   `applyChakra*` it calls. Same shape, seven copies. So the consolidation is *collapsing
   duplicated scaffolding around an existing grid builder*, not building a picker from scratch.
   That lowers the architectural-half risk and is positive evidence the abstraction is natural
   (the grid is the seam; the per-family wrappers are the duplication).
2. **The cancel/economy model is NOT uniform across families — the unified surface must
   parameterize it, not assume one.** Chakras charge ki at *purchase* (overlay titled "X ki
   paid") and **refund on cancel** via `run.addKi(def.cost)`. Stamps (post-A1) charge ki at
   *apply* via `spendKiForConsumable` and do **not** refund (nothing was pre-charged). So the
   draft's "one canonical refund-on-cancel path" is too strong: the surface needs a per-family
   economy/cancel policy (charge-at-purchase+refund vs. charge-at-apply+no-refund), or the ki
   timing must be normalized first. Flag this as a design sub-decision for the architectural half.

**Related dispatch fragility (from the recon).** Activation dispatch currently leans on id-prefix
string matching (`element_` / `stamp_` / `chakra_`) rather than a uniform `category` /
`dispatchKind` field, even though the data already carries `category`. The unified surface should
normalize on the field, not the prefix (F4.15 owns this normalization).

**The two separable halves (do NOT conflate):**
1. **Architectural — dispatch/wiring unification (Phase 4, F4.15 / this block).** Once every
   family's effect body is a `ConsumableEffects.get(id).execute()` entry (A1 did stamp; A2 chakra
   + A3 element follow), the shrine's application paths can collapse onto one dispatch the
   same way GameScene's three paths do. Belongs in Phase 4 — "consolidate parallel activation
   paths," ShrineScene side. **The stamp path is the first family already routed through the
   unified effect dispatch** (A1), so it's the reference shape.
2. **UX completion (Phase 5).** A polished, complete, consistent shrine application *experience*
   for every family on top of the unified dispatch — filling any genuinely-unimplemented family
   UX and making overlay/picker presentation coherent. Content/polish, correctly Phase 5.

**Shape of the consolidation (provisional).** One shrine application surface: a single overlay +
target-picker (extending the existing `_buildPracticeGrid` seam) parameterized by the
consumable's target arity (`card`, `card_multi` up-to-N, `source+target` pairs for Crown) and by
its economy/cancel policy (point 2 above), dispatching to `ConsumableEffects.get(id).execute()`
with one canonical post-apply `_buildUI()` path — instead of `_showStampCardSelector` / element
path / per-chakra overlays each composing it by hand. (Mirrors how A1's `_applyStamp` is one
handler registered for all stamp ids.)

**Scope/risk.** Architectural half: medium — depends on A2 (chakra) + A3 (element) landing first
(they supply the `execute()` entries the unified dispatch calls), on the picker abstraction
handling the varying target arities, AND on resolving the per-family economy/cancel policy
(point 2). The Crown two-stage source→target pick is the one overlay whose interaction differs
structurally — the abstraction must accommodate it or leave it bespoke. UX half: separate,
Phase 5, lower architectural risk.

**Timing.** Architectural half rides *after* the chakra + element campaigns within this block (it
consumes their output) and dovetails with F4.15's GameScene-side dispatch collapse — same
unification, both scenes. UX half deferred to Phase 5. Do NOT attempt the picker abstraction
before the per-family `execute()` entries exist (would be abstracting over paths still moving).

**Cross-references.**
- F4.15 (GameScene activation-path unification — the sibling architectural task; same dispatch
  collapse, GameScene side; also owns the id-prefix → `category`-field dispatch normalization).
- Consumable-block A1 + chakra sub-recon (`consumable_inventory_pass1.md` §8; stamp = first
  family routed; chakra overlays + `_buildPracticeGrid` seam + the ki-timing difference are the
  sharpening evidence; this candidate surfaced here).
- D-F4-SCOPE (the "audit categories deliberately, don't let them surface only reactively"
  principle this entry honors by capturing the architectural half rather than punting it all to P5).
- Candidate C (the unified surface's parameters — arity, economy policy — are intent-named
  concepts; rides the late vocabulary pass).
- Banked headline in PHASE4_STATE §4.

---

## Candidate H — Consumable-consumption / use-blocking consistency

> **SWEEP STATUS (2026-06-10): NEW — OPEN.** Surfaced by Candidate D's E1b (`zodiac_dog`). Recon-first.

**Status:** RECON-FIRST CANDIDATE (map + policy ruling before any campaign). Phase TBD by its recon —
likely Tier-3 (a fragmentation/consistency cleanup, same family as D) but has a player-facing semantics
ruling inside it.

**The settled invariant (NOT in question).** used ⟺ spent ⟺ Badger increments — ONE event, never decided
separately (Robert's ruling, 2026-06-10; recorded in `D-F4-HANDCAP-TIER3`). `GRM.useConsumable` already
encodes it (Badger increments iff `result.success !== false`). The question is not *whether* Badger
should track separately (it shouldn't).

**The open question.** *Under what circumstances does a consumable NOT get used, and are they all
deliberate?* Three buckets the recon must populate and the policy must name:
- **(a) can't act at all** — no valid target, hand full, empty pile → the clean "not consumed, not
  counted" case.
- **(b) partial effect** — draw-2 draws 1 on a near-empty deck; Monkey captures but the hand can't
  absorb the full discard → consumed or not?
- **(c) deliberate cost** — Tiger's forced push, Amber's −1 field slot → consumed; the cost is the point,
  NOT a blocked case.
The policy must distinguish blocked vs partial vs has-a-cost.

**The concrete motivating finding (the smoking gun).** The two consumption paths are INCONSISTENT today.
In GameScene's card-target handler, the `element_` branch calls `run.consumeById(id)` **unconditionally**
— it consumes even on `result.action === 'no_effect'` — while the `stamp_` branch only consumes
`if (result.success)`. So a no-op element WASTES the item but a no-op stamp does not. Meanwhile the zodiac
path (`GRM.useConsumable`) gates both consumption (caller-side, on success) and Badger on
`success !== false`. Three families, (at least) two different consume-on-blocked policies — exactly the
"every site reinvents the decision" smell. *(Recon should re-verify these branch behaviors against current
source before scoping — they are the starting evidence, not a settled map.)*

**Recon deliverable.** For every consumable, across BOTH consumption paths (`GRM.useConsumable` +
GameScene `consumeById`), a table of {blocked/no-op/partial behavior → consumed? → Badger counted?}, then
a determination: which are deliberate, which are accidental waste, which are inconsistent. Then Robert
rules the policy and a [FIX] makes them uniform.

**Provisional Dog ruling (record it).** E1b's `zodiac_dog`-at-full-hand `success: false` (block-and-retain
— not consumed, Badger doesn't count) is **PROVISIONAL pending Candidate H** — kept because it's strictly
better for the player and consistent with Dog's own empty-pile path, but NOT to be enshrined as the
standard before the standard exists. Revisit under H.

**Cross-references.**
- `D-F4-HANDCAP-TIER3` (where it surfaced; the Badger invariant; the provisional Dog ruling).
- `D-F4-CONSUMABLES-TIER2` + `consumable_inventory_pass1.md` (the consumable dispatch map / the
  `useConsumable` badger note / F4.15 dispatch unification — H is adjacent to that path).
- `sym_badger` (the counter whose firing IS the consumed-signal).

---

## Candidate I — Legendary / Spirit structural decoupling

> **SWEEP STATUS (2026-06-11): NEW — BANKED. Recon Phase-4-runnable (informs F4.24b); campaign Phase 5,
> sequenced with Candidate C.** Two-half framing (like Candidate G).

**The thesis.** Legendaries emerged out of the spirit system, and the *conceptual* distinction is
already settled and documented (`SPIRIT_SET_ITERATION_RULE.md` §2: separate category — own slot/array,
no transcend, not chain members, foundation-influencing rather than chain participants). But the *code*
still expresses legendaries as a sub-variety of spirit at several coupling points, so a change to one
category can silently reach the other. This candidate asks: **can the two be decoupled structurally so
the code reflects the already-decided distinction, and a change to spirit-set semantics can't reach
legendary handling by accident (and vice versa)?** It does NOT reopen the conceptual question (settled).

**Motivating evidence (concrete, recent):**
1. **Union getters blur the boundary.** `activeSpirits` = `spirits + legendaries`; `scoringSpirits` =
   `spirits + negatives + legendaries` (RunManager getters). Consumers of "things that score" pull both
   categories through one accessor — spirit-set changes implicitly touch legendary handling.
2. **`alch_pearl` crosses the boundary at creation.** A spirit-fusion-family consumable calls
   `run.addLegendarySpirit(capstoneDef)` (`ConsumableEffects.js:~448`) — legendary creation reached from
   the spirit/consumable path. This is exactly the entanglement that refuted the obs #14 caching
   premise (the capstone set isn't round-invariant because a consumable can forge one mid-round; see
   `D-F4-SCOPE` obs #14 won't-fix).
3. **Inline capstone special-casing in the scoring loop.** `_addCapture` branches on
   `capstone_yinyang/universe/nature` by id, inline (`GRM:~1422-1424` + downstream yin-yang / universe /
   nature loops), because capstone *scoring behavior* isn't encapsulated in a legendary-category surface
   the way spirit effects live in `SpiritEffects`. Legendaries have empty `SpiritEffects` stubs; their
   real behavior is scattered (foundation influence + inline scoring branches).

**Recon deliverable (read-only first — Phase-4-runnable, informs F4.24b's category narrative):**
- Map every site that unions or branches across the spirit/legendary boundary: the union getters and
  their consumers; inline `capstone_`/legendary-id branches; `addLegendarySpirit` / `canAddLegendary` /
  `_legendarySpirits` touch-points; legendary-slot vs spirit-slot capacity logic.
- Locate where legendary *behavior* lives today and assess whether it could be encapsulated into a
  legendary-category surface (a "legendary effects" registry analogous to `SpiritEffects`), or whether
  legendaries are too heterogeneous (5 in roster; capstones + others) for one surface.
- Verdict: is there a clean structural decoupling, or are the categories intertwined at the data model
  such that full separation costs more than the coupling it removes? (The recon decides — don't assume.)

**Sequencing — coordinate with Candidate C (same getter surface).** Candidate C *renames* the union
getters by intent; this candidate may *split* some of them. They overlap on the exact getter surface
and must be sequenced together so they don't fight: **C is the vocabulary pass; I is the structural
pass.** Likely order: I-recon first (decide what splits), then C names survivors — or run as one
combined getter-surface pass. The campaign cannot safely execute until the structure stops moving (the
same gating that holds B and C): the destination audit (D-F4-SCOPE) is *still reshaping* the
`scoringSpirits`/capstone surfaces, so the [FIX] is Phase 5.

**Scope guards / non-goals:**
- Does NOT reopen the conceptual distinction (`SPIRIT_SET_ITERATION_RULE.md` §2 — settled; legendaries
  are not chain members).
- NOT the capstone timing/mechanics question (alch_pearl mid-round forging rules as-is per obs #14
  won't-fix) — this is about where legendary *code* lives, not what the behavior is.
- Legendary balance is separate Phase-5 balance work.

**Cross-references:** `SPIRIT_SET_ITERATION_RULE.md` §2 (the settled separation this honors
structurally); Candidate C (getter-surface vocabulary pass — sequence together); `D-F4-SCOPE` obs #14
won't-fix (the alch_pearl entanglement that motivated this); F4.24b ARCHITECTURE.md (the legendary/
spirit boundary is part of the category narrative — the recon informs it even though the campaign is P5);
PHASE4_STATE §4 (banked headline pointing here).

---

## Cross-references
- D-F4.18b (iterative-reorganization principle: reorg interleaves with design; name late)
- F4.24b (prescriptive ARCHITECTURE.md, deliberately late — coordinate with Candidate C)
- F4.20 (spirit-logic migration; Candidate A is in this family)
- `docs/archive/phase4/discard_pipeline_recon.md` Section 8 (adjacent smells: duplicated
  `game_catcher` state-init; per-copy catcher state; stamp draw lacking hand-cap check)
- D-F4.17 / `docs/archive/phase4/F4.17_campaign_ledger.md` (where Candidate D surfaced — the
  Horse/catcher/hand-cap deliberation and the stale `HandManager` capacity-contract JSDoc)
- F4.20 engine_moths migration (where Candidate E surfaced — the t1Procs wood-slot-creation
  counter; the slot-model recon was banked so it didn't derail that low-risk migration)
- F4.20 Ants/Moths/Ship migrations + F4.17 ship-hook `!isNegative` guard (where Candidate F
  surfaced — the allSpirits-vs-activeSpirits accumulator-increment inconsistency); F2.4 item 10;
  Negative Osprey/Catcher reset bug (DECISIONS_LOG); overlaps Candidates B and C
- Consumable-block A1 + chakra sub-recon (where Candidate G surfaced — shrine application-flow
  unification; architectural half = F4.15/this block, UX half = Phase 5)

## Banked: Waidan Grove-exit coupling in `_drawContinueButton` (from G1-fix, 2026-06-09)

> **SWEEP STATUS (2026-06-10): OPEN — decision pending Waidan's fate.** No closing record; left AS-IS
> (G1-fix restored it byte-for-byte). Resolves only when Waidan is cut (→ delete the block) or kept
> (→ extract to an `onShrineExit` hook).

`legend_waidan`'s Grove-exit effect (spawn a negative consumable per Waidan stack on shrine exit)
is inlined inside ShrineScene `_drawContinueButton` — documented F4.20 Bucket-B seepage (no
`onShrineExit` spirit hook exists, so the scene-transition event was deliberately left inline; see
`F4.16_F4.20_triage_ledger.md`). Robert flagged the coupling: a general-purpose continue button
shouldn't embed one spirit's effect, AND Waidan may be cut.
- **If Waidan is cut →** this is the removal site (delete the `if (this._isGrove)` Waidan block).
- **If Waidan stays →** consider extracting to a named helper (e.g. an `onShrineExit` hook) so the
  continue button stays general.
- **Decision pending Waidan's fate.** Left AS-IS for now (G1-fix restored it byte-for-byte; not
  decoupled).
