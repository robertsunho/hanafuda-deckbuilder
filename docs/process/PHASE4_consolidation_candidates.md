# Phase 4 — Consolidation Candidate Tasks (deferred / backlog)

**Created:** 2026-06-06. **Status:** BACKLOG — not scheduled; captured so the reasoning
isn't lost. Surfaced during the F4.17 step-1 discussion (the `countStackedById` vs
`incrementPerElement` counting-mechanism observation).

These are candidate tasks, deliberately NOT folded into any active campaign (avoiding scope
creep). Each is its own task with its own timing and risk. Recorded per the
iterative-reorganization principle (D-F4.18b): notice it, write it down, scope it, don't let
it derail current work.

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

## Cross-references
- D-F4.18b (iterative-reorganization principle: reorg interleaves with design; name late)
- F4.24b (prescriptive ARCHITECTURE.md, deliberately late — coordinate with Candidate C)
- F4.20 (spirit-logic migration; Candidate A is in this family)
- `docs/recon/discard_pipeline_recon.md` Section 8 (adjacent smells: duplicated
  `game_catcher` state-init; per-copy catcher state; stamp draw lacking hand-cap check)
- D-F4.17 / `docs/process/F4.17_campaign_ledger.md` (where Candidate D surfaced — the
  Horse/catcher/hand-cap deliberation and the stale `HandManager` capacity-contract JSDoc)
- F4.20 engine_moths migration (where Candidate E surfaced — the t1Procs wood-slot-creation
  counter; the slot-model recon was banked so it didn't derail that low-risk migration)
