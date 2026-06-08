# Consumable-Logic Centralization — Inventory Pass 1 (read-only recon)

**Status:** LIVING (process) — opening recon for the Tier-2 consumable-logic centralization block.
**Date:** 2026-06-07.
**Mirrors:** the spirit block's `F4.24_inventory_pass1.md` (registry census + seepage table).
**Scope:** READ-ONLY map. No source was edited. Member tasks folded in: **F4.15, F4.38, F4.34**.

> **Premise check — PASSED, with two divergences worth stating up front.**
> 1. `src/data/consumables.js` and `src/systems/ConsumableEffects.js` exist and are structured
>    as the prompt assumes. ✓
> 2. **Divergence A:** the consumable catalog is *split across three data files*, not one.
>    `consumables.js` holds only Chakra + Wu Xing + Alchemical. **Zodiac** lives in
>    `src/data/zodiacConsumables.js`; **Stamps** live in `src/data/stamps.js`.
> 3. **Divergence B (surprise):** a sixth, *legacy-dead* family — the **Four Practices**
>    (`practice_path/fasting/mind/tree`) — still has orphaned routing + RunManager apply
>    methods but **no data definition** (see §7). It is dead code, not a live consumable.
> 4. The activation/proc seam described in §4 of the prompt **exists in the code** exactly as
>    described (attach in RunManager/`applyElement`; procs scattered across GRM/ScoringEngine/
>    HexagramEffects). No STOP condition hit.

---

## 1. Consumable enumeration by family (§2)

**41 live consumables across 5 families** (+ 4 dead "Four Practices" = 45 ids total).

### Zodiac — 13 (`src/data/zodiacConsumables.js`)
Note: zodiac `category` is a *functional* tag (`hand`/`field`/`yaku`/`ki`/`spirit`), **not** `'zodiac'`.
Dispatch keys off the `zodiac_` id-prefix / fall-through, not a category string.

| id | name | one-phrase effect | category |
|----|------|-------------------|----------|
| `zodiac_rat` | Rat | Draw 2 extra cards | hand |
| `zodiac_ox` | Ox | Clear a stranded stack from one field slot | field |
| `zodiac_tiger` | Tiger | Force a push without a yaku | yaku |
| `zodiac_rabbit` | Rabbit | Remove push penalty this round | yaku |
| `zodiac_dragon` | Dragon | Ki lottery: gain 0–30 ki | ki |
| `zodiac_snake` | Snake | Lower one yaku threshold by 1 | yaku |
| `zodiac_horse` | Horse | Discard hand, redraw equal number | hand |
| `zodiac_goat` | Goat | +1 ki per capture rest of round | ki |
| `zodiac_monkey` | Monkey | Capture a field slot; discard equal from hand | field |
| `zodiac_rooster` | Rooster | +1 field slot this round (stackable) | field |
| `zodiac_dog` | Dog | Retrieve 2 cards from discard | hand |
| `zodiac_pig` | Pig | +10 ki immediately | ki |
| `zodiac_cat` | Cat | Summon a random Common spirit | spirit |

### Alchemical — 7 (`src/data/consumables.js`, `category:'alchemical'`)
| id | name | one-phrase effect |
|----|------|-------------------|
| `alch_cinnabar` | Cinnabar | Fuse 2 spirits → Tier 2/3 fusion |
| `alch_mercury` | Mercury | De-fuse a Tier 2/3 → its 2 ingredients |
| `alch_jade` | Jade | +1 stack to a spirit (max 3) |
| `alch_sulfur` | Sulfur | Duplicate one random slot, clear another |
| `alch_amber` | Amber | Transcend a spirit (Negative copy); −1 permanent field slot |
| `alch_lead` | Lead | Summon random Rare spirit; ki halved |
| `alch_pearl` | Pearl | Fuse 2 Tier-3 → Tier-4 Capstone (Legendary) |

### Wu Xing element — 5 (`src/data/consumables.js`, `category:'wuxing'`)
Each has **two distinct logic surfaces** — see §4.
| id | name | element | one-phrase effect (attach) |
|----|------|---------|----------------------------|
| `element_water` | Water | water | Apply Snow (×2 cap mult, depreciates); Metal→Ice (×4); Earth strips |
| `element_wood` | Wood | wood | Apply Leaf (slot-limit bypass); Water→Silk (anti-strand); Metal strips |
| `element_fire` | Fire | fire | Apply Ember (30 pts, all yaku, 20% break); Wood→Charcoal (100, 10%); Water strips |
| `element_earth` | Earth | earth | Apply Clay (10% ki interest in hand); Fire→Pottery (20%); Wood strips |
| `element_metal` | Metal | metal | Apply Iron (×1.5 held, 5% jackpot); Earth→Meteorite (×3.0); Fire strips |

### Chakra — 7 (`src/data/consumables.js` `CHAKRA_TOOLS`, `category:'chakra'`)
| id | name | one-phrase effect | maxTargets |
|----|------|-------------------|------------|
| `chakra_root` | Root | Toggle day/night axis of ≤3 cards | 3 |
| `chakra_sacral` | Sacral | Advance month of ≤3 cards (Dec→Jan) | 3 |
| `chakra_solar_plexus` | Solar Plexus | Cycle type of ≤2 cards | 2 |
| `chakra_heart` | Heart | Random edition to 1 card (Gold/Crystal/Ghost) | 1 |
| `chakra_throat` | Throat | Duplicate 1 card into deck | 1 |
| `chakra_third_eye` | Third Eye | Permanently delete ≤2 cards | 2 |
| `chakra_crown` | Crown | Copy all attrs of one card onto another | 2 |

### Stamp — 9 (`src/data/stamps.js`)
Stamps carry **no `category`** field (they have `tier`/`trigger`); dispatch keys off the
`stamp_` id-prefix. (Stamp *procs* — capture/discard/yaku triggers — are a separate
capture-event concern, F4.18/stamp-dispatch territory, NOT this block.)
`stamp_red`, `stamp_blue`, `stamp_yellow`, `stamp_white` (primary); `stamp_orange`,
`stamp_green`, `stamp_purple` (secondary); `stamp_black`, `stamp_gray` (tertiary/quaternary).
Mixing matrix + `mixStamps()` live in `stamps.js`.

### Four Practices — 4 (DEAD / legacy — NOT a live family)
`practice_path`, `practice_fasting`, `practice_mind`, `practice_tree`. Pre-Chakra-redesign
relics. No data array feeds them; only orphaned ShrineScene routing + RunManager apply
methods survive. See §7.

---

## 2. Consumable × logic-location seepage table (§3)

Location categories (as defined by the prompt):
**(a)** `ConsumableEffects.js .execute()` — clean home · **(b)** GameScene dispatch path ·
**(c)** scene `_cardTargetMode` targeting/UI · **(d)** inline in GameRoundManager ·
**(e)** inline in RunManager (incl. chakra/stamp/element application) · **(f)** split across several.

| Family / consumable | Effect-LOGIC home | Targeting/UI | Dispatch | Single-home? |
|---|---|---|---|---|
| **Zodiac** (all 13) | **(a)** `ConsumableEffects.js` `zodiac_*` | (c) `_showZodiacTargetPicker` (Ox/Snake/Monkey/Rooster) | **(d)→(a)** `GRM.useConsumable()` (line 789) delegates straight to `ConsumableEffects.get(id).execute()` + sym_badger | ✅ clean (a) |
| **Alchemical** (all 7) | **(a)** `ConsumableEffects.js` `alch_*` | GameScene `_showAlchemicalTargetPicker`; ShrineScene `_showSpiritSelectionOverlay` | GameScene `_activateAlchemical` (direct `ConsumableEffects.get().execute()`); ShrineScene `_activateAlchemical` (dynamic import → execute) | ✅ logic in (a). *Two parallel dispatch wrappers* (F4.15). Calls `run._acquireSpiritStack`/`replaceSpiritObj` etc. — legitimate (RunManager owns spirit state). |
| **Wu Xing — attach** (all 5) | **(e)** `RunManager.applyElement()` (1704) + `_isGenerativeElement` (1764) + `_isDestructiveElement` (1777) | (c) GameScene `_activateCardTarget`/`_onCardTargetSelected`; ShrineScene `_showBoosterPack` | scene calls `run.applyElement(cardId, element)` directly | ⚠️ **SEEPAGE** — effect logic in RunManager, not (a) |
| **Wu Xing — proc** (all 5) | **(f)** scattered: GRM scoring loop + `_applyPostRoundEnhancements`, ScoringEngine partition, HexagramEffects getters | — | fires at scoring/round-end | ⚠️ **cross-block → F4.38** (see §3) |
| **Chakra** (all 7) | **(e)** `RunManager.applyChakra{Root,Sacral,SolarPlexus,Heart,Throat,ThirdEye,Crown}()` (1509–1663) | (c) GameScene `_activateCardTarget` (+ Confirm for multi-target, 2-stage for Crown); ShrineScene `_showChakraOverlay`→`_show{Root…Crown}Overlay` | scene calls `run.applyChakra*(...)` directly | ⚠️ **SEEPAGE** — effect logic in RunManager. Minor scene-side fix-ups (Throat deck-insert, ThirdEye in-round hand removal) — see B-list. |
| **Stamp** (all 9) | **(e)** `RunManager.applyStamp()` (1674) + `mixStamps()` in `stamps.js` | (c) GameScene `_onCardTargetSelected`; ShrineScene `_showStampCardSelector` | scene calls `run.applyStamp(cardId, stampId)` directly | ⚠️ **SEEPAGE** — effect logic in RunManager, not (a) |
| **Four Practices** (4) | **(e)** `RunManager.applyPath/Fasting/Mind/Tree()` + ShrineScene `_showPracticeOverlay` | (dead) | **unreachable** | ☠️ **DEAD** — no data def; F4.1-style removal |

**Seepage summary:** zodiac + alchemical are clean (home = `ConsumableEffects.js`). The
*activation/attach* surfaces of **Wu Xing, Chakra, and Stamp** are all resident in **RunManager
(location e)** — that is the block's core seepage. Scenes do targeting/UI only (no inline
game-state effect logic was found in GameScene or ShrineScene — both delegate cleanly).

---

## 3. Wu Xing activation/proc two-surface map (§4)

The two surfaces are genuinely separate in the code. **This block owns only the attach surface.**

| Element | **Attach surface** (THIS block) | **Proc surface** (→ F4.38, NOT here) |
|---|---|---|
| Water | `RunManager.applyElement` (e) | `getWaterMult(tier,depLevel)` in HexagramEffects (742); applied GRM `_scoreFieldCards`:470, capture:1414, retrigger:1547; `depLevel++` GRM `_applyPostRoundEnhancements`:~823 |
| Wood | `RunManager.applyElement` (e) | Leaf/Silk slot bypass — FieldManager (`playHandCard*`, `addFlippedCard`); `_doDeckPhase` anti-strand. (Not a scoring proc; visually apparent per F4.38.) |
| Fire | `RunManager.applyElement` (e) | `getFireFlatPoints`/`getFireBreakChance` (HexagramEffects 729–735); flat pts GRM capture:~1406, retrigger:1546; all-4-yaku partition ScoringEngine `_partition` ~72–86; break roll GRM `_applyPostRoundEnhancements` ~835–851 |
| Earth | `RunManager.applyElement` (e) | `getEarthInterestRate` (HexagramEffects 757); `_computeEarthKiBonus` GRM ~888–907; `_lastEarthKiGain` reset startRound:333, getter:286; consumed in `_buildRoundEndResult`:~1219 |
| Metal | `RunManager.applyElement` (e) | `getMetalHeldMult`/`getMeteoriteJackpotChance` (HexagramEffects 749–755); held-mult GRM capture ~1365–1390; jackpot roll ~1373 |

**The boundary:** the *act of attaching/upgrading/stripping* an enhancement = consumable
territory (one method, `applyElement`). The *per-scoring-pass behavior* of an attached
enhancement = enhancement-proc territory, scattered across GRM + ScoringEngine + HexagramEffects,
and is **F4.38**'s subject (proposed new `EnhancementEffects.js`). Do not migrate procs here.

---

## 4. Canonical-home recommendation (§5)

**Proposed rule (mirrors the Phase-4 source-of-truth thesis, consumable layer):**

> **Targeting/UI stays in the scene** (picking which card/slot/spirit to apply to is a scene
> concern — keep `_cardTargetMode`, `_show*Overlay`, `_show*TargetPicker` where they are).
> **Effect LOGIC belongs in `ConsumableEffects.js`** as `execute({roundManager, params})`
> entries — the home zodiac + alchemical already use. **Enhancement *procs* belong to F4.38's
> home (likely `EnhancementEffects.js`), NOT `ConsumableEffects.js`.**

**Naming the activation/proc boundary explicitly:**
- `ConsumableEffects.js` owns: zodiac effects (already), alchemical effects (already), **and
  the activation/attach surfaces of Wu Xing / Chakra / Stamp** (to be migrated out of RunManager).
- `EnhancementEffects.js` (F4.38) owns: the per-scoring-pass enhancement procs (Water depLevel,
  Fire break, Earth interest, Metal jackpot/held-mult).

**RunManager-resident chakra/stamp/element-attach application — recommendation: MIGRATE to
`ConsumableEffects.js`.** Reasoning:
1. These are *pure consumable-triggered card mutations* — exactly the "logic seepage into a
   manager file" the thesis targets, one layer down from the spirit block.
2. The precedent already exists: `alch_amber`/`alch_sulfur` etc. live in `ConsumableEffects`
   and freely call RunManager *primitives* (`_acquireSpiritStack`, `replaceSpiritObj`). The
   chakra/stamp/element methods are **no more entangled** — they call deck primitives
   (`deleteCard`, `insertIntoDrawPile`) and `mixStamps`, all of which can stay as primitives.
3. `ConsumableEffects.js` already imports the `run` singleton, so a shrine-context execute()
   (no `roundManager`) can mutate `run._deck` the same way the alchemical entries mutate spirits.
4. Migrating unblocks **F4.15**: once every family's effect body is an `execute()` entry, the
   three GameScene dispatch paths collapse to one `ConsumableEffects.get(id).execute()` call.

**Keep in RunManager / DeckManager as shared primitives** (called by the migrated entries):
`deleteCard`, `insertIntoDrawPile`, `mixStamps` (data-file), `_acquireSpiritStack`,
`replaceSpiritObj`, `addKi`, `_notifyBadger`. The migration moves *orchestration*, not primitives.

---

## 5. Triage — Bucket A / Bucket B / cross-block (§6)

### Bucket A — MIGRATE (effect logic outside its canonical home, self-contained)

| # | Item | Current location | Target home | Risk |
|---|------|------------------|-------------|------|
| A1 | `applyStamp()` + (data `mixStamps`) | RunManager (e) 1674 | `ConsumableEffects.js` `stamp_*` execute | **Low** — single method, ki-deduct + mix + badger |
| A2 | `applyChakra{Root,Sacral,SolarPlexus,Heart,Throat,ThirdEye,Crown}()` (7) | RunManager (e) 1509–1663 | `ConsumableEffects.js` `chakra_*` execute | **Med** — card mutations; Heart RNG editions, Throat reads engine_palace + deck insert, ThirdEye `deleteCard` |
| A3 | `applyElement()` + `_isGenerativeElement` + `_isDestructiveElement` (attach surface only) | RunManager (e) 1704/1764/1777 | `ConsumableEffects.js` `element_*` execute | **Med** — generative/destructive state machine, `returnedConsumable` on strip, `_notifyBadger`, called from 2 scenes |
| A4 | **F4.15** dispatch unification | GameScene 3 paths (`_activateCardTarget` / `_activateAlchemical` / zodiac fall-through) + ShrineScene wrappers | one `ConsumableEffects.get(id).execute()` dispatch | **Med-High** — UI refactor across 2 scenes; do LAST (after A1–A3 give it one consistent target) |

**Bucket A count: 4 campaigns** covering **11 RunManager methods** (1 stamp + 7 chakra + 3 element)
plus the F4.15 dispatch consolidation.

> **F4.15 validation vs. OVERHAUL_PLAN `_useConsumable` proposal:** the plan's
> `_useConsumable`/`_executeAndFinalize` is a **proposal, not current code** — confirmed. Current
> reality (verified): GameScene routes via `_renderActionButtons` (~2087) into
> `isCardTarget` (id-prefix `element_`/`stamp_`/`chakra_`) → `_activateCardTarget`;
> `cons.category==='alchemical'` → `_activateAlchemical`; else → `GRM.useConsumable` (zodiac).
> Divergence from the proposal: zodiac already routes cleanly through `GRM.useConsumable`→
> `ConsumableEffects` (so zodiac is *already* on the clean path the proposal wanted); the work
> is moving the other three families onto it and collapsing the wrappers.

### Bucket B — DOCUMENT-ONLY (a term in a core-owned formula / clearer in place)

| Item | Why it stays |
|------|--------------|
| `GRM.useConsumable` sym_badger increment (797–801) | Cross-cutting spirit-tracking hook owned by the dispatch seam; not consumable-specific logic. Document, don't move. |
| GameScene in-round fix-ups: Throat deck-insert (`this._round.deck.insertIntoDrawPile`), ThirdEye in-round hand removal (`removeCardFromHand`) | These reconcile the *in-round* hand/deck view with a chakra applied mid-round. Arguably round/scene state, not consumable effect. Re-evaluate during A2 — may fold into the migrated execute() if `roundManager` is passed; otherwise document as a legitimate scene concern. |
| Iron/Meteorite "×mult when held in hand during scoring" | The prompt's Bucket-B candidate. **Verdict: it is a *proc*, not Bucket B** — it's a multiplier term inside the GRM capture-scoring loop (~1365–1390) and belongs to **F4.38**, not here. (Were F4.38 not carved out, it would read as a scoring-formula term best left in place — but F4.38 *is* the designated home, so → cross-block.) |

### Cross-block / defer

| Item | Disposition |
|------|-------------|
| **F4.38** — Wu Xing enhancement **proc** surface (Water depLevel, Fire break, Earth interest, Metal jackpot/held-mult) | Locations mapped in §3. Belongs to new `EnhancementEffects.js`. **Do not migrate in this block.** Coordinate: this block's A3 (`applyElement` attach) should land *before or alongside* F4.38 so attach and proc end up in their respective clean homes without a second pass. |
| **F4.34** — `SNOW_MULT`/`ICE_MULT` vestigial exports | **Verified still vestigial: zero importers** of `SNOW_MULT`/`ICE_MULT` anywhere in `src/`. All live Water-mult math goes through `getWaterMult()` (HexagramEffects). F4.34 is now just *export deletion* (the "route consumers through getWaterMult" step is already done). Small, standalone; can ship independently or ride F4.38. Adjacent to this block (Water) but not Bucket A. |
| Alchemical → RunManager spirit-helper calls (`_acquireSpiritStack`, `replaceSpiritObj`, `_addPastLifeCopy`, `summonSpirit`) | **Not seepage.** RunManager rightly owns spirit-set mutation; ConsumableEffects orchestrating via these primitives is the intended pattern. No action. |
| **Four Practices** dead code (`_showPracticeOverlay`, `_showPathOverlay/Fasting/Mind/Tree`, `RunManager.applyPath/Fasting/Mind/Tree`, ShrineScene color map 719–720) | **F4.1-style dead-code removal**, not a migration. No data array; legacy pre-Chakra. Flag for a separate cleanup task; out of scope for centralization. |

---

## 6. Recommended Bucket A campaign ordering (§6 — lowest-risk first)

1. **A1 — Stamp** (`applyStamp` → `ConsumableEffects` `stamp_*`). Smallest, single method, one
   call-site pattern in each scene. Proves the migration shape (run-singleton deck/data access
   from an execute() body) with minimal blast radius.
2. **A2 — Chakra** (7 `applyChakra*` → `chakra_*` execute). Larger but mechanically uniform
   card mutations. Watch Crown (2-stage), Heart (RNG editions), Throat (engine_palace read +
   deck insert), ThirdEye (`deleteCard`). Resolve the Bucket-B in-round fix-ups here.
3. **A3 — Wu Xing attach** (`applyElement` + cycle helpers → `element_*` execute). Highest risk
   of the three (cross-scene call sites, `returnedConsumable` strip path, badger). Sequence so
   it dovetails with **F4.38** (proc surface) to avoid touching the element pipeline twice.
4. **A4 — F4.15 dispatch unification.** Do **last**: with A1–A3 done, every family is an
   `execute()` entry, so GameScene's three paths + ShrineScene's wrappers collapse to a single
   `ConsumableEffects.get(id).execute({roundManager, params})` dispatch with a uniform
   needsTarget/targeting contract.

---

## 7. Surprises — more scattered (or less) than the kickoff anticipated

1. **Catalog is split across 3 data files**, not one. Zodiac → `zodiacConsumables.js`,
   Stamps → `stamps.js`, the rest → `consumables.js`. `ConsumableEffects.js`'s header comment
   ("Implemented consumables (13 zodiac)") is stale — it also implements all 7 alchemicals.
2. **Zodiac is already on the clean path.** Despite F4.15 framing it as one of three offending
   paths, zodiac effect logic already lives in `ConsumableEffects.js` and dispatches through
   `GRM.useConsumable()` (pure delegation, line 789). The real seepage is the *other* three
   families (Wu Xing/Chakra/Stamp) sitting in **RunManager**, plus the *dispatch-wrapper*
   duplication. F4.15 is more "move 3 families onto the path zodiac already uses + collapse
   wrappers" than "unify three equal paths."
3. **Scenes are clean.** No inline game-state effect logic was found in GameScene *or*
   ShrineScene — both do targeting/UI and delegate. The seepage is manager-resident (RunManager),
   not scene-resident, which is the opposite of where the spirit block found a lot of its seepage.
4. **Two parallel `_activateAlchemical` implementations** (GameScene direct import vs. ShrineScene
   dynamic import) for the *same* alchemical effects — a dispatch fork F4.15 should also unify.
5. **Four Practices is live-looking dead code.** `_showPracticeOverlay` + `applyPath/Fasting/
   Mind/Tree` + a color map still reference `practice_*` ids, but the defining data array was
   removed; nothing can reach them. Pure orphan. (Confirmed via OVERHAUL_PLAN §"dead methods"
   line 2533 and `cleanup-audit-report.md`.)
6. **F4.34 is further along than logged** — the getWaterMult routing is already the only live
   path; only the dead `SNOW_MULT`/`ICE_MULT` *exports* remain to delete.
7. **Stamps carry no `category`** and zodiac's `category` is functional (`hand`/`field`/…), so
   the current dispatch leans on **id-prefix string matching** (`element_`/`stamp_`/`chakra_`)
   rather than a uniform `category` field — a fragility F4.15's unified dispatch should normalize
   (e.g. a single `category`/`dispatchKind` field per consumable).

---

## 8. Campaign decisions (appended as campaigns scope)

### A1 — Stamp → ConsumableEffects ✅ SHIPPED 2026-06-07
Card mutation (mix + `ribbonStamp` write + `logCardStamped`) moved to a shared
`ConsumableEffects` handler registered for all 9 stamp ids. Ki spend + Badger stay
RunManager-owned via new `run.spendKiForConsumable(baseCost)`. Both scene call sites route
through `ConsumableEffects.get(id).execute()`. `RunManager.applyStamp` removed. Test:
`test/consumables/stamp_apply.test.js`.

### A2 — Chakra class: DETERMINATION = **Option A (all seven migrate)**

**Chakra × state-touches (verified against source, RunManager 1524–1678):**

| Chakra | Home | Mutates | Also fires | External deps | Caller entanglement |
|---|---|---|---|---|---|
| Root | RM | card fields (temporal flip + flag) | `_notifyBadger` | — | none |
| Sacral | RM | card fields (month/name/vertical + flag) | `_notifyBadger` | **`_baseCardLookup`** (module-private Map) | none |
| Solar Plexus | RM | card fields (type/points/name + flag) | `_notifyBadger` | inline CYCLE/POINTS/TYPE_NAMES tables | none |
| Heart | RM | card field (random `edition`) | `_notifyBadger` | `Math.random` | none |
| Crown | RM | full identity `Object.assign` deep-clone | `_notifyBadger` | — | two-stage target pick (scene) |
| Third Eye | RM | **deck membership** (delete) | via `deleteCard`: `_fireCardDestroyedEvent`, `_notifyBadger` | `deleteCard` (existing primitive) | GameScene `removeCardFromHand` (round-view) |
| Throat | RM | **deck membership** (duplicate→push) | `engine_palace` cardsAdded, `_notifyBadger` | `_throatCounter` instance state | GameScene `deck.insertIntoDrawPile(newCard)` (round-view) |

**Crown home (§4): confirmed RunManager-resident**, structurally identical to the other
card-field mutators (no GRM residence; the within-class-inconsistency worry is refuted).

**Throat / Third Eye coupling verdicts (3-condition Bucket-B test):** both ARE deck-membership +
spirit-event ops that RunManager rightly owns, so in isolation each reads as Bucket-B. BUT the
decision unit is the CLASS, and leaving 2 of 7 in RunManager would *perpetuate* the "chakras in
two places" anti-state and block F4.15 (every consumable must be dispatchable via the registry).
Resolution: migrate them as **thin `.execute()` handlers that call RunManager primitives** — the
collection-invariant work stays correctly owned (exactly the A1 rule + how `alch_*` calls
`run._acquireSpiritStack`). A thin uniform-dispatch handler is not "indirection for nothing"; the
registry-routability IS the value. → **Option A, not C** (a 5/2 split would be the inconsistency
we're ending, not a real boundary).

**[PRESERVE] invariants A2 must honor:**
1. **Chakras do NOT charge ki at apply** (unlike stamps). Cost is paid at shop purchase; ShrineScene
   overlays show "X ki paid" and *refund* on cancel. A2 handlers call **badger only**, NOT
   `spendKiForConsumable`. Adding ki deduction would double-charge — a behavior bug.
2. Caller-side round-view sync stays in GameScene: Throat→`insertIntoDrawPile(newCard)`,
   Third Eye→`removeCardFromHand` (single + multi). Handlers return `newCard`/`success` as today.

**Latent finding (clean up during A2, not before):** the single-target handler
(`_onCardTargetSelected`, GameScene ~2410–2422) passes `card.id` (a **string**) to the
array-expecting Root/Sacral/SolarPlexus/ThirdEye methods. Those branches are **unreachable** —
those four are maxTargets>1 and route through the multi-target Confirm path (~2037–2040). Only
Heart/Throat/Crown legitimately reach the single-target handler. A2's unified dispatch should
delete the dead branches and normalize on an array signature.

**A2 primitive-extraction + migration plan (ordered, lowest-risk first):**
1. Migrate the 5 card-field mutators (carry bodies into `ConsumableEffects`): **Root → Solar
   Plexus → Heart → Crown → Sacral**. Sacral needs a base-card lookup exposed (export
   `getBaseCard(month,type)` / the `_baseCardLookup` map from RunManager or cards.js — the one
   non-trivial extraction).
2. **Third Eye:** handler = ≤2 guard + loop over existing `run.deleteCard(id)`.
3. **Throat:** extract `run.duplicateCardToDeck(cardId) → { newCard }` (owns `_throatCounter`++,
   deep-clone+suffix, `_deck.push`, `engine_palace` counter, badger); handler calls it, returns
   `newCard`; scene keeps the draw-pile insert.
4. Rewire both scene paths + ShrineScene overlays to `ConsumableEffects.get(id).execute()`;
   delete the unreachable single-target branches; consider a small `run.notifyConsumableUsed()`
   public alias so handlers don't reach `_notifyBadger` directly.

### A2 — Chakra → ConsumableEffects ✅ SHIPPED 2026-06-07
All 7 chakras migrated (Option A). 5 card-field handlers carry their bodies; Third Eye loops
`run.deleteCard`; Throat calls extracted `run.duplicateCardToDeck`. `getBaseCard(month,type)`
added to cards.js and `_baseCardLookup` deleted (promoteCard repointed — one lookup). Added
public `run.notifyConsumableUsed()`. INVARIANT held: chakras charge no ki at apply. Dead
single-target branches removed. Test: `test/consumables/chakra_apply.test.js` (10 cases).

### A3 — Wu Xing attach: PRE-RECON (proc-surface boundary) — VERDICT = **SHARED-STATE**

Boundary map (read-only) for the Wu Xing *attach* migration (A3). Attach = `RunManager.applyElement`
+ `_createBaseEnhancement` + `_isGenerativeElement`/`_isDestructiveElement`. Proc = per-scoring /
round-end behavior of the attached `card.enhancement`.

**Proc-site table** (element × site / phase / enhancement fields read / writes):

| Element | Proc site(s) | Phase | Reads | Writes enh? |
|---|---|---|---|---|
| Water | `getWaterMult(tier,depLevel)` GRM:470/1414/1547; **depLevel++** GRM:823 | per-card score + round-end | `tier`,`depLevel` | **YES — depLevel++ (round-end only)** |
| Fire | `getFireFlatPoints` GRM:465/1407/1546; yaku wildcard `_selectAdditiveYakuCards` 864–879 (+ScoringEngine partition); break roll GRM:835–851 | per-card score + yaku select + round-end | `tier`,`element` | No — break calls `run.deleteCard` (deck membership), never writes enh |
| Earth | `getEarthInterestRate` `_computeEarthKiBonus` GRM:888–906; `getEarthHeldMult` GRM:1384 | round-end ki + held-in-hand | `tier`,`element` | No |
| Metal | `getMetalHeldMult` GRM:1370; jackpot `getMeteoriteJackpotChance` GRM:1373 | held-in-hand (Phase 1) | `tier`,`element` | No |
| Wood | `getWoodScoringMult` GRM:475/1421/1548; slot-create `woodSlotCreated` FieldManager 185/249/322 | per-card score + placement | `tier`,`element` | No |

Observing spirits: Glacier (Water dep), Carbon (Fire break), Fossil (Earth interest), Velocity
(Metal) — all READ-only on enhancement, accrue via `incrementPerElement`.

**Coupling resolution (`depLevel`/`tier` — the worry):** the ONLY proc-side write to
`card.enhancement` anywhere is GRM:823 (`depLevel = (depLevel ?? 0) + 1`) at round-end. Attach
writes `depLevel = 0` (base water) / resets to 0 on generative upgrade; proc increments at
round-end. These writes are **temporally disjoint** — attach is a player action (in-round
consumable or shrine), proc is `_applyPostRoundEnhancements` at bank/finalize; they never write
`depLevel` in the same synchronous flow, so relocating attach cannot introduce a race. No proc
reads `applyElement` internals or the generative/destructive maps. No proc writes `tier`/`element`.

**Verdict: SHARED-STATE.** The boundary is cleanly separable in CODE (procs live in GRM scoring /
round-end; attach in RunManager) — **A3 touches ZERO proc sites** — but attach and proc share the
`card.enhancement` state contract, which A3 must preserve **byte-identically**:
1. Base apply / overwrite → `{ element, tier:'base' }`, plus `depLevel:0` **only if water**.
2. Generative upgrade → `tier='upgraded'`; `if (current.depLevel !== undefined) current.depLevel = 0`.
3. Destructive strip → `card.enhancement = null`.
4. `depLevel` stays **water-only / absent on non-water** (proc reads `depLevel ?? 0`; the upgrade
   reset gates on `!== undefined` — adding depLevel to non-water would change upgrade behavior).
5. `returnedConsumable: 'element_'+strippedElement` on strip (scene refund path depends on it).

So A3 = relocate `applyElement` + the 2 cycle helpers + `_createBaseEnhancement` into a
ConsumableEffects `element_*` handler, preserving the above contract; the proc surface is left
entirely to F4.38. **F4.34 reconfirmed:** `SNOW_MULT`/`ICE_MULT` (ScoringEngine) have zero
importers — live path is `getWaterMult`; GameplayLogger uses its own local arrays. (Aside, not A3
scope: three different Water-dep representations now exist — `getWaterMult` formula, ScoringEngine
arrays, logger-local arrays — a display-drift cleanup for F4.34/F4.38, flagged not fixed.)
