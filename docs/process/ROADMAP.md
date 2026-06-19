# ROADMAP.md — the Phase 5-7 forward plan

**Status:** Living. The canonical forward task plan for Phases 5-7 — *what's the work ahead, and in what
order*. Created 2026-06-18, then reconciled the same day against the authoritative `PHASE_5_6_7_BACKLOG.md`.

**What this doc is.** The forward task plan. It is distinct from:
- **`DESIGN_DEFERRED.md`** — the *design specs* of deferred features. **Now folded into this doc** (each
  D-spec lives inline in the entries below, 2026-06-18); DESIGN_DEFERRED is pending archival once this
  merge is reviewed.
- **`DECISIONS_LOG.md`** — the durable record of what's been *decided* (rationale).
- **`OVERHAUL_PLAN.md`** — the Phase-0-4 task record. ROADMAP **supersedes its forward role** (see §6).

See `DOC_MAP.md` for the one-concern-one-doc map.

> **Sourcing note.** The primary source is **`docs/process/PHASE_5_6_7_BACKLOG.md`** — the de-duplicated,
> phase-sorted intake doc (prepared 2026-06-13). ROADMAP was first drafted from a *substitute*
> (`OVERHAUL_PLAN.md`'s scattered Phase-5 content) before the backlog was in the repo, then **reconciled
> against the backlog on 2026-06-18**: items the backlog carried that the substitute had dropped were
> folded in (marked *(from backlog)* below). A few items came from `OVERHAUL_PLAN.md` /
> `DESIGN_DEFERRED.md` / the candidates registry rather than the backlog — noted parenthetically; all
> confirmed kept (Robert, 2026-06-18). The two status conflicts the reconcile surfaced were resolved the
> same day: **F4.38a stays open** (active 5A design item); **F5.4** integration is done, art pending. Item
> *statuses* were cross-checked against `PHASE4_STATE.md` (Leg-2/3 close) + the candidate sweep lines;
> plausibly-resolved ones are tagged **`[VERIFY]`** (§5). If a richer source appears, reconcile against it.

---

## §1 — The phase shape

Phases 5-7 are **generative** (build / tune / polish) — a different disposition from Phases 0-4's
**convergent** consolidation (find what's wrong, reduce entanglement). The overhaul arc
(audit → fix → architect → reorganize → re-audit) completes at **Audit 2**, the closing re-audit gated on
Phase-4 close + V6 + `ARCHITECTURE.md` (see `POST_AUDIT_DIRECTION.md` §1). Phase 5 begins after it.

- **Phase 5 — generative.** Three sub-streams: **5A design-resolution** (decide open questions about
  *existing* mechanics), **5B feature-building** (build what doesn't exist), **5C demo-prep** (the run-up
  to a playable demo).
- **Phase 6 — threshold / balance tuning.** Playtest-data-driven; the F3.16b structured scoring-log schema
  is the instrument. Largely can't start until 5B is stable.
- **Phase 7 — polish.** Art, sound, animation, tutorial — the capstone. Last, because polishing pre-final
  mechanics is wasted effort.

**The soft 5A/6 boundary.** Several design-resolution items *decide the shape in 5A, set the number in 6*
(e.g. the Earth model is chosen in 5A/F5.8; its magnitudes are tuned in 6/F5.1). Flagged per-item below.

*(Framing from `POST_AUDIT_DIRECTION.md` §2, which scopes Phase 5's three sub-streams. The explicit 6/7
split refines OVERHAUL_PLAN's single monolithic "Phase 5: demo build-out.")*

---

## §2 — Phase 5 backlog

### 5A — design-resolution (decide the shape of existing mechanics)

| ID | Item | Spec / source | Note |
|---|---|---|---|
| **F5.0** | Capture-event **merge-vs-separate** + capture-vs-scoring semantic audit (the Phase-1.5-scoring vs capture-trigger dispatch question; halted in Tier-3 as a playtest call) | OVERHAUL_PLAN F5.0; `D-F4-SCORING-TIER3` | **First task of Phase 5** — a clean classification pass before tuning/content. |
| **F5.8** | Earth (Clay/Pottery) timing redesign: round-end %-of-ki → **per-capture flat ki** | DP-72; DECISIONS_LOG 2026-06-14 | **Current (V6 §8.2.2):** Earth cards generate round-end ki interest — Clay 10% / Pottery 20% of current ki per Earth card held at round-end, feeding Fossil; the held-in-hand mult channel is ×1.0 except under `boost_earth` (hex_15). **Redesign:** replace with per-capture flat ki — Clay **+3 ki**/scoring-event, Pottery **+3 + "1 interest"** (interest def OPEN: rate-bump vs flat vs one-time) — and **retire the no-op mult channel**. Magnitude 3 provisional (balance-equiv only near ~150 ki). Seam prepared (`{addKi?, addInterest?}` latent) — "populate + tune," not restructure. Shape 5A; magnitudes → Phase 6 (F5.1). |
| — | F4.38a — Wu Xing proc **timing** | PHASE4_STATE §3; `D-F4-CONSUMABLES-TIER2` | **Active 5A design item.** The Clay/Pottery bonus-timing design is still being worked — whether Wu Xing procs (Snow-dep / Ember-break / Clay-Pottery) fire round-end (= a next-round effect) or per-card post-scoring. Likely connects to the **two-stage Wu Xing consolidation** from Phase 4 — the *application* side and the *scoring/triggering* side were split — so it **may warrant its own recon to map that connection before the redesign.** Pairs with F5.8 (Earth). |
| — | Black / gray **stamp** effect rethink | OVERHAUL_PLAN P5 tuning; Robert notepad | Gray retrigger mult (currently +3 → 4× firing, flagged **OP**); black-stamp distribution (Captured→consumable / Discarded→draw / Yaku→+3 ki — alternates of interest). Design + tuning. |
| **F5.13** | Mirror/Memory **`^n` copy-scaling** audit | OVERHAUL_PLAN F5.13 / DP-75 | A known deviation from the linear-stacking canon (`_scaleEngineOutput` applies `multiplyMult^n` by the meta-spirit's own stacks); V6 does NOT claim Mirror/Memory are linear-consistent. Behavior-changing; own recon. Pairs with the adjacency row below + the open getter-verification flag in `SPIRIT_SET_ITERATION_RULE.md`. |
| — | Mirror/Memory **slot-vs-adjacency** semantic | PHASE4_STATE §4 | Targeting-includes-Negatives already shipped; the deeper "slot reference vs positional adjacency" cleanup is the separate banked task. |
| — | The **"legendaries = foundational, not score-pump"** tenet | brief; prior handoff (check DECISIONS_LOG) | Load-bearing for the 5 legendaries; **likely UNWRITTEN — record it as a design tenet.** Relates structurally to Candidate I (5B). |
| — | **Editions** effect/bonus redesign (Gold / Crystal / Ghost) | Robert notepad | New ideas since the audit. |
| **D1** / **Cand. C** | **Code-vocabulary** rename: `tooltipBase`→scoring-values + getter cohesion | DP-65; registry **Candidate C** | Rename `tooltipBase` → a name reflecting that it holds canonical scoring/tuning values (candidates: `scoringBase` / `baseValues` / `tuningValues` / `spiritBase`); rename the `_tb` accessor to match; reconsider the internal keys under the new framing (e.g. `jackpotMult` is really a `Math.pow` exponent base, not a mult). Behavior-preserving semantic cleanup — a naming *cluster*, not a find-replace. **Sequencing:** after Wave B settles the field shape (F3.16 scoring-log schema + F4.37 tooltip recomb may reshape it) — rename once against the settled shape. Was gated on `ARCHITECTURE.md` (now live); sequence with Candidate I (§5). |
| — | **Player-facing renames** (Alchemicals, negative spirits, editions?) | brief 5A; Robert notepad | *(from backlog)* Low-risk category/name renames — distinct from the D1/Cand-C code-vocabulary pass. |
| — | **Grouping-5 deferred remainder** | tier5_reconciliation | *(from backlog)* Whatever was triaged out of the Leg-2 rulings as document-as-provisional. Gankyil already CUT — **verify what, if anything, remains.** |
| — | Hand-**size/count** design (what the count *should be*) | Robert notepad | The DESIGN question — distinct from the hand-capacity *plumbing* already fixed (Candidate D). |
| — | **hex_30 / hex_52** design | OVERHAUL_PLAN P5 tuning | hex_30 Lí difficulty (Option B no-repeat → Option A pure-random if still too easy); hex_52 Gèn design completion (mechanically thin — candidate transformative directions). |
| **F5.4d** | **Ducks effect redesign** | DP-06 / OVERHAUL_PLAN F5.4d | **Current (V6 §7.15):** Ducks keeps a counter (+1 per deck-flip match, −1 per strand, floored at 0) and contributes ×(1 + counter × 0.2 × stacks). **Redesign:** the additive-counter model is a placeholder — replace with a more interesting deck-flip/strand mechanic. *(The Ducks/Osprey hook MIGRATION is a separate 5B item — code, not design.)* |
| **D6** | Misc-engine diversity pass | Robert's note (Phase 5) | **Current (V6 §7.6.4):** Miscellaneous Engines is a large bucket — Missing Number, Palace, Ship, Surplus, Kintaro, Bullseye, Lincoln, Napoleon, plus the 5 demoted rares (Wuji, Dao, Chi, Tengu, Feng Shui). **Intent:** evaluate for **build-diversity** — change/add effects so the cluster supports distinct archetypes rather than a pile of overlapping mult-mult engines. |
| — | **Spirit stacking as player choice** | from V6 §17 extraction | Identical spirits currently auto-stack on acquisition; decoupling that into a deliberate drag-to-stack action would create richer strategic decisions (tied to Negative visual differentiation). Requires UI work. |
| — | **`transcendCard` mutation reset** | from V6 §17 extraction | `transcendCard()` clears all card keys and copies from the target, so persistent mutations (Irrigation bonus points; future card-mutation spirits) RESET on path-conversion. Decide: intended, or should mutations persist? Trigger: playtest (do players feel "robbed"?). |

### 5B — feature-building (build what doesn't exist)

| ID | Item | Spec / source | Note |
|---|---|---|---|
| **F5.11** | Negative-aware fusion + alchemical picker | DP-73 / OVERHAUL_PLAN F5.11; DECISIONS_LOG 2026-06-14 | **Current (V6 §8.6.1):** negatives can't be Cinnabar/Pearl fusion inputs (only regulars fuse); the Cuckoo Egg hatch is the one neg-aware path. **Rules (DECIDED):** negative + regular → regular fusion; negative + negative → negative fusion at the lower `powerLevel`; the negative's `powerLevel` decrements per use. Cuckoo neg-hatch confirmed; **Approach-2** arch. Open sub-rulings: Mercury neg de-fusion, Jade neg powerLevel-up (accumulator-state wrinkle), Amber/Sulfur exclusion. Surface: **picker-source overhaul + index-contract re-thread across both scenes + tests.** May interact with F5.4b. |
| **F5.10** | Consumable stacking system | OVERHAUL_PLAN F5.10; Robert ruling | Locked design, entirely UNBUILT. **Worth a design discussion first so V6 documents it accurately.** (Waidan removal is tracked as a correctness rider below, not here.) |
| **Cand. G** (UX) / **D5** | Shop / ShrineScene revamp | registry **Candidate G** (UX half); DP-67 | (a) wire blessings to be obtainable [Candidate G UX half]; (b) reorganize for UX; (c) booster packs? *(open)*. Random-8 architecture shipped (G2) — this is UX completion + calibration. **Legendary-offering re-enable (DP-67):** the old 15% Grove legendary roll + `_pickRandomLegendary` were removed (the Grove now offers the same Tier-1 pool as Wayside, more slots, no legendary roll); re-introduce a legendary offering as part of the shop reorg (a deferral, not a permanent cut). Dormant infra retained — buy-side legendary routing + `addLegendarySpirit`/`canAddLegendary` + the capstone/Pearl path are live-but-dormant. |
| **Cand. I** + **Cand. C** | Legendary / spirit structural decoupling + getter rename | registry **Candidates I & C** | Union getters, `alch_pearl→addLegendarySpirit`, inline capstone scoring branches. Possibly: legendaries get their own data + systems docs. Recon feeds the (now-live) `ARCHITECTURE.md`; campaign is Phase 5. Sequence together — C names, I splits (§5). |
| **F5.0a** / **D9** | Double-trigram (8 modes) redesign, incl. hex_29 rank-aware board | DP-47 / DP-59 / OVERHAUL_PLAN F5.0a | **Current (V6 §9.2):** the 8 double-trigram hexagrams are documented at current behavior; hex_29 (Kǎn) uses `match_by_rank` + `disablesYaku` and its in-code description already notes "undergoing redesign." **Intent:** redesign + reimplement all 8 modes, including a **rank-aware board layout for hex_29** so rank-matching feels coherent (the F2.2 attempt was reverted after playtest). Work through the 8 one by one; ~4-6h for the hex_29 piece alone. |
| **F5.9** | Stub / non-functional spirits — `econ_print` (consumable-applier), **caterpillar** | OVERHAUL_PLAN F5.9; Robert notepad | Print is the headline stub (Echo/Replica/Collector already implemented); bring caterpillar up to date too. |
| — | **Osprey hook migration + `sym_ducks`** | PHASE4_STATE §4 | *(from backlog)* Needs the nonexistent **`onDeckFlipResolved`** seam built; ducks co-banked here. **Ducks in-place is correct code — a stylistic migration, not a bug** (the Ducks *effect* redesign is the separate 5A item F5.4d). |
| **F5.2** | Save / load (run resumption) | OVERHAUL_PLAN F5.2 | `schema_version` field; graceful discard on mismatch. Several items gate on this — must precede them or be migration-aware. |
| — | Settings | brief 5B | |
| — | **UI features** cluster | Robert notepad | *(from backlog)* Spirit details viewable in shop; an area showing achieved style combos; complete the style-combo roster; ember/charcoal-in-banked-area handling. |
| **F5.4** | Speculative cards — **integration complete; art pending** (13 data-only cards) | OVERHAUL_PLAN F5.4; DP-57 | Shop integration is DONE — the shop draws from the speculative pool today (the old "shop integration awaits art" premise was stale). The remaining work is **final art**, the Phase-7 art gate (§4). |
| **F5.4b** | Deck-modification hexagram redesign + speculative card integration | OVERHAUL_PLAN F5.4b; V6 §17 extraction | Touches negative-form mechanics (may interact with F5.11). **Open design (from §17.2):** `animal_deck` (hex_17 Suí) replaces the highest-rank non-animal per month with a duplicate animal — currently removing ALL 5 brights; decide Option A (current, dramatic), B (replace lowest-rank → preserves brights), or C (only months without a base animal → minimal). Same question for `ribbon_deck` (hex_31 Xián). |
| **F5.4c** | Fire-enhancement axis preservation | OVERHAUL_PLAN F5.4c | *(from OVERHAUL_PLAN F5.4c, not the backlog.)* |
| **DP-68** | Negative-consumables system — re-source | DP-68 | The `addNegativeConsumable` / `_negativeConsumables` infra is retained; only Waidan-as-its-source was cut. A Phase-5 build re-sources it (post-Waidan). |
| — | **Endless mode** | from V6 §17 extraction | Continue rounds beyond R36 with continually-rising thresholds; the Grove-every-3 / Wayside-between cadence repeats indefinitely. Planned post-launch feature. |
| — | **Run history / statistics** | from V6 §17 extraction | Aggregate run stats / leaderboard (runs are single-session today). Future enhancement, distinct from F5.2 save/load. |

### 5C — demo-prep (run-up to a playable demo)

- Prepare the game to **receive** art / sound / animation (the asset pipeline + the hooks).
- The playable-demo run-up.
- Flavor-text workflow.
- **Underspecified — flag:** 5C needs its **own planning pass when Phase 5 opens**. It is barely
  represented in current docs (`POST_AUDIT_DIRECTION.md` §2 calls this out explicitly).

### Correctness items that ride here (small)

- **`[VERIFY]`** — Leg 2 & 3 are COMPLETE (`PHASE4_STATE.md`); most small correctness items should be done.
  Verify no residue before carrying any forward.
- **Batch fusion bug** (1 Cinnabar → 2 fusions) — *(from backlog)* **`[VERIFY]` — appears CLOSED** in Leg 3
  (`F4-LEG3-CINNABAR-SINGLEOP`, DP-69); confirm and strike.
- **Waidan Grove-exit coupling** — *(from backlog)* Waidan was CUT, so this is the **deletion site** (the
  `if (_isGrove)` Waidan block in `_drawContinueButton`). **`[VERIFY]`** it was removed with the cut.
- **F4.37 carry-forward** — double-render of the 5 out-of-block engines (wuji/dao/chi/tengu/feng_shui);
  dead `econ_lucky_charm` / `econ_reward` tooltip branches. Opportunistic.
- **Candidates A / B** — *(backlog flagged "verify if absorbed by F4.25/F4.28")*: **B confirmed dropped**
  (its drift problem is solved by `_tb`); **A still open** (carried in the candidates block below).
- DP-25 follow-up — if any residue *(from prior recon, not the backlog)*.

### Carried-over consolidation candidates (open, from the registry)

The candidate registry's still-open **engineering** candidates (not design/feature work) — listed so
they're not dropped at the seam. Several likely route to **`CODEBASE_CLEANUP.md`** rather than a Phase-5
task; Robert to route:
- **Candidate A** — effect-magnitude accessor unification (standardize on `effectivePower`). Mechanical.
- **Candidate E** — FieldManager slot-model recon (capacity vs slot-kind vs spawned-slot). Recon-first;
  the verdict may be "separate concerns, no consolidation."
- **Candidate H** — consumable-consumption / use-blocking consistency (the consume-on-blocked policy).
  Recon-first, with a player-facing semantics ruling inside it.

*(Candidates **C**, **G**-UX, **I** are placed in 5A/5B above. Resolved/dropped — **B**, **D**, **F** —
are excluded; see §5.)*

---

## §3 — Phase 6 (tuning)

Playtest-data-driven; **largely can't start until 5B is stable.** Headline + the gathered balance items:

- **F5.1 — Score-threshold tuning** *(headline)* — synthetic playthroughs at 3 archetypes; set thresholds
  at 25th-percentile competent play; verify the difficulty curve. (`PUSH_CURVE` + proportional yaku
  thresholds are the live inputs.)
- **F4.26-B balance consequences** — singleton-contribution re-tune (**4× likely OP vs old 3×**);
  copy-acquisition caps (Cat-5 now reaches power-4); **Amber rethink (DP-02b):** natural transcendence is
  now lossless (`powerLevel = stackCount`, 4× base, free), so Amber's niche — full power for a permanent
  −1 field slot — is dominated. Restore a distinct value (Amber's unique lever is *forced* transcendence at
  sub-4 stacks; the slot-cost / power tradeoff needs revisiting).
- **Velocity exponential magnitude** — does `powerLevel` scale inside the **1.5^x** exponent
  (`D-F4.20-VELOCITY`). Both branches consistent now; change nothing until here.
- **F5.8 / Earth magnitudes** — the "+3" and the interest definition; resolve with F5.1 data.
- **Decay magnitude retune** — pear **5/round**, persimmon **3/round**, now that decay bites
  per-stack / per-member.
- **Candidate G random-8 tuning** — subset size, gating, family eligibility, cost-scaling (the shape
  shipped; this is calibration).
- **Holistic pricing** — all spirit + consumable costs re-tuned together once the sell-price refund
  (`floor(cost/2)`) impact is visible; revisit the 50% sell percentages.
- **Bonds base value** — uncapped now; **+5%/stack may need to drop to +2–3%**.
- **Yaku thresholds at low deck counts** — proportional-scaling check.
- **Festival per-round cap (DP-74; F4.33)** — Festival currently generates one stamp (of the captured
  ribbon's color) per stack, per ribbon captured, gated only by free consumable-inventory slots (the slot
  gate IS the cap; no separate per-round limit). B-13 flagged unbounded generation as a balance risk;
  ratified-current for now — the explicit per-round cap / cooldown / scale-down is the Phase-6 piece.
- **Glory-draw held-at-round-end payoff** — latent until a teardown reorder. *(The brief's "J glory-draw"
  is this item — a list label, not a registry candidate; the backlog resolves the earlier "confirm
  referent" question.)*

---

## §4 — Phase 7 (polish)

Last — polishing pre-final mechanics is wasted effort.

- **F5.5 — Audio integration** — partner produces; Hanatu wires the hooks (play, capture, yaku, push,
  shop, hex reveal, capstone fusion).
- **Art integration** — as it arrives; speculative-card art is a milestone gate (DP-57).
- **Animation / game-feel / juice** — the Balatro-fidelity craft layer; the engine isn't the constraint,
  this work is (the bulk of the fidelity gap).
- **UI / visual-polish checklist** *(from V6 §17.4 extraction)* — Phase-7 items under the game-feel umbrella
  above; enumerated so none is lost:
  - Off-screen Blessings panel (button-accessible owned-Blessings view).
  - Hexagram detail visualization (boost/debuff up/down arrows on affected cards).
  - Spirit-chain reorder visual feedback (which scoring phase — additive / multiplicative / engine — a spirit is in).
  - Stamp-tier visual indicator (small tier marker on the stamp icon).
  - Negative-spirit visual differentiation (beyond the current purple border).
  - Hand-size label ("5/8", respecting `modifyHandSize`) so silent skip-on-cap is legible.
  - Mult-display rounding precision (`toFixed(1)` shows 0.75→"0.8"; consider `toFixed(2)` / smart rounding).
  - Field-slot layout polish for non-default counts (7/9-slot tuning).
  - Divination Scene description occlusion (description blocked by the hexagram frame; reflow).
  - Spirit-fan transition animation (currently snaps on drag).
  - Mobile / touch interaction patterns (current UX assumes desktop hover/click).
- **F5.3 — First-run tutorial / onboarding** — not yet implemented; needs final mechanics (DP-60). Pairs
  with art integration above as the pre-release production work.
- **F5.6 — Bundling + distribution** — Vite prod build, Electron/Tauri desktop wrapper, asset compression,
  browser-compat. (Steam SDK-via-JS is the known friction — late packaging.)
- **F5.7 — Final polish + full bugtest pass** — with a cleanup-catalog cross-check. Open-ended.
- **Phase-3-deferred UI polish** *(from OVERHAUL_PLAN Phase 3, not the backlog)*: F3.12 enhancement visual
  overhaul, F3.14 Past Life indicator, F3.19 disabled-yaku display, F3.21 deck-view overlay extras.

---

## §5 — Sequencing notes + open questions

- **The 5A→6 soft boundary** ("decide the shape in 5A, set the number in 6") applies to: F5.8 Earth
  (model 5A / magnitudes 6), velocity (sanction 5A / magnitude 6), Festival cap (mechanism 5A-ish /
  number 6), Bonds (kept additive / value 6).
- **Phase 6 gates on 5B stability** — tuning needs the feature set settled and playtest data flowing
  (F3.16b structured scoring-log schema is the instrument).
- **5C demo-prep is underspecified** — give it its own planning pass at Phase-5 open.
- **Candidate C (vocabulary) + Candidate I (legendary decoupling)** share the getter surface — sequence
  them **together**, after the structure stops moving (both were gated on `ARCHITECTURE.md`, now live):
  likely I-recon first (decide what splits), then C names the survivors.
- **`[VERIFY]` items** (plausibly-resolved — confirm/strike, do not carry as open):
  - **F5.12** (multiplicative-spirit stacking consistency) — ✅ **DONE 2026-06-14** (commit b6723d3).
    Strike from the forward plan.
  - **Festival cap** — ✅ ratified-current; only the explicit cap is forward (→ Phase 6).
  - **Negative fusion** — ruling decided; **F5.11 is the (forward) build**, not an open decision.
  - **Batch fusion bug** — appears CLOSED via `F4-LEG3-CINNABAR-SINGLEOP` (DP-69); confirm + strike.
  - **Correctness riders** — Leg 2 & 3 COMPLETE; confirm no residue.
  - **Resolved candidates excluded from the forward plan:** B (dropped), D (closed), F (resolved).

- **Status conflicts resolved (Robert, 2026-06-18):** **F4.38a** stays **open** — an active 5A design item
  (the Clay/Pottery bonus-timing design is still being worked; see 5A). **F5.4** — shop integration is
  done; only final art remains (→ Phase 7).

- **Items sourced outside the backlog** (carried from OVERHAUL_PLAN / DESIGN_DEFERRED / the candidates
  registry — all confirmed real forward items, kept; listed here only for provenance):
  - **F5.13** Mirror/Memory `^n` copy-scaling audit (F5.12 carve-out / DP-75).
  - **D6** misc-engine diversity pass · **F5.4b** deck-mod-hex redesign · **F5.4c** Fire-axis preservation ·
    **DP-68** negative-consumables re-source · **D5** legendary-offering re-enable (folded into the shop item).
  - **Candidate E** (FieldManager slot-model recon) + **Candidate H** (consumable-consumption consistency).
  - **DP-25** correctness follow-up · **Phase-3-deferred UI polish** (F3.12 / F3.14 / F3.19 / F3.21).

---

## §6 — Relationship to OVERHAUL_PLAN

ROADMAP **supersedes `OVERHAUL_PLAN.md` for forward planning.** OVERHAUL_PLAN is retained as the
**Phase-0-4 historical task record** (archive-pending-Gate-0 per `DOC_MAP.md` §3). It is **not edited in
this campaign**; a later touch can add a one-line header to OVERHAUL_PLAN noting that its forward role is
superseded by ROADMAP.
