# Codebase-Merits Audit — Hanatu

*Independent evaluation of the codebase's structural quality. Read against ARCHITECTURE.md,
ENGINEERING_RULES.md, and CODEBASE_CLEANUP.md so as not to re-report known items; judged on its own
terms, not against the design spec. Read-only; recommendations are proposals. Where a claim rests
on a file, it's cited; line numbers are approximate where the synced snapshot didn't show them.*

---

## 0. Honest summary

**One-line read: the engine core is in genuinely good shape — better than most solo-dev codebases
I could name — and the quality falls off a cliff at the scene boundary.**

The Phase-4 consolidation demonstrably worked where it was aimed. The three effect registries
(Spirit/Hexagram/Consumable) with hook dispatch, the single scoring pipeline, the `_tb`
single-source discipline, the validated phase machine, and a test harness with characterization
nets and documented gotchas are all real, verified-in-the-source strengths. The accepted-
architecture record and anti-pattern list mean the odd-looking things are mostly *deliberate*
odd-looking things.

**The five findings that matter most:**

1. **The quality distribution is bimodal, and `GameScene.js` is where the debt now lives.** The
   systems layer got four phases of care; the scene layer got one shared-leaf-module pass and a
   ratified "document-and-contain." The result: duplicated presentation tables (the enhancement
   name/description maps exist in at least three places), engine constants re-implemented in the
   UI (a hardcoded `PUSH_DEALS = [4, 2, 1]` table in the scene beside the engine's real deal
   curve), a private-method reach-through (`this._round._getCaptureThresholds()`), and UI-mode
   state managed as flag soup next to an engine that has a validated state machine. The exact
   drift classes Phase 4 eliminated from the engine are alive in the scenes.

2. **Card identity is structurally unstable, and three systems silently depend on it.**
   `card.id` is simultaneously *identity* (deck tracking, spent-card sets) and *species* (style
   combos test `ids.has('march_curtain')`; the symbiont map is keyed by animal card id) — but
   `promoteCard` rewrites `id` in place, Throat duplication mints `_throat_N` ids, and
   `transcendCard` wipes and reassigns everything. A duplicated or promoted card silently falls
   out of combo/symbiont detection. This is my best candidate for "the problem in the place
   nobody was looking."

3. **The engine's spirit dispatch never achieved what its hexagram dispatch did.** Hexagrams:
   zero engine name-checks, verified. Spirits: a dozen-plus inline `spirit.id === '…'` blocks
   in GRM/RunManager. The root cause is a hook-vocabulary gap, and each missing hook invites
   the next inline block.

4. **`_scorePipeline` is the load-bearing mega-method, and roughly a third of it is telemetry.**
   The dedup that produced it was right; its internal shape will now tax every Phase-5 scoring
   change (F5.8, editions, capstones).

5. **The project's signature move — documenting traps instead of removing them — is about to
   change sign.** Right for a convergent Phase 4; increasingly expensive for a generative Phase 5
   where every session re-pays the reading cost of each documented trap (`onBank`×2, three
   spirit getters, two push counters, `tooltipBase`, `ribbonStamp`, `transcend`×2).

None of this is rot. It is a codebase whose center of mass is healthy, with well-mapped debt at
known coordinates — the honest criticism is that the map now needs to become motion in three
specific places (scenes, spirit hooks, pipeline shape) before Phase 5 builds on top of them.

---

## 1. Lenses, and what I actually read

Lenses chosen for *this* codebase: (a) **did the consolidation hold, and where does it stop** —
the project's own thesis deserves to be tested at its edges, not its center; (b) **extensibility
against the named Phase-5 work** (Earth/economy redesign, editions rework, run-structure
features) — the concrete future, not abstract flexibility; (c) **single-source honesty** —
whether the SSOT discipline is real or has hidden duplication; (d) **identity and state-shape
integrity** — because a mutation-heavy vanilla-JS object model with in-place rewrites is where
silent bugs breed; (e) **whether the tests guard the fragile things**.

**Coverage.** Read deeply: `GameRoundManager` (the scoring pipeline, turn flow, discard/capture
paths, round-end), `RunManager` (roster/transcendence, accumulator model, card-mutation methods,
economy), `HexagramEffects` (full dispatch model + registry samples), `SpiritEffects` (factory
helpers, meta-spirit machinery, accumulator entries), `FieldManager`, `StyleEngine`,
`CardMutations`, `ScoringEngine`, `ConsumableEffects` (header + zodiac/element handlers),
`GameScene` (render paths, tooltip, target-mode, bank/push overlay, turn async flow),
`ShrineScene` (card-picker), `spiritTooltip`, the data files, `test/helpers.js` plus ~8 test
files, and all four reference docs. Read lightly or not at all: `HandManager`/`DeckManager`/
`CaptureManager` internals, `GameplayLogger` internals, `RNGHook`, `HexagramGenerator`,
`SpiritLayout`, the menu/divination/collection scenes, `main.js`. Findings about unread modules
are flagged as inference.

---

## 2. Strengths to protect (specific, verified)

**S1. The registry-and-hook architecture is real and it held.** All three content families
resolve through data-keyed registries with a small dispatch surface: `SpiritEffects.get(id)`,
`getActiveEffect()`/`applyHook()` (the *only two* hexagram entry points), and
`ConsumableEffects` with its `inputType` discriminator closing the target-mode dispatch into one
switch. The hexagram recon's "zero `hex.effect ===` name-checks in the engine" claim is
consistent with everything I read. This is the property that makes 64 hexagrams and 110 spirits
*cheap* — protect it above everything else, and note that it is also what makes the act-boss
question tractable (§6, Q1).

**S2. Single-source discipline where drift used to live.** `_tb`/`tooltipBase` feeding both
`applyEngine` and `NEGATIVE_SNAPSHOT`; `getWaterMult` as the sole Snow/Ice source (the dead
duplicate in ScoringEngine was found and killed, F4.34); `couponDiscountPct`/
`piggybankHandKiMult` shared by formula and tooltip; `isSilk` shared by FieldManager and GRM
"so the two never drift" — the comment says the intent and the code does it. Architecture-B
tooltips *deriving* their value token from the live `applyEngine` is the strongest version of
this idea in the codebase.

**S3. The phase machine guardrail.** `_setPhase` validating against `PHASE_TRANSITIONS` and
throwing on illegal transitions is a ~20-line investment that converts a whole class of
control-flow bugs from "silent weird state" into "loud stack trace," and it came with regression
tests. This is exactly the kind of cheap machine-enforcement the rest of the codebase could use
more of (see W5).

**S4. The test culture is genuinely unusual for a solo project.** Characterization tests that
pin golden totals *before* a refactor (`scoring_breakdown_dedup.test.js` pinning 188 × 17.5 ×
1.0 = 3290 across both scoring paths); the tooltip value-equality harness (93 cases) asserting
display == computation; negative-path tests everywhere (`isNegative` variants in ants/reward/
transcend-placement); and — rarest of all — `TEST_HARNESS_GOTCHAS.md` documenting the harness's
sharp edges with the token-cost of each rediscovery. The suite tests what's *fragile* (stack
scaling, transcend placement, phase transitions, threading), not what's easy.

**S5. The decision infrastructure is architecture.** The accepted-architecture record means an
auditor (me) can distinguish "odd and deliberate" from "odd and accidental" in minutes — the
import-cycle containment comment at the top of RunManager, with its "if ever cut, sever the
light edge" instruction, is a model of how to accept debt legibly. I evaluated the two accepted
cycles (RM↔SpiritEffects, RM↔HexagramEffects) on the merits: the rulings are sound. Both resolve
at call-time, the irreducible edge is genuinely `applyHook` needing `run.getHexagram()`, and
breaking them buys nothing but churn. Accept-and-contain was the right call *for these two*.

**S6. The discard, hand-draw, and round-end paths are properly single.** `_discardCards` as the
canonical discard pipeline (Catcher as a gate, Recycling/Ship as reactions), `_drawIntoHand`
fixing one bug at eight sites, `_endRound`/`_buildRoundEndResult` as one teardown. The "collapse
parallel paths" thesis was executed, not just declared.

---

## 3. Findings (ordered by impact × likelihood of biting)

### W1. The scene layer is the unconsolidated half of the codebase

`GameScene.js` (and to a lesser degree `ShrineScene.js`) exhibits, today, every drift class the
systems layer eliminated:

- **Duplicated presentation tables.** The enhancement name map (`ENH_NAMES` — Snow/Ice, Leaf/
  Silk…) is defined at least three times: `_makeEnhancementBadge`, `_showCardTooltip`
  (`ENH_NAMES_TT` + `ENH_DESC_TT`), and `_onCardTargetSelected`, with `EDITION_DESC` similarly
  local. When the editions rework or F5.8 changes what Clay *does*, someone must find N scene
  copies of what Clay *says* — precisely the tooltip-drift problem F4.37 solved for spirits,
  unsolved for cards.
- **Engine constants re-implemented in the UI.** The bank/push overlay hardcodes
  `PUSH_DEALS = [4, 2, 1]` locally while the engine owns the real deal curve
  (`_getNextPushDealCount`); the overlay also recomputes interest-preview math inline
  (`run.interestRate * mult`). If the deal curve or interest formula is tuned in Phase 6, the
  overlay silently lies. These should be one exported source (an engine "preview" accessor),
  same pattern as `couponDiscountPct`.
- **Boundary violation.** `_showYakuGuide` calls `this._round._getCaptureThresholds()` — a
  private GRM method invoked from the scene. The information is legitimately needed for display;
  the access path says the public seam is missing. One-line fix (promote to a public getter),
  but it's a tell: the scene↔engine contract is informal.
- **UI-mode state as flag soup.** `_yakuGuideOpen`, `_captureOverlayOpen`, `_discardOverlayOpen`,
  `_deckOverlayOpen`, `_bankPushOpen`, `_cardTargetMode`, `_fireWildCard`, `_animating`,
  `_scoringAnimating` — mutually exclusive modes coordinated by each opener manually closing the
  others. This is the same problem `_setPhase` solved in the engine, unsolved in the scene; every
  new overlay must remember every existing one. A tiny scene-mode enum (one field, one
  `_enterMode()` that closes the previous) would delete the whole class.
- **Manual object lifecycle.** The `_xxxObjs.push(...)` / `_clearObjs` pattern repeated per
  region works, but every render function is 60% positioning arithmetic against magic pixel
  constants. This is tolerable *until* Phase 7's UI-polish list (which is long) — at which point
  a small builder helper (`panel()`, `button()`, `textAt()`) pays for itself in a week.

**Why this is finding #1:** the scene layer is where Phase 5's feature work *surfaces* (shop
revamp, blessing UI, style-combo display, hand-size label — all ROADMAP items), and it's the one
layer with zero test coverage (acknowledged: "no render-layer test net"). New features will be
built on the weakest substrate with no net. **Proposal:** before the shop revamp (Cand. G),
run a scene-layer mini-Phase-4 — one campaign extracting the shared presentation tables to
`scenes/shared/` (join `spiritTooltip`'s neighborhood), one exposing engine preview values
through public getters, one introducing the scene-mode enum. Tradeoff: it's exactly the churn
Phase 4 deferred; the counter-argument is that Cand. G will otherwise *add* to the pile.
Confidence: high on the specifics (all cited from source), medium on the cost estimate.

### W2. Card identity is unstable and three systems consume it as if it weren't

`card.id` serves two roles the code never separates:

- **Identity** — deck membership, `_spentCardIds`, Crown-copy tracking ("only the destination's
  deck-slot id is preserved"), Throat's `_throat_N` minting.
- **Species** — `StyleEngine`'s combos test literal base ids (`ids.has('march_curtain')`,
  `ids.has('january_ribbon')`); `ANIMAL_SYMBIONT_MAP` keys on the animal's base id; base-card
  lookups by id.

The mutation paths then rewrite ids under three different schemes: `promoteCard` **mutates
`card.id` in place** to the target type's id (`RunManager.promoteCard`); `duplicateCardToDeck`
appends `_throat_N`; `transcendCard` deletes every key and assigns the target's. Concrete
consequences, all silent: a Throat-duplicated Sake Cup (`september_sake_throat_1`) can never
complete Hanami-zake; a Crown-copied Boar can never satisfy Inoshikacho or summon its symbiont;
a promoted card's prior identity vanishes from anything that recorded the old id mid-round. Some
of these may be *acceptable* rulings (a copy isn't the real Curtain — defensible!), but nothing
in code or docs says they were *chosen*, and the three schemes guarantee the answer is
inconsistent across paths. The retired F4.22 ("dup card IDs") gestured at this; the general
problem is broader than duplication.

**Proposal:** introduce a species accessor — `baseCardId(card)` or a `card.speciesId` set once —
and route StyleEngine + the symbiont map through it; then *decide* (design ruling) whether
copies/promotions carry species. Small change, closes a whole bug class, and it must precede any
style-combo expansion (the design audit's biggest ask) because every new combo multiplies the
exposure. Confidence: high — the id-testing sites and the in-place rewrite are both verbatim in
source; the *player-visible* frequency of the bug is inference (needs a duplicated-combo-card
playtest).

### W3. Spirit logic still lands inline in the engine — the hook vocabulary has gaps

The hexagram system's discipline is absolute (anti-pattern 1: "no name-checks — exception:
none"). The spirit system's is not: GRM and RunManager contain inline `spirit.id === '…'` blocks
for `sym_ducks` (strand decrement in `_doDeckPhase`), `sym_osprey` (flip-to-hand),
`engine_golden_toad` (per-capture counter reset in `_scorePipeline`), `engine_velocity`
(meteorite-jackpot increments inside the *held-in-hand* loop), `sym_caterpillar` and
`util_symbiosis` (the Region-K blocks in `_applyCaptureCardEffects`), `sym_algae` (the
pre-summon snapshot dance), `engine_palace` and `sym_badger` (RunManager's deck-mutation
methods), plus `capstone_time` name-checked in `getEffectiveFlowDecay`. Each is individually
documented and several are ratified — but collectively they are the pattern the architecture
forbids for hexagrams, tolerated for spirits.

The root cause is diagnosable: **the spirit hook menu is missing events.** There is no
`onDeckFlipResolved` (hence Ducks/Osprey inline — already a banked 5B item), no `onCardAddedToDeck`
(hence Palace inline in three RunManager methods), no first-class "capture-reaction" phase
(hence Region K as a hand-rolled block — F5.0's whole subject). Every missing hook is a standing
invitation for the *next* reactive spirit to be implemented inline. The F5.0 analysis already
showed the Wildlife/Plenty move is a net simplification that *removes* a documented exception —
that's the template. **Proposal:** treat the F5.0 consolidation as the start of a "close the
hook menu" pass: add the two or three missing events, migrate the inline blocks, and then
promote the hexagram rule to cover spirits ("no spirit name-checks in GRM/RM outside the
dispatch loops"). Tradeoff: hook proliferation has its own cost; the counter is that these
events are *already firing* — they're just firing as inline code. Confidence: high on the
inventory; the "each gap invites the next block" claim is extrapolation from the visible history
(it's how Ducks/Osprey got there).

### W4. `_scorePipeline` — the right consolidation, now the wrong shape

The single-dispatch rule (anti-pattern 4) is correct and the X1 dedup helpers
(`_applyHexCardScored`, `_computeCaptureScore`, `_heldCardContribution`,
`_applyCardEnhancements`, `_engineBreakdownEntry`) show real extraction discipline. But the
remaining body is a several-hundred-line method whose regions are comment-labeled (capstone
flags → held loop → per-card loop → retriggers → stack hooks → engine loop → finalize), with
three concerns interleaved line-by-line: the arithmetic, the telemetry (`_bd` breakdown objects,
`contributions` arrays, `_onScoringStep` animation events — by eye a third of the lines), and
per-spirit special cases (Golden Toad reset, Velocity increments). Every Phase-5 scoring change
(F5.8 Earth populating the held seam, the editions rework, capstone changes under Cand. I) edits
*inside* this body while visually parsing past the telemetry.

**Proposal (modest, not a rewrite):** extract the held-in-hand phase and the per-card phase into
private methods with explicit `{points, mult}` in/out — the characterization tests
(`scoring_breakdown_dedup`) exist precisely to make this safe, which deserves saying: **the
project already built the net for this refactor.** Separately, consider a small emitter object
(`trace.card(...)`, `trace.engine(...)`) so the math lines stop carrying their own logging.
Tradeoff: any extraction risks disturbing the F2/F4 timing contracts (onStackCaptured-before-
Phase-2 etc.) — do it *after* the F5.0 semantic ruling settles those, not before. Confidence:
high on the shape description; the maintenance-cost claim is inference, but it's the inference
the pinning tests were written in anticipation of.

### W5. Documented traps vs. removed traps — the ratio should now invert

A recurring pattern, each instance individually reasonable: two different `onBank`s (hexagram
hook vs `RunManager.onBank`) with a "do not consolidate the two" warning; three spirit getters
whose misuse caused the F4.20-FIX/FIX2 bug family (six sites) and whose correct use lives in a
reference doc; two push counters (`_pushCount`/`_pushDepth`) documented as "two real axes";
`tooltipBase` (scoring source named for its former consumer); `ribbonStamp` (applies to any
card); and now `transcendCard` — which shares the word "transcend" with the *completely
unrelated* spirit-transcendence system while actually implementing Crown-Chakra identity copy.
Every one is on a list somewhere; my point is the aggregate: **the codebase's invariants live
disproportionately in prose**, and prose discipline is exactly what degrades across the many
fresh sessions this two-surface workflow implies. The getter rule is the sharpest case — nothing
*mechanical* prevents the next wrong-set iteration bug; the fix history proves the doc alone
didn't.

**Proposal:** a single Phase-5-early "trap-removal" campaign bundling the already-planned renames
(`ribbonStamp`→`stamp`, `tooltipBase`→scoring-values, Cand. C) with three cheap additions: rename
the hexagram hook to `onBankHex` (deletes the collision instead of documenting it), rename
`transcendCard`→`copyCardIdentity`, and give the spirit getters intent-bearing names
(`chainSpirits`/`scoringSpirits`/`slotSpirits`) so the wrong choice *reads* wrong. Tradeoff:
renames churn tests and the `[PRESERVE]` assertions — which is why bundling into the
already-scheduled rename pass is the move, rather than N separate touches. Confidence: high.

### W6. `spiritTooltip.js` is the last big hand-maintained parallel structure

Architecture B fixed the *values* (derived from `applyEngine`), but the narration is still a
~110-branch `else if (id === '…')` chain that must be extended for every spirit, has known
unreachable branches (econ_lucky_charm/reward inside `if (fx?.applyEngine)`) and a known
double-render for the five out-of-block engines. This is the id-keyed parallel registry the
effect system abolished, surviving in the display layer. **Proposal:** move narration into the
registry — an optional `tooltip(spirit)` per effect entry (or a `tooltipTemplate` on the def),
with the chain as fallback during migration. It collocates a spirit's three facets (def, effect,
narration) and deletes the "remember to add a branch" failure mode for all future spirits.
Tradeoff: a wide mechanical migration; do it opportunistically (new/changed spirits first)
rather than big-bang. Confidence: high on structure; the two defect notes are from the project's
own flags, verified plausible in the source I read.

### W7. RunManager: an accepted god-object with one unpriced bill coming due

At ~1,600+ lines the `run` singleton owns economy, roster, deck, blessings, consumables,
hexagram state, and the card-mutation methods. For a solo vanilla-JS project I won't call the
singleton itself a defect — the containment comments and the destination audit show it's held
deliberately, and the test harness copes (`run.reset()` in `makeRound`). Two real costs, though:
(a) **test coupling** — the entire suite shares one mutable global; a test that forgets
`makeRound`'s reset (or mutates `run` after) contaminates its neighbors, and nothing enforces
the reset (a `beforeEach` in a shared setup file would); (b) **save/load (F5.2) will collide
with the state-shape heterogeneity** — three spirit storage shapes (`elements[]` / `state` /
nothing), in-place card mutations with id rewrites, `_throat_N` counters, and Set-typed fields
mean serialization is a *design* task, not a `JSON.stringify`. The D0.12 decision to delete the
stale `toSnapshot`s was right; the follow-through is that F5.2 should be scheduled *before* the
state shape grows further (F5.10 consumable stacking and F5.11 negative fusion both add shape).
Confidence: high on the shapes; medium on how much F5.2 pain they cause.

### W8. Minor (one paragraph, not re-reporting known items)

Scene error handling swallows engine throws into `console.error` and returns — with the
validated phase machine now *throwing* on illegal transitions, a swallowed throw mid-turn leaves
the UI in a half-rendered state with no player-visible signal; a tiny toast-on-catch would make
the guardrail user-visible. `playRoundToEnd` in the test helpers banks at the first yaku, so the
push branch is only covered by the white-box recipe — fine, but worth knowing the integration
path never pushes. The known dead code and stale strings (CODEBASE_CLEANUP + cleanup_recon Tier
A) are accurately tracked; I found nothing dead that isn't already on the list, which is itself
evidence the tracking works.

---

## 4. The test suite — what it guards and what it doesn't

Guarded well: scoring math at multiple stack counts (the exact gap class the brief mentioned —
`conditional_stacking` and `irrigation` test 1/2/3 stacks explicitly, a learned lesson applied),
negative/transcended paths, chain placement, phase transitions, the tooltip==effect equality
invariant, and refactor safety via golden-value characterization. Guarded thinly: **cross-round
persistence** (accumulators surviving round boundaries, flow decay across rounds, ki trajectory
— most tests are single-round), **the timing contracts** (F2-vs-F4 tally timing is asserted
indirectly at best; F5.0 will change these, and a small "capture N sees state from capture N-1"
pinning test per family would make that change safe), and **the scene layer** (zero coverage,
acknowledged — which is why W1's refactor should come with at least smoke-level tests of the
extracted shared modules, the one scene stratum that *is* testable headless). The heavy
white-box style (tests calling `grm._fireSpiritHook`, seeding `run._deck`) is a documented,
deliberate tradeoff — determinism over encapsulation — and given the harness docs I judge it
correctly chosen, with the standard cost: internal refactors (W4) will break tests
mechanically; budget for it.

---

## 5. The three live questions (separate from, and after, my own findings)

**Q1 — Act-boss feasibility: yes, with contained plumbing, *because* of S1.** Every hexagram
effect reaches the engine through exactly two functions — `getActiveEffect()` and `applyHook()`
(plus the `getX()` wrappers that call `applyHook` internally). The engine never name-checks. So
converting "one active effect" into "a small stack of active effects" is localized to
`HexagramEffects.js`: `applyHook` folds the value through each active effect in order; class-(2)
direct reads need a `fireEach` wrapper at their ~dozen call sites. Call sites for class (1) and
(3) — the large majority — change *zero*. A round-scoped effect is then just an entry pushed at
round start and popped at round end. Caveats: run-start-only hooks (`modifyDeck`, `onRunStart`)
are meaningless for round-scoped effects and should be excluded by convention; effects that
mutate persistent state in `onRunStart` (e.g. `_maxConsumableSlots = 5`) would need an undo
discipline if reused round-scoped — so the boss-eligible subset should be curated, not the full
64. Net: **feasible, moderate work, no architectural violence** — and a direct dividend of the
dispatch discipline.

**Q2 — Style-combo per-round seam: it already exists.** `StyleEngine._triggeredThisRound` resets
every round (`resetRound()` from `startRound`), so combos *re-detect* each round; only the
**flow** payment is once-per-run (gated by `run._triggeredCombos` inside `onStyleCombo`). The
**ki** payment in `GRM._onStyleCombos` already runs for every newly-triggered-this-round combo,
every round, through the spirit `applyKiBonus` chain. A repeatable per-round reward is therefore
a *payload* change at one site (`_onStyleCombos`), not a detection change — structurally cheap.
One wrinkle: detection reads the full capture pile including spent cards? — it reads
`this._capture.getAll()`; whether yaku-spent cards leave the capture pile affects re-completion
semantics and should be pinned by a test before building on the seam (I did not verify the
spent-card/pile interaction; flagged).

**Q3 — Mutation wipe in `transcendCard`: incidental, and trivially separable.** The
implementation (`RunManager.transcendCard`) is "delete every key on source, deep-copy every key
from target" — mutations are wiped because *everything* is wiped; there is no
mutation-specific intent in the code. Coupling to the transcendence machinery: **none** —
despite the name, this function is the Crown-Chakra identity copy and shares nothing with spirit
transcendence (`_buildTranscendedNegative`). Preserving mutations is a three-line carve-out
(save `source.mutations`, reassign after the copy) gated only on the open design ruling. The
name collision is W5's sharpest exhibit — rename it regardless of the ruling.

---

## 6. Prioritized recommendations

1. **Species-vs-identity accessor for cards** (W2) — small, closes a silent bug class, and
   *must precede* any style-combo expansion. Includes the design ruling on whether
   copies/promotions carry species.
2. **Close the spirit hook menu alongside F5.0** (W3) — add `onDeckFlipResolved` +
   `onCardAddedToDeck`, migrate the inline blocks, then adopt the no-name-check rule for
   spirits. F5.0 is already first on the Phase-5 docket; this widens it slightly rather than
   adding a campaign.
3. **Scene-layer mini-consolidation before the shop revamp** (W1) — shared presentation tables,
   public engine-preview getters (kill `PUSH_DEALS` and the private `_getCaptureThresholds`
   reach-through), scene-mode enum. Sequence: before Cand. G, because G otherwise builds on the
   pile.
4. **Bundle the trap-removal renames** (W5) — ride the already-planned `ribbonStamp`/
   `tooltipBase`/Cand-C pass; add `onBankHex`, `copyCardIdentity`, and intent-bearing getter
   names.
5. **Shape `_scorePipeline` after F5.0 settles the timing semantics** (W4) — phase-extraction +
   telemetry emitter, under the existing characterization net; add per-family timing-pinning
   tests first.
6. **Schedule F5.2 (save/load) before F5.10/F5.11 add state shape** (W7) — and add a shared
   `beforeEach` reset to the test setup as a five-minute hardening.
7. **Migrate tooltip narration into the registry opportunistically** (W6).

## 7. Confidence notes

Hard structural facts (verified in source): the duplicated ENH tables, `PUSH_DEALS`, the private
reach-through, the in-place `promoteCard` id rewrite, `transcendCard`'s wipe-all implementation,
the StyleEngine literal-id tests, the inline spirit-id blocks inventory, the two-function
hexagram dispatch funnel, the per-round style detection reset. Inference (stated as such): the
maintenance-cost projections for W1/W4, the player-visible frequency of W2's combo/symbiont
misses, W7's save/load pain magnitude, and anything about the modules listed as unread in §1.

## 8. Where this should live

Proposed: **`docs/investigations/codebase_merits_audit.md`**, beside the design-merits audit and
the F5.0 analyses it cross-references — a point-in-time evaluation feeding Phase-5 sequencing,
archiving to `docs/archive/` once dispositioned. Adopted items route per DOC_MAP: hook additions
and getter renames → ROADMAP entries; the trap renames → merge into the existing
CODEBASE_CLEANUP rename items; rulings → DECISIONS_LOG. Proposed only — not committed.
