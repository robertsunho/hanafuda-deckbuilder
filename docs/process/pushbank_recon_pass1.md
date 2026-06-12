# Push/Bank Flow Subsystem — Recon (Pass 1)

> Standing reference for **item 6** of the destination audit (D-F4-SCOPE Part 2) — the charter-mandated
> dedicated recon of the round's risk/reward flow engine. **Read-only map + ruling surface; no campaign
> scoped until Robert rules.** Supersedes the seed inventory in `destination_audit_recon_pass1.md`
> Part 3b. Date: 2026-06-11. Every `file:line` re-grepped against current source (items 1–5 shifted both
> files; the phase machine is now explicit/validated — item 5 — the clean foundation this builds on).

## Part 0 — Handoff sanity

Item 6 is the last open destination-audit item (items 1–5 shipped: cycle #3 sever, obs #14 won't-fix,
obs #13 init-unify, reset-dedup, `_setPhase` guardrail). I've read the charter (`D-F4-SCOPE` Part 2),
the seed inventory (Part 3b: "warrants its own dedicated recon"), and items 1–5 close-outs. Code greps
clean and matches the docs modulo line-drift. **One contradiction-with-the-seed surfaced and is in my
favor as a finding:** the seed counted "7+ GRM fields" as the push/bank state surface — but recon shows
**3 of the 8 fields are vestigial (write-only, never read)**, so the *live* surface is smaller (5
fields) than the seed implies. Flagged in Part 1. The `_pushPenaltyActive ⟺ _pushCount>0` invariant
block-comment (GRM:2070–2080) is the prior hard reasoning the charter referenced; it is **still valid**
post-items-1–5 (verified in Part 1).

## Part 1 — The state model (every field, its lifecycle)

Eight fields live in `_resetRoundState` (GRM:262–271, the reset *bypass* — direct-assigned, item-5
Ruling 2). **Three are vestigial.**

| field | meaning | set-sites (cond) | read-sites | verdict |
|---|---|---|---|---|
| `_pushCount` | # pushes attempted this round | reset→0; `pushOn` (680) `++` every push | `_getNextPushDealCount` (853/856, deal curve); result obj (1159/2177); getter (138) | **LIVE** — indexes the DEAL/resource curve |
| `_pushDepth` | # *successful* push commitments | reset→0; **`run.onPushSuccess` (RM:1083) `++`** (cross-file!) | `pushOn` preview (696); `onPushFailure` (RM:1095 `+1`); `onBank` (RM:1112); result obj (1160/2178)→`calculateKiReward` (RM:1238); getter (140) | **LIVE** — indexes the FLOW/multiplier curve |
| `_pushPenaltyActive` | exposed to push penalty | reset→false; `pushOn` (683)→true; cleared on yaku resolution (2060/2084) | `_endRound` natural-fail gate (1110); `penaltyApplied` (2137) | **LIVE** |
| `_tigerPushActive` | Tiger one-shot free push | reset→false; **`zodiac_tiger`** (ConsumableEffects:80)→true | `_finalizeTurn` (2140); consumed/cleared (2141) | **LIVE** |
| `_dogProtection` | suppress push penalty this round | reset→false; **`zodiac_rabbit`** (ConsumableEffects:89)→true | `_endRound` (1110); `penaltyApplied` (2137); getter (150) | **LIVE** (naming mismatch — see below) |
| `_atRiskScore` | "score at risk" snapshot | reset→0; `pushOn` (682)=`_runningScore` | **NONE** | **(L) VESTIGIAL — write-only** |
| `_pigDoubleKi` | "Pig: double round-end ki" | reset→false **only** | result obj (1161/2179); getter (153) — but **never consumed** | **(L) VESTIGIAL — no setter, no consumer** |
| `_roundEndingAfterDecision` | "round-over deferred pending decision" | reset→false; `pushOn`/`continuePlay`/`_endRound`/`_finalizeTurn` (679/713/1128/2144) | **NONE** | **(L) VESTIGIAL — write-only** |

### `_pushCount` vs `_pushDepth` — TWO distinct concepts, not drift (the key ruling input)

They index **different curves for different purposes** and increment at **different times**:
- **`_pushCount`** increments in `pushOn()` on **every** push (the *attempt*). It drives the **deal/resource
  curve** (`_getNextPushDealCount`: push1→+4, push2→+2, push3+→+1 cards; and the pushOn JSDoc scaling
  hand=`max(2, HAND_SIZE − pushCount×2)`, plays=`max(2, PLAYS_PER_ROUND − pushCount)`). Semantics: "how
  many times you've pushed → how thin your resources are this push."
- **`_pushDepth`** increments only in `run.onPushSuccess` when a push **succeeds** (a new yaku is reached
  the following turn). It drives the **flow/multiplier curve** (`getPushMultiplier(depth, outcome)`).
  Semantics: "how deep your *successful* commitment is → how big the reward (bank) or penalty (fail)."

**Can they diverge?** Numerically they stay within 1 of each other, deterministically: each push resolves
as exactly one success (→both were/are incremented) or one failure (→count incremented at the push,
depth not, and a failed push ends the round, so at most one failure per round). So at **bank** time
`count == depth`; at **fail** time `count == depth + 1` (hence `onPushFailure` uses `depth + 1`,
RM:1095 — the would-be depth of the in-flight failed push). **They are genuinely two axes** (attempted
resource-cost vs resolved reward-position), used at different moments — merging them would conflate "how
many cards you get" with "your flow multiplier." **Not redundant; keep both.** The only real issue is
**legibility** — the distinction is non-obvious and under-documented (a Candidate-C-adjacent naming/doc
opportunity, not a merge).

### The `_pushPenaltyActive ⟺ _pushCount>0` invariant (GRM:2070–2080) — STILL VALID

The block comment justifies firing `econ_reward` on `pushSucceeded` (== the old `newYaku>0 &&
_pushCount>0` gate). Re-verified against current code: `_pushPenaltyActive` is set **only** by `pushOn`
(683), which also bumps `_pushCount` (680); it's cleared on every yaku resolution (2060/2084). So
`_pushPenaltyActive ⟹ _pushCount>0` holds. The divergent state needs a yaku reached after a prior push
cleared *without* a new push — i.e. `continuePlay`, which is offered ONLY on yaku-disabled (forces
`newYaku.length=0`). Items 1–5 touched only phase writes, not this logic. **Invariant intact; not a
latent bug.**

### The one-shot consumable flags + a naming mismatch
- `_tigerPushActive` (`zodiac_tiger`): lets `_finalizeTurn` offer `yaku_decision` with no yaku
  (`tigerTriggered`, 2140), consumed same turn (2141). Clean lifecycle.
- `_dogProtection` (`zodiac_rabbit`): suppresses the fail penalty (1110, 2137). **Naming mismatch
  (cosmetic):** the field/reset-comment say "Dog" but the setter is `zodiac_rabbit` ("Rabbit: push
  penalty removed"). This is the already-logged **F4.24 obs #10** (`PHASE4_STATE` §4 ratify/cleanup) —
  cross-referenced, not new.

## Part 2 — The flow: the three exits + resolution

All three exits are guarded on `yaku_decision` (item-5 machine). Phase is reached via `_finalizeTurn`
(from `awaiting_deck`).

**Decision setup — `_finalizeTurn` (GRM:2135–2155).** After scoring the turn: `roundOver =
hand.isEmpty()`; `penaltyApplied = roundOver && _pushPenaltyActive && !_dogProtection`; `_forceAutoBank
= !disablesYaku && newYaku>0 && hook('forceAutoBankOnYaku')`; `tigerTriggered = _tigerPushActive &&
newYaku===0`. Then: `(newYaku>0 && !forceAutoBank) || tigerTriggered` → `yaku_decision`; else `roundOver
|| forceAutoBank` → `_endRound`; else `disablesYaku` → `yaku_decision` (free bank/continue); else →
`idle`.

**PUSH** — `pushOn()` (674): `_pushCount++`, `_atRiskScore=_runningScore` (dead), `_pushPenaltyActive=
true`, deal `_getNextPushDealCount()` cards, re-snapshot yaku, `_setPhase("idle")`, return curve preview
(`failedFlow`/`successFlow` at `_pushDepth+1`). **Resolution next turn** in `_finalizeTurn` (2058):
`pushSucceeded = _pushPenaltyActive && newYaku>0`. On success → `_pushPenaltyActive=false`,
`run.onPushSuccess(this)` (bumps `_pushDepth`, fires hex `onPushSuccess`), northern_lion +1,
`_fireSpiritHook('onPushSuccess')` (econ_reward, ordered after so it sees post-hex ki). On a yaku that
isn't a push-success (no active penalty) → just clears the flag (2084). **Failure** (push made, round
ends with no new yaku): `_endRound('natural')` with `penaltyApplied` → `run.onPushFailure(this)` applies
`getPushMultiplier(_pushDepth+1,'failure')` to flow.

**BANK** — `bankScore()` (653) → `_endRound('banked')`: fires `run.onBank(this)` (applies
`getPushMultiplier(_pushDepth,'success')` to flow), hex `onBank`, `_fireSpiritHook('onBank')`, then the
shared teardown (`_scoreFieldCards`, `applyFlowDecay`, `_applyPostRoundEnhancements`, log) →
`_setPhase("round_over")` → `_buildRoundEndResult` (carries `pushDepth`/`penaltyApplied`). Ki/interest
is paid later by GameScene calling `run.calculateKiReward(result)` (GameScene:2673).

**CONTINUE** — `continuePlay()` (709): clears `_roundEndingAfterDecision` (dead write), `_setPhase
("idle")`. **No push state touched** — it's the yaku-*disabled* escape (the Continue button is offered
only when `disablesYaku`, 2150). Differs from push: no `_pushCount`/penalty, no deal, no flow stake.

## Part 3 — The curve + multiplier (structure only; magnitude is Phase-5)

`RunManager.PUSH_CURVE` (RM:215): depths 0–4, each `{success, failure}` (e.g. d1 .90/1.10, d4 .50/2.00).
`getPushMultiplier(depth, outcome)` (RM:1525): table lookup; **extrapolates depth 5+** (success
`2.00+0.50·(depth−4)`, failure `max(0.05, 0.50−0.15·(depth−4))`); applies the hex amplifier hooks
(`pushCurveSuccessAmplifier`/`pushCurveFailureAmplifier`); applies `capstone_time` (×1.5 success / ×0.5
failure); returns as **delta-from-neutral**: `1.0 + (baseMult−1.0)·amplifier`. (Structure mapped; the
numbers' balance is explicitly out of scope.)

**Three consumers — consistent depth/outcome semantics:**
- `onBank` (RM:1112): `getPushMultiplier(_pushDepth, 'success')` → flow.
- `onPushFailure` (RM:1095): `getPushMultiplier(_pushDepth + 1, 'failure')` → flow.
- `calculateKiReward` (RM:1238): `getPushMultiplier(result.pushDepth, outcome)` → interest ki, where
  `outcome = penaltyApplied ? 'failure' : 'success'`.

These are **consistent**: bank uses resolved depth/success; failure uses depth+1/failure (the in-flight
push); ki-reward mirrors whichever outcome the round had (`penaltyApplied` ⇒ failure). The depth+1-on-
failure convention is the one subtlety, and it's correctly applied in both the flow (onPushFailure) and
the ki (via `penaltyApplied`+stored `pushDepth`) paths. **Ownership note (for F4.24b, not a move):**
`getPushMultiplier` + `PUSH_CURVE` are run-economy (flow/ki) math and sit correctly in RunManager; no
spirit/scoring displacement.

## Part 4 — The GRM↔RunManager seam (the central architectural question)

**Today's split (by the canonical-home rule):**
- **GRM owns:** round-local state (all 8 fields; reset each round), the three decision exits, the
  *deal/resource* curve (`_getNextPushDealCount`, count-indexed), push-success *detection* (2058), and
  `_buildRoundEndResult` (carries `pushDepth`/`penaltyApplied` out to GameScene).
- **RunManager owns:** the *flow* handlers (`onPushSuccess`/`onPushFailure`/`onBank`, which mutate
  `this._flow`), the `PUSH_CURVE` + `getPushMultiplier`, and `calculateKiReward` (interest). This is
  run-economy — correctly RunManager's.

That split is **principled** (round-local state → GRM; flow/ki economy → RunManager) — **with ONE
entanglement:**

**`_pushDepth` is a GRM field that RunManager mutates.** `run.onPushSuccess(this)` does
`roundManager._pushDepth++` (RM:1083) — RunManager reaching into and writing GRM's round-local state.
GRM resets it (262) and reads it (696/1160/2178); RunManager increments it (1083) and reads it
(1095/1112). The cross-call passes `this` (the GRM) so the flow handler can both bump the depth and
mutate flow in one place. `onPushFailure`/`onBank` only **read** `roundManager._pushDepth` (no mutate).

**Is it clean or entangled?** It's a *narrow* entanglement: exactly one cross-file write (the `++`).
`_pushDepth` is round-local (resets each round) so **GRM is its correct owner** by the canonical rule;
RunManager writing it is the displacement. **No import cycle** — RunManager does **not** import
GameRoundManager (confirmed: RM imports spirits/cards/consumables/HexEffects/SpiritEffects/blessings
only); the cross-call is a runtime duck-typed param, not an import edge, so **push/bank contributes
nothing to cycle #2** and doesn't touch accepted cycle #1.

**The clean alternative (candidate [FIX], for Robert to rule):** GRM increments its **own** `_pushDepth`
in the push-success block (2059–2061), then calls `run.onPushSuccess()` purely for the flow/hex side;
the read-only handlers take **depth as a param** (`run.onBank(depth)` / `run.onPushFailure(depth)`)
instead of the whole GRM. Result: RunManager never reads/writes GRM internals — it operates on a number
+ its own flow. **Behavior-preservation constraint:** the ordering at 2061 (depth++ → hex `onPushSuccess`
→ later econ_reward sees post-hex ki) must be preserved; verify no hex `onPushSuccess` reads `_pushDepth`
before deciding the increment's position. This is a real but contained campaign.

## Part 5 — Verdict (the ruling surface)

**Push/bank is structurally COHERENT** (the GRM-state / RunManager-economy split is the right shape and
the curve consumers are consistent) **but carries cleanup + one ownership question.** Candidate
campaigns, smallest-first:

1. **(L) Remove 3 vestigial fields — `_atRiskScore`, `_pigDoubleKi`, `_roundEndingAfterDecision`.**
   All write-only (never read). `_pigDoubleKi` also drags a stale "Pig: double round-end ki" comment +
   dead `pigDoubleKi` plumbing in `_buildRoundEndResult` (1161/2179) + a getter (153); `zodiac_pig`
   actually does flat +10 ki. **[FIX], low risk** (deleting reset+writes+plumbing of read-nothing
   fields). *Caveat:* `_roundEndingAfterDecision` has a deferral JSDoc and 4 writers — confirm during
   the campaign that the deferral is fully handled by the `yaku_decision` machine + `roundOver` checks
   (recon says yes: nothing reads the flag) before deleting. Flag, do NOT remove here.
2. **Decouple the `_pushDepth` seam** (Part 4): GRM owns/increments its own depth; flow handlers take
   depth as a param. **[FIX], behavior-preserving** (ordering constraint noted). Removes the one
   cross-file write into GRM state. Medium care; isolate to its own campaign.
3. **Legibility/naming (cosmetic):** document the `_pushCount` (deal curve) vs `_pushDepth` (flow curve)
   distinction at the fields + curves; fold the `_dogProtection`/`zodiac_rabbit` mismatch (obs #10) in.
   Candidate-C-adjacent; lowest priority.

**Ruling questions for Robert:**
- **Q1 — `_pushCount` vs `_pushDepth`:** keep both (recon says two real axes), yes? Add clarifying
  docs/names, or leave?
- **Q2 — `_pushDepth` ownership:** move the increment into GRM (it owns the field) and param-ize the
  flow handlers (campaign 2), or accept-and-document the current RunManager-writes-GRM cross-call?
- **Q3 — the 3 vestigial fields:** confirm removal (campaign 1), or are any of them a reserved seam for
  an imminent feature (e.g. `_atRiskScore` for a UI "at-risk" readout, `_pigDoubleKi` for an
  unimplemented Pig variant)? If reserved, keep + document; if abandoned, delete.
- **Q4 — `getPushMultiplier` home:** stays in RunManager (recon says yes — run-economy), confirm?

**(L) latent issues:** none that mis-behave — the 3 vestigial fields are *dead*, not *wrong* (no bug,
just clutter). The `_pushPenaltyActive` invariant is intact. No incorrect transitions or curve
inconsistencies found.

**F4.24b readiness:** this gives the terminal ARCHITECTURE.md the **flow-engine narrative** (the three
exits, the two-curve model count/deal vs depth/flow, the push-success-detection→flow-resolution
sequence) and the **seam disposition** (GRM-state / RunManager-economy with the one `_pushDepth`
cross-write to resolve). Open before F4.24b: Robert's Q1–Q4 rulings, and execution (or explicit
acceptance) of campaigns 1–2 so the doc describes a settled seam.
