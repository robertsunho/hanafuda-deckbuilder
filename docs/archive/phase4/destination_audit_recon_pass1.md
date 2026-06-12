# GRM/RunManager Destination Audit — Recon (Pass 1)

> **CLOSED 2026-06-11 — D-F4-SCOPE Part 2 complete.** Archived reference; do NOT edit. All 6 recon items
> shipped (cycle #3 sever, obs #14 won't-fix, obs #13 init-unify, reset-dedup, `_setPhase` guardrail,
> push/bank recon). Rulings + commit list in DECISIONS_LOG `D-F4-SCOPE Part 2`.

> Standing reference for the **destination audit (D-F4-SCOPE Part 2)** — the late-Tier-3 GRM/RunManager
> deep dive. Status: LIVE during the audit; archive at close-out. Read-only recon — **maps, does not fix.**
> Companion to: DECISIONS_LOG `D-F4-SCOPE` (charter), `F4.24_inventory_pass2.md` (the end-of-Tier-2
> checkpoint this builds on), `hexagram_inventory_pass1.md` §4 (the cycle-classification template).
> Date: 2026-06-10. Every `file:line` below was re-grepped against current source (pass-1/pass-2 anchors
> were stale — the scoring-loop + hand-capacity passes shifted GRM heavily; confirmed/MOVED notes inline).

---

## Part 0 — Handoff sanity check

The audit sits at the `◀── NEXT` Tier-3 slot (PHASE4_STATE §3), after the scoring-loop pass and
Candidate D both closed. I've read the charter (`D-F4-SCOPE` Parts 1+2: displacement-vs-intrinsic-org
framing, "drain categories first then audit the emptied managers," the named push/bank sub-area, the
F4.24b dovetail), the pass-2 checkpoint (§4 the ~28 documented keeps = the do-NOT-re-flag list; §5
obs #13/#14 = mine), pass-1 (§4 helper tables, §7 GRM census, §6 cycles), and the hex-recon §4 template.
The codebase greps cleanly and matches the docs **modulo expected line-drift** — every anchor moved but
the structures are present. **One contradiction to surface up front, in my favor:** pass-1/§6 lists
cycle #3 as a live transitive cycle through `ScoringEngine → SpiritEffects`; current source shows
ScoringEngine's `SpiritEffects` import is **dead (unused)** — so cycle #3 is trivially severable (Part 2).
Otherwise the reload is clean.

---

## Part 1 — Displacement sweep (confirm, don't re-enumerate)

**Verdict: the ~28 remain-by-design set HOLDS. Zero genuine FIX-candidates.** I walked the pass-2 §4
list against current source (anchors re-grepped; all MOVED but PRESENT). The structural claim — managers
shed category logic to registries, what remains is documented Bucket-B/T/N — still verifies. Representative
re-confirmations (not the full 28; only status-changes would warrant listing):

| Keep | pass anchor | current anchor | verdict |
|---|---|---|---|
| `econ_coupon` shop discount | RM:363 | `getEffectiveCost` RM:358 | confirmed-keep (Bucket-B formula term) |
| `legend_gankyil` autoCaptureThreshold | GRM:403 | GRM:405 | confirmed-keep (field state-machine, Bucket-B) |
| capstone yin-yang/universe/nature | GRM:1350-1352 | GRM:1422-1424 | confirmed-keep (Bucket-T scoring-loop global) — but see obs #14 (Part 3c) |
| `engine_palace` cardsAdded | RM:1408/1608 | RM:1360/1455 | confirmed-keep (Bucket-N, in `incrementPerElement`) |
| `legend_waidan` Grove-exit | ShrineScene:1878 | ShrineScene (Candidates-doc OPEN) | confirmed-keep (Bucket-B; banked sub-thread) |
| wood Leaf/Silk field bypass | FieldManager:185/249/322 | FieldManager (unchanged) | confirmed-keep (Bucket-B) |
| `_initSpiritState` / `ACCUMULATOR_INIT` | RM:510/500 | RM:500 / `_freshAccumulatorElement` RM:583 | confirmed-keep (acquisition machinery) — but see obs #13 (Part 3b) |

**No category drain failed to land** — nothing a DECISIONS_LOG record claims drained is mis-resident.
The two §5 items that are intrinsic-org rather than displacement (obs #13 dual-init, obs #14 capstone
caching) are NOT displacement (the logic legitimately IS RunManager's/GRM's; the question is whether it's
*organized*) — they belong to Part 3, not here. **STOP-condition not triggered** (the charter expects
near-zero FIX-candidates; we have zero — the premise "categories are fully drained" holds).

---

## Part 2 — Import cycles #2 / #3 (classify every edge, propose a ruling)

### Cycle #3 — `ScoringEngine → SpiritEffects → RunManager → …` — **DEAD LEG, trivially severable**

`ScoringEngine.js:32` does `import SpiritEffects from './SpiritEffects.js'` — and **never references
`SpiritEffects` again** (confirmed: `grep -nw SpiritEffects ScoringEngine.js` returns only line 32; the
file is 104 lines; its only live cross-system imports are `getFireFlatPoints` from HexagramEffects and
`getCardPoints` from CardMutations). ScoringEngine is a **leaf** — imported by GRM/CaptureManager/GameScene,
imported by nobody in the cycle.

| Edge | symbol | class |
|---|---|---|
| `ScoringEngine:32 → SpiritEffects` | `SpiritEffects` (default) | **DEAD — imported, never used** |

**Ruling (recommend): breakable, worth it — TRIVIAL.** Deleting the one dead import line severs cycle #3
entirely (ScoringEngine drops out of every cycle; the remaining `RM↔HexEffects` / `RM↔SpiritEffects`
sub-cycles are #1/#2, handled separately). **Blast radius: 1 line, [PRESERVE] byte-identical** (an unused
import has no runtime effect). This is the cleanest win in the audit. (Caveat for the campaign: confirm no
build/tree-shaking relies on the side-effect of importing SpiritEffects into ScoringEngine — there is none;
SpiritEffects has no module-level side effects beyond defining its registry, already imported by GRM.)

### Cycle #2 — `RunManager ↔ SpiritEffects` — **both directions call-time; accept-and-contain**

Two directions, **both consumed at call-time (runtime), not module-eval time** — so, like cycle #1, the ES
circular ref resolves fine; nothing is load-bearing at import.

**Direction A — `RunManager → SpiritEffects` (the LIGHT edge: 2 sites):**

| Site | symbol | class |
|---|---|---|
| RM:618 `_aggregateElementsForNegative` | `NEGATIVE_SNAPSHOT[spirit.id]` | (a) load-bearing *value* (spirit transcendence-snapshot data), used at call-time |
| RM:1372 `_fireCardDestroyedEvent` | `SpiritEffects.get(id)` | (b)/(c) a spirit-hook dispatcher reaching the registry — could live in a dispatcher layer |

**Direction B — `SpiritEffects → RunManager` (the HEAVY edge):**

| Site | symbol | class |
|---|---|---|
| SE:61 (import) | `run` (default singleton) | used **20×** at call-time inside hook bodies |
| SE:61-62 (import) | `effectivePower, aggregateNumericState, aggregateArrayLength, incrementPerElement, addUniqueToElements` | 5 **pure** spirit-math helpers (operate only on `spirit.elements`; **no `run` reference** — verified at their RM defs) |

The 20 `run.` uses split like the hex pattern: some hooks **use the handed param** (`econ_replica.onRoundStart({ spirit, run: r })` → class-(b) ✓), others **reach the singleton** though GRM hands `run` in (`econ_recycling.onFieldDiscard({ spirit })` then `run.addKi(...)` → class-(c)).

**The root-cause question the brief posed — answered:** *Would relocating the pure helpers break cycle #2?*
**No.** Two reasons: (1) `SpiritEffects` still imports the `run` default for its 20 call-time uses, so the
SE→RM edge persists regardless; (2) **RunManager itself calls those same helpers internally** —
`effectivePower` (RM:458), `addUniqueToElements` (RM:550/555), `incrementPerElement` (RM:1360/1405/1455) —
so moving them *into* SpiritEffects would force RunManager to import them **back** (a new RM→SE edge). The
helpers sit in RunManager precisely because **both** modules use them. The only relocation that doesn't
just shuffle the cycle is a **neutral third module** (e.g. `SpiritMath.js`) that both import — and even that
**does not break the cycle** (the `run` default import remains); it only clarifies ownership and shrinks the
named-import surface.

**Ruling (recommend): accept-and-contain (consistent with cycle #1 Ruling 2).** Both directions are
call-time; the cycle is harmless at runtime. If a break is ever wanted, the **light cut is Direction A
(RM→SpiritEffects, 2 sites)** — relocate the `NEGATIVE_SNAPSHOT` lookup and the `_fireCardDestroyedEvent`
dispatch so RunManager stops importing SpiritEffects, leaving SE→RM as a clean one-way edge. Blast radius
for that cut: **2 RunManager call-sites** (plus deciding their new homes — non-trivial design, not a
mechanical move). Cutting Direction B instead is far heavier (~20 `run.` reaches + 5 helper imports ≈ 25
sites, and `run` is genuinely needed at call sites). **Two optional [PRESERVE] tidies, both cosmetic (neither
breaks the cycle):** (i) relocate the 5 pure helpers to a neutral `SpiritMath`-style module — blast radius
~11 import/call sites across RM+SE, clarifies that they're spirit-math not run-economy; (ii) normalize the
class-(c) `run.` singleton reaches to the handed param (hex A1 analogue) — **but the hex precedent declined
the equivalent** (touched ~30 sites for one edge), so recommend the same here unless folded into a broader
pass. Net recommendation: **delete the dead cycle-#3 import now (trivial); accept cycle #2 (document it at
the import line like cycle #1); bank the neutral-helper-module tidy as optional.**

---

## Part 3 — Intrinsic organization (the meat: map, don't fix)

### 3a. GRM structural map

**The `_phase` state machine — IMPLICIT, 4 states, no explicit machine.** States (grep `this._phase =`):
`"idle"`, `"awaiting_deck"`, `"round_over"`, `"yaku_decision"`. Transitions (prose diagram):

```
startRound ─→ idle
idle ──playHandCards──→ (morePlays ? idle : awaiting_deck)          [GRM:650]
awaiting_deck ──playDeckPhase/_doDeckPhase──→ idle                  [resolves the flip]
   …_finalizeTurn, on a new yaku at round-would-end ──→ yaku_decision   [GRM:2183/2190]
   …_finalizeTurn, otherwise ──→ idle                              [GRM:2192]
yaku_decision ──bankScore──→ round_over   | ──pushOn──→ idle | ──continuePlay──→ idle/round_over
any ──_endRound──→ round_over                                      [GRM:1170]
```

It's a **string field mutated inline at ~10 sites** (94, 340, 650, 732, 752, 1170, 2183, 2190, 2192) with
read-guards in `playHandCards`/`playDeckPhase` (throw if wrong phase). No setter, no transition table, no
guard centralization. **Intrinsic-org nit:** the constructor's JSDoc `@type {'idle'|'awaiting_deck'|'round_over'}`
(GRM:93) **omits `'yaku_decision'`** — stale since the push/bank decision state was added. Candidate for a
tiny [PRESERVE] fix (an explicit `_setPhase()` with the full union type + optional transition assert).

**Method grouping — PARTIALLY sectioned (improved by Tier-3, not strict).** 48 methods. Coherent clusters
exist:
- **Hook dispatchers** (GRM:1009-1107): `_fireSpiritHook`, `_fireFieldDiscardHooks`, `_fireCardPlayedHooks`,
  `_fireWoodSlotCreatedHooks`, `_fireSilkAntiStrandHooks`, `_fireStackCapturedHooks` — clean, contiguous.
- **Scoring helpers** (GRM:1308-1381): `_applyCardEnhancements`, `_applyHexCardScored`, `_computeCaptureScore`,
  `_fireHexOnCaptureComplete`, `_heldCardContribution` — the D1 dedup helpers, contiguous and coherent.
- **Round-end cluster** (GRM:1140-1215): `_endRound`, `_buildRoundEndResult`, `_checkRoundEndOnEmptyHand`.
- **Field/discard cluster** (GRM:1231-1285): catcher, `_discardCard(s)`, `_addFlippedCardToField`.

But the **lifecycle methods are not in strict round-loop order** and some helpers sit in the wrong
neighborhood: `_getNextPushDealCount` (888) is far from the push exits (`bankScore`/`pushOn`/`continuePlay`
691-747); `useConsumable` (764) is wedged between the push exits and `_applyPostRoundEnhancements`;
`_peekNextDeckFlip` (545) sits near `startRound` while the deck-flip resolver `_doDeckPhase` is at 1870;
utility (`removeCardFromHand/Field`, `_recomputeFieldSlots`, `_checkNaturalCaptures`) is interleaved among
yaku/round-end helpers. **Two oversized methods** stand out for the "is this coherent" question:
`_addCapture` (1388-1829, **~440 lines** — the scoring/capture loop with the capstone/retrigger/enhancement
machinery) and `_doDeckPhase` (1870-2073, **~200 lines** — the deck-flip resolver with Osprey/Silk/pending
branches). Neither is *wrong*, but both are large enough to be the natural focus of an intrinsic-org review.

**The round-state reset is maintained in TWO places.** The **constructor** (GRM:85-192) declares + richly
JSDocs ~25 round-state fields and first-inits them; **`startRound`** (GRM:340-391) re-initializes most of the
same set per-round as a flat, terse block (grouped by comment: phase/turn/discard → push state → zodiac
one-shots → scoring state). Not a bug (constructor once, startRound per-round) but the field set lives in two
hand-maintained lists — add a field to one and forget the other = latent reset bug. Intrinsic-org candidate:
extract a shared `_resetRoundState()` (or document the split deliberately). [PRESERVE].

### 3b. RunManager structural map

**Obs #13 — the dual spirit-init paths: STILL REAL (NOT silently-resolved).** Both methods exist:
- `_initSpiritState(spirit)` (RM:500-513) — caller: `_acquireSpiritStack` (RM:798), the **regular**
  acquisition path. Accumulator → `elements[]`; else `{game_catcher, decay_persimmon, decay_pear}` state.
- `_initSpiritElements(spirit)` (RM:589-605) — caller: `_buildSymbiontSpirit` (RM:579), the **symbiont**
  construction path. Accumulator → `elements[]` (**byte-identical** accumulator branch); else
  `{sym_caterpillar, sym_crow, sym_ducks, sym_magpie, sym_osprey, game_catcher}` state.

So: the **accumulator branch is duplicated verbatim**; the non-accumulator branches handle **disjoint id
sets** routed by acquisition path; **`game_catcher` is in BOTH** (identical `{catchesUsedThisRound:0}` — the
obs-#13 duplication). A **third** state-construction path exists for negatives: `_aggregateElementsForNegative`
(RM:615, via `NEGATIVE_SNAPSHOT`). Stale-doc nit: RM:498-499 stacks two doc-comments on `_initSpiritState`.
**Verdict: a genuine dual path; obs #13 is a real (small) unification campaign** — merge into one init
handling the full non-accumulator union (each id flows through only one path today; `game_catcher` identical
in both; sym_* are symbiont-only, decay_* non-symbiont, so a merged superset is [PRESERVE]-safe **iff** the
campaign verifies no id needs path-dependent state). Blast radius: **2 callers** (RM:798, RM:579). This
materially differs from the brief's "may already be merged" hypothesis — **it is NOT merged.**

**Spirit-set getters** (RM:432-439) — mapped; named by membership, not intent:
- `spirits` (432) = `!isNegative && stackCount>0`; `negativeSpirits` (433) = `isNegative`;
  `allSpirits` (434) = all; `legendarySpirits` (435); `activeSpirits` (437) = `spirits + legendaries`;
  `scoringSpirits` (439) = `spirits + negatives + legendaries`.
- *(One-line pointer, no proposal: these are named by set-membership not by the reason-to-choose — the
  recurring regular-vs-negative iteration bug class. → **Candidate C**, banked, rides with F4.24b.)*

**Accumulator helper exports** (`aggregateNumericState` RM:79, `incrementPerElement` RM:100,
`addUniqueToElements` RM:135, `aggregateArrayLength`/`aggregateUniqueCount`, `effectivePower` RM:~458-area,
`longestHeldValue`) — module-level, **pure spirit-math**, used by **both** RM and SpiritEffects → this is the
cross-ref to **cycle #2 Part 2** (the optional neutral-module relocation lives here).

**Push/bank surface — SPREAD across GRM + RunManager; warrants its OWN recon.** Map:
- **State fields (GRM):** `_atRiskScore`, `_pushPenaltyActive`, `_pushCount`, `_pushDepth`,
  `_roundEndingAfterDecision`, plus the one-shot **zodiac** flags `_dogProtection` (Dog) and `_tigerPushActive`
  (Tiger) tangled into the same block. Reset in BOTH the constructor (175-178) and `startRound` (351-360).
- **Decision entry (GRM):** the three `yaku_decision` exits `bankScore` (691), `pushOn` (712),
  `continuePlay` (747); `_getNextPushDealCount` (888); consumption in `_finalizeTurn` (2175-2182, where
  `_pushPenaltyActive`/`_dogProtection`/`_tigerPushActive` are read).
- **Flow-economy resolution (RunManager):** `onPushSuccess` (1078), `onPushFailure` (1089), `onBank` (1106),
  `getEffectiveFlowDecay` (1122), `applyFlowDecay` (1128); the curve export `getPushMultiplier` (1521);
  `calculateKiReward` scales by the curve (RM:1234).
- **Verdict:** the *intent* split is sensible (GRM owns the decision state-machine; RunManager owns the
  flow/ki economy), but the surface is genuinely spread (≥7 GRM fields + 3 GRM exits + 3 RM handlers + the
  curve + the two one-shot zodiac flags), and the ownership questions (do `_dogProtection`/`_tigerPushActive`
  belong with push-state or with zodiac-consumable-state? should the curve preview math at GRM:737-738 live
  with the resolver?) are non-trivial. **Per the charter, this needs its own top-to-bottom recon doc before
  any campaign** — do NOT scope a push/bank consolidation from this map's fragments.

### 3c. Obs #14 — capstone-flag caching: REAL (small)

Confirmed (MOVED from pass-1 `:1255` / pass-2 `:1350-1352`): inside `_addCapture`, GRM:1422-1424 recompute
`_yinYangActive` / `_universeActive` / `_natureActive` via `_activeSpirits.some(s => s.id === 'capstone_…')`
**on every capture event**, then drive the yin-yang trigger-doubling / universe mult-mirroring loops
(1528-1644) and the nature carry (`_cumulativePoints`, 1428/1664). The loadout can't change mid-round, so the
three booleans are **invariant across a round** → cacheable once. **`startRound` already has the natural home:
`_cumulativePoints` (the nature companion) is reset at GRM:384** in the scoring-state sub-block — the three
flags would sit alongside it. **Verdict: genuine intrinsic-org [FIX], small, [PRESERVE] byte-identical**
(cache at round start, read the cached fields in the loop). Micro-optimization + legibility, not a behavior
change.

> **[CORRECTION — verified during Campaign 2, 2026-06-11]** The "round-invariant loadout" premise above is
> **REFUTED**. `alch_pearl` (`ConsumableEffects.js:422`, `inputType: 'spirit_pair_tier3'`) forges a capstone
> via `run.addLegendarySpirit(capstoneDef)` (`capstoneDef.capstone === true`, guarded at :440) and is
> dispatchable **mid-round** — `GameScene._dispatchConsumable` → `_showAlchemicalTargetPicker`'s `isPair`
> branch accepts `'spirit_pair_tier3'`, with no round-phase guard. So a reachable state exists: capture with
> no capstone → forge one via Pearl mid-round → later captures in the same round pick it up via the
> per-capture `run.activeSpirits.some(...)` (GRM:1407/1422-1424). The per-capture read is therefore
> **load-bearing**, not redundant — it lets a mid-round Pearl-forged capstone take scoring effect for the
> rest of the round. Caching at `startRound` would be a **silent behavior change**, not a [PRESERVE] tidy.
> **Ruling (Robert): obs #14 WON'T-FIX (Option A) — leave the per-capture read.** Closed won't-fix (NOT
> silently-resolved; the read stays deliberately). See DECISIONS_LOG `D-F4-SCOPE` obs #14.

---

## Part 4 — Verdict

**1. Displacement.** No genuine FIX-candidate. The ~28 Bucket-B/T/N keeps all hold (anchors drifted, set
intact). The "categories fully drained" premise is confirmed — the destination is clean of misplaced
category logic. The remaining items are *intrinsic-org*, not displacement.

**2. Cycles (per-cycle ruling + blast radius).**
- **Cycle #3 → BREAK, trivial.** Delete the dead `SpiritEffects` import in `ScoringEngine.js:32`. **1 line,
  [PRESERVE].** Severs the transitive cycle entirely.
- **Cycle #2 → ACCEPT-AND-CONTAIN** (document at the import line, like cycle #1). Both directions are
  call-time/harmless. Relocating the pure helpers does **not** break it (RM uses them too; only a neutral
  module is clean, and even that leaves the `run` import). If ever broken, cut **Direction A**
  (RM→SpiritEffects, **2 sites**) not Direction B (~25 sites). Optional cosmetic tidies: neutral
  `SpiritMath` module (~11 sites) and class-(c) `run`-reach normalization (~hex-A1-scale, **declined by
  precedent**).

**3. Intrinsic-org — SEVERAL small campaigns, not one pass. Recommended sequence (all [PRESERVE] unless
noted):**
1. **Dead-import delete** (cycle #3) — 1 line, trivial. *(Independent; do first.)* — ✅ DONE (commit `83d9920`).
2. ~~**Obs #14 capstone caching**~~ — **CLOSED, WON'T-FIX (2026-06-11).** Step-0 verification refuted the
   round-invariant premise: `alch_pearl` forges a capstone mid-round, so the per-capture `.some()` is
   load-bearing and caching would be a silent behavior change. Ruling: leave the per-capture read (Option A).
   See the Part 3c correction note + DECISIONS_LOG `D-F4-SCOPE` obs #14. **Next live campaign = item 3.**
3. **Obs #13 init-path unification** — merge `_initSpiritState` + `_initSpiritElements` (2 callers); campaign
   must verify the non-accumulator union is path-safe. Small.
4. **Round-state reset dedup** — reconcile the constructor (85-192) vs `startRound` (340-391) field lists
   (shared `_resetRoundState()` or a documented split). Small; reduces a latent-bug surface.
5. **`_phase` explicit machine + stale JSDoc** — optional `_setPhase()` + fix the `@type` to include
   `yaku_decision`. Tiny.
6. **Push/bank dedicated recon** — its OWN top-to-bottom recon doc (charter-mandated) before any campaign;
   the surface is too spread + the ownership questions too live to scope from fragments here. *(Separate,
   larger; gate any push/bank campaign on it.)*
7. **GRM method re-grouping** (move `_getNextPushDealCount` next to the push exits; relocate `useConsumable`;
   consider sectioning `_addCapture`/`_doDeckPhase`) — cosmetic; lowest priority; **could fold into F4.24b**
   rather than a standalone churn pass.

None of 1-5 carries behavior risk (all [PRESERVE]); 6 is a recon, not a change; 7 is cosmetic. None depends on
the others except: do the push/bank recon (6) before touching push-state fields in (4).

**4. F4.24b readiness.** This map already hands the terminal `ARCHITECTURE.md`: (a) the GRM `_phase`
state-model narrative + transition diagram (3a); (b) the GRM method-section census + the two oversized
methods (3a); (c) the RunManager structural map — getters, the three spirit-state-construction paths, the
helper exports (3b); (d) the cycle dispositions (#1 accepted, #3 dead-delete, #2 accept-and-contain). **Still
missing before F4.24b is writable for these two files:** (i) the **push/bank dedicated recon** (the one
sub-area this audit deliberately did not scope from fragments); (ii) execution (or explicit acceptance) of the
small intrinsic-org campaigns 1-5, so the architecture doc describes a *stabilized* end-state rather than a
mid-cleanup snapshot; (iii) the Candidate C getter-vocabulary decision (banked, coordinates with F4.24b
itself). With those three in hand, F4.24b for GRM/RunManager is writable.
