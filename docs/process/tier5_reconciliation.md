# tier5_reconciliation.md — Phase-4 Tier-5 cleanup registry (post-consolidation)

> **LIVE working registry** (process/, not archive — Tier-4/5 planning consults it). Read-only recon
> output, 2026-06-11: the 22 Tier-5 cleanup items walked against current source after Tier 3 closed.
> Tier 5 was always sequenced AFTER Tier-2/3 because consolidations absorb some cleanup items
> (`PHASE_4_TASK_ORDERING.md` §"Don't burn time cleaning up code that's about to move"). This sorts
> each of the 22 into ABSORBED / STILL-OPEN / PARTIAL so none is lost and none is redone.
>
> **Method:** each item verified against ACTUAL source + real closure records (not task-ID grep counts —
> a mention ≠ a closure). ABSORBED claims carry a source-check confirming the target is *gone*. Every
> file:line is current as of this recon; re-confirm before acting (the codebase drifts).

---

## Summary (every one of the 22 placed; counts: A=7, B=9, C=6)

| Bucket | Items |
|---|---|
| **A — ABSORBED / RESOLVED** | F4.2.a, F4.2.b, F4.6, F4.8, F4.9, F4.27, F4.30 |
| **B — STILL-OPEN** | ~~F4.1~~, ~~F4.4~~, ~~F4.5~~ (✅ DONE — step 1), F4.19, F4.21, F4.25, F4.26, F4.32, F4.35 |
| **C — PARTIAL** | ~~F4.7~~, ~~F4.10~~ (✅ DONE — step 1), F4.28, F4.29, F4.31, F4.33 |

Headline: **~⅓ absorbed by the consolidations** (the dead-code/duplication items the sequencing
predicted would collapse), ~⅓ genuinely open small cleanups, ~⅓ partials where a consolidation took
one half and a design-ruling or residual remains. Two STILL-OPEN items are **not cleanup at all**
(F4.26 needs-a-ruling; F4.21 is a 4-7h system refactor gated before save-game) — flagged so they aren't
mistaken for quick wins.

---

## Bucket A — ABSORBED / RESOLVED (with evidence)

### F4.2.a — ShrineScene dead method removal → **ABSORBED** (D-G, commit `f93c4cc`, 2026-06-09)
Target: four orphaned in-shop apply methods (`_showChakraOverlay`, `_showStampCardSelector` ShrineScene
variant, `_activateAlchemical` ShrineScene variant, `_showPracticeOverlay`) left dead after F2.3.i routed
consumables through inventory. **Source-check:** all four grep to ZERO matches in `ShrineScene.js`
(`_activateAlchemical` survives only as the GameScene version). G1 deleted ~884 lines incl. these +
4 doubly-orphaned RunManager Four-Practices methods; G2 then built the *new* random-8 shrine pickers
(`_showShrineCardPicker`/`_showShrineSpiritPicker`) — those are F4.35's concern, not a restoration of the
dead methods. Target confirmed gone.

### F4.2.b — GRM field rename + dead-infra removal → **ABSORBED** (commits `34c98a8` + `98db293`, D-F4-SCOPE)
Two sub-tasks: (a) rename `_dogProtection`; (b) delete `_pigDoubleKi` (5 reads, 0 assignments — obsolete
Pig infra). **Source-check:** `_dogProtection` → ZERO matches; renamed to **`_pushPenaltyWaived`**
(GRM:150/263/1103/2129 + ConsumableEffects:89) — note the chosen name differs from the plan's proposed
`_pushPenaltyNullified`, semantically equivalent. `_pigDoubleKi` → ZERO matches across src/ (deleted in
`98db293` alongside `_atRiskScore`/`_roundEndingAfterDecision`). Both targets gone. *(Residual: the
`zodiac_rabbit` description still says "Remove push penalty" — cosmetic, tracked as obs #10 in
lost-and-found.)*

### F4.6 — Speculative card data finalization → **ABSORBED** (D0.11; verified `cards.js:843`)
Target: decide whether speculative cards stay in data (D0.11 ruled: keep, gated behind a flag, until art
ships). **Source-check:** 13 cards retain `speculative: true`; `cards.js:843 export const baseCards =
cards.filter(c => !c.speculative)` is the gate; `RunManager:324` seeds the deck from `baseCards` only.
The "finalization" *was* the flag-and-filter approach — shipped. No deletion intended.

### F4.8 — GameplayLogger console.log flooding → **ABSORBED** (verified `GameplayLogger.js:31-34`)
Target: gate console output behind a flag. **Source-check:** `_log()` does `if (!this._enabled) return`
before `console.log`; `enable()`/`disable()` provided. Flag is named `_enabled` (plan proposed
`_consoleEcho`) — functionally identical: no console output unless explicitly enabled. Resolved.

### F4.9 — Three discount-stacking patterns consolidation → **ABSORBED** (F1.2; verified `RunManager.js:355-366`)
Target: verify the three discount paths converged (this was already F1.2). **Source-check:** single
`getEffectiveCost(baseCost)` SSOT — dev-mode → `applyHook('modifyShopPrice')` (hex ±25% variants in
HexagramEffects) → `econ_coupon` 15%/stack (cap 45%). All three patterns route through one ordered path;
no divergent discount-stacking implementations remain.

### F4.27 — Cat-5 maturation (Past Life & Cuckoo Egg) → **ABSORBED / CLOSED this session** (record `F4.27`)
Campaigns A (`20d0673`, [PRESERVE] `isElementMature` centralization, 4 sites) + C (`22b1347`, [FIX]
negative Cat-5 maturation pipeline, +9 tests). Confirmed CLOSED in DECISIONS_LOG `F4.27` + PHASE4_STATE
§3. Not re-litigated here.

### F4.30 — Gankyil auto-capture threshold → **ABSORBED (mechanical)** (verified `GameRoundManager.js:361`)
Target B-6: the 3-stack auto-capture threshold reduction "doesn't fire." **Source-check:** it DOES fire —
`GRM:361 this._field.autoCaptureThreshold = run.activeSpirits.some(s => s.id === 'legend_gankyil') ? 3 :
4`, set at round start, with an explicit F4.20 Bucket-B note (GRM:358-360) ruling it intentional in-place
field machinery (not seepage). The wiring half is resolved/contained. **Caveat:** no closure-record entry
exists, and the item's second half ("spirit reconsideration" — should Gankyil exist / be redesigned) is a
**design question, not cleanup** — if Robert wants that revisit, it's a Phase-5 design item, not a
Tier-5 chore. The *code* concern is absorbed.

---

## Bucket B — STILL-OPEN (with current location + size)

### F4.1 — Dead method removal → **RESOLVED 2026-06-12** (F4-TIER5-STEP1, commit `7cf9c0f`)
> Cut: the 5 dead loggers + `undoLastCapture` + `fullReset` (D0.12 gate ruled cut). Re-grepped
> zero-caller at edit time; live `removeCardFromHand` untouched. _(Original disposition below.)_
Genuinely-dead, zero-caller methods still present: `GameplayLogger.logCardEnhanced` (:365),
`logCardEditionApplied` (:373), `logCardTranscended` (:385), `logShopOfferings` (:355),
`printToConsole` (:529); `CaptureManager.undoLastCapture` (:202); `DeckManager.fullReset` (:144). No
closure record, no `TODO(FX.Y)` rewire markers. Standalone. **Decision needed:** delete vs. retain as
save/load (D0.12) infrastructure — confirm no future-feature intent before cutting.

### F4.4 — Unused export → **RESOLVED 2026-06-12** (F4-TIER5-STEP1, commit `7cf9c0f`)
> Cut `cardsByTag` (zero importers; ruling: remove — a future tag-affinity feature defines its own).
> _(Original disposition below.)_
`cards.js:896 export const cardsByTag` — zero importers across src/ (grep `import.*cardsByTag` empty).
JSDoc hints a "future hexagram tag-affinity feature" but no task depends on it. Decision: remove or mark
intent.

### F4.5 — Accumulator removal → **RESOLVED 2026-06-12** (F4-TIER5-STEP1, commit `7cf9c0f`)
> Cut the `totalScore` getter + `_totalScore` init/accrue (zero readers; distinct from live
> `totalScored`, untouched). `advanceRound` keeps `roundScore` as a documented no-op param.
> _(Original disposition below.)_
`RunManager._totalScore` (init :292, accrue :1236, getter `totalScore` :1101) — getter has ZERO callers.
*(Distinct from per-spirit `totalScored`, which is live — don't conflate.)* Decision: remove vs. keep for
a planned end-of-run summary surface.

### F4.19 — Monkey/Horse known issues → **RESOLVED 2026-06-14** (DECISIONS_LOG `F4.19`, commit 240790e)
> All three issues fixed: extracted `_processCaptureCompletion` from `_finalizeTurn` (deck path
> byte-identical) → Monkey runs yaku detection (#1) + Push/Bank surfaces (#3); GameScene's shared
> `_surfaceCaptureResult` surfaces the consumable `captureResult` → round-over no longer soft-locks (#2).
> #2b (stripped teardown) was already resolved by F4.18b. The F4.18 coupling did NOT block this — the
> coordinator handles surfacing without the capture-event work. → DP-76. _(Original disposition below.)_
zodiac_monkey (`ConsumableEffects.js:161-180`) + zodiac_horse (:121-140) are live, but the three F2.3-era
issues (yaku detection on Monkey-completed yaku, round-end UI transition, Push/Bank surfacing) persist —
the inline `playDeckPhase` logic was never extracted into a reusable yaku-decision-surfacing method.
**Coupled** to the deferred F4.18 capture-event work (issue #3 was explicitly deferred there). Not
absorbed by any Tier-2/3 pass.

### F4.21 — Spirit ID normalization → **RESOLVED** (the 6 demoted rares + northern_lion)
The 6 demoted-rare spirits were renamed off their legacy `legend_` prefixes to archetype-accurate
prefixes matching their `category`: `legend_wuji`→`engine_wuji` (engine_destruction), `legend_dao`→
`engine_dao` (engine_deck), `legend_chi`→`engine_chi` (engine_flow), `legend_tengu`→`engine_tengu`
(engine_spirit_count), `legend_feng_shui`→`engine_feng_shui` (engine_slot), `legend_waidan`→`util_waidan`
(utility_economy). Also `engine_northern_lion`→`util_northern_lion` (a `{}` shop-reroll utility, not a
scoring engine). `legend_gankyil` correctly kept its prefix (still legendary). The rename flipped all
~38 `src/` reference sites (def, SpiritEffects effect + NEGATIVE_SNAPSHOT keys, RunManager
ACCUMULATOR_SPIRIT_IDS + init-state, tooltips, ShrineScene Grove-exit + reroll filters, GRM bucket-T
check) — behavior-neutral (no prefix is parsed anywhere). Verified by grep-to-zero (the campaign was
test-blind: zero tests referenced these IDs) plus a new `engine_wuji`/`engine_chi` regression test
closing that coverage gap. Persistence was a clean break (no save-game keys these IDs — only
`hanatu_beaten_hexagrams`). The earlier F2.1 channel-mismatch sub-fixes (`game_echo`, `util_past_life`)
were already patched; the remaining cosmetic archetype-drift IDs (`engine_memory`, `game_mirror`, etc.)
are a separate optional later campaign.

### F4.25 — Declarative spirit-formula refactor (three-place duplication) → **STILL-OPEN** (medium)
The Cat-1 scaling constant still lives in 3 places per spirit: `ACCUMULATOR_INIT` (RunManager.js:51-80),
`NEGATIVE_SNAPSHOT` formula spec (SpiritEffects.js:295-337), and `applyEngine` (e.g. sym_algae `0.1` at
SpiritEffects.js:727 duplicating the `0.1` in the snapshot at :310). No single `formula` source; drift
risk on balance tuning persists. **NOT collapsed by any Tier-2/3 consolidation** (the scoring-loop dedup
unified the *firing path*, not the formula constants). Now slightly easier post-consolidation (the
NEGATIVE_SNAPSHOT registry already centralizes the negative half).

### F4.26 — Transcendence powerLevel semantics revisit → **STILL-OPEN, needs-ruling-not-cleanup**
Option A locked for F2.5 (`RunManager.js:839 min(3, stackCount-1)`, 4th stack = catalyst); Option B
(all-4-contribute, powerLevel = stackCount, Amber-consistent) requires rebalancing + a Cuckoo Egg cap
change. **This is a design judgment, not a code chore** — no cleanup possible until Robert rules. Adjacent
to the banked velocity-magnitude question (D-F4.20-VELOCITY). Park here flagged for ruling.

### F4.32 — Silk anti-stranding scope verification → **STILL-OPEN but near-moot** (~0.25-0.5h, doc/test only)
Source already shows the scope is **wider than the framing assumed**: `_strandHasSilk` fires in BOTH the
deck-flip-lock path (`GRM:1883-1892`) and the hand-play 3-card-pending path (`GRM:1921-1927`), with
`_fireSilkAntiStrandHooks` (GRM:1025-1030). The original "only fires in deck-flip-lock" premise looks
stale. Remaining work is **confirm-and-document** (verify PostD2 test alignment, write the scope note) —
no behavior change likely needed. Effectively a documentation/verification task, not a fix.

### F4.35 — Scene-rendering unification → **STILL-OPEN (genuinely)** (substantial)
Confirmed open: `_renderHexagramSymbol` is a byte-identical twin (`GameScene.js:3657-3670` +
`ShrineScene.js:225-238`); the shrine pickers carry live `TODO(F4.35)` markers
(`ShrineScene.js:1214/1352`) and are intentionally duplicated per D-G (Option A: shrine-local random-8
pool); no `src/scenes/shared/` module exists for them (only `SpiritLayout.js` + `spiritTooltip.js`).
**Coupled** to the banked shrine-picker UX work. The terminal Tier-4 unification target.

---

## Bucket C — PARTIAL (what's done / what's left)

### F4.7 — Comment corrections → **RESOLVED 2026-06-12** (F4-TIER5-STEP1, commit `3b2263c`)
> Swept: StyleEngine 12→11; `advanceRound` JSDoc stale cumulative/decay clause dropped. (Folded with
> F4.10 + N3 + obs #10 into the one comment sweep.) _(Original disposition below.)_
Done: the Wayside/Grove comment (RunManager:206, matches D0.1), the destructive-cycle comment
(HexagramEffects:423, matches D0.2), the GameplayLogger V4-field docstrings (already cleaned). **Still
stale:** (1) `StyleEngine.js:4` "12 combos" — actual count is 11; (2) `RunManager.js:1230-1231`
`advanceRound()` JSDoc claims "decay Style Base toward 1.0" but the method no longer does. *(Overlaps the
F4.10 stale-comment set and the lost-and-found GRM:642 item — fold all stale-comment fixes into one
sweep.)*

### F4.10 — Three Marks naming legacy cleanup → **RESOLVED 2026-06-12** (F4-TIER5-STEP1, commits `3b2263c`/`7cf9c0f`)
> Cut dead `removeCardFromField`; relabeled the 6 stale "Three Marks"/"Non-being" comments → Wu Xing
> element-targeting / Third Eye. Live `removeCardFromHand` kept. _(Original disposition below.)_
Dead helper split: `GameRoundManager.removeCardFromField` (:869) is dead (zero callers — removable);
`removeCardFromHand` (:860) is **LIVE** (Third Eye Chakra, `GameScene.js:1966`) — keep. Stale "Three
Marks" comments persist at GameScene:198/2225, DeckManager:153, RunManager:1344, GRM:853, FieldManager:388.
**Left:** delete the one dead method + refresh/remove the comments (sweep with F4.7).

### F4.28 — Spirit stacking math audit → **PARTIAL** (D0.23 took the egregious cases)
Done: D0.23 verified 11 Pattern-1 spirits + shipped 5 fixes (engine_lincoln, engine_palace, velocity-T1,
decay_persimmon, decay_pear); `_scaleEngineOutput` (SpiritEffects.js:216-222) encodes the canonical
pow-vs-multiply pattern. **Left:** the *comprehensive* every-stackable-spirit audit + canonical-pattern
documentation + tooltip-expectation reconciliation per F4.28's full scope — never delivered as a
standalone pass. Now smaller (the canonical helper exists; this is mostly a verification + doc pass).

### F4.29 — Hook-firing centralization audit → **PARTIAL (substantially absorbed)**
Done: the centralization *infrastructure* shipped under D-F4.20 — `_fireSpiritHook`, `_fireFieldDiscardHooks`,
`_fireCardPlayedHooks`, `_fireStackCapturedHooks`, `_fireRoundEndUnplayedHooks`, unified `_discardCard`/
`_discardCards`, and the return-intent pattern. The destination audit (D-F4-SCOPE Part 2) stabilized
GRM/RunManager. **Left:** the *exhaustive* "enumerate EVERY mutation site, confirm each routes through a
helper or is intentionally inline" inventory was never run end-to-end; F4.20-handoffs *documented* the
known intentional exceptions (bullseye, symbiosis/algae, ducks) as document-and-contain. A full bypass
sweep is optional rigor, not a known-broken gap.

### F4.31 — Snow/Ice + Clay/Pottery proc timing → **PARTIAL** (structure absorbed; timing ruling banked)
Done: F4.34 removed the vestigial `SNOW_MULT`/`ICE_MULT` tables (`ScoringEngine.js:17-18` documents it);
`getWaterMult` (HexagramEffects.js:806-811) is the SSOT, called from GRM:1269 + GameScene + logger. Water
depreciation increments per-capture via `card.enhancement.depLevel`; Earth interest computes at round-end.
**Left:** the *canonical timing ruling* — whether Snow-dep / Ember-break firing at round-end (next-round
effect) vs. per-card-post-scoring is intended — is **F4.38(a)**, an explicit banked Phase-5-adjacent
design ruling (see `D-F4-CONSUMABLES-TIER2`). So the structural half is absorbed; the timing half is a
ruling, not cleanup.

### F4.33 — Festival cap + threshold scaling → **RESOLVED 2026-06-14** (DECISIONS_LOG `F4.33-Part1`)
> Part 1 (Festival cap) ratified-current (Robert): the inventory-slot gate IS the cap; an explicit
> per-round cap/cooldown is a Phase-5/F5.1 balance task. NO code change. → DP-74. This supersedes the
> 2026-06-11 Scope-decision Phase-5 banking of the *sub-item* (the cap-existence question is closed;
> only the cap *tuning* remains in Phase 5). _(Original disposition below.)_
Done (Part 2): proportional yaku-threshold scaling exists — `getProportionalYakuThreshold(rankCount,
deckSize)` (`data/yakuThresholds.js`), so thresholds aren't locked to a 48-card deck. **Left (Part 1):**
`util_festival` (`SpiritEffects.js:524-538`) gates stamp generation only by inventory slots
(`toGen = Math.min(stacks, available)`) — **no per-round cap**. Whether that needs a cap/cooldown/scale-down
is a balance decision (Phase-5-adjacent); confirm intent before implementing.

---

## Lost-and-found — Tier-5-class leftovers NOT in the original 22

Surfaced during Tier-2/3; most are already registered in `PHASE4_STATE.md` §4 (so not lost — listed here
for a complete Tier-5 picture). Fold the comment/dead-code ones into the same sweeps as F4.7/F4.10/F4.1.

- **"3 routed survivors"** (consumable-block close-out, §4): the `_drawLoadoutSlot`+`_confirmRelease` dead
  release-confirm chain (ShrineScene) — **✅ CUT step 1** (`7cf9c0f`); the dead `_renderHexagramSymbol`
  twin (GameScene+ShrineScene) — **still open, F4.35's concern**; the stale `RunManager.advanceRound`
  JSDoc (= the F4.7 item) — **✅ swept step 1** (`3b2263c`).
- **N1** — `engine_northern_lion` is the lone surviving `run.activeSpirits` accumulator (`GRM:~2069`);
  one-line ratification that excluding transcended copies from `pushesWitnessed` is intended. _(Open.)_
- **N3** — `engine_lincoln` desc/behavior mismatch — **✅ RESOLVED step 1** (`3b2263c`): the dangling
  internal NOTE (it referenced a non-existent "bank without pushing" desc) was removed; the user-facing
  description was already accurate, so no desc change.
- **Obs #4** — `test-run.js:54` dead smoke-test — **✅ RESOLVED step 1** (`7cf9c0f`): whole file deleted.
- **Obs #5** — RunManager duplicate `typeof window` debug blocks, one ungated — **✅ RESOLVED step 1**
  (`7cf9c0f`): the ungated `window.__run` block cut; the DEV-gated `window.run` block kept.
- **Obs #10** — `zodiac_rabbit` "Remove push penalty" vs. the `_pushPenaltyWaived` field — **✅ RESOLVED
  step 1** (`3b2263c`): description + effect comment + result message aligned to "waive".
- **GRM:642 stale comment** — **✅ already-corrected pre-step-1** (the "idle or round_over" text is gone;
  confirmed at recon, no edit needed).
- **NEW (surfaced by step 1) — `run.releaseSpirit` orphaned** (`RunManager.js:~691`): its sole caller, the
  `_confirmRelease` release-confirm chain, was cut as dead code in `7cf9c0f`, leaving it zero-caller.
  Candidate for a future dead-code pass — but "release a spirit" sounds load-bearing, so **verify it's
  genuinely the dead shrine-release-UI path (no other path to spirit-release) before any cut**, not a live
  mechanic. Not actioned (out of step-1 scope).
- **NEW (surfaced by step 1) — empty `// ── Snapshot ──` section header** in `GameRoundManager.js` (a
  leftover from D0.12's `toSnapshot` removal — a labeled section with nothing under it, now directly above
  `// ── Private helpers ──`). Trivial tidy; fold into a future comment sweep. Not actioned.

---

## Recommended groupings (for Robert's scope decision — groupings 1+2+3 ✅ EXECUTED 2026-06-12, step 1)

1. **One-shot dead-code cut** (F4.1 + F4.10's `removeCardFromField` + lost-and-found dead methods/smoke-test)
   — single decision: confirm no save/load intent, then delete. ~1h. **✅ EXECUTED step 1 (`7cf9c0f`).**
2. **One-shot comment sweep** (F4.7 + F4.10 comments + GRM:642 + N3 desc + obs #10 wording) — pure
   doc-string corrections, zero behavior risk. ~0.5h. **✅ EXECUTED step 1 (`3b2263c`).**
3. **Tiny-decision pair** (F4.4 `cardsByTag`, F4.5 `_totalScore`) — remove-or-document, ~0.5h together.
   **✅ EXECUTED step 1 (`7cf9c0f`) — both removed.**
4. **Verify-and-document** (F4.32 Silk scope, F4.28 stacking-pattern doc, F4.29 bypass sweep) — confirmation
   passes, optional rigor.
5. **Design rulings (NOT cleanup)** — F4.26 (powerLevel Option A/B), F4.31/F4.38(a) (proc timing), F4.33
   Part 1 (Festival cap), F4.30 "spirit reconsideration." Route to Phase-5 design, not the Tier-5 chore list.
6. **Scheduled refactors** — F4.21 (spirit ID normalization, ~4-7h, before save-game), F4.25 (declarative
   formula), F4.35 (scene unification, Tier-4). Each its own task.

---

## Scope decision (2026-06-11, Robert)

The 6 groupings above, dispositioned:

- **NEAR-TERM — the ~2h hygiene set (groupings 1 + 2 + 3). ✅ EXECUTED 2026-06-12 (F4-TIER5-STEP1,
  commits `3b2263c` comments / `7cf9c0f` deletions).** The gate resolved D0.12-governs (cut
  `undoLastCapture`/`fullReset`); F4.4/F4.5 removed; comment sweep landed. Two orphans surfaced
  (`run.releaseSpirit`, GRM Snapshot header) → lost-and-found. Step 2 (Tier-4 scoping) is now current.
- **BANKED — grouping 4 (verify-and-document).** Optional rigor (F4.32 Silk scope, F4.28 stacking-pattern
  doc, F4.29 bypass sweep). This registry already records what's known; run only if the rigor is wanted.
- **BANKED → Phase-5 design agenda — grouping 5 (design rulings, NOT cleanup).** F4.26 (powerLevel
  Option A/B), F4.31 / F4.38(a) (proc timing), F4.33 Part 1 (Festival cap), F4.30-half (Gankyil "spirit
  reconsideration"). These need Robert's design call, not a code chore — they belong on the Phase-5
  design agenda.
- **BANKED → scheduled refactors — grouping 6.** F4.21 (spirit-ID normalization, ~4-7h, gated before
  save-game), F4.25 (declarative formula), F4.35 (scene unification — lands in **Tier-4**, not the Tier-5
  hygiene set). Each gets its own task/slot when it comes.

Mirrored in `PHASE4_STATE.md` §3 "Immediate next action."
