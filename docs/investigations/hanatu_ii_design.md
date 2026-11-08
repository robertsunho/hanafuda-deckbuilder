# Hanatu II — Design of Record (exploration → committed direction)

**Status:** The design direction for a rebuilt Hanatu. Survived three independent perspectives
converging and THREE adversarial stress-tests (Fable 5.1), each of which broke a load-bearing
undefined quantity or contradiction and left the design tighter. The spine has held throughout.
**Next: a minimal prototype** (see the companion `hanatu_ii_prototype_spec.md`) to resolve the
feel/number questions reasoning cannot. This doc is the design-of-record the prototype builds against.

> **Relationship to V1:** V1's *code* is frozen (we build fresh, not on top). V1's *repo* remains the
> design-record home — this doc lives in `docs/investigations/` and syncs to Project knowledge.
> Prototype code lives in a separate fresh folder, not V1's `src/`.

---

## 0. The one-sentence game

*Koi-koi, faithfully — but the environment (the shared deck + field) is the opponent, and the heart is
the **call**: whether to decline your exit and go again, against a tide that relentlessly closes.*

## 1. The core diagnosis this fixes (why we rebuilt)

V1's loop was repetitive, trivialized by spirits, and still Balatro-shaped — a taste Robert has
outgrown. Root cause: **two layers that each talk only to themselves** (hwatu mechanics ↔ itself;
spirits+points×mult ↔ itself), bridged by a thin one-directional wire (captures → score → spirits
multiply score). The spine — the koi-koi **call** — was buried: stakes not on the table, threat
unreadable, consequence deferred, and the build layer deleting the *crossing* instead of feeding the
*continuing*. (Full history: `wager_spine_investigation.md`.)

## 2. The architecture (the two-layer problem dissolved)

Not two stacked layers — **two dimensions of one build:**
- **On-card:** a card = **point value** (its hwatu value, which IS the earnings currency) + **trigger
  conditions** (neutral *moments*: on-play, on-flip, on-capture, on-discard, on-draw, …) + **attributes**
  (rank, month, and air/land · day/night — carried, used only when a hook or field-effect keys off
  them, never as arbitrary scoring tags). **Cards do not carry effects — they signal.**
- **Off-card (two opposed spirit layers):** **player spirits** hook card-conditions → effects *for you*;
  **environment/field spirits** hook the same conditions → effects *for the tide* (the per-round
  "opponent personality"). Spirits are never flipped.

**THE TENET (top-level law):** *The spirit layer may not be interesting on its own — only make the core
loop more interesting.* V1 spirits failed this (interesting in their own scoring layer → the
estrangement). Condition-hooks enforce it by construction; naming it keeps it true as content grows.

## 3. The round — the three-role economy (FOUNDATIONAL, stress-test-3 verdict: holds)

Each system has exactly one job; no job has two systems:
- **Cards = points = earnings.** A card's point-value IS the earnings currency (what you wager and take
  home). **Flat-ish spread** (koi-koi-ish 20/10/5/1 or flatter) to cut the variance of "which high card
  the flip grabbed."
- **Yaku = gates (only).** Completing one of the **four rank-based yaku** unlocks the **push**. Yaku do
  NOT score. Visually thresholded on the capture pile (the readability we protect). **You cannot push
  without a completed yaku** — but *fold* is always available (see §4).
- **Push/bank = the multiplier (only).** The call escalates **bonuses and penalties** on earned points
  (the rally-ladder). Sole multiplier system.
- **Style combos = a second earning channel** — bonus points for patterns; neither gate nor multiplier.
  ⚠ *Watch (Fable + the original merits audit): Goko/Akatan now live entirely here. The iconic hanafuda
  names are the theme's heart — do not make them a footnote twice. The combo channel may need more
  prominence/reward than "tertiary" implies.*

## 4. The round — the volley & the exits (FOUNDATIONAL, repaired in stress-test-3)

- **The environment does NOT score and does NOT net against the player** (stress-test-3's big break:
  go-stop-style netting secretly re-introduced the symmetric scorer and drove base-round earnings ≤ 0,
  making bank a guaranteed loss and the multiplier multiply nothing). **Model A, finished:** the tide's
  captures are **threat, never earnings.** Player earnings = *own* captures × the ladder → base is
  positive, bank is a real modest-positive exit, the multiplier has a positive multiplicand.
- **The tide threatens by *progress*, not points:** its yaku-progress raises the ante (steeper
  failed-push penalties, worse next-call terms, board scars) — its cards subtract nothing from your pot.
- **The environment does not call and does not "go out."** It completes yaku *relentlessly, whenever it
  can* (no decision — it's the tide). A completed yaku is an **ante-raise, not a terminal.**
- **Every yaku (either side) re-triggers the call, advantage shifted to the scorer** — EXCEPT before the
  player's first yaku: a tide yaku then **raises the ante *silently*** (no call is offered, because the
  gate isn't open yet), so the player's first yaku opens a call at *already-elevated terms*. *(Fable's
  repair for the "yaku-less player is trapped" contradiction — and a design gift: the longer you take to
  gate, the worse the deal when you finally act. Dread-with-payoff, not dead time.)*
- **The two exits — a player is never without one:** **bank** (requires a yaku; take the standing total,
  round ends) and **fold** (always available; surrender the hand for a small floor/nothing, round ends).
  The gate gates *push* only.
- **Round ends on:** bank, fold, or **deck exhaustion (the standoff)** — which needs its *own settlement
  feel* (a draw, the pending pot paid at reduced terms), not a shrug. The standoff will be common under
  a mounting-pot volley; design its payout deliberately.
- **Pot resolution = SUSPENDED (not immediate):** bonuses/penalties from pushes **hang in a running
  stake that only cashes out at round-end** (bank/fold/exhaustion). This keeps the stakes *on the table*
  — the mounting, un-cashed pot IS the call (immediate per-push resolution would re-introduce V1's
  original "stakes aren't on the table" flaw). *Load-bearing consequence: the pending pot must be always
  legible (UI), and the round-end settle must land — both are prototype feel-gates.*

## 5. The shared field — what makes the tide an opponent, not a clock (stress-test-3, attack 3)

**ALL captures happen in the shared field.** Player captures from the **hand**; the environment captures
from the **deck-flip**; both reach into the same contested space. Every field card is an opportunity for
both. **This is what makes the tide an opponent rather than a timer** — because the tide's yaku are built
from field cards the player can *also take*, **every player capture is simultaneously an earning and a
denial** (take the bright for its points AND to slow the tide's Hikari). Field-verb cards (lock a slot,
deny a month) are direct interference. *(Robert's original intent all along — Fable was pinning a
condition we'd already satisfied. Build-note: make the denial legible — show the tide's yaku-progress
update when the player denies it, so the player feels the interference.)*

## 6. The run — card acquisition as the build (unchanged from prior)

Build your deck by **winning cards**, not buying. Baseline: captured cards are **selection-gated**
candidates to keep (capture many, keep few — *choosing which* is a build decision). Amplifier: the call's
stakes are acquisition quality/quantity. **The shop only REFINES** (spirits + upgrades to cards already
won) and is the between-round **exhale** / **deck-thinning** vector (retire a card to safety — the one
place the tide can't reach). Acquisition lives *in the round* (the "encounter & overcome / Pokémon"
thrill). **Starter spirit:** begin holding one of three chosen spirits — defuses early-game inertia,
shapes the run from turn one, is the onboarding, and anchors the roster's three archetypes.

## 7. Dual-use & hand-as-sanctuary (the frequency resolution)

The deck is shared with the tide, so every card you build can be flipped against you — coherent by §2 (a
flipped card fires the *environment's* spirits). **Hand-as-sanctuary:** cards in your hand cannot be
flipped; cards in the deck are exposed — so the frequency (how much dangerous material you expose vs. keep
thin to draw yourself) is a **player-authored lever**, not a shuffle. This also separates the emotional
registers (hand = relief, deck = dread), giving the arc: **capture (hope) → keep (pride) → draw it (relief)
→ push with it (dread) → bank (release).** *Fork held in reserve: Version A (assemble your opening hand) is
richer but makes turn-one categorical; Version B (drawn=safe, no opening assembly) is the base. Build B;
reserve A.*

## 8. Card loss via purgatory & open cuts

Failed wagers **demote** cards to a recoverable purgatory (felt loss now, clawable back), not destroy them;
destruction is the rare extreme. **Open cuts to resolve on purpose (not prototype-blocking):** slot-scarring
needs a recovery vector or round-scope (don't leave it an uncured spiral); deck-bloat needs a chosen removal
mechanism (retire-to-safety is the lead candidate, doubling as the exhale); the standoff needs its settlement
feel (§4).

## 9. Engine & workflow (decided)

- **Prototype:** Phaser + Vite (Robert's fluency; feel-questions are engine-agnostic; fast-to-playable;
  throwaway by design). Minimal — cards as labeled boxes, no art.
- **Production (later, once design proves out):** **Godot** — native Steam/mobile export + a visual editor
  for hands-on aesthetic work + side-by-side with Claude Code. GDScript suits Robert's Python background.
  Deliberate, correctly-timed platform choice (not premature engine-shopping), made *after* the design is
  validated so he learns the engine building a game he already knows is fun.
- **Record home:** design docs in V1's repo `docs/investigations/` (committed to `main`, synced). **Prototype
  code in a fresh separate folder** (e.g. `~/hanatu-prototype`), NOT V1's `src/`. One design-record, two
  codebases (V1 frozen, prototype fresh).

## 10. Process lessons (carry forward)

- Playtest early, *for feel*, as a first-class question. V1 had rigor on correctness, none on fun.
- Bring an adversarial outside read *before* building — three Fable passes each saved a prototype cycle.
- **Our failure mode is consistent:** we build elegant structures on a load-bearing quantity we never
  defined (the unified pot's arbitrage; the shared-deck frequency; the go-stop netting's sign-flip). And
  **we are most vulnerable to breaking our own *locked* decisions when a new idea arrives feeling like
  fidelity to a source** (go-stop netting broke Model A while wearing go-stop's costume). Watch for both.
- Build-fresh-but-harvest keeps paying off: V1's deck-flip adversarial behaviors, discard pile, matching/
  yaku modules keep turning out to be seeds, not waste.
