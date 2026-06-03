# Hanatu — Codebase Inventory Audit
**Date:** 2026-04-23
**Branch:** `ui-overhaul`
**Engine:** Phaser 3, canvas 1280×720, ES modules via Vite

---

## 1. SPIRITS

### Tier 1 — Seasonal Point (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `spring_pollen` | Spring Pollen | +20 base pts per spring card (months 3–5) | addPoints × stackCount |
| `summer_heat` | Summer Heat | +20 base pts per summer card (months 6–8) | addPoints × stackCount |
| `autumn_harvest` | Autumn Harvest | +20 base pts per autumn card (months 9–11) | addPoints × stackCount |
| `winter_cold` | Winter Cold | +20 base pts per winter card (months 12, 1, 2) | addPoints × stackCount |

### Tier 1 — Seasonal Additive Mult (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `spring_bees` | Spring Bees | +5 addMult per spring card captured | addMult × stackCount |
| `summer_humidity` | Summer Humidity | +5 addMult per summer card captured | addMult × stackCount |
| `autumn_leaves` | Autumn Leaves | +5 addMult per autumn card captured | addMult × stackCount |
| `winter_aridity` | Winter Aridity | +5 addMult per winter card captured | addMult × stackCount |

### Tier 1 — Axis Point (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `sky_clouds` | Sky Clouds | +10 base pts per sky (vertical=air) card | addPoints × stackCount |
| `land_soil` | Land Soil | +10 base pts per land (vertical=land) card | addPoints × stackCount |
| `day_light` | Day Light | +10 base pts per day (temporal=day) card | addPoints × stackCount |
| `night_dark` | Night Dark | +10 base pts per night (temporal=night) card | addPoints × stackCount |

### Tier 1 — Axis Additive Mult (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `sky_wind` | Sky Wind | +5 addMult per sky card captured | addMult × stackCount |
| `land_rock` | Land Rock | +5 addMult per land card captured | addMult × stackCount |
| `day_movement` | Day Movement | +5 addMult per day card captured | addMult × stackCount |
| `night_stillness` | Night Stillness | +5 addMult per night card captured | addMult × stackCount |

### Tier 1 — Rank Foundation (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `rank_shine` | Shine | Bright cards +80 pts, +8 addMult per bright | addPoints × count, addMult × count |
| `rank_pulse` | Pulse | Animal cards +50 pts, +5 addMult per animal | addPoints × count, addMult × count |
| `rank_poem` | Poem | Ribbon cards +40 pts, +4 addMult per ribbon | addPoints × count, addMult × count |
| `rank_salt` | Salt | Plain cards +20 pts, +2 addMult per plain | addPoints × count, addMult × count |

### Tier 1 — Rank Engine (cost 3 each)

| ID | Name | Effect | Stacking |
|----|------|--------|----------|
| `engine_radiance` | Radiance | ×2.0 multMult per bright captured this round (exponential) | onCardSeen fires N times (accelerated accumulation); applyEngine once |
| `engine_wildlife` | Wildlife | Permanently +0.5 multMult per unique animal species captured | onCardSeen fires N times; applyEngine once |
| `engine_banner` | Banner | +1.0 multMult per ribbon captured this round | onCardSeen fires N times; applyEngine once |
| `engine_plenty` | Plenty | Permanently +0.1 multMult per unique plain card captured | onCardSeen fires N times; applyEngine once |

> **Engine stacking rule:** `onCardSeen` fires `stackCount` times per capture (accelerates counter). `applyEngine` fires once (reads counter). Stacking is expressed through accelerated accumulation, not by doubling the final result.

### Tier 1 — Rank Utility

| ID | Name | Cost | Effect | Status |
|----|------|------|--------|--------|
| `util_glory` | Glory | 3 | Bright captured → draw 3 cards | ✅ |
| `util_festival` | Festival | 3 | Ribbon captured → stamp a bonus | ⚠️ "(Coming soon)" — not implemented |
| `util_irrigation` | Irrigation | 3 | Plain captured → +10 bonus pts | ✅ |
| `util_symbiosis` | Symbiosis | 7 | Animal captured → summon symbiont spirit into open slot | ✅ |

### Tier 1 — Economy Spirits

| ID | Name | Cost | Effect | Status |
|----|------|------|--------|--------|
| `econ_bonds` | Bonds | 4 | +10% interest rate on ki at round start (20% total) | ✅ |
| `econ_ingot` | Ingot | 4 | +0.1% interest per 1 ki held (scales with wealth) | ✅ |
| `econ_grace` | Grace | 3 | Style combos earn double ki at round end | ✅ |
| `econ_recycling` | Recycling | 3 | +5 ki whenever a card is discarded due to full field | ✅ |
| `econ_lucky_charm` | Lucky Charm | 4 | On push, gain ki = 50% of current balance (max 20) | ✅ |
| `econ_piggybank` | Piggy Bank | 3 | Hand cards at round end earn 3× ki instead of 1× | ✅ |
| `econ_coupon` | Coupon | 5 | All shrine shop prices 20% cheaper | ✅ |
| `econ_replica` | Replica | 5 | Duplicate a consumable at round start | ⚠️ "(Coming soon)" |
| `econ_print` | Print | 4 | Generate bonus ki each time ki is spent in shop | ⚠️ "(Coming soon)" |
| `econ_present` | Present | 4 | Random consumable when yaku first triggers | ⚠️ "(Coming soon)" |
| `econ_collector` | Collector | 3 | Each round held earns +3 ki bonus at round end | ⚠️ "(Coming soon)" |

### Tier 1 — Gameplay Spirits

| ID | Name | Cost | Effect | Status |
|----|------|------|--------|--------|
| `game_expanse` | Expanse | 4 | Field holds 2 extra slots (10 total) | ✅ |
| `game_well` | Well | 3 | Draw 1 extra card whenever you capture | ✅ |
| `game_catcher` | Catcher | 4 | Cards discarded from full hand go to field instead | ✅ |
| `game_surplus` | Surplus | 4 | Start each round with 2 extra cards in hand | ✅ |
| `game_gankyil` | Gankyil | 5 | Stack of 3 cards on a field slot captured immediately | ✅ |
| `game_angel` | Angel | 3 | Each push deals 1 extra card | ✅ |
| `game_mirror` | Mirror | 6 | Adjacent spirit's scoring channel triggers twice | ⚠️ "(Coming soon)" |
| `game_echo` | Echo | 4 | First card captured each round scores twice | ⚠️ "(Coming soon)" |

### Tier 1 — Wu Xing Engine Spirits

| ID | Name | Cost | Effect | Stacking |
|----|------|------|--------|---------|
| `engine_glacier` | Glacier | 4 | Permanently +0.3 multMult per Water card depreciation | applyEngine once |
| `engine_carbon` | Carbon | 4 | Permanently +0.5 multMult per Fire card combustion | applyEngine once |
| `engine_velocity` | Velocity | 4 | Permanently +0.3 multMult per Metal card proc | applyEngine once |
| `engine_fossil` | Fossil | 3 | Permanently +0.2 multMult per Earth card currently in deck | applyEngine once |
| `engine_moths` | Moths | 4 | Permanently +0.4 multMult per Wood Silk anti-strand trigger | applyEngine once |

### Tier 2 — Seasonal Fusion (Sacred Grove only, cost 0 — acquired via Fusion Ritual)

| ID | Name | Inputs | Effect |
|----|------|--------|--------|
| `fusion_bloom` | Bloom | spring_pollen + spring_bees | Spring cards +15 pts, +3 addMult per spring card |
| `fusion_thunderstorm` | Thunderstorm | summer_heat + summer_humidity | Summer cards +15 pts, +3 addMult per summer card |
| `fusion_decay` | Decay | autumn_harvest + autumn_leaves | Autumn cards +15 pts, +3 addMult per autumn card |
| `fusion_blizzard` | Blizzard | winter_cold + winter_aridity | Winter cards +15 pts, +3 addMult per winter card |

### Tier 2 — Axis Fusion (Sacred Grove only, cost 0)

| ID | Name | Inputs | Effect |
|----|------|--------|--------|
| `fusion_atmosphere` | Atmosphere | sky_clouds + sky_wind | Sky cards +8 pts, +3 addMult per sky card |
| `fusion_continent` | Continent | land_soil + land_rock | Land cards +8 pts, +3 addMult per land card |
| `fusion_sun` | Sun | day_light + day_movement | Day cards +8 pts, +3 addMult per day card |
| `fusion_moon` | Moon | night_dark + night_stillness | Night cards +8 pts, +3 addMult per night card |

### Tier 3 — Cross-Fusion (Sacred Grove only, cost 0)

| ID | Name | Inputs | Effect |
|----|------|--------|--------|
| `cross_yang` | Yang | fusion_atmosphere + fusion_sun | Sky OR Day cards → ×2.0 multMult |
| `cross_yin` | Yin | fusion_continent + fusion_moon | Land OR Night cards → ×2.0 multMult |
| `cross_space` | Space | fusion_atmosphere + fusion_moon | Sky OR Night cards → ×1.5 multMult |
| `cross_energy` | Energy | fusion_continent + fusion_sun | Land OR Day cards → ×1.5 multMult |
| `cross_solstice` | Solstice | fusion_thunderstorm + fusion_blizzard | Summer OR Winter cards → ×2.0 multMult |
| `cross_equinox` | Equinox | fusion_bloom + fusion_decay | Spring OR Autumn cards → ×2.0 multMult |
| `cross_tropic` | Tropic | fusion_bloom + fusion_thunderstorm | Spring OR Summer cards → ×1.5 multMult |
| `cross_arctic` | Arctic | fusion_decay + fusion_blizzard | Autumn OR Winter cards → ×1.5 multMult |

> Cross-fusion effects use `onCardScored` → `{ multiplyMult: X }`, so stacking scales as `multiplyMult × stackCount`.

### Tier 4 — Unity Spirits (Sacred Grove only, cost 0)

| ID | Name | Inputs | Effect |
|----|------|--------|--------|
| `unity_yinyang` | Yin-Yang | cross_yang + cross_yin | ⚠️ "Effect TBD" — not implemented |
| `unity_gravity` | Gravity | cross_space + cross_energy | ⚠️ "Effect TBD" — not implemented |
| `unity_time` | Time | cross_solstice + cross_equinox | ⚠️ "Effect TBD" — not implemented |
| `unity_planet` | Planet | cross_tropic + cross_arctic | ⚠️ "Effect TBD" — not implemented |

### Symbiont Spirits (generated by `util_symbiosis`, not purchasable)

| ID | Name | Source Animal | Effect | Status |
|----|------|---------------|--------|--------|
| `sym_caterpillar` | Caterpillar | february_warbler | Eats Leaf-enhanced cards on capture (removed from deck, no yaku). After 3 eaten, metamorphoses into copy of random equipped spirit | ✅ |
| `sym_cuckoo_egg` | Cuckoo Egg | april_cuckoo | Blocks slot 3 rounds. Hatches into random Tier 2 fusion spirit | ✅ |
| `sym_algae` | Algae | may_bridge | +0.3 multMult per symbiont summoned this run | ✅ |
| `sym_ants` | Ants | june_butterflies | +addMult equal to total spirits equipped | ✅ |
| `sym_crow` | Crow | july_boar | First deck flip each round is captured instead of placed | ✅ |
| `sym_ducks` | Ducks | august_geese | +0.3 multMult per 2-card pair captured this round (resets) | ✅ |
| `sym_snails` | Snails | september_sake | Permanently +0.2 multMult per card NOT played at round end | ✅ |
| `sym_magpie` | Magpie | october_deer | +3 ki each time a style combo triggers | ✅ |
| `sym_osprey` | Osprey | november_swallow | Once per round, capture 1 field card directly before playing | ✅ |

> **General stacking note:** Negative spirits (transcended copies) always use count=1. All Fire-enhanced cards are skipped by per-card and axis/seasonal spirit factory functions.

---

## 2. CONSUMABLES

### Four Practices (shop TR quadrant, instant-apply overlay)

| ID | Name | Cost | Effect | Max Targets |
|----|------|------|--------|-------------|
| `practice_path` | Path | 6 ki | Change up to 4 cards to a target card's month | 4 |
| `practice_fasting` | Fasting | 6 ki | Promote the type of up to 3 cards (plain→ribbon→animal→bright) | 3 |
| `practice_mind` | Mind | 5 ki | Delete up to 2 cards from deck permanently | 2 |
| `practice_tree` | Tree | 7 ki | Transform one card into an exact copy of a target card | 1 |

### Three Marks (legacy — kept for backward compatibility, no longer shop-generated)

| ID | Name | Cost | Effect |
|----|------|------|--------|
| `mark_impermanence` | Impermanence | 5 ki | Promote one card to next type in its month |
| `mark_nonbeing` | Nonbeing | 5 ki | Remove one card permanently from deck |
| `mark_transcendence` | Transcendence | 5 ki | Copy all properties from target card onto source card |

> Three Marks still supported for in-round use via booster pack overlay in ShrineScene and `_markMode` in GameScene.

### Wu Xing Elements (shop TR quadrant)

| ID | Name | Cost | Base Effect | Upgraded Form | Upgrade Path |
|----|------|------|-------------|---------------|--------------|
| `element_water` | Water | 5 ki | Snow: ×2 pts, depreciates each round | Ice: ×4 pts, slower depreciation | Metal upgrades Snow→Ice |
| `element_wood` | Wood | 5 ki | Leaf: bypasses MAX_FIELD_SLOTS limit | Silk: also prevents stranding in deck phase | Water upgrades Leaf→Silk |
| `element_fire` | Fire | 5 ki | Ember: 10 pts, counts all 4 yaku, 1/7 break chance per round | Charcoal: 20 pts, 2/7 break chance | Wood upgrades Ember→Charcoal |
| `element_earth` | Earth | 5 ki | Clay: +2% ki interest per round | Pottery: +5% ki interest per round | Fire upgrades Clay→Pottery |
| `element_metal` | Metal | 5 ki | Iron: 10% chance ×5 pts, 5% chance free consumable | Meteorite: 20%/10% | Earth upgrades Iron→Meteorite |

> Wu Xing upgrade/destroy cycle: Generative (upgrades): Fire→Wood→Water→Metal→Earth→Fire. Destructive (strips element): Wood destroys Earth, Earth destroys Water, Water destroys Fire, Fire destroys Metal, Metal destroys Wood.

**Depreciation arrays (Water):**
```
SNOW_MULT = [2.0, 1.5, 1.0, 0.75, 0.5, 0.25]         (base, 6 levels)
ICE_MULT  = [4.0, 3.0, 2.0, 1.5, 1.0, 0.75, 0.5, 0.25] (upgraded, 8 levels)
```

### Ribbon Stamps (shop TR quadrant)

| ID | Name | Cost | Effect |
|----|------|------|--------|
| `red` | Red Ribbon | 4 ki | Draw +1 card when this card is captured |
| `blue` | Blue Ribbon | 4 ki | Trigger an extra deck flip when this card is captured |
| `green` | Green Ribbon | 5 ki | This card counts as 2 captures for spirit scaling |
| `yellow` | Yellow Ribbon | 8 ki | This card scores twice when captured (retrigger) |

### Zodiac Consumables (shop BR quadrant, single-use)

| ID | Name | Cost | Category | Effect |
|----|------|------|----------|--------|
| `zodiac_rat` | Rat | 3 ki | hand | Draw 2 extra cards from deck |
| `zodiac_ox` | Ox | 2 ki | field | Clear a stranded stack from one field slot |
| `zodiac_tiger` | Tiger | 8 ki | yaku | Force a push without meeting a yaku threshold |
| `zodiac_rabbit` | Rabbit | 5 ki | yaku | Remove push penalty for this round |
| `zodiac_dragon` | Dragon | 4 ki | ki | Ki lottery: gain 0–30 ki (random) |
| `zodiac_snake` | Snake | 4 ki | yaku | Lower one yaku threshold by 1 this round |
| `zodiac_horse` | Horse | 5 ki | hand | Discard hand, draw 8 fresh cards |
| `zodiac_goat` | Goat | 4 ki | ki | +1 ki per capture for rest of this round |
| `zodiac_monkey` | Monkey | 4 ki | field | Capture all cards on one field slot; discard equal from hand |
| `zodiac_rooster` | Rooster | 3 ki | field | Open a 9th field slot for this round |
| `zodiac_dog` | Dog | 3 ki | hand | Retrieve 2 cards from discard pile |
| `zodiac_pig` | Pig | 3 ki | ki | +10 ki immediately |

### Consumable Sources Summary

| Source | Consumable Types |
|--------|-----------------|
| Shop TR quadrant | Four Practices + Wu Xing Elements + Ribbon Stamps (pooled, random subset) |
| Shop BR quadrant | All 12 Zodiac Consumables |
| Metal proc (Iron/Meteorite) | `run.generateRandomConsumable()` — random from Three Marks + Wu Xing pool |
| `econ_present` spirit | Random consumable on first yaku trigger (not yet implemented) |

---

## 3. SHOP SYSTEMS

### Shop Types

| Type | Trigger | Rounds |
|------|---------|--------|
| **Wayside Shrine** | `isGrove = false` | All non-Grove rounds (1,2,4,5,7,8,…) |
| **Sacred Grove** | `isGrove = true` | Rounds 3,6,9,12,15,18,21,24,27,30,33,36 (every 3rd) |

### Layout (4-Quadrant, 1280×720)

```
[Spirit row y=62 | Consumable row y=62 | Info panel]  ← persistent top bar
─────────────────────────────────────────────────────
│ TL: Spirits (x=180,y=145)  │  TR: Deck-Fix (x=680,y=145) │
│         QUAD_W=420, QUAD_H=160                            │
─────── CENTER GAP y=305–385 (Purchase + Reroll buttons) ───
│ BL: Cards (x=180,y=385)    │  BR: Zodiacs (x=680,y=385)  │
─────────────────────────────────────────────────────
[Fusion Ritual y=555+ — Sacred Grove only]
[Continue button y=690]
```

### Items Per Section

| Section | Wayside | Sacred Grove |
|---------|---------|--------------|
| TL — Spirits | 2 | 4 |
| TR — Deck-Fix | 2 | 4 |
| BL — Cards | 2 | 4 |
| BR — Zodiacs | 2 | 4 |

### Reroll Mechanics

- **Cost progression:** `3 + rerollCount × 2` ki (3 → 5 → 7 → 9 → ...)
- **Behavior:** Replaces ALL slots (including purchased/null slots) with fresh offerings
- **Selection preserved:** No — purchased slots are refilled with new items

### Pricing

| Category | Base Price Source | Discount |
|----------|------------------|---------|
| Spirits | `SPIRIT_CATALOG[id].cost` | `econ_coupon` → ×0.8 (ceil) |
| Deck-Fix | `consumables.js` cost fields | same |
| Cards | `BASE_PRICE = {plain:2, ribbon:4, animal:5, bright:8}` +3 if enhanced, +2 if stamped | same |
| Zodiacs | `zodiacConsumables.js` cost fields | same |

### Shop Card Pre-Enhancement Odds

| Condition | Enhancement Chance | Ribbon Chance (if no enhancement) |
|-----------|-------------------|----------------------------------|
| Wayside | 20% | 15% |
| Sacred Grove | 40% | 30% |

Enhancement: random element, 75% base / 25% upgraded. Ribbon: weighted (Red 3, Blue 3, Green 2, Yellow 1).

---

## 4. DECK & CARDS

### Base Deck — 48 Cards (4 per month)

| Month | Flower | Bright | Animal | Ribbon | Plain |
|-------|--------|--------|--------|--------|-------|
| 1 Jan | Pine | Crane+Sun (20pt) | — | Red Ribbon (10pt) | ×2 (3pt) |
| 2 Feb | Plum | — | Warbler (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 3 Mar | Cherry | Curtain (20pt) | — | Ribbon (10pt) | ×2 (3pt) |
| 4 Apr | Wisteria | — | Cuckoo (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 5 May | Iris | — | Bridge/Fireflies (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 6 Jun | Peony | — | Butterflies (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 7 Jul | Bush Clover | — | Boar (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 8 Aug | Pampas | Moon (20pt) | Geese (12pt) | — | ×2 (3pt) |
| 9 Sep | Chrysanthemum | — | Sake Cup (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 10 Oct | Maple | — | Deer (12pt) | Ribbon (10pt) | ×2 (3pt) |
| 11 Nov | Willow | Rain Poet (20pt) | Swallow (12pt) | Ribbon (10pt) | Lightning (3pt) |
| 12 Dec | Paulownia | Phoenix (20pt) | — | — | ×3 (3pt) |

**Type counts:** Bright 5, Animal 9, Ribbon 10, Plain 24. Total: 48.

**Missing types by month:** Aug has no ribbon. Dec has no ribbon or animal (4 brights/plains only). Jan/Mar have no animal.

### Card Metadata Fields

Each card carries: `id`, `month`, `monthName`, `flower`, `type`, `points`, `name`, `tags[]`, `vertical` ('air'|'land'), `temporal` ('day'|'night'). Axis split is 24/24 for both axes.

### Card Layers

A card can carry at most **one enhancement** (Wu Xing element with `{element, tier, depLevel?}`) and at most **one ribbon stamp** (`ribbonStamp: 'red'|'blue'|'green'|'yellow'`). Layers are mutually exclusive — a card cannot have both an enhancement and a stamp.

### Promotion System

`promotionProgress` field tracks position in `['plain','ribbon','animal','bright']`. Missing types for a given month are skipped. Promotions are persistent (survive rounds via `run._deck` mutations).

---

## 5. ROUND & SCORING

### Card Deal Sequence

| Phase | Cards |
|-------|-------|
| Hand dealt | 8 cards |
| Field dealt face-up | 8 cards |
| Remaining | Deck for flipping |
| Push 1 | +4 cards to hand (+5 with game_angel) |
| Push 2 | +2 cards to hand (+3 with game_angel) |
| Push 3+ | +1 card to hand (+2 with game_angel) |

Surplus spirit grants +2 cards at round start. Play limit: 5 hand card plays per round before deck phase.

### Scoring Formula

**Per-capture (real-time, primary):**
```
captureScore = round(points × mult × flow)
```
Where `points` and `mult` accumulate through two phases:
- Phase 1 (`onCardScored` per card in group): `points += addPoints × count`, `mult += addMult × count`, `mult *= multiplyMult × count`
- Phase 2 (`applyEngine` once per capture): `points += addPoints`, `mult += addMult`, `mult *= multiplyMult`

**Final round calculation (`calculateFinalScore`):**
```
finalScore = (rawBasePoints × pointBoost)
             × (1.0 + yakuBonuses + additiveSpiritMult)
             × multiplicativeSpiritMult
             × flow
```
Called at `bankScore()` / `_finalizeTurn()` — primarily used to extract `metalConsumableCount` for Metal procs. `_runningScore` (sum of per-capture scores) is the actual banked value.

### Yaku System

| Yaku | Capture Threshold | Base Bonus | Upgrade Bonus per Level |
|------|-------------------|-----------|------------------------|
| Kasu | 6+ plains (capture mode) | +0.3 mult | +0.2 |
| Tanzaku | 3+ ribbons | +0.3 mult | +0.2 |
| Tane | 3+ animals | +0.4 mult | +0.2 |
| Hikari | 2+ brights | +0.7 mult | +0.2 |
| ~~Tsuki-narabi~~ | ~~5+ consec. months~~ | ~~+0.3~~ | — (removed) |

Max yaku mult (all 4 active, no upgrades): 1.0 + 0.3 + 0.3 + 0.4 + 0.7 = **×2.7**. Upgrade cost: 5 ki per level per yaku. Fire-enhanced cards count toward all 4 yaku simultaneously.

### Flow System

| Event | Effect |
|-------|--------|
| Round start | Flow unchanged |
| Push success (new yaku after push) | ×1.1 |
| Push failure (no new yaku, hand empty) | ×0.9 |
| Style combo (first trigger per run) | +combo value |
| Every round end (after push resolution) | ×0.95 (FLOW_DECAY_RATE) |

Initial flow: 1.0. Decay applied in both `bankScore()` and `_finalizeTurn()` direct round_over path, after push resolution.

### Score Thresholds (all 36 rounds)

```
Act 1 (R1–6):    50 / 70 / 90 / 120 / 160 / 200
Act 2 (R7–12):   300 / 450 / 650 / 900 / 1200 / 1600
Act 3 (R13–18):  2000 / 2500 / 3200 / 4000 / 5000 / 6500
Act 4 (R19–24):  8000 / 10000 / 13000 / 17000 / 22000 / 28000
Act 5 (R25–30):  35000 / 45000 / 58000 / 75000 / 95000 / 120000
Act 6 (R31–36):  150000 / 190000 / 240000 / 300000 / 380000 / 500000
```

### Ki Rewards (end of round)

```
ki = 5
   + cardsInHand × (econ_piggybank ? 3 : 1)
   + styleCombos × (econ_grace ? 2 : 1)
```

### Ki Interest (start of round)

```
interest = ki × 0.10                  (base)
         + ki × 0.10  if econ_bonds   (total 20%)
         + ki × 0.001 per ki if econ_ingot
         + ki × 0.02  per Clay-enhanced card in deck
         + ki × 0.05  per Pottery-enhanced card in deck
```

Earth ki interest is tracked separately as `_lastEarthKiGain` and stored on `run`.

### Push Mechanics

- `_pushPenaltyActive` flag set when player pushes
- Failure: hand empties with no new yaku while penalty active → `run.onPushFailure()` (flow ×0.9)
- Success: player banks during `yaku_decision` after push → `run.onPushSuccess()` (flow ×1.1)
- `zodiac_rabbit` suppresses the penalty for one round
- `game_angel` adds +1 card per push deal

---

## 6. HEXAGRAM SYSTEM

**Status: Not implemented.**

The word "hexagram" appears only once in the codebase, in a comment in `cards.js`:
```javascript
// Tags are thematic descriptors used to compute spirit / hexagram affinity.
```

No hexagram files, no coin-flip UI, no divination mechanics. Card `tags[]` are present and populated (thematic descriptors per card) but only used by the comment's implied future intent. No divination UI exists.

---

## 7. PATRON / LEGENDARY SYSTEM

**Status: Not implemented.**

`legendary` appears only as a UI color constant in two scene files:
```javascript
RARITY_COLOR = { common: 0x667788, uncommon: 0x44aa44, rare: 0x4488ff, legendary: 0xddaa22 }
```

No legendary spirit tier, no patron mechanic, no special legendary slots. The color constant is defined but never triggered by any actual legendary-tier item.

---

## 8. SYMBIONT SYSTEM

**Status: Fully implemented.**

### Trigger

`util_symbiosis` spirit (cost 7 ki): captures any animal card → `addSymbiontSpirit(animalCardId)` called in `GameRoundManager._addCapture`.

### Summon Logic (`RunManager.addSymbiontSpirit`)

1. Look up `ANIMAL_SYMBIONT_MAP[cardId]` → get symbiont ID
2. Check for open spirit slot (`spirits.length < MAX_SPIRIT_SLOTS`)
3. If open: push `{ id: symbiontId, name, isSymbiont: true, stackCount: 1, state: {...} }` to `_spirits`
4. Increment `summonCount` on any `sym_algae` spirit

### ANIMAL_SYMBIONT_MAP

```
february_warbler   → sym_caterpillar
april_cuckoo       → sym_cuckoo_egg
may_bridge         → sym_algae
june_butterflies   → sym_ants
july_boar          → sym_crow
august_geese       → sym_ducks
september_sake     → sym_snails
october_deer       → sym_magpie
november_swallow   → sym_osprey
```

### State Resets (per round)

`sym_ducks.state.pairsThisRound = 0` reset at round start. `sym_crow` one-shot flag reset at round start. All other symbiont state is persistent across rounds.

### Incomplete Symbionts

- `sym_caterpillar` metamorphosis logic (eats Leaf cards, transforms after 3): ✅ implemented
- `sym_cuckoo_egg` hatch countdown: ✅ implemented
- `sym_osprey` pre-play capture: ✅ implemented

---

## 9. STYLE COMBOS

All combos detected by `StyleEngine.checkCombos(capturedCards)`. Each combo triggers **at most once per run** (flow bonuses are permanent). Combos triggering again in later rounds show visually but don't add flow. Fire-enhanced cards excluded from all combo checks.

| ID | Name | Trigger Condition | Flow Bonus |
|----|------|-------------------|-----------|
| `hanami_zake` | Flower Viewing | march_curtain + september_sake both captured | +0.2 |
| `tsukimi_zake` | Moon Viewing | august_moon + september_sake both captured | +0.2 |
| `inoshikacho` | Boar-Deer-Butterfly | july_boar + october_deer + june_butterflies | +0.3 |
| `akatan` | Red Poetry | january_ribbon + february_ribbon + march_ribbon | +0.4 |
| `aotan` | Blue Poetry | june_ribbon + september_ribbon + october_ribbon | +0.4 |
| `spring` | Spring Complete | At least one card from each of months 3, 4, 5 | +0.2 |
| `summer` | Summer Complete | At least one card from each of months 6, 7, 8 | +0.2 |
| `autumn` | Autumn Complete | At least one card from each of months 9, 10, 11 | +0.2 |
| `winter` | Winter Complete | At least one card from each of months 12, 1, 2 | +0.2 |
| `full_year` | Full Year | At least one card from all 12 months | +0.8 |
| `goko` | Goko | All 5 bright cards captured | +1.0 |

`StyleEngine.resetRound()` clears per-round tracking. `onStyleCombo(id, value)` in RunManager gates permanent flow gain to first trigger only.

---

## 10. RECENT ADDITIONS & INCOMPLETE FEATURES

### Recent Additions (from session history)

| Feature | Status |
|---------|--------|
| 4-quadrant shop layout (TL/TR/BL/BR) | ✅ Complete |
| Persistent spirit/consumable row at GameScene coordinates | ✅ Complete |
| Click-to-select purchase flow with central Purchase+Reroll buttons | ✅ Complete |
| Fixed-position Purchase/Reroll buttons (no layout jump) | ✅ Complete |
| Hover tooltips on all shop items | ✅ Complete |
| Reroll restocks ALL slots including purchased | ✅ Complete |
| Flow decay ×0.95 per round | ✅ Complete |
| Push overlay shows post-decay projections | ✅ Complete |
| Stacking math: `onCardScored` → value × count; `applyEngine` → once | ✅ Complete |
| Consumable slot spacing matches spirit row (SPIRIT_GAP=76) | ✅ Complete |

### Known Incomplete / Stub Features

| Feature | Location | Notes |
|---------|----------|-------|
| `util_festival` | spirits.js + GameRoundManager | "(Coming soon)" — triggers not wired |
| `econ_replica` | spirits.js | "(Coming soon)" — no effect code |
| `econ_print` | spirits.js | "(Coming soon)" — no effect code |
| `econ_present` | spirits.js | "(Coming soon)" — no effect code |
| `econ_collector` | spirits.js | "(Coming soon)" — no effect code |
| `game_mirror` | spirits.js | "(Coming soon)" — no effect code |
| `game_echo` | spirits.js | "(Coming soon)" — no effect code |
| `unity_yinyang` | spirits.js + SpiritEffects.js | "Effect TBD" — empty effect stub |
| `unity_gravity` | spirits.js + SpiritEffects.js | "Effect TBD" — empty effect stub |
| `unity_time` | spirits.js + SpiritEffects.js | "Effect TBD" — empty effect stub |
| `unity_planet` | spirits.js + SpiritEffects.js | "Effect TBD" — empty effect stub |
| Hexagram / divination system | — | Mentioned in card tags comment only |
| Patron / Legendary tier | — | Color constant defined; no mechanic |
| `RARITY_COLOR.legendary` | GameScene, ShrineScene | Color defined (0xddaa22) but no item generates it |

### File Inventory

**src/data/** (8 files)
- `cards.js` — 48-card array with tags, axes, type, points
- `cardImageMap.js` — asset key → file path mapping
- `consumables.js` — Three Marks + Wu Xing + Four Practices
- `fusionRecipes.js` — all Tier 2/3/4 fusion recipes
- `ribbonStamps.js` — 4 ribbon stamps
- `shopCards.js` — `generateShopCards(count, isGrove)`
- `spirits.js` — 56+ spirit definitions + ANIMAL_SYMBIONT_MAP
- `zodiacConsumables.js` — 12 zodiac consumables

**src/systems/** (11 files)
- `CaptureManager.js` — card capture resolution
- `ConsumableEffects.js` — Three Marks + Wu Xing activation logic
- `DeckManager.js` — `resetWithCards(cards)`, shuffle, flip
- `FieldManager.js` — 8-slot field (10 with expanse), Leaf/Silk bypass
- `GameplayLogger.js` — structured event log, clipboard export
- `GameRoundManager.js` — full round loop, push, bank, phase management
- `HandManager.js` — draw, discard, hand size cap
- `RunManager.js` — singleton run state, ki, spirits, flow, thresholds
- `ScoringEngine.js` — yaku evaluation, `calculateFinalScore`, SNOW_MULT/ICE_MULT
- `SpiritEffects.js` — effect registry, all hook implementations
- `StyleEngine.js` — 11-combo style detection

**src/scenes/** (3 files)
- `BootScene.js` — scene initialization
- `GameScene.js` — main gameplay, rendering, mark mode, overlays
- `ShrineScene.js` — shop, forge, fusion ritual, practices overlay
