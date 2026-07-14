# Design-Merits Audit — Hanatu

*Independent evaluation of the game design as specified in DESIGN_DOC_V6 (2026-06-15), cross-read
against ROADMAP (deferred design), DECISIONS_LOG (rationale), and the spirit/consumable/hexagram
catalogs. This audit judges the design, not the implementation. Where a weakness is already an
open ROADMAP item, I say so and evaluate whether the planned resolution goes far enough.*

*Written cold, per the brief. No playtest data exists yet; findings that depend on how players
actually behave are flagged as inference. Recommendations are proposals for Robert to weigh, not
edits to execute.*

---

## 0. Honest summary — the handful of things that matter most

**What's genuinely excellent and must be protected:** the yaku-as-gates architecture (score is
per-capture and continuous; yaku are pacing gates that open the push/bank decision) is the design's
best original idea and the thing that makes Hanatu *not* a Balatro reskin. The proportional yaku
threshold system, the Wu Xing generative/destructive cycle, the transcendence/slot-compression
economy, and chain-order-as-player-skill are all first-rate systems that pull real weight.

**The three weaknesses that matter most, in order:**

1. **The run has no shape.** 36 rounds, one hexagram fixed at minute zero, acts that are explicitly
   "structural divisions with no mechanical effect," and the only thing that changes round to round
   is the threshold number going up. Every genre peer injects within-run adversity (boss blinds,
   act bosses, elites); Hanatu currently has none. Combined with what looks like a very long run
   (36 rounds + 36 shop visits), this is the largest structural gap versus the genre — and it's
   almost entirely absent from the ROADMAP, which is why I lead with it.

2. **The in-round decision space may be thinner than the systems built on top of it.** Per turn the
   player picks one hand card (occasionally a same-month set) and then watches a deck flip they
   cannot influence. The strand mechanic adds texture, but the ratio of meaningful choice to raw
   RNG inside a round looks low, and the roguelike layer is what carries engagement. This is the
   audit's most important *playtest-first* question — I can't verify it from the spec, but the
   structure of the loop makes it the risk to watch.

3. **The most iconic hanafuda content is relegated to a footnote system.** Goko, Inoshikacho,
   Akatan, Aotan, Hanami-zake — the named combinations that *are* koi-koi to anyone who knows the
   game — live in the style-combo system as once-per-run +0.2 to +1.0 flow bumps, while the
   structural yaku are generic rank counts. This inverts the source material and leaves the
   design's single biggest reservoir of thematic depth uncashed.

There is also a concrete dead-and-trap-spirit list (§4) — Lincoln and Napoleon are the clearest
cases, with arithmetic — and a scaling-math concern (§3.4) about whether anything except
multiplicative compounding can survive a threshold curve that compounds ~29% per round.

Overall read: this is a **strong, unusually coherent design with real originality in its bones**,
carrying (a) a run-structure gap, (b) genuine mechanical bloat at the card-modifier layer, and
(c) a handful of dead spirits — all fixable, none foundational. The foundation is worth the work.

---

## 1. The lenses I chose, and why

The brief deliberately withheld a rubric, so here is what I decided mattered for *this* design:

- **Decision density and agency in the core loop** — because a roguelike deckbuilder lives or dies
  on whether the in-round game is interesting before any spirits exist. Hanatu's ancestor (koi-koi)
  gets its agency from an opponent; a solo adaptation must replace that agency with something.
- **Scaling mathematics** — because a 36-round threshold curve spanning 10,000× (50 → 500,000)
  makes assertions about what kinds of scaling can survive, and those assertions determine which
  spirits are live and which are arithmetic corpses regardless of anyone's intent.
- **Run shape and within-run novelty** — because this is where the genre's last five years of
  lessons live (boss blinds, act structure, escalating modifiers) and where Hanatu diverges most
  from its peers.
- **Dead-mechanic hunting with arithmetic** — the brief asked for it, and the 110-spirit roster
  plus six consumable families is exactly the kind of surface where inert content hides.
- **Theme-mechanics integration** — because V6 §1 makes a strong claim ("the game would be
  unrecognizable with these stripped") that deserves to be tested system by system rather than
  taken on faith.
- **Complexity-to-depth ratio** — solo dev, first-time onboarding, three parallel card-modifier
  systems: is each system paying rent?

What I deliberately de-prioritized: numeric balance of individual constants (Phase 6's job, and
meaningless before playtest), and anything ROADMAP already resolves adequately (noted inline
rather than re-litigated).

---

## 2. Strengths to protect

### S1. Yaku-as-gates + score-frozen-at-capture — the design's crown jewel

Decoupling scoring (continuous, per-capture, frozen at the moment of capture) from yaku (pacing
gates that open push/bank) solves a real problem the genre has: in Balatro and its descendants,
the round is one big evaluation and tension concentrates at the end. Hanatu instead gets
moment-to-moment scoring feedback *and* preserves koi-koi's authentic decision — the koi-koi call
itself — as the structural heartbeat of every round. The spent-cards mechanic (yaku re-triggers
from fresh unspent captures, so Kasu can fire twice in a round with two separate decisions) is a
genuinely elegant refinement. The DECISIONS_LOG rationale for abandoning yaku-as-multiplier
("end-of-round scoring spikes would override the per-capture rhythm") is exactly right.

**Protect this.** Nothing in Phase 5-7 should be allowed to erode the gate/score separation. It is
the game's identity.

### S2. Proportional yaku thresholds

Thresholds computed from the deck's live rank proportions make the yaku system robust *by
construction* against the entire deck-modification suite — Chakra promotions, deletions,
hexagram deck rebuilds, duplications. Better: it turns deck-sculpting into a two-sided decision
(promoting plains to ribbons lowers the Kasu threshold *and* raises the Tanzaku threshold), which
is real strategic texture, not just robustness plumbing. The bracket discontinuities are a
feature — a player who realizes one deletion crosses a bracket boundary has learned something and
been rewarded for it. This is quietly one of the best systems in the game.

### S3. The transcendence / slot-compression economy

The 6-slot cap → stack-to-3 → transcend-at-4-frees-the-slot loop, with Jade (buy a stack), Amber
(force-transcend at the price of a *permanent field slot* — a wonderful cross-system cost), and
Sulfur (chaos), is the game's most original meta-economic invention and its real answer to "how
does a build grow past the slot cap." Paying for spirit compression in board space is the kind of
cross-currency price that great roguelikes are made of. One design question rides on it (§3.5),
but the architecture is a keeper.

### S4. Chain order as player skill

Slot-order-dependent scoring (additive before multiplicative ≈ 2× swings, per V6's own worked
example) with drag-to-reorder gives Hanatu a richer version of Balatro's joker ordering — three
channels (points / additive mult / mult-mult) instead of one, plus Mirror/Memory turning *position
itself* into a build resource. This is depth that costs the player nothing until they're ready for
it. The planned phase-indicator UI (ROADMAP Phase-7 list) is the right investment; the mechanic
deserves the legibility spend.

### S5. The Wu Xing cycle — the theme claim, fully earned

One consumable that is simultaneously an application (to a bare card), an upgrade (via the
generative cycle), and a stripper (via the destructive cycle), depending on the target — this is
mechanically economical, self-teaching once the cycle is internalized, and *actually* Wu Xing
rather than Wu Xing-flavored. The five enhancement identities are well-differentiated (Water =
depreciating burst, Wood = board-space rules-bending, Fire = wildcard-with-risk, Metal =
held-in-hand, Earth = economy), and each feeds a dedicated engine spirit, closing the loop into
buildcraft. Of all the cultural systems, this is the one where V6 §1's "unrecognizable if
stripped" claim is simply true.

Honorable mentions worth protecting: the push deal-shrink curve (6/4/2/2 cards) making each push
progressively more desperate; Festival's slot-gate-as-the-only-cap (a cap that a *build choice* —
consumable slot expansion — raises, rather than a naked number); the Dao/Palace/Wuji trio quietly
anchoring three opposed deck-philosophy archetypes (untouched / fattened / destroyed); and the
hexagram collection as a pick-your-run-modifier meta-layer after first clear.

---

## 3. Major findings (ordered by importance)

### 3.1 The run has no shape — no within-run adversity, acts do nothing, one modifier for 36 rounds

**The finding.** V6 §6.1 is explicit: "Acts have no mechanical effect of their own." The hexagram
is rolled at run start and never changes (§9.1.1). No boss rounds, no elite rounds, no round
modifiers, no events. The only thing that distinguishes Round 23 from Round 9 is a larger number
on the threshold and whatever the player bought in between. Meanwhile the genre's most-copied
lesson of the past several years is that within-run *escalating, rotating adversity* — Balatro's
boss blinds, Slay the Spire's elites and act bosses — is what keeps the mid-run from becoming an
execution treadmill. A fixed hexagram front-loads all of a run's identity into minute zero; after
that, novelty comes exclusively from shop RNG.

This compounds with run length. 36 rounds of multi-turn play, 36 shop visits, 12 Groves — back of
the envelope this is a multi-hour run (flagged as inference; no playtest data), with no save/load
until F5.2 ships. A long run whose rounds are structurally identical, ending in a single-check
death at a threshold, is the profile of a mid-game slump.

**Why I rank this #1:** it is the largest gap versus genre peers, it is structural rather than
numeric (Phase 6 tuning cannot fix it), and — critically — it is nearly absent from ROADMAP. The
double-trigram redesign (F5.0a) touches 8 hexagrams but they remain run-start rolls. Nothing in
5A/5B addresses round-to-round shape.

**Proposals to weigh:**

1. **Give acts mechanical identity.** The cheapest strong version: an act-boss round (R6, R12, …)
   with a modifier drawn from a curated subset of the existing hexagram catalog, applied for that
   round only. This reuses 64 hexagrams' worth of already-built content as boss mechanics —
   probably the highest content-leverage move available to the project. (The hexagram hook
   architecture already dispatches per-round; scoping one to a single round looks like design
   work, not new plumbing — though that's the codebase audit's question, not mine.)
2. **Reconsider 36.** The threshold curve, Grove cadence, and Blessing economy (12 visits vs 14
   Blessings) are all parameterized on it, so this is expensive to change later — which is exactly
   why the question should be asked *now*, before Phase 6 tunes 36 rounds of thresholds. 24 rounds
   (4 acts) with the same total scaling would tighten every curve in the game. I'd want playtest
   timing data before committing either way; I flag it because nobody appears to have asked.
3. At minimum, an act-transition beat (a super-threshold, a forced choice, a rare offering) so the
   act boundaries the UI already displays *mean* something.

### 3.2 In-round agency: the loop the roguelike layer is standing on

**The finding.** Strip the spirits away and examine a turn: choose one of ≤8 hand cards (the match
is usually obvious — a card either has a field partner or it doesn't), then a deck flip resolves
with zero player input, possibly stranding the pair. The interesting decisions — multi-card dumps,
strand-risk reads, discard timing — are real but occasional. The one great decision (push/bank)
fires 1-4 times per round. Compare Balatro's per-turn combinatorial selection (choose 5 of 8, with
hand-type consequences) or StS's per-turn energy puzzle. Hanatu's per-turn choice space is small
and the flip RNG is large relative to it.

The design half-knows this: the mitigations that exist — Silk anti-strand, Osprey flip-to-hand,
the reveal hexagram, Ox clearing strands, discards — are all *purchased* agency, which is
defensible (agency as a build resource is a legitimate stance) but means the naked early-game
loop, the one that has to sell the game in Act 1, is at its thinnest exactly when the player is
deciding whether to keep playing.

**Confidence: this is the audit's biggest inference.** Koi-koi's matching may carry more felt
tension than my structural read suggests — stranding dread is real, and per-capture scoring makes
every flip a small slot-machine pull, which is its own kind of engagement. **This is the first
thing playtesting should measure**: minutes-per-decision in a naked Act-1 round, and whether
testers describe flips as exciting or as waiting.

**Proposals to weigh (only if playtest confirms):** cheap standing agency rather than new systems —
e.g., a once-per-turn "peek the next flip" as a baseline ability (converting flip RNG into a
planning input), or making the strand rules player-exploitable (deliberately building a 3-stack as
a trap for the 4th card is already emergent; surfacing and rewarding it would deepen the base
loop at zero systems cost).

### 3.3 The iconic hanafuda combinations are a footnote (depth on the table, part 1)

**The finding.** The style-combo system holds the most recognizable content in all of hanafuda —
Goko, the animal trio, the ribbon sets, the sake-cup pairs — and spends it as once-per-run flow
nudges totaling +4.2 across an entire run, against thresholds that scale 10,000×. Meanwhile the
structural yaku are the four generic rank counts. For a design whose stated thesis is that the
cultural material is load-bearing, this is backwards: the named combinations are the material
players *feel*; rank-counting is the abstraction.

Once-per-run gating specifically kills build-around potential. You cannot be "the Akatan player";
you trigger it once, incidentally, in whatever round it happens. V6 §5.6 already says the roster
will grow substantially — but growing a roster of once-per-run incidentals just adds more
footnotes.

**Proposals to weigh:**

1. **Promote a per-round layer.** Keep the once-per-run *flow* bonus (it's a nice run-milestone
   structure), but let combos pay something repeatable when re-completed in later rounds — ki, a
   draw, a stamp — so combo-chasing becomes a playstyle rather than an accident. (The code note
   that combos already "trigger once per round each" for detection suggests the seam exists.)
2. **Let spirits key off combos.** A spirit family that scales with combos completed (this run /
   this round) would create the missing "style build" archetype and give the planned roster
   expansion a reason to exist. Magpie (+3 ki per combo) is currently the *only* combo-reactive
   entity in 110 spirits.
3. Consider whether one or two marquee combos (Goko, Inoshikacho) deserve to be *events* — a
   choice, a big moment — rather than a toast notification.

### 3.4 Scaling math: the threshold curve quietly outlaws most of the roster's growth patterns

**The finding.** The threshold curve compounds at roughly ×1.29 per round for 36 rounds. Now
classify the roster's scaling shapes: per-capture flat contributions (all 28 foundations, the T2/T3
fusions) are *constant*; the permanent additive accumulators (Devotion/Habitat/Ceremony/
Agriculture, Lincoln, Napoleon, Ants, Snails) grow *linearly* in events; the capped multiplicative
engines (Wildlife ×5.5 max, Plenty ×3.4 max, Radiance ×11-per-round max at 1 stack) *saturate*;
only the unbounded mult-mult accumulators (Ship, Palace, Kintaro, Wuji), stacked multiplicative
layering (crosses × engines × capstones), and Nature's intra-round compounding grow fast enough to
chase a 29%-compounding target for 36 rounds. Points × (linear additive mult) is quadratic; the
threshold is exponential; quadratic loses, with the crossover landing somewhere in Acts 3-4.

Two consequences. First, **build convergence pressure**: whatever archetype variety exists in Acts
1-3, every surviving Act 5-6 build must be organized around multiplicative compounding, with
everything else demoted to multiplicand fuel. That's not automatically bad (Balatro has the same
skeleton) but it should be a *chosen* funnel, not an accidental one. Second, **enormous variance
between builds** — the gap between an additive-heavy board and a stacked-multiplicative board at
R30 is orders of magnitude, which will make Phase 6's threshold tuning brutal: any curve steep
enough to challenge the multiplicative build hard-kills everything else.

**Confidence:** the asymptotic argument is solid; the exact crossover round is inference.

**Proposals to weigh:** (a) before Phase 6, instrument expected-score envelopes per archetype from
the F3.16b scoring logs — tune the curve to the envelope, not vice versa; (b) audit the roster
deliberately for "what is this spirit's growth order, and at which act does it die?" — a
one-column addition to the F5.0 classification table that already exists; (c) consider whether the
top of the curve should flatten (Act 6 at ~×1.20/round instead of ~×1.27) to widen the set of
viable finishers. The D6 misc-engine diversity pass should be run *with the growth-order lens*,
not just the archetype lens.

### 3.5 Transcendence is never a decision

**The finding.** A transcended Negative contributes at powerLevel 4 (all-four-contribute,
F4.26 Option B), continues accruing new events, occupies *no* slot, and — per the memory-anchored
tenet — behaves like a regular spirit for every other purpose. A 3-stack in a slot contributes ×3
*and* costs the slot. So the 4th copy is strictly dominant every single time it's available:
stronger output, freed slot, no downside. "Do I transcend?" — the moment the system's fiction
builds toward — is not a choice; it's a resource race for 4th copies. The one friction point,
Amber's permanent -1 field slot, applies only to the *early*-transcend path.

Auto-stacking makes it worse: identical spirits merge on acquisition, so the player never even
chooses to stack. ROADMAP already carries "spirit stacking as player choice" as an open 5A item —
this finding is the design-level argument for prioritizing it, because right now the game's most
original economy (S3) runs on autopilot.

**Proposals to weigh:** the lightest fix that creates a real decision is a genuine cost on natural
transcendence — e.g., the Negative snapshots at powerLevel 3 (losing the 4th copy's contribution)
so transcending trades peak power for slot freedom; or Negatives stop accruing (making "frozen-
power copy," which V6 §7.2 *already claims*, actually true — note the doc and the mechanic
currently disagree, and the doc's version is the better design). Either way, decide it before
F5.11 (negative-aware fusion) builds more machinery on the current no-tradeoff foundation.

### 3.6 Three parallel card-modifier systems, one of which earns its keep

**The finding.** Enhancements (Wu Xing), Editions (Gold/Crystal/Ghost), and Stamps (9 across 4
tiers) all live on cards simultaneously, and from the player's seat the boundaries are arbitrary:
Gold edition is +20 points, a Yellow stamp is +3 ki, Snow is ×2 mult — three vocabularies, three
acquisition paths, three badge positions, for what is functionally one idea ("this card is
better in some way"). Wu Xing earns its complexity (S5). Editions are three flat modifiers with no
internal system — fine but thin, and ROADMAP already flags an editions redesign. Stamps are where
the complexity budget hemorrhages: the tier-ascension *trigger-shifting matrix* (within-pair swap
at Secondary, three-way rotation at Tertiary, per §8.4.5's "full matrix") is genuinely intricate
design that no player will ever model — it exists to make the crafting recipes internally
consistent, which is designer-facing elegance purchased with player-facing opacity. Meanwhile
White/Gray generic retriggers are (correctly, per the OP flag already on Gray) among the strongest
effects in the game, hiding at the bottom of the least-legible system.

**Proposals to weigh:** (a) in the already-planned black/gray rethink, consider collapsing the
trigger-shift matrix — let each stamp's effect simply be stated, and let crafting be a cost
ladder rather than a semantic transformation; (b) consider whether Editions should merge into
either stamps or enhancements — two card-modifier systems is a defensible budget, three needs
justification; (c) whatever survives, the single-card tooltip must render the *combined* effect of
enhancement+edition+stamp, because the interaction (Gray-stamped Meteorite = ×1.5⁴ held) is where
both the depth and the confusion live.

### 3.7 The economy's late-game is self-refuting

**The finding.** The interest/Bonds/Ingot compounding build asks the player to hoard ki for
exponential growth — but ki's only terminal value is purchases that raise score, score is checked
against a threshold *every round*, and V6 §11.7 itself concedes "late-run, ki has diminishing
utility (no shops left)." An exponential resource curve whose conversion window closes before the
exponent matters is a trap dressed as an archetype. Ingot's low-ki truncation is already flagged;
the deeper issue is that the whole wealth-scaler branch (Ingot, Bonds-stacking, hoard-and-Surplus)
needs a *sink that scales* — something ki-hungry and score-relevant in Acts 5-6 — or it needs to
be honestly repositioned as a mid-run accelerant rather than a build. Surplus (+1 mult per 3 ki,
recalculated per capture) is the one spirit that closes the loop (ki *is* score while held);
notably, it makes hoarding pay directly, and a "Surplus economy" build is probably the intended
redemption of the branch — but one spirit is a thin bridge.

**Proposals to weigh:** a late-game ki sink with uncapped score conversion (repeatable edition
application at escalating cost; threshold "tribute" purchases; Grove super-offerings priced in
hundreds of ki), and evaluate the wealth spirits against it.

### 3.8 Fusion chain depth vs. shop RNG

A capstone requires 8 *specific* Tier-1 spirits (four exact point+additive pairs), three Cinnabars
(90 ki), and a Pearl (50 ki), assembled across rarity-rolled shop offerings — with no visible
mechanism to *pursue* specific components (rerolls are the only lever). Pearl preserving the T3
components is generous and good; the problem is upstream: the chain is deep, exact-match, and
RNG-gated, so capstone frequency will be set by shop luck rather than player commitment. And the
payoff for the game's deepest crafting chain — Yin-Yang's "everything fires twice" — is powerful
but *flat*: a global ×~2 that changes no decisions, which is an anticlimax for a 140-ki, 8-piece
journey (Time and Nature are better in this respect; they change how you *play*). **Proposals:**
a fusion-targeting affordance (Grove guarantees one offering from a fusion group you partially
own; or a "seek" reroll); and in any capstone pass, push Yin-Yang/Universe toward
decision-changing effects rather than scalar doublings. Confidence: acquisition-rate claim is
inference pending playtest; the flat-payoff critique stands regardless.

---

## 4. Dead, inert, and trap mechanics (named, with arithmetic)

- **`engine_lincoln` (Lincoln) — dead.** +0.1 additive mult per bank, permanent, 6 ki. Hard ceiling
  ~36 banks/run → +3.6 additive mult at 1 stack over an *entire run*. Agriculture, same cost,
  accrues roughly that much per round in a plains build. Off by ~50×. No build wants this at any
  point in any run.
- **`engine_napoleon` (Napoleon) — trap.** +0.2 additive mult per push *failure*. A failure costs
  ×0.9 flow (a compounding ~10% tax on every future capture) plus forfeited hand ki. The intended
  Tiger combo (8 ki to force a push, then fail it) buys +0.2 additive mult at a cost several
  orders larger. Rewarding failure is a fun design instinct, but the magnitude makes it purely a
  new-player trap. Either the reward must be large enough to make deliberate failure a real
  strategy (interesting!) or the spirit should be redesigned.
- **Earth's held-in-hand mult channel — literal no-op** (×1.0 outside hex_15). Already in flight as
  F5.8; endorsing the redesign, with one note: the per-capture-flat-ki replacement makes Earth a
  fourth economy spirit rather than a scoring identity — worth checking that Earth keeps a reason
  to exist next to Recycling/Goat/Pig in the same currency.
- **`econ_print` — non-functional stub** (known, F5.9). Fine.
- **The tag system — aspirational scaffolding.** Every card carries `tags` "used for spirit/
  hexagram affinity" (V6 §2.1), but nothing consumes them and ROADMAP already frames the
  keep-or-kill decision. From the design side: 110 spirits and 64 hexagrams key off month/rank/
  axis/season and never needed tags; kill it unless a specific tag-consuming feature is actually
  wanted, and correct the §2.1 claim either way.
- **Legendary slots — a UI category most players never fill.** Two dedicated slots whose only
  legal occupants are the 4 capstones, whose acquisition chain (§3.8) most runs won't complete,
  and whose Grove offering path was removed (DP-67, re-enable deferred). Until the legendary
  offering returns, this is dead interface. Sequencing note: the re-enable should probably land
  *with* the shop revamp, not after it.
- **`econ_grace` — marginal.** Style-combo ki has a small base (1/combo) and Magpie provides +3 per
  combo for free (it's a summon). Grace becomes non-embarrassing only in a combo-dense build —
  which, per §3.3, the game doesn't currently support. If style combos are promoted, Grace revives
  for free; if not, it's near-dead. (Lower confidence: depends on combo-per-round frequency.)
- **Natural full-month auto-capture — a design question wearing a bug costume.** G0-035 found the
  dealt-full-month auto-capture defined but never called. Before routing it as code cleanup,
  decide the design question: a free 4-stack capture at deal is a pure luck payout with no
  decision attached; I'd argue the *better* design is the current accidental one (the month sits
  in hand as a multi-play resource), and the doc should change, not the code.
- **Doc-drift flag (not a design fault, but it will bite tuning):** the Radiance catalog text says
  "exponential stacking" while the post-F5.12 reality is linear ×(1+2n); and V6 §7.2's "frozen-
  power copy" contradicts the Negatives' actual continued accrual (§3.5). Both belong in the V7
  diff-set.

What I looked for and did *not* find dead, to be fair to the roster: Missing Number (4-stacks are
engineerable via multi-play/Monkey; +5 is Devotion-class), Bullseye (all-four-yaku rounds are a
real build target under Hotei/Snake), Ducks (weak, but already owned by F5.4d), and the
Dao/Palace/Wuji trio, which I initially suspected of being misc-engine mush and turned out to be
the roster's best archetype anchors. The D6 diversity pass should treat those three as the model,
not the patient.

---

## 5. Depth the design gestures at but doesn't cash in

Beyond the style-combo inversion (§3.3, the big one):

- **The axis system is under-loved.** Air/land and day/night are a clean 24/24 double partition
  with foundations, fusions, crosses, and hexagrams keyed to them — but no *in-round mechanic*
  ever reads an axis. Axes are pure scoring tags. One matching-layer or field-layer axis
  interaction (even a single hexagram that made axis matter *positionally*) would convert the
  partition from bookkeeping into board texture. The hex_29 rank-matching redesign (F5.0a) shows
  the appetite exists; axes are the more natural candidate than rank.
- **Irrigation points at a whole design space.** A spirit that permanently mutates individual
  cards, turning a specific plain into a run-long project, is the germ of a "card biography"
  archetype — cards that grow, remember, accumulate. It's currently a roster of one (and its
  mutations are silently wiped by `transcendCard`, an already-open question — from the design
  side: mutations should persist; "the game robbed my fattened plain" is exactly the feel-bad the
  open item worries about). Two or three more mutation spirits would make persistent-deck-state a
  visible pillar rather than a curiosity.
- **The hexagram catalog as reusable content.** 64 designed modifiers, used once per run at
  minute zero. §3.1's boss-round proposal is one reuse; others: hexagram-flavored events,
  Grove-offered minor hexagram "aspects," endless-mode rotation. The content is *built*; the
  design only draws on it once.
- **Symbionts are the best emergent system and the hardest to reach.** Run-to-run variation
  driven by which animals you happen to capture is genuinely roguelike — and it's gated behind
  one 7-ki uncommon (Symbiosis) that a player must know to value. Worth considering a second,
  weaker symbiont trickle (a zodiac? a hexagram?) so the system isn't invisible to anyone who
  skips one shop card.

---

## 6. Genre positioning — where it's distinctive, derivative, and behind

**Distinctive (real, defensible):** per-capture frozen scoring with yaku pacing gates (S1);
push-your-luck as the round's structural spine rather than a side-bet; the transcendence
compression economy (S3); proportional thresholds (S2); the divination/collection meta-layer;
symbiont emergence. That is *more* genuine novelty than most post-Balatro entries manage.

**Derivative (fine, but know it):** the spirit chain is Balatro's joker row with better ordering
mechanics; points × mult × global-multiplier is the genre formula; shop/reroll/rarity is stock.
None of this is a problem — it's the genre's shared grammar — but reviews will make the
comparison, so the distinctive systems above need to be *front and center* in the first hour.

**Behind the genre:** run shape and within-run adversity (§3.1, the big one); onboarding surface
(§3.6 — Balatro teaches one modifier system at a time through unlock cadence; Hanatu currently
fronts everything); and meta-progression thinness — hexagram unlocks are the only persistent
layer, and 64-runs-to-complete is a collection curve, not a progression curve. Meta-progression
may be a deliberate scope cut for a solo project (reasonable!), but if so the hexagram collection
has to carry retention alone, which argues for making individual hexagrams *feel* like distinct
games (the F5.0a double-trigram redesign matters more than its backlog position suggests).

---

## 7. Prioritized recommendations

Ordered by (impact × how early it must be decided). Each is a proposal with its tradeoff.

1. **Decide run shape before Phase 6 tunes anything** (§3.1): act-boss rounds reusing the hexagram
   catalog, and an explicit ruling on the 36-round length. *Tradeoff:* new scope in a project
   trying to converge; but every threshold Phase 6 sets is wasted if the round count or act
   structure later changes. This is the one finding where waiting is itself the expensive choice.
2. **Playtest the naked loop first, specifically** (§3.2): Act-1, no-spirit sessions, measuring
   decision density and flip-anticipation before evaluating anything build-related. Cheapest
   possible test, gates the largest uncertainty in this audit.
3. **Make transcendence a decision** (§3.5), and do it before F5.11 builds negative-fusion on top.
   Smallest viable change: Negatives snapshot at power 3 or stop accruing (which also makes V6
   §7.2 true). *Tradeoff:* nerfs the late-game scaling valve; may need compensation elsewhere.
4. **Promote style combos from footnote to axis** (§3.3): a repeatable per-round payoff layer plus
   2-3 combo-reactive spirits. *Tradeoff:* adds another scoring channel to an already-full
   pipeline; mitigate by paying combos in ki/draws rather than mult.
5. **Kill or redesign Lincoln and Napoleon; kill the tag system; return legendaries to the Grove
   with the shop revamp** (§4). Near-zero cost, removes traps and dead interface.
6. **Run the D6 misc-engine pass with a growth-order column** (§3.4): classify every scoring
   spirit by its scaling shape and the act at which it stops mattering; use Dao/Palace/Wuji as the
   archetype-anchor template. Feed the result into Phase 6's curve tuning, not the other way
   around.
7. **Cap the card-modifier complexity budget at two systems' worth of legibility** (§3.6): collapse
   the stamp trigger-shift matrix in the planned black/gray rethink; fold or sharpen Editions in
   the planned editions redesign; ship the combined-modifier tooltip.
8. **Give the wealth-economy branch a late-game exit** (§3.7): one scaling ki→score sink, then
   re-evaluate Ingot/Bonds against it.

---

## 8. Confidence notes

**High confidence (arithmetic or structural, verifiable from the spec):** Lincoln/Napoleon
dominance math; the scaling-shape taxonomy and additive-vs-exponential crossover argument; the
transcendence no-tradeoff analysis; acts having no mechanics; the style-combo budget (+4.2 flow
lifetime); the three-modifier-system inventory; the capstone chain's component count.

**Medium confidence (structural inference, playtest-checkable):** the in-round agency thinness
(§3.2 — the single most important thing to test); run-length estimates; capstone acquisition
frequency; Grace's marginality; the mid-run slump prediction.

**Explicitly not evaluated:** individual constant balance (Phase 6's domain); anything about code
quality (the separate codebase audit); UI execution except where it gates a design's legibility.

---

## Where this document should live

Proposed home: **`docs/investigations/design_merits_audit.md`** — it's a point-in-time evaluation
feeding Phase-5 decisions, which matches the investigations directory's charter (live forward-
going recon), and several findings reference the F5.0 classification doc already there. Per the
rule-vs-record test it would migrate to `docs/archive/` once its findings are dispositioned.
Individual rulings it produces would go to DECISIONS_LOG as usual; any adopted items become
ROADMAP entries. Not committed anywhere — this is a proposal for Robert to route.
