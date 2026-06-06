# Hanatu Overhaul — Decisions Log

**Started:** May 2026
**Purpose:** Track design and implementation decisions made during the audit overhaul. Each entry captures the question, options considered, decision made, and rationale.

Decisions are categorized as:
- **RESOLVED** — Decision made, action items clear (codebase changes immediate; doc changes batched for unified overhaul)
- **OPEN** — Recognized as a design question to be revisited (often pending playtesting data)
- **DEFERRED** — Not addressed at this time (out of scope for current phase)

Codebase fixes are applied at the time of decision. Design doc updates are batched for a unified overhaul pass.

---

## D0.1 — Sacred Grove cadence

**Status:** RESOLVED (with OPEN follow-up)

**Question:** Should Sacred Grove appear every 3 rounds (code: 12 visits/run) or at every act-end (doc: 6 visits/run)?

**Decision:** Keep code as-is (12 Groves at rounds 3, 6, 9, ..., 36). Doc text in §6.2 updates to reflect actual cadence.

**Rationale:**
- With 14 blessings in the current catalog, capping at 6 Grove visits would mean a player obtains at most 43% of blessings per run — shallow build assembly
- 12 Groves enable richer build progression and meaningful Grove-only mechanics (alchemicals, fusion, legendary spirit rolls)
- Tradeoff acknowledged: doc path (6 Groves) would force more variety across runs by limiting blessing collection — could feel less stale

**Open follow-up:** Final cadence (3 vs 6) is a playtesting-revealed question. May feel stale at 12; may feel scarce at 6. Revisit after Phase 5 playtesting.

**Codebase changes:** None (code is canonical).

**Doc changes (batched):**
- Update §6.2 description of act/Grove cadence to acknowledge "Sacred Grove every 3 rounds; acts span 6 rounds with mid-act and end-act Groves"
- Add note in §10 (Blessings) that 12 Grove visits is the design choice for build depth, with the 6 vs 12 cadence being an open balance question

---

## D0.2 — Wu Xing cycle direction for boost hexagrams

**Status:** RESOLVED

**Question:** When `boost_X` is active, which other element should be debuffed?

**Decision:** Each `boost_X` hexagram debuffs the element that **destroys X** in the destructive cycle (predator/threat). The 5 implementations need to be re-targeted.

**Rationale:**
- Under the current code, boost_wood debuffs Fire (the element Wood generates). This creates anti-synergy with the deck-mod system: Wood applied to an Ember card produces Charcoal (upgraded Fire), but Fire is being suppressed by the active hexagram — so the player is punished for using a perfectly normal Wood→Fire upgrade.
- Under the fix, boost_wood debuffs Metal (the element that strips Wood). This separates the two Wu Xing cycles cleanly:
  - **Generative cycle** is used by the deck-mod upgrade system only (e.g., apply Wood to Fire to upgrade)
  - **Destructive cycle** is used for "what threatens what" — both deck-mod stripping AND boost hexagram debuffs
- Aligns hexagram mechanics with the existing `applyElement` logic in `RunManager.js` (lines 1510-1516), which uses the destructive cycle for stripping
- Comment at `HexagramEffects.js` 366-369 was correct all along; the implementations were inverted

**Cycle reference:** Destructive cycle is `Wood → Earth → Water → Fire → Metal → Wood` (X destroys Y). For boost X, debuff the element that destroys X:

| Boost anchor | Destroyed by (debuffed) |
|---|---|
| boost_wood | Metal |
| boost_fire | Water |
| boost_earth | Wood |
| boost_metal | Fire |
| boost_water | Earth |

**Codebase changes (immediate):**
Re-target the 5 boost hexagram implementations in `src/systems/HexagramEffects.js` (lines 371-398):
- `boost_wood` → remove Fire modifications, add Metal debuff (lower `getMetalHeldMult`, lower `getMeteoriteJackpotChance`)
- `boost_fire` → remove Earth modifications, add Water debuff (faster `getWaterMult` depreciation)
- `boost_earth` → remove Metal modifications, add Wood debuff (lower `getWoodScoringMult`)
- `boost_metal` → remove Water modifications, add Fire debuff (lower `getFirePoints` or higher `getFireBreakChance`)
- `boost_water` → remove Wood modifications, add Earth debuff (lower `getEarthInterestRate` or `getEarthHeldMult`)

Comment at line 366-369 stays as-is.

**Doc changes (batched):**
- Update §9.5 hexagram descriptions to reflect destructive-cycle mechanics (this is also part of D0.3 — placeholder description text)
- Add a clarifying note: "Wu Xing hexagrams operate on the destructive cycle (predator/prey). The generative cycle is reserved for the deck-mod upgrade system."

---

## D0.3 — Wu Xing cycle hexagram description text

**Status:** RESOLVED

**Question:** Update placeholder descriptions ("score ×2 points and apply effects twice") to match implementations, or implement what the doc literally says?

**Decision:** Update descriptions to match implementations. Use long-form, numerically precise text stating exact tier-by-tier multipliers for both the anchor element (boosted) and destroyer element (debuffed).

**Rationale:**
- The current implementations are mechanically interesting and reflect tuning effort. Replacing them with simple "×2 points and twice" would lose the cycle interaction (which becomes especially meaningful after D0.2's correction).
- "Apply effects twice" is mechanically ambiguous and would create implementation complexity (does Snow's depreciation tick twice? Does Fire roll for break twice?). Cleaner to drop entirely.
- Numerically precise text gives players actionable information for build planning. HexagramCollectionScene displays these descriptions as unlock rewards (Slice 6 C52); vague text undermines the reward.
- All numeric values are taken directly from existing code — none invented. The post-D0.2 changes are a clean rotation: each hexagram's debuff values shift forward by one position in the destructive cycle.

**Description text (post-D0.2 implementations):**

| Hex | Number | Name | Description |
|---|---|---|---|
| hex_50 | 50 | The Cauldron | "Wood enhancements scored at higher multipliers: Leaf ×1.3, Silk ×1.5. Metal enhancements suppressed: Iron held mult ×1.25, Meteorite held mult ×2.5; Meteorite jackpot chance reduced to 2%." |
| hex_49 | 49 | Revolution | "Fire enhancements yield more points and break less: Ember +60 pts (10% break), Charcoal +200 pts (5% break). Water enhancements depreciate faster: Snow loses 0.4 mult per use, Ice loses 0.7 per use." |
| hex_15 | 15 | Modesty | "Earth enhancements yield bonus held mult: Clay ×1.2, Pottery ×1.5 (in addition to ki interest). Wood enhancements score at reduced multipliers: Leaf ×0.7, Silk ×0.5." |
| hex_43 | 43 | Breakthrough | "Metal enhancements stronger: Iron held mult ×1.75, Meteorite held mult ×3.5; Meteorite jackpot chance increased to 15%. Fire enhancements suppressed: Ember +15 pts (40% break), Charcoal +50 pts (20% break)." |
| hex_48 | 48 | The Well | "Water enhancements depreciate slower: Snow loses 0.15 per use, Ice loses 0.3 per use. Earth enhancements yield reduced ki interest: Clay 5%, Pottery 10%." |

**Value provenance verification:**

Each numeric value is sourced from the current codebase:
- **Anchor values** (Wood scoring under boost_wood, Fire points under boost_fire, etc.) come directly from the same hexagram's existing implementation
- **Destroyer values** are transferred from another hexagram's old debuff slot (rotation following the destructive cycle):
  - `boost_earth`'s old Metal-debuff → moved to `boost_wood`
  - `boost_metal`'s old Water-debuff → moved to `boost_fire`
  - `boost_water`'s old Wood-debuff → moved to `boost_earth`
  - `boost_wood`'s old Fire-debuff → moved to `boost_metal`
  - `boost_fire`'s old Earth-debuff → moved to `boost_water`

No new numerical values were introduced. The total quantity of weakening across the 5 hexagrams is preserved; only the targets rotate.

**Open follow-up (post-playtest):** Earth held mult under `boost_water` is intentionally NOT debuffed below default ×1.0. Sub-1.0 held mult could be added later as an additional layer of harshness if playtesting reveals boost_water is too lenient compared to the others.

**Codebase changes (immediate, alongside D0.2):**
Update the 5 description strings in `src/data/hexagrams.js`:
- Line 234 (hex_50)
- Line 241 (hex_49)
- Line 248 (hex_15)
- Line 255 (hex_43)
- Line 262 (hex_48)

**Doc changes (batched):** Update §9.5 hexagram description table to mirror the new descriptions. Note the cycle separation: "Wu Xing hexagrams operate on the destructive cycle. The generative cycle is reserved for the deck-mod upgrade system."

---

## D0.4 — Boost-axis/seasonal/rank hexagram mechanism and magnitudes

**Status:** RESOLVED

**Question:** How should the 20 boost hexagrams (8 single-axis, 4 yang/yin/space/energy, 4 seasonal individual, 4 seasonal combined, 4 rank) handle buff/debuff structure, magnitudes, and yaku threshold modifiers?

**Decision:** Keep `multiplyMult` mechanism throughout. Update magnitudes and structures across five layers as below.

**Design philosophy:** Boost hexagrams operate on a buff/debuff structure. The buff strengthens cards matching one category; the debuff weakens cards in a paired category. Magnitude is calibrated by selection breadth — narrower selections receive larger magnitudes; harsher debuffs apply when fewer cards are debuffed.

### Layer 1: Single-axis hexagrams (8)

`boost_air`, `boost_land`, `boost_day`, `boost_night`, `boost_yang`, `boost_yin`, `boost_space`, `boost_energy`

**Decision:** Buff stays at ×1.5. Debuff value softened from ×0.5 to ×0.75.

| Hexagram | Buff target | Buff value | Debuff target | Debuff value |
|---|---|---|---|---|
| boost_air | Air-axis cards | ×1.5 | Land-axis cards | ×0.75 |
| boost_land | Land-axis cards | ×1.5 | Air-axis cards | ×0.75 |
| boost_day | Day-axis cards | ×1.5 | Night-axis cards | ×0.75 |
| boost_night | Night-axis cards | ×1.5 | Day-axis cards | ×0.75 |

(Yang/Yin/Space/Energy handled separately in Layer 2 — different mechanic.)

### Layer 2: Yang/Yin/Space/Energy hexagrams (4) — significant rework

**Decision:** Restructure from AND-logic (narrow target — only cards matching both axes) to OR-logic compounding (each axis evaluated independently and stacked multiplicatively). Buff and debuff values: ×1.5 and ×0.75.

| Hexagram | Buff axes | Debuff axes |
|---|---|---|
| boost_yang | Air ×1.5, Day ×1.5 | Land ×0.75, Night ×0.75 |
| boost_yin | Land ×1.5, Night ×1.5 | Air ×0.75, Day ×0.75 |
| boost_space | Air ×1.5, Night ×1.5 | Land ×0.75, Day ×0.75 |
| boost_energy | Land ×1.5, Day ×1.5 | Air ×0.75, Night ×0.75 |

**Compounding outcomes per card** (under any of these hexagrams):
- Card matching both buff axes: ×1.5 × ×1.5 = **×2.25**
- Card matching one buff axis + one debuff axis: ×1.5 × ×0.75 = **×1.125**
- Card matching both debuff axes: ×0.75 × ×0.75 = **×0.5625**

The four hexagrams partition the deck into quadrants; under each, the player's "ideal target" is the doubly-buffed quadrant.

### Layer 3: Seasonal individual hexagrams (4)

**Decision:** Buff lowered from ×2.5 to ×2.0. Debuff target changed from "next season in cycle" to "opposite season" (more thematically clear: growth vs decay, warmth vs cold). Debuff value stays at ×0.5.

| Hexagram | Buff target | Buff value | Debuff target | Debuff value |
|---|---|---|---|---|
| boost_spring | Spring (Mar-May) | ×2.0 | Autumn (Sep-Nov) | ×0.5 |
| boost_summer | Summer (Jun-Aug) | ×2.0 | Winter (Dec-Feb) | ×0.5 |
| boost_autumn | Autumn (Sep-Nov) | ×2.0 | Spring (Mar-May) | ×0.5 |
| boost_winter | Winter (Dec-Feb) | ×2.0 | Summer (Jun-Aug) | ×0.5 |

### Layer 4: Seasonal combined hexagrams (4)

**Decision:** No changes to implementation. Keep current month-set partitioning.

| Hexagram | Buff months | Buff value | Debuff months | Debuff value |
|---|---|---|---|---|
| boost_equinox | Mar, Sep | ×3.0 | Jun, Dec | ×0.5 |
| boost_solstice | Jun, Dec | ×3.0 | Mar, Sep | ×0.5 |
| boost_tropic | Apr, May, Jul, Aug | ×2.5 | Oct, Nov, Jan, Feb | ×0.5 |
| boost_arctic | Oct, Nov, Jan, Feb | ×2.5 | Apr, May, Jul, Aug | ×0.5 |

The four hexagrams together partition the 12 months exactly once. This is the canonical design (resolves Slice 4 C43 name collision: hexagram-side definitions stand; spirit-side cross-fusion definitions remain at 6 months because they operate at a different scope).

### Layer 5: Rank hexagrams (4) — significant rework

**Decision:** Replace the original buff + yaku-threshold-+1 structure with a buff + paired-rank-debuff structure. Drop `modifyYakuThreshold` entirely (yaku stays at proportional defaults). Buff magnitudes scale inversely with rank rarity. Debuff magnitudes scale inversely with debuff target's deck count.

**Rank pairing (cross-cycle, furthest in rank order):**

| Hexagram | Buff target | Buff value | Debuff target | Debuff value | Threshold modifier |
|---|---|---|---|---|---|
| boost_brights | Brights (5 cards) | ×1.5 | Plains (24 cards) | ×0.9 | None |
| boost_animals | Animals (9 cards) | ×2.0 | Brights (5 cards) | ×0.5 | None |
| boost_ribbons | Ribbons (10 cards) | ×2.0 | Animals (9 cards) | ×0.7 | None |
| boost_plains | Plains (24 cards) | ×3.0 | Ribbons (10 cards) | ×0.7 | None |

**Rationale for asymmetry:**
- boost_brights: small buff target (5 cards), so the buff doesn't need to be huge (×1.5); broad debuff target (24 plains), so debuff is mild (×0.9)
- boost_animals: dense buff target (9 cards × 10 base points), needs ×2.0; narrow debuff target (5 brights × 20 base points = point-dense), so debuff is harsh (×0.5)
- boost_ribbons: middle-density target (10 cards × 5 base), needs ×2.0; medium debuff (9 animals), moderate (×0.7)
- boost_plains: broadest buff target (24 cards × 1 base point — low density), needs largest buff (×3.0) to compete; medium debuff (10 ribbons), moderate (×0.7)

**Validated by base-deck arithmetic:** total scoring spread under the four rank hexagrams falls within ~8% (199-215) at base deck. At deckfix endgame, brights specialization remains the highest-ceiling play (consistent with intent: deckfixing toward rare ranks pays off more than deckfixing toward common ranks).

**Rationale for dropping `modifyYakuThreshold`:** Originally, the +1 threshold was the "tradeoff" cost of the rank buff. With paired-rank debuffs now serving as the tradeoff, the threshold modifier is redundant. Cleaner to have one mechanism (buff/debuff) than two (buff/debuff + threshold). Yaku stays at proportional defaults under all rank hexagrams.

### Codebase changes (immediate)

**File:** `src/systems/HexagramEffects.js`

1. **Single-axis hexagrams (lines 86-119, the four `boost_air/land/day/night`):** Change every `multiplyMult: 0.5` → `multiplyMult: 0.75` on the debuff branches. Buffs (×1.5) unchanged.

2. **Yang/Yin/Space/Energy hexagrams (lines 123-167):** Restructure to OR-logic compounding using a `mult *= ...` accumulator pattern:

```js
boost_yang: {
  // Yang hexagram: Air or Day cards ×1.5; Land or Night cards ×0.75.
  // Compounds multiplicatively: a card matching both buff axes scores ×2.25;
  // both debuff axes ×0.5625; mixed (one each) ×1.125.
  onCardScored(card) {
    let mult = 1.0;
    if (card.vertical === 'air')   mult *= 1.5;
    if (card.vertical === 'land')  mult *= 0.75;
    if (card.temporal === 'day')   mult *= 1.5;
    if (card.temporal === 'night') mult *= 0.75;
    return mult !== 1.0 ? { multiplyMult: mult } : null;
  },
},
```

Mirror for boost_yin (Land+Night buff, Air+Day debuff), boost_space (Air+Night buff, Land+Day debuff), boost_energy (Land+Day buff, Air+Night debuff).

3. **Seasonal individual hexagrams (lines 218-252):** Change buff from ×2.5 to ×2.0 in all four. Change debuff target from next-season-in-cycle to opposite-season, keeping debuff at ×0.5.

4. **Seasonal combined hexagrams (lines 171-213):** No changes.

5. **Rank hexagrams (lines 258-300):** Replace each entirely with new buff + cross-paired debuff structure. Remove `modifyYakuThreshold` blocks.

### Doc changes (batched for unified overhaul)

**§9.2** — Single-axis hexagram descriptions: add explicit numeric values (×1.5 / ×0.75) and describe by axis property, not by month list.

**§9.2/§9.3** — Yang/Yin/Space/Energy: complete rewrite to describe OR-logic compounding. Include four-quadrant outcome table.

**§9.4** — Seasonal individual: update magnitudes (×2.0 / ×0.5) and debuff targets (opposite season).

**§9.4** — Seasonal combined: align doc text with actual implementation. Document month sets (Equinox = Mar/Sep, Solstice = Jun/Dec, Tropic = Apr/May/Jul/Aug, Arctic = Oct/Nov/Jan/Feb) and note clean 12-month partition.

**§9.6** — Rank hexagrams: complete rewrite to describe new buff + cross-paired debuff structure. Remove references to `modifyYakuThreshold`. Document the gradation rationale.

**§9 introduction** — Add design philosophy note: "Boost hexagrams operate on a buff/debuff structure. The buff strengthens cards matching one category; the debuff weakens cards in a paired category. Magnitude is calibrated by selection breadth — narrower selections receive larger magnitudes; harsher debuffs apply when fewer cards are debuffed."

---

## D0.5 — Capstone shop block

**Status:** RESOLVED

**Question:** Should Tier 4 Capstone spirits be excluded from random shop offerings?

**Decision:** Yes. Capstones must NEVER appear in shop offerings. Sacred Grove fusion ritual (T1→T2→T3→T4 + Pearl alchemical) is the only acquisition path.

**Rationale:**
- Doc §7.16 explicitly states: "Capstones cannot be purchased, refunded, or sold — Sacred Grove fusion ritual is the only acquisition path."
- The current bug allows Capstones to spawn at the 15% Grove-Legendary roll because they have `legendary: true` per data, which makes them eligible for `_pickRandomLegendary`. A player could buy a Capstone for 25 ki, completely bypassing the intended 4-step fusion path.
- This is purely a bug — no design tradeoff to consider.

**Codebase changes (immediate):**

**File:** `src/scenes/ShrineScene.js` (line 162)

Add `!s.capstone` to the `_pickRandomLegendary` filter:

```js
_pickRandomLegendary() {
  const ownedIds = new Set(run.legendarySpirits.map(s => s.id));
  const available = SPIRIT_CATALOG.filter(s => s.legendary && !s.capstone && !ownedIds.has(s.id));
  // ...
}
```

**Doc changes (batched):** None needed — §7.16 is already correct; this aligns code to doc.

---

## D0.6 — Stack-aware economy spirits

**Status:** RESOLVED

**Question:** Five spirits (Bonds, Coupon, Piggy Bank, Grace, Magpie) plus Osprey use `filter(...).length` which counts spirit OBJECTS rather than stack levels. Should they be fixed to multiply by `stackCount`, and if so, should existing caps (e.g., Bonds' `Math.min(... 0.25)`) be preserved?

**Decision:** Yes, fix all six to multiply by `stackCount` via a unified `countStackedById(id)` helper. Remove the Bonds interest cap entirely.

**Rationale:**
- Doc explicitly enumerates per-stack values for each (e.g., "Bonds at 3 stacks: +15% interest", "Coupon at 3 stacks: 45% discount", "Piggy at 3 stacks: ×4 hand ki"). The current code under-delivers by 50-67% at higher stacks.
- Bonds cap removal aligns with general spirit design: no other spirits have hard caps on their effects. If 3-stack Bonds (+15%) or 5-stack Bonds (+25% with negatives) proves too powerful in playtesting, the cleaner fix is lowering the per-stack base value (5% → 4% or 3%), not reintroducing a cap.
- Unified helper (`countStackedById`) eliminates the `filter().length` antipattern that caused the bug. Should become canonical going forward.

**Codebase changes (immediate):**

**File 1: `src/systems/RunManager.js`**

Add a new method (suggested location: near other read accessors, e.g., after `get spirits()` getter):

```js
/**
 * Sum stackCount across all spirit instances with the given id.
 * Counts both regular and negative spirits (Negatives count as full stacks).
 * Returns 0 if no spirit with that id is equipped.
 */
countStackedById(id) {
  return this._allSpirits
    .filter(s => s.id === id)
    .reduce((sum, s) => sum + (s.stackCount ?? 1), 0);
}
```

Then update three callsites in the same file:

- Line 988: `const piggyCount = this._allSpirits.filter(s => s.id === 'econ_piggybank').length;` → `const piggyCount = this.countStackedById('econ_piggybank');`
- Line 989: `const graceCount = this._allSpirits.filter(s => s.id === 'econ_grace').length;` → `const graceCount = this.countStackedById('econ_grace');`
- Line 1006: `const bondsCount = this._allSpirits.filter(s => s.id === 'econ_bonds').length;` → `const bondsCount = this.countStackedById('econ_bonds');`

Also at line 1007: change `rate += Math.min(bondsCount * 0.05, 0.25);` → `rate += bondsCount * 0.05;` (remove cap entirely).

**File 2: `src/scenes/ShrineScene.js`**

Line 1895: `const couponCount = run.spirits.filter(s => s.id === 'econ_coupon').length;` → `const couponCount = run.countStackedById('econ_coupon');`

Note: keep the `Math.min(couponCount * 0.15, 0.45)` cap on Coupon for now — Coupon at 3 stacks gives 45% which is doc-stated, and a 5-stack Coupon (with negatives) at 75% off would be extreme. Revisit if playtesting shows otherwise. (Different decision from Bonds because Coupon has a more explicit doc-stated maximum.)

**Actually** — reconsidering during write-up: the user's decision was "no hard cap, because this would create inconsistency across spirit designs." For consistency, remove Coupon's cap too.

Line 1896: `const discount = Math.min(couponCount * 0.15, 0.45);` → `const discount = couponCount * 0.15;`

If 5-stack Coupon hits 75% discount and proves abusive, lower the per-stack base value (15% → 12% or 10%) rather than reintroducing the cap.

**File 3: `src/systems/GameRoundManager.js`**

Line 1714 (Magpie symbiont in `_onStyleCombos`):
```js
// Old:
if (combos.length > 0 && this._spirits.some(s => s.id === 'sym_magpie')) {
  run.addKi(3 * combos.length);
}

// New:
const magpieStacks = run.countStackedById('sym_magpie');
if (magpieStacks > 0 && combos.length > 0) {
  run.addKi(3 * combos.length * magpieStacks);
}
```

Line 1767-1768 (Osprey in deck flip handling):
```js
// Old:
const ospreySpirits = this._spirits.filter(s => s.id === 'sym_osprey');
const ospreyMax = ospreySpirits.length;

// New:
const ospreyMax = run.countStackedById('sym_osprey');
```

(Remove the `ospreySpirits` variable if it's only used for `length`. If used elsewhere in that block, keep it but compute `ospreyMax` separately.)

**File 4: `src/scenes/GameScene.js`**

Line 1418 (display label for osprey max in spirit contribution UI): Update display logic to use `run.countStackedById('sym_osprey')` instead of filter-and-length pattern.

**Doc changes (batched):**
- Update §7.10 spirit table entries for Bonds, Coupon, Piggy Bank, Grace, Magpie, Osprey to remove any "max stack" wording or hard caps on effect magnitudes.
- Confirm §11.4 narrative description aligns ("no hard cap; soft-capped by stacking limits").
- Resolve internal inconsistency in spirit-table vs. §11.4 wording on Bonds (currently the spirit table mentions a +15% cap; §11.4 says no cap — adopt the §11.4 framing).

---

## D0.7 — Sacred Grove fusion ritual UI section + Pearl semantics

**Status:** RESOLVED

**Question:** The Sacred Grove has a free fusion ritual UI section that lets players fuse spirits without consuming alchemicals. Per design doc §8.6, fusion should only happen via Cinnabar/Pearl alchemicals. Additionally, Pearl currently preserves the T3 components when creating a Capstone, which allows multi-Pearl exploitation (re-using the same components to spam capstones). Resolve both.

**Decision:**

1. **Remove the Sacred Grove fusion ritual UI section entirely.** Fusion happens exclusively through Cinnabar (T2/T3 fusion) and Pearl (T4 capstone fusion) alchemicals. The free fusion section is an alternate path that contradicts the design doc and bypasses the alchemical economy.

2. **Pearl now consumes its T3 components** (matching Cinnabar's behavior). To preserve components, players must pre-stack them (via Jade, Mirror, Memory, etc.) before Pearl fusion.

**Rationale:**

For removal of fusion ritual UI section:
- Per §8.6.1, "Cinnabar is the standard fusion path... Pearl is the endgame fusion path." Fusion happens exclusively via alchemical activation.
- The fusion ritual UI section is a free path that bypasses the entire alchemical economy. Cinnabar costs 30 ki, Pearl costs 50 ki — these costs exist to gate fusion as a meaningful resource decision. The free fusion section trivializes them.
- Resolves Slice 2 C13 (fusion section is free) and Slice 3 C19 (T4 capstone routing to wrong slot from fusion section) in one stroke.
- The alchemical fusion paths are fully implemented and correct. Cinnabar properly decrements stackCount; Pearl properly routes capstones to legendary slots via `addLegendarySpirit`. No new logic needed; just remove the parallel UI path.

For Pearl consumes components:
- **Mechanical consistency.** Cinnabar consumes inputs; Mercury consumes the fusion; Wu Xing consumables are consumed on use. Pearl was the only odd-one-out in preserving inputs.
- **Eliminates multi-Pearl exploitation.** Without consumption, a player could repeatedly Pearl the same Yin+Yang to generate multiple Yin-Yang capstones (limited only by 2 legendary slots).
- **Preserves the design intent that capstones are unique and valuable.** Components must be stacked first to preserve them — this requires real Jade/Mirror investment, making Pearl-driven capstones a deliberate late-run commitment rather than a copy-paste exploit.
- **Capstone unstackability/uncopyability is already structurally enforced.** Verified: Jade/Sulfur/Mercury/Cinnabar all target `run.spirits` (regular slots only), excluding legendary slots; Mirror/Memory operate on `this._spirits` (regular + negative, excluding legendary). No additional rules needed; legendary slot isolation suffices.

**Considered alternatives (rejected):**

- **Option A:** Demote capstones from legendary to rare. Rejected — places capstones in regular slots where they could be Jade-stacked, Mirror-copied, or transcended to negatives via Sulfur. The "unstackable, uncopyable" properties become hard to enforce.
- **Option B:** Pearl produces two outputs — a sealed mega-spirit (regular slot, combining T3 component effects) plus a legendary capstone. Rejected — requires designing 4 new sealed mega-spirits (one per capstone type), introduces same Jade/Mirror problems for the sealed spirit if it lives in regular slots, and roughly doubles Pearl's design surface.
- **Option C (chosen):** Pearl consumes components like Cinnabar. Players who want preservation must pre-stack. Cleanest, no new design work, eliminates exploit.

**Open consideration:** Pearl's 50 ki cost may be high relative to other late-game purchases. Acknowledged as a tuning question but deferred to a unified value/threshold pass after Phase 1 correctness work.

**Codebase changes (immediate):**

**File 1: `src/scenes/ShrineScene.js`**

Remove the Sacred Grove fusion ritual UI section entirely:
- Remove the `_drawFusionSection` method (~lines 1755-1806)
- Remove the `_showFusionConfirm` method (~lines 1808-1848)
- Remove the `_executeFusion` method (~lines 1850-1860)
- Remove the call to `_drawFusionSection` in `_buildUI` (~line 216), along with any associated layout calculations (e.g., `FUSION_Y`, `fusionH`)
- Keep the `getAvailableFusions(...)` import and its use at line 262 (for the spirit-fan visual indicator highlighting fusable spirits — still useful information)

**File 2: `src/systems/RunManager.js`**

Remove `run.fuseSpirits` (lines 640-679, ~40 lines). It's now dead — only `_executeFusion` (which is being deleted) called it. The alchemical paths in `ConsumableEffects.js` use `findFusionRecipe` + `addSpiritDirect` directly, bypassing `fuseSpirits`.

**File 3: `src/systems/ConsumableEffects.js`**

Update Pearl logic (lines 386-409) to consume components like Cinnabar:

```js
alch_pearl: {
  requiresInput: true,
  inputType: 'spirit_pair_tier3',
  execute({ params }) {
    const { spiritIndices } = params ?? {};
    if (!spiritIndices || spiritIndices.length !== 2) return { success: false };
    const spirits = run.spirits;
    const a = spirits[spiritIndices[0]];
    const b = spirits[spiritIndices[1]];
    if (!a || !b) return { success: false };
    const defA = getSpiritDef(a.id);
    const defB = getSpiritDef(b.id);
    if (!defA || defA.tier !== 3 || !defB || defB.tier !== 3) {
      return { success: false, message: 'Pearl requires 2 Tier 3 cross-fusions' };
    }
    const recipe = findFusionRecipe(a.id, b.id);
    if (!recipe) return { success: false, message: 'No Capstone recipe for these fusions' };
    const capstoneDef = getSpiritDef(recipe.output);
    if (!capstoneDef?.capstone) return { success: false, message: 'Recipe does not produce a Capstone' };
    if (!run.canAddLegendary) return { success: false, message: 'No Legendary slot available' };

    // Consume inputs (decrement stackCount; remove if zero) — matches Cinnabar pattern
    a.stackCount = (a.stackCount ?? 1) - 1;
    b.stackCount = (b.stackCount ?? 1) - 1;
    run.removeZeroStackSpirits();

    run.addLegendarySpirit(capstoneDef);
    return { success: true, message: `Created ${capstoneDef.name}!` };
  },
},
```

Note: the success message should drop "Components preserved" wording.

**File 4: `src/data/fusionRecipes.js`**

Update the file-header comment (lines 7-9). Replace:
```
// Fusion is only available at the Sacred Grove.  No ki cost — the cost was
// acquiring both input spirits.  The two input spirits are consumed and
// replaced by one fused spirit, freeing one spirit slot.
```

With:
```
// Fusion happens via alchemical consumables (Cinnabar for T2/T3, Pearl for T4).
// Both alchemicals consume the input spirits. To preserve components, stack
// them first via Jade, Mirror, or Memory before fusing.
```

**Doc changes (batched):**
- §8.6 alchemical table: change Pearl description from "Components preserved" to "Components consumed (stack components first to preserve)"
- §8.6.1 Spirit Fusion Path: rewrite the Pearl paragraph to reflect new consume behavior; note the "stack-then-fuse" pathway for component preservation
- §7.16 Tier 4 Capstones: note the requirement that components be stacked if preservation is desired
- Remove any references to a separate "Sacred Grove fusion ritual" feature distinct from alchemical-driven fusion

---

## D0.8 — Tier 4 Capstone routing on Sacred Grove fusion

**Status:** RESOLVED (subsumed by D0.5 and D0.7)

**Question:** When a Sacred Grove fusion produces a Tier 4 Capstone, the result was incorrectly routed to a regular spirit slot instead of a legendary slot. Confirm this is fully resolved by D0.5 and D0.7.

**Decision:** No additional codebase changes needed. The bug surface is eliminated by:

- **D0.7** removed the Sacred Grove fusion ritual UI section entirely, along with `run.fuseSpirits` (which was the function that misrouted capstones to regular slots).
- **D0.5** added `!s.capstone` filter to `_pickRandomLegendary`, preventing capstones from spawning as legendary shop offerings.
- All remaining capstone-producing paths (Pearl alchemical, shop legendary purchase) correctly use `run.addLegendarySpirit`, which routes to legendary slots with built-in uniqueness checks (one of each) and slot-cap enforcement (max 2 legendary slots).

**Verification of resolution (audit trace):**

| Path | Capstone routing | Correct? |
|---|---|---|
| Sacred Grove fusion ritual UI (`_executeFusion → fuseSpirits`) | Routed to regular slots (`_allSpirits.push`) | ❌ Was the bug — eliminated by D0.7 |
| Sacred Grove legendary shop offering | Routed via `addLegendarySpirit` | ✓ Was correct routing, but capstones could leak in via filter bug — eliminated by D0.5 |
| Pearl alchemical | Routed via `addLegendarySpirit` | ✓ Correct |
| Cinnabar alchemical | Tier check rejects T4 outputs | ✓ Cannot produce a capstone |
| Sulfur alchemical | Selects from `run.spirits` (regular only); capstones excluded | ✓ Cannot duplicate capstones |

**Codebase changes:** None. Resolved transitively by D0.5 + D0.7.

**Doc changes:** None beyond what D0.5 and D0.7 already require.

---

## D0.9 — Heart Chakra over-edition

**Status:** RESOLVED

**Question:** When a player applies Heart Chakra to a card that already has an edition, should the new edition silently overwrite (current behavior), block with a fail message, prompt for confirmation to reroll, or upgrade-only reroll?

**Decision:** Block with a fail message. Heart Chakra cannot be applied to a card that already has an edition. The Heart Chakra consumable is NOT consumed if the application fails.

**Rationale:**
- Editions (Gold +20 pts, Crystal +5 mult, Ghost ×1.5 mult) are dropped at probabilities 60%/30%/10%. The probability distribution is a structural bound on Ghost rarity — Ghost is genuinely rare, not a foregone conclusion.
- A confirmation-to-reroll mechanism would let players spam Heart Chakras until Ghost lands (~10 attempts expected). This eliminates the variance that the probability distribution was designed to create, and reduces edition outcomes to "spend N Heart Chakras → get Ghost." Removes meaningful luck.
- An upgrade-only reroll mechanism would be mechanically equivalent — just slightly more friction toward the same Ghost-on-everything endpoint.
- Blocking edition reapplication makes Heart Chakra application a real commitment. To get multiple attempts at a desired edition, the player must duplicate the card first (e.g., via Throat Chakra). This creates an interlocking play between two mechanics.
- Consistent with the broader principle that no consumable is consumed if its operation fails or is cancelled.

**Codebase changes (immediate):**

**File: `src/systems/RunManager.js`**

In `applyChakraHeart` (around line 1322):

```js
applyChakraHeart(cardId) {
  const card = this._deck.find(c => c.id === cardId);
  if (!card) return { success: false, reason: 'Card not found' };
  if (card.edition) {
    return { success: false, reason: 'Card already has an edition' };
  }
  const roll = Math.random();
  card.edition = roll < 0.6 ? 'gold' : roll < 0.9 ? 'crystal' : 'ghost';
  this._notifyBadger();
  return { success: true, edition: card.edition };
}
```

The semantic change: if `card.edition` is already set, return failure without modifying the card.

**File: `src/scenes/GameScene.js` and/or `src/scenes/ShrineScene.js`** (wherever Heart Chakra application is handled in the UI)

The consumer of `applyChakraHeart` should:
1. NOT consume the Heart Chakra consumable if `result.success === false`
2. Display a brief message to the player when `result.reason === 'Card already has an edition'` (e.g., "This card already has a Gold edition")
3. Allow the player to retarget the Heart Chakra to a different card, or cancel out of card-target mode

The consumable consumption logic should already check `result.success` before decrementing — if not, this needs to be fixed as part of the same task.

**Doc changes (batched):**
- §8.5 Chakra Tools, Heart Chakra description: clarify "Cannot be applied to a card that already has an edition. To upgrade an edition outcome, duplicate the card first via Throat Chakra and apply Heart Chakra to the duplicate."

---

## D0.10 — `one_yaku_disabled` (hex_30) rotation behavior

**Status:** RESOLVED

**Question:** Hex_30 description says "One randomly selected yaku is disabled for the entire run. Determined at run start." But implementation rotates the disabled yaku per round (Kasu → Tanzaku → Tane → Hikari) AND lowers the other three yaku thresholds by 1 to compensate. Which is correct?

**Decision:** Implementation is correct. Doc text is wrong and needs to be updated to match the rotating-per-round behavior with compensation buff to other yaku.

**Rationale:**
- A fixed-at-run-start disable would let the player simply build away from the disabled yaku (e.g., if Hikari is disabled, focus exclusively on Tane). This trivializes the hexagram and makes it a "specialize anti-yaku" effect rather than a constraint to navigate.
- The rotating-per-round behavior creates real strategic depth: every yaku is unavailable on some rounds, so players cannot specialize around the disabled yaku. They must build for breadth.
- The undocumented buff to other yaku (-1 threshold) is a thoughtful compensation mechanism — with one yaku unavailable each round, the other three need to be slightly easier so the player isn't crushed. The buff and the rotation work together as a coherent design.
- The description in `data/hexagrams.js` was placeholder text written before the rotation mechanic was fully designed. Implementation reflects the more nuanced design intent.

**Codebase changes (immediate):**

Update the description string in `src/data/hexagrams.js` for `id: 'hex_30'`:

```js
description: 'Each round, one yaku is disabled (cycles through Kasu \u2192 Tanzaku \u2192 Tane \u2192 Hikari). The other three yaku have their thresholds reduced by 1 to compensate.',
```

The implementation in `src/systems/HexagramEffects.js` (lines 342-360) is correct as-is. No code changes.

**Doc changes (batched):**
- §9.1 hex_30 description: replace "One randomly selected yaku is disabled for the entire run. Determined at run start." with the correct rotating-per-round mechanic plus compensation buff. Use the same wording as the data string above.
- Note in §9 introduction or §9.1: this hexagram demonstrates a "rotating constraint" pattern that distinguishes it from static-effect hexagrams. Could be a useful framing for any future similar hexagrams.

**Open follow-up (Phase 3 UI work):**
- The Yaku Reference panel (Slice 6 C56) and/or the active hexagram display (Slice 6 C57) should surface the currently-disabled yaku per round, since players will need to know which yaku is unavailable each round. Deferred to Phase 3.

---

## D0.11 — Speculative cards integration + Symbiosis stacking semantics

**Status:** RESOLVED

**Question:** Two related questions:
1. Should the 13 speculative cards (defined in `data/cards.js` with `speculative: true`) be integrated into the playable game now, or deferred until art is produced?
2. Symbiosis (`util_symbiosis`) currently has buggy semantics — when stacked, it summons N DIFFERENT random symbionts per animal capture, not the intended "summon the corresponding symbiont at N stacks." Resolve.

**Decisions:**

1. **Defer speculative card integration** until art is produced. Speculatives stay in data but do not enter the deck or shop. Three symbionts that reference speculative animals (Wolf/Garden/Badger) remain inert in the meantime — symbionts are gated behind Symbiosis, not directly purchasable, so there's no confusion about acquiring them. They remain in the catalog as pre-built entries that activate automatically when speculative integration lands.

2. **Refactor Symbiosis semantics:** stacked Symbiosis produces a stacked symbiont. When an animal is captured, summon the corresponding symbiont (per `ANIMAL_SYMBIONT_MAP`) at a stack count equal to Symbiosis's stack count. There is no random selection of "other symbionts" — each animal has exactly one mapped symbiont.

**Rationale:**

For deferral:
- Speculative cards have no images. Integrating them now would render as missing assets.
- Phase 0/1/2/3/4 should focus on correctness work that doesn't require new art assets.
- Symbionts gated behind Symbiosis (verified: shop pool excludes tier 0 symbionts at line 137 of `_generateSpiritOfferings`), so Wolf/Garden/Badger are unreachable through normal play. They remain dormant until speculative integration enables their source animals to be captured.

For Symbiosis semantics:
- The current implementation (multi-stack summons different symbionts) was based on a misunderstanding of how the Symbiosis-animal mapping works. Each animal has exactly one corresponding symbiont (defined in `ANIMAL_SYMBIONT_MAP`). There's no scenario where stacking should summon symbionts for animals that haven't been captured.
- The intended behavior — stack count of Symbiosis directly translates to stack count of summoned symbiont — is consistent with how stacking works elsewhere in the spirit system (e.g., D0.6 economy spirits: 3-stack Bonds = +15% interest, 3-stack Coupon = 45% discount).
- Players who invest in stacking Symbiosis should see the payoff in stacked symbionts, not in unrelated random spirits.

**Symbiont stacking transcendence rules:**

When `addSymbiontSpirit(spiritDef, stackCount)` is called with stacks that would push the running total past 3, transcendence is **cascading**: as long as pending stacks ≥ 4, peel off 4 stacks to create a new 1-stack Negative. Multiple Negatives can be created in a single call. Negatives do not occupy spirit slots and have no per-id cap (verified: `canAddSpirit` only counts non-Negative spirits against `spiritSlots`).

Examples:

| Existing | Existing Negatives | Adding | Result |
|---|---|---|---|
| 0 (none) | 0 | 1 | 1-stack regular, 0 negatives |
| 0 (none) | 0 | 4 | 0 regular, 1 new negative |
| 0 (none) | 0 | 8 | 0 regular, 2 new negatives |
| 1-stack | 0 | 3 | 0 regular, 1 new negative |
| 2-stack | 0 | 3 | 1-stack regular, 1 new negative |
| 3-stack | 1 | 1 | 0 regular, 2 negatives total |
| 3-stack | 1 | 5 | 0 regular, 3 negatives total |
| 3-stack | 2 | 4 | 3 regular, 3 negatives total |

The algorithm is a `while` loop: while `pendingStacks >= 4`, peel off 4 and create a Negative. Whatever's left (0-3) becomes the regular stack count.

This rule applies specifically to `addSymbiontSpirit`. Other methods that add spirits one-at-a-time (`buySpirit`, `summonSpirit`) only ever add 1 stack per call, so the cascading-loop is reduced to a single iteration — same observable behavior as their current implementations.

**Codebase changes (immediate):**

**File 1: `src/systems/RunManager.js`**

Refactor `addSymbiontSpirit` (around line 411) to accept a `stackCount` parameter and implement the stacking + transcendence-with-remainder semantics. Extract symbiont state init to a helper `_buildSymbiontSpirit` to avoid duplication.

```js
addSymbiontSpirit(spiritDef, stackCount = 1) {
  const existing = this._allSpirits.find(s => s.id === spiritDef.id && !s.isNegative);
  let pendingStacks = (existing?.stackCount ?? 0) + stackCount;
  const hadExisting = !!existing;

  // Cascading transcendence: peel off 4 stacks at a time into Negatives.
  // Negatives do not occupy spirit slots and have no per-id cap.
  let negativesCreated = 0;
  while (pendingStacks >= 4) {
    pendingStacks -= 4;
    this._allSpirits.push({
      id: spiritDef.id, name: spiritDef.name, symbiont: true,
      stackCount: 1, isNegative: true, state: null,
    });
    negativesCreated++;
  }

  // Update or create the regular spirit with whatever stacks remain.
  if (existing) {
    if (pendingStacks > 0) {
      existing.stackCount = pendingStacks;
    } else {
      const idx = this._allSpirits.indexOf(existing);
      this._allSpirits.splice(idx, 1);
    }
  } else if (pendingStacks > 0) {
    if (!this.canAddSpirit) {
      // No slot for the regular remainder. Stacks are lost; Negatives created stand.
      return { success: true, result: negativesCreated > 0 ? 'transcended_no_slot' : 'failed' };
    }
    this._allSpirits.push(this._buildSymbiontSpirit(spiritDef, pendingStacks));
  }

  if (negativesCreated > 0 && pendingStacks > 0) return { success: true, result: 'transcended_with_remainder' };
  if (negativesCreated > 0)                       return { success: true, result: 'transcended' };
  if (hadExisting)                                 return { success: true, result: 'stacked' };
  return { success: true, result: 'added' };
}

_buildSymbiontSpirit(spiritDef, stackCount) {
  const spirit = { id: spiritDef.id, name: spiritDef.name, symbiont: true, stackCount };
  if (spiritDef.id === 'sym_caterpillar') spirit.state = { leafsEaten: 0 };
  if (spiritDef.id === 'sym_cuckoo_egg')  spirit.state = { roundsRemaining: 3 };
  if (spiritDef.id === 'sym_algae')       spirit.state = { summonCount: 0 };
  if (spiritDef.id === 'sym_ants')        spirit.state = { totalPlayed: 0 };
  if (spiritDef.id === 'sym_crow')        spirit.state = {};
  if (spiritDef.id === 'sym_ducks')       spirit.state = { multValue: 1 };
  if (spiritDef.id === 'sym_snails')      spirit.state = { totalUnplayed: 0 };
  if (spiritDef.id === 'sym_magpie')      spirit.state = {};
  if (spiritDef.id === 'sym_osprey')      spirit.state = { flipsUsedThisRound: 0 };
  if (spiritDef.id === 'sym_badger')      spirit.state = { consumablesUsed: 0 };
  return spirit;
}
```

**File 2: `src/systems/GameRoundManager.js`**

Replace the entire Symbiosis block (around lines 1639-1680) with:

```js
// util_symbiosis: capturing an animal summons its corresponding symbiont
// at a stack count equal to Symbiosis's stack count.
const symbiosisStacks = run.countStackedById('util_symbiosis');
if (symbiosisStacks > 0) {
  for (const card of cards) {
    if (card.type !== 'animal') continue;
    const symbiontId = ANIMAL_SYMBIONT_MAP[card.id];
    if (!symbiontId) continue;
    const symDef = getSpiritDef(symbiontId);
    if (!symDef) continue;
    const result = run.addSymbiontSpirit(symDef, symbiosisStacks);
    if (result.success) {
      // sym_algae: increment summon count on each successful summon.
      for (const spirit of run.spirits) {
        if (spirit.id === 'sym_algae' && spirit.state) {
          spirit.state.summonCount = (spirit.state.summonCount ?? 0) + 1;
        }
      }
    }
  }
}
```

This drops the multi-symbiont pool logic, the random-other-symbionts selection, and the `filter(...).length` antipattern (replaced with `countStackedById`).

**File 3: `src/data/spirits.js`**

Update Symbiosis description (around line 431):

```js
description: 'Capturing an animal summons its corresponding symbiont. Stacks: the summoned symbiont gains the same stack count as Symbiosis itself.',
```

**Doc changes (batched):**
- §7.10 Symbiosis description: replace "3 stacks summon 3 different symbionts per capture" with the new "stack count translates to summoned symbiont stack count" wording.
- §17 deferred items: add "Speculative card integration" alongside save/load and tutorial as a discrete pre-demo milestone, blocked on art production.
- Note in §7 (Spirits): "Symbionts (Tier 0) are not directly purchasable. They are summoned only by Symbiosis when their corresponding animal is captured. Each animal maps to exactly one symbiont (see Animal-Symbiont Map in §X)."

---

## D0.12 — `toSnapshot()` retention

**Status:** RESOLVED

**Question:** Five managers (`RunManager`, `GameRoundManager`, `HandManager`, `FieldManager`, `CaptureManager`) expose `toSnapshot()` methods that are never called externally. Are they save/load scaffold worth retaining, or dead code to remove?

**Decision:** Remove all five `toSnapshot()` methods. Save/load will be designed and implemented from scratch in Phase 5 against the then-current state shape.

**Rationale:**
- Audit revealed `RunManager.toSnapshot()` is missing 9 of 17 state fields (no hexagram id, hexagram state, blessings, legendaries, negative consumables, throatCounter, triggeredCombos, permanentFieldSlotMod, maxConsumableSlots). A save built from this would silently corrupt — losing the active hexagram, all persistent buffs, and capstones.
- The methods are not just unused scaffold — they're incomplete scaffold that would mislead a future implementer into thinking the work is partially done.
- Fixing them now requires designing the save format, which is properly part of save/load implementation in Phase 5. Premature.
- By the time save/load is built, the state shape may evolve further (new managers, new fields). Today's "correct" snapshot would still be stale tomorrow.
- A clean slate avoids designing the save/load system around legacy code shape.

**Codebase changes (immediate):**

Remove the `toSnapshot()` method from each of:

- `src/systems/RunManager.js` (around line 1538-1550)
- `src/systems/GameRoundManager.js` (around line 1003-1015)
- `src/systems/HandManager.js` (around line 287-291)
- `src/systems/FieldManager.js` (around line 443-450)
- `src/systems/CaptureManager.js` (around line 278-285)

Verify with `grep -rn "toSnapshot" src/` after removal — expect zero matches.

**Doc changes (batched):** None.

**Open follow-up (Phase 5):**
- Save/load system design and implementation. The new system will start with a deliberate spec of which run state needs to persist across sessions, including all 17+ RunManager state fields, full hexagram state, blessings, legendaries, and per-manager state.

---

## D0.11.5 — Extend Negative-cap removal to all spirit-add paths

**Status:** RESOLVED

**Question:** D0.11 removed the per-id cap on Negative spirits for `addSymbiontSpirit` (Symbiosis). Should this rule extend to other spirit-add paths so the design is consistent?

**Decision:** Yes. Remove the legacy "max one Negative per id" cap from `buySpirit`, `summonSpirit`, and `_addPastLifeCopy`. Multiple Negative copies of the same spirit are allowed everywhere.

**Rationale:**
- Design intent (per user): "no caps... this would create inconsistency across spirit designs."
- Current code has the same `if ((existing.stackCount ?? 1) >= 3 && hasNegative) return failure` check at three callsites, all enforcing the legacy single-Negative-per-id rule. Without removing them, only the Symbiosis path follows the new design; the other paths continue to block at the cap.
- Each callsite adds 1 stack at a time, so no cascading-while-loop is needed — at most 1 transcendence per call. The fix is purely deletion of the cap check; the rest of the transcendence logic stays.
- Amber alchemical (line 350-366) and Cinnabar/Sulfur paths use `addSpiritDirect` which has no caps and is already permissive — those don't need changes.

**Codebase changes (immediate):**

**File: `src/systems/RunManager.js`**

Three callsites need the cap check removed:

1. `buySpirit` (around line 288-295): remove the `if ((existing.stackCount ?? 1) >= 3 && hasNegative)` block that returns `'Maximum spirit copies reached'`. Stack-then-transcend logic continues normally.

2. `summonSpirit` (around line 438-445): same pattern, same removal.

3. `_addPastLifeCopy` (around line 519-535): remove the `if ((existing.stackCount ?? 1) >= 3 && hasNegative) return; // max reached` line. Stack-then-transcend logic continues normally.

After removal, all three behave consistently with `addSymbiontSpirit`: a 3-stack regular + 1 added stack transcends to a new 1-stack Negative (regardless of how many Negatives already exist). The stack count of the resulting Negative is always 1 (matching existing behavior; cascading is only relevant for multi-stack additions which only `addSymbiontSpirit` supports).

The `hasNegative` variable can stay since it's referenced for state inheritance in some branches. Just remove the early-return blocks that gate on it.

**Doc changes (batched):**
- §11.4 (or wherever the Negative cap rule was previously documented): note that there is no per-id cap on Negative spirits. Multiple Negative copies of the same spirit are allowed.

---

## D0.13 — Tropic/Arctic/Solstice/Equinox name collision

**Status:** RESOLVED (with OPEN follow-up)

**Question:** Hexagrams use 2/2/4/4-month definitions for these terms (Equinox = Mar/Sep, Solstice = Jun/Dec, Tropic = Apr/May/Jul/Aug, Arctic = Oct/Nov/Jan/Feb — 12 months partition exactly once). Cross-fusion spirits use 6/6/6/6-month definitions (Equinox = Spring + Autumn, Solstice = Summer + Winter, Tropic = Spring + Summer, Arctic = Autumn + Winter — every month covered by 2 spirits). Same names, different scopes. Resolve.

**Decision:** Accept the divergence for now. Each system uses the term internally consistently. Both will be made self-documenting via explicit month lists in their descriptions, so player confusion is mitigated even though the same term means different things in the two systems.

**Rationale:**
- Both definitions are mechanically meaningful and serve their respective design goals (hexagram side: narrow targets with high magnitudes; spirit side: broad foundations with constant magnitudes).
- Forced unification would break either hexagram pacing or spirit foundation strategy. Renaming loses thematic clarity (Equinox/Solstice are real astronomical terms).
- Player confusion is mitigated by listing specific months in each description, so the actual coverage is transparent regardless of the term's other meaning.

**Open follow-up:** This may warrant revisiting in playtesting. Two paths to consider down the line:
1. Conform spirits to match hexagrams' narrow definitions (would shift the spirit balance significantly)
2. Rename one set entirely to differentiate (lose thematic coherence)

For Phase 0/1/2/3/4, accept divergence + document both transparently.

**Codebase changes (immediate):**

**File: `src/data/spirits.js`**

Update the four cross-fusion spirit descriptions to include explicit month lists, matching the format used by hexagram descriptions in D0.4:

For `id: 'cross_solstice'`:
```js
description: 'Summer and Winter cards (Jun, Jul, Aug, Dec, Jan, Feb) score with \u00D72.0 mult contribution.',
```

For `id: 'cross_equinox'`:
```js
description: 'Spring and Autumn cards (Mar, Apr, May, Sep, Oct, Nov) score with \u00D72.0 mult contribution.',
```

For `id: 'cross_tropic'`:
```js
description: 'Spring and Summer cards (Mar, Apr, May, Jun, Jul, Aug) score with \u00D72.0 mult contribution.',
```

For `id: 'cross_arctic'`:
```js
description: 'Autumn and Winter cards (Sep, Oct, Nov, Dec, Jan, Feb) score with \u00D72.0 mult contribution.',
```

**Doc changes (batched):**
- §7.15 cross-fusion spirits table: update descriptions to include month lists.
- Add a note explaining the term collision: "Note: hexagrams and cross-fusion spirits use the terms 'Tropic/Arctic/Solstice/Equinox' with different month scopes. Hexagrams use narrow partition (2 or 4 months); spirits use paired-season halves (6 months). Each is internally consistent; descriptions list specific months for clarity."

---

## D0.14 — Yang/Yin/Space/Energy spirit OR-logic compounding

**Status:** RESOLVED

**Question:** Should the Yang/Yin/Space/Energy cross-fusion spirits use OR-logic compounding (same pattern as the corresponding hexagrams in D0.4), so that a card matching both buff axes triggers the bonus twice?

**Decision:** Yes. Apply OR-logic compounding to all four spirits. A card matching both buff axes scores ×4.0 mult contribution (×2.0 × ×2.0); a card matching one buff axis scores ×2.0; a card matching neither is unaffected.

**Rationale:**
- Consistent with the hexagram-side design (D0.4) where Yang/Yin/Space/Energy hexagrams use OR-logic compounding to create rare-but-spike-y "doubly-buffed" cards.
- Cross-fusion spirits are late-game investment pieces (require fusing 2 T2s, each of which required 2 T1s, plus 3 Cinnabars total). The investment justifies a meaningful payoff. The doubly-buffed cards become valuable specialization targets — matching the hexagram design where the doubly-buffed quadrant is the player's "ideal target" for this hexagram.
- Pure additive bonus (no debuff side) — appropriate for a spirit, since spirits don't shape entire runs the way hexagrams do.
- Fire-enhancement immunity preserved (existing behavior).

**Codebase changes (immediate):**

**File: `src/systems/SpiritEffects.js`**

Replace the four Yang/Yin/Space/Energy cross-fusion implementations (around lines 533-563) with the OR-logic accumulator pattern, mirroring the hexagram pattern from D0.4.

```js
cross_yang: {
  // Yang: Air ×2.0, Day ×2.0. Compounds: Air+Day cards score ×4.0.
  // Fire-enhanced cards bypass.
  onCardScored({ card }) {
    if (card.enhancement?.element === 'fire') return null;
    let mult = 1.0;
    if (card.vertical === 'air')  mult *= 2.0;
    if (card.temporal === 'day')  mult *= 2.0;
    return mult !== 1.0 ? { multiplyMult: mult } : null;
  },
},

cross_yin: {
  // Yin: Land ×2.0, Night ×2.0. Compounds: Land+Night cards score ×4.0.
  onCardScored({ card }) {
    if (card.enhancement?.element === 'fire') return null;
    let mult = 1.0;
    if (card.vertical === 'land')  mult *= 2.0;
    if (card.temporal === 'night') mult *= 2.0;
    return mult !== 1.0 ? { multiplyMult: mult } : null;
  },
},

cross_space: {
  // Space: Air ×2.0, Night ×2.0. Compounds: Air+Night cards score ×4.0.
  onCardScored({ card }) {
    if (card.enhancement?.element === 'fire') return null;
    let mult = 1.0;
    if (card.vertical === 'air')   mult *= 2.0;
    if (card.temporal === 'night') mult *= 2.0;
    return mult !== 1.0 ? { multiplyMult: mult } : null;
  },
},

cross_energy: {
  // Energy: Land ×2.0, Day ×2.0. Compounds: Land+Day cards score ×4.0.
  onCardScored({ card }) {
    if (card.enhancement?.element === 'fire') return null;
    let mult = 1.0;
    if (card.vertical === 'land')  mult *= 2.0;
    if (card.temporal === 'day')   mult *= 2.0;
    return mult !== 1.0 ? { multiplyMult: mult } : null;
  },
},
```

**File: `src/data/spirits.js`**

Update the four spirit descriptions to reflect the new compounding behavior:

For `id: 'cross_yang'`:
```js
description: 'Air or Day cards score with \u00D72.0 mult contribution; cards matching both axes compound to \u00D74.0.',
```

For `id: 'cross_yin'`:
```js
description: 'Land or Night cards score with \u00D72.0 mult contribution; cards matching both axes compound to \u00D74.0.',
```

For `id: 'cross_space'`:
```js
description: 'Air or Night cards score with \u00D72.0 mult contribution; cards matching both axes compound to \u00D74.0.',
```

For `id: 'cross_energy'`:
```js
description: 'Land or Day cards score with \u00D72.0 mult contribution; cards matching both axes compound to \u00D74.0.',
```

**Doc changes (batched):**
- §7.15 cross-fusion spirits table: update descriptions for Yang/Yin/Space/Energy to reflect OR-logic compounding.
- Cross-reference §9 hexagram boost_yang/yin/space/energy descriptions, which use the same compounding pattern.

---

## D0.15 — ×mult enhancements apply to capture-level mult, not card-local points

**Status:** RESOLVED

**Question:** Surfaced during Phase 0 playtesting. Snow ×2 currently multiplies the Snow card's own points (e.g., 20-pt Phoenix → 40-pt Phoenix), then sums into the capture's running points. This makes Water enhancements significantly weaker than Wood enhancements (which apply to the capture-level mult), inconsistent with the visual "×2 mult" badge, and inconsistent with how players intuitively expect ×mult mechanics to behave. Resolve scoping for ×mult enhancements and editions.

**Decision:** All `×mult` card enhancements and editions apply to the **capture-level mult** when the modified card is scored. Specifically:
- **Water (Snow/Ice):** mult-modifier — moves to capture-level
- **Ghost edition:** ×1.5 mult — already capture-level (verified, no change needed)
- **Wood (Leaf/Silk):** mult-modifier — already capture-level (verified, no change needed)
- **Earth/Metal held-in-hand:** already capture-level (correct, fires from hand not from card)

Card-local effects remain card-local:
- **Fire (Ember/Charcoal):** flat +pts on the Fire card itself (card-local)
- **Gold edition:** flat +20 pts on the Gold card itself (card-local)
- **Crystal edition:** `+mult` (additive, not ×mult) — already applies to capture-level mult accumulator (no change needed)

**Rationale:**
- The data description for `element_water` says "Apply Snow (2× pts, depreciates)" — the "2× pts" wording is ambiguous between card-local and capture-level. The visual badge says "×2 mult" which suggests capture-level semantics.
- `mult` in the per-card scoring loop IS the capture-level multiplier accumulator. Wood already pushes its multiplier into `mult`; Water should follow the same pattern.
- Capture-level scoping makes Water-build strategies meaningfully more powerful, especially with multi-card captures, multiple Water-enhanced cards in one capture (compounding), and retriggers (Echo/Mirror/Memory/Rainbow). This aligns with the design intent that Water-build is a viable scaling archetype, supported by Glacier (engine_glacier) which scales with Water depreciation.
- Consistency: "any card enhancement which gives xmult should be treated as xmult when scored, applying to the mult calculation as a whole."

**Codebase changes (immediate):**

**File: `src/systems/GameRoundManager.js`**

Four code sites need updating to apply Water as capture-level mult instead of card-local pts. Pattern is identical at each site: replace `cardPts = Math.round(cardPts * getWaterMult(enh.tier, enh.depLevel ?? 0))` with `mult *= getWaterMult(enh.tier, enh.depLevel ?? 0)`.

1. **Line 475-477 (main scoring loop):**
```js
// BEFORE:
if (enh?.element === 'water') {
  cardPts = Math.round(cardPts * getWaterMult(enh.tier, enh.depLevel ?? 0));
}

// AFTER:
if (enh?.element === 'water') mult *= getWaterMult(enh.tier, enh.depLevel ?? 0);
```

2. **Line 1200-1204 (per-card scoring breakdown logger):**
```js
// BEFORE:
if (enh?.element === 'water') {
  const _wMult = getWaterMult(enh.tier, enh.depLevel ?? 0);
  cardPts = Math.round(cardPts * _wMult);
  _cb.contributions.push({ source: `${enh.tier} Water (dep ${enh.depLevel ?? 0})`, multiplyMult: _wMult });
}

// AFTER:
if (enh?.element === 'water') {
  const _wMult = getWaterMult(enh.tier, enh.depLevel ?? 0);
  mult *= _wMult;
  _cb.contributions.push({ source: `${enh.tier} Water (dep ${enh.depLevel ?? 0})`, multiplyMult: _wMult });
}
```

3. **Line 1343 (retrigger scoring):**
```js
// BEFORE:
if (enh?.element === 'water') cardPts = Math.round(cardPts * getWaterMult(enh.tier, enh.depLevel ?? 0));

// AFTER:
if (enh?.element === 'water') mult *= getWaterMult(enh.tier, enh.depLevel ?? 0);
```

4. **Line 1510-1512 (stamp retrigger):**
```js
// BEFORE:
if (rEnh?.element === 'water') {
  rPts = Math.round(rPts * getWaterMult(rEnh.tier, rEnh.depLevel ?? 0));
}

// AFTER:
if (rEnh?.element === 'water') rMult *= getWaterMult(rEnh.tier, rEnh.depLevel ?? 0);
```

The contribution log at line 1570 already labels Water as `multiplyMult` (semantically correct for capture-level) — no change needed there.

**File: `src/data/consumables.js`**

Update `element_water` description to clarify capture-level semantics:

```js
description: 'Apply Snow (×2 capture mult, depreciates per use). Metal upgrades Snow→Ice (×4). Earth destroys.',
```

**Doc changes (batched):**
- Section explaining card enhancements: clarify the scoping rules. Water/Wood/Ghost are capture-level ×mult; Fire/Gold are card-local flat +pts; Crystal is capture-level additive +mult; Earth/Metal held-in-hand fire from hand and apply to capture mult.
- Note in §17 (deferreds): Snow/Ice base values may need rebalancing after this change. Currently Snow ×2 / Ice ×4 at depLevel 0. With capture-level scoping plus retriggers and engine_glacier scaling, the effective power is significantly higher than the card-local version. Threshold tuning in Phase 5 should account for this. Could optionally lower base values (e.g., ×1.5 base / ×2.5 upgraded) but that's a separate balance call.

**Open follow-ups:**
- Phase 5 threshold tuning to account for the increased Water power
- Phase 3 UI: Snow/Ice mult badge consolidation (F3.7) should show the capture-level multiplier value with the active depreciation rate

---

## D0.16 — Capstone shop block + shop offering cap removal (extending D0.5 and D0.11.5)

**Status:** RESOLVED

**Question:** Surfaced during Phase 0 playtesting (D0.6 Bonds stack scaling test). Two bugs:
1. T4 fusion capstones (Yin-Yang, Universe, Time, Nature) still appear in Sacred Grove legendary shop offerings, despite D0.5 specifying that capstones should never be shop-purchasable. The shop offers them via `_pickRandomLegendary`, which lacks the `!s.capstone` filter.
2. Spirits at "3-stack regular + 1 negative" state are filtered OUT of the regular shop spirit pool by `_generateSpiritOfferings` at line 141, despite D0.11.5 specifying that Negative-cap removal should allow further purchases. The shop UI filter still enforces the legacy cap that the buy-side methods no longer enforce.

Effectively, D0.5 and D0.11.5 each touched the buy-side methods but missed the corresponding shop-UI filter logic in `ShrineScene.js`.

**Decision:** Extend both fixes to cover the shop UI filter:
1. Add `!s.capstone` filter to `_pickRandomLegendary` (per D0.5 intent)
2. Remove the `(stackCount >= 3 && hasNeg)` block from `_generateSpiritOfferings` (per D0.11.5 intent)

**Rationale:**
- D0.5 designated Pearl alchemical as the SOLE path to capstones. Capstones in shop offerings violate this design.
- D0.11.5 removed the cap on Negative spirit copies across all buy/summon/past-life paths. The shop filter contradicts that fix and creates a UI-level gate that blocks the player from exercising their newly-allowed purchase options.

**Codebase changes (immediate):**

**File: `src/scenes/ShrineScene.js`**

1. **`_pickRandomLegendary` (around line 160):** Add `!s.capstone` to the filter.

```js
// BEFORE:
_pickRandomLegendary() {
  const ownedIds = new Set(run.legendarySpirits.map(s => s.id));
  const available = SPIRIT_CATALOG.filter(s => s.legendary && !ownedIds.has(s.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// AFTER:
_pickRandomLegendary() {
  const ownedIds = new Set(run.legendarySpirits.map(s => s.id));
  const available = SPIRIT_CATALOG.filter(s => s.legendary && !s.capstone && !ownedIds.has(s.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}
```

2. **`_generateSpiritOfferings` (around line 135-142):** Remove the `(stackCount >= 3 && hasNeg)` filter clause.

```js
// BEFORE:
_generateSpiritOfferings(count) {
  const pool = SPIRIT_CATALOG.filter(s => {
    if (s.tier !== 1) return false;
    if (s.legendary) return false;  // legendaries offered separately
    const existing = run.spirits.find(r => r.id === s.id && !r.isNegative);
    const hasNeg   = run.negativeSpirits.some(r => r.id === s.id);
    return !(existing && (existing.stackCount ?? 1) >= 3 && hasNeg);
  });
  // ...
}

// AFTER:
_generateSpiritOfferings(count) {
  const pool = SPIRIT_CATALOG.filter(s => {
    if (s.tier !== 1) return false;
    if (s.legendary) return false;  // legendaries offered separately
    return true;
  });
  // ...
}
```

The shop pool now includes ALL tier-1 non-legendary spirits regardless of whether the player already owns regular and/or Negative copies. The buy-side logic (post-D0.11.5) correctly handles stacking and cascading transcendence.

**Doc changes (batched):**
- Section on Sacred Grove offerings: clarify "Sacred Grove offers Legendaries (Gankyil only — Capstones are Pearl-only)."
- Section on shop offerings: clarify "Tier-1 spirits remain in the offering pool regardless of player's current stack state. Negative copies do not gate further purchases."

**Open follow-ups:** None.

---

## D0.17 — Phase 2 spirit corrections: transcendence stack preservation, Amber generalization, stack-aware fixes

**Status:** RESOLVED (shipped 2026-05-06; in-flight verification)

**Question:** Phase 0 playtesting and console diagnostics surfaced multiple related bugs in spirit-add paths and stack-aware spirit effects. Resolve as a coherent group since they share architectural concerns around stackCount preservation and the effective-stacks-counting pattern.

**Decisions:**

1. **Universal transcendence stack-preservation rule.** A negative copy preserves the snapshot of the regular spirit's stack count immediately before the action that created it. Applies uniformly across `buySpirit` (already correct), `summonSpirit`, `_addPastLifeCopy`, `addSymbiontSpirit` cascading transcendence, and `alch_amber`.
   - `buySpirit`/`summonSpirit`/`_addPastLifeCopy` (+1 at a time): snapshot = `existing.stackCount - 1` (the pre-overflow value)
   - `addSymbiontSpirit` cascading peel-of-4: snapshot = 3 (the boundary value before the 4th-stack overflow)
   - `alch_amber`: snapshot = current target.stackCount exactly (works on any stack count)

2. **State inheritance on transcendence.** All transcendence sites must inherit `existing.state ?? null` to ensure negative copies retain accumulated state (e.g., Ants `totalPlayed`, Snails `totalUnplayed`).

3. **Amber generalization.** Amber now works on any stack count (not just 3-stacks). The negative copy's stackCount equals the consumed regular's stackCount exactly.

4. **Ants increment stack-aware.** Increment is `cardIds.length × stackCount` (not just `cardIds.length`). Loop iterates `[...this._spirits, ...run.negativeSpirits]` so negative Ants increment too.

5. **Crow consumable generation stack-aware.** Use `countStackedById('sym_crow')` instead of `filter().length` at both round-end callsites. (Note: separate diagnostic prompt added to investigate why Crow generates zero consumables even with stacks > 0.)

6. **Coupon discount stack-aware + cap removed + 10% price floor.** Use `countStackedById('econ_coupon')`. Remove `Math.min(0.45)` cap. Add `Math.max(0.1, 1 - discount)` floor so prices can't drop below 10% of base.

**Rationale:**

- D0.6 began the "no caps + stack-aware" architectural shift but didn't catch all callsites. Phase 0 testing surfaced the residual cases.
- The transcendence stack-preservation rule was inconsistent across paths: `buySpirit` correctly preserved `stackCount-1`, but `summonSpirit`, `_addPastLifeCopy`, and `addSymbiontSpirit` cascading all dropped to stackCount=1, breaking the "negatives preserve power" design intent.
- Amber's prior 3-stack restriction was inconsistent with its design as a "transcend any spirit" tool. Generalization preserves the no-cap principle of D0.6.
- Coupon's 10% floor prevents free purchases at 6+ effective stacks while still allowing meaningful discount accumulation.
- State inheritance was implicit-but-correct in `buySpirit` (line 308 used `existing.state ?? null`) but missing elsewhere. Without it, negatives have undefined state and engine effects return null even when the regular's state was substantial.

**Codebase changes (immediate):**

Eight edits across four files, all shipped in a single Claude Code prompt:

1. `RunManager.js summonSpirit` (~line 489-499): preserve `stackCount: snapshotStacks` and `state: existing.state ?? null`
2. `RunManager.js _addPastLifeCopy` (~line 569-578): same pattern
3. `RunManager.js addSymbiontSpirit` cascading (~line 432-438): each peeled negative gets `stackCount: 3, state: existing?.state ?? null`
4. `ConsumableEffects.js alch_amber` (~line 354-365): remove `< 3` requirement, add state inheritance
5. `data/consumables.js` Amber description: "Transcend any spirit (creates a Negative copy preserving stack power). Cost: -1 permanent field slot."
6. `GameRoundManager.js` Ants increment (~line 568-577): iterate negatives + multiply by stackCount
7. `GameRoundManager.js` Crow at two callsites (~line 735-739 and ~line 1980-1986): use `countStackedById('sym_crow')`
8. `ShrineScene.js _price` (~line 1782-1789): add `Math.max(0.1, 1 - discount)` floor

**Doc changes (batched):**
- Update Spirit Roster doc Amber section to reflect "any spirit" + new stack-preservation rule
- Update Mechanics doc transcendence section to document universal stack-preservation rule across all spirit-add paths
- Update Coupon section to note 10% floor and uncapped accumulation

**Open follow-ups:**
- Crow non-firing root cause (separate diagnostic prompt to identify whether trigger is unreachable or generation is failing)
- Grace mid-round trigger (separate D0.x decision; design intent change to fire base style ki + Grace multiplier mid-round)
- Osprey strand interaction with hand-cards-to-empty-slot pairs (separate fix)
- 2-cards-to-empty-slot + same-month deck flip behavior (open design question)

---

## D0.18 — Economy timing redesign: mid-round style ki + interest to round-end + spirit-order chaining

**Status:** RESOLVED (shipped 2026-05-06)

**Question:** The base style combo ki (1 ki/combo) and Grace's multiplier currently apply only at round-end, while Magpie fires per-combo mid-round. This creates a temporal asymmetry that's hard to read and limits build expressiveness. Should we restructure the economy to apply all ki bonuses mid-round on combo trigger? Should interest move from round-start to round-end? Should multiple ki-affecting spirits chain in slot order?

**Decisions:**

1. **Style combo ki fires mid-round.** Base ki (1 per combo) + Grace's multiplier + Magpie's bonus all apply AS each combo triggers. Round-end no longer includes any combo ki contribution.

2. **Interest moves to round-end.** Computed inside `calculateKiReward` based on ki balance BEFORE round-end credits compound (Q1 Option 1 — preserves existing rate balance, just relocates timing for cleaner UX).

3. **Spirit-order chaining for ki bonuses.** New `applyKiBonus({ ki, spirit })` hook on SpiritEffects entries. Mid-round on each combo trigger, iterate `[...this._spirits, ...run.negativeSpirits]` in slot order; each spirit's `applyKiBonus` transforms the running ki. Order matters:
   - Magpie before Grace: `(1 + 9) × 4 = 40` per combo (3-stack both)
   - Grace before Magpie: `(1 × 4) + 9 = 13` per combo (3-stack both)

4. **Round-end ki broken into separate sources** for visibility: base (5), hand cards × Piggy mult, Earth interest, interest. Combo ki removed entirely.

5. **Piggybank universally stack-aware + uncapped.** `calculateKiReward` updated to use `countStackedById('econ_piggybank')` (was already done in some paths but not consistently) and `Math.min(... 4)` cap removed.

**Rationale:**

- The temporal asymmetry of "Magpie fires now, base/Grace fire later" was confusing and limited the design space. Unifying to mid-round makes the economy's pulse readable.
- Spirit-order chaining mirrors the existing engine-spirit slot-order mechanic for capture scoring. Players already manage slot positions; this adds expressive depth without introducing a new mental model.
- Interest at round-start created the impression that interest was "free money" appearing before the round earned anything. Round-end interest reads as "your reward for ending the round with this much ki," which is more intuitive.
- Pre-credit interest base preserves existing rate balance — the economy isn't accidentally rebalanced by D0.18; only the timing changes.
- Piggybank cap removal applies the universal D0.6 no-cap principle that hadn't yet been propagated to this callsite.

**Codebase changes (immediate):**

Edits across four files:

1. `SpiritEffects.js sym_magpie` (~line 502-508): adds `applyKiBonus` returning `ki + (3 × stacks)`
2. `SpiritEffects.js econ_grace` (~line 358-364): adds `applyKiBonus` returning `ki * (1 + stacks)`
3. `GameRoundManager.js _onStyleCombos` (~line 1684-1697): replaces direct addKi with per-combo spirit-chain loop. Preserves `applyHook('modifyStyleKi', ki, ki)` on base ki for hexagram hook compatibility (style_ki_double / style_flow_double hexagrams).
4. `GameRoundManager.js startRound` (~line 334-336): removes `run.applyInterest()` call (interest now in calculateKiReward).
5. `RunManager.js calculateKiReward` (~line 980-994): removes combo ki computation; adds interestKi computed on pre-credit ki; uses uncapped countStackedById for piggyMult.
6. `GameScene.js` round-end ki label (~line 2713-2723): removed "+N style" segment, added "+N earth" segment.
7. `GameScene.js` round-start status (~line 3209-3223): removed dead interest status message and unused interest variable.

**Open behaviors / new build dynamics:**

- Magpie-then-Grace (slot-ordered) at 3-stack each → +40 ki per combo. Strong economy spike on multi-combo rounds. Worth monitoring during Phase 5 balance.
- Grace's `applyKiBonus` multiplier applies to whatever upstream-slot spirits contribute. With future ki-affecting spirits, the chain extends naturally.
- Future ki-affecting spirits add `applyKiBonus` to their SpiritEffects entry; no changes to `_onStyleCombos` needed.

**Doc changes (batched):**
- Update Mechanics doc economy section: style combo ki is now per-combo mid-round, with spirit-order chaining; round-end ki = base + hand + Earth + interest (computed pre-credit).
- Update Grace tooltip: "Multiplies running ki bonus by (1 + stacks) per style combo. Fires mid-round at the moment the combo triggers."
- Update Magpie tooltip: "Adds 3 ki per stack to running ki bonus per style combo. Fires mid-round at the moment the combo triggers."
- Note Magpie/Grace ordering effect in player-facing docs.

**Open follow-ups:**
- Phase 4 cleanup: orphan `styleComboKi` method and `applyInterest` method (may no longer be called externally).
- Phase 5 balance: review Magpie-then-Grace ki spike at high stacks; consider per-combo ki cap if it dominates economy.
- Verify the `modifyStyleKi` hook integration works correctly with both `style_ki_double` and `style_flow_double` hexagrams.

---

## D0.19 — Symbiont bug fixes: Osprey strand resolution + Algae increment guard

**Status:** RESOLVED (shipped 2026-05-06; pending playtest verification)

**Question:** Two Phase 0 playtest bugs needed fixing as a coherent pair: (1) Osprey intercepting a deck flip didn't resolve 2-cards-played-to-empty pairs, leaving them stranded; (2) Algae's summonCount incremented on attempted summons even when the summon failed (slots full, stacking blocked).

**Decisions:**

1. **Osprey 2-card pair resolution.** When Osprey intercepts a deck flip AND a pending slot doesn't exist for `capturePendingMatch()` to handle, fallback checks for any 'normal'-state 2-card slot matching the intercepted deck card's month. If found, clears the slot and captures the pair.

2. **Algae increment with negatives.** Pre-D0.19 already guarded on `result.success` (from D0.11 rework). D0.19 extends the iteration to include `run.negativeSpirits` so negative Algae copies also increment on successful summons.

**Rationale:**

- The Osprey case represented a silent functional failure when three conditions combined (Osprey + 2-card-to-empty + matching deck flip). Surfaced in playtest, confirmed via repro. The fallback approach mirrors the Fix D / Fix E pattern in `_doDeckPhase` for non-Osprey cases.
- The Algae negative-iteration fix continues the pattern from D0.17 of ensuring all stack-aware/state-tracking spirits include negatives in their increment paths. Consistency across symbiont effects.

**Codebase changes (immediate):**

Two edits to `GameRoundManager.js`:

1. Algae increment loop (~line 1643): change `for (const spirit of run.spirits)` to `for (const spirit of [...run.spirits, ...run.negativeSpirits])`.
2. Osprey intercept fallback (~lines 1762-1773): after the `if (pending0) {...}` block, add `else` branch that iterates `_field.getSlots()` looking for matching 'normal'-state 2-card slot, and clears via `clearSlot(index)` to capture the pair.

**Open follow-ups:**

- Playtest verification: trigger the 2-card-to-empty + matching-deck-flip + Osprey scenario explicitly to confirm pair captures.
- Consider whether the same fallback should apply WITHOUT Osprey — i.e., should playing 2 same-month cards to an empty slot AND the deck flip matching auto-capture the pair? Currently it joins to a 3-stack waiting for the 4th. Open design question (separate D0.x).

---

## D0.20 — Coupon discount floor removal (no-cap principle) + integer arithmetic

**Status:** RESOLVED (shipped 2026-05-06; pending playtest verification)

**Question:** D0.18's Coupon implementation introduced `Math.max(0.1, 1 - discount)` as a 10% price floor. This functions as an arbitrary cap on the discount side and violates the universal D0.6 "no caps" principle. Additionally, the formula has floating-point precision artifacts at certain stack counts (3 stacks: 56 ki instead of 55; 6 stacks: 11 ki instead of 10) due to JS arithmetic on `0.15 * stacks`.

**Decisions:**

1. **Remove the 10% price floor entirely.** Per universal no-cap principle from D0.6: if high-stack Coupon makes items free or near-free, that's a tuning concern, not a behavior to clamp. Address via per-stack rate adjustment in Phase 5 if needed.

2. **Use integer arithmetic** to avoid floating-point precision issues. `Math.ceil(base * Math.max(0, 100 - stacks * 15) / 100)` instead of `Math.ceil(base * (1 - stacks * 0.15))`.

**Rationale:**

- Universal no-cap principle: the design intent is for stack-aware mechanics to scale linearly without arbitrary cliffs. Coupon at 7+ effective stacks reaching 0-cost is the natural mechanical outcome of stacking. If this proves too strong, the per-stack 0.15 rate or stacking accessibility can be tuned, not the discount math.
- Integer arithmetic eliminates the cosmetic 1-ki overcharges at edge stack counts. Cleaner math, clearer player experience.

**Codebase changes (immediate):**

`src/scenes/ShrineScene.js` `_price()` (~line 1782-1789): replaced floor-clamped formula with integer arithmetic. Removes `Math.max(0.1, ...)` and uses `Math.max(0, 100 - stacks * 15) / 100` for the remaining percentage.

**Open follow-ups:**

- Phase 5 balance review: if 7+ effective Coupon stacks proves too easy to reach OR makes items reaching 0-cost trivializes the economy, adjust per-stack rate or shop frequency. Don't add caps.

---

## D0.21 — Symbiont state initialization on summon + Algae stack scaling + Snails increment timing

**Status:** RESOLVED (shipped 2026-05-06; pending playtest verification)

**Question:** Phase 0 playtest revealed three symbiont bugs surfaced together: (1) symbionts created mid-round don't have state initialized, causing Osprey to intercept all deck flips and Ants to lose all plays in the round of summon; (2) Algae's increment doesn't reflect summoned symbiont's stack count; (3) Snails increment is dead code, only fires on hand-empty (`roundOver`) which means handCount=0 and the function early-returns without incrementing.

**Decisions:**

1. **Add `_initSymbiontState` helper** in RunManager. Extract symbiont state init into a reusable method called from every spirit-add path (fresh summon, cascading negative creation when inherited state is null). Ensures all newly-created symbionts have proper state from the moment they exist in `_allSpirits`.

2. **Algae increments by `symbiosisStacks`** (the stack count being summoned), not by 1 per event. With 3-stack Symbiosis summoning a 3-stack symbiont, Algae's summonCount increments by 3.

3. **Snails increments at bank** via `_trackSnailsUnplayed()` call inside `bankScore()` before field scoring. The original `_doDeckPhase` callsite (where roundOver = hand empty) remains for completeness but contributes 0 since handCount is 0 there. Banking with cards in hand now properly increments Snails.

4. **`_trackSnailsUnplayed` iterates negatives** matching the universal pattern.

**Rationale:**

- The state-init bug was a structural gap in the post-D0.11 `addSymbiontSpirit` rework: the old pre-D0.11 path initialized state inline, the new path didn't always do so. The helper method centralizes state init so it can't be missed in future spirit-add paths.
- Algae was implicitly designed to reward "summoning activity" — per-stack scaling matches design intent that more stacks summoned = more Algae value.
- Snails was effectively non-functional. The `_trackSnailsUnplayed` was only called when hand was empty, which immediately fails its `handCount === 0` guard. Moving the call to `bankScore()` ensures it fires when there ARE unplayed cards.

**Codebase changes (immediate):**

`src/systems/RunManager.js`:
- `_initSymbiontState(spirit)` helper added (extracted from old inline state init logic)
- `_buildSymbiontSpirit` calls `_initSymbiontState` for fresh summons
- Cascading transcendence path falls back to `_initSymbiontState` if inherited state is null

`src/systems/GameRoundManager.js`:
- Symbiosis loop Algae increment changed from `+ 1` to `+ symbiosisStacks`
- `bankScore()` calls `_trackSnailsUnplayed()` before field scoring
- `_trackSnailsUnplayed` iterates `[...this._spirits, ...run.negativeSpirits]`

**Open follow-ups:**

- Playtest verification: confirm newly-summoned Osprey/Ants/Snails fire correctly in the round of summon.
- Verify Algae 3-stack scaling visually matches expected math.
- Verify Snails accumulates `totalUnplayed` after multiple bank cycles.
- Tooltip math sync (D0.22) is the natural follow-on, since Snails/Algae/Ants tooltip text doesn't currently reflect engine math at high stacks.

---

## D0.22 — Tooltip math sync with stack-aware engine output

**Status:** RESOLVED (shipped 2026-05-06; pending playtest verification)

**Question:** Phase 0 playtest revealed that 3-stack Ants tooltip showed "+1.0 mult" while actual capture math used "+3 mult" — the tooltip lacked the `× stackCount` factor that the engine had. A broader audit was needed to sync all stack-aware spirit tooltips with their engine outputs.

**Decisions:**

Five tooltip fixes shipped — all spirits where engine output applies `× stacks` (Pattern 2):

1. **sym_algae** tooltip: now multiplies by stackCount.
2. **sym_ants** tooltip: now multiplies by stackCount.
3. **sym_ducks** tooltip: now multiplies by stackCount.
4. **sym_snails** tooltip: now multiplies by stackCount.
5. **engine_napoleon** tooltip: now multiplies by stackCount.

**Rationale:**

- The state-counting audit (D0.17 follow-on) updated these engines to apply `× stacks` in `applyEngine` returns. The corresponding tooltip strings in GameScene.js were not updated, leading to displayed values disagreeing with actual scoring.
- Players use tooltips to evaluate builds and read scoring intent. Tooltip-engine drift actively misleads players about effect magnitudes.

**Codebase changes (immediate):**

`src/scenes/GameScene.js` (~lines 1218-1279): tooltip strings for the five spirits now include `const stacks = spirit.stackCount ?? 1;` and incorporate `* stacks` in the displayed value.

**Open follow-ups:**

- D0.23 addresses spirits that are stack-blind in BOTH engine output AND increment (engine_lincoln, engine_palace, decay spirits). Their tooltips matched their flawed engines, so D0.22 declared them "no change needed" — but per universal stacking principle, the engines themselves are bugged.
- The D0.22 audit also miscategorized engine_palace as "stacks at increment time" when source uses bare `++`. D0.23 re-audits all Pattern 1 classifications.

---

## D0.23 — Universal stack-aware engine audit (per universal stacking principle)

**Status:** RESOLVED (shipped 2026-05-06; pending playtest verification)

**Question:** D0.22 audit accepted several engine spirits as "no change needed" because their tooltips matched their engine output. Per universal stacking principle, every spirit's mechanical contribution should scale with stackCount. D0.22 missed this class of bug — engines that are stack-blind in BOTH increment and engine output. D0.22 also miscategorized engine_palace as Pattern 1 when its increment uses bare `++`. And engine_velocity's T1 path was missed entirely.

**Decisions:**

Five engines apply Pattern 2 (× stacks in engine output):
1. **engine_lincoln**: `addMult: n * 0.1 * stacks` (was `n * 0.1`)
2. **engine_palace**: `multiplyMult: 1 + n * 0.5 * stacks` (was `1 + n * 0.5`)
3. **engine_velocity T1**: `t1Mult = ironCount * 0.1 * stacks` (T2 untouched, already Pattern 1)
4. **decay_persimmon**: `addMult: n * stacks` (was `addMult: n`)
5. **decay_pear**: `addPoints: n * stacks` (was `addPoints: n`) — note: Pear contributes points, not mult

Five tooltips updated to match new engine math.

Eleven Pattern 1 spirits verified correct (increment scales, engine output uses raw counter, no double-application): glacier, carbon, fossil, moths, ship, missing_number, velocity-T2, kintaro, bullseye, wuji, badger.

**Rationale:**

- Universal stacking principle: every spirit's mechanical contribution must scale with stackCount, regardless of which pattern is used.
- Stack-blind engines silently underperformed at high stacks — players investing in stacking these spirits got no benefit.
- decay_pear's `addPoints` (flat point contribution) vs `addMult` distinction matters semantically; this is a different scaling shape than other decay spirits and will be worth eyeballing in Phase 5 balance review.

**Codebase changes (immediate):**

`src/systems/SpiritEffects.js`: lincoln, palace, velocity-T1, decay_persimmon, decay_pear engine outputs now multiply by `spirit.stackCount ?? 1`.

`src/scenes/GameScene.js`: corresponding tooltip strings updated to reflect new engine math.

**Open follow-ups:**

- Playtest verification: confirm stack scaling at 3-stack for all five fixed spirits.
- Phase 5 balance review: Velocity T2 exponential scaling at high stacks (`1.5^stackCount`) may be very strong; document for tuning consideration. Decay Pear's flat-point contribution at 3-stack starting from 150 (= 450 pts/capture) may need tuning.
- Phase 4 F4.11: unify Pattern 1 spirits (11 confirmed) to Pattern 2 throughout for consistent counter semantics. Substantial undertaking but worth it for player understanding.

---

## D0.24 — Past Life redesign: holding period before sale-trigger activates

**Status:** PROPOSED (2026-05-07; pending design approval before implementation)

**Question:** During D0.11.5-3 testing, two issues surfaced with Past Life (`util_past_life`):
1. Selling Past Life when no other regular spirits are equipped produces no copies (`regulars.length === 0` precondition fails). Defensible behavior on its own, but easy to hit accidentally.
2. The current design enables an instant-purchase-instant-sale exploit: player buys Past Life specifically to sell it the same round, treating it as a one-shot consumable rather than a roster decision. This undermines the spirit's identity as a roster commitment.

**Proposed redesign:** Past Life requires holding for at least 2 rounds before sale-trigger can activate copy effect. Selling earlier produces no copies and (per the existing zero-target case) returns standard sale ki only.

**Rationale:**

- Reframes Past Life as a roster commitment, not a delayed consumable. Player must dedicate a slot for at least 2 rounds.
- Adds tactical depth: when do you trigger? Early to compound copy effects across the run, or late to copy your most-developed spirit?
- Matches thematic concept of "past life" — implies time and accumulation, not instant action.
- Makes the spirit's value proposition clearer: you're paying upfront for a future copy, not just buying a discounted spirit copy.

**Implementation options:**

A. **Hard lock (preferred):** Sell button disabled for first N rounds with explanatory tooltip (e.g., "Past Life must mature before selling — N rounds remaining").

B. **Soft trigger:** Player can sell at any time, but copy effect only fires if held for N rounds. Earlier sales produce nothing and refund nothing (or partial ki).

A is cleaner for player UX and aligns with how shop transactions typically work. B is more lenient but creates ambiguity about whether sale "worked."

**Open questions:**
- N = 2 rounds proposed — could be 3 if balance demands more commitment.
- Does the holding period apply per Past Life copy (for stacked Past Life), or per object?
- If the player has multiple Past Life copies acquired at different rounds, do they share a holding period?

**Open follow-ups:**

- D0.24 design decision finalization: confirm hold duration, scope (per-stack vs. per-object), and Option A vs. Option B.
- Implementation prompt: track `acquiredRound` on Past Life spirit objects; gate sale-trigger logic on `current_round - acquiredRound >= N`.
- Re-test D0.11.5-3 after D0.24 implementation lands.

---

## F1.8.a — Negative spirit data model: explicit `powerLevel` field

**Status:** RESOLVED + VERIFIED (shipped 2026-05-07; verified via console diagnostic)

**Question:** Negative spirits previously encoded their power level via `stackCount`, conflating two semantically distinct concepts. This caused UI rendering bugs (3x-power negatives indistinguishable from regular 3-stacks), engine spirit math bugs (negatives accidentally treated as multi-element stacks), and architectural ambiguity for D0.24 Past Life redesign.

**Decisions:**

1. **Negatives now use `{stackCount: 1, isNegative: true, powerLevel: N}` shape.** The `stackCount: 1` accurately reflects that negatives are mechanically singletons. The `powerLevel` field captures their effect strength.
2. **`effectivePower(spirit)` helper exported from RunManager.** Returns `powerLevel` for negatives (with defensive `?? 1` fallback) and `stackCount` for regulars. Becomes the canonical way to read "how strong is this spirit."
3. **All consumers migrated** to use `effectivePower` for scoring/scaling math, while UI/sale-quantity contexts continue using literal `stackCount`. Distinction: stackCount = "how many physical units in the stack" (always 1 for negatives), effectivePower = "scoring strength contribution."
4. **Tooltip header** distinguishes negatives: "Negative (power ×3) — zero-slot" replaces the old "Stacked ×3" + separate "Negative copy" lines.

**Codebase changes (immediate):**

- `RunManager.js`: added `effectivePower` export; `countStackedById` uses helper; all 5 negative-creation sites updated (addSymbiontSpirit cascade, summonSpirit cascade, _addPastLifeCopy cascade, alch_amber).
- `SpiritEffects.js`: imported `effectivePower`; replaced 30+ `spirit.stackCount ?? 1` reads (engines, retriggers, applyKiBonus hooks, applyCapture hooks).
- `GameRoundManager.js`: imported helper; replaced 13+ increment site reads (engine_moths, engine_ship, engine_glacier, engine_carbon, engine_fossil, engine_velocity, engine_missing_number, engine_bullseye, engine_northern_lion, engine_reward, sym_badger via _notifyBadger, plus scoring loop count multipliers).
- `ConsumableEffects.js`: alch_amber uses powerLevel.
- `GameScene.js`: 19 tooltip math sites; sell refund for negatives; badge display uses powerLevel for negatives, stackCount for regulars; tooltip header rewrites.
- `ShrineScene.js`: badge display + sell refund.

**Verification (2026-05-07):**
- Console diagnostic confirmed negative Pollen has shape `{stackCount: 1, isNegative: true, powerLevel: 3}` ✓
- effectivePower returns 3 for negative, 1 for regular singleton ✓
- countStackedById sums correctly (regular_stackCount + negative_powerLevel) ✓
- Build green ✓

**Open follow-ups:**

- F1.8.b (per-element state for accumulator spirits) — playtest evidence (Agriculture counter showing 10 instead of 8 after stack-then-score-2-plains) confirms the per-element bug. Next prompt to ship.
- F1.8.c (UI roster correctness) — F3.13 bundling bug. Awaits F1.8.a + F1.8.b foundation.

---

## F1.8.b — Per-element state for accumulator spirits

**Status:** RESOLVED + VERIFIED (shipped 2026-05-07 with 2 followup patches; verified via playtest + console diagnostic)

**Question:** Accumulator spirits (sym_ants, engine_agriculture, etc.) used a single shared state object per stack, breaking three lifecycle scenarios:
1. Mid-run acquisition: new copies inherited prior accumulation incorrectly
2. Sale of one element: shared counter didn't decrement to reflect the loss
3. Cascading transcendence to negative: the negative didn't preserve the accumulated value of the four elements that became it

**Decisions:**

1. **Regulars use `elements: [...]` array.** Each element has its own state object (e.g., `{totalScored: N, acquiredRound: M}`). Aggregate = sum across elements.
2. **Negatives remain singletons** with `state` object aggregating prior elements at transcendence; continue accumulating per event.
3. **Engine reads aggregate** with no additional `× stacks` multiplier for regulars (per-element coexistence implicitly encodes stack scaling). Negatives multiply state by `powerLevel` explicitly.
4. **Display shows longest-held element value** for "events seen" counter; aggregate for "+N mult" contribution. Counter and mult diverge intentionally when stacking creates extra contribution from newer elements.
5. **Sale convention: pop newest element** matching physical-card mental model (new copies stack atop original). FIFO removal from end of array.
6. **Accumulator list (24 spirits):** sym_ants, sym_snails, sym_algae, sym_badger, engine_devotion, engine_habitat, engine_ceremony, engine_agriculture, engine_lincoln, engine_palace, engine_glacier, engine_carbon, engine_fossil, engine_moths, engine_velocity, engine_kintaro, engine_bullseye, engine_missing_number, engine_ship, engine_napoleon, legend_wuji, engine_radiance, engine_banner, plus uniqueness trackers engine_wildlife, engine_plenty (using array-based per-element state).
7. **Pattern 1/Pattern 2 unification:** F1.8.b absorbs F4.11. All accumulators now use uniform increment semantics via `incrementPerElement` helper; engines read via `aggregateNumericState` / `aggregateArrayLength`.

**Codebase changes (immediate):**

Initial F1.8.b ship:
- `RunManager.js`: ACCUMULATOR_SPIRIT_IDS, ACCUMULATOR_INIT, 5 helpers (aggregateNumericState, longestHeldValue, incrementPerElement, addUniqueToElements, aggregateArrayLength), 3 RunManager methods (_freshAccumulatorElement, _addAccumulatorElement, _aggregateElementsForNegative), unified _initSpiritState. All 4 creation paths (buySpirit, summonSpirit, _addPastLifeCopy, addSymbiontSpirit cascade) updated.
- `SpiritEffects.js`: 24 accumulator engines refactored to use aggregation + per-type scaling. All onCardSeen handlers use incrementPerElement.
- `GameRoundManager.js`: All Pattern 1 increment sites converted to incrementPerElement.
- `GameScene.js`: All accumulator tooltips show longest-held + aggregate.

Followup #1 — Scoring loop suppression:
- Initial ship missed the scoring loop's `count = effectivePower(spirit)` multiplier suppression for accumulators. Causing 2-stack Agriculture × 2 plains to produce aggregate 8 instead of 4 (each call bumped both elements). Fixed in three sites: onCardSeen main loop, onCardScored main loop, onCardScored retrigger loop. Used `ACCUMULATOR_SPIRIT_IDS.has(spirit.id) ? 1 : effectivePower(spirit)` gate. Also fixed prevState dirty-check to handle elements vs state.

Followup #2 — Sale path element sync:
- Initial ship + followup #1 missed that sale paths decrement stackCount but don't pop from elements array. Caused 2-stack→1-stack sale to retain both elements, aggregate stays at 10 instead of dropping to 8. Fixed across 6 sites: GameScene partial sell, drag merge (transfer elements between source/target), drag unstack (split elements to new entry preserving acquisition history), Cinnabar fusion, Mercury defusion, Pearl fusion. All paths now correctly sync elements array.

**Verification (2026-05-07):**
- F1.8.b-1: 2-stack Agriculture acquisition shows elements `[{6}, {0}]`, no inheritance ✓
- F1.8.b-2: 2-stack scoring 2 plains produces `[{8}, {2}]`, aggregate 10, tooltip "Plains scored: 8 → +10 mult" ✓
- F1.8.b-3: Sale of newer element produces `[{8}]`, aggregate 8, tooltip "Plains scored: 8 → +8 mult" ✓ (the original failing scenario)
- Build green; entire codebase consistent on per-element model.

**Open follow-ups:**

- F1.8.c (UI roster correctness) — render distinct entries for negatives bundled with regulars. Awaits ship.
- D0.24 (Past Life redesign) — atop F1.8.b's clean per-element foundation. Drafts ready.
- F1.8.b-4 through F1.8.b-8 (cascading transcendence aggregation, uniqueness trackers, no-regression checks) — opportunistic playtest verification.

---

## F1.8.c — GameScene spirit column re-render after consumable use/sell

**Status:** RESOLVED (shipped 2026-05-07; pending in-game spot-check verification of immediate visual update)

**Question:** During F1.8.b verification, Cat zodiac summons triggered cascading transcendence correctly at the data layer but the spirit fan in GameScene displayed stale state — phantom 3-stack regular persisted visually until a card capture triggered re-render. Originally framed as "UI roster bundling bug" from earlier playtest, but investigation revealed the actual issue was a missing `_renderSpiritColumn()` call after consumable execution.

**Decisions:**

1. **Original F1.8.c scope (UI bundling) was already resolved** by F1.8.a + F1.8.b's data model cleanup. The render code in `_renderSpiritColumn` iterates `_allSpirits` directly (no `groupBy(id)`), so distinct spirit objects always render as distinct cards.

2. **Actual bug:** GameScene's consumable callback re-rendered consumables, action buttons, and info texts — but NOT the spirit column. Mutations via Cat, Cinnabar, Mercury, Pearl, etc., updated `_allSpirits` correctly but the visible fan stayed stale.

3. **Fix:** Added `this._renderSpiritColumn()` call to three sites in GameScene.js:
   - Main consumable use callback (action-button "Use" path)
   - Action-button consumable sell
   - Expansion-overlay consumable sell

4. **Card-target completion path** already calls `_renderAll()` which includes spirit-column re-render. No change needed there.

5. **ShopScene** already worked correctly (verified via earlier shop-purchase Pollen testing); no change needed.

**Codebase changes (immediate):**

- `GameScene.js`: 3 sites with `_renderSpiritColumn()` added after consumable mutation. Build green.

**Verification (2026-05-07):**

- Pre-fix verified bug: Cat zodiac summon to 3-stack Pollen → console shows correct cascading transcendence to 1 negative powerLevel=3, but fan visually shows phantom 3-stack until next capture re-renders ✓
- Post-fix expected: same Cat summon → fan immediately shows the negative, no capture trigger needed.
- In-game spot-checks pending for full verification (F1.8.c-1 through F1.8.c-7).

**Open follow-ups:**

- D0.24 (Past Life redesign) — final architectural item before Phase 0 closes.

---

## F1.8.c followup — _renderSpiritColumn must clear stale Phaser objects

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** After F1.8.c added `_renderSpiritColumn()` to consumable-use callbacks, running the consumable callback twice in succession (e.g., two Cat zodiac uses) left a phantom card visible between the two real cards. The phantom disappeared on next capture-triggered render.

**Decision:** `_renderSpiritColumn()` was resetting tracking arrays at start (`_spiritCardObjs = []`, `_spiritStackBadges = {}`, `_spiritFanPositions = null`) but NOT calling `_clearObjs(this._spiritObjs)` to destroy the previously-created Phaser display objects. Old visuals lingered on the scene's display list with no references. `_renderAll()` worked around this by clearing `_spiritObjs` before invoking `_renderSpiritColumn()`, but direct calls (post-consumable) didn't clear.

**Fix:** Added `this._clearObjs(this._spiritObjs)` at the start of `_renderSpiritColumn()`, before the tracking-array resets. Method now self-contained and safe to call directly.

**Codebase changes (immediate):**
- `GameScene.js`: 1 line added at start of `_renderSpiritColumn`. Build green.

**Verification (2026-05-07):**
- Two consecutive Cat zodiac uses produce clean 1 negative + 1 regular = 2 distinct cards immediately, no phantom card layered between them. F1.8.c-1, F1.8.c-2, F1.8.c-3 all verified.

**Open follow-ups:**
- None for F1.8.c. Architectural foundation complete.
- D0.24 (Past Life redesign) is the final architectural item before Phase 0 closes.

---

## D0.24 — Past Life redesign

**Status:** RESOLVED, SHIPPED 2026-05-07; pending playtest verification.

**Question:** Past Life had 4 issues: (1) no holding period, allowing same-round buy/sell exploit; (2) couldn't target negatives (filter excluded them); (3) whole-stack acquisition tracking — couldn't tell which copies were "matured"; (4) failed silently on negative-only rosters.

**Decisions:**

1. **3-round holding period** before sale-trigger activates. Soft trigger (Option B): ki collected normally on early sale; only the copy effect is gated.
2. **Negatives ARE eligible targets.** Past Life can copy any spirit in the loadout except itself.
3. **Per-element acquisition tracking** via F1.8.b's accumulator model. Each Past Life element has its own `acquiredRound`. Activation rule: `currentRound - element.acquiredRound >= 3`.
4. **Power = activated count.** ONE copy fires per sale, scaled by the count of matured elements. 3-stack PL with 2 matured + 1 unripe → 1 copy at power 2. Partial-maturity stacks reward waiting.
5. **Copy effect by target type:**
   - Regular target: N stack iterations (may cascade-transcend if pushes existing over 4)
   - Negative target: fresh negative at `powerLevel: N`
6. **Sale-only trigger:** drag-merge, drag-unstack, and fusion paths preserve element `acquiredRound` (transfer/split) but don't fire the trigger.
7. **`forcePastLifeTarget(spiritId)` debug hook** mirrors `forceCatTarget` pattern for deterministic playtest.

**Codebase changes:**

- `RunManager.js`: 
  - `util_past_life` added to `ACCUMULATOR_SPIRIT_IDS` and `ACCUMULATOR_INIT` (no state keys; just `acquiredRound`)
  - `releaseSpirit` simplified — Past Life trigger logic moved out
  - New `_firePastLifeCopy(powerLevel)` with target filter `s.id !== 'util_past_life'`, supports forced-target debug hook with one-shot reset
  - Rewrote `_addPastLifeCopy(target, powerLevel)`:
    - Regular targets: N iterations of stacking + cascading transcendence
    - Negative targets: fresh negative push at `{stackCount: 1, isNegative: true, powerLevel: N, state: null}`
  - Added `forcePastLifeTarget(spiritId)` method + `_forcedPastLifeTarget` field reset in constructor
- `GameScene.js`:
  - Sell path: counts matured elements via `run.round - el.acquiredRound >= 3` BEFORE pop, fires `_firePastLifeCopy(activatedCount)` AFTER sale completes
  - Tooltip: shows "Activated: N/M (3-round hold each)" + "On sale: copies 1 random spirit at power N" (or "no copy effect yet" if N=0)

**Verification (pending playtest):**

D0.24-1 through D0.24-8 in TESTING_NOTES_V2.md. Build green.

**Open follow-ups:**

- F3.14 (Past Life visual indicator) — card-level border/glow change indicating activation status. Tracked in OVERHAUL_PLAN Phase 3, deferred from Phase 0 scope.

---

## D0.25 (proposed) — Cuckoo Egg per-element hatch tracking redesign

**Status:** OPEN, deferred from F1.8.b followup #3 verification 2026-05-07

**Question:** Cuckoo Egg currently uses singleton `state: { roundsRemaining: N }` per spirit object. When stacked, all elements share the same countdown — they hatch together regardless of when each was acquired. This breaks the per-acquisition mental model that F1.8.b's accumulator pattern enforces for similar mechanics (Past Life D0.24, Agriculture, Ants, etc.).

**Verified behavior (2026-05-07):**
- Spawned 3-stack Cuckoo Egg.
- Spawned another 3-stack on top (cascading transcendence to negative + 2-stack remainder).
- Negative + 2-stack regular both show "1 round til hatching" — all elements share the negative's aggregated countdown, ignoring the second 3-stack's later acquisition.

**Additional verified bug:** Stacked Cuckoo Eggs only summon ONE Moon on hatch, regardless of stack power. Likely same root cause: hatch fires once on the singleton state rather than once per matured element.

**Decision direction (TBD):**

1. Add `sym_cuckoo_egg` to `ACCUMULATOR_SPIRIT_IDS` with per-element `roundsRemaining` (each element counts down independently).
2. Hatch trigger fires per matured element. 3-stack with all elements at 0 → 3 simultaneous hatches → 3 different Tier 2 spirits.
3. Mixed maturity: 2-stack with 1 element at 0 and 1 element at 1 → 1 element hatches into Tier 2 spirit + 1 element remains as Cuckoo Egg incubating.
4. Negative semantics: the negative uses singleton state (longest-held element's roundsRemaining at transcendence? or its own clock?). Open question.

**Effort:** ~3-5 hours (similar to D0.24's complexity; integrate into F1.8.b accumulator pattern, redesign hatch logic, add per-element tooltip status, verify edge cases).

**Cross-references:**
- D0.24 (Past Life redesign): same per-element acquisition pattern; Past Life triggers on sale, Cuckoo Egg triggers on countdown reaching zero.
- F1.8.b accumulator pattern: foundation enabling this redesign.

**Phase placement:** Should ship in Phase 1 cleanup since it's an architectural inconsistency with D0.24's pattern, not a Phase 5 polish item. Estimated ~3-5h.

---

## Notes from F1.8.b followup #3 verification (2026-05-07)

**Osprey tooltip cumulative power display:** When regulars + negatives coexist, Osprey's deck-flip cap shows cumulative `effectivePower` (e.g., 2-stack regular + powerLevel=3 negative shows "3/5 used"). Internally consistent, but visually ambiguous — players may not understand the "5" combines regular and negative power. Not a behavioral bug. UI design question for Phase 3:
- Option A: keep cumulative display "3/5" (current)
- Option B: split display "regular: 2/2, negative: 1/3"
- Option C: show only stack power on the spirit being hovered (regular hover shows "X/regularStackCount", negative hover shows "X/powerLevel")

Tracked as future UI design question; not blocking.

**Symbiosis + Cuckoo Egg spirit count collision:** During verification, observed that aggressive Symbiosis stacking (3-stack producing 3 symbionts per capture) combined with Cuckoo Egg hatch (summoning Tier 2 fusion spirits) appeared to temporarily exceed spirit slot capacity. May be:
- Race condition in spirit-add ordering
- Missing `canAddSpirit` check in one of the paths (Symbiosis cascade vs Cuckoo Egg hatch)
- Display lag between data mutation and slot count refresh

Worth investigating during D0.25 (Cuckoo Egg redesign). The hatch path needs explicit slot-check before transforming the egg, since the resulting Tier 2 spirit consumes a fresh slot.

Cross-reference: D0.25 Cuckoo Egg per-element hatch tracking redesign.

---

## F1.8.b followup #3 — Two regressions: stale `&& spirit.state` guards + mid-round summon snapshot

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** F1.8.b's first ship had two latent bugs that surfaced during D0.21 verification:
1. **Stale `&& spirit.state` guards** on accumulator increment sites in GameRoundManager.js. With F1.8.b's per-element model, accumulator regulars have `spirit.elements` instead of `spirit.state`, so guards failed and `incrementPerElement` never fired for regulars (negatives still worked since they retain `state` post-transcendence). Caused: Ants summoned via Symbiosis didn't increment `totalPlayed` across rounds.
2. **Mid-round summon snapshot.** GameRoundManager's `_spirits` array is initialized at round-start via `setSpirits([...run.spirits, ...])`. Mid-round mutations to `run._allSpirits` (Symbiosis cascade, Cat zodiac, Past Life copy) don't propagate to GRM, so newly-summoned spirits are invisible to effect logic. Caused: Osprey summoned mid-round intercepted deck flips endlessly because `flipsUsedThisRound` increments fired on the stale snapshot.

**Decisions:**

1. **Drop stale `&& spirit.state` guards** on all accumulator increment sites. `incrementPerElement` correctly dispatches to `spirit.elements` (regulars) or `spirit.state` (negatives), so the guard is unnecessary. Removed from 13 sites in GameRoundManager.js. Also caught one OLD-pattern badger site at line 855 still using `spirit.state.consumablesUsed +=` — migrated to `incrementPerElement`.
2. **Preserve `&& spirit.state` guards** on non-accumulator increment sites (sym_osprey, sym_cuckoo_egg, engine_northern_lion, decay_persimmon, decay_pear, util_irrigation, sym_ducks, sym_caterpillar) — these legitimately need state-presence checks since they don't go through `incrementPerElement`.
3. **Convert key `this._spirits` reads to `run.allSpirits` reads** in mid-round-affecting paths:
   - Osprey deck-flip intercept filter
   - Ants/Snails increment loops
   - Phase 1.5 retrigger spirit list
   - Phase 2 engine spirit application
   - Per-combo style ki chain
4. **Architectural cleanup deferred:** A more comprehensive fix where `this._spirits` becomes a live getter from `run.spirits` is preferred long-term but out of scope for Phase 0 closure. Tracked as Phase 1 cleanup if needed.

**Codebase changes:**
- `GameRoundManager.js`: 13 `&& spirit.state` guards removed; 1 OLD-pattern badger site migrated; 6 `this._spirits` → `run.allSpirits` conversions for accumulator iteration paths. Build green.

**Verification (2026-05-07):**
- Osprey summoned mid-round correctly increments `flipsUsedThisRound`, caps at 3 deck-flips for a 3-stack, then routes flip 4+ to field normally.
- Ants regression mostly resolved (see followup #4 for residual element-count bug).

---

## F1.8.b followup #4 — `_initSpiritElements` / `_initSpiritState` must create elements matching stackCount

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** After followup #3 fixed the increment guards, Ants STILL showed wrong scaling — 3-stack Symbiosis-summoned Ants gave +0.5 mult per card played instead of expected +1.5. Diagnosis revealed `_initSpiritElements` always created exactly ONE element regardless of `stackCount`. Same pattern in sister function `_initSpiritState`.

**Verified bug:** 3-stack Ants after 12 card plays:
```js
{ stackCount: 3, elements: [{ totalPlayed: 12, acquiredRound: 4 }] }
```
Should have been 3 elements each at totalPlayed=12, aggregate 36, mult +18. Instead: 1 element × totalPlayed=12 × 0.5 = +6 mult.

**Decisions:**

1. **Fix both `_initSpiritState` and `_initSpiritElements`** to create `stackCount` elements when initializing accumulator spirits.
2. **Preserve defensive `if (!spirit.elements)` guard** so re-init doesn't overwrite existing elements.

**Codebase changes:**
- `RunManager.js`: both `_initSpiritState` and `_initSpiritElements` updated. Build green.

**Affected creation paths:**
- Symbiosis multi-stack summon (the directly-verified bug) — Ants, Snails, Algae, Badger, etc.
- Any other path that creates a spirit with `stackCount > 1` via these init functions.
- Single-stack paths (shop buy, Cat zodiac) work correctly already (1 stack = 1 element).
- Past Life regular target copy (loops `_addAccumulatorElement` per iteration) works correctly already.

**Verification (2026-05-07):**
- 3-stack Ants Symbiosis-summoned: 2 cards played → +3.0 mult (3 elements × 2 each = aggregate 6 × 0.5 = 3.0 mult) ✓
- Sold 1 copy, 2-stack remaining: 2 cards played → +2.0 mult (correct per-card delta of +1.0 for 2-stack) ✓
- Confirms canonical scaling: 1-stack → +0.5/card, 2-stack → +1.0/card, 3-stack → +1.5/card. Linear with effectivePower.

**Open follow-ups:**
- Other multi-stack accumulators (Snails, Algae, etc.) likely now scale correctly too — opportunistic verification during play.
- D0.25 (Cuckoo Egg per-element redesign) deferred for separate work.

---

## D0.26 (proposed) — Algae increment fixes (self-count exclusion + summon-failure guard)

**Status:** OPEN, deferred from F1.8.b followup #5 verification 2026-05-07. Combines two related bugs at the same call site (originally D0.19-1 + D0.26 self-count).

**Question:** Algae's increment site has two distinct bugs:

1. **Self-count (newly observed 2026-05-07):** When Algae itself is summoned by Symbiosis, the summon event increments Algae's own counter. Algae starts with `summonCount = stackCount` instead of 0, treating its own creation as the first symbiont summoned.

2. **Summon-failure guard missing (D0.19-1, originally framed as a fix that didn't land):** When a symbiosis summon fails (e.g., spirit slots full), Algae STILL increments its counter. The increment doesn't gate on `result.success`, so failed summons inflate Algae's count.

Both bugs surface because the increment fires on every Symbiosis-trigger event without filtering for (a) whether the summoned spirit IS Algae itself, or (b) whether the summon actually succeeded.

**Verified behavior (2026-05-07):**
- 3-stack Algae summoned via Symbiosis begins with `summonCount = 3` (self-count).
- Filling spirit slots and triggering further symbiont-summoning matches still increments Algae's counter despite slot-cap failure (D0.19-1).

**Fix direction:** The increment site (`for (const spirit of run.allSpirits) { if (spirit.id === 'sym_algae') incrementPerElement(...) }` in GameRoundManager.js around symbiosis-summon completion) needs two guards:

```js
if (spirit.id === 'sym_algae' &&
    summonedDef.id !== 'sym_algae' &&  // exclude self-count
    result.success) {                   // exclude failed summons
  incrementPerElement(spirit, 'summonCount', symbiosisStacks);
}
```

**Effort:** ~30 minutes (one site, two conditions).

**Cross-references:**
- D0.21-3 (Algae stack scaling) — verified post-fix; self-count and failure-guard are independent of the stack-scaling math.
- D0.19-1 originally framed as standalone fix; merged into D0.26 since both touch the same line.

**Phase placement:** Phase 1 cleanup. Should ship alongside D0.25 (Cuckoo Egg redesign) since both are accumulator-related bugs that surfaced during F1.8.b verification.

---

## F1.8.b followup #5 — addSymbiontSpirit per-stack iterative cascade

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** Pre-fix `addSymbiontSpirit` used a `pendingStacks -= 4` batch-peel loop that aggregated existing elements into negatives WITHOUT consuming them from the elements array, AND without adding fresh elements for incoming stacks. Result: post-transcendence regular had `stackCount=N` but `elements.length != N`, causing double-counting of accumulated state.

**Verified bug:** 2-stack Ants at 12 cards played each + 3-stack Symbiosis summon → 1 negative + 1 regular. Regular showed `stackCount=1` but `elements.length=2`, aggregate=24 → mult +12 (should have been 1 element at 0, mult +0).

**Decisions:**
1. Rewrote `addSymbiontSpirit` to iterate one stack at a time, calling `_addAccumulatorElement` for each fresh element and checking transcendence at exact stackCount=4 boundary.
2. Mirrors `_addPastLifeCopy`'s loop pattern for architectural consistency.
3. Multi-cascade scenarios (large stackCount param) handled naturally by the loop.

**Codebase changes:**
- `RunManager.js`: `addSymbiontSpirit` rewritten as per-stack iterative loop. Build green.

**Verification (2026-05-07):**
- 3-stack Ants at totalPlayed=3 each, 3-stack Symbiosis summon → 1 negative + 1 fresh 2-stack regular. Regular `stackCount=2, elements.length=2, aggregate=0`. ✓

---

## F1.8.b followup #6 — _aggregateElementsForNegative uses longest-held instead of sum

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** `_aggregateElementsForNegative` SUMMED numeric element values into the negative's state. Combined with the engine's `state × 0.5 × powerLevel` output, this double-counted stackCount: once via the sum (which encodes per-element stack count), once via powerLevel.

**Verified bug:** 3-stack Ants with each element at totalPlayed=3 transcending → negative state.totalPlayed=9 (sum), engine output 9 × 0.5 × 3 = +13.5 mult. Should have been state.totalPlayed=3 (longest-held), engine output 3 × 0.5 × 3 = +4.5 mult — preserving the pre-transcend regular's mult contribution.

**Decisions:**
1. Numeric keys in `_aggregateElementsForNegative` use `Math.max(0, ...elements.map(el => el[key] ?? 0))` (longest-held) instead of sum.
2. Array-union path for uniqueness trackers (seenAnimals, seenPlains) preserved — set cardinality logic doesn't double-count.
3. Result: negative's state represents the per-element value at transcend time. Engine's powerLevel multiplier provides the count multiplier at output.

**Design semantic:**
- Pre-transcend regular at +X mult → post-transcend negative at +X mult (preserved, no spike or drop).
- Subsequent card plays accumulate into negative's state at +1 per card. Engine output scales each card's contribution at powerLevel rate (3x for cascading-transcendence negatives).

**Codebase changes:**
- `RunManager.js`: `_aggregateElementsForNegative` numeric path uses Math.max. Build green.

**Verification (2026-05-07):**
- Ants 3-stack at totalPlayed=62 each, played 1 card during summon-capture (each element bumps to 63), transcend → negative state.totalPlayed=63, mult 94.5. ✓
- Remainder 2-stack regular at 0 cards, mult 0. ✓
- Algae same scenario verified correctly (with caveat that Algae self-counts on summon — separate bug logged as D0.26).

**Open follow-ups:**
- D0.26 (Algae self-count exclusion) — separate behavioral bug, not transcendence-related.
- F1.8.b chain CLOSED — all 6 followups landed and verified.

---

## Logger polish notes (2026-05-07, D0.22-1 verification)

**Two minor logger display issues observed during D0.22-1 verification:**

1. **Negative spirit stack label:** Logger displays "Algae (stack 3)" for a negative Algae at powerLevel=3 (rather than "stack 1" matching the underlying stackCount, or a more semantic label like "negative ×3"). The label uses `effectivePower` for differentiation, which is correct math but ambiguous UI — players seeing "Algae (stack 3): ×9.1" alongside "Algae (stack 2): ×5.2" might think they have a 3-stack regular and a 2-stack regular when they actually have 1 negative and 1 2-stack regular.

2. **Floating-point display:** Algae's mult contribution displayed as "×9.100000000000001" due to JS float representation of 0.1 multiplication. Cosmetic only; underlying math correct.

**Fix suggestion (Phase 3 polish):**
- Negatives logged as "Algae (negative ×3): ×9.1 mult"
- Round mult display to 2 decimal places: `mult.toFixed(2)`

**Tracked for Phase 3 logger polish (F3.10 or similar):** ~30 min UI tweak.

---

## D0.27 (proposed) — Ducks mult explosion bug

**Status:** OPEN, observed during F1.8.b-7 verification 2026-05-07

**Question:** Ducks's `multValue` exploded to 6-digit values during a recent playtest, indicating a runaway-multiplication bug. Specific trigger conditions unclear.

**Context:** Ducks is a non-accumulator with `state: { multValue: 1 }`. Engine output: `(spirit.state?.multValue ?? 1) × stacks`. The mult value should grow incrementally based on the spirit's intended mechanic.

**Investigation needed:**
1. Where does multValue update? Find the call site in GameRoundManager.js or SpiritEffects.js.
2. Is it being applied multiplicatively to itself in a loop (e.g., `multValue *= multValue`)?
3. Is it being incremented per scoring event when it should be per round-end?
4. Does it interact with spirit retriggers in a way that compounds across the chain?
5. Likely related: F1.8.a `effectivePower` change. If Ducks reads `effectivePower` somewhere as a multiplier and the negative form passes through with powerLevel=3, that could compound across captures.

**Verified behavior (2026-05-07):** During a playtest, Ducks's mult contribution reached 6 digits. Specific conditions not captured but likely involves multi-stack Ducks plus some compounding interaction.

**Fix direction:** Audit the Ducks update path. May need to redesign the mechanic if the current spec produces unbounded growth — Ducks's intended "+something multiplicatively per X" mechanic may have a cap or once-per-round semantic that's currently missing.

**Effort:** Investigation 1-2 hours; fix depends on findings.

**Cross-references:**
- F1.8.b-7 (non-accumulator regression) verification — Ducks flagged as broken-but-not-regression-from-F1.8.b. The bug likely predates F1.8.b.
- Phase 1 cleanup work alongside D0.25 (Cuckoo Egg) and D0.26 (Algae).

---

## D0.19-2 partial regression observed (2026-05-07)

**Status:** OBSERVED during F1.8.b-7 sweep. Was previously marked verified in earlier playtest.

**Question:** During F1.8.b-7 verification, encountered a case where 2 matching cards played to empty slot + Osprey-intercepted deck flip resulted in the pair remaining stuck on field instead of capturing via D0.19-2's fallback path. The fallback fix has worked in past tests but has gaps.

**Investigation needed:**
1. Reproduce the exact sequence — what was the state of the field, hand, and Osprey counter?
2. Is the fallback gated on some condition that fails in certain configurations (e.g., specific phase, specific intercepted card type, multi-play turn vs single-play)?
3. Was the deck flip intercepted by Osprey EARLIER in the same play sequence, and a subsequent flip was the one that should have triggered fallback?

**Cross-references:**
- D0.19-2 originally verified during F1.8.b followup #3 verification
- Worth catching this case in F1.8.b-7's broader non-accumulator audit

**Fix priority:** Phase 1 cleanup. Not an architectural blocker.

---

## F1.8.b followup #7 — Velocity T1 missing stack scaling

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** Velocity's T1 (Iron count) reads `run.getDeck().filter(...).length` as a deck-state snapshot, applies linear `× 0.1` scaling, then multiplies by `scaling` variable. The scaling was hardcoded to `1` for regulars and `powerLevel` for negatives, missing stackCount multiplication for regulars at multi-stack.

**Verified bug:** 3-stack Velocity with 7 iron cards showed ×1.7 mult, should have been ×3.1.

**Decisions:** Use `effectivePower(spirit)` (returns stackCount for regulars, powerLevel for negatives) for the scaling variable. Unifies regular/negative paths.

**Codebase changes:**
- `SpiritEffects.js` `engine_velocity.applyEngine`: scaling = effectivePower(spirit). Build green.

**Verification (2026-05-07):**
- 3-stack Velocity, 8 iron cards → ×3.4 mult in scoring log ✓ (1 + 8 × 0.1 × 3 = 3.4)
- Tooltip-vs-engine divergence revealed (handled in followup #8).

---

## F1.8.b followup #8 — Velocity tooltip + Garden engine missing stack scaling + sweep audit

**Status:** RESOLVED 2026-05-07; pending tooltip verification

**Question:** Two parallel bugs to followup #7:
1. **Velocity tooltip** retained old hardcoded `1` scaling for regulars (engine had been fixed in followup #7 but tooltip code path wasn't updated). Players saw ×1.7 in tooltip vs ×3.4 in engine output.
2. **Garden engine** had `applyEngine()` with no spirit parameter destructured, AND no stack scaling. 1-stack and 3-stack Garden produced identical output.

**Decisions:**
1. Velocity tooltip: change `sc = spirit.isNegative ? (spirit.powerLevel ?? 1) : 1` to `sc = effectivePower(spirit)` consistent with engine.
2. Garden engine: add `{ spirit }` param destructure, multiply output by `effectivePower(spirit)`.
3. **Sweep audit:** searched for all `applyEngine()` (no parameter) callsites in SpiritEffects.js. Zero remaining after Garden fix.
4. Wolf reviewed — already correct because its mechanic uses `onCardScored` (per-card scoring loop) rather than `applyEngine`. Non-accumulators get count multiplier from the scoring loop per F1.8.b followup #1's suppression rules — accumulators suppress, non-accumulators retain. So Wolf scales correctly via the existing loop count.

**Codebase changes:**
- `SpiritEffects.js`: `sym_garden.applyEngine` updated.
- `GameScene.js`: `engine_velocity` tooltip section updated.
- Sweep audit confirmed no other parameterless engine sites remain. Build green.

**Verification (2026-05-07):**
- Velocity tooltip pending in-game spot-check (should now match engine output ×3.4).
- Garden engine cannot be naturally tested until deck-mod hexagram redesign F5.4b unblocks Garden's source animals (Bear/Ladybugs/Fox speculative cards). Fix is architecturally correct; defer playtest verification.

**Open follow-ups:**
- F1.8.b chain CLOSED at followup #8. Eight followups landed total.
- D0.23-5 (Velocity scaling) verifies post-tooltip-check.

---

## F1.1 — Stack scaling unified fix

**Status:** RESOLVED 2026-05-07

**Question:** F1.1's original scope was to convert all spirit-presence checks to stack-count or effective-power scaling. Most of this work was actually completed implicitly by the F1.8 series (which converted engine spirit reads to use `aggregateNumericState` and `effectivePower` consistently). An audit at Phase 1 start identified only 3 remaining sites needing review.

**Audit findings:**

Searched RunManager.js, GameRoundManager.js, SpiritEffects.js for `.filter(...).length` and `.some(s => s.id === ...)` patterns.

**Already correct (no change needed):**
- `legend_feng_shui`: `run.spirits.filter(...).length` correctly counts entries (not powers) for the empty-slot calculation. Math: 1-stack with 6 empty slots = ×4.0, 3-stack same = ×10.0 (verified via design review).
- `legend_gankyil`: presence-only threshold check (3 vs 4) — stacking doesn't apply.
- Capstones (Yin-Yang, Universe, Nature): unique-only by design, presence checks are correct.

**Required fixes (shipped 2026-05-07):**

1. **Recycling: scale by stack count.** Two callsites in GameRoundManager.js (line 615 main play discard, line 1064 _handleFieldDiscard). Old: `if (this._spirits.some(s => s.id === 'econ_recycling')) run.addKi(5)`. New: `const recyclingStacks = run.countStackedById('econ_recycling'); if (recyclingStacks > 0) run.addKi(5 * recyclingStacks);`. Description updated in spirits.js.

2. **Catcher: redesigned Osprey-style.** Mechanic changed from binary (presence-only routes all discards to hand) to per-round counter (catches up to N discards per round, where N = effective power). New state: `catchesUsedThisRound: 0`. Reset at round start. Counter check in `_handleFieldDiscard`. Reads from `run.allSpirits` per F1.8.b followup #3 lessons. New tooltip line "Catches used: N/M this round". Description updated.

3. **State init in both `_initSpiritState` and `_initSpiritElements`** for `game_catcher` (per F1.8.b followup #4 dual-init pattern).

**Codebase changes:**
- `GameRoundManager.js`: Recycling stack scaling at 2 sites; Catcher Osprey-style counter at `_handleFieldDiscard`; Catcher round-start reset alongside Osprey.
- `RunManager.js`: Catcher state init in both `_initSpiritState` and `_initSpiritElements`.
- `GameScene.js`: Catcher tooltip mirroring Osprey pattern.
- `spirits.js`: Recycling and Catcher descriptions updated.

**Design doc impact (F4.14):**
- Recycling description: "Gain +5 ki per stack whenever a card is discarded due to a full field."
- Catcher description: "Catches up to N cards per round (N = stack count). Caught cards return to hand instead of being lost."

**Verification:**
- Build green.
- Behavioral verification opportunistic during natural play.

**Open follow-ups:**
- None for F1.1.
- F1.7 next (semantic addKi reasons).

---

## F1.7 — Semantic addKi reasons

**Status:** RESOLVED 2026-05-07

**Question:** `addKi(amount, reason = 'unspecified')` already had a reason parameter, but ~15 callsites passed no reason, producing uninformative `[KI] +N (unspecified)` log entries. F1.7 annotates all callsites with meaningful reason strings to make the ki transaction log a useful debug tool.

**Decisions:**

Annotated 14 callsites across 3 files with concrete reason strings:

**GameRoundManager.js (10 sites):**
- `recycling_overflow` (2 sites — main play discard, _handleFieldDiscard)
- `stamp_green_discard`
- `goat_capture` (2 sites — disableCaptureScoring path, normal scoring path)
- `meteorite_jackpot`
- `stamp_yellow_capture`, `stamp_orange_capture`, `stamp_black_capture`
- `reward_push`

**ConsumableEffects.js (2 sites):**
- `dragon_lottery`
- `pig_zodiac`

**GameScene.js (2 sites):**
- `round_end_reward` (run-over and threshold-passed branches)

**Already-annotated (no change):**
- Sale refund reasons (template literals with spirit name)
- Style combo reason (template literal with combo name)

**Codebase changes:**
- 14 callsite annotations across `GameRoundManager.js`, `ConsumableEffects.js`, `GameScene.js`. Build green.

**Verification:**
- Passive — `[KI]` log entries should show meaningful reasons during gameplay instead of `(unspecified)`. If `(unspecified)` keeps appearing, a callsite was missed (likely buried in hexagram or other indirect ki paths).

**Open follow-ups:**
- D0.27 (Ducks investigation) benefits from F1.7's logging.
- F3.9 (round-end ki breakdown UI) will further decompose `round_end_reward` into base + cards + style + per-yaku + per-push + surplus + mid-round at display time. F1.7 stops at attribution; F3.9 handles decomposition.

---

## D0.26 — Algae self-count exclusion + summon-failure guard

**Status:** RESOLVED 2026-05-07 (verification opportunistic during natural play)

**Question:** Two bugs at the same Algae increment site in GameRoundManager.js's symbiosis-summon handler:

1. **Self-count:** When Algae itself is summoned by Symbiosis, the just-summoned Algae copies counted their own summon event. A 3-stack Algae summoned via Symbiosis began with `summonCount = stackCount` instead of 0.

2. **Summon-failure guard missing (D0.19-1):** `addSymbiontSpirit` can return `{success: true, result: 'failed'}` when slots are full and no negatives were created. The existing `if (result.success)` guard passed despite no actual summon occurring. Algae still incremented.

**Important nuance on self-count:** If existing Algae copies are present when a NEW Algae is summoned, the existing copies SHOULD count the new arrival. Only the just-summoned Algae should not self-count. The fix needs to be surgical — distinguish pre-existing from just-arrived rather than blanket-skip Algae's increment entirely.

**Decisions:**

1. Capture `algaeBefore` Set of existing Algae references BEFORE calling `addSymbiontSpirit`.
2. Post-summon, only increment Algae copies still in `run.allSpirits` AND in the `algaeBefore` Set. This correctly handles:
   - Pre-existing Algae counts new arrivals (including new Algae arrivals)
   - Just-summoned Algae doesn't self-count (not in pre-summon Set)
   - Cascade negatives don't double-count (newly created, not in Set; inherited summonCount via `_aggregateElementsForNegative`)
   - Algae regulars transcended during cascade (still in Set but no longer in `run.allSpirits`) naturally excluded by filter
3. Add `result.result !== 'failed'` guard to suppress increment on hard failures.
4. Switch iteration source from `[...run.spirits, ...run.negativeSpirits]` to `run.allSpirits` per F1.8.b followup #3 (live read convention).

**Codebase changes:**
- `GameRoundManager.js` Algae increment site: Set-based pre-summon snapshot, surgical filter, additional failure guard, live-read iteration. Build green.

**Verification (opportunistic):**
- Self-count, existing-counts-new, and summon-failure scenarios deferred to natural playtest opportunities.

**Cross-references:**
- D0.19-1 (original Algae increment guard) — folded into D0.26.
- F1.8.b followup #3 — `run.allSpirits` live read pattern.
- F1.8.b followup #5 — iterative cascade in `addSymbiontSpirit`.

**Design doc impact (F4.14):**
- No player-facing description change needed. Internal correctness fix.

---

## F1.8.b followup #9 — Accumulator transcendence preservation formula + Algae pre-summon reorder

**Status:** RESOLVED 2026-05-07 (verification opportunistic during natural play)

**Question:** Two related issues surfaced during D0.26 verification:

1. **Aggregator formula (universal):** `_aggregateElementsForNegative` used `Math.max` to pick longest-held element value at transcendence. This worked for equal-element cases (typical for non-Algae accumulators where all elements accumulate in lockstep) but produced overshoot for staggered acquisition (Algae via Symbiosis re-summons creates elements with different ages and accumulated values). Verified bug: 3-stack Algae with elements `[{11},{6},{1}]` (engine ×2.8) transcended to negative with `state=11` (engine ×4.3) instead of preserving pre-transcend mult.

2. **Algae increment timing (Algae-specific):** D0.26's pre-existing-element increment fired AFTER `addSymbiontSpirit`. When transcendence occurred INSIDE addSymbiontSpirit, the regular was removed before D0.26's increment could land. The witnessing event (Algae observing the new symbiont's arrival) was not captured into elements that aggregated into the negative.

**Design intent (Behavior C):** Negative preserves the **momentary would-be 4-stack regular's** engine contribution. Pre-existing Algae elements DO count the new arrival (per D0.26's intent), and at the moment of transcend, the aggregation reflects this witnessing.

**Decisions:**

1. **Aggregator formula change (RunManager.js `_aggregateElementsForNegative`):** Replace `Math.max(0, ...elements.map(e => e[key]))` with `Math.floor(aggregate / powerLevel)`. Add `powerLevel = 3` parameter (default for legacy/safety; all callers now pass explicit values). For equal-element cases, new formula matches old Math.max result. For staggered, correctly averages contributions to preserve pre-transcend mult.

2. **All callers updated:** Four call sites in RunManager.js updated to pass appropriate powerLevel:
   - `addSymbiontSpirit` peel-4 cascade (line ~534): pass `3` literal
   - Buy-path transcend (line ~420): pass `existing.stackCount - 1` (matches negative's powerLevel assignment)
   - `summonSpirit` Cat-zodiac transcend (line ~643): pass `existing.stackCount - 1`
   - `_addPastLifeCopy` transcend (line ~739): pass `existing.stackCount - 1`

3. **Algae increment reorder (GameRoundManager.js symbiosis-summon handler):** Pre-existing Algae elements now increment BEFORE `addSymbiontSpirit` fires. The `result.success && result.result !== 'failed'` guard is removed since the increment is no longer gated on success — the witnessing event still happens from Algae's perspective even if the new symbiont can't be added (slot exhaustion). Reorder is Algae-specific; other accumulators (Ants, Snails, etc.) increment via separate per-event handlers (card plays, captures) that are unaffected.

**Codebase changes:**
- `RunManager.js` `_aggregateElementsForNegative`: signature `(spirit, powerLevel = 3)`, formula `Math.floor(aggregate / powerLevel)`. 4 caller updates with appropriate powerLevel.
- `GameRoundManager.js` symbiosis-summon handler: increment loop relocated to fire before `addSymbiontSpirit`. Success/failure guard removed.
- Build green.

**Verification scenarios:**

- **Algae 3-stack staggered transcend (the failing case):** Pre-summon `[{11},{6},{1}]` engine ×2.8. 4th Algae arrives → pre-increment `[{12},{7},{2}]` → addSymbiontSpirit pushes fresh → `[{12},{7},{2},{0}]` → transcend → aggregate=21, state=21/3=7. Negative engine `1 + 7 × 0.1 × 3 = ×3.1`. Preserves the would-be 4-stack mult.

- **Ants 3-stack equal transcend (regression check):** 3-stack at `[{3},{3},{3}]` engine ×4.5. Play 1 card → `[{4},{4},{4}]` engine ×6.0. 4th Ants source via Symbiosis → addSymbiontSpirit pushes fresh → `[{4},{4},{4},{0}]` → transcend → aggregate=12, state=12/3=4. Negative engine `4 × 0.5 × 3 = ×6.0`. Preserves pre-transcend mult.

- **Non-transcend Algae cases (regression):** Same end-state as before. The reorder doesn't change the outcome for non-transcend cases — increment happens, summon happens, both done by end of handler.

**Cross-references:**
- F1.8.b followup #6 (Math.max longest-held) — SUPERSEDED. The longest-held design only worked for equal elements; preservation formula generalizes correctly.
- D0.26 (Algae self-count + summon-failure guard) — increment site reordered. End state for non-transcend cases unchanged.
- All 25 accumulator spirits affected by the aggregator change. For non-staggered cases (typical for spirits with per-event accumulation), no observable change in transcendence math.

**Design doc impact (F4.14):**
- Negative transcendence semantics now formally documented as "preservation of pre-transcend regular mult contribution." Update SPIRIT_ROSTER_V5.md to reflect this if it describes transcendence.

---

## F1.8.b followup #10 — Algae failed-summon increment rollback

**Status:** RESOLVED + VERIFIED 2026-05-07

**Question:** F1.8.b followup #9's reorder (D0.26 pre-increment before `addSymbiontSpirit`) dropped the `result.result !== 'failed'` guard since the increment was no longer gated on success. This introduced a regression: when summons fail (slots full + no negatives created), Algae's pre-existing elements still incremented, counting attempts that didn't actually result in a new symbiont arrival.

**Decisions:** Add post-hoc rollback after `addSymbiontSpirit`. If the result indicates hard failure, decrement the pre-increment on surviving Algae references. Transcended-away references are skipped (their state was set by aggregation in addSymbiontSpirit; the rollback doesn't apply since the pre-increment was correctly captured into the negative's state).

`Math.max(0, ...)` guards against potential underflow on rollback (defensive — shouldn't happen but cheap to guarantee).

**Codebase changes:**
- `GameRoundManager.js` symbiosis-summon handler: post-summon rollback block added.

**Verification (2026-05-07):**
- Failed-summon case: full spirit slots + Symbiosis trigger → Algae's summonCount unchanged ✓
- Successful-summon case: regression check, no change ✓
- Transcend-during-summon case: rollback skipped (transcendence is success, not failure) ✓

**Open follow-ups:**
- D0.26 cleanly closed.
- Two known imperfections deferred to F2.5 (Negative accumulator state semantics review): floor truncation at transcend boundary, and aggregation-vs-count semantic mismatch.

---

## D0.27 — Ducks mechanic redesign

**Status:** RESOLVED 2026-05-07 (verification opportunistic during natural play)

**Question:** Ducks's previous mechanic used exponential growth (×2 on pair capture, ÷2 on strand) with no hard cap. Combined with the scoring loop's `r.addMult × count` multiplication and Yin-Yang's `_yinYangTriggers` loop, this produced runaway 6-digit mult values during playtest.

Three layers of multiplication:
1. multValue grew exponentially (no ceiling on doublings)
2. Engine emitted `addMult: multValue × effectivePower`, then scoring loop multiplied by `count` (cards in capture)
3. Yin-Yang capstone fires the engine multiple times per capture

For 3-stack Ducks at multValue=1024 (10 doublings) with Yin-Yang active and 2-card capture: per-capture contribution = `1024 × 3 × 2 × 2 (yy) = +12,288 mult`. Beyond 13-14 successful pair captures, total mult easily reaches 6 digits.

**Design intent:** Ducks's mechanic should preserve the "tug of war" between doublings and halvings (pair capture / strand are both rare events in the base deck), but bounded.

**Decisions:**

1. **Switch to additive growth:** `multValue += 1` on pair capture, `multValue -= 1` on strand (floor at 0). State initializes at 0.

2. **Switch engine emission to multiplyMult:** Engine emits `multiplyMult: 1 + multValue × 0.1 × stacks` instead of `addMult: multValue × stacks`. This avoids the scoring loop's per-card multiplication entirely.

3. **Rationale for multiplyMult choice:** Ducks's mechanic isn't per-card; it's "flat current state, scaled by stacks." Emitting `addMult` causes spurious `× count` scaling in the scoring loop. `multiplyMult` is the correct semantic for flat-bonus spirits.

**Math reference:**
| Net pair captures | multValue | 1-stack engine | 3-stack engine |
|---:|---:|---:|---:|
| 0 | 0 | ×1.0 | ×1.0 |
| 5 | 5 | ×1.5 | ×2.5 |
| 10 | 10 | ×2.0 | ×4.0 |
| 20 | 20 | ×3.0 | ×7.0 |
| 50 | 50 | ×6.0 | ×16.0 |

Linear, predictable, bounded by player skill (pair captures are rare; strands offset).

**Codebase changes:**
- `RunManager.js`: state init `multValue: 0` (was 1)
- `SpiritEffects.js`: engine emits `multiplyMult: 1 + v × 0.1 × stacks` (was `addMult: v × stacks`)
- `GameRoundManager.js`: pair-capture trigger increments by 1 (was ×2), strand trigger decrements by 1 (was ÷2)
- `GameScene.js`: tooltip shows "Net pair captures: N → ×M.MM mult"
- `spirits.js`: description updated to reflect additive mechanic and multiplyMult formula
- Build green.

**Verification:**
- Opportunistic during natural play with Ducks acquired.
- Linear growth verified mathematically. Scoring loop interaction verified by switching to multiplyMult (sidesteps per-card multiplication).

**Open follow-ups:**
- None for D0.27.
- Broader architectural question of "should non-accumulator addMult emissions be multiplied by count?" tracked for potential future audit. Wolf intentionally uses `addMult × count` for per-card semantics; Ducks now uses multiplyMult for flat semantics. Other non-accumulators TBD.

**Design doc impact (F4.14):**
- Ducks's description: "+1 per deck-flip pair capture, -1 per strand (floor 0). Engine: ×(1 + net × 0.1 × stacks)."
- Update SPIRIT_ROSTER_V5.md when reconciling design docs.

---

## D0.27 followup — Ducks trigger scoping + engine math correction

**Status:** RESOLVED 2026-05-07 (verification opportunistic)

**Question:** Two issues from D0.27 verification:

1. **Trigger scope too broad:** D0.27's increment check fired on any `_inDeckPhase && cards.length === 2` capture in `_addCapture`. This matched play-phase pair captures AND the Fix E path (2 hand cards played to empty slot, deck-flip doesn't match → 2 played cards capture each other). Neither is the intended trigger.

2. **Engine math factor:** D0.27 used `× 0.1` smoothing factor without explicit design call. Per design intent, the increment should be `× 0.2` per event (thematic "Pair" doubling factor, scaled per stack).

**Decisions:**

1. **Increment trigger narrowed to Fix D only.** Removed from `_addCapture`, added inline at the Fix D path (1 hand card played to empty slot + deck-flip matches). The decrement remains at the strand site (already correctly scoped).

2. **Engine math factor changed to ×0.2.** Engine formula: `multiplyMult: 1 + v × 0.2 × stacks`. Math table:

| Net | 1-stack | 3-stack |
|---:|---:|---:|
| 0 | ×1.0 (null) | ×1.0 (null) |
| 1 | ×1.2 | ×1.6 |
| 2 | ×1.4 | ×2.2 |
| 3 | ×1.6 | ×2.8 |
| 5 | ×2.0 | ×4.0 |
| 10 | ×3.0 | ×7.0 |

Strong at high stacks but bounded — comparable to Velocity/Lincoln at similar accumulation. Trigger rarity (precise scenario of 1 played card + matching deck-flip) keeps the mechanic from over-firing.

**Codebase changes:**
- `SpiritEffects.js`: engine math `× 0.1 → × 0.2`
- `GameRoundManager.js`: removed broad-scoped increment block from `_addCapture`, added narrow-scoped increment at Fix D path
- `GameScene.js`: tooltip math `× 0.2`, label "Net deck-flip matches"
- `spirits.js`: description with precise trigger conditions and corrected formula
- Build green.

**Verification (opportunistic):**
- Increment fires only when 1 played card to empty slot is matched by deck-flip
- Decrement fires only on 3-card strand lockup
- Other 2-card captures (play-phase pair, Fix E path) don't trigger

**Open follow-ups:**
- None for D0.27.

**Design doc impact (F4.14):**
- Ducks description: "+1 mult value when a deck-flip matches a single played card; -1 when a deck-flip creates a 3-card lockup (floor at 0). Engine: ×(1 + value × 0.2 × stacks)."
- Update SPIRIT_ROSTER_V5.md when reconciling design docs. Note: trigger conditions are very specific — capture this precisely for future balance work.

---

## D0.27 deferred — Ducks design needs playtest feedback

**Status:** SHIPPED but DEFERRED for design revisit (2026-05-07)

**Question:** Current Ducks implementation (additive +1/-1 multValue, multiplyMult emission with `× 0.2` factor, narrow-scoped trigger at Fix D + strand decrement) is shipped and builds clean. But trigger events are rare enough in natural play that verification has been difficult.

Robert has flagged that the rarity makes him reconsider whether the redesign to additive linear was the right call. Possible alternative directions:
- Revert to multiplicative halving/doubling but with hard cap (prevents runaway, preserves "exciting big swings" feel)
- Keep additive but switch from multiplyMult to addMult (different scaling shape)
- Keep current design but tune the `× 0.2` factor based on natural play observations

**Decisions:** Defer Ducks design revisit. The current ship is acceptable as a baseline — no runaway behavior, predictable scaling. The math is clean even if the trigger rarity makes it hard to feel during testing. Revisit when natural play has produced enough data to feel the actual game impact.

**Status logged for future revisit:**
- Track in F2.1 (Spirit corrections) or as a standalone design pass after Phase 1 completes
- Decision should be informed by 2-3 actual playthroughs with Ducks equipped, not theoretical design alone
- Specifically: is the mechanic "exciting" when triggers do fire? Does Ducks feel rewarding to acquire? Does it interact well with deck-flip-frequent hexagrams?

**Cross-references:**
- D0.27 original ship (this session): additive growth, multiplyMult emission
- D0.27 followup (this session): trigger scoping + math factor correction
- F2.1 (Spirit corrections) in Phase 2 — design revisit can happen there

---

## F1.2 — Unified shop pricing through getEffectiveCost

**Status:** RESOLVED 2026-05-07

**Question:** Pricing logic was split across two helpers (`run.getEffectiveCost` handling only dev mode, `ShrineScene._price` handling coupon + hex hook). Some callsites applied both, some only one. Refund kludge existed to retroactively apply coupon discount because the buy*() methods deducted full price.

**Decisions:**

1. **Unified ordering principle:** dev mode (free) → hex modifier (run-permanent) → coupon discount (player-acquired). Hex establishes the "true" price for the run; coupon discounts the true price.

2. **Single source of truth:** `run.getEffectiveCost(baseCost)` in RunManager.js implements all three concerns.

3. **Deletion targets:**
   - `ShrineScene._price` method (parallel implementation)
   - 3 refund kludge sites (spirit buy, zodiac buy, stamp apply)

4. **Sweep target:** all `this._price(...)` callsites in ShrineScene.js converted to `run.getEffectiveCost(...)`.

**Math example (ordering matters for non-multiplicative hex):**
- Base 100, hex +10 flat, coupon -15%: 100 → 110 → Math.ceil(110 × 0.85) = 94
- Pre-fix order would have produced 100 → 85 → 95 (slightly different)
- For pure-multiplicative hex+coupon combos, ordering is commutative so no numeric change

**Codebase changes:**
- `RunManager.js` `getEffectiveCost`: expanded from dev-only to dev+hex+coupon. `applyHook` already imported at top.
- `ShrineScene.js`: deleted `_price` method (12 lines). 9 callsites converted from `this._price(...)` to `run.getEffectiveCost(...)`. 3 refund kludges deleted. 1 double-application simplified.
- Build green.

**Verification (opportunistic):**
- Dev mode: all offerings 0 ki ✓ (build-confirmed; play-test opportunistic)
- Coupon (1/2/3 stacks): offerings show 85%/70%/55% of base ✓ (math-verified)
- Hex price modifier: applied first, coupon applied after ✓ (code-path verified)
- No refund kludge in log: spirit/zodiac/stamp purchases deduct exact displayed price, no `addKi` refund line

**Open follow-ups:**
- F1.4 (Coupon refund kludge consequence): SUBSUMED by F1.2. The kludge is removed. F1.4 becomes a no-op or pure verification.
- F1.3 (Three missing ki components) — next.

**Cross-references:**
- F1.1: `countStackedById` (in place, used here)
- F1.4: subsumed
- F1.7: addKi reasons unchanged for legitimate paths (sale refunds, style combos, etc.) — only refund kludge addKi calls removed

**Design doc impact (F4.14):**
- All shop prices respect: dev mode (free) → hex modifier (run-permanent adjustment) → coupon discount (player-acquired).
- Coupon discount caps at 45% (3 stacks × 15%).
- No more post-hoc refund pattern in any purchase path.

---

## F1.2 verification — Coupon purchases (2026-05-07)

Verified via playtest: 2-stack and 3-stack Coupon purchase behavior matches expected pricing (post-hex, post-coupon). No `[KI] +N` refund kludge lines appear in log. F1.2 functionally working.

Caveats noted:
- Test hexagram active was a price-modifier hex that also adds 2 consumable slots. Specific numeric verification needs a clean run without hex modifier to confirm baseline coupon math (1-stack 6→6, 2-stack 6→5, 3-stack 6→4).
- Reroll cost variability surfaced (see below).

## F1.7 followup — Reroll spend addKi missing reason (logged 2026-05-07)

Observed during F1.2 verification: reroll spends appear in GameplayLogger as `[KI] -N (unspecified) → balance`. F1.7's audit found 14 addKi callsites but apparently missed the reroll spend path.

**Fix scope:** Find the reroll spend callsite (likely in ShrineScene.js `_doReroll` or similar). Add a meaningful reason string like `'shop_reroll'`.

**Effort:** Trivial annotation. Worth bundling with other small F1.x cleanup or a F1.6 logger pass.

**Cross-references:** F1.7 (semantic addKi reasons).

## F2.x — Reroll cost non-monotonic across rerolls (logged 2026-05-07)

Observed during F1.2 verification: reroll costs varied non-monotonically across consecutive rerolls. Expected per `_rerollCost = applyHook('modifyRerollCost', baseCost, baseCost, this._rerollCount)` where `baseCost = 3 + this._rerollCount * 2` — should be strictly increasing.

Observed sequence: 63, 54, 56, 58, 59, 61. Includes a DROP from 63 → 54 between consecutive rerolls.

**Hypotheses:**
1. Active hex modifier's effect depends on shop state (e.g., total consumable slots in current offerings). Since offerings rotate per reroll, modifier value fluctuates.
2. `modifyRerollCost` hook is re-applied on top of an already-modified value somewhere, accumulating differently each call.
3. Some other state-dependent calculation injects variability.

**Investigation needed:** Examine `_doReroll` flow + `modifyRerollCost` hook implementation across active hexagrams. Determine why consecutive rerolls under same conditions can produce decreasing costs.

**Effort:** 1-2 hours investigation. Likely a small fix once root cause identified.

**Status:** Phase 2 candidate (system-level investigation). Not Phase 1 blocking.

---

## F1.3 — Three missing ki components: SUPERSEDED by design pivot

**Status:** SUPERSEDED 2026-05-07 (no work performed in Phase 1)

**Original spec:** Add three additive ki components to `calculateKiReward`:
- Per-yaku ki (+5 per yaku triggered)
- Per-push ki (+5 per successful push)
- Surplus bonus (3/8/15 ki bracketed by score ratio vs threshold)

**Design pivot (Robert, 2026-05-07):** During F1.3 scoping, identified that the original spec is now obsolete relative to current design direction. Reasoning:

1. **Per-yaku ki dilutes yakus' strategic importance.** Yakus already gate bank/push decisions — that's their strategic weight. Adding flat ki per yaku rewards the same accomplishment twice and reduces decision depth. At high stacks, yaku snowball compounds without adding strategic value.

2. **Surplus bonus rewards shop luck more than skill.** Early-round shop RNG has outsized influence on threshold-clearing ratios. Rewarding the surplus produces "luck tax" rather than earned ki. Per design principle "as much as possible, I would like ki to feel earned."

3. **Per-push ki should connect to interest, not be a flat bonus.** Push/bank already has flow as its primary risk/reward axis. Adding flat ki per push duplicates the risk/reward without thematic resonance. A better direction: tie INTEREST to push/bank outcomes (parallel to how flow rises/decays).

**Design direction (tracked as F2.x):** Replace the passive interest mechanic with a push-driven one:
- Each successful push raises interest rate this round (additive bonus, like flow)
- Each failed push lowers interest rate this round (decay, like flow penalty)
- Base interest restores at round start
- Creates a real "do I bank safe interest or push for higher interest at risk of losing it" decision

This adds strategic depth especially for runs where threshold is cleared on yaku 1 — pushing then becomes a real economic decision, not just a flow-multiplier play.

**Open design questions for F2.x:**
- Magnitude per push (e.g., +5% per success, -10% per failure)?
- Floor on interest after failures? (0%? 50% of base?)
- Cap on interest after successes? (Some bracket?)
- Does the modifier persist across rounds, or reset each round?
- How does the new mechanic interact with existing interest spirits (Piggybank, Bonds, Ingot)?

**Codebase impact:** No code changes in Phase 1. F2.x will be a focused Phase 2 design + implementation pass.

**Cross-references:**
- F2.x (Push-driven interest mechanic): new task tracked for Phase 2
- F3.9 (round-end ki breakdown): more important now that fewer but more meaningful components exist
- Design doc impact: significant — design doc should reflect that interest is push-driven, not passive

---

## F2.6 design refinement — Interest mechanic: parallel-to-flow, not pegged to flow

**Status:** Design notes, 2026-05-07 (during F1.5 transition)

**Question explored:** Should the new push-driven interest mechanic be DIRECTLY pegged to flow (e.g., interest = some function of flow value), or run as a PARALLEL mechanic with its own state?

**Pegging analysis:**
- Flow=1.5 → interest 50%: too steep, snowball at flow=2.0
- Flow=1.5 → interest 5%: mathematically opaque
- Flow=1.5 → interest 0.5%: too slow to matter

**Deeper concern with pegging:** Flow is a scoring multiplier (operates on score values); interest is an economic percentage (operates on ki balance). Pegging creates a feedback loop:
- High flow → big score → big ki reward → big interest → more ki → bigger purchases → bigger flow next round → ...

This snowball would disadvantage players who get a bad early round and reward exponential dominance from a single good round. Anti-design.

**Decision: PARALLEL mechanic, not pegged.**

Interest gets its own per-round state variable that behaves LIKE flow but in a separate value space:
- Round start: `roundInterest = baseInterestRate` (10%)
- Each successful push: `roundInterest += pushInterestBonus` (~3-5%)
- Each failed push: `roundInterest -= pushInterestPenalty` (~5%, with floor at 0%)
- Round end: ki reward includes `floor(currentKi × roundInterest)`
- Probably cap at 50% to prevent unbounded growth

**Why this is better:**
- Symbolic clarity: "each successful push raises this round's interest by 5%" is directly explainable
- Independent tunability: flow rewards and interest rewards can be rebalanced separately
- No feedback loop: flow doesn't compound interest, preventing snowball
- Same emotional shape as pegging: pushing still feels risky and rewarding on both axes (scoring + economy)
- Avoids tight scoring-economy coupling that produces snowball or death-spiral dynamics

**Design principle (Robert):** "Maybe it is a mistake to directly correlate a scoring mechanic with an economy mechanic." Confirmed worth keeping the channels separate.

**Specific numbers deferred to F2.6 implementation:**
- Per successful push: +3% to +5% (tentative)
- Per failed push: -5% (with floor 0%)
- Cap: 50% (tentative, to prevent runaway)
- Interaction with Piggybank/Bonds/Ingot — needs design pass

**Cross-references:**
- F1.3 (superseded): the original ki components spec
- F2.6 (Push-driven interest mechanic): this design will inform the implementation

---

## F1.5 — V4 scoring residue removal

**Status:** RESOLVED 2026-05-07

**Question:** The V4-era scoring engine emitted result fields (`additiveMult`, `multMult`, `pointBoost`, `yakuMult`, `boostedBasePoints`, `rawBasePoints`, `metalConsumableCount`, plus additional fields surfaced during the audit: `totalMultiplier`, `effectiveMult`, `pushEscalation`) that were displaced by V5's per-capture scoring loop. These fields lingered as placeholders (set to 0 or 1.0) in result objects, consumed only by logger guards that never fired. ScoringEngine had a stub `calculateFinalScore` returning `{ metalConsumableCount: 0 }` consumed in dead code.

**Decisions:** Remove all V4 residue across 4 files.

**Codebase changes:**
- `GameRoundManager.js`: removed V4 placeholder fields from 2 result objects (bankScore + _finalizeTurn), removed 2 calls to `ScoringEngine.calculateFinalScore`, removed `metalConsumableCount` parameter from `_applyPostRoundEnhancements`, removed dead metal-proc loop in same method
- `ScoringEngine.js`: removed `calculateFinalScore` stub method (16 lines) and updated header comment
- `GameplayLogger.js`: removed 3 V4 log lines (pointBoostDetail, additiveMult, multMult guards)
- 2 logger call objects in GRM also cleaned up (removed V4 fields from inline object literals)
- Build green.

**Out of scope (left for later):**
- RunManager.js L1484 comment mentioning `multMult` in edition context — that's a separate concept (ghost edition `×1.5 multMult`), not V4 residue. Will be addressed in F4.14 design doc reconciliation pass.

**Verification:**
- Build green.
- Round-end log unchanged for meaningful fields (capture count, types, base points, flow, final score, threshold, ki earned).
- "Additive mult", "Mult-mult", "Point boosts" log lines no longer present (they never fired anyway).

**Cross-references:**
- F4.14 (design doc reconciliation): L1484 doc comment cleanup tracked there.
- F1.6 (logger improvements): next, builds on this clean-state.

---

## F1.6 — Logger improvements (hexagram + complete spirit loadout)

**Status:** RESOLVED 2026-05-07

**Question:** Two transcript completeness gaps:
1. Hexagram never logged at run start — past run transcripts lacked critical context about which hexagram was in effect
2. `logSpiritLoadout(spirits)` only logged regular spirits with hardcoded state extraction for two specific fields (plainsCaptured, seenAnimals). Negatives and legendaries absent from the loadout log; other state fields invisible.

**Decisions:**

1. **New `logHexagramAssignment` method** added to GameplayLogger. Called from `RunManager.setHexagram` whenever a run's hexagram is set (including to null). Format: `Hexagram: ${englishName} (${chineseCharacter} ${chineseName}) [${id}]` followed by description on next line.

2. **`logSpiritLoadout` extended** to accept three collections: `(spirits, negatives = [], legendaries = [])`. Per-spirit display includes:
   - Stack count for multi-stack regulars (e.g., `Name ×3`)
   - Power level for negatives (e.g., `(neg p3)`)
   - Element count for accumulators (e.g., `[el:3]`)
   - Generic state field display for other spirits (e.g., `[multValue:2]`)
   
   Sections separated by `||` for visual scan-ability.

3. **Import added** to RunManager.js: `getHexagram` from `../data/hexagrams.js` (aliased to `getHexagramDef` for code clarity).

**Codebase changes:**
- `GameplayLogger.js`: new `logHexagramAssignment` method, expanded `logSpiritLoadout`
- `RunManager.js`: import statement, `setHexagram` calls the new logger method
- `GameRoundManager.js`: caller updated to pass `run.spirits, run.negativeSpirits, run.legendarySpirits`
- Build green.

**Verification:**
- Hexagram log line at run start ✓
- Spirit loadout shows all three collections ✓
- Negatives show power level ✓
- Accumulators show element count ✓

**Cross-references:**
- F1.5 (V4 scoring residue removal): just shipped, cleaner result objects.
- F1.7 (semantic addKi reasons): shipped, ki transactions have meaningful reasons.
- F3.9 (round-end ki breakdown UI): will benefit from cleaner loadout logs.

**Design doc impact (F4.14):**
- Transcripts now include hexagram context — important for design doc reconciliation when reviewing playtest sessions.

---

## D0.25 — Cuckoo Egg redesign

**Status:** RESOLVED 2026-05-07

**Question:** Original Cuckoo Egg used singleton `state.roundsRemaining` with auto-hatch via in-place mutation into a `tier: 2` spirit. This had multiple problems:
1. Wrong fusion pool (`tier: 2` matched Wu Xing engines and rank engines, not actual fusion spirits)
2. Singleton state conflicting with F1.8.b per-element architecture
3. Auto-hatch removed player agency
4. In-place mutation instead of clean sale-triggered spawn
5. No RNG sync for stacked sales

**Decisions:**

1. **Per-element accumulator pattern.** Cuckoo Egg added to `ACCUMULATOR_SPIRIT_IDS` and `ACCUMULATOR_INIT` (same as `util_past_life`, only `acquiredRound` per element).

2. **Sale-triggered hatch.** Selling a Cuckoo Egg fires `_fireCuckooHatch(matureStacks)`. Only mature elements (currentRound - acquiredRound >= 3) produce a fusion spirit. Immature elements are removed silently.

3. **RNG sync for stacked sales.** All mature elements in a single sale transaction produce the SAME random fusion_t2 spirit (via shared `target` variable in the hatch method). Stack-by-stack sales roll independently.

4. **Correct fusion pool.** Filter is `SPIRIT_CATALOG.filter(s => s.category === 'fusion_t2')` — 8 spirits (Bloom, Thunderstorm, Decay, Blizzard, Atmosphere, Continent, Sun, Moon). Previously only obtainable via Sacred Grove; Cuckoo Egg provides alternate access path.

5. **Slot-limit handling.** Sale frees the Cuckoo Egg's slot. Hatch attempts to add fusion via standard stacking path. If no slots (or cascade exceeds capacity), hatch fails silently. Player keeps the sold Cuckoo Egg slot freed but receives no fusion.

6. **Debug hook.** `forceCuckooHatchTarget(fusionId)` and `_forcedCuckooHatchTarget` field for deterministic testing.

7. **Tooltip.** Singleton mature: "Mature — sell to hatch a Tier-2 fusion". Singleton immature: "Hatches in N round(s)". Multi-stack: "Mature: X/N (sell to hatch)".

**Codebase changes:**
- `RunManager.js`:
  - `SPIRIT_CATALOG` imported from spirits.js
  - `sym_cuckoo_egg` added to `ACCUMULATOR_SPIRIT_IDS` Set
  - `sym_cuckoo_egg` entry added to `ACCUMULATOR_INIT` (returns `{}` — only acquiredRound used)
  - Old `state.roundsRemaining` init removed from `_initSpiritState`
  - New `_fireCuckooHatch(matureStacks)` method (45 lines) — RNG-synced hatch, iterative stacking with cascade-to-negative support, slot-limit fail-silent
  - `_forcedCuckooHatchTarget` field added to `reset()`
  - `forceCuckooHatchTarget(fusionId)` debug method
- `GameRoundManager.js`: round-start auto-hatch block removed (13 lines)
- `GameScene.js`: sale path counts mature elements via `spirit.elements.slice(-quantity)` before removal; fires hatch via `run._fireCuckooHatch` after removal completes; tooltip rebuilt for per-element display
- `spirits.js`: description updated to "Per stack, 3-round maturity. Sell to hatch a random Tier-2 fusion spirit (slot-limited)."
- Build green.

**Verification (opportunistic):**
- Singleton acquisition → matures over 3 rounds → sell when mature → random fusion_t2 appears
- Multi-stack RNG sync confirmed via `forceCuckooHatchTarget` for deterministic testing
- Mixed-maturity stack sale produces matureStacks-count fusions
- Pre-mature sale produces no fusion (silent removal)
- Slot-limit edge case: hatch fails silently when no slots

**Open follow-ups:**
- **Sale order semantics:** `spirit.elements.slice(-quantity)` takes the LAST N elements (most recently acquired). For partial sales of a stacked Cuckoo Egg, this means newest elements sell first. UX expectation may be "sell oldest first" since those are the ones the player has been waiting on. Worth confirming in playtest. If reversed, change to `slice(0, quantity)`.
- **Fusion as negative form:** If a Cuckoo Egg hatch path cascades to 4+ of the same fusion (e.g., 4-stack Cuckoo Eggs sold at once when no other fusions own that slot), it correctly creates a Negative fusion. Per F1.8.b cascade pattern. Edge case worth verifying.

**Cross-references:**
- D0.24 (Past Life redesign): direct architectural template
- F1.8.b: per-element accumulator pattern + iterative cascade
- F3.5 (per-element tooltip mode): Cuckoo Egg will benefit from element-level tooltip in Phase 3

**Design doc impact (F4.14):**
- Cuckoo Egg description: sale-trigger mechanic, per-stack maturity, slot-limit handling
- Tier-2 fusion accessibility: documented that Cuckoo Egg provides non-Sacred-Grove path to fusion spirits
- Old auto-hatch behavior: removed; rationale (player agency + RNG sync semantics) documented

---

## F1.x — Legacy consumable cleanup (precursor to F2.3.i)

**Status:** RESOLVED 2026-05-07

**Question:** ConsumableEffects.js implemented 16 consumables: 4 legacy (Horse, Dog, Pig, Rooster — predating Design Doc V1) plus 12 zodiac. The legacy entries were dead code (no acquisition path) and the natural names (horse/dog/pig/rooster) were occupied by these obsolete entries.

**Decisions:**

1. **Removed 4 legacy entries** from ConsumableEffects.js (consumable_horse, consumable_dog, consumable_pig, consumable_rooster).

2. **No rename needed** — zodiac data in zodiacConsumables.js already uses natural names (zodiac_horse, zodiac_dog, zodiac_pig, zodiac_rooster), not the horse2/dog2/pig2/rooster2 suffixed names referenced in the old header comment. The header comment was simply incorrect.

3. **GRM internal field names preserved** — `_dogProtection` and `_pigDoubleKi` remain in GameRoundManager.js because they're now used by the zodiac replacements (e.g., zodiac_rabbit reuses `_dogProtection`). Renaming GRM internals is out of scope; the misleading naming is functional.

4. **Header comment correction follow-up**: initial header said "12 zodiac" but the actual roster is **13 zodiac including Cat** (the 13th zodiac per the legend of the Great Race; Cat was tricked by Rat and missed the race in mythology, but the design includes Cat as a tactical zodiac). Cat's effect: "Summon a random Tier 1 Foundation spirit to an open slot." Header corrected to reflect 13 zodiac.

**Codebase changes:**
- `ConsumableEffects.js`: 4 legacy consumable entries deleted (46 lines); header comment updated to reflect 13-zodiac roster.
- Build green.

**Cross-references:**
- F2.3.i (next task): now works against a clean consumable roster of 5 categories (wuxing, zodiac, stamp, chakra, alchemical) — no legacy special-casing needed in dispatch.

**Design doc impact (F4.14):**
- Legacy consumable test artifacts removed from codebase.
- 13 zodiac roster is the canonical animal consumable set.

---

## F2.3.i bugfix sweep — RESOLVED

**Status:** SHIPPED 2026-05-07

**Bugs fixed:**

1. **`isMark` undefined error** — Variable renamed during F2.3.i ship but stale reference at L2360 in `_renderActionButtons` (Sell button conditional for zodiacs). Fixed: replaced `!isMark` with `!isCardTarget && !isAlchemical`. This was firing constantly during every consumable interaction.

2. **ShrineScene L783 null reference** — Race condition: `this._selectedItem` could be null between click and handler firing. Added `if (!s) return` guard.

3. **Chakra apply methods returning undefined** — Root, Sacral, Solar Plexus, and Third Eye all mutated state but returned undefined, breaking `if (result?.success)` detection in the dispatch. Effects applied but UI never cleaned up (consumable stayed in inventory, Confirm button persisted). Fixed: added `return { success: true }` to all 4 methods; converted `throw new Error(...)` for excess card counts to `return { success: false, reason: '...' }` for graceful UI handling. Heart, Throat, and Crown already returned proper result objects.

4. **Confirm button double-fire** — Pressing Confirm twice on a multi-target chakra applied the effect twice (very destructive for Third Eye!). Fixed: `confirmBtn.disableInteractive()` on first click prevents re-entry.

5. **Inventory slot limit** — Already correctly guarded in F2.3.i; the silent-fail observed was likely masked by Bug 1 (`isMark` throw blocking status message rendering). Should now display "Consumable inventory full." properly after Bug 1 fix.

6. **Throat Chakra deck count UI** — Working as designed. Deck counter shows round-local draw pile, not persistent deck. Throat-added duplicates correctly enter next round's draw pile. UX clarity tracked as Phase 2 polish task.

**Codebase changes:**
- `GameScene.js` L2360: `!isMark` → `!isCardTarget && !isAlchemical`
- `GameScene.js` L2262: `confirmBtn.disableInteractive()` on Confirm click
- `ShrineScene.js` L781: `if (!s) return` guard
- `RunManager.js`: 4 chakra methods now return result objects
- Build green.

**Cross-references:**
- F2.3.i (parent): consumable carry-over architecture
- F2.3.i followup (multi-target chakras): unblocked by Bug 3 fix
- F2.3.i UI polish (Phase 2 task): see below for items deferred

**UI polish deferred to Phase 2 task:**
- C2 Cancel button for card-target mode (instead of ESC-only)
- E1/E2/Heart Chakra: no visible card edition indicator after application
- Earth element enhancement icon missing on card sprite (audit other elements)
- Crown Chakra: card image not updating after identity copy
- White stamp: retrigger score reflected in log but not in score panel UI
- Throat Chakra deck count clarity (two-line display or transient feedback)

---

## D0.19-2 partial regression RESOLVED (2026-05-07)

**Status:** RESOLVED + VERIFIED 2026-05-07

**Context:** D0.19-2's original fallback in the Osprey deck-flip handler captured 2-card 'normal' field slots only when the intercepted card's month matched the slot's month. F1.8.b-7 sweep observed that when Osprey intercepts a flip whose month does NOT match the stranded pair, the pair stayed stuck on field.

**Root cause:** The fallback was reimplementing capture logic ad-hoc with a too-narrow month-match gate, rather than mirroring the existing Fix E behavior used in the non-Osprey deck-flip path. Fix E captures `_lastHandPlayToEmptySlot.cards` when 2 hand cards landed on an empty slot, regardless of the deck card's month.

**Decision:** Replace the ad-hoc month-gated fallback with a Fix E mirror in the Osprey handler. The new code checks `_lastHandPlayToEmptySlot.cards.length === 2` and captures unconditionally if true. This unifies the with-Osprey and without-Osprey behaviors around the same source of truth.

Additional structural improvement: the original if/else made pending-match resolution and the fallback mutually exclusive. The new code uses sequential if/if so both can fire in the same turn (defensive against theoretical multi-play turn edge cases).

**Codebase changes:**
- `GameRoundManager.js` Osprey handler (~L1755): replaced 13-line month-gated fallback with 6-line Fix E mirror. Build green.

**Verification (2026-05-07):**
- Broken case (non-matching month flip intercepted): 2-card pair now captures ✓
- Previously-fixed case (matching month flip intercepted): still captures ✓
- Fix D edge case: not applicable under Osprey (flip card goes to hand, no field card available to pair with 1-card slot); slot correctly stays on field per design

**Cross-references:**
- D0.19-2 original (resolved matching-month case)
- F1.8.b followup #3 (Osprey state init prerequisite)
- F1.8.b-7 sweep (where partial regression was observed)

**Phase 1 status:** This was the final outstanding functional item. Phase 1 functional work complete.

---

## Negative Osprey/Catcher counter reset bug RESOLVED (2026-05-08)

**Status:** RESOLVED 2026-05-08 (verification pending playtest)

**Context:** During Phase 1 closeout, Robert observed that a Negative Osprey's `flipsUsedThisRound` counter stayed stuck at maximum across rounds, eventually disabling the intercept effect entirely.

**Root cause:** Iteration asymmetry between the round-start state reset loop and the mid-round counter increment paths. The reset loop in GRM's startRound used `for (const spirit of this._spirits)` (regular spirits only), but the intercept code in `_doDeckPhase` used `run.allSpirits.filter(s => s.id === 'sym_osprey')` which includes negatives. Increments hit the negative; resets did not.

When Osprey transcends to its Negative form, the regular Osprey is removed from `_allSpirits` and replaced with a new entry having `isNegative: true`. Only the negative exists. Its counter increments to max during round 1; round-start reset of round 2 doesn't touch it (filter to `_spirits` excludes negatives); the `ospreySpirits[0]?.state?.flipsUsedThisRound` read in the intercept check picks up the stuck max value and short-circuits the intercept.

**Decision:** Change reset loop to iterate `run.allSpirits` to match the increment path. The existing `spirit.state` truthy guard handles spirits without the relevant state structure. Same fix applies to Catcher's `catchesUsedThisRound` (same pattern, same vulnerability to negative transcend via Amber).

**Codebase changes:**
- `GameRoundManager.js` ~L377: `for (const spirit of this._spirits)` → `for (const spirit of run.allSpirits)`. Build green.

**Verification (pending):**
- Transcend Osprey to Negative. Use intercepts in round 1 until counter at max. Bank round. Round 2: intercepts should fire again with counter reset to 0.
- Inspect via `window.__run._allSpirits.find(s => s.id === 'sym_osprey' && s.isNegative).state.flipsUsedThisRound` — should be 0 at round 2 start.

**Cross-references:**
- D0.21-1 (Osprey original state init)
- F1.8.b followup #3 (Osprey state init across summon paths)
- F2.4 item 10 (broader regular-vs-negative iteration asymmetry audit pattern — search for other similar bugs)
- Last Phase 1 functional fix.

---

## F2.7a — `_spirits` snapshot eliminated, live read from run state (2026-05-08)

**Status:** SHIPPED + VERIFIED 2026-05-08

**Context:** F2.7a was scoped as the first sub-task of F2.7 (live state reads). Recon during Phase 2A planning revealed that the round-snapshot pattern actually had three distinct mechanisms, not one architectural pattern as initially thought:
- Spirit roster snapshot (`this._spirits` in GRM, set via `setSpirits()` at round start)
- Field configuration round-start computation (`_fieldBase`)
- UI re-render gaps on manager-state mutations

F2.7a addresses only the first mechanism — the `_spirits` snapshot. F2.7b and F2.7c will address the other two.

**Investigation surfaced a separate Cinnabar bug** during recon: Cinnabar decrements component `stackCount` to 0 without calling `removeZeroStackSpirits()`, leaving "zero-stack ghosts" that the scoring engine iterates. Pearl already handled this correctly; Cinnabar was missed. The defense-in-depth strengthening of the `spirits` getter (`stackCount > 0` filter) covers this and any future similar oversights.

**Decision:** Eliminate the `_spirits` snapshot entirely. Add two new getters to RunManager (`activeSpirits` for regulars+legendaries, `scoringSpirits` for the full scoring set including negatives). Replace all 45 `this._spirits` references in GRM with the appropriate live getter. Strengthen `spirits` getter with `stackCount > 0` filter as defense in depth. Remove all 5 `setSpirits()` calls from GameScene.

The cached approach (`const _activeSpirits = run.activeSpirits` at the entry of hot scoring functions) was used in `_addCapture` to avoid redundant getter calls within a single capture event. This keeps the function's spirit dependency explicit and avoids potential mid-capture mutation surprises.

**Codebase changes:**
- `RunManager.js`: `spirits` getter strengthened; `activeSpirits` and `scoringSpirits` getters added
- `GameRoundManager.js`: `_spirits` declaration removed; `setSpirits()` method removed; all 45 references converted to `run.activeSpirits` / `run.scoringSpirits` / cached `_activeSpirits` / cached `_scoringSpirits`; Caterpillar metamorphosis stale local-copy line removed
- `GameScene.js`: All 5 `setSpirits()` callsites removed
- Build: green

**Verification (2026-05-08):**
- Cinnabar mid-round fusion: only the fusion contributes to scoring; no zero-stack ghosts in the log ✓
- Mercury de-fusion: both component spirits score in the same round ✓
- Jade stack increment: boosted spirit shows `power 2` and contributes 2× immediately ✓
- Lead summon: summoned spirit appears in `activeSpirits` and scores immediately ✓
- Amber transcend: negative version scores via `scoringSpirits` with `power 2`; no double-count from old version ✓
- Sulfur duplicate/clear: pool includes negatives per F2.3.i fix; works correctly (verified clear+duplicate landed on regulars due to RNG, negative was in pool but unselected) ✓
- Regression: spirit sale mid-round, sold spirit not in subsequent scoring ✓
- Regression: spirit drag/drop, scoring order respects new arrangement ✓
- Regression: cascade-to-negative, cascaded negative scores immediately ✓

**Cross-references:**
- F2.7 broader task (OVERHAUL_PLAN.md ~L653): F2.7a is the first of three sub-tasks
- F2.7b (field slot live recomputation): next sub-task — addresses Amber and Rooster field slot lag
- F2.7c (UI re-render hooks): final sub-task — addresses Throat deck count, Rat/Dog/Horse hand-add visibility
- F2.3.i second bugfix sweep: Sulfur negatives inclusion (`run.allSpirits` + `isNegative`/`powerLevel` in duplicate spec) — prerequisite that allowed F2.7a Sulfur verification to pass cleanly
- Cinnabar zero-stack ghost bug: surfaced 2026-05-08 during F2.7a recon; resolved by defense-in-depth `spirits` getter (Cinnabar itself was eventually found to already call `removeZeroStackSpirits()`, so the issue was milder than initially feared)

**Lessons:**
- Recon clarified the F2.7 problem statement significantly. What looked like one architectural pattern was actually three distinct mechanisms. Splitting into 2.7a/b/c gives each a cleaner scope.
- The defense-in-depth `spirits` getter strengthening was cheap and protects against future similar oversights.
- The cached pattern (`_activeSpirits` at function entry) is worth applying consistently to other hot paths where the same getter would be called repeatedly.

---

## F2.7b — Field slot live recomputation (Amber + Rooster + hexagrams) (2026-05-08)

**Status:** SHIPPED + VERIFIED 2026-05-08

**Context:** F2.7b was scoped as the second sub-task of F2.7, addressing the field-configuration round-start computation mechanism. Recon revealed that `_fieldBase` was computed once in `startRound()` and not re-triggered when mid-round mutations occurred. Amber's `_permanentFieldSlotMod = -1` write was therefore invisible until the next round.

**Investigation also surfaced two related issues:**

1. **Rooster was absolute, not relational.** The original handler called `roundManager._field.setMaxSlots(9)` — a hardcoded value from when 8 was the only base. With hexagrams now able to set base to 6, 9, 10 (#28, #59, #60, #62), the absolute setter was wrong. Rooster should be "+1 to current," not "set to 9."

2. **Rooster's stackability was undefined.** Multiple Rooster uses in one round had no effect under the absolute model. Robert clarified the relational design should be stackable — 2 Roosters = +2 slots.

**Architectural decision: Approach B (explicit aggregation) over Approach A (central registration API).**

Currently 4 sources modify field slots: MAX_SLOTS base, blessing bonus, Amber permanent mod, Rooster in-round bonus. Plus the hexagram hook layers on top. Approach B (helper that aggregates these sources explicitly) is clean code for this scale. Approach A (central registration API where each effect registers a contribution) is over-engineering at 4 sources.

**Revisit threshold for Approach A:** If 3+ more field-slot-modifying effects are added (new spirits, consumables, future hexagrams), reconsider the migration. At ~7+ sources, the aggregation list becomes maintenance burden and a registration API earns its keep.

**Codebase changes:**
- `GameRoundManager.js`:
  - Added `this._roosterBonusThisRound = 0` to constructor
  - Added `_recomputeFieldSlots()` helper method that aggregates MAX_SLOTS + blessings + Amber + Rooster, then applies the hexagram `modifyFieldSlots` hook
  - `startRound()` now resets `_roosterBonusThisRound = 0` and calls the helper (replacing 3-line inline computation)
  - Removed orphaned `_fieldSlotBonus` local variable (now computed inside helper)
- `ConsumableEffects.js`:
  - Amber: destructured `roundManager` from params; calls `roundManager._recomputeFieldSlots()` after writing `_permanentFieldSlotMod` (with defensive guard)
  - Rooster: replaced absolute `_field.setMaxSlots(9)` with relational `_roosterBonusThisRound += 1; _recomputeFieldSlots()`. Now stackable and resets each round via `startRound`'s zeroing
- Build: green

**Verification (2026-05-08, via visual playtest):**
- Test 1 (Amber alone): field 8 → 7 immediately after Amber use ✓ (`_permanentFieldSlotMod = -1` confirmed via console)
- Test 2 (Rooster alone): field 8 → 9 after Rooster use (with render-on-next-play UI lag) ✓
- Test 3 (Amber + Rooster combined): net behavior matches design — Amber permanent reduction + Rooster in-round bonus combine additively ✓
- Test 4 (Rooster stackability, 2 uses): 2 Rooster uses adds +2 slots, resets next round ✓

Note: Console diagnostics for `window.__run._round._roosterBonusThisRound` returned undefined because GRM is not exposed at a top-level window key. `window.__run._round` returns the round counter (a Number), not the GRM instance. Visual playtest confirms all behaviors. Future console access to GRM may need a debug exposure if testing requires it.

**Known limitation (deferred to F2.7c):** All field slot mutations require a subsequent player action (e.g., playing a card) to trigger a visual re-render. The data layer (`_field.setMaxSlots`) updates immediately, but the GameScene visual rendering doesn't refresh until the next state change. F2.7c will close this UI gap.

**Cross-references:**
- F2.7 broader task (sub-tasks 2.7a complete, 2.7c pending)
- Phase 1 closeout Rooster typo fix (`field` → `_field`): F2.7b builds on that fix and reframes Rooster's spec correctly
- Phase 1 closeout Amber + Lead investigation: confirmed `_permanentFieldSlotMod` was being written correctly; F2.7b makes it visible immediately
- Hexagrams #28 (-2), #59 (+1), #60 (-1), #62 (+2): existing field-slot-modifying hexagrams now combine correctly with Amber and Rooster via the unified helper
- F2.2 Hexagram corrections (separate Phase 2 task): may surface description/effect mismatches (e.g., hex_59 description says "10 slots" but effect is +1 from base 8)

**Lessons:**
- The decision to defer Approach A (registration API) is correct for current scope. Documented threshold (3+ more sources) gives a clear migration trigger.
- Visual playtest is sufficient verification when console access isn't available. Behavior is the real test.
- F2.7b's render-lag limitation is the cleanest validation of the F2.7c scope — data layer vs visual layer are genuinely separable concerns.

---

## F2.7c — UI re-render hooks + Throat same-round duplicate (2026-05-08)

**Status:** SHIPPED + VERIFIED 2026-05-08

**Context:** F2.7c was scoped as the third and final sub-task of F2.7, addressing UI re-render gaps where mid-round mutations succeeded at the data layer but didn't refresh the visual rendering until the next user action triggered a re-render.

**Investigation surfaced two distinct issues:**

1. **Re-render gap.** Multiple consumable activation paths only re-rendered partial UI subsets (spirit column, consumables, action buttons, info texts) after success — missing hand, field, and capture fan. Mid-round mutations like Rooster's added field slot, Rat/Dog/Horse's added cards, and Amber's reduced slot were data-correct but visually stale.

2. **Throat Chakra same-round availability.** Throat duplicates a card into `run._deck` (persistent) but didn't add it to the round-local draw pile. The duplicate sat in the persistent deck until next round's startRound re-dealt. This was inconsistent with every other chakra (all immediate).

**Design decision on Throat:** Shuffle the duplicate into the active round's draw pile at a random position. Preserves the "duplicate into deck" framing, avoids hand-size overflow concerns, and gives the player a chance to flip the duplicate this round (variable timing — risk/reward inherent to the random insertion).

**Investigation revealed a deeper architectural issue:** Consumable activation is dispatched through **three separate code paths** in GameScene:
1. `_activateCardTarget` — chakras, stamps, elements
2. `_activateAlchemical` — all alchemicals (target picker or immediate)
3. Inline `else` branch in consumable click handler — all zodiacs (target picker via `_showZodiacTargetPicker` or immediate)

Each path independently manages target picking, execution, consumption, logging, status, and re-rendering. This fragmentation caused F2.7c's initial fix to miss the zodiac path entirely (we fixed `_activateAlchemical` but zodiacs were elsewhere). A second-pass fix was required to apply the same `_renderAll()` change to the zodiac path's two callsites (no-target inline handler + slot/yaku target pickers).

**The deeper unification of all three paths into a single dispatch was scoped to F4.15 (Phase 4 engine cleanup)** rather than attempted in-flight. Rationale: the unification is a 150-200 line refactor with significant regression surface, and Phase 4 has the right context for it (bundled with other GameScene cleanup tasks F4.1, F4.10). For F2.7c's immediate scope, surgical fixes to each path are sufficient.

**Codebase changes:**

- `DeckManager.js`: Added `insertIntoDrawPile(card)` method (splice at random position)
- `RunManager.js`: `applyChakraThroat` now returns `{ success: true, newCard }` so the caller can also insert into the round-local draw pile
- `GameScene.js`:
  - Throat dispatch: After `applyChakraThroat` success, call `this._round.deck.insertIntoDrawPile(result.newCard)` to make the duplicate available this round
  - `_activateAlchemical` no-target branch: replaced partial re-render with `this._renderAll()`
  - `_showAlchemicalTargetPicker` success/cancel handlers: replaced partial re-renders with `this._clearObjs(_overlayObjs); this._renderAll()`
  - Zodiac inline activation handler (else branch in consumable click): replaced partial re-render with `this._renderAll()`
  - `_showZodiacTargetPicker` slot/yaku handlers: removed redundant trailing `_updateInfoTexts()` (now part of `_renderAll`)
  - Zodiac sell button handler (bonus cleanup): replaced partial re-render with `this._renderAll()`
- Build: green

**Verification (2026-05-08, via visual playtest):**

Initial test pass (after first F2.7c ship — alchemical paths only):
- Throat same-round duplicate: appears in draw pile, available for flips this round ✓
- Cinnabar / Mercury / Jade / Amber / Pearl / Sulfur / Lead immediate visual updates ✓
- Chakra single-card path (already used `_renderAll`): still works correctly ✓

But Rooster, Rat, Dog, Horse, Ox, Monkey, Snake still required a click to refresh — this surfaced the zodiac-path miss.

Second test pass (after zodiac-path follow-up):
- Rooster: 9th field slot appears immediately ✓
- Rat / Dog / Horse: added cards appear in hand immediately ✓
- Ox / Monkey: slot clear/capture immediately visible ✓
- Snake: yaku threshold reduction immediately visible (assumed; pattern matches Ox/Monkey)
- Zodiac sell: sell button now triggers full re-render cleanly (bonus fix) ✓
- All alchemical regressions: still working from initial pass ✓

**Cross-references:**
- F2.7 cluster (now complete): F2.7a (spirit snapshot) + F2.7b (field configuration) + F2.7c (UI re-render hooks + Throat fix)
- F4.15 (Consumable activation unification): future refactor that eliminates this category of bug at the architectural level
- F3.15 item #6 (Throat deck count clarity): may still benefit from display improvements (showing total deck size separately from draw pile size), but the immediate-availability concern is resolved by F2.7c
- Architectural patterns now documented for Phase 4: dead-flag (F2.4 item 9), iteration-asymmetry (F2.4 item 10), consumable-path-fragmentation (F4.15) — all symptoms of code that grew incrementally without unifying refactors

**Lessons:**
- Initial F2.7c scoping missed the zodiac path because the recon focused on alchemical activation. Comprehensive recon of all three paths should have surfaced this upfront. For future architectural changes touching consumable handling, always enumerate all three current paths.
- The zodiac-path miss surfaced the fragmentation problem, which is now properly logged for Phase 4. Sometimes the bug IS the design smell.
- Bonus catches during ship (zodiac sell button) are valuable defense against future bugs in the same area. Worth letting Claude Code chase these when scope is small.

---

## F2.10b — Retrigger compounding math correction (2026-05-08)

**Status:** SHIPPED + VERIFIED 2026-05-08

**Context:** Phase 2A continuation. Stamp white/gray retriggers were computing as separate scoring events with isolated `rPts`/`rMult` starting at 1.0, breaking multiplicative spirit compounding. Original F2.10 bundled stamp mixing with retrigger math; split into F2.10a (mixing) + F2.10b (retrigger) on 2026-05-08 since the two issues are architecturally independent.

**Architectural finding from F2.10b recon:** GRM `_addCapture` had two parallel retrigger systems:
1. Phase 1.5 (correct): iterates `allRetriggerSpirits` via `getRetriggerCount`, re-runs per-card scoring within same `points`/`mult` scope. Used only by `retrigger_rainbow`, `retrigger_family`, and `mirror`/`memory` proxies.
2. Stamp captured-trigger block (broken): separate block AFTER Phases 1, 1.5, 2. Used local `rPts`/`rMult` starting at 1.0. Computed `retriggerScore = rPts × rMult × flow` and added directly to `_runningScore`.

The Yang ×2 example proved the divergence:
- Two Air/Night cards + white stamp on B + Yang stack 1
- Desired: mult ×8 (Yang doubles for A → ×2, for B → ×4, for B's retrigger → ×8)
- Actual: 4·(A+B) + 2·B (primary at ×4, retrigger as separate event at ×2 with isolated mult scope)

**Decision:** Plug stamps into Phase 1.5's `retriggerCount` (2-line addition) and delete the entire parallel block (~85 lines). Approach unifies the two systems and produces correct compounding math.

**Codebase changes:**
- `GameRoundManager.js`:
  - Phase 1.5 (~L1317): added `if (card.ribbonStamp === 'stamp_white') retriggerCount += 1` and `'stamp_gray' += 3` to the retriggerCount accumulator
  - Deleted ~85 lines of the parallel stamp retrigger block including its own scoring step event emission and `logRetriggerScoring` call
- All other stamps (yellow, orange, black, blue, green) preserved unchanged
- Build: green

**Architectural observation surfaced during recon (NOT fixed in F2.10b — flagged for separate task):**

Phase 1.5's retrigger loop currently does NOT apply:
- Hexagram `onCardScored` modifier
- Metal-from-hand mult (Iron/Meteorite cards in hand)

The deleted stamp block applied both. Phase 2 engine spirits (`applyEngine`) still run after Phase 1.5, so engines correctly see the retriggered totals — that part is fine.

This pre-existing Phase 1.5 inconsistency affects spirit-driven retriggers too (`retrigger_rainbow`, `retrigger_family`). Stamp retriggers used to have these behaviors via their own broken path. After F2.10b they're consistent with spirit retriggers (i.e., consistently MISSING hex + metal-from-hand).

The right fix: extend Phase 1.5 to apply hexagram `onCardScored` and metal-from-hand to ALL retriggers (spirit + stamp). Out of scope for F2.10b — logging as F2.10c follow-up if it surfaces in playtest, or as a Phase 4 architectural cleanup task.

**Cross-references:**
- F2.10 split into F2.10a (mixing, pending) + F2.10b (retrigger, this entry)
- F2.10a: depends on this for gray stamp correctness (once mixing makes gray reachable)
- F3.15 item #5 (white stamp retrigger UI surfacing): resolved-by-deferral; no separate event remains to surface
- F2.10c (potential follow-up): Phase 1.5 hex + metal-from-hand inclusion if playtest surfaces it

---

**Verification (2026-05-08):**

Tested with January Plain (Air/Day) and January Crane (Air/Day, white stamp), Sun + Yang spirits active.

Yang multiplies mult by 4 per Air/Day card. Sun adds +3 mult per any card.

Expected progression (Sun's +3 fires before Yang's ×4 due to spirit slot order):
- Start mult = 1
- January Plain: +3 → 4, ×4 → 16
- January Crane: +3 → 19, ×4 → 76
- January Crane retrigger: +3 → 79, ×4 → 316

**Observed:** mult = 316.00 ✓ (matches the desired compounding model exactly)

Final score: 67 pts × 316 mult × 0.97 flow = 20,544 ✓

Math verified for both:
- Multiplicative compounding (Yang ×4 stacking with retrigger)
- Additive compounding (Sun +3 firing on retrigger)

**Surfaced UX observation (not blocking):** The per-card scoring log does not display the retrigger as a separate line item. The deleted block included a `logRetriggerScoring` call that produced this output; the new Phase 1.5 path uses `_onScoringStep` events but the GameplayLogger doesn't currently render those as readable per-retrigger lines. Math is correct (proved by running mult progression), just less self-documenting in the log. Candidate for follow-up UX fix.

---

## 2026-05-14: F2.6 verification + push_ki_swing semantic change

### F2.6 + v1.1 + v1.2 + v1.3 + v1.3.1 — shipped and verified

After multiple iterations, F2.6 (push-driven flow & interest commitment model) is shipped and verified:

**v1.0:** Initial commitment model with `_pushDepth` tracking, push curve table, `onBank` method, interest scaling.

**v1.1 patches:**
- Removed `× D` (flow decay factor) from bank/push popup previews — decay is separate game event, shouldn't conflate with push decision
- Added interest previews to bank/push popup (was spec gap)
- Reverted Capstone Time's `× 1.1` push modifier (Claude Code added autonomously, wasn't in spec)

**v1.2 patches:**
- Fixed push depth not incrementing per push (was incrementing only once at bank time, regardless of push count)
- Moved `onPushSuccess(this)` call from `bankScore` to `_finalizeTurn` at new-yaku-during-push detection point
- Added stamp dot rendering to capture area (was missing)
- Changed `stamp_black.hexColor` from `0x778899` (slate) to `0x222222` (near-black) for clear visual distinction from gray
- Changed `logFlowChange` format from additive delta to multiplicative factor (×1.10 instead of +0.10)

**v1.3 patches:**
- Heightened bank/push popup buttons from 42px to 56px (was clipping bottom of popup)
- Raised buttons from `cy + 118` to `cy + 100` for better visual clearance
- Initial attempt at popup labels (used transition format which clipped)

**v1.3.1 patches:**
- Replaced transition-format labels (`flow 1.00→1.00`) with multiplier-only (`×1.10 flow`) — fits buttons cleanly, more legible
- Added operation parameter to `logFlowChange` to distinguish additive (style combo) from multiplicative (push/bank/decay) operations

**Verification status:**
- ✅ Push depth math (depth 1, depth 2 banks produce correct multipliers)
- ✅ Bonds + push interest (multiplier scales spirit-modified base rate)
- ✅ Ingot + push interest (multiplier scales ki-scaled rate)
- ✅ Stamp mixing system (Full Harvest Moon test: blue → purple → black → gray)
- ✅ Stamps visible in capture area
- ✅ Black stamp visually distinct from gray
- ✅ Flow decay still applies at round end
- ✅ Style combo flow boosts (additive, separately tracked)
- ✅ Popup labels fit cleanly in buttons

### push_ki_swing (#06 Sòng) semantic change — accepted

Side effect of F2.6 v1.2's push depth fix: hexagram `push_ki_swing`'s `onPushSuccess(r) { r.addKi(10) }` hook now fires **per successful push** instead of once at bank time.

**Old behavior (pre-F2.6):** Push three times then bank → +10 ki credited once.

**New behavior (post-F2.6):** Push three times then bank → +30 ki credited (per push).

**Decision (Robert, 2026-05-14):** Accept new behavior as intended. The hexagram description ("Pushing earns +10 ki. Banking costs 5 ki. Push-heavy playstyle is heavily rewarded.") better matches the per-push semantic than the old once-per-round behavior. The phrase "push-heavy playstyle is heavily rewarded" really only makes sense if each push pays.

Same applies to `onPushFailure` hook on Sòng — fires once when the push fails (terminal event). Behavior unchanged.

**Cross-references:**
- F2.6 (parent)
- F2.6.b (hexagram push redesign) — verified that push_ki_swing does NOT need redesign; its semantic is clean in the new model
- F2.2 (Hexagram corrections) — pre-existing description/code mismatches still apply: #06 says "Banking costs 5 ki" but code lacks the bank penalty. Out of scope for F2.6; will be resolved in F2.2.

### Hexagrams not verified directly

These were intentionally skipped during F2.6 verification because they will be addressed in F2.6.b or F2.2:

- `volatile_flow` (#64 Wèi Jì): `modifyPushSuccess`/`modifyPushFailure` hooks dead (expected), `modifyFlowDecay` should still work. Will be redesigned in F2.6.b.
- `stable_flow` (#63 Jì Jì): Same status as volatile. Will be redesigned in F2.6.b.
- `no_banking_ki_plus_capture` (#16 Yù): Should work unchanged. Description vs code mismatches (+3 ki claim vs +1 in code) for F2.2.

---


## D-F2.2 — Hexagram corrections complete (Phase 2B)

**Status:** RESOLVED + SHIPPED + VERIFIED

**Session date:** 2026-05-14

**Summary:** All four F2.2 audit categories resolved in a single session. Hexagram system now matches Design Doc V5 spec (with doc reconciliation entries logged in F4.14).

**Categories addressed:**

1. **Mechanical bugs (B1-B6):** hex_38 Kasu threshold mod removed, hex_06 bank cost added, hex_16 economy rewritten, hex_07/54/10 description fixes.
2. **Push hexagram redesigns (B7-B8 + F2.6.c):** New `pushCurveSuccessAmplifier`/`pushCurveFailureAmplifier` hooks introduced. volatile_flow, stable_flow, and Capstone Time now use amplifier-based scaling that compounds multiplicatively.
3. **Design decisions (B9-B14):** hex_61 description rewrite, hex_21 linear tax formula (3 ki per spirit beyond 4), hex_24/16 economy separation (no overlap), hex_26/40/45/46 description-only fixes.
4. **Description rewrites + deck redesigns (D1-D6 + extras):** hex_25/53/44/37 axis-deck descriptions clarified, hex_29 reverted (deferred to Phase 2C), hex_51/62 description verified, plus six full deck composition redesigns using speculative card system.

**Effect ID renames (4 hexagrams):**
- `no_banking_ki_plus_capture` → `no_hand_ki_plus_capture` (hex_16)
- `deck_36_field_plus` → `deck_36` (hex_39)
- `deck_60_hand_plus` → `deck_60` (hex_20)
- `no_plains_double_others` → `all_plains_doubled` (hex_23)
- `no_brights_plain_threshold_minus` → `bright_and_plains` (hex_38)

**Architectural additions:**
- `pushCurveSuccessAmplifier` and `pushCurveFailureAmplifier` hooks in `getPushMultiplier`
- Hexagram-side `onBank` dispatch in GRM (was previously RunManager-only)
- `ALL_CARDS_WITH_SPEC` import in HexagramEffects.js for deck composition redesigns

**Architectural removals:**
- `modifyPushSuccess` and `modifyPushFailure` hooks (orphaned after F2.6; safe to remove)
- Two redundant `logger._log` flow decay calls in GRM (hardcoded stale `FLOW_DECAY_RATE` constant)
- Stale `modifyYakuThreshold` on hex_38 (proportional thresholds handle this)

**Deferred items:**
- **F2.2.x hex_29 redesign** → Phase 2C. Initial-deal layout for rank-matching still stacks by month, producing incoherent board states under match_by_rank. Needs board-layout-side rework.
- **F2.6 compounding tests (Tests 5/6)** → Phase 2D F2.D.x closeout battery. Verified by association but not directly tested.
- **hex_06 bank cost timing** → Phase 2D closeout battery. Confirm whether bank deduction fires before or after interest credit.
- **hex_21 7-8 spirit verification** → Phase 2D closeout battery. Tested at 5/6 spirits + 8 spirits in isolation, 7 not directly tested.

**Verification approach:**
- Prompt 1: 5 mechanical tests + 18 description spot-checks
- Prompt 2: 6 push-curve math tests (Tests 1-6) covering baseline, volatile, stable, Capstone Time, and compound scenarios
- Prompt 3: 5 deck verification tests (card-reference sharing, card counts, December plain handling, speculative card presence, description spot-checks)

**Cross-references:**
- F4.14 (Design Doc V5 reconciliation accumulator) — all doc-side changes logged
- F2.6 (parent of F2.6.b and F2.6.c)
- Phase 2C (double-trigram verification, where hex_29 redesign lives)
- Phase 2D F2.D.x (closeout test battery)

---

## D-F2.3 — Consumable corrections + spirit acquisition unification (Phase 2B)

**Status:** RESOLVED + SHIPPED + VERIFIED 2026-05-14

**Session summary:** Single Max-Effort ship consolidating six parallel spirit-acquisition implementations into one canonical helper. Net codebase reduction (-38 lines) while adding behavior fixes and resolving four bypass-stacking bugs.

**Architectural change:**

New `_acquireSpiritStack(spiritDef, stackCount, options)` helper in RunManager.js. Single canonical implementation of: merge same-id stacks → cascade-transcend at 4 → snapshot powerLevel = min(3, count-1) → symbiont auto-detection via spiritDef.channel/category → slot validation.

**Eleven acquisition paths integrated:**

| Path | Status |
|---|---|
| buySpirit | Thin wrapper (ki check + log + delegate) |
| summonSpirit (Cat zodiac, Lead alchemical) | 4-line wrapper |
| _addPastLifeCopy regular | Delegates to helper |
| _addPastLifeCopy negative | Stays direct (intentional) |
| Cinnabar | Replaced addSpiritDirect with helper |
| Mercury | Replaced 2× addSpiritDirect with helper |
| Jade | Replaced direct stackCount++ with helper (fixes accumulator bug) |
| Sulfur regular | Replaced addSpiritDirect with helper |
| Sulfur negative | Stays direct (intentional) |
| Amber | Stays direct (intentional — explicit snapshot powerLevel) |
| _fireCuckooHatch | Delegates after RNG target pick |
| addSymbiontSpirit | 1-line wrapper (fixes hardcoded powerLevel: 3) |

**Bug fixes:**
- Cinnabar/Mercury/Sulfur now merge into existing same-id spirits and trigger cascade-transcendence correctly (C24/C25)
- Jade now updates accumulator element arrays correctly (was silently broken for Bloom/etc.)
- addSymbiontSpirit transcendence now uses correct powerLevel formula (was hardcoded 3)
- Mercury → transcendence chain confirmed as emergent design behavior

**Smaller items shipped:**
- Heart Chakra picker now filters editioned cards (UX defense-in-depth; apply-side already returned proper error)
- Shop card pool switched from baseCards to speculativeCards
- addSpiritDirect docstring updated to clarify 3 intentional use cases

**Items resolved by prior work (no F2.3 effort needed):**
- C19 (Grove fusion T4 routing): Grove UI removed entirely earlier
- C20, C21 (consumable inventory routing): F2.3.i
- C22 (Rooster max slots): already correct
- C23 (Tiger): tigerTriggered consumer already in GRM bank/push gate
- C26 (PastLife 1× negative): F1.8.b followup #9
- C27 (Heart Chakra over-edition apply-side): already correct
- D20 (Legacy consumables): F1.x cleanup

**Verification:** 9 of 11 priority tests passed in playtest. The 2 unverified (Past Life regression, _fireCuckooHatch regression) are verified by transitivity through other helper-based paths that did pass.

**Deferred:**
- F2.3.j (rarity tier expansion: Crow symbiont, colored stamps, generateRandomConsumable pool)
- F4.16 (system reorganization: move spirit-specific logic to SpiritEffects, fresh codebase snapshot recommended)
- F2.4 (dead `result.result === 'failed'` check in GRM)
- F4.14 (doc reconciliation entries)

**Cross-references:**
- F2.3.i, F1.x, F1.8.b followup #9 (prior work resolved most Slice 3 items)
- F4.14 (Design Doc V5 reconciliation accumulator) — minor doc-side changes
- F4.16 (spirit-logic seepage, deferred Phase 4 task added during F2.3 recon)

---

## D-F2.3-AUDIT — F2.3 full audit pass (Slice 3 + DESIGN_DOC §8 re-review)

**Status:** COMPLETE — All work shipped + verified 2026-05-15.
- Prompt A (Max Effort): description fixes, Crown Chakra, Cat zodiac, Lead alchemical, stamp tiers
- Prompt B (Max Effort): trigger-type-aware retrigger architecture, stamp tier-shuffle (Option C)
- Patch 1 (High Effort): `allRetriggerSpirits` regression fix + `'scoring'` → `'capture'` semantic merge
- Patch 2 (High Effort): Horse/Monkey discard-stamp dispatch via extracted `_dispatchStampDiscardEffects` helper
- Patch 3 (High Effort): Monkey scoring routing through `_addCapture`, Horse 1:1 refill + clear-before-dispatch order, empty-hand round-end helper

Three architectural issues with Monkey/Horse identified during final verification (Tests 6, 7, 11 failures) — accepted as known limitations, logged as F4.19 for Phase 4 cleanup. See F4.19 in OVERHAUL_PLAN.md for full scope.

**Session summary:** After F2.3 main shipped, Robert pushed back that we hadn't done a full audit pass on consumables the way we did for hexagrams. The retrospective audit surfaced 24 findings (B1-B24) — some doc-vs-code drift, some genuinely new design questions (Crown Chakra full-duplicate, stamp tier-shuffle, generic retrigger universality).

The Slice 3 audit document had become stale; recon showed many of its claimed bugs were already resolved by intermediate work. But the audit pass also identified real items not in the original Slice 3 audit (the trigger-type-aware retrigger architecture, the secondary-tier stamp shuffle design).

**Findings catalogue (B1-B24):**

| # | Item | Status |
|---|---|---|
| B1 | Heart Chakra "+5×mult" wording | ✅ Prompt A — fixed to "+5 additive mult" |
| B2 | Solar Plexus description | ✓ Already correct |
| B3 | Crown Chakra spec — full duplicate of reference | ✅ Prompt A — refactored + description updated |
| B4 | Third Eye max targets | ✓ Already correct |
| B5 | Wu Xing destructive cycle in descriptions | ✅ Prompt A — all 5 elements |
| B6 | Iron "held in hand" wording | ✅ Prompt A — folded into B5 Metal description |
| B7 | Wu Xing element costs uniform | ✓ Already correct |
| B8 | Booster pack mechanics | ✓ Acknowledged future feature |
| B9 | Stamp tier system (3 vs 4 tiers) | ✅ Prompt A — Gray → Quaternary, QUATERNARY_STAMPS export added |
| B10 | Primary→Secondary mixing recipes in STAMP_MIX | ✓ Code correct; doc update deferred to F4.14 |
| B11 | White/Gray universal retrigger across all event types | ⏳ Prompt B — trigger-type-aware architecture |
| B12 | Black "generic trigger" (any event) | ⏳ Prompt B — folded into Option C shuffle |
| B13 | Black redesign — Option C tier-shuffle pattern | ⏳ Prompt B — three-way rotation |
| B14 | Cat zodiac pool — common rarity not foundation tier | ✅ Prompt A — rarity-based, excludes symbionts |
| B15 | Zodiac entries all match doc | ✓ Already correct |
| B16 | Amber 3-stack restriction | ✓ Doc was wrong; code already supports 1/2/3-stack |
| B17 | Amber snapshotPower formula | ✓ Already correct |
| B18 | Pearl consume vs preserve | ✓ Doc was wrong; code consumes (correct design) |
| B19 | Lead 3-stack exclusion | ✅ Prompt A — removed exclusion, allows cascade |
| B20 | Lead description | ✓ Already correct |
| B21 | Alchemical costs | ✓ Already correct |
| B22 | Cat _forceCatTarget debug hook | ✓ Noted only |
| B23 | Snake stacking semantics | ✓ Intentional design (uncapped) |
| B24 | Description format consistency | ✓ Deferred (stylistic) |

**Prompt A shipped + verified (2026-05-15):**

Max Effort ship. Touched consumables.js (6 descriptions), stamps.js (1 tier rename + 1 new export), RunManager.js (1 method body — Crown Chakra), ConsumableEffects.js (2 simplifications — Cat + Lead). Build clean. Preserved `target.crownConverted = true` flag that wasn't in the original prompt but was needed for game tracking.

**Prompt B shipped + verified with follow-up patch (Max Effort + High Effort patch, 2026-05-15):**

Larger architectural change. Two coupled items:

1. **Trigger-type-aware retrigger architecture:**
   - New `getRetriggerCount({ card, spirit, spirits, triggerType })` API signature
   - Five trigger types: 'scoring', 'held_in_hand', 'capture', 'discard', 'yaku'
   - Existing spirits (Dew/Wish/Family/Rainbow) filter to 'scoring' only
   - Applause migrates from direct `_applauseCount` lookup to `getRetriggerCount` with 'held_in_hand' guard
   - Mirror/Memory pass triggerType through delegation (inherit target's scope)
   - New `_computeRetriggerCount(card, triggerType)` helper on GRM centralizes lookups
   - White/Gray universally apply to any trigger type
   - Phase 1.5 scoring loop, held-in-hand mult loops, and `_computeEarthKiBonus` all use the helper

2. **Stamp tier-shuffle (Option C):**
   - Within-pair trigger swap at Secondary tier (Orange/Green/Purple)
   - Three-way trigger rotation at Tertiary (Black)
   - Gray = Tertiary + universal retrigger
   - GRM capture/discard/yaku stamp dispatchers restructured with shared `fireCount = 1 + retrigger` pattern
   - stamps.js descriptions updated to reflect multi-trigger nature

**Prompt B follow-up patch (2026-05-15):**

Patch addressing two items surfaced by Prompt B verification:

1. **Bug fix:** Phase 1.5 scoring inner loop had stale `allRetriggerSpirits` reference (caused `ReferenceError` mid-round when retrigger spirits equipped). Inlined `run.allSpirits` at use site.

2. **Design merge (`'scoring'` → `'capture'`):** Robert recognized that scoring math and capture-trigger stamp effects fire in the same atomic capture event. Architectural separation into two trigger types was conceptually wrong. Merged into one trigger type `'capture'` — rank retrigger spirits (Dew/Wish/Family/Rainbow) now compound BOTH scoring math AND capture-trigger stamp effects on matching cards. Enables build interactions like Dew + Yellow plain = +6 ki per capture.

Four trigger types now: `'capture'` (scoring + capture-trigger stamps), `'held_in_hand'`, `'discard'`, `'yaku'`.

**Loop consolidation deferred to F4.18:** The patch unifies trigger-type semantics but does NOT consolidate the two underlying loops (Phase 1.5 scoring + capture-trigger stamp dispatcher). That's logged as F4.18 — capture-event dispatch consolidation, bundled with F4.15/F4.16/F4.17 cleanup work. F4.18 also carries a design-revisit note: at consolidation time, Robert wants to reconsider whether merged or separated trigger types produces better gameplay, based on playtest evidence.

**Verification (14 tests, all passed):**

- Tests 1-9: Prompt B base verification (Dew + plain scoring, Dew not retriggering held-in-hand, Applause + Iron, white-stamped Iron, white + Applause + Iron, Gray-stamped plain + Dew, Orange/Green/Purple shuffles, Black/Gray full coverage, regression on Yellow/Red/Blue)
- Tests 10-14: Patch-specific (Dew + Yellow plain compounds ki, Wish + Orange ribbon compounds draw, Family + Yellow animal, Rainbow + Yellow bright, regression on Applause + Iron + Dew scope isolation)

All 14 verified clean.

**Design decisions locked in during audit:**

- **Crown Chakra:** Reference card's full attributes (rank, month, axes, enhancement, stamp, edition) copied to target. Target becomes exact duplicate. Target's deck-slot id preserved.
- **Cat zodiac:** Pool by rarity (`s.rarity === 'common'`), not by tier. Excludes symbionts (acquired via Symbiosis only).
- **Lead alchemical:** Pool by `s.rarity === 'rare'` only. No exclusion for 3-stack-with-negative — allows cascade transcendence.
- **Stamp shuffle (Option C):** Consistent within-pair swap at Secondary, three-way rotation at Tertiary. Effects shift triggers, not magnitudes.
- **Black under shuffle:** Captured → consumable, Discarded → draw, Yaku → +3 ki.
- **Universal retrigger families:**
  - White/Gray: universal (any event type)
  - Rank-specific 'capture': Dew/Wish/Family/Rainbow (compound both scoring math AND capture-trigger stamps)
  - Held-in-hand: Applause (held_in_hand only)
  - Future spirits may retrigger discard/yaku — architecture supports
- **Retrigger compounding:** Additive (matches current Phase 1.5 behavior). Dew + White-stamped plain = 3 scorings (1 base + 1 Dew + 1 White), not 4.

**Deferred:**
- F4.14: Doc reconciliation entries (Crown Chakra full-duplicate, stamp 4 tiers, primary→secondary mixing, Cat common pool, Amber 1/2/3-stack, Pearl consume, Lead no exclusion, Iron held-in-hand, Earth held-in-hand)
- F2.3.j: Rarity tier expansion (Crow symbiont, generateRandomConsumable pool, colored stamps' rarity tiers)
- F2.3.k: Pink/Cream/Sky white-pair stamps (if pursued)
- F4.16: System reorganization (spirit logic seepage)


---

## F2.1 audit closure (2026-05-15)

The F2.1 (spirit catalog audit) work spanned multiple phases:

**F2.1 Phase A (shipped 2026-05-15):** 6 surgical changes. Removed deprecated `util_irrigation` data entry + inline GRM scoring block + RunManager state init. Renamed `engine_irrigation` → `util_irrigation` for naming pattern consistency with other rank utilities (`util_glory`, `util_symbiosis`, `util_festival`). Updated spirits.js header comment to reflect 113-spirit catalog. Updated Bonds description to remove misleading "+25% cap" claim. Set `rarity: null` on four non-functional spirits (`econ_replica`, `econ_print`, `econ_collector`, `game_echo`) to temporarily remove from shop pool. Fixed Echo channel ('gameplay' → 'retrigger') and Past Life channel ('utility' → 'meta').

**F2.1.b (shipped 2026-05-15):** Implementation of Echo, Replica, Collector (Print deferred to F5.9). Major additions:
- New spirit hook system: `_fireSpiritHook(hookName)` on GRM, with `onRoundStart` and `onRoundEnd` hooks. Fires at startRound() and all 4 round-over transitions (bankScore, natural playDeckPhase, _forceAutoBank, _checkRoundEndOnEmptyHand).
- Spirit sell-price refund infrastructure: `sellPriceBonus: 0` initialized on spirit creation. `releaseSpirit` refunds `Math.floor(cost/2) + sellPriceBonus`. `sellConsumable` includes bonus.
- Echo: pure stateless retrigger via new `isFirstCardOfCapture` parameter on `_computeRetriggerCount`. Retriggers first card scored of each capture event 2× per stack.
- Replica: round-start hook duplicates random consumable from inventory, N copies per stack.
- Collector: round-end hook adds `effectivePower(spirit)` to `sellPriceBonus` of every owned spirit + consumable (self-included).

**F2.1.c (shipped 2026-05-15):** Two surgical fixes from audit verification:
- `capstone_time` description updated: "Flow does not decay between rounds. Push success amplified ×1.5. Push failure dampened ×0.5."
- `util_irrigation` immediate bonus stack-scaled: `addPoints` now matches permanent mutation's stack scaling.

**Speculative-bound symbiont playtest results (2026-05-15):**
- **Wolf** (sourceAnimal: january_bear): All 5 tests pass. ×2/×4/×6 scaling confirmed. **S-021b retracted** — Wolf's stacking works correctly via per-element invocation of `onCardScored`.
- **Garden** (sourceAnimal: march_ladybugs): Garden working as designed. Initial bug observation traced to upstream issue: enhancement application modifies ALL matching cards by ID instead of specific instance. Logged as F4.22.
- **Badger** (sourceAnimal: december_fox): All 5 tests pass. Pattern Z works correctly via per-element state mechanism.

**Verification recon findings:**

- **S-021 retracted entirely:** Engine stack scaling works correctly via per-element state mechanism (`incrementPerElement` writes to all elements, `aggregateNumericState` sums across). Architectural concern (two patterns X and Y) logged as F4.20 sub-investigation.
- **S-022 resolved:** Capstone Time fully implemented. Code does: flow decay prevention + push success delta ×1.5 + push failure delta ×0.5. Doc had wrong numbers; description was vague. F2.1.c shipped the description fix; F4.14 carries the doc-side correction.
- **S-023 resolved (Path 3):** `util_irrigation` immediate +3 was inconsistent with permanent +3 stack scaling. Path 3 chosen: make immediate stack-scaled. Both immediate AND permanent now use `3 * effectivePower(spirit)`.
- **S-024 confirmed intended:** Decay spirits use single-counter pattern (state.remaining decremented per round). Stack count multiplies magnitude not duration. Negatives have frozen state. No fix needed.

**Discovered architectural issues (logged for Phase 4):**

- **F4.20** — Migrate spirit effect logic from GRM/RunManager into SpiritEffects.js. Includes hook migration scope (Crow's `bankScore` block, Osprey/Catcher's `startRound` state resets) and stacking pattern consolidation evaluation.
- **F4.21** — Spirit ID system normalization (legend_* prefixes for demoted rares, channel taxonomy review).
- **F4.22** — Duplicate card ID handling: Animal Deck systemic bug discovered via Garden investigation. Enhancement application modifies all matching cards by ID. Capture pile/yaku counting merges duplicates. Affects every system that uses `card.id` as identity. Major Phase 4 work, must precede F5.2 save game.
- **F4.23** — Spirit sale-price architecture: three separate sale paths exist (releaseSpirit, ShrineScene stack-sell button, sellLegendarySpirit), each computing refunds independently. Per Robert's design call, bonus should apply per stack member (since players can sell individual members). Per-element sale prices align with existing per-element state pattern.

**Phase 5 features:**
- **F5.9** — Print spirit (consumable applier mechanic, locked design with per-round throughput).
- **F5.10** — Consumable stacking system + Waidan removal.
- **F5.1** — Sale-price magnitudes, Bonds base value, Irrigation tuning all added to Phase 5 tuning scope.

**Collector known limitation:**

Collector accumulates `sellPriceBonus` correctly on owned spirits and consumables. The bonus applies correctly when releasing via the "Release" confirmation dialog (Path 1, fixed in F2.1.b). However:
- The ShrineScene "Sell Y¥X" stack-sell button doesn't include the bonus in display or refund (Path 2 uses its own formula).
- The Release confirmation dialog logs "+0 ki" instead of the actual refund amount (logger fix missed in F2.1.b).
- The `sellLegendarySpirit` method (Path 3) hasn't been verified.

These are tracked under F4.23 and will be resolved when the three sale paths are unified.

**F2.1 audit officially closed 2026-05-15.** All findings either shipped, deferred to Phase 4/5, or retracted. Phase 2B continues with F2.1 work concluded.


---

## D-F4.24-ORDERING — F4.24 ordering fork resolved: diagnostic audit vs. terminal reference (2026-06-04)

**Status:** DECIDED 2026-06-04 (first Phase 4 work session).

**Context:** Phase 4 Tier 1 opened with F4.24 (architecture catalogue). On reading the
two planning documents together, a direct contradiction surfaced:

- **`PHASE_4_TASK_ORDERING.md`** places F4.24 as **T1.a — the first task**, on a
  map-first thesis: "establish the structural map other tasks migrate INTO" so every
  downstream consolidation has a documented target and the reinvention risk is lowest.
- **`OVERHAUL_PLAN.md`'s F4.24 entry** schedules it **late Phase 4 / early Phase 5**, on a
  map-last thesis: "Running F4.24 BEFORE Phase 4 cleanup would mean documenting tech debt;
  running it AFTER produces the canonical reference."

Both positions are defensible and point opposite directions. The fork is real, not a
wording slip.

**Root insight (Robert, 2026-06-04):** The two docs aren't describing the same task. The
mechanical step (exhaustively enumerate the codebase) is identical, but it serves two
*different documents with different purposes*:

- A **diagnostic map** — "here is everything, including everything wrong with it." Its value
  is as a worklist and a reinvention-guard *during* the migrations. Section 7 (spirit-logic
  seepage) and Section 8 (observations) are punch-list items, not reference content.
- A **prescriptive map** — "here is how the architecture works and how to build on it." Its
  value is onboarding and drift-prevention, and it can only be written against a *stable*
  structure.

The original F4.24 meant the prescriptive map. What we ran on 2026-06-04 was the diagnostic
map. They share a backbone (file manifest, hook tables, dependency graph), which is why
running the enumeration once up front pulls double duty: it feeds the migrations now AND
seeds the prescriptive doc later. The original task spec didn't anticipate that the audit
and the reference share a backbone, which is the source of the apparent contradiction.

**Decision — F4.24 is reframed into three roles for one mechanical sweep:**

1. **F4.24a — Diagnostic checkpoints (RECURRING).** Read-only enumeration sweeps run by
   Claude Code. Run at:
   - Phase 4 start (DONE — shipped as `docs/process/F4.24_inventory_pass1.md`, 2026-06-04)
   - The end of major architectural chunks (end of Tier 2, end of Tier 3, and any other
     point where a fresh structural view is warranted before the next wave builds on it).
   Each checkpoint is a **disposable snapshot**. Its job is to (a) surface the current
   worklist and (b) verify the prior chunk's consolidation actually landed where intended.
   Shrinkage of Section 7 (seepage) and Section 8 (observations) across successive snapshots
   IS the Phase 4 progress metric.

2. **F4.24b — Prescriptive reference (TERMINAL).** The `docs/ARCHITECTURE.md` companion doc
   (separate from DESIGN_DOC_V5.md — see below). Written ONCE, late Phase 4 / early Phase 5,
   against the stabilized end-state. Contains the org map, hook reference, helper reference,
   "if you need X, use Y" recipes, state-model narrative, and anti-patterns. Does NOT contain
   diagnostic punch-list content.

3. **Shared backbone.** The file manifest, hook tables, and dependency graph that every
   checkpoint regenerates and that ultimately carry into F4.24b. Only the seepage/observations
   sections get "consumed" by the migration work and drop out of the final reference.

**Refinements:**

- **Container decision:** `ARCHITECTURE.md` as a separate `/docs/` companion doc, NOT a new
  section in DESIGN_DOC_V5.md. Rationale: it's a developer-facing implementation map (different
  audience and different churn cadence from the design doc), and keeping it separate avoids
  bloating the very doc F4.14 is working to make trustworthy. (Resolves the open
  "main-doc-section vs companion-doc" question in F4.24's spec and in DESIGN_DOC_PATCHES DP-61.)

- **Diff-against-prior-snapshot:** Each recurring checkpoint after Pass 1 should be reported as
  a DELTA against the previous `F4.24_inventory_passN.md`, not read fresh. The valuable output
  of the Tier-2-end sweep is "here are the seepage sites that REMAIN and the new ones the
  migration INTRODUCED" — not the full list re-printed. Checkpoint prompts will instruct
  Claude Code to compare against the prior snapshot and report what changed.

- **Staleness is expected, not a defect.** Pass 1 is a 2026-06-04 snapshot; its `file:line`
  references go stale the moment Tier 2 starts relocating logic. This is fine — a diagnostic
  map is meant to be consumed and discarded as work proceeds. We do NOT treat Pass 1 as a
  living reference to keep current. The *living* reference is the terminal `ARCHITECTURE.md`.

**Cross-references:**
- `PHASE_4_TASK_ORDERING.md` T1.a (map-first thesis — satisfied by the Pass 1 diagnostic)
- `OVERHAUL_PLAN.md` F4.24 (map-last thesis — satisfied by terminal F4.24b)
- `DESIGN_DOC_PATCHES.md` DP-61 (container question — resolved: companion doc)
- `F4.24_inventory_pass1.md` (the Pass 1 diagnostic snapshot)

**Worklist seeded by Pass 1 (for downstream tasks):**
- Section 7 seepage table → F4.16 / F4.20 migration surface (broader than OVERHAUL_PLAN's
  original ~14-stub list; includes engine_glacier/carbon/fossil tier tracking, sym_ducks
  multValue, sym_ants/engine_moths/engine_palace counters, decay_* decrements, etc.)
- 23 empty `{}` stubs → split into migratable (econ_*, util_glory, util_symbiosis) vs.
  structurally-bound (capstone_*, legend_gankyil, legend_waidan); both outcomes documented
  in F4.24b
- Section 8 observations → F4.7 (dead `modifyInitialFlow` hook + incomplete hook header),
  F4.34 (vestigial SNOW_MULT/ICE_MULT exports), F4.1 (crash-on-run test-run.js), F4.17/F4.18
  (duplicated discard/decay/crow logic across bank vs finalizeTurn), F4.37/F4.36
  (spiritTooltip 30-case switch), F4.21/F4.28 (dual spirit-init paths in RunManager)
- 3 import cycles (RunManager↔HexagramEffects, RunManager↔SpiritEffects, transitive via
  ScoringEngine) → note for F4.29 (hook-firing centralization) / general structural awareness

---

## D-F4.20-TIER2 — Tier 2 spirit-logic migration kicked off; triage ledger + Glory shipped (2026-06-05)

**Status:** IN PROGRESS. Migration #1 (Glory) CLOSED-VERIFIED. Triage ledger banked.

**Context:** Phase 4 Tier 2 ("put things where they belong") migrates self-contained,
event-triggered spirit logic out of GameRoundManager/RunManager into SpiritEffects.js.
Scoping was done via a full triage of the 23 empty `{}` stubs + Section 7 inline seepage
sites from the F4.24a inventory, read against live source.

**Triage outcome (see `F4.16_F4.20_triage_ledger.md`):**
- Bucket A (MIGRATE — self-contained, event-triggered): 9 spirits.
- Bucket B (DOCUMENT-ONLY — formula term / structural; upgrade comment, don't move code): 6,
  passing all three bucket-B conditions (term in a core-owned formula; lifting requires new
  indirection; clearer left in place). Almost entirely the economy-interest cluster
  (econ_bonds/ingot/piggybank/coupon) + the two structural legendaries (gankyil/waidan).
- Bucket T (HAS ITS OWN TASK): Past Life + Cuckoo Egg → F4.27; capstones → scoring-loop;
  util_symbiosis → F4.20 but flagged highest-risk, do LAST.
- Bucket N: Wu Xing trackers → F4.38; counter spirits → second migration wave.

**Key architectural decision — the return-intent hook pattern (Option 1):**
Spirit effects that mutate GRM-owned objects (deck, hand, ki) do NOT receive a handle to
those objects. Instead the spirit hook RETURNS A DECLARATIVE INTENT and GRM EXECUTES it.
Mirrors the existing `onCardScored` pattern (spirit returns `{ addMult }`, GRM applies).
Rationale: keeps mechanism ownership with the core system, keeps SpiritEffects declarative,
does not deepen the RunManager import cycle. This is the template for ALL bucket-A migrations
(`onCaptureComplete` returns `{ draw }`; future hooks add `{ addKi }`, `{ captureToHand }`,
etc. to the same GRM-side dispatcher loop). Chosen over passing the round handle into the
hook (Option 2), which would deepen coupling and break the return-intent precedent.

**Migration #1 — util_glory (F4.20 #1): CLOSED-VERIFIED.**
- Added `onCaptureComplete({ cards, spirit, run })` return-intent spirit hook + a generic
  post-capture dispatcher in `GameRoundManager._addCapture` (replaces the inline id-checked
  Glory loop). Glory returns `{ draw: 2 }` on bright capture.
- BEHAVIOR PRESERVED EXACTLY: draws a flat 2, NOT 2×stacks. (The inline code drew flat 2;
  tooltip renders draws×stacks — a pre-existing discrepancy, flagged with a TODO in code,
  NOT resolved in this migration. Reconcile later — see ledger / F4.x.)
- Commit 441b52e. Two-file diff (SpiritEffects.js, GameRoundManager.js). Build green.
- Verified in-game by Robert (2026-06-05): bright capture draws 2; empty-deck draws 0 with
  no error; **2-stack Glory still draws flat 2, not 4** (the behavior-preservation check).

**First-wave execution order (next migrations, all reuse the return-intent pattern):**
1. ~~util_glory → onCaptureComplete~~ ✅ DONE
2. sym_crow → onRoundEnd (also eliminates the bank-vs-finalizeTurn duplication, Obs §8)
3. econ_reward → onPushSuccess (spirit-side mirror of existing hexagram hook)
4. sym_ants → onCardPlayed (new hook in playHandCards)
5. discard cluster: econ_recycling + engine_ship + game_catcher → onFieldDiscard
   (may return `{ consumed }`; coordinate with F4.17 — this hook IS F4.17 groundwork)
6. document-only sweep for bucket B + bucket-T document-only items (comment upgrades, zero
   behavior change)
Deferred to own tasks/waves: util_symbiosis (last, highest-risk), Past Life/Cuckoo Egg
(F4.27), Wu Xing trackers (F4.38), counter-spirit second wave.

---

## D-TEST-HARNESS — Headless test harness adopted: Vitest + makeRound() helper (2026-06-05)

**Status:** DECIDED + SHIPPED 2026-06-05.

**Context:** Phase 4 Tier 2 migrations need automated regression tests. Manual in-game
verification is slow and fragile — each migration requires rolling the shop for a specific
spirit, hand-engineering in-round conditions, and eyeballing outcomes. A headless harness
that drives the engine under Node would let each migration ship with an automated test that
runs in seconds.

**Recon verdict: GREEN.** The entire `src/systems/` + `src/data/` import graph is
browser-free at module top level. `GameRoundManager` and `RunManager` import and construct
cleanly under plain Node with zero shimming. The two `window.__run` assignments in
RunManager are guarded by `typeof window !== 'undefined'`; the `navigator.clipboard` call in
GameplayLogger is inside a method (never called at import time). No `src/systems/` or
`src/data/` file imports Phaser or touches the DOM.

**Decision:**
- **Runner:** Vitest (dev dependency). Shares Vite's ESM resolution, near-zero config,
  auto-discovers `test/**/*.test.js`. No `vitest.config.js` needed.
- **Production seams:** ZERO. No changes to any `src/**` file. The engine is testable as-is.
- **Deterministic deck:** `Math.random` is stubbed via `vi.spyOn(Math, 'random')` during
  `startRound()` so the Fisher-Yates shuffle is a no-op and the deal order matches the
  `deckCardIds` array exactly. The stub is restored before the round is driven so in-round
  randomness (procs, break rolls) behaves normally.
- **Test isolation:** `run.reset()` between tests (the RunManager singleton is shared mutable
  state; `reset()` fully clears all run state).

**Helper: `test/helpers.js` → `makeRound({ spiritIds?, spirits?, deckCardIds })`**
Sets up `run` with the requested spirits, seeds the canonical deck in exact order, constructs
a `GameRoundManager`, drives `startRound()` with deterministic shuffle, returns `{ grm, run }`.
Tests then call `grm.playHandCards()` / `grm.playDeckPhase()` and assert on public getters
(`grm.deck.drawPileSize`, `grm.scoringEvents`, `grm.capture.getAll()`, etc.).

**Assertion convention:** Do NOT assert on `grm.hand.size` to measure a spirit's draw effect
(hand size is net of draws + plays + yaku-spends + hand-size cap — too many systems touch it).
DO assert on the SPECIFIC scoring event the effect emits (`glory_draw`, etc.) plus the
resource it DIRECTLY moves (deck size delta).

**Shipped:** commit c4fee6b. Files: `test/helpers.js`, `test/glory.test.js` (3 cases),
`package.json` (scripts + vitest dep). All 3 Glory regression tests pass (346ms). Case 3
(2-stack Glory draws flat 2, NOT 4) is the behavior-preservation check.

**Going forward:** every Tier-2 migration ships with a regression test using `makeRound()`.
The test is part of the migration's "done" criteria, not a separate task.

---

## D-F4.18b — Round-end pipeline unification campaign COMPLETE (2026-06-05)

**Status:** COMPLETE (6/6). Branch `f4.18b-pre-unification` (commit 0fe6733) retained as a
revert point until in-game verification confirms the GameScene end-screen integration.

**Context:** What began as a single F4.20 spirit migration (Crow) surfaced — via a dedicated
recon (`docs/recon/round_end_pipeline_recon.md`) — that the codebase had **four** parallel
round-end pipelines, not the two assumed: bank (`bankScore`), natural + forced-auto-bank
(`_finalizeTurn`), and a severely stripped consumable-empty-hand path
(`_checkRoundEndOnEmptyHand`, "1D"). The 1D path fired only the onRoundEnd hooks and skipped
flow decay, post-round enhancements, logging, field scoring, and every round-end spirit
tenant — a real gameplay bug (a round ended via Horse/Monkey lost flow decay, card mutations,
and spirit effects). This promoted the work from a single migration to a Tier-3 pipeline
consolidation (provisionally F4.18b), braided with the F4.20 tenant migrations.

**Strategy (recon verdict: DRIFTED, risk LOW):** migrate every inline round-end tenant into
hooks FIRST, then unify. Once the tenants lived in hooks that already fire on all paths, the
four teardown sequences became near-identical and the unification was a mechanical merge.

**Campaign steps (each shipped + headless-tested):**
1. `sym_crow` → `onRoundEnd` hook [FIX: now fires on 1D]. Commit e2d85e4.
2. `decay_persimmon`/`decay_pear` decrement → `onRoundEnd` [FIX: now fire on 1D]. Commit 986173c.
3. `engine_lincoln` → new `onBank` hook [PRESERVE: bank-only]. Commit 595a4e1.
4. `engine_napoleon` → new `onPushFailure` hook [PRESERVE: natural-push-failure-only]. Commit 0fe6733.
   (+ centralized `equipSpiritWithState` test helper, retiring per-file init copies.)
5. Snails decision: resolved into step 6 — `_trackSnailsUnplayed` joins the unified teardown,
   fires on all triggers including 1D.
6. Unification: `_endRound(trigger)` + `_buildRoundEndResult(trigger, flow, ctx)`. All four
   call sites route through it. Commit 1893f0e.

**Key architectural decisions:**
- **Return-intent / lifecycle hook pattern** (from the F4.20 ledger) extended with two new
  lifecycle hooks: `onBank` (explicit-bank-only) and `onPushFailure` (natural-round-over-with-
  push-penalty-only). These are deliberately NOT `onRoundEnd` — they fire on a specific
  sub-condition, which is why each tenant got the semantically-correct hook rather than reusing
  the general round-end hook. Documented in the SpiritEffects.js lifecycle header.
- **1D omissions treated as bugs to FIX, not behavior to preserve.** Migrating a tenant into
  `onRoundEnd`/snails inherently makes it fire on the 1D path (where `_fireSpiritHook` already
  ran). This is desired. Every such [FIX] was called out in its commit and asserted in tests
  (the 1D bug-fix case). Bank/natural behavior was strictly PRESERVED.
- **Flow capture normalized to POST-decay** in the unified return (bank already did this;
  natural captured pre-decay). Safe because GameScene reads `run.flow` live, not `result.flow`
  (confirmed in recon Section 6).
- **Vestigial fields removed:** `pushEscalation` and `nextFailFlow` (recon confirmed GameScene
  reads neither). The non-round-end `_finalizeTurn` exits (yaku_decision/ok/idle) were left
  UNCHANGED — only the round-ending branch routes through `_endRound`.
- **Teardown order:** unified on bankScore's canonical sequence (the most-exercised path). No
  order conflict existed — the core teardown was already identical across bank and natural.

**Verification:**
- 28 headless tests pass, 1 skipped. New `test/round_end_unification.test.js` drives all four
  triggers and asserts the core teardown ran on each, plus return-contract preservation.
- **Open: case 3 (forced-auto-bank) is SKIPPED** — needs the `yaku_ends_round` hexagram set up
  headlessly. The path is exercised by code but not yet test-covered. Follow-up: add the test
  or verify in-game.
- **Recommended: in-game verification** of an actual bank and an actual natural round-end
  screen, since the headless harness cannot see the GameScene end-screen rendering integration.
  The return-field diff indicates safety, but this closes the loop on the one thing tests can't.

**Strategic insight (Robert, 2026-06-05) — reorganization is iterative, not terminal:**
Several foundational-mechanic-changing hexagram modes (e.g. hex_29 rank-matching, which
disables yaku and changes capture rules; and other under-developed modes) need Phase 5 design
work. That new design WILL generate new code that subsequently needs its own audit and
reorganization. Architectural cleanup is therefore not a single terminal pass — it interleaves
with design, and each round of design creates new debt. This reinforces:
- F4.24b (the prescriptive `ARCHITECTURE.md`) should be written LATE, against stabilized code,
  AFTER the mechanic-changing modes are fleshed out — otherwise it documents an architecture
  Phase 5 immediately churns.
- The recurring F4.24a diagnostic-checkpoint model (vs. a one-shot terminal doc) is the right
  shape precisely because of this iteration.
- Expect future "campaigns" like F4.18b: a recon surfaces that a planned-linear task is
  actually a braided consolidation. The linear plan is a hypothesis about dependencies; recon
  routinely revises it. The discipline is deliberateness about scope + rigorous documentation,
  NOT adherence to the original linear sequence.

**Cross-references:**
- `docs/recon/round_end_pipeline_recon.md` (the mapping that drove the campaign)
- `docs/process/F4.18b_campaign_ledger.md` (step tracker)
- D-F4.20-TIER2 (the return-intent pattern this campaign extended)
- F4.17/F4.18 (sibling pipeline-consolidation tasks; F4.18b is the round-end instance)
- Branch `f4.18b-pre-unification` (revert point)

---

## D-F4.17 — Discard pipeline unification campaign COMPLETE (2026-06-06)

**Decision:** Route EVERY discard site through one canonical `_discardCard(card, source)` /
`_discardCards(cards, source)` on GameRoundManager, so a discard fires the same complete set
of effects regardless of source. Design principle (Robert): **all discards are equal.**
Ran as a 5-step migrate-then-unify campaign (same shape as D-F4.18b), each step independently
shippable + headless-tested.

**Sites unified (the asymmetry matrix, all rows now ✅):** deck-overflow (`_handleFieldDiscard`,
now `_discardCard`), hand-play overflow, hex_51 reveal-miss, `zodiac_horse`, `zodiac_monkey`,
`zodiac_ox`. Each fires: catcher gate → bookkeeping (`_discardedThisTurn`/`_allDiscards`/
`_discardCount`) → `onFieldDiscard` hooks (recycling, ship) → stamp dispatch.

**Decisions locked + applied:**
1. **Stale premise corrected (recon).** The planned F4.17 (OVERHAUL_PLAN) claimed hex_51
   reveal-miss BYPASSES the discard effects. In current code it does NOT — it already routed
   through `_handleFieldDiscard` and fired the full set. The feared "TANGLED" risk was absent;
   verdict was DRIFTED, close to CLEAN. (This matches OVERHAUL_PLAN's own hex_51 status note
   at the bottom of the doc, which already said "unified reveal-miss with `_handleFieldDiscard`."
   The F4.17 entry's "bypasses" framing was the stale part.)
2. **`game_catcher` is a GATE, not a hook.** It decides WHETHER to discard (short-circuits
   before bookkeeping); recycling/ship REACT to a committed discard. `onFieldDiscard` carries
   only post-commit side-effects. Catcher now intercepts on ALL sources (Robert: YES).
3. **`zodiac_ox` IS a full discard.** Catcher rescuing a swept stranded stack to HAND is Ox's
   signature recovery mechanic — the only way to pull stranded field cards back into hand.
   (Reverses the old "leave Ox as-is" tentative note in the planned entry.)
4. **Bookkeeping uniformity is a deliberate [FIX].** Consumable discards (Horse/Monkey/Ox)
   previously skipped `_discardCount`/`_discardedThisTurn`; now they count. `roundDiscardCount`
   reporting changed accordingly (confirmed wanted).
5. **Ki reason unified:** `recycling_overflow` → `recycling_discard` (single reason; zero
   `recycling_overflow` hits remain in `src/`).
6. **Report reality, not intent:** result `discarded`/`discardedCards` + status messages
   reflect the actually-discarded subset (catcher-rescued cards excluded). Without this, a
   rescued card would falsely animate to the discard pile (hand-overflow → GameScene).

**Emergent composition (Horse × catcher), no special code:** Horse's rule stays "redraw the
number discarded"; catcher rescues at discard-time; `HandManager.add` clamps to the cap. The
three compose: full-hand + catcher = anti-synergy (end 8, leftover stays in deck);
short-hand + catcher = synergy (rescued card is a bonus). "Consistency over convenience" —
each system keeps its one rule.

**Notable correction during step 5 (deviation from the step prompt, flagged):** the prompt
said keep Horse's redraw flat (`min(handSize, drawPile)`) and rely on `add`'s clamp, asserting
"no clamp math needed; leftover stays in deck." **Verified false:** `DeckManager.draw(n)`
*splices* the pile, so an over-draw is removed-then-dropped (the card is LOST, not left in
deck) — contradicting the prompt's own worked outcome. Resolved by honoring the outcome:
redraw `= min(handSize, drawPile, _hand.availableSlots)` (standard push/bank draw-what-fits).
Identical to the old flat redraw when no catcher (hand empty → availableSlots ≥ handSize).

**Observation filed:** `HandManager` constructor JSDoc said "throws a RangeError" beyond
maxSize — stale; `add()` silently clamps. Corrected the doc in this campaign.

**Cross-references:**
- `docs/recon/discard_pipeline_recon.md` (the mapping + asymmetry matrix that drove it)
- `docs/process/F4.17_campaign_ledger.md` (step tracker, per-step notes)
- D-F4.18b (sibling round-end campaign; same migrate-then-unify shape)
- D-F4.20-TIER2 (the return-intent hook pattern `onFieldDiscard` follows)
- Tests: `test/spirits/discard_{field_hooks,hand_overflow,monkey,horse_ox}.test.js`
- Branch `f4.17-pre-fixes` @ f4e46fd (revert point — last all-[PRESERVE] state, retained
  until the batched in-game verification session alongside `f4.18b-pre-unification`)
