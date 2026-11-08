# Hanatu II — Prototype Build Spec (iteration 1: the naked round)

**Purpose:** A *throwaway feel-test*, not the game. It exists to answer, by PLAY, the feel/number
questions reasoning cannot (§7). Build it fast and ugly; the feel lives in the rules, not the render.

**Design-of-record:** `hanatu_ii_design.md` (read it first — this spec implements §§2–5 of it, minimally).

**Engine:** Phaser + Vite. **Location:** a fresh, separate folder (e.g. `~/hanatu-prototype`), NOT inside
V1's `~/hanafuda-deckbuilder/src/`. V1 stays frozen. Port the faithful hwatu modules from V1 (matching,
capture/stacking/stranding, yaku detection) — read them from V1, reimplement clean in the prototype; do
not depend on V1's code.

**Visual bar:** cards = labeled rectangles (name · month · rank · points). No art, no animation beyond
what's needed to see state change. Spartan is correct — polish would make us reluctant to throw it away.

---

## 1. What iteration 1 includes (and deliberately excludes)

**IN — the naked round:**
- One **shared deck** (player's few cards + environment's majority), deck in center.
- **Alternating turns:** player plays one card from hand → environment takes its turn (deck-flip).
- Ported **capture / stacking / stranding** rules (the shared field).
- **Four rank yaku**, detected, with visible progress thresholds on BOTH capture piles.
- The **call** (bank / push / fold) gated per §4 of the design doc.
- **Suspended pot** (pushes accumulate; cash out at round-end) with a legible running-stake display.
- **Capture-to-keep** acquisition at round-end (a first taste of "the round built my deck").
- **ONE starter spirit**, chosen from 3, hooked to a card-condition.
- **Hand-as-sanctuary (Version B):** cards in hand can't be flipped; deck cards can.
- Two capture piles mirrored (player right, environment left), deck center — the spatial asymmetry.

**OUT — reserved for later iterations (do NOT build):**
- No shop, no run structure, no between-round economy. (Test one round, or a few in a row.)
- No full rally-ladder content beyond the single escalating push mechanic.
- No dual-use-as-weapon machinery (cards are present in the shared deck, but we don't yet build the
  "flipped card fires the tide's spirits against you" system).
- No purgatory / card destruction. No variable deck size (fix it). No slot types / scarring.
- No win/loss condition for the round — just **play and see net earnings** (we test feel, not challenge).

---

## 2. Cards & deck

- **Card:** `{ id, name, month (1–12), rank (bright|animal|ribbon|plain), points, attributes:{vertical:
  air|land, temporal:day|night} }`. Attributes carried, unused in iter-1 (available to hooks).
- **Point values (flat spread — the design decision):** bright **20**, animal **10**, ribbon **5**,
  plain **1**. (We're testing whether flat-spread earnings feel right; easy to retune.)
- **Deck composition (iter-1 fixed):** one shared deck of a fixed size (start ~**48**, the hwatu deck).
  Mark each card's **owner** = `player` or `environment`. Player supplies a **minority** (say ~12–16);
  environment supplies the rest (the guaranteed majority — the structural opponent). Shuffled together.
  *(Player's cards are a fixed starter set in iter-1 — no acquisition-into-deck yet; keeps are just
  displayed at round-end.)*

## 3. The turn loop

1. **Deal** the player an opening hand from the deck (Version B — drawn like any other; no assembly).
2. **Player turn:** play ONE card from hand → resolve against the field (match → capture/pending per
   hwatu rules; no match → place in a field slot). *(One card at a time — V1's same-month multi-play is
   removed.)*
3. **Environment turn (the tide):** **flip the top deck card** → resolve against the field by the same
   rules. **This is the opponent's move — present it as such** (a beat, a highlight — the flip is the
   tide acting, not dead randomness).
4. **Capture resolution (shared field, ported + new rules):**
   - Standard hwatu month-matching: 2-card capture, stacking toward 4, stranding.
   - **New:** a deck-flip matching a card the **player just exposed this turn** → the **environment
     captures it** (exposing is a risk). A deck-flip matching a card already on the field from before →
     it **stacks** (the tide building on neutral ground). *(This Case-1/Case-2 distinction is itself a
     feel-test — if it's confusing in play, flag it.)*
   - **New:** a deck-flip completing a **3-stack** → **full environmental capture** of the stack.
   - Captures go to the capturer's pile (player-right / environment-left).
5. **Yaku check (both sides):** after each capture, check the four rank-yaku for the capturer against
   their pile. Update the visible progress gauges. **Taking a card the tide needed must visibly set back
   the tide's gauge** — make the denial legible.
6. Loop to 2 until a round-end condition (§5).

## 4. The call — gate, push, bank, fold (the heart; implement exactly)

- A completed **rank-yaku opens the call** for that side.
- **Player completes a yaku →** offer the player: **BANK** (cash the suspended pot at current terms, round
  ends) or **PUSH** (continue; the pot's bonus/penalty terms escalate one rung; play continues).
- **Environment completes a yaku →** 
  - If the **player has already opened their gate** (completed ≥1 yaku this round): it **re-triggers the
    call with advantage to the environment** — offer the player PUSH (answer it, escalate) or BANK
    (settle now).
  - If the **player has NOT yet gated:** the tide's yaku **raises the ante SILENTLY** (escalate the
    pending terms; no call offered — the gate isn't open). The player's eventual first yaku then opens
    the call at already-elevated terms.
- **FOLD is ALWAYS available** (any turn, gated or not): surrender the hand → take a small floor (iter-1:
  **0**), round ends. This guarantees the yaku-less player is never trapped.
- **Suspended pot:** maintain a running stake = (player's earned points so far) with a current
  bonus/penalty **multiplier/modifier** set by push depth and ante-raises. **Nothing cashes until
  round-end.** Display the pending pot and current terms ALWAYS, prominently.
- **The tide NEVER scores into earnings.** Its yaku only escalate ante/terms (and, later, board scars).
  Player earnings = player's own captures × the pot terms.

## 5. Round end & settlement

Round ends on: **BANK** (cash pot at current terms), **FOLD** (floor), or **DECK EXHAUSTION** (the
standoff — cash the pending pot at *reduced* terms; give it its own distinct "drew to a standstill"
presentation, not a silent default). Show a **settlement screen**: player's captured points, the pot
terms applied, the net earnings, and the **capture-to-keep** step (display captured cards; let the player
pick a gated few to "keep" — purely illustrative in iter-1, no persistence needed).

## 6. The one starter spirit (3 to choose from)

Implement the **condition-hook architecture** minimally: a spirit = `{ id, name, hook: <condition>, effect:
<fn> }`. On the relevant card-condition firing, run the player's spirit's effect. Build **three** starters
so the choice exists from turn one and the architecture is exercised by real variety:
- **e.g. "Spring Bloom"** — hook `on-capture`; if captured card's month ∈ {3,4,5}, **+5 points** to the
  pot. *(The clean seam test: the card carries no "+5"; the spirit adds it on the capture condition.)*
- **e.g. "Night Watcher"** — hook `on-capture`; if captured card's `temporal == night`, **+3 points**.
  *(Exercises the attribute system.)*
- **e.g. a defensive/denial starter** — hook `on-capture`; capturing a **bright** also **sets back the
  tide's Hikari gauge by an extra step** (or similar interference). *(Exercises the player-acts-on-the-tide
  axis — gives us a third archetype pole: aggression/economy/control.)*
Keep these trivially retunable; they're scaffolding to test the hook seam and the starter-choice feel.

## 7. The feel/number gates — what playing this must answer

Record observations against these; they are the reason the prototype exists:
1. **Does the call AGONIZE?** With a real bank/fold exit and a tide visibly closing on its own yaku, is
   "push or bank" a genuinely hard, charged decision — or flat?
2. **Does the round BREATHE?** capture(hope) → keep(pride) → push(dread) → bank(release). Or is it
   relentless / choppy?
3. **Is base earning positive and is BANK a real choice?** (Model-A sign fix in practice.) Or is one of
   push/bank strictly dominated?
4. **Is the SUSPENDED POT legible and does the round-end settle LAND?** Can the player always tell how
   deep they are; does cashing out feel like a reckoning?
5. **Does the shared-field DENIAL feel real?** Does taking a card the tide needed feel like fighting an
   opponent, or like racing a clock?
6. **Does the condition-hook + one starter spirit make turn-one TEXTURED** (not inert), and is the
   3-way starter choice meaningful?
7. **Does the tide read as an OPPONENT** (its flip = a move you dread) or as dead randomness?

---

## 8. Build approach

Two-surface workflow: this doc (+ the design-of-record) is the spec; **Claude Code builds it** in the
fresh prototype folder. Recommended order: (1) scaffold Phaser+Vite project + card/deck data + render the
board (two piles, field, hand, deck); (2) port turn loop + capture/stacking/stranding; (3) yaku detection
+ dual progress gauges; (4) the call (gate/push/bank/fold) + suspended pot + settlement; (5) one starter
spirit hook ×3. Playable-and-ugly at each step beats complete-and-polished. **The goal is to be wrong
fast until it's right.**
