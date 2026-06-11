# Hand-Capacity Consolidation — Inventory & Triage (Pass 1)

> **✅ CLOSED / ARCHIVED 2026-06-10.** Candidate D (hand-capacity consolidation) complete
> (E1/E1b/E1c/E2). Durable record: DECISIONS_LOG `D-F4-HANDCAP-TIER3`. Surfaced Candidate H
> (consumable-consumption-consistency). Retained as the pass record — **do not edit**.

> Standing reference for **Candidate D** (Phase 4, Tier 3 — the item after the scoring-loop pass).
> Seeded from the opening recon + the design rulings made in the kickoff discussion. Status: LIVE
> during the pass; archive at pass close-out.
> Companion to: the opening recon brief, DECISIONS_LOG `D-F4-HANDCAP-TIER3` (the durable record,
> written at close-out). Inherits **N2** from `D-F4-SCORING-TIER3` (the stamp-draw leak).

## 1. Result headline

The candidate's "two competing cap fields" framing is **REFUTED**; its "fragmentation" thesis is
**CONFIRMED but reshaped**. There is **one real cap** (`HandManager.maxSize`, reset every round at
`startRound`) and **one vestigial field** (GRM `_handSizeCap`, never assigned anywhere — only read as
`?? 99`). And there is **one bug with eight instances**, not the three N2 stamp branches.

**The single bug.** Eight hand-growth sites do `_hand.add(_deck.draw(n))`. `DeckManager.draw(n)`
**splices** n cards out of the pile; `HandManager.add` then clamps to the cap and silently drops the
overflow. So on a full (or nearly-full) hand, the overflow cards are **removed from the deck but never
added to the hand — lost for the round** (the splice-then-drop hazard the F4.17 ledger already
documented for Horse). The **hand** behavior is correct everywhere today (it always caps); the **deck**
loses cards it shouldn't.

**The fix is uniform and deck-integrity-only.** A canonical `_drawIntoHand(want)` draws only
`min(want, drawPileSize, availableSlots)`, so turned-away cards **stay in the deck** instead of being
spliced-and-dropped. Observable **hand** behavior is unchanged at every site; only **deck** integrity is
restored (the turned-away card remains drawable later that round).

**No cap ever rises.** (Corrected from the recon's framing.) Deals respect the cap — that is intended
behavior, not a bug.

## 2. The corrected design model (Robert's rulings — the canonical reference)

Two independent blessings, neither crossing into the other:
- **`plus_hand_size` (Scholar/Fukurokuju)** raises the **cap** (`maxSize`). It does NOT change deal
  quantity. Its value is *headroom*: after a full 8-card deal, a +1 cap leaves a slot free for a
  *non-deal* draw (consumable / stamp / Osprey) to land.
- **`plus_deal_count` (Fisherman/Ebisu)** raises **deal quantity** across all deals (initial + pushes),
  but **deals still respect the cap**. +1 deal on the initial deal is mostly wasted (deal 9 into an
  8-cap → 8); its real value is on *push* deals, where the hand has room (6/3/2 instead of 4/2/1).

**Ruling — deals respect the cap (NOT "cap rises to fit the deal").** A bonus deal that exceeds the cap
correctly yields a full hand and no more. The two blessings reach their combined maximum only TOGETHER
(deal-count gives cards to deal; hand-size gives room to hold them). **No cap-raising edit. Neither
blessing's behavior changes.** The only defect at the initial-deal site is the deck-leak (splicing the
undealt card out of the pile) — fixed by drawing only what fits.

**Ruling — `sym_osprey` respects the cap.** When the hand is full, Osprey does NOT pull the deck-flip to
hand; the flip falls through to normal field placement (and nothing is lost). This is the existing
else-branch — Osprey is a draw-layer interception that runs *before* field placement, so "don't
intercept when full" = "let the flip go to the field," which is the intended "first N flips to hand"
semantics. Falls out of the helper naturally (`availableSlots === 0` → draw nothing → fall through).

## 3. The two hand-size numbers (disambiguation — verified)

| Field | Where set | Writers | Readers | Governs | Verdict |
|-------|-----------|---------|---------|---------|---------|
| **`HandManager.maxSize`** | `startRound` (GRM, ~408): `= applyHook('modifyHandSize', HAND_SIZE + plus_hand_size_bonus, …)` | startRound only | `availableSlots`, `isFull`, `add` clamp | the hard cap | **REAL — the one true cap.** Constructor `{maxSize:16}` is DEAD (overwritten before any add); the "16 for push accumulation" comment is stale. |
| **`_handSizeCap`** (GRM) | never assigned (repo-wide) | none | Osprey gate `?? 99` only | nothing (`?? 99` ≈ no cap) | **VESTIGIAL — delete.** |
| *deal size* (`_initialDeal`, local) | `startRound` (~409): `applyHook('modifyCardsDealt', maxSize + plus_deal_count_bonus, …, 'initial')` | startRound | the initial deal | how many dealt at round start | real value, not a stored field |
| *push deal* (`_getNextPushDealCount`) | per push: `(4/2/1) + plus_deal_count_bonus`, then `modifyCardsDealt(…, 'pushN')` | — | `pushOn` | push redraw count | real value; already clamped (see §4) |

`modifyHandSize` feeds the **cap**; `modifyCardsDealt` feeds the **deal**. Two different numbers off a
shared base. The deal can exceed the cap (bonus deal) — and that's **correct** (§2).

## 4. Hand-growth site inventory (8 leak + 3 already-correct = 11 total)

`_hand.add(_deck.draw(n))` with no `availableSlots` pre-clamp = **LEAK** (splice-then-drop). With the
`min(…, availableSlots)` clamp = **CLAMP ✓** (the `zodiac_horse` / `pushOn` convention).

| Site | file:line (re-grep) | Current | Class |
|------|--------------------|---------|-------|
| Initial deal | GRM ~410 | `add(draw(_initialDeal))` | **LEAK** (only when deal>cap, i.e. `plus_deal_count` active) |
| Push redraw (`pushOn`) | GRM ~724 | `min(dealCount, drawPileSize, availableSlots)` | CLAMP ✓ (reference) |
| Catcher (`game_catcher`) | GRM ~1229 | gate `availableSlots > 0`, add 1 (field card, not a deck draw) | CLAMP ✓ |
| Horse redraw | ConsumableEffects ~146 | `min(handSize, drawPileSize, availableSlots)` | CLAMP ✓ (the pattern source) |
| Stamp discard `fireDraw` | GRM ~1112 | `min(1, drawPileSize)` | **LEAK** (N2) |
| Stamp capture (orange) `fireDraw` | GRM ~1718 | `min(1, drawPileSize)` | **LEAK** (N2) |
| Stamp yaku (red) `fireDraw` | GRM ~2148 | `min(1, drawPileSize)` | **LEAK** (N2) |
| Glory (`onCaptureComplete`) | GRM ~1696 | `min(intent.draw, drawPileSize)` | **LEAK** |
| Osprey deck-flip→hand | GRM ~1885/1889 | gate `< (_handSizeCap ?? 99)`; add | **LEAK** + the dead-field gate (Ruling: respect cap) |
| Consumable draw-2 (Rat-style) | ConsumableEffects ~45 | `min(2, drawPileSize)` | **LEAK** |
| `zodiac_dog` retrieve | ConsumableEffects ~224 | `min(2, discards.length)`, splice from **DISCARD** pile | **LEAK** (DISCARD-pile source — see §5) |

`HandManager.add` (the backstop) silently clamps; its JSDoc is now accurate (F4.17#5 fixed the stale
RangeError claim).

## 5. The `zodiac_dog` exception (do NOT force it through the draw-pile helper)

`zodiac_dog` retrieves from the **discard pile** (`_allDiscards`), LIFO via `splice`, not the draw pile.
So `_drawIntoHand(want)` (which clamps against `drawPileSize` and draws from `_deck`) does NOT fit Dog.
Dog needs `min(2, discards.length, availableSlots)` against the discard pile. Options: give the helper a
source parameter, OR give Dog its own correctly-clamped retrieval. Either way Dog's leak is "loses a
card from the discard pile permanently" (worse than the draw-pile sites, where the card returns next
round via `resetWithCards`) — so Dog is worth fixing, just not via the draw-pile helper. **Recon/campaign
must handle Dog distinctly.**

## 6. N2 blast-radius (the leak is the only failure mode)

No site OVER-fills (`add` always clamps), so there is no over-cap state any downstream code wrongly
assumes can't happen — the failure mode is uniformly "silent lost card," never corruption or crash. A
leaked draw-pile card just shrinks the round's pool and returns next round (`resetWithCards` re-copies
the persistent deck); Dog's discard-pile leak is the one permanent loss. Round-end-on-empty-hand and
deck-exhaustion read live sizes, so a leak only shrinks the pool, never corrupts an invariant.

## 7. The canonical helper + the contract

```
_drawIntoHand(want) {                 // → { drawn, leftover }
  const n = Math.min(want, this._deck.drawPileSize, this._hand.availableSlots);
  const drawn = n > 0 ? this._deck.draw(n) : [];
  if (drawn.length > 0) this._hand.add(drawn);
  return { drawn, leftover: want - drawn.length };
}
```
`HandManager.add` keeps its silent-clamp backstop. With the helper clamping *before* drawing, callers
can trust `availableSlots` and need no bespoke pre-check. The helper makes `add`'s clamp a pure
backstop, never the thing that drops a card. (No need to make `add` return-what-it-dropped — skip that
unless a logging need emerges.) RunManager stores no cap field; it only supplies inputs (the
`plus_hand_size` / `plus_deal_count` blessing counts read at `startRound`), so the helper is GRM-side
with no RunManager change — but the consolidation must preserve those inputs unchanged.

## 8. Campaign plan ([PRESERVE]-for-hand throughout; deck-integrity [FIX])

> **✅ FINAL — ALL SHIPPED (2026-06-10). Durable record: DECISIONS_LOG `D-F4-HANDCAP-TIER3`.**
> - **E1** (commit `c9e22c2`): `_drawIntoHand` + 6 draw-pile leak sites routed. SHIPPED.
> - **E1b** (with E1): `zodiac_dog` discard-pile clamp. SHIPPED. (Full-hand → `success: false`,
>   block-and-retain — PROVISIONAL pending **Candidate H**, surfaced by this pass.)
> - **E1c** (commit `a6dbca2`, isolated): `sym_osprey` respects the cap; `_handSizeCap` deleted. SHIPPED.
> - **E2** (commit `2ec9cfb`): dead `maxSize:16` default removed; push redraw + Horse routed. SHIPPED.
> - **Tests:** new `test/hand_capacity.test.js` (helper contract + Dog + both Osprey partitions); three
>   Glory/negatives expectations flipped to the deck-integrity [FIX] numbers (`count` 2→1, deck −2→−1).
>   Build green; suite 134 passed / 1 skipped.


Re-read of the recon's [PRESERVE]/[FIX] labels under the corrected model: every leak fix is
**[PRESERVE] for the HAND** (hand contents identical pre/post) and **[FIX] for the DECK** (turned-away
card now stays in the deck instead of vanishing). The verification bar is therefore "hand identical +
deck retains the turned-away card," NOT "hand changes." Osprey is the one site whose non-hand behavior
changes (full-hand flip now reaches the field rather than being lost — arguably also deck/field
integrity, not hand behavior).

- **E1 — introduce `_drawIntoHand`; route the draw-pile leak sites.** Stamp discard/capture/yaku +
  Glory + Rat-style consumable + the initial deal. [PRESERVE]-hand / [FIX]-deck. Verify: hand identical;
  deck retains the turned-away card at a full hand. (The N2 fix lives here.)
- **E1b — `zodiac_dog`** (discard-pile retrieval): give it a correctly-clamped retrieval (helper with a
  source param, or its own clamp). [FIX]-deck (stops the permanent discard-pile loss). Small, isolated
  because it's the discard-pile variant.
- **E1c — Osprey** (Ruling: respect the cap): route through the helper so a full-hand flip isn't pulled
  (falls through to field placement); delete the vestigial `_handSizeCap` read. Isolated because it's
  the one genuine non-hand behavior change. NOTE: this touches the SAME `_doDeckPhase` block as the
  separate banked "Osprey deck-flip-interception → SpiritEffects hook" migration — E1c does NOT migrate
  Osprey to a hook (no deck-flip seam exists); it only fixes the cap gate + leak in place. Keep the two
  concerns distinct.
- **E2 — tidy [PRESERVE] (byte-identical).** Route the 3 already-clamping sites through the helper for
  uniformity (optional — cosmetic); delete the dead `maxSize:16` constructor default + stale "push
  accumulation" comment; delete the now-unused `_handSizeCap` field entirely.

Keep E1c isolated (the one behavior change) from E1/E2, per the scoring-pass discipline (the one
behavior change lands separately verified).

## 9. Process notes

- **No cap ever rises** — the fix is "draw only what fits so the deck doesn't leak," not "fit a bigger
  hand." If any edit raises a cap, it's wrong — STOP.
- Deals respecting the cap is INTENDED (§2). The initial-deal "leak" is a *deck* defect only; the hand
  (8) is correct and must stay 8.
- `zodiac_dog` draws from the DISCARD pile — do not route it through a draw-pile-only helper (§5).
- Osprey's cap-gate fix is distinct from the Osprey-deck-flip-hook migration (different concern, same
  code block) (§8 E1c).
- Re-grep all line numbers (the scoring pass shifted GRM; the recon's are point-in-time).
- Verification bar: **hand identical pre/post** at every leak site; deck retains the turned-away card.
  Osprey full-hand: flip reaches field, nothing lost.
