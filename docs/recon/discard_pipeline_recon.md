# Recon (F4.17): Discard Pipeline Map + Asymmetry Matrix + `onFieldDiscard` Design

**Status:** READ-ONLY recon. No `src/**` changes. Verified against current code on
branch `main` (commit `e91ad1c`), 2026-06-06.

**Design principle (Robert, confirmed):** *all discards are equal* — every discard,
regardless of source, should fire the same complete set of discard-triggered effects.
F4.17 unifies the currently-divergent paths into one canonical pipeline.

> ⚠️ **Major correction to the task premise up front.** The task brief states that
> hex_51 (`deck_flip_revealed`) reveal-miss "BYPASSES catcher, recycling, ship, AND
> stamps entirely." **This is STALE.** In the current code the reveal-miss path returns
> `{ discarded: true }` from `_addFlippedCardToField` and the caller funnels that straight
> into `_handleFieldDiscard(deckCard)` — the *same* method deck-overflow uses. So hex_51
> reveal-miss currently fires the **full** discard set (catcher, recycling, ship, stamp
> dispatch, all bookkeeping). It is already unified with deck-overflow. Details in
> Section 6. This materially changes the matrix and the feasibility verdict.

---

## Section 1 — Discard site inventory

Every code path that removes a card "as lost" (pushes to `_allDiscards` /
`_discardedThisTurn`, increments `_discardCount`, or clears cards to the discard pile).

| # | Site | File:line | Trigger | Max cards | Description |
|---|------|-----------|---------|-----------|-------------|
| 1 | `_handleFieldDiscard(card)` | `GameRoundManager.js:1170` | Deck-flip overflow: a flipped deck card has no field room (or hex_51 reveal-miss, see #6) | 1 per call; called up to 2×/turn (double-flip) | Canonical, most-complete path. Fires catcher → bookkeeping → recycling → ship → stamp dispatch. |
| 2 | Hand-play overflow loop | `GameRoundManager.js:662‑679` (inside `playHandCard`) | `field.playHandCards` returns `discarded:true` — played card(s) have no field room and aren't Wood | All played cards in the play (1–2 typically) | Fires bookkeeping + recycling + ship + stamp dispatch. **No catcher.** |
| 3 | `zodiac_horse` | `ConsumableEffects.js:96‑129` | Consumable: discard whole hand, redraw equal count | Whole hand | Fires `_allDiscards` push (only) + ship + stamp dispatch + empty-hand check. **No catcher, no recycling, partial bookkeeping.** |
| 4 | `zodiac_monkey` | `ConsumableEffects.js:139‑172` | Consumable: capture a field slot, discard equal count from hand (oldest first) | min(captured, handSize) | Fires `_allDiscards` push (only) + stamp dispatch + empty-hand check. **No catcher, no recycling, no ship, partial bookkeeping.** |
| 5 | `zodiac_ox` | `ConsumableEffects.js:38‑53` | Consumable: clear a stranded stack from one field slot | Whole slot stack | **NEW site not in the known list.** Pushes cleared cards to `_allDiscards` only. Fires **none** of catcher/recycling/ship/stamps; no `_discardCount`/`_discardedThisTurn`; no empty-hand check. (Borderline — these are *field* cards cleared, not hand/deck cards; see Section 8.) |
| 6 | hex_51 reveal-miss | `GameRoundManager.js:1203‑1211` → routed to #1 at `:1874/:1907/:1919/:1937` | `deck_flip_revealed` active + flipped card matches no field slot | 1 per flip | **Routes through `_handleFieldDiscard` (site #1).** Fires the full set today (contra the stale brief). See Section 6. |

**Not discard sites (verified, noted to prevent confusion):**

- **`sym_osprey`** (`GameRoundManager.js:1772‑1790`): intercepts the *first N deck flips of
  the round* and routes the deck card to **hand** instead of the field — a **draw-layer**
  interception that happens *before* any field-placement/overflow logic runs. It never
  reaches a discard. **Genuinely separate from the discard system; out of scope for F4.17.**
- **`zodiac_dog`** (`ConsumableEffects.js:183‑193`): the *inverse* of a discard — `splice`s
  cards back **out** of `_allDiscards` into the hand. Coupled to the discard pile's shape
  (see Section 8 risk).

---

## Section 2 — The asymmetry matrix (core deliverable)

Columns are the discard-triggered effects. `_dispatchStampDiscardEffects` is shown as one
column because every site that fires stamps dispatches them through that single method (so
all stamp colors fire or none do — per-color breakdown is in Section 3).

Legend: ✅ fires · ❌ doesn't · ⚠️ partial/conditional.

| Discard site | `game_catcher` (intercept→hand) | `econ_recycling` (+5 ki/stack) | `engine_ship` (`cardsDiscarded`++) | stamp dispatch (`_dispatchStampDiscardEffects`) | `_discardedThisTurn` | `_allDiscards` | `_discardCount`++ | `_checkRoundEndOnEmptyHand` |
|---|---|---|---|---|---|---|---|---|
| **1. `_handleFieldDiscard`** (deck overflow) | ✅ | ✅ (`recycling_discard`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (n/a — deck card, hand not emptied) |
| **2. Hand-play overflow** | ❌ | ✅ (`recycling_overflow`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **3. `zodiac_horse`** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **4. `zodiac_monkey`** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **5. `zodiac_ox`** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **6. hex_51 reveal-miss** | ✅ (via #1) | ✅ (via #1) | ✅ (via #1) | ✅ (via #1) | ✅ | ✅ | ✅ | ❌ |

**What the unification makes uniform (each ❌→✅ is a deliberate [FIX] to flag + test):**

- **Catcher** must become available on sites 2, 3, 4 (and 5 if in scope). Today only the
  deck-overflow path (1 & 6) can intercept. (Robert: catcher should intercept on ALL sources.)
- **Recycling** must fire on sites 3, 4 (and 5 if in scope). The two ki reasons
  (`recycling_discard` vs `recycling_overflow`) must unify to one.
- **Ship** must fire on sites 4, 5 (if in scope). Site 3 already fires it **inline** — that
  inline copy is removed once the hook fires on the unified path (else double-count).
- **Stamp dispatch** must fire on site 5 (if in scope). Sites 1/2/3/4/6 already dispatch.
- **Bookkeeping** must become uniform: sites 3, 4, 5 push only `_allDiscards` and skip
  `_discardedThisTurn` + `_discardCount`. After unification all sites bump all three (this
  affects `engine_ship`-adjacent counters? no — but affects round-end `roundDiscardCount`
  reporting and any future discard-count spirit). **[FIX] — flag: changes `_discardCount`
  semantics for consumable discards.**
- **Empty-hand check** is fired by consumables (3, 4) but not by overflow paths (correct —
  overflow doesn't empty the hand). The canonical method should let the **caller** decide
  (see Section 5).

---

## Section 3 — Stamp discard effects inventory

`_dispatchStampDiscardEffects(card)` — `GameRoundManager.js:1053‑1069`. Full body:

```js
_dispatchStampDiscardEffects(card) {
  if (!card.ribbonStamp) return;
  const stamp = card.ribbonStamp;
  const fireCons = stamp === 'stamp_blue';
  const fireKi   = stamp === 'stamp_green';
  const fireDraw = stamp === 'stamp_purple' || stamp === 'stamp_black' || stamp === 'stamp_gray';
  if (!fireCons && !fireKi && !fireDraw) return;
  const fireCount = 1 + this._computeRetriggerCount(card, 'discard');
  for (let rt = 0; rt < fireCount; rt++) {
    if (fireCons) run.generateRandomConsumable();
    if (fireKi) run.addKi(3, `${stamp}_discard`);
    if (fireDraw) {
      const drawN = Math.min(1, this._deck.drawPileSize);
      if (drawN > 0) this._hand.add(this._deck.draw(drawN));
    }
  }
}
```

| Stamp | Discard-triggered effect |
|-------|--------------------------|
| `stamp_blue`   | Generate a random consumable (`run.generateRandomConsumable()`) |
| `stamp_green`  | +3 ki (`run.addKi(3, 'stamp_green_discard')`) |
| `stamp_purple` | Draw +1 (deck → hand), capped at draw-pile size |
| `stamp_black`  | Draw +1 |
| `stamp_gray`   | Draw +1 |
| `stamp_white`  | *No direct discard effect* — contributes **retrigger** only (see below) |
| others         | No discard effect |

**Retrigger handling** — `_computeRetriggerCount(card, 'discard')` (`GRM:1020`):
`stamp_white` → +1, `stamp_gray` → +3 retriggers, **plus** any spirit `getRetriggerCount`
hook for `triggerType === 'discard'`. So `fireCount = 1 + that`. Note `stamp_gray` both
*fires* a draw and *retriggers ×3* (it appears in both `fireDraw` and the retrigger table).

**Which sites call `_dispatchStampDiscardEffects` today:** 1, 2, 3, 4, 6 (✅). Site 5
(`zodiac_ox`) does **not** (❌). Confirmed against the matrix.

---

## Section 4 — The three migrating spirits (F4.20 overlap)

### `econ_recycling` — +5 ki/stack per discard

- **SpiritEffects shape:** `econ_recycling: {}` (`SpiritEffects.js:521`) — **no hook, no
  applyEngine, no state.** Purely inline at the discard sites. Init: none (stateless;
  driven by `run.countStackedById('econ_recycling')`).
- **Inline implementations:**
  - `_handleFieldDiscard` (`GRM:1186‑1187`): `5 * countStackedById('econ_recycling')` ki,
    reason **`recycling_discard`**.
  - Hand-overflow loop (`GRM:669‑670`): same amount, reason **`recycling_overflow`**.
  - **Absent** from horse/monkey/ox.
- **Maps to `onFieldDiscard`** trivially: pure side-effect → hook reads
  `run.countStackedById('econ_recycling')` (or `effectivePower(spirit)` for the per-spirit
  form) and calls `run.addKi(5 * stacks, 'recycling_discard')`. **Unify the two reasons to
  `recycling_discard`** (drop `recycling_overflow`). Note: if implemented as a per-spirit
  hook it fires once per equipped `econ_recycling` object; today's inline uses
  `countStackedById` once — verify the hook multiplies by stacks (not by spirit-count ×
  stacks) to avoid over-paying.

### `engine_ship` — `cardsDiscarded` counter (+0.3 mult-mult/card)

- **SpiritEffects shape** (`SpiritEffects.js:1155‑1164`):
  ```js
  engine_ship: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) { /* transcend math: preTranscendTotal + newEvents*0.3*power */ }
      const n = aggregateNumericState(spirit, 'cardsDiscarded');
      return n === 0 ? null : { multiplyMult: 1 + n * 0.3 };
    },
  },
  ```
  Plus the transcend snapshot at `SpiritEffects.js:282`
  (`snapshotCat1Linear(... 'cardsDiscarded', 0.3, 'multiplyMult')`).
- **State init:** `RunManager.js:63` → `engine_ship: () => ({ cardsDiscarded: 0 })`.
- **Inline counter increments (`incrementPerElement(spirit, 'cardsDiscarded', 1)`):**
  - `_handleFieldDiscard` (`GRM:1189‑1193`)
  - Hand-overflow loop (`GRM:672‑676`)
  - **`zodiac_horse` (`ConsumableEffects.js:108‑113`)** ← the inline copy to remove once the
    hook fires on the unified path.
  - **Absent** from monkey/ox.
- **Maps to `onFieldDiscard`:** pure counter → hook calls
  `incrementPerElement(spirit, 'cardsDiscarded', 1)` once per discarded card. **Remove the
  Horse inline copy** (`ConsumableEffects.js:108‑113`) when migrating, or it double-counts.

### `game_catcher` — the intercepting one (overflow → hand)

- **SpiritEffects shape:** `game_catcher: {}` (`SpiritEffects.js:552`) — no hook; logic is
  entirely inline in `_handleFieldDiscard`.
- **State:** `{ catchesUsedThisRound: 0 }` — initialized in **two** places
  (`RunManager.js:520` and `:614`; see Section 8 dup note). **Per-round reset:**
  `GRM:376` (`startRound`, alongside Osprey).
- **Current logic** (`_handleFieldDiscard`, `GRM:1170‑1182`):
  ```js
  const catcherSpirits = run.allSpirits.filter(s => s.id === 'game_catcher');
  const catcherMax = run.countStackedById('game_catcher');     // max catches/round
  if (catcherMax > 0 && this._hand.availableSlots > 0) {
    const used = catcherSpirits[0]?.state?.catchesUsedThisRound ?? 0;
    if (used < catcherMax) {
      for (const c of catcherSpirits) if (c.state) c.state.catchesUsedThisRound = used + 1;
      this._hand.add([card]);
      return 'catcher';        // ← signals "card consumed, no discard"
    }
  }
  // …else fall through to actual discard
  ```
  `catcherMax = countStackedById('game_catcher')` (total stacks across copies). It writes
  `used+1` to **every** catcher object's state (keeping multi-copy state in lock-step). Gated
  on `this._hand.availableSlots > 0` so it never overfills the hand.
- **Maps to the pipeline:** catcher PREVENTS a discard, so it belongs at the **top** of the
  canonical method as an interception gate that can `return` early ("consumed"). It is *not*
  a side-effect of discarding. See Section 7 recommendation (keep it as dedicated gate logic,
  not an `onFieldDiscard` hook).

---

## Section 5 — Proposed unified pipeline shape

Single canonical entry point on `GameRoundManager`:

```js
/**
 * Canonical discard. Every discard site routes here.
 * @param {object} card
 * @param {'deck_overflow'|'hand_overflow'|'consumable'|'reveal_miss'} source
 * @returns {'catcher'|'discarded'}
 */
_discardCard(card, source) {
  // 1. Catcher interception gate (now available on ALL sources — Robert: YES).
  if (this._tryCatcherIntercept(card)) return 'catcher';

  // 2. Bookkeeping — uniform across all sources.
  this._discardedThisTurn.push(card);
  this._allDiscards.push(card);
  this._discardCount++;

  // 3. onFieldDiscard spirit hooks (recycling +5/stack, ship counter++).
  this._fireFieldDiscardHooks(card, source);

  // 4. Stamp discard-trigger effects (retrigger-aware).
  this._dispatchStampDiscardEffects(card);

  return 'discarded';
}
```

**Ordered sequence:** catcher gate (may consume → early return) → bookkeeping → spirit
hooks → stamp dispatch. Catcher *before* bookkeeping so a caught card is never counted as
discarded (matches today's `_handleFieldDiscard`).

**Design decisions:**

- **Catcher on all sources:** YES (Robert). Interception logic moves into
  `_tryCatcherIntercept` inside the canonical method. Hand-overflow, horse, monkey, (ox)
  gain it. **[FIX] — flag + test:** the hand-overflow play loop must now check catcher per
  card; and a Horse/Monkey discard may be partly caught (card returns to hand instead of
  discard pile), which changes downstream redraw/empty-hand behavior. Worth a Robert
  decision on **ordering** for Horse: catch happens *before* the redraw count is computed —
  do caught cards count against the redraw, or does Horse always redraw to original hand
  size? (Lean: redraw to original size; caught cards are a bonus.)
- **Empty-hand check stays with the caller.** Overflow paths (deck/hand) never empty the
  hand, so baking `_checkRoundEndOnEmptyHand()` into `_discardCard` would add a no-op there
  and risk an early round-end mid-play. Consumables keep calling it explicitly **after**
  their full discard batch (current behavior). Rationale: round-end-on-empty is about the
  *consumable's net hand state*, not about any single discard.
- **Consumables call the canonical method** via their `roundManager` handle:
  `roundManager._discardCard(card, 'consumable')` (or the batch form below).
- **Batch vs per-card:** provide **both** — `_discardCard(card, source)` and a thin
  `_discardCards(cards, source)` that loops. Horse/Monkey/Ox discard sets; a batch form
  keeps call sites clean and gives one place to handle "clear hand before stamp draw fires
  onto empty hand" (Horse's existing ordering constraint, `ConsumableEffects.js:102‑105`).
  Note: Horse clears the hand *before* dispatching stamp draws so drawn cards land on the
  empty hand — the batch method must preserve that (remove-from-hand happens at the call
  site, then pass the removed cards to `_discardCards`).

---

## Section 6 — hex_51 reveal-miss path (corrected)

**Where it happens:** `_addFlippedCardToField(card)` — `GameRoundManager.js:1203‑1222`:

```js
_addFlippedCardToField(card) {
  if (applyHook('discardUnmatchedDeckFlip', false)) {          // hex_51 active
    const hasMatch = this._field.getSlots().some(s =>
      s && s.state !== 'pending' && this._field.matchesSlot(card, s)
    );
    if (!hasMatch) {
      return { captured: null, discarded: true };               // reveal-miss → discarded flag
    }
  }
  const result = this._field.addFlippedCard(card);
  // …engine_moths woodSlot bookkeeping…
  return result;
}
```

The hex hook is `deck_flip_revealed` (`HexagramEffects.js:648‑651`):
`revealsDeckFlip: () => true` (preview) + `discardUnmatchedDeckFlip: () => true` (the
discard rule). Hexagram data: `hexagrams.js:19`.

**Every caller funnels `{discarded:true}` into `_handleFieldDiscard`** — at `GRM:1873‑1875`,
`:1906‑1907`, `:1918‑1919`, and the double-flip `:1936‑1937`. There is **no separate
reveal-miss discard branch**; field-full overflow and hex reveal-miss are the *same*
`discarded:true` flag handled by the *same* method.

**⇒ Current behavior (contradicts the stale brief):** hex_51 reveal-miss fires the **full**
set — catcher, recycling, ship, stamp dispatch, all bookkeeping. It is **already unified**
with deck-overflow. Routing it through the new `_discardCard(card, 'reveal_miss')` is a
mechanical rename (replace `_handleFieldDiscard` with `_discardCard`), no behavior change.

**Entanglement to note:** because reveal-miss shares the path, **catcher can intercept a
reveal-miss card** today (route it to hand instead of discarding). Under hex_51's intent ("a
non-matching reveal is discarded"), is catcher-intercept on reveal-miss desired? Mechanically
it already happens. Flag for Robert as a confirm-don't-fix item; "all discards equal"
suggests YES (keep it), and it's the status quo regardless.

---

## Section 7 — `onFieldDiscard` hook design

**Proposed signature** (consistent with `onBank`/`onRoundEnd`/`onPushFailure`/`onCaptureComplete`):

```js
onFieldDiscard({ card, source, spirit, spirits, run, roundManager })
```

Fired once per discarded card, per equipped spirit, from inside `_discardCard` (step 3),
**after** the catcher gate and bookkeeping, **before** stamp dispatch.

**Does it need a return value?** For the two side-effect tenants (recycling, ship): **no** —
they act via `run`/`incrementPerElement` and return nothing (or `null`), matching the
established side-effect hook style (`onBank`, `onRoundEnd`).

**Should catcher be an `onFieldDiscard` hook returning `{ consumed: true }`?**
**Recommendation: NO — keep catcher as dedicated gate logic inside `_discardCard`, not an
`onFieldDiscard` hook.** Reasoning:

1. **Semantics differ.** Recycling/ship are *side-effects OF* a discard that has already
   committed. Catcher decides *WHETHER* the discard happens at all — it runs *before*
   bookkeeping and short-circuits it. Mixing "prevent" and "react" in one hook forces the
   pipeline to interleave hook dispatch with the early-return decision, which is fragile.
2. **Ordering / availability gating.** Catcher needs `this._hand.availableSlots` and the
   per-round `catchesUsedThisRound` budget checked *first*, atomically, before anything
   counts the card. A gate method (`_tryCatcherIntercept`) expresses that cleanly.
3. **Single interceptor today.** Only catcher intercepts; there's no value in a generic
   "consumed" protocol yet. If a second interceptor ever appears, promote the gate to a
   `onFieldDiscardAttempt → {consumed}` hook *then* (YAGNI now).

So: **`onFieldDiscard` carries only the post-commit side-effects (recycling, ship).**
Catcher stays as `_tryCatcherIntercept` dedicated logic at the top of `_discardCard`.

`source` is passed to the hook for completeness/future source-specific behavior, but neither
recycling nor ship branch on it today (they're uniform — which is the whole point).

---

## Section 8 — Observations / risks (flag only; do NOT fix)

- **`RunManager.js:520` and `:614`** — `game_catcher` state-init
  (`{ catchesUsedThisRound: 0 }`) appears **twice** (two different init code paths). Likely
  one is the canonical `_initSpiritState` and the other a legacy branch. Confirm both are
  reached / dedupe. (Same pattern for `sym_osprey` at `:613`.)
- **Partial bookkeeping in consumables** — `zodiac_horse` (`:104`), `zodiac_monkey` (`:159`),
  `zodiac_ox` (`:50`) push to `_allDiscards` but **never** bump `_discardedThisTurn` or
  `_discardCount`. So `roundDiscardCount` (reported in round-end result, `GRM:1145/2101`)
  under-counts consumable discards today. Unification fixes this — but flag it changes that
  reported number.
- **`zodiac_ox` is a hidden discard site** not in the known-four list. It clears *stranded
  field* cards (not hand/deck), so whether it's a "real" discard for effect purposes is a
  **judgment call** — "all discards equal" arguably says yes, but field-clear ≠ hand/deck
  discard conceptually. **Needs a Robert decision** before including it in the unified path
  (it's the one site where "all discards equal" isn't obviously settled).
- **`engine_ship` double-count hazard** — Horse increments `cardsDiscarded` inline
  (`:108‑113`) *and* would get the `onFieldDiscard` hook after migration. The inline copy
  **must** be deleted in the same change that adds the hook, or Horse double-counts.
- **Two ki reasons for the same effect** — `recycling_discard` (`GRM:1187`) vs
  `recycling_overflow` (`GRM:670`). The ki-decomposition / logging cares about reason codes;
  unifying to one reason is correct but verify no UI/telemetry keys on `recycling_overflow`.
- **`zodiac_dog` couples to discard-pile internals** — `discards.splice(discards.length - count, count)`
  (`:189`) mutates `_allDiscards` directly (LIFO retrieval). Any change to how/when cards are
  pushed (e.g. if catcher intercept removes a would-be-discard) changes what Dog can pull
  back. Not a bug, but the discard pile is shared mutable state — keep Dog in mind when
  reordering pushes.
- **Catcher writes to every copy's state** (`GRM:1176‑1178`) using a single read `used`
  from `catcherSpirits[0]`. Correct as long as all copies stay in lock-step, but it's
  redundant per-copy state for a single logical counter — could be simplified to one source
  of truth during migration (optional).
- **Stamp `fireDraw` is hand-grow without a hand-cap check** — `_dispatchStampDiscardEffects`
  draws into hand with no `_handSizeCap` guard (unlike Osprey at `GRM:1777`). Possibly fine
  (discard frees a hand slot first in hand-overflow), but on deck-overflow discards the hand
  could exceed the cap via a purple/black/gray stamp draw. Flag only.

---

## Section 9 — Consolidation feasibility verdict

### Verdict: **DRIFTED** (close to CLEAN)

The sites are structurally easy to route through one method — there's already a near-complete
canonical method (`_handleFieldDiscard`) and hex_51 is *already* on it. The "TANGLED" risks
the brief feared (hex_51 bypass) **do not exist** in current code. What remains are a handful
of deliberate "which behavior is correct?" decisions, all but one already answered by *all
discards equal*:

**Divergences needing a decision (most already answered):**

1. **Catcher on consumable/hand-overflow discards** — *answered* (Robert: YES). [FIX]:
   adds interception to sites 2/3/4. Test Horse/Monkey interaction with redraw + empty-hand.
2. **`zodiac_ox` (field-clear) in scope?** — **OPEN.** Field-clear ≠ hand/deck discard.
   Needs an explicit ruling before adding it to `_discardCard`.
3. **Bookkeeping uniformity** — *answered* (uniform). [FIX]: `_discardCount` /
   `_discardedThisTurn` now include consumable discards; verify nothing relied on the old
   under-count.
4. **`recycling_overflow` → `recycling_discard` reason unify** — *answered* (unify).
5. **Empty-hand check placement** — *answered* (stays with caller).
6. **`engine_ship` Horse inline removal** — *answered* (remove inline when hook lands).

### Proposed step ordering (each independently shippable + testable)

Mirrors how F4.18b sequenced tenant-migrations *before* the merge: migrate the side-effect
tenants onto a hook first, then collapse the sites, then extend to new sources last.

- **F4.17#1 — Introduce `onFieldDiscard` hook + migrate `econ_recycling` and `engine_ship`
  off inline, ON THE EXISTING `_handleFieldDiscard` ONLY.** Add `_fireFieldDiscardHooks`,
  implement the two spirits' hooks, call it from `_handleFieldDiscard`, delete the inline
  recycling/ship blocks *there*. Hand-overflow keeps its inline copies for now (no behavior
  change yet anywhere). Unify the ki reason. *Test: deck-overflow still gives identical ki +
  ship counter.*
- **F4.17#2 — Extract `_discardCard(card, source)` + `_tryCatcherIntercept`; route
  `_handleFieldDiscard` callers and hex_51 reveal-miss through it.** Pure refactor of the
  deck-overflow + reveal-miss paths into the canonical method (catcher gate → bookkeeping →
  hooks → stamps). No new sources yet. *Test: deck overflow + hex_51 reveal-miss unchanged.*
- **F4.17#3 — Migrate hand-play overflow (site 2) onto `_discardCard`.** Replace the inline
  loop (`GRM:662‑679`) with `_discardCards(cards, 'hand_overflow')`. **[FIX]:** hand-overflow
  now gains catcher. Delete its inline recycling/ship. *Test: overflow play routes a card to
  hand when catcher has budget; ki/ship match.*
- **F4.17#4 — Migrate `zodiac_horse` and `zodiac_monkey` onto `_discardCards('consumable')`.**
  Remove Horse's inline ship copy. Preserve Horse's "clear hand before stamp draws" ordering
  and the explicit `_checkRoundEndOnEmptyHand()` after the batch. **[FIX]:** both gain
  catcher + recycling; both gain full bookkeeping. *Test: Horse/Monkey ki, ship, catcher,
  empty-hand round-end, redraw counts.*
- **F4.17#5 — (gated on the Section 9.2 ruling) `zodiac_ox`.** If Robert rules field-clear is
  a discard, route it through `_discardCards('consumable')`; else leave it as a bare
  `_allDiscards` push and document the exception.

Order rationale: #1 introduces the hook with zero behavior change (lowest risk, like the
F4.18b tenant migrations); #2 is a pure extraction; #3–#5 each turn one ❌ row of the matrix
into ✅, one shippable+testable [FIX] at a time, hardest-to-reason-about source (Horse, with
its ordering constraints) isolated to its own step.
