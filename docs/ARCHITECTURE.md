# ARCHITECTURE.md — Hanatu code structure & extension reference

*The architecture rubric (F4.24b). Authored 2026-06-17 against the verified Phase-4-complete end-state
(`docs/archive/phase4/F4.24_inventory_pass3.md`, HEAD).*

**What this doc is.** The prescriptive reference for *how the code is built* — module organization, the
state model, the hook/helper menu, and the "if you need X, use Y" recipes for extending the game with the
engine's existing primitives. It exists because those primitives were undocumented: each feature session
re-derived them, reinvented parallel paths, and drifted the architecture. This doc is the antidote — read
it before adding a spirit / consumable / hexagram / blessing.

**Two audiences, one doc.** (1) An auditor checking code against intent. (2) Future-Claude extending the
codebase. The **recipes (§4)** and **anti-patterns (§5)** are the onboarding/anti-drift core; the
**hook/helper reference (§2/§3)** is the audit-completeness backbone; the **accepted-architecture record
(§6)** is the "deliberate, here's why" for the audit.

**Scope boundary (what this doc does NOT do — see §7 / `DOC_MAP.md`).** This is *structure/mechanism*. It
does **not** re-document game *behavior/design* (→ `DESIGN_DOC_V6.md`), hold *deferred design* (→
`ROADMAP.md`), carry *code-cleanup task lists* (→ `CODEBASE_CLEANUP.md`), or restate *operational
coding rules* (→ `ENGINEERING_RULES.md`). Where a topic spans docs (e.g. the spirit-set
getters), this doc gives the *architectural why*; ENGINEERING_RULES gives the *operational what-to-do*.

---

## §1 — Organization map + state model

### 1.1 The layers (≈36 files, ≈18.9k lines)

Three layers under `src/`: **`/systems/`** (engine logic), **`/scenes/`** (Phaser UI), **`/data/`**
(static definitions). The thesis (Phase 4): each subsystem owns its concerns — spirit logic in
`SpiritEffects`, consumable logic in `ConsumableEffects`, hexagram logic in `HexagramEffects`, not
scattered across managers/scenes.

**The load-bearing modules:**

| Module | Role |
|---|---|
| `systems/GameRoundManager.js` (GRM) | Orchestrates ONE round: deal → play → deck-flip → capture → the scoring pipeline → bank/push → round-end. Owns per-round state. |
| `systems/RunManager.js` | The persistent singleton (`run`) across rounds/scenes: ki, the unified spirit roster, consumables, the deck, flow, hexagram/blessing state, the economy formulas, and all spirit acquisition/transcendence. |
| `systems/SpiritEffects.js` | The spirit-effect registry (`_effects`, **110 entries**) + the scoring-factory helpers + `NEGATIVE_SNAPSHOT` (transcension) + Mirror/Memory copy-effects. |
| `systems/HexagramEffects.js` | The hexagram-effect registry (`HEXAGRAM_EFFECTS`, **64 effect IDs**) + the `getActiveEffect`/`applyHook` dispatch + the Wu Xing `getX()` getters. |
| `systems/ConsumableEffects.js` | The consumable-effect registry (`_effects` keyed by consumable id) + `execute()` dispatch — the apply-surface for every family (stamp/zodiac/chakra/alchemical/element). |
| `systems/ScoringEngine.js` | Stateless 4-yaku evaluation (the bank/push gate). `evaluate(cards, thresholds)`. |
| `systems/FieldManager · HandManager · DeckManager · CaptureManager` | The round sub-managers: field slots + capture rule; the hand; the deck; the capture pile. |
| `systems/StyleEngine.js` | Style-combo detection from the capture pile. |
| `systems/CardMutations.js` | Per-card mutation helpers (`getCardPoints`, `addCardBonusPoints`, `isSilk`). |
| `systems/RNGHook.js` | Centralized spirit-modified probability (`rollProbability`). |
| `scenes/GameScene.js` | Main gameplay UI (field/hand/scoring/spirit fan). |
| `scenes/ShrineScene.js` | Between-round shop (spirits/consumables/forge/fusion). |
| `scenes/shared/` | Leaf modules shared by the two big scenes: `SpiritLayout` (fan layout), `spiritTooltip` (tooltip lines), `spiritTargetPicker` (picker selection), `consumePolicy` (the consume predicate). |
| `systems/scoringLabels.js` | Scoring-log contribution labels (`formatContributionSource`). |
| `data/` | `cards`, `spirits`, `consumables`, `hexagrams`, `blessings`, `fusionRecipes`, `shopCards`, `yakuThresholds`, `cardImageMap`. |

### 1.2 State model: RunManager (persistent) vs GameRoundManager (per-round)

The single most important architectural split.

**`RunManager` (the `run` singleton) persists across rounds and scenes.** It holds: `_ki`; `_allSpirits[]`
(the unified roster — regulars + Negatives in one array, with `spirits`/`negativeSpirits` as filtered
getters); `_legendarySpirits[]`; `_consumables[]`; `_round`/`_act`; `_totalScore`; `_flow`; `_styleBase`;
`_deck` (a deep copy of `ALL_CARDS` that survives rounds and is mutated by chakras/marks); and the
hexagram + blessing state. It owns the **economy formulas** (`getEffectiveCost`, `calculateKiReward`, the
`interestRate` getter, flow decay, the push curve) and every spirit-roster mutation (acquire / stack /
transcend / sell).

**`GameRoundManager` resets every round.** Round state lives in two reset methods plus `startRound`:
- `_resetRoundState()` (`GRM:248`, called from the constructor AND `startRound`) — the plain round-local
  fields: `_phase` (`'idle'`), `_yakuBeforeTurn`, the push counters (`_pushCount` = attempts/deal-curve,
  `_pushDepth` = successes/flow-curve — two real axes), `_bullseyeInventory`, zodiac flags, etc.
- `_resetScoringState()` (`GRM:284`) — runs **after** `onRoundStart` hooks (a deliberate timing contract:
  hooks may seed state the scoring init must not clobber): `_runningScore`, `_cumulativePoints`
  (capstone_nature's cross-capture carry), `_scoringEvents`, `_spentCardIds`.
- `startRound()` (`GRM:326`) — resets deck/hand/field/style, fires per-round symbiont resets +
  `onRoundStart`, then deals.

**GRM reads spirits live** from `run.activeSpirits` / `run.scoringSpirits` / `run.allSpirits` — there is no
`_spirits` snapshot (see §5, anti-pattern 2).

### 1.3 The per-element accumulator model

Spirits that accumulate state across the run (counters, seen-card sets) use the **per-element model**:
each stacked copy gets its own element object in `spirit.elements[]`, and reads aggregate across them.
(This is the *mechanism* half of DP-03; `DESIGN_DOC_V6.md` has the behavioral half.) Three storage shapes
coexist:
- **`spirit.elements[]`** — accumulator spirits (one element per stack).
- **`spirit.state`** — stateful non-accumulators, and ALL Negatives (transcended copies fold their
  elements into one `state` — see §1.4).
- **nothing** — plain scoring spirits (stateless; they just read the card).

**Seeded** by `_freshAccumulatorElement(spiritId)` (`RunManager.js:620`): `{ ...ACCUMULATOR_INIT[id](),
acquiredRound: this._round }`. `ACCUMULATOR_INIT` (`RunManager.js:51`) maps each id → a fresh-state
factory; `ACCUMULATOR_SPIRIT_IDS` (Set, `RunManager.js:34`, **28 ids**) gates accumulator-vs-state
branching everywhere. Stacking appends one element (`_addAccumulatorElement`, `:626`); first init is
`_initSpiritState` (`:530`, the unified init path — the former `_initSpiritState`/`_initSpiritElements`
split was merged).

**Read** via the exported aggregate helpers (§3.1): `aggregateNumericState` (sum a scalar key),
`aggregateArrayLength` (sum array lengths), `aggregateUniqueCount` (dedup across elements, display only),
`longestHeldValue` (oldest element). **Written** via `incrementPerElement` / `addUniqueToElements` (both
Negative-aware).

**`tooltipBase` is the single source of truth for scoring constants.** Effect bodies read base values via
`_tb(spirit, key, fallback)` (`SpiritEffects.js:72` — `getSpiritDef(spirit.id)?.tooltipBase?.[key] ??
fallback`). The hardcoded numbers in factory calls and effect bodies are only *fallbacks*; the def's
`tooltipBase` wins. Keep them equal. (This is the F4.36 `_tb` mechanism — both `applyEngine` and
`NEGATIVE_SNAPSHOT` read the one source, so they can't drift.)

### 1.4 The snapshot / transcendence model

A spirit transcends to a **Negative** at 4 stacks (cascade) or via Amber. Negatives carry `powerLevel`,
not `stackCount`; `effectivePower(spirit)` (`RunManager.js:1599`) returns `powerLevel` for Negatives,
`stackCount` for regulars — engine code uses `effectivePower`, never raw `stackCount`.

- **`_buildTranscendedNegative(spirit, powerLevel)`** (`RunManager.js:670`) is the single construction
  path (natural cascade-at-4 AND Amber both call it). It bakes power onto the object and folds
  `spirit.elements[]` into one `spirit.state` via `_aggregateElementsForNegative` (`:649`) → the per-spirit
  **`NEGATIVE_SNAPSHOT`** fn (`SpiritEffects.js:303`; `snapshotCat1Linear` / `Dual` / `Exponential` /
  `snapshotArraysFromElements` / Cat-5 maturation variants).
- **F4.26 Option B (lossless):** transcension snapshots the full `stackCount` (all 4 contribute) and
  replaces the spirit **in place** at its chain index (`splice(idx,1,…)`, `RunManager.js:879`), preserving
  placement. (`snapshotPower` is a local in `_acquireSpiritStack` `:873`, not a helper.)
- **`_freshNegativeState(spiritId, powerLevel)`** (`RunManager.js:640`) builds a non-compounding
  zero-state Negative for Past Life copies / negative Cuckoo hatches — same shape, counters at zero.

The architectural consequence for recipes: **any `applyEngine` that reads accumulated state must handle
`spirit.isNegative`** (Negatives read flat `spirit.state`, regulars read `spirit.elements`). See recipe 2.

---

## §2 — Hook reference (the menu)

### 2.1 Hexagram hooks

**Dispatch.** Two functions, both in `HexagramEffects.js`:
- `getActiveEffect()` (`:759`) — resolves `run.getHexagram()` → looks up `HEXAGRAM_EFFECTS[hex.effect]`.
- `applyHook(hookName, fallback, ...args)` (`:783`) — calls `effect[hookName](...args)` if present, else
  returns `fallback`. The idiom at call sites is `applyHook('name', base, base)` (fallback === first arg).

**Registry** (`HEXAGRAM_EFFECTS`, `:130`) — `{ effectId: { hookName(args){…}, … } }`. **64 effect IDs**,
**44 distinct hook names, 0 doc/use discrepancies** (the file header `:1-93` is an authoritative inline
catalogue grouped by the 3 classes below — cross-reference it).

**The 3 dispatch classes** (the contracts genuinely differ — this is deliberate, not normalized):

| Class | What it returns | How it's dispatched |
|---|---|---|
| **(1) value-transformer / flag** | a modified value, or a bool | `applyHook('name', fallback, ...args)` — the hook name is a string passed at the call site |
| **(2) direct side-effect / merge / array** | nothing (side-effect on `run`/round), or a merge object `{addPoints?, addMult?, multiplyMult?}`, or a full deck array | `getActiveEffect()?.hook(...)` — fetched and called directly (NOT via applyHook) |
| **(3) Wu Xing config** | a tier-keyed value | NEVER name-passed at a call site — only a `getX()` wrapper calls `applyHook` internally; the engine calls `getX()` |

Class (3) getters (`HexagramEffects.js:793-831`, all exported): `getFireFlatPoints`, `getFireBreakChance`,
`getWaterMult` (the sole source of Snow/Ice mult), `getMetalHeldMult`, `getMeteoriteJackpotChance`,
`getEarthInterestRate`, `getWoodScoringMult`, `getEarthHeldMult`. The base default lives in the wrapper; an
effect only supplies overrides.

### 2.2 Spirit hooks

**Registry** (`SpiritEffects._effects`, `SpiritEffects.js:349-1411`) — **110 entries** (95 hook-defining +
15 empty `{}` stubs). Lookup via `SpiritEffects.get(id)` (`:1422`). The `_effects` key MUST equal the
`spirits.js` def `id`.

**Distinct hooks + current usage (definer count):**

| Hook | Definers | Fires WHEN · receives WHAT · returns WHAT |
|---|--:|---|
| `onCardScored` | **43 respond** (19 literal + 24 via factory helpers) | per scored card (Phase 1; ×2 under Yin-Yang/`shouldSpiritsFireTwice`; again per retrigger) · `{card, spirit, spirits}` · `{addPoints?, addMult?, multiplyMult?}\|null` (scaled by `effectivePower` unless an accumulator) |
| `applyEngine` | **39** | once per capture in Phase 2 (slot order, post-card) · `{spirit, mult, points, spirits, cards}` · `{addPoints?, addMult?, multiplyMult?}\|null` |
| `onCardSeen` | **8** | per card alongside Phase 1, to mutate engine state only · `{card, spirit, spirits}` · void |
| `getRetriggerCount` | **8** | computing extra triggers for a card under a triggerType · `{card, spirit, spirits, triggerType, isFirstCardOfCapture}` · int extra fires |
| `onRoundEnd` | **8** | round-over post-field-score (bank + natural) · `{spirit, spirits, run, roundManager}` · void |
| `applyKiBonus` | 2 | per style-combo in slot order · `{ki, spirit}` · modified ki |
| `onFieldDiscard` | 2 | per field-discard committed · `{card, source, spirit, …}` · void |
| `onRoundStart` | 1 | after reset at round start · `{spirit, …}` · void |
| `onCardDestroyed` | 1 | when a card is destroyed · `{card, spirit, run}` · void |
| `onCaptureComplete` | 1 | after a capture resolves · `{cards, spirit, run}` · intent `{draw?}\|null` |
| `onCardPlayed` · `onWoodSlotCreated` · `onSilkAntiStrand` · `onRoundEndUnplayed` · `onStackCaptured` · `onBank` · `onPushSuccess` · `onPushFailure` | 1 each | the **Tier-2 migration hooks** (event-data lifecycle); see recipe 3 |

**Dispatch sites** (all in GRM unless noted; **every dispatcher iterates `run.allSpirits`** — the full
chain incl. Negatives):
- Generic `_fireSpiritHook(hookName)` (`GRM:872`) — `onRoundStart` `:346`, `onBank` `:1009`,
  `onPushFailure` `:1013`, `onRoundEnd` `:1031`, `onPushSuccess` `:2070`.
- Scoring loop (in `_scorePipeline`): `onCardScored` `:1426` (+ retrigger `:1511`), `onCardSeen` `:1465`,
  `applyEngine` `:1549`, `onCaptureComplete` `:1615`, `applyKiBonus` `:1782`, `getRetriggerCount` `:858`.
- Tier-2 event dispatchers: `_fireCardPlayedHooks` `:905`, `_fireWoodSlotCreatedHooks` `:920`,
  `_fireSilkAntiStrandHooks` `:933`, `_fireFieldDiscardHooks` `:889`, `_fireRoundEndUnplayedHooks` `:819`,
  `_fireStackCapturedHooks` `:948`.
- RunManager: `_fireCardDestroyedEvent` (`RM:1460`). Plus the **non-hook** `onCardsCaptured` (`RM:583`),
  which directly seeds `engine_wildlife`/`engine_plenty` (the one documented exception — engine state fed
  outside the hook system; see §5).

### 2.3 The dispatch invariant

**Hook dispatch iterates `run.allSpirits`.** Scoring `onCardScored` iterates `run.scoringSpirits`
(`GRM:1420`; count = `ACCUMULATOR_SPIRIT_IDS.has(id) ? 1 : effectivePower(spirit)` — accumulators
self-scale, others are ×count). `applyEngine` and the retrigger/event dispatchers iterate `run.allSpirits`.
Effect bodies that need the chain receive it as the `spirits` param. (The architectural *why* for the
three getters is §5 anti-pattern 3; the operational "which when" is `ENGINEERING_RULES.md`.)

---

## §3 — Helper reference

### 3.1 RunManager exports — the accumulator family + economy accessors

All exported from `RunManager.js`:
- `aggregateNumericState(spirit, key)` `:86` · `longestHeldValue(spirit, key)` `:96` ·
  `incrementPerElement(spirit, key, amount=1)` `:107` · `addUniqueToElements(spirit, key, value)` `:142` ·
  `aggregateArrayLength(spirit, key)` `:168` · `aggregateUniqueCount(spirit, key)` `:176` — the per-element
  read/write family (§1.3).
- `effectivePower(spirit)` `:1599` · `getPushMultiplier(depth, outcome)` `:1611`.
- `ACCUMULATOR_SPIRIT_IDS` (Set) `:34`.
- `couponDiscountPct(stacks)` `:193` · `piggybankHandKiMult(stacks)` `:198` — the F4.37 single-source
  economy accessors, read by BOTH the RM formula and the spirit tooltip (so the formula and the displayed
  number can't drift).

### 3.2 Shared leaf modules

- `scenes/shared/consumePolicy.js` — `consumableHadEffect(result)` `:17`: the consume predicate (element
  family reports via `action`, everyone else via `success`; see recipe preamble).
- `scenes/shared/spiritTargetPicker.js` — `isPairInputType` `:21`, `computeSpiritEligibility` `:34`,
  `buildSpiritParams` `:49` (the shared picker-selection logic).
- `systems/scoringLabels.js` — `formatContributionSource(c)` `:23` (scoring-log labels).
- `scenes/shared/SpiritLayout.js` — `computeFanPositions(count, containerWidth, itemWidth, idealGap)` `:39`
  + the fan constants.
- `systems/CardMutations.js` — `getCardPoints` `:10`, `addCardBonusPoints` `:20`, `isSilk(card)` `:32`.

### 3.3 The scoring-pipeline helpers (GRM)

The Tier-3 scoring-loop dedup (`D-F4-SCORING-TIER3`) collapsed the formerly-triplicated scoring math into
one pipeline with single-home children. **Do not add a 4th scoring path — extend these** (§5):
- `_scorePipeline(cards, {phase, summaryType})` `:1308` — the shared pipeline; called by `_addCapture`
  (captured cards) AND `_scoreFieldCards` (round-end field cards).
- `_applyHexCardScored(card, cardPts, mult)` `:1201` — the hex `onCardScored` merge (one math home).
- `_computeCaptureScore(effect, points, mult, flow)` `:1222` — the hex `computeFinalScore` override, else
  `Math.round(points*mult*flow)`.
- `_fireHexOnCaptureComplete(cards)` `:1229` — the hex `onCaptureComplete`.
- `_applyCardEnhancements(card, cardPts, mult, contributions, phase='onCardScored')` `:1169` — the single
  home for the Wu Xing per-card math (Fire flat pts / Water mult / Wood mult) that was the **F4.38 triad**.
- `_heldCardContribution(handCard)` `:1242` — held-in-hand Metal/Earth mult.
- `_computeRetriggerCount(card, triggerType, isFirstCardOfCapture=false)` `:851` — universal retrigger
  count (stamp white +1 / gray +3, plus spirit `getRetriggerCount`); total fires = `1 + this`.
- `_drawIntoHand(want)` `:970` — the one home for "draw N into hand" (clamps to deck + slots; ≈10 call
  sites across GRM + ConsumableEffects). Replaces the scattered `add(draw(n))` leak sites.
- `_processCaptureCompletion()` `:2027` — the capture-completion coordinator (extracted from
  `_finalizeTurn`, F4.19; shared by the deck phase AND the Monkey/Horse consumables).

---

## §4 — "If you need X, use Y" recipes

Each recipe: the hook/helper, a minimal template, and a real exemplar to copy. **The two/three-file rule:**
every spirit = a `SPIRIT_CATALOG` def (`spirits.js`) + an `_effects` entry (`SpiritEffects.js`);
accumulators additionally need 3 RunManager-side registrations. The `_effects` key MUST equal the def `id`.

> **Before building new, check for an existing primitive.** The single most common architectural mistake
> here is writing a new path when a hook, helper, or recipe below already covers the case — every such
> reinvention is future consolidation work and a drift risk. Before adding a feature: scan this recipe
> section and the helper reference (§3) for an existing primitive that fits. Build new only when nothing
> does — and when you do, see §5's "create a receptacle" anti-pattern for where it goes.

### Recipe 1 — Add a per-card scoring spirit
**Use** `onCardScored` returning `{addPoints}` / `{addMult}` / both. Reuse a factory helper from
`SpiritEffects.js:88-179`: `monthPointAdd` / `monthMultAdd` / `monthFusion` (match `card.month`),
`verticalPointAdd|MultAdd|Fusion` (match `card.vertical`), `temporalPointAdd|MultAdd|Fusion` (match
`card.temporal`). All bail on Fire-enhanced cards and read via `_tb`.

```js
// spirits.js — SPIRIT_CATALOG:
{ id:'mything_x', name:'X', description:'Summer cards worth +20 base points.',
  tooltipBase:{ points:20 }, channel:'point', cost:3, tier:1, rarity:'common',
  category:'foundation_seasonal' },
// SpiritEffects.js — _effects (key === id); factory args MUST equal tooltipBase:
mything_x: monthPointAdd([6,7,8], 20),
// If no factory fits, write the object literal (see rank_shine, SpiritEffects.js:398):
//   mything_x: { onCardScored({card,spirit}) {
//     if (card.enhancement?.element === 'fire') return null;
//     if (<predicate>) return { addPoints:_tb(spirit,'points',20) }; return null; } },
```
Exemplar: `spring_pollen` (`SpiritEffects.js:354` + `spirits.js:52`), `fusion_bloom` (`:383`),
`fusion_atmosphere` (`:390`).

### Recipe 2 — Add an accumulator spirit
**Use** the per-element model (§1.3) — FOUR pieces. Exemplar: `engine_wildlife` / `engine_plenty`.
```js
// A. spirits.js def: tooltipBase:{ mult:0.5 }, channel:'multiplicative', category:'engine_rank_mult'.
// B. RunManager.js: add id to ACCUMULATOR_SPIRIT_IDS (:34) AND a factory to ACCUMULATOR_INIT (:51):
engine_mine: () => ({ seenThings: [] }),
// C. SpiritEffects.js _effects — MUST branch on isNegative (Negatives read flat state):
engine_mine: {
  applyEngine({ spirit }) {
    if (spirit.isNegative) {
      const arrays = spirit.state?.seenThings ?? [];
      const sum = arrays.reduce((s,a)=>s+(a?.length??0),0);
      return sum===0 ? null : { multiplyMult: 1.0 + sum*_tb(spirit,'mult',0.5) };
    }
    const n = aggregateArrayLength(spirit, 'seenThings');
    return n===0 ? null : { multiplyMult: 1.0 + n*_tb(spirit,'mult',0.5) };
  },
  // within-round trackers ALSO add onCardSeen → addUniqueToElements(...) + onRoundEnd clear (engine_radiance:433)
},
// D. SpiritEffects.js NEGATIVE_SNAPSHOT (:303): engine_mine: (s,p) => snapshotArraysFromElements(s,p,'seenThings'),
// E. ONLY if fed at capture-time out-of-band (like wildlife): add a branch to RunManager.onCardsCaptured (:583).
```
Exemplar pieces: `_effects` `SpiritEffects.js:462/507`; `ACCUMULATOR_INIT` `RunManager.js:73`;
`NEGATIVE_SNAPSHOT` `SpiritEffects.js:335`; the out-of-band seed `RunManager.js:583`.

### Recipe 3 — Add a per-round / event spirit
**Use** a Tier-2 lifecycle hook (`onFieldDiscard`, `onBank`, `onPushSuccess`, `onPushFailure`,
`onRoundEnd`, `onStackCaptured`, `onCardPlayed`, `onWoodSlotCreated`, `onRoundEndUnplayed`). For a pure
side-effect spirit, the event hook is the whole logic. For an "accumulate-then-score" engine, pair the
event hook (writes via `incrementPerElement`) with `applyEngine` (reads via `aggregateNumericState`) and
register as an accumulator (recipe 2 B+D).
```js
// Pure side-effect (econ_recycling, SpiritEffects.js:559):
econ_recycling: { onFieldDiscard({ spirit }) { run.addKi(5*effectivePower(spirit), 'recycling_discard'); } },
// Counter engine (engine_lincoln, :1134) — onBank writes, applyEngine reads (handle isNegative):
engine_mine: {
  applyEngine({ spirit }) {
    if (spirit.isNegative) { /* preTranscendTotal + newEvents*_tb*powerLevel */ }
    const n = aggregateNumericState(spirit, 'myCount');
    return n===0 ? null : { addMult: n*_tb(spirit,'mult',0.1) };
  },
  onBank({ spirit }) { incrementPerElement(spirit, 'myCount', 1); },
},
```
If the event has no existing dispatcher, add a `_fireSpiritHook('onX')` (or a `_fire*Hooks`) call at the
event site in GRM. Exemplars: `econ_recycling` (`onFieldDiscard`, dispatcher `_fireFieldDiscardHooks`
`GRM:889`), `engine_lincoln` (`onBank`, `GRM:1009`), `engine_napoleon` (`onPushFailure`, `GRM:1013`).

### Recipe 4 — Add a retrigger spirit
**Use** `getRetriggerCount` — gate on `triggerType` (`'capture'|'held_in_hand'|'discard'|'yaku'`), return
extra fires (stack-scaled via `effectivePower`). No GRM change needed — `_computeRetriggerCount` (`:851`)
already iterates `run.allSpirits`.
```js
retrigger_mine: {
  getRetriggerCount({ card, spirit, triggerType }) {
    if (triggerType !== 'capture') return 0;            // gate to the context(s) you want
    return card.type === 'animal' ? effectivePower(spirit) : 0;
  },
},
```
Exemplar: `retrigger_rainbow` (`SpiritEffects.js:1211`), `retrigger_dew` (`:1232`). For a *copy* meta-spirit
(Mirror/Memory), delegate to a resolved target inside `_evaluateWithGuard` (`game_mirror` `:642`) rather
than defining a rule — these are not plain retriggers; they proxy a neighbor's hooks.

### Recipe 5 — Add a hexagram effect
**Use** the right dispatch class (§2.1), register in `HEXAGRAM_EFFECTS` (`HexagramEffects.js:130`), and link
a hexagram to it via the `effect:` string in `hexagrams.js`.
```js
// hexagrams.js — point a hexagram at the effect id:
{ id:'hex_NN', number:NN, …, effect:'my_effect_id', description:'…', lines:[…] },

// HexagramEffects.js — Class 1 (value/flag), dispatched by applyHook:
my_effect_id: { modifyFieldSlots:(base)=>base+1 },        // value-transformer (returns a value)
//             { shouldSpiritsFireTwice:()=>true },         // flag (returns a bool)
// Class 2 (direct getActiveEffect) — side-effect / scoring merge / deck array:
my_effect_id: { onRoundStart(rm){ /* mutate state */ },
                onCardScored(card,ctx){ return card.vertical==='air' ? {multiplyMult:1.5} : null; } },
// Class 3 (Wu Xing config) — supply tier-keyed overrides; the engine calls getX(), never applyHook here:
my_wuxing_effect: { modifyFirePoints:(tier)=> tier==='upgraded' ? 200 : 60 },
```
Exemplars: Class 1 `field_plus_hand_minus` (`:461`, call site `GRM:841`) / flag `four_spirits_fire_twice`
(`:493`, `GRM:1418`); Class 2 `push_ki_swing` (`:691`, `RM:1172`) / merge `boost_air` (`:142`, applied by
`_applyHexCardScored` `GRM:1201`) / `balanced_scoring` (`:377`) / `deck_36` (`:526`); Class 3 `boost_fire`
(`:436`) / `boost_water` (`:454`), consumed by `getFireFlatPoints` (`:793`) / `getWaterMult` (`:806`). To
add a NEW Wu Xing knob, add a `modifyXxx` hook AND a matching `getXxx()` wrapper, then call `getXxx()` from
the engine.

### Recipe 6 — Add a stamp (consumable sub-family)
**Data:** add to `STAMPS` in `consumables.js` (`{id, name, tier, description, trigger:'captured'|'discarded'|
'yaku', color, hexColor, cost}`; optionally `STAMP_MIX`). **Apply:** none needed — the shared `_applyStamp`
handler auto-registers via `for (const _s of STAMPS)` (`ConsumableEffects.js:621-637`); it sets
`card.ribbonStamp`. **Runtime trigger:** stamps fire at **3 lifecycle sites by design** (§5 exception) —
wire your stamp into whichever matches its `trigger`: discard (`_dispatchStampDiscardEffects` `GRM:977`),
capture (the block in `_scorePipeline` `GRM:1626`), yaku (`GRM:2099`). For a retrigger-style stamp, add a
`count += N` branch in `_computeRetriggerCount` (`GRM:851`; `stamp_white`/`stamp_gray` live there).
Exemplar: `stamp_red` (`consumables.js:166`).

### Recipe 7 — Add a zodiac (consumable sub-family)
**Data:** add to `ZODIAC_CONSUMABLES` in `consumables.js` (`category` is a *functional* tag —
`hand|field|yaku|ki|spirit` — not `'zodiac'`; lookup is `getZodiacDef`). **Apply:** add a per-id `_effects`
entry returning `{success}`.
```js
zodiac_x: {
  inputType: 'none',                         // or 'slot' | 'yaku' | 'card' …
  execute({ roundManager, params }) {
    // if a target is needed and absent: return { success:false, needsTarget:'<inputType>' };
    return { success:true, message:'…' };    // or { success:false, message } on a genuine no-op
  },
},
```
Exemplar: `zodiac_rat` (`ConsumableEffects.js:41`, no target), `zodiac_snake` (`:104`, `inputType:'yaku'`,
two-phase `needsTarget`).

### Recipe 8 — Add a chakra (consumable sub-family)
**Data:** add to `CHAKRA_TOOLS` in `consumables.js` (`category:'chakra'`, `maxTargets:N`). **Apply:** a
per-id `_effects` entry that mutates `run._deck` cards in place. **Chakras charge NO ki at apply** (paid at
shop purchase) — call `run.notifyConsumableUsed()`, never `spendKiForConsumable`. If the op adds/removes
deck cards, delegate to a RunManager primitive (`run.duplicateCardToDeck` / `run.deleteCard`) and do NOT
also `notify` (the primitive owns its Badger/spirit-event firing).
```js
chakra_x: {
  requiresInput: true, inputType: 'card_multi',   // or 'card' | 'card_pair'
  execute({ params }) {
    const cardIds = params?.cardIds ?? [];
    if (cardIds.length > N) return { success:false, reason:'…up to N cards' };
    for (const id of cardIds) { const c = run._deck.find(x=>x.id===id); if (!c) continue;
      /* mutate c in place; set c.xConverted = true */ }
    run.notifyConsumableUsed();
    return { success:true };
  },
},
```
Exemplar: `chakra_root` (`ConsumableEffects.js:479`), `chakra_crown` (`:593`, `card_pair` identity-copy).

### Recipe 9 — Add an alchemical (consumable sub-family)
**Data:** add to `ALCHEMICAL_CONSUMABLES` in `consumables.js` (`category:'alchemical'`; `inputType` lives
on the *execute* entry, not the def). **Apply:** a per-id `_effects` entry whose `inputType` is a
`spirit_*` selection contract that the scene's `spiritTargetPicker` fulfils — `spirit_pair[_tier3]` →
`params.spiritIndices`; `spirit_single_{fusion|stackable|transcendable}` → `params.spiritIndex`;
`spirit_none` → no selection. On success call `run.notifyConsumableUsed()` (alchemicals charge ki at
purchase → Badger-notify, don't spend at apply).
```js
alch_x: {
  requiresInput: true, inputType: 'spirit_pair',          // or spirit_single_<filter> | spirit_none
  execute({ params }) {
    const { spiritIndices } = params ?? {};
    if (!spiritIndices || spiritIndices.length !== 2) return { success:false, message:'Select 2 spirits' };
    const a = run.spirits[spiritIndices[0]], b = run.spirits[spiritIndices[1]];
    // validate via findFusionRecipe / getSpiritDef / slot checks; mutate stacks;
    // run.removeZeroStackSpirits(); run._acquireSpiritStack(def,1)  (or addLegendarySpirit(def))
    run.notifyConsumableUsed();
    return { success:true, message:'…' };
  },
},
```
Exemplar: `alch_cinnabar` (`ConsumableEffects.js:273`, `spirit_pair` fusion); `alch_pearl` (`:439`,
`spirit_pair_tier3` → `addLegendarySpirit`, the capstone path — see §6).

### Recipe 10 — Add a Wu Xing element enhancement (consumable sub-family)
The system is fixed at 5 elements; this is the shape if extending. **Data:** add to `WUXING_CONSUMABLES` in
`consumables.js` (`category:'wuxing'`, `element:'x'`) + add `x` to the generative (`parentOf`) and
destructive (`destroys`) maps in `ConsumableEffects.js`. **Apply:** none needed — the shared `_applyElement`
handler auto-registers via `for (const _e of WUXING_CONSUMABLES)` (`ConsumableEffects.js:671-716`); it sets
`card.enhancement = {element, tier}` and is the **only family that returns `{action}`** (not `{success}`).
*(Note: there is no `RunManager.applyElement` — that method was removed; attach lives in
`ConsumableEffects`.)* **Proc (consumption at scoring):** add a tier-keyed getter in `HexagramEffects.js`
(mirror `getFireFlatPoints`), export it, import it in GRM, and consume `enh.element === 'x'` in
`_applyCardEnhancements` (`GRM:1169`, scored cards) and/or `_heldCardContribution` (`GRM:1242`, held cards),
pushing a `contributions` entry for the scoring-log breakdown.
Exemplar: `element_water` (`consumables.js:81`); attach `_applyElement` (`ConsumableEffects.js:671`); proc
`getWaterMult` (`HexagramEffects.js:806`) consumed at `GRM:1169`.

### Recipe 11 — Add a blessing
Blessings are **pull-model** permanent run modifiers — there is no central apply step; each effect is read
on demand at its consumption site. **Data:** append a tier-1 + tier-2 pair to `BLESSING_CATALOG`
(`blessings.js`) sharing one `effect` key (owning both *stacks*); tier-2 gets `requires:'<tier1 id>'`.
**Consumption (only if a NEW effect key):** at the relevant getter/computation add `base +=
run.countBlessingsByEffect('<effect>')`. Acquisition is just a caller of `run.addBlessing(idOrDef)` —
storage/dedupe/logging are inside it.
```js
// blessings.js — reuse an existing effect to stack, or coin a new one:
{ id:'bless_x1', name:'…', tier:1, effect:'plus_field_slot', description:'…' },
{ id:'bless_x2', name:'…', tier:2, effect:'plus_field_slot', requires:'bless_x1', description:'…' },
// consumption (new effect only) — follow spiritSlots (RunManager.js:462) or the Hotei block (GRM:186):
base += run.countBlessingsByEffect('plus_field_slot');
```
Exemplar: `bless_fisherman`/`bless_ebisu` (`blessings.js:12`); `addBlessing`/`countBlessingsByEffect`
(`RunManager.js:992`/`:1006`); read site `spiritSlots` (`RunManager.js:462`).

### No recipe — Symbionts (intentional omission)
Symbiont spirits (`sym_*`) are **deck-complete**: exactly one per animal card, mapped in
`ANIMAL_SYMBIONT_MAP` (`spirits.js`). There is no "add a symbiont" recipe because the roster is closed by
design — a new symbiont would require a new animal card, not just a spirit entry. This omission is
deliberate, not a gap.

---

## §5 — Anti-patterns

Rule · the cost it prevents · the documented exception.

1. **Don't special-case hexagram behavior with `if (hex.effect === 'xyz')` in the engine — use a hook.**
   Cost: the logic-seepage/drift the entire Phase-4 consolidation fought (the recon found zero such
   name-checks; keep it that way). **Exception: none — absolute.**

2. **Don't snapshot the spirit list — read `run.allSpirits` / `scoringSpirits` / `activeSpirits` live.**
   Cost: stale-roster bugs when mid-round acquisition (`alch_pearl` forging a capstone, Sulfur spawning a
   Negative) changes the set. GRM deliberately holds no `_spirits` snapshot. **Exception: none.**

3. **Respect the three spirit-set getters — they are genuinely different sets.** `allSpirits` = the full
   chain incl. Negatives (hook dispatch / scoring / targeting); `scoringSpirits` = scoring set incl.
   Negatives + legendaries; `activeSpirits` = the spirits ∪ legendaries union (slot-capacity /
   legendary-presence). The architectural *why*: a Negative is a full chain member but frees a slot; a
   legendary occupies its own slot and isn't in the stacking chain. **For the operational "which getter for
   which question," see `ENGINEERING_RULES.md`** (this is the deliberate cross-doc overlap — architecture
   here, operational rule there).

4. **Don't add a 4th scoring-dispatch site — extend `_scorePipeline` (§3.3).** Cost: the X1 (hex) + F4.38
   (Wu Xing) triplication that Tier-3 just collapsed into `_applyHexCardScored` / `_computeCaptureScore` /
   `_fireHexOnCaptureComplete` / `_applyCardEnhancements`. **Documented exception: the stamp discard +
   yaku triggers fire at 3 sites by design** (`_dispatchStampDiscardEffects` `GRM:977`, the capture block
   in `_scorePipeline` `GRM:1626`, the yaku block `GRM:2099`). They are distinct lifecycle events with
   distinct stamp→effect maps — NOT collapsible into one dispatcher. (Only the retrigger-count math is
   unified, via `_computeRetriggerCount`.) Do not "fix" this back into a broken merge.

5. **Don't wedge a new concern into a manager or a scene because it has no obvious home — create the
   receptacle.** When a feature genuinely has no existing category (not a spirit, consumable, hexagram,
   blessing, or existing helper family), the temptation is to drop its logic into a manager
   (`GameRoundManager`/`RunManager`) or a scene because that's where execution happens. That is exactly the
   logic-seepage Phase 4 spent its length cleaning up. Instead: create a clean new home — a new effect
   registry, a new `systems/` module, or a new `scenes/shared/` leaf — so the concern is single-homed and
   the next person finds it where it belongs. *Cost: re-creating the seepage the consolidation just
   removed.* **Exception/nuance:** "new receptacle" does NOT mean "new file for every small thing" — a
   genuinely small helper can join an existing helper family (§3) if it fits the family's concern. The test
   is single-homing-by-concern, not file count. (Complements §1.1's source-of-truth thesis: §1.1 says
   "follow the existing group"; this says "…and if there's no group, make one — don't wedge.")

**Other documented structural exceptions** (kept-inline patterns, with the architectural reason — these are
intentional, not debt):
- **Bucket-B formula-term spirits** live inline in their economy formulas because lifting them needs new
  indirection for no gain: `econ_coupon` in `getEffectiveCost` (`RM:373`), `econ_piggybank` in
  `calculateKiReward` (`RM:1318`), `econ_bonds`/`econ_ingot` in the `interestRate` getter (`RM:1346`).
- **Bucket-T scoring-pipeline globals** are loop-global by nature (they read the whole capture / running
  score, not one card): the 4 capstones (`capstone_yinyang`/`universe`/`nature`/`time`) and
  `util_northern_lion` (the lone `run.activeSpirits` accumulator, `GRM:2050`).
- **`onCardsCaptured` directly seeds `engine_wildlife`/`engine_plenty`** (`RM:583`) — the one place engine
  state is fed outside the hook system (capture-time uniqueness arrays; those two spirits have no
  `onCardSeen`).
- **Document-and-contained state machines** are round-scoped GRM machinery, not per-spirit counters:
  `sym_ducks` (`GRM:1887`), `engine_bullseye` (`_bullseyeInventory`, `GRM:2075`), `sym_osprey` (`GRM:1823`),
  `engine_golden_toad` (`GRM:1320`). Migrating them would relocate entanglement, not reduce it.
- **Capstone-flag `.some()` per capture** (`GRM:1325`) is intentionally uncached: `alch_pearl` can forge a
  capstone mid-round, so the live read is load-bearing (`D-F4-SCOPE / obs #14`, won't-fix).

---

## §6 — Accepted architecture (the "deliberate, here's why" record)

### 6.1 Import cycles — two accepted-and-contained, one severed

Not "three remaining" (the Pass-1/2 framing) — the destination audit settled this:
- **#1 `RunManager ↔ HexagramEffects` — ACCEPTED.** `getActiveEffect`/`applyHook` need `run.getHexagram()`;
  a few effect bodies read run-resident state directly. Resolves at runtime via ES-module circular-ref
  timing. Contain-note at `HexagramEffects.js:95-101` (`D-F4-HEXAGRAMS-TIER2` Ruling 2).
- **#2 `RunManager ↔ SpiritEffects` — ACCEPT-AND-CONTAIN.** The shared spirit-math helpers are used by both
  modules, so relocating them only re-imports them back. Contain-note at `RunManager.js:14-21`
  (`D-F4-SCOPE Part 2`) — and it names the cut to make if ever needed: sever the light edge
  (RM→SpiritEffects, ~2 sites: `NEGATIVE_SNAPSHOT` + `SpiritEffects.get`), not the heavy one (~25 sites).
- **#3 `ScoringEngine → SpiritEffects` (transitive) — SEVERED** (commit 83d9920). `ScoringEngine.js`
  imports only `getFireFlatPoints` (HexagramEffects) + `getCardPoints` (CardMutations); zero SpiritEffects
  references.

### 6.2 The legendary machinery and its planned decoupling

**Current build.** The legendary slot is a structure parallel to the spirit chain:
- `_legendarySpirits[]` (`RM:286`); `maxLegendarySlots` = 2 (`RM:468`); `addLegendarySpirit(def)` (`RM:962`,
  dedupes by id, stores `{id, name, legendary:true}`).
- `activeSpirits` = `[...spirits, ...legendarySpirits]` (`RM:459`); `scoringSpirits` adds Negatives
  (`RM:461`) — so legendaries fold into the chain *for scoring* via these union getters.
- **Acquisition:** the live path is `alch_pearl` — it fuses 2 Tier-3 cross-fusions into a Tier-4
  **Capstone** (gated on `capstoneDef?.capstone`) and calls `addLegendarySpirit`
  (`ConsumableEffects.js:457-465`). The only other `addLegendarySpirit` caller is the shop
  legendary-purchase branch in `ShrineScene._buyItem` (`:1005`, gated on `offering.legendary`), which is
  currently **dormant**: the F4-LEG3 cuts removed the random-legendary offering generator and the regular
  offering generator excludes legendaries (`ShrineScene.js:139`), so no offering carries `.legendary` to
  trigger it. Either way the occupant is a capstone — only the four capstones carry `legendary:true`.

**The nuance for the audit.** The slot machinery is **occupied** — but only by fused Capstones
(`capstone_yinyang`/`universe`/`nature`/`time`; `legendary:true`; their `_effects` entries are `{}` stubs,
scored inline as the Bucket-T globals of §5). Separately, the **`legend_*`-prefixed standalone spirit class
is now empty**: Gankyil + Waidan were cut and the 5 former legendary rares were demoted to `engine_*`
(F4.21); `spirits.js` contains zero `legend_` ids. So "legendary" today means "a fused capstone in the
legendary slot," not "a `legend_`-classed catalogue spirit."

**The coupling, and the plan.** The architecture still special-cases legendaries: the `activeSpirits`/
`scoringSpirits` union getters fold them into the chain, and capstone scoring is inline rather than hooked.
**Candidate I (Phase 5)** fully separates the legendary category from the spirit chain so the union getters
and inline capstone branches no longer special-case it. This is a deliberate-for-now state slated for
Phase-5 review, not a bug — see `ROADMAP.md` (Candidate I, 5B) for the decoupling plan; it is not
specified here.

---

## §7 — Pointers (one concern → one doc; see `DOC_MAP.md`)

| You want… | Go to |
|---|---|
| Game behavior / design (what a mechanic DOES) | `docs/DESIGN_DOC_V6.md` |
| Forward / deferred design (Phase-5+ intents, incl. Candidate I) | `docs/ROADMAP.md` (specs in its entries) |
| Code-cleanup tasks (renames, dead code, deferred refactors) | `docs/CODEBASE_CLEANUP.md` |
| Operational coding rules / gotchas ("which getter when," test-harness, recon-before-edit) | `docs/ENGINEERING_RULES.md` *(it indexes the deep rule-docs in `docs/reference/` — `SPIRIT_SET_ITERATION_RULE.md` + `TEST_HARNESS_GOTCHAS.md` — which stay canonical for their own content)* |
| Decisions + rationale (the record) | `docs/DECISIONS_LOG.md` |
| The forward task plan | `docs/ROADMAP.md` |
| The verified end-state backbone this doc was built on | `docs/archive/phase4/F4.24_inventory_pass3.md` |
| Where any concern's canonical doc lives | `docs/DOC_MAP.md` |
