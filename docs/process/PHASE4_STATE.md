# PHASE4_STATE.md — Hanatu Phase 4: scope, progress, process, state

> **The single authoritative "where are we in Phase 4" doc.** A fresh conversation reads THIS first.
> It supersedes, as the *live* anchor, the archived `PHASE_4_ENTRY_BRIEF.md`, `PHASE_4_TASK_ORDERING.md`,
> and `UPLOAD_MANIFEST.md` (those are retained as the Phase-4 bootstrap record, not current guidance).
> Update at every category/block boundary (the close-out ritual). Last updated: 2026-06-14.

---

## 1. Orientation

Hanatu = koi-koi/hwatu-inspired roguelike deckbuilder (Phaser.js + Vite, vanilla JS). Solo dev
(Robert). Two-Claude workflow: **design-side Claude** (claude.ai) reasons about architecture and
drafts self-contained prompts; **Claude Code** (terminal) executes with recon-before-edit and
commits/pushes; Robert bridges (pastes prompts, re-syncs the repo into Project knowledge after
pushes, makes design rulings). The repo is the single source of truth; it reaches Project knowledge
through the GitHub sync (do NOT separately upload repo docs).

**Phase 4 thesis (Robert):** "Put things where they belong" (each subsystem owns its concerns;
maximize single-sources-of-truth) + "consolidate parallel paths" (collapse the patchwork of
multiple methods doing one job). Phase 4 is migration/cleanup, NOT redesign and NOT greenfield.
The risk it addresses is invisible debt: nothing's broken, but scattered logic makes Phase 5
(content/polish/tuning) harder than it should be.

---

## 2. The four-tier structure (the map; absorbed from PHASE_4_TASK_ORDERING)

- **Tier 1 — Map-making.** F4.24a architecture inventory (DONE — `F4.24_inventory_pass1.md`,
  a recurring diagnostic), F4.14 design-doc reconciliation. ✅ structurally complete.
- **Tier 2 — Logic centralization (CURRENT TIER).** Move scattered spirit/consumable/hexagram
  logic into its home subsystem. Three category blocks: **spirits ✅ DONE (F4.20)** → **consumables
  (NEXT)** → **hexagrams**. Then the end-of-Tier-2 F4.24a checkpoint (expanded to audit consumable
  + hexagram seepage).
- **Tier 3 — Pipeline consolidation.** Collapse parallel paths into single dispatch. Partly
  pre-shipped: F4.17 (discard pipeline), F4.18b (round-end). Remaining incl. F4.15 (consumable
  activation — now a MEMBER of the consumable block), F4.18 (capture-event), F4.22 (dup card IDs),
  + the GRM/RunManager destination audit (D-F4-SCOPE Part 2, late Tier 3).
- **Tier 4 — UI/polish on the consolidated foundation.** F4.37/F4.36 (tooltip recomb + declarative
  read), Phase-3 deferreds (F3.16 scoring log).
- **Tier 5 — Cleanup (parallelizable).** Dead-code/naming/comment items; do AFTER consolidations
  (they may absorb cleanup targets). Long tail.
- **Terminal: F4.24b** — the prescriptive `docs/ARCHITECTURE.md` (written ONCE, late Phase 4 /
  early Phase 5, against the stabilized end-state). Does NOT exist yet.

Sequencing rules: Tier 1 before all; Tier 2 before Tier 4; Tier 5 later-than-it-seems; category
handoffs at block boundaries (see §6).

---

## 3. Current task stack (where we are / what's next)

```
Tier 2 — logic centralization
├─ F4.20 spirit-logic centralization ............... ✅ FULLY CLOSED (2026-06-07)
│    first wave, F4.20-FIX (neg accumulators), Candidate F audit + getter recon (verdict A),
│    F4.20-FIX2 (5 effect sites), transcend-placement + mirror/memory ctx (site #6),
│    second counter wave (snails + missing_number), Bucket-B/T doc sweep — all shipped.
├─ Consumable-logic centralization ................. ✅ CLOSED (2026-06-09) — see DECISIONS_LOG D-F4-CONSUMABLES-TIER2
│    A1 stamp, A2 chakra (7, Option A), A3 Wu Xing attach (SHARED-STATE), data consolidation
│    (zodiac+stamps→consumables.js), Water-dep SSOT + F4.34, F4.15a/b dispatch collapse,
│    Candidate G1/G2 (shrine random-8 surface), Tier-5 dead-code sweep — all shipped.
│    F4.38 (Wu Xing proc surface) DEFERRED WHOLE to Tier-3 (scoring-loop dedup). See §4.
├─ Hexagram-logic centralization ................... ✅ CLOSED (2026-06-09) — see DECISIONS_LOG D-F4-HEXAGRAMS-TIER2
│    Recon: seepage fully hook-shaped, ZERO manager-resident hex logic. Smaller than feared.
│    B1 header reconciliation (3-dispatch-class model + inventory doc); A1 import-cycle
│    document-and-contain + class-(c) docs + hex_30 drift reconcile. Dual dispatch KEPT (no
│    fireHook); import cycle ACCEPTED. X1 (onCardScored/computeFinalScore/onCaptureComplete
│    scoring-loop dup) HANDED OFF to Tier-3 (subsumes F4.38).
└─ F4.24a end-of-Tier-2 checkpoint ................. ✅ SHIPPED (2026-06-10) — pass-2 snapshot, 0 regressions
     Verdict: Tier-2 thesis held — spirit/consumable/hexagram logic drained to canonical homes;
     backbone −2 files/−527 lines; 8/14 pass-1 observations resolved. Remaining seepage is all
     intentional (Bucket-B/T/N) or known-deferred to Tier-3. Snapshot: docs/archive/phase4/F4.24_inventory_pass2.md

══ TIER 2 COMPLETE (2026-06-10) ══ — all three category drains closed + checkpoint verified.

Tier 3 — pipeline consolidation  ◀── IN PROGRESS
├─ Scoring-loop pass ............................... ✅ CLOSED (2026-06-10) — see DECISIONS_LOG D-F4-SCORING-TIER3
│    D1 dedup (5 helpers; subsumes F4.38 + X1; byte-identical) + D2 F2.10c (hex on scoring
│    retriggers, the one behavior change). Merge-vs-separate HALTED → Phase 5/F5.0. Held-seam
│    shaped for F5.8. N2 hand-cap PROMOTED → Candidate D.
├─ Candidate D — hand-capacity consolidation ....... ✅ CLOSED (2026-06-10) — D-F4-HANDCAP-TIER3
│    _drawIntoHand (one bug/8 sites, deck-integrity, hand-identical) + Osprey respects cap
│    + _handSizeCap deleted. N2 resolved. Surfaced Candidate H (consumable-consumption).
├─ Destination audit (D-F4-SCOPE Part 2) .......... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG D-F4-SCOPE Part 2
│    All 6 recon items + 3 push/bank campaigns shipped: cycle #3 sever (83d9920); obs #14 capstone caching
│    won't-fix (aee4632); obs #13 init-unify (dfc1d6e); reset-dedup (b5c3985); _setPhase guardrail +8 tests
│    (dc5deeb); push/bank Q3 vestigial delete (98db293) + Q2 seam decouple (04bc11e) + Q3 legibility (34c98a8).
│    Displacement sweep clean (0 FIX). cycles #1/#2 accept-and-contain. Recon docs archived. Feeds F4.24b (stays late).
├─ F4.27 ........................................... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG F4.27.
│    A: isElementMature centralization (4 sites, [PRESERVE], 20d0673). C: negative Cat-5 pipeline (22b1347) —
│    C1 snapshot reseed from acquiredRound (dropped dead roundsHeld), C2 negative onRoundEnd increment, C3
│    _freshNegativeState + _addPastLifeCopy null-state fix (dec.5), C4 source-aware _fireCuckooHatch (dec.7),
│    C5 D3 shared fireCat5SaleEffects dispatch. Transcend-continuity gap CLOSED; +9 tests (was 0); 142→151.
└─ Named spirit hand-offs .......................... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG F4.20-handoffs.
     Document-and-contain (no code migration): bullseye + util_symbiosis/sym_algae contained as intentional
     GRM round machinery (over-summon trap + Algae transcend-timing coupling — migration would relocate not
     reduce); sym_ducks co-banked with Osprey (shared deck-flip seam); symbiosis semantics confirmed correct
     (no FIX, verified vs D0.11).

══ TIER 3 COMPLETE (2026-06-11) ══ — pipeline consolidation closed; scoring-loop + hand-capacity + destination
audit + F4.27 shipped; named hand-offs document-and-contained.
```

**Tier-3 close (historical, 2026-06-11):** **TIER 3 COMPLETE**. The LAST Tier-3 item — the **named spirit
hand-offs** — CLOSED **document-and-contain** (record `F4.20-handoffs`): `engine_bullseye` + the
`util_symbiosis`/`sym_algae` summon block are contained as intentional GRM round machinery (the per-copy
over-summon trap + the Algae transcend-timing coupling mean migration would *relocate* entanglement, not
reduce it); `sym_ducks` is co-banked with Osprey (both need the same nonexistent deck-flip-outcome seam);
the symbiosis semantics were re-verified correct vs `D0.11` (no [FIX]). No src/ changes — doc-only.

**The Phase-4 completion sequence is now the 6-step plan in `PHASE4_COMPLETION_PLAN.md`** (set
2026-06-12) — which **supersedes the looser near-term/Tier-4/banked framing** that lived here. The steps,
one line each (detail in the plan doc + the `tier5_reconciliation.md` §"Scope decision"):
1. **Groupings 1+2+3 — near-term hygiene set** (~2h: dead-code cut + comment sweep + two tiny decisions).
   **✅ DONE 2026-06-12** (record `F4-TIER5-STEP1`; commits `3b2263c` comments / `7cf9c0f` deletions;
   build green, suite 151/1 unchanged; gate resolved D0.12-governs; two orphans —
   `run.releaseSpirit`, GRM Snapshot header — folded into the `tier5_reconciliation.md` lost-and-found).
2. **Tier 4 — UI/UX cleanup** (F4.35 scene-unification, F4.37/F4.36 tooltip recomb + declarative read,
   F3.16 scoring log) — opens with Tier-4 *scoping*. **← CURRENT WORK.**
   - **F4.36 ✅ DONE** (declarative `tooltipBase` read — Wave A). **F4.37 ✅ DONE 2026-06-13** (tooltip
     recomb to Architecture B — value derives from the effect; closes Wave B; record DECISIONS_LOG
     `F4.37`, checklist `tooltip_verification_checklist.md`, harness `test/tooltip_value_equality.test.js`
     93 cases green). **F3.16 ✅ DONE** (scoring-log schema). **F4.35 ✅ DONE 2026-06-13** (scene-picker
     dedup: layout + picker-selection-logic SHARED (`SpiritLayout.js` / `spiritTargetPicker.js` + test),
     hex-symbol twin deleted; card-picker shells + strip-tail + fan-out/sell-buttons document-and-contain
     per Robert's ruling — record DECISIONS_LOG `F4.35`). **→ TIER 4 COMPLETE.** Phase-4 close-out tail
     proceeds: Leg 2 = step-3a design-rulings deliberation (grp5 / F4.26 / F4.33a / F4.38a / F4.32) **✅ COMPLETE
     2026-06-14**, then Leg 3 = step-3b refactors (F4.25 / F4.21 / F4.28) **— F4.21 done; F4.25 + F4.28 ruled
     DO-NOW (step 3 below).** See `PHASE4_COMPLETION_PLAN.md`.
3. **Groupings 4/5/6 — their own heavier process**, split into (a) **design-rulings deliberation**
   (grouping 5 + F4.26 / F4.33-Part1 / F4.38(a) / **F4.32**) — **the V6 gate**, run first — and (b)
   **code refactors** (F4.25, F4.21, F4.28) after the rulings. (F4.29 stays optional/banked.)
   - **Grouping 5 ✅ CLOSED 2026-06-13** (Leg-3 roster cuts): its only remaining sub-item was the
     Gankyil keep/cut question. Robert ruled CUT — Gankyil removed + the shop's random-legendary
     offering machinery removed (Option 2; legendaries deferred to a Phase-5 group design pass). Waidan
     also cut in the same leg. Record DECISIONS_LOG `F4-LEG3-ROSTER-CUTS`; commits efdd556 (Waidan) /
     17fc5fe (Gankyil); V5 drift banked as DP-66/67/68 in `DESIGN_DOC_PATCHES.md`.
   - **Leg 2 (step-3a design rulings) ✅ COMPLETE 2026-06-14** — all V6-gating mechanics resolved; doc drift
     banked DP-66..74. Closure records: Grouping 5 ✅ (`F4-LEG3-ROSTER-CUTS`), F4.26 ✅ (Option B, `F4.26`,
     2026-06-12), F4.33-Part1 ✅ (Festival cap **ratified-current** — slot-gate is the cap; explicit cap →
     Phase-5/F5.1; `F4.33-Part1`, DP-74), F4.38a/F4.31 ✅ (Clay/Pottery round-end canonical, redesign → F5.8;
     `F4.31/F4.38a`, DP-72), F4.32 ✅ (Silk hand-play [FIX]; `F4.32`, DP-71). **Surfaced-and-closed this
     session:** Candidate H (`D-F4-LEG3-CANDIDATE-H`, DP-70), Cinnabar single-op (`F4-LEG3-CINNABAR-SINGLEOP`,
     DP-69), negative-fusion (decided, build → F5.11; `Negative-fusion handling`, DP-73). *(F4.33-Part1 was a
     straggler — no closure record existed despite being a listed step-3a gate; the 2026-06-14 closeout sweep
     caught it and Robert ruled ratify-current to close the Leg-2 gate cleanly.)*
   - **Leg 3 (step-3b refactors) ✅ COMPLETE 2026-06-14.** F4.21 ✅ (spirit-ID normalization — the 7-ID
     engine_/util_ rename, `F4.21`). Rulings-driven Leg-3 code ✅ shipped + verified this session
     (Waidan/Gankyil cuts efdd556/17fc5fe, Cinnabar single-op 3727810, Candidate H 02cce5c, Silk hand-play
     6dc06d2). **F4.25 + F4.28 ✅ verified-done** (`F4.25/F4.28`) — NOT rebuilt: the verification (5 checks)
     confirmed the 28 accumulators are ALREADY single-sourced via `_tb` (= tooltipBase, swept there by
     F4.36 — both `applyEngine` and `NEGATIVE_SNAPSHOT` read one source, no drift; `ACCUMULATOR_INIT` is
     pure shape) and stacking-validated (`_scaleEngineOutput` + `tooltip_value_equality.test.js`, 25/28,
     gap noted honestly). F4.25's declarative `formula:{}` sketch NOT built (solved problem); F4.28's
     canonical-pattern DOC written (`SPIRIT_SET_ITERATION_RULE.md` §"Accumulator-spirit scoring pattern").
     NO formula/scaling code change. **Candidate B ❌ DROPPED** (its drift problem is solved by `_tb`).
     **Spin-off → F5.12 ✅ DONE 2026-06-14** (`F5.12`, commit b6723d3): the verification surfaced a real
     cross-spirit stacking inconsistency — the 3 conditionals (horizon/dream/hierarchy) stacked
     `Math.pow(base,stacks)` exponentially vs. linear everywhere else. FIXED to `base × stacks` (hierarchy
     keeps `1.5^ranks × stacks`); singletons unchanged; +10 tests (was test-blind); the 3 conditionals + 3
     rares (dao/tengu/feng_shui) gained tooltipBase/_tb (chi has no literal constant). DP-75. **A second
     violator carved out → F5.13 banked:** Mirror/Memory's `_scaleEngineOutput` `^n` copy-scaling (own
     recon; likely Phase-5). **F4.29 banked** (optional bypass sweep; not a known-broken gap).
   - **Other-open: F4.19 (Monkey/Horse) — ruled DO-NOW 2026-06-14 (Robert), STILL OPEN.** The three
     F2.3-era issues (yaku detection on Monkey-completed yaku, round-end UI transition, Push/Bank surfacing)
     persist; the inline `playDeckPhase` logic was never extracted into a reusable yaku-decision-surfacing
     method (`tier5_reconciliation.md` F4.19; ~1-2h; coupled to deferred F4.18 capture-event — issue #3
     lives there). **The one remaining do-now Leg-3 item.**
4. **Any remaining Phase-4 work** (stragglers steps 1-3 surface or defer).
5. **Phase-4 close-out + Phase-5 restructuring/planning** (split the banked pile into the
   design-resolution / feature-building / demo-prep sub-streams per `POST_AUDIT_DIRECTION.md`).
6. **Design Doc V6 + `ARCHITECTURE.md` (F4.24b)** — written LAST, against settled mechanics (step-3
   rulings folded in) + stabilized code; the gateposts to **Audit 2** (per `POST_AUDIT_DIRECTION.md`).

**The pinned dependency:** the grouping-4/5/6 design rulings (step 3a — they resolve open questions about
*existing* mechanics) must land BEFORE the V6 reconciliation, else V6 documents mechanics whose
definitions are still open. Chain: rulings → `DESIGN_DOC_PATCHES.md` → V6 → ARCHITECTURE.md → Audit 2.
**F4.24b stays late** per the late-write ruling (it's step 6) — substantially un-blocked now (the major
backbone consolidation is done), but written ONCE against the stabilized end-state.

**Note — F4.32 reclassified:** the `tier5_reconciliation.md` "near-moot, confirm-and-document" sizing for
F4.32 (Silk scope) is **stale** — it has open *design* questions + implementation issues, so it moves to
the step-3a design-rulings stream, NOT the step-1 hygiene sweep. (See `PHASE4_COMPLETION_PLAN.md` §"F4.32
correction.")

**Tier 5 is RECONCILED** (2026-06-11): the 22 cleanup items are bucketed in `tier5_reconciliation.md`
(7 ABSORBED / 9 STILL-OPEN / 6 PARTIAL + lost-and-found); Robert's grouping scope-call lives in that
doc's §"Scope decision" and is sequenced by the 6-step plan above.

**Immediate next action (2026-06-14):** **Leg 2 COMPLETE; Leg 3 COMPLETE except F4.19.** F4.25 + F4.28
✅ verified-done (no code — single-source already met via `_tb`; Candidate B dropped; canonical-pattern
doc written; spin-off F5.12 [FIX] ✅ shipped). **The one remaining do-now item is F4.19 (Monkey/Horse).**
Then the **rubric-writing seam:** `D-F4-DOCSYNC` sweep (first step) → V6 (fold in DP-66..75) →
`ARCHITECTURE.md`/F4.24b → Gate 0 / Audit 2. The V6 author should cite `SPIRIT_SET_ITERATION_RULE.md`
§"Accumulator-spirit scoring pattern" for the accumulator architecture. The DP worklist is substantial
(**DP-66..75**, ready to feed V6); the `D-F4-DOCSYNC` sweep is the first rubric-seam step. **Banked
spin-off: F5.13** (Mirror/Memory `^n` copy-scaling audit — carved out of F5.12; own recon, likely Phase-5).

**Carry-forward flags (recorded 2026-06-14 closeout sweep — don't lose at the seam):**
- **In-game render-layer checklist (PENDING).** F4.37 tooltips + F4.35 picker shells + this session's
  behavior changes (Gankyil/Waidan cuts, Silk hand-play auto-capture, Candidate-H consume-policy +
  alchemical-Badger) need an in-game targeted-verification pass — rides **Gate 0**. (Tests cover the engine
  logic; in-game still covers rendering/UX.)
- **util_irrigation residual (DP-66).** The categorized spirit-count is +2 over-counted; the V5 §3586
  footnote blames `util_irrigation` (a "deprecated duplicate to be removed") but it STILL EXISTS at
  `spirits.js:989`. → V6-pass reconciliation item / possible small cleanup (decide its fate during the seam).
- **Badger balance note (Candidate H).** Alchemicals now fire Badger (the fold-in), so alchemical-heavy
  builds reach higher Badger counts — a Phase-5 tuning input that compounds with the Cinnabar single-op
  change. (No code; tuning flag.)

---

## 4. Banked / deferred threads (intact — not lost)

Headlines here; the full banked-thread detail lives in `PHASE4_consolidation_candidates.md`
(partially-live) and the relevant `DECISIONS_LOG.md` entries.
- **Candidate C — rename spirit-set getters by intent** (activeSpirits/scoringSpirits/allSpirits →
  intent names). The recurrence prophylactic for the wrong-spirit-set bug class. Banked; rides after.
- **Mirror/Memory slot-vs-adjacency SEMANTIC refinement** — targeting now includes Negatives
  (shipped); the deeper "do they reference a slot vs positional adjacency" cleanup is a separate task.
- **Velocity exponential magnitude** — Phase-5 balance (D-F4.20-VELOCITY). Whether powerLevel scales
  inside the 1.5^x exponent; both branches currently consistent; change nothing till Phase 5.
- **Osprey + sym_ducks (shared deck-flip seam)** — the Osprey deck-flip-interception → SpiritEffects
  **hook MIGRATION** and the `sym_ducks` ±1 `multValue` migration (GRM ~1903 strand / ~1957 deck-flip-
  match) BOTH need the same nonexistent deck-flip-outcome seam (`onDeckFlipResolved`-style, fired once
  per flip in the resolver). When that seam is built, both ride it — so they're co-banked (ruled
  `F4.20-handoffs`). Deferred. NOTE on Osprey: the hand-cap GATE is now RESOLVED (`D-F4-HANDCAP-TIER3`
  E1c — Osprey respects the cap, `_handSizeCap` deleted); only the in-place→hook migration remains banked
  here. NOTE on ducks: in-place is CORRECT code (F4.20-FIX2 made both sites iterate `allSpirits` so
  transcended copies move) — this is a banked *stylistic* migration, not a deferred bug. The Osprey
  hand-cap-gate and the hook migration are distinct concerns in the same `_doDeckPhase` block — don't
  blur them.
- **bullseye** — `_bullseyeInventory` state machine in GRM; **document-and-contain** (ruled
  `F4.20-handoffs`): a round-scoped cross-rank ledger GRM owns, not a per-spirit counter. Intentional,
  not deferred-migratable.
- **badger** — `onConsumableUsed` belongs to the consumable block, not the spirit wave. Folded there.
- **GRM/RunManager destination audit** (D-F4-SCOPE Part 2) — ✅ **CLOSED 2026-06-11** (record
  `D-F4-SCOPE Part 2`). All 6 recon items + 3 push/bank campaigns shipped; displacement sweep clean;
  GRM/RunManager stabilized (explicit phase machine, deduped reset, decoupled push/bank seam) → F4.24b
  writable for them (F4.24b stays late). Recon docs archived to `docs/archive/phase4/`.
- **Candidate G — shrine card-enhancement application flow** — *architectural half SHIPPED*
  (G1 deleted the dead cluster, G2 built the random-8 shrine application surface; see DECISIONS_LOG
  `D-G`). **Remaining: the UX-completion polish → Phase 5** (random-8 TUNING: subset size, gating,
  family eligibility, cost-scaling — the SHAPE is shipped, the tuning is calibration).
- **Tier-3 scoring-loop pass — ✅ CLOSED 2026-06-10 (`D-F4-SCORING-TIER3`).** D1 dedup + D2 F2.10c.
  **X1 SUBSUMED** (hex twins collapsed into `_applyHexCardScored`/`_computeCaptureScore`/
  `_fireHexOnCaptureComplete`). **F4.38 SUBSUMED** (Wu Xing scoring triad → `_applyCardEnhancements`,
  one home). **N2 PROMOTED → Candidate D** (the hand-cap card-leak is one instance of the broader
  hand-capacity fragmentation; gets its own recon). Held-from-hand seam shaped for F5.8.
- **F4.38(a) — Wu Xing TIMING design-ruling — ✅ RESOLVED 2026-06-14** (record `F4.31/F4.38a`; closed
  jointly with F4.31). The structural dedup (b) shipped in D-F4-SCORING-TIER3; the timing half (Snow dep /
  Ember break / Clay/Pottery firing at round-end) is **ratified round-end-canonical for Phase 4**, with the
  per-capture redesign logged speculative to **F5.8** (Earth) — see DP-72. The balance-adjacent retuning
  rides F5.8/F5.1; the *ruling* is closed. (Was "still banked"; corrected here.)
- **F4.26-B balance follow-ups (Phase-5).** The F4.26 *mechanical* ruling — natural transcendence
  `powerLevel = stackCount` (Option B, lossless / all-4-contribute) — **shipped 2026-06-12** (record
  DECISIONS_LOG `F4.26`; one-line change at `RunManager.js:836`, tests updated 3→4, suite 151/1). The
  accepted *tuning* consequences are banked: (1) **singleton-contribution re-tuning** (4× likely OP vs
  the old 3×); (2) **copy-acquisition caps** (Cat-5 Past Life/Cuckoo now reach power-4 copies; also a
  power-4 Cat-5 negative matures slower — denominator `powerLevel × 3`); (3) **Amber niche rethink**
  (free natural transcendence now dominates Amber's slot-cost full-power). Mechanical done; balance is
  Phase-5. Unblocked Tier-4 Wave B (F3.16/F4.37) + informs T4.2's negative-branch scope.
- **`tooltipBase` rename (Phase-5 semantic).** Wave A (F4.36 — T4.1/T4.2a/T4.2b) made `tooltipBase` the
  canonical source of spirit scoring constants (effect code reads it via `_tb`; tooltip is now one
  consumer, not the purpose) — so the name is a misnomer (scoring depending on a "tooltip" field reads
  wrong). Rename to reflect "canonical scoring/tuning values" (+ the `_tb` accessor + reconsider keys like
  `jackpotMult`, which is actually a `Math.pow` exponent base). Pure semantics, zero behavior. **Sequenced
  AFTER Wave B** (F3.16/F4.37 may reshape the field — rename once, against the settled shape). Feeds Design
  Doc V6 / `DESIGN_DOC_PATCHES.md` DP-65. **✅ NOW UNBLOCKED 2026-06-13** — Wave B is closed (F4.37 done);
  F4.37 added `lossPerRound` reads but did NOT reshape the field, so the shape is settled. Ready for the
  Phase-5 semantic rename.
- **F4.37 carry-forward flags (recorded 2026-06-13; out of F4.37 scope).** Surfaced during C1–C3, deferred:
  - **Double-render (display-dedup).** engine_wuji/dao/chi/tengu/feng_shui have `applyEngine` but aren't in
    the engine-block id-chain, so each hits the block's generic fallback (a bare `×N mult` line) AND its
    narrated legendary line — two lines, same value. Architecture B kept them consistent; the duplicate is a
    pre-existing display-dedup cleanup. (`spiritTooltip.js` engine-block `else` + the legendary block.)
  - **Dead tooltip branches.** econ_lucky_charm / econ_reward branches sit inside `if (fx?.applyEngine)` but
    neither spirit has `applyEngine` → unreachable (their real display would need an unconditional branch,
    like the coupon/piggybank/grace ones C3 added). Harmless; a cleanup item.
  - **Decay balance (Phase-5 tuning).** C3 made decay loss scale per-member (a correct-per-ruling nerf —
    2-stack Pear loses 10/round); the constant MAGNITUDES (pear 5, persimmon 3) may want Phase-5 retuning
    now that they bite per-stack. No code change — a tuning flag (sits with the F4.26-B balance follow-ups).
- **F4.24a-surfaced ratify/cleanup (non-Tier-3, low-priority).** N1 — `engine_northern_lion` is the
  lone surviving `run.activeSpirits` accumulator (`GRM:2069`); one-line ratification that excluding
  transcended copies from `pushesWitnessed` is intended. N3 — `engine_lincoln` desc/behavior mismatch
  (`SpiritEffects.js:1103`; desc "bank without pushing" but increments every bank — D-F4-DOCSYNC-style).
  Obs #4 (`test-run.js:54` dead smoke-test), #5 (RunManager duplicate `typeof window` debug blocks, one
  ungated), #10 (`zodiac_rabbit` "Remove push penalty" sets `_dogProtection` — cosmetic naming).
- **Tier-5 general dead-code pass — 3 routed survivors** from the consumable sweep: the
  `_drawLoadoutSlot`+`_confirmRelease` dead release-confirm chain (ShrineScene), the dead
  `_renderHexagramSymbol` twin (GameScene + ShrineScene), the stale `RunManager.advanceRound:1166`
  JSDoc ("decay Style Base" — code no longer does it).
- **Waidan Grove-exit coupling — ✅ RESOLVED-BY-CUT 2026-06-13** (record DECISIONS_LOG
  `F4-LEG3-ROSTER-CUTS`; commit efdd556). Waidan was CUT entirely (Robert's ruling — negative-consumables
  system is a Phase-5 build that supersedes it), so the inline `_drawContinueButton` effect was deleted
  rather than extracted to a hook. The banked "cut → removal site / stays → extract to a hook" fork
  resolved on the cut branch. (`PHASE4_consolidation_candidates.md`.)
- **F4.35 — scene-rendering unification — ✅ DONE 2026-06-13** (record DECISIONS_LOG `F4.35`; closes
  Tier 4). Picker SELECTION logic shared (`spiritTargetPicker.js` + test) + fan layout shared
  (`SpiritLayout.js`); `_renderHexagramSymbol` dead twin deleted; card-picker shells + strip-tail +
  fan-out/sell-buttons document-and-contain (divergent surfaces — drag/neighbor-lift only in GameScene;
  no render-layer test net). Robert ratified the contain scope.
- **Design-doc reconciliation (D-F4-DOCSYNC)** — reconcile-during-recon for stable areas (incremental);
  full F4.14 sweep deferred to the F4.24b companion slot (late, against stabilized code). Raised
  priority, code-stability trigger.
- **Candidate D — hand-capacity consolidation — ✅ CLOSED 2026-06-10 (`D-F4-HANDCAP-TIER3`).** Shipped
  `_drawIntoHand` (one bug / eight instances — deck-integrity, hand-identical) across the draw-pile leak
  sites + a discard-clamped `zodiac_dog` + `sym_osprey` respecting the cap + deletion of the vestigial
  `_handSizeCap` (`HandManager.maxSize` is the one true cap; NO cap rises — deals respect the cap). N2
  resolved. Glory/negatives test expectations flipped to the [FIX] numbers.
- **Candidate H — consumable-consumption / use-blocking consistency** — NEW, surfaced by Candidate D's
  E1b (`zodiac_dog`). Recon-first (map + policy ruling before any campaign). The settled invariant: used
  ⟺ spent ⟺ Badger increments (one event). The open question: under what circumstances is a consumable
  NOT used, and are they all deliberate (blocked vs partial vs has-a-cost). Motivating finding: the
  `element_` GameScene branch consumes UNCONDITIONALLY (even on `no_effect`) while `stamp_` only consumes
  on `success` — inconsistent consume-on-blocked policy across families. Provisional Dog ruling (full
  hand → `success: false`, block-and-retain) revisited under H. Detail in
  `PHASE4_consolidation_candidates.md`.
- **Candidate I — legendary/spirit structural decoupling** — NEW (2026-06-11), banked. The conceptual
  separation is settled (`SPIRIT_SET_ITERATION_RULE.md` §2); the *code* still couples them (union getters,
  `alch_pearl`→`addLegendarySpirit`, inline capstone scoring branches). **Recon Phase-4-runnable (informs
  F4.24b); campaign Phase 5, sequenced with Candidate C** (same getter surface — C renames, I may split).
  Detail in `PHASE4_consolidation_candidates.md`.
- **Other consolidation candidates A/C/E** (OPEN) **/ B** (❌ DROPPED 2026-06-14 — its drift problem is
  solved by `_tb`; see DECISIONS_LOG `F4.25/F4.28`) **/ F** (✅ RESOLVED — audit archived + [FIX] shipped
  under F4.20-FIX2) **/ G** (◐ architectural half shipped, UX half → Phase 5) — full status sweep in
  `PHASE4_consolidation_candidates.md` (each candidate now carries a SWEEP STATUS line).
- **F5.12 — cross-spirit stacking consistency [FIX] — ✅ DONE 2026-06-14** (`F5.12`, commit b6723d3, DP-75).
  The 3 conditionals (`cond_horizon`/`dream`/`hierarchy`) linearized (`Math.pow(base,stacks)` → `base ×
  stacks`); 3 rares (dao/tengu/feng_shui) gained tooltipBase/_tb ([PRESERVE]); chi has no literal constant.
  Suite 311/1 (+10). Singletons unchanged.
- **F5.13 — Mirror/Memory `^n` copy-scaling audit** (NEW 2026-06-14, banked from F5.12 carve-out).
  `_scaleEngineOutput` applies `multiplyMult^n` by the meta-spirit's own stacks (inconsistent with the
  linear rule) + possible double-dip with the copied target's own stack-scaling. Own recon; behavior-
  changing; likely Phase-5 spirit-correction. OVERHAUL_PLAN F5.13.

---

## 5. Process invariants (absorbed from ENTRY_BRIEF + PHASE_3_LESSONS; non-negotiable)

- **Recon before edit, always.** Read current code before drafting/editing; the audit underlying
  Phase 4 is stale. Prompts CAN be wrong — the recon gate catches stale premises. STOP-and-report
  on premise violation rather than proceeding. (This has caught real errors repeatedly.)
- **Verify silent fixes.** Tasks logged weeks ago may already be resolved; confirm before "fixing."
- **Smallest defensible fix.** One concern per change; don't bundle; don't smuggle a [FIX] into a
  [PRESERVE]. Tag [PRESERVE] (assert behavior unchanged) vs [FIX] (deliberate change) loudly.
- **Don't create parallel paths / don't reinvent hooks.** Use existing primitives; consolidation is
  the whole point.
- **Build + test after every change.** `npx vite build` green + `npm test` green before "done."
- **Doc routing:** new standalone doc → Robert drag-drops + commits; edits to existing files →
  Claude Code. Source of truth = repo, synced into knowledge.
- **Rule vs record (doc placement test):** does upcoming work need to consult it? → durable, lives
  in `process/`. Is it a record of how a task went? → move to `archive/phase4/` at close-out.

**Phase-3 patterns Phase 4 must EXTEND, never replace** (from ENTRY_BRIEF; unilateral replacement is
a design decision for Robert, not Claude): tooltip dispatch via `tooltipBase` + per-spirit
contribution fns (F3.5b); sprite identity via `_tex(card)=baseImageId??id` (F3.15); ki decomposition
via `addKi(amount, reason)` flat+hand+Earth+interest+hookDelta (F3.9); modal overlays fit the play-
area lane, not full-screen (F3.22); field iteration `Math.max(maxSlots, slots.length)` (F3.23);
the spirit-set iteration rule (`SPIRIT_SET_ITERATION_RULE.md`).

---

## 6. Handoff protocol (per-category cadence)

**Cadence: per-category handoffs** (spirits → consumables → hexagrams), NOT per-tier. Rationale:
handoff failures are visible and recoverable in one message; context-degradation failures are silent
and diffuse. Category boundaries are natural clean-state points (nothing in-flight); each category
opens with a read-only recon that doubles as the handoff test. The docs ARE the memory; conversation
context is a cache on top — a fresh conversation reloads from the durable docs, not from memory.

**At each category/block CLOSE-OUT (the ritual):**
1. Update this doc (§3 task stack, §4 banked threads).
2. Move that category's task-scoped ledgers/recon/audits to `docs/archive/phase4/` (+ CLOSED header).
3. Note any now-stale diagnostic; confirm `process/` holds only the live set.

**At PHASE close-out (distinct from the per-block ritual above — different cadence, do NOT fold in):**
before declaring the phase done, sweep `PHASE4_consolidation_candidates.md` for every entry gated to or
banked for the next phase (SWEEP STATUS / phase lines naming Phase 5, "→ Phase 5", "gated on F4.24b"
where that lands in P5, "Phase TBD", or an embedded Phase-5 note). **Collect these into the next phase's
planning doc/entry rather than archiving them as completed.** The candidates doc is a phase-spanning
registry (see its header note); unfinished-by-design entries must be carried forward deliberately, not
silently dropped at the archive step.

**HANDOFF TEMPLATE — paste at the start of a fresh conversation:**
```
I'm Robert, solo dev on Hanatu (koi-koi roguelike deckbuilder, Phaser/Vite). You're the
design/architecture partner; you draft self-contained prompts for Claude Code (terminal executor);
I bridge (paste prompts, re-sync the repo, make design calls). We're mid-Phase-4 (architectural
consolidation: "put things where they belong / consolidate parallel paths").

Read first, in order (the reload):
  1. docs/process/PHASE4_STATE.md  — current task stack, what's next, banked threads, docs manifest,
     process invariants. THE single source of "where we are."
  2. CLAUDE.md                     — conventions, testing, spirit-set rule pointer.
  3. Durable refs as needed: OVERHAUL_PLAN, DECISIONS_LOG (grep, don't bulk-load),
     SPIRIT_SET_ITERATION_RULE, TEST_HARNESS_GOTCHAS.

Current task: [FILL: starting/continuing <block>; its kickoff/recon brief is <doc>; PHASE4_STATE §3
has the live context]. Start with the block's read-only recon — that recon IS the handoff test:
if it produces a sensible map, the reload worked; if it's confused, the reload failed (fix before
any edits).

Non-negotiable process: recon-before-edit; prompts can be wrong (STOP-and-report on premise
violation); [PRESERVE] vs [FIX] discipline; build+test green before done; doc routing per §5.
```
(The only freely-authored part is "Current task" — and it's reconstructable from §3 if omitted.)

---

## 7. Docs manifest (classified by lifecycle — the index)

**`docs/process/` — LIVE set only (durable refs + currently-active + this doc):**
- `OVERHAUL_PLAN.md` — durable (master plan, all task descriptions; grep, don't bulk-load).
- `DECISIONS_LOG.md` — durable (chronological decisions + rationale; grep).
- `DESIGN_DOC_PATCHES.md` — durable (F4.14 reconciliation worklist).
- `INFRASTRUCTURE_DECISIONS.md` — durable (workflow/doc-tiering rules; carries the rule-vs-record convention).
- `PHASE_3_LESSONS.md` — durable (working patterns).
- `TEST_HARNESS_GOTCHAS.md` — durable (Vitest harness conventions).
- `SPIRIT_SET_ITERATION_RULE.md` — durable (the transcendence/spirit-set invariant; a rule, not a record).
- `PHASE4_consolidation_candidates.md` — partially-live (banked threads incl. Candidate C).
- `PHASE4_COMPLETION_PLAN.md` — durable (the 6-step Phase-4 completion sequence + the design-rulings→V6
  dependency; supersedes the §3 next-action framing). Added 2026-06-12.
- `POST_AUDIT_DIRECTION.md` — durable forward-declaration (the Audit-2 closing re-audit + the Phase-5-
  as-post-audit reframe; intent + dependencies + open forks, not a plan). Added 2026-06-11.
- `tier5_reconciliation.md` — LIVE registry (the 22 Tier-5 cleanup items bucketed ABSORBED/OPEN/PARTIAL
  post-Tier-3 + lost-and-found + Robert's scope decision on the 6 groupings; Tier-4/5 planning consults
  it). Added 2026-06-11.
- `PHASE4_STATE.md` — this doc (live state).
- *(The Tier-5 reconciliation registry (`tier5_reconciliation.md`, above) is the one currently-active
  standing doc — the live Tier-4/5 working reference. All earlier task-scoped recons are CLOSED and
  archived below: Tier-2 (F4.24a), the Tier-3 scoring-loop pass, Candidate D (hand-capacity), the
  destination audit (D-F4-SCOPE Part 2), F4.27 (Cat-5 maturation), and the named spirit hand-offs
  (F4.20-handoffs — document-and-contain, closed the LAST Tier-3 item; its recon + close-out stayed in
  chat and the durable record is the DECISIONS_LOG `F4.20-handoffs` entry, so there is nothing to
  archive for it). F4.27 likewise added no standing doc — record is DECISIONS_LOG `F4.27`.)*

**`docs/` root:** `DESIGN_DOC_V5.md` — durable design source of truth.

**`docs/archive/phase4/` — completed Phase-4 records (reference, do not update):**
- `F4.16_F4.20_triage_ledger.md`, `F4.20_candidate_F_audit_findings.md` (CLOSED),
  `F4.24_inventory_pass1.md` (STALE DIAGNOSTIC), `F4.24_inventory_pass2.md` (end-of-Tier-2 checkpoint,
  delta vs pass-1; the durable Tier-2-complete record), `F4.17_campaign_ledger.md`,
  `F4.18b_campaign_ledger.md`, `discard_pipeline_recon.md`, `round_end_pipeline_recon.md`,
  `PHASE_4_ENTRY_BRIEF.md`, `PHASE_4_TASK_ORDERING.md` (live content absorbed here; retained as bootstrap record).
- **Consumable block (CLOSED 2026-06-09; record = DECISIONS_LOG `D-F4-CONSUMABLES-TIER2`):**
  `consumable_inventory_pass1.md` (the §8 campaign-decisions ledger — fully distilled into the entry),
  `consumable_block_kickoff.md` (kickoff brief).
- **Hexagram block (CLOSED 2026-06-09; record = DECISIONS_LOG `D-F4-HEXAGRAMS-TIER2`):**
  `hexagram_inventory_pass1.md` (the §2 reconciliation table + §7 Tier-3 hand-off — distilled into the
  entry), `hexagram_block_kickoff.md` (kickoff brief + opening recon).
- **Scoring-loop pass (CLOSED 2026-06-10; record = DECISIONS_LOG `D-F4-SCORING-TIER3`):**
  `scoring_loop_inventory_pass1.md` (the §2 structural map + §5/§6 scope/seam — distilled into the
  entry; N2 promoted to Candidate D).
- **Candidate D — hand-capacity (CLOSED 2026-06-10; record = DECISIONS_LOG `D-F4-HANDCAP-TIER3`):**
  `hand_capacity_inventory_pass1.md` (the §2 corrected design model + §4 site inventory + §7 helper
  contract — distilled into the entry; surfaced Candidate H).
- **Destination audit (D-F4-SCOPE Part 2) (CLOSED 2026-06-11; record = DECISIONS_LOG `D-F4-SCOPE Part 2`):**
  `destination_audit_recon_pass1.md` (the displacement sweep + cycle classification + intrinsic-org map)
  and `pushbank_recon_pass1.md` (the item-6 push/bank recon — a PRE-RULING snapshot; its Q1–Q4 answered
  in the DECISIONS_LOG entry).

**`docs/archive/` root — pre-Phase-4 history (do not edit):**
- `INFRASTRUCTURE_PLAN.md` (superseded by INFRASTRUCTURE_DECISIONS), `UPLOAD_MANIFEST.md`
  (superseded by this doc), `investigations/` (cleanup-audit, three-marks, yaku).

**Does not exist yet:** `docs/ARCHITECTURE.md` (terminal F4.24b deliverable).
**Removed:** `docs/prompts/` (paste-garble resolved at the tool level), `docs/recon/` (contents → archive/phase4).
