# Test Harness Gotchas — standing reference for F4.20 migration prompts

**Purpose:** Front-load the sharp edges of the headless Vitest harness so Claude Code does NOT
rediscover them mid-task (each rediscovery costs real tokens — see the F4.20 #2 reward.test.js
session, where ~40k tokens went to discovering two of these live). Append the relevant subset
to every migration prompt's test section. Add new entries as they're found.

---

## Harness basics (the model)
- Vitest, headless — the engine runs in Node, no Phaser. `makeRound({...})` seeds a
  deterministic round; `run` is the RunManager singleton; `playRoundToEnd(grm)` plays out.
- `makeRound` options: `{ spiritIds: [...] }` (equip by id, stackCount 1) OR
  `{ spirits: [{ id, stackCount }] }` (explicit stacks) OR `{ spirits: [{ id, stackCount }],
  deckCardIds: [...] }`. `deckCardIds` seeds a deterministic deck (first 8 = hand, next 8 =
  field, rest = draw pile in order).

## Assertion targets
- **Assert on the SPECIFIC resource the event moves, NEVER on `hand.size`** (noisy — draws,
  discards, catcher rescues all perturb it). For a ki effect assert `run.ki` delta; for a
  counter assert the spirit's accumulator via `aggregateNumericState(spirit, 'fieldName')`.
- Accumulator spirits: assert through `aggregateNumericState` / `aggregateArrayLength`, not raw
  `spirit.state` (per-element vs negative-snapshot shapes differ).

## Spirit seeding
- **`addSpirit` / `makeRound` do NOT run `_initSpiritState` / `_initSpiritElements`.** A spirit
  needing seeded state won't have it. Use the shared **`equipSpiritWithState(id, { state })`**
  (simple-state spirits) or **`equipSpiritWithState(id, { elements: [{ key: 0 }] })`**
  (accumulator spirits — accumulators read per-element arrays).
- Negatives: seed with `run.addSpiritDirect({ id, isNegative: true, stackCount, powerLevel })`
  to test the negative path / exclusion.

## Yaku & scoring (the expensive ones — discovered in F4.20 #2)
- **Yaku thresholds are PROPORTIONAL to deck composition** (`getProportionalYakuThreshold` via
  `_getCaptureThresholds()`), NOT the fixed ScoringEngine defaults. A hand-crafted "two specific
  yaku" deck is therefore FRAGILE — the threshold shifts with the deck you built, so a deck you
  think reaches Hikari-at-2 may reach it at a different count. **Don't hand-craft multi-yaku
  decks to hit a precise yaku sequence.** Either accept that a single yaku triggers at whatever
  the proportional threshold is, or white-box (below).
- **`pushOn()` marks the triggering yaku's cards as spent** (`_spentCardIds`) so the SAME yaku
  can't re-trigger next turn. So after a push you can't simply "reach the same yaku again" to
  drive a push-success — the cards are spent and `_yakuBeforeTurn` holds the standing yaku.

## White-boxing a push-success (the proven recipe)
To drive the real `pushSucceeded` branch in `_finalizeTurn` deterministically without a
fragile multi-yaku deck:
1. Reach any yaku (single yaku on a simple deck is fine — `yaku_decision`).
2. `grm.pushOn()` — sets `_pushPenaltyActive = true`, `_pushCount = 1`.
3. Play a card, then BEFORE `playDeckPhase()`:
   `grm._spentCardIds = new Set();` (un-spend the standing yaku's cards) and
   `grm._yakuBeforeTurn = new Set();` (let the standing yaku count as "new" this turn).
4. `grm.playDeckPhase()` → `_finalizeTurn` sees `newYaku>0 && _pushPenaltyActive` → real
   `pushSucceeded` branch fires (and any `_fireSpiritHook('onPushSuccess')` with it).
Clearly comment such a test as a deliberate white-box exercise of the branch.

## Phase machine quick facts (for driving turns)
- `playHandCards([id])` → `playDeckPhase()` is one turn. Phase goes `idle`→`awaiting_deck`→
  (`idle` | `yaku_decision` | `round_over`).
- From `yaku_decision`: `bankScore()` (ends round), `pushOn()` (continue, arms penalty), or
  `continuePlay()` (only valid/offered when yaku are DISABLED — forces `newYaku=[]`).
- Round ends when hand empties (capture mode has no play counter). `_checkRoundEndOnEmptyHand()`
  is the consumable-empty-hand path.

## Round-end / discard (from F4.18b, F4.17)
- Four round-end triggers unify through `_endRound(trigger)`:
  `'banked' | 'natural' | 'forced_auto_bank' | 'consumable_empty_hand'`.
- All discards route through `_discardCard(card, source)`; batch `_discardCards(cards, source)`
  returns the actually-discarded (not catcher-rescued) subset.
- `HandManager.add` SILENTLY CLAMPS to `maxSize` (does NOT throw). `DeckManager.draw(n)` SPLICES
  the pile first — over-drawing past hand room LOSES cards (drawn-then-dropped), so draw sites
  clamp to `availableSlots`.

## Escalation (when a test won't cooperate)
See the standing "test-friction escalation rule" in the prompt boilerplate: if a test fails for
HARNESS/CONSTRUCTION reasons (not a real defect in the shipped change) and ONE targeted fix
doesn't resolve it, STOP and report (what you're testing, the blocking constraint, 1–2 candidate
strategies) rather than iterating solo. A failing assertion that reveals a REAL bug in the
change is the opposite — keep diagnosing that.
