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

## Candidate F — Accumulator-engine negative-iteration consistency audit

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
1. **A picker primitive already PARTIALLY exists.** All seven chakra overlays funnel through one
   shared `_buildPracticeGrid({ title, instruction, cards, selectedIds, onSelect, onAction,
   onCancel })`. So the consolidation is *replacing N bespoke wrappers around an existing grid
   builder* with one parameterized surface — not building a picker from scratch. That lowers the
   architectural-half risk and is positive evidence the abstraction is natural (the grid is the
   seam; the per-family wrappers are the duplication).
2. **The cancel/economy model is NOT uniform across families — the unified surface must
   parameterize it, not assume one.** Chakras charge ki at *purchase* (overlay titled "X ki
   paid") and **refund on cancel** via `run.addKi(def.cost)`. Stamps (post-A1) charge ki at
   *apply* via `spendKiForConsumable` and do **not** refund (nothing was pre-charged). So the
   draft's "one canonical refund-on-cancel path" is too strong: the surface needs a per-family
   economy/cancel policy (charge-at-purchase+refund vs. charge-at-apply+no-refund), or the ki
   timing must be normalized first. Flag this as a design sub-decision for the architectural half.

**The two separable halves (do NOT conflate):**
1. **Architectural — dispatch/wiring unification (Phase 4, F4.15 / this block).** Once every
   family's effect body is a `ConsumableEffects.get(id).execute()` entry (A1 did stamp; chakra +
   element campaigns follow), the shrine's application paths can collapse onto one dispatch the
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

**Scope/risk.** Architectural half: medium — depends on chakra + element campaigns landing first
(they supply the `execute()` entries the unified dispatch calls), on the picker abstraction
handling the varying target arities, AND on resolving the per-family economy/cancel policy
(point 2). UX half: separate, Phase 5, lower architectural risk.

**Timing.** Architectural half rides *after* the chakra + element campaigns within this block (it
consumes their output) and dovetails with F4.15's GameScene-side dispatch collapse — same
unification, both scenes. UX half deferred to Phase 5. Do NOT attempt the picker abstraction
before the per-family `execute()` entries exist (would be abstracting over paths still moving).

**Cross-references.**
- F4.15 (GameScene activation-path unification — the sibling architectural task; same dispatch
  collapse, GameScene side).
- Consumable-block A1 + chakra sub-recon (`consumable_inventory_pass1.md` §8; stamp = first
  family routed; chakra overlays + `_buildPracticeGrid` seam + the ki-timing difference are the
  sharpening evidence; this candidate surfaced here).
- D-F4-SCOPE (the "audit categories deliberately, don't let them surface only reactively"
  principle this entry honors by capturing the architectural half rather than punting it all to P5).
- Candidate C (the unified surface's parameters — arity, economy policy — are intent-named
  concepts; rides the late vocabulary pass).
- Banked headline in PHASE4_STATE §4.

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
