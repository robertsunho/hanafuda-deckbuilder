# Hanatu — Design Document V5

*Version 5 — May 4, 2026*

**Tech stack:** Phaser.js + Vite, ES modules
**Project location:** `C:\Users\rober\hanafuda-deckbuilder\`
**Branch:** `ui-overhaul`
**Solo developer:** Robert
**Implementation assistance:** Claude (Anthropic)

This document supersedes V1 (Feb 2026), V2, V3, and V4 (Mar 2026). It reflects the current state of the game as of May 2026, after a substantial systems-implementation phase, UI overhaul, and codebase cleanup chapter. Earlier versions are preserved as historical artifacts but should not be treated as authoritative.

V5 serves two audiences: (1) future Claude sessions picking up work after compaction, and (2) Robert's own thinking artifact. External-facing materials should be derived from this doc with appropriate filtering.

---

## Table of Contents

**1. Game Overview**

**2. Card System**
- 2.1 The Deck
- 2.2 Base Deck — Full Card Listing (48 Cards)
- 2.3 Speculative Cards (13 cards)
- 2.4 Ribbon Colors (Updated)
- 2.5 Animal Subtypes
- 2.6 Seasons
- 2.7 Axis Distributions
- 2.8 Tag System
- 2.9 Persistent Deck State
- 2.10 ID Naming Legacy
- 2.11 Card-Level Modification Systems (Overview)
- 2.12 Card Dimensions and Rendering

**3. Game Elements**
- 3.1 Hand
- 3.2 Deck
- 3.3 Field and Field Slots
- 3.4 Capture Pile
- 3.5 Banked Pile
- 3.6 Discard Pile
- 3.7 Spirit Slots
- 3.8 Consumable Slots
- 3.9 Legendary Slots
- 3.10 Element Summary

**4. Core Gameplay Loop**
- 4.1 Round Structure
- 4.2 Matching Rules
- 4.3 Hand Plays — Multi-Card
- 4.4 Push-Your-Luck
- 4.5 Round End Conditions
- 4.6 Deck Exhaustion

**5. Scoring System**
- 5.1 Per-Capture Pipeline
- 5.2 Score Is Frozen At Capture
- 5.3 Yaku As Gates (Not Scoring)
- 5.4 Flow
- 5.5 Proportional Yaku Thresholds
- 5.6 Style Combos (Flow Contributors)
- 5.7 Spirit Contributions and Chain Order
- 5.8 Per-Capture vs Per-Round Effects
- 5.9 Round End Scoring
- 5.10 Naked Scoring Range
- 5.11 Scoring Architecture Notes

**6. Run Structure**
- 6.1 Acts and Rounds
- 6.2 Sacred Grove Cadence
- 6.3 Run End Conditions
- 6.4 Hexagram Scoping (Reminder)
- 6.5 Threshold Curve Status

**7. Spirits**
- 7.1 Spirit Acquisition Paths
- 7.2 Stacking and Transcendence
- 7.3 Channel Taxonomy
- 7.4 May/September Animal Naming Note
- 7.5 Foundation Spirits
- 7.6 Engine Spirits
- 7.7 Conditional Spirits
- 7.8 Retrigger Spirits
- 7.9 Rank Utility Spirits
- 7.10 Economy Spirits
- 7.11 Gameplay & Meta Spirits
- 7.12 Demoted Rares
- 7.13 Tier 1 Legendary — Gankyil
- 7.14 Tier 2 Fusion Spirits
- 7.15 Tier 3 Cross-Fusion Spirits
- 7.16 Tier 4 Capstone Spirits
- 7.17 Symbiont Spirits

**8. Consumables**
- 8.1 Chakra Tools
- 8.2 Wu Xing Elements
- 8.3 Editions
- 8.4 Stamps
- 8.5 Zodiac Consumables
- 8.6 Alchemicals
- 8.7 Consumable Acquisition Paths
- 8.8 Strategic Notes and Cross-System Synergies

**9. Hexagrams**
- 9.1 System Mechanics
- 9.2 Double-Trigram Hexagrams (The 8 Most Game-Changing)
- 9.3 Full Hexagram Catalog
- 9.4 Note on Description-vs-Implementation Discrepancies

**10. Blessings — The Seven Lucky Gods**
- 10.1 The Pair Structure
- 10.2 The Seven Pairs
- 10.3 Cultural Significance
- 10.4 Mechanical Implications
- 10.5 Acquisition
- 10.6 Strategic Notes

**11. Ki Economy**
- 11.1 Round-End Ki Reward
- 11.2 Round-Start Interest
- 11.3 In-Round Ki Sources
- 11.4 Ki Sinks
- 11.5 Economic Spirits
- 11.6 Run-Wide Ki Trajectory
- 11.7 Strategic Notes

**12. Shop Structure**
- 12.1 Shop Cadence
- 12.2 Offering Generation
- 12.3 Spirit Offering Filtering
- 12.4 Deck-Fixing Pool Expansion at Sacred Grove
- 12.5 Reroll System
- 12.6 Purchase Flow
- 12.7 Sacred Grove Fusion Section
- 12.8 Blessing Acquisition (Not Yet Implemented)
- 12.9 Stamp Acquisition Refinements
- 12.10 Continue Button and Round Progression

**13. UI & Presentation**
- 13.1 Scene Architecture
- 13.2 MenuScene
- 13.3 DivinationScene
- 13.4 HexagramCollectionScene
- 13.5 GameScene — Core Layout
- 13.6 GameScene — Hexagonal Field Layout
- 13.7 GameScene — Spirit Chain Drag-and-Drop
- 13.8 GameScene — Slot Mechanics: Add/Remove
- 13.9 GameScene — Field & Capture Visual Mechanics
- 13.10 GameScene — Other UI Elements
- 13.11 ShrineScene — Shop Layout
- 13.12 ShrineScene — Per-Item Overlays
- 13.13 Persistent State Across Scenes
- 13.14 Future / Planned UI Elements

**14. Logging**
- 14.1 Logger Architecture
- 14.2 Log Categories
- 14.3 Transcript Format
- 14.4 Telemetry Sources
- 14.5 Export Methods
- 14.6 Code-Level Telemetry Concerns
- 14.7 Future Logging Enhancements

**15. Catalogs**
- 15.1 Card Catalog
- 15.2 Spirit Catalog
- 15.3 Consumable Catalog
- 15.4 Hexagram Catalog (Quick Reference)
- 15.5 Blessing Catalog
- 15.6 Yaku Catalog
- 15.7 Style Combo Catalog
- 15.8 Cost Reference Table
- 15.9 Run-Wide Constants

**16. Implementation Status**
- 16.1 Core Gameplay Systems
- 16.2 Scoring Systems
- 16.3 Card-Level Modifications
- 16.4 Spirits System
- 16.5 Consumables System
- 16.6 Hexagrams System
- 16.7 Blessings System
- 16.8 Run Structure
- 16.9 Shop System
- 16.10 Ki Economy
- 16.11 UI & Presentation
- 16.12 Logging
- 16.13 Save/Load State
- 16.14 Summary

**17. Open Design Questions**
- 17.1 Balance & Tuning (Pending Playtesting)
- 17.2 Mechanical Design Questions
- 17.3 Terminology & Naming
- 17.4 UI/UX Design
- 17.5 Future Features
- 17.6 Visualization & Display Verification Items
- 17.7 Code-vs-Design Discrepancies
  - 17.7.1 Stamps System
  - 17.7.2 Spirits System
  - 17.7.3 Economy System
  - 17.7.4 Hexagrams System
  - 17.7.5 Consumables System
  - 17.7.6 Card-Targeting System Naming
  - 17.7.7 Card Data Cleanup
  - 17.7.8 Architectural Cleanup (Lower Priority)

**18. Decisions Log**
- 18.1 Run Structure
- 18.2 Scoring System Simplifications
- 18.3 Flow System Unification
- 18.4 New Systems Introduced in V5
- 18.5 System Expansions
- 18.6 Wu Xing Mechanics Refinement
- 18.7 Field & Layout Changes
- 18.8 UI Architecture Decisions
- 18.9 Architectural / Cleanup Decisions
- 18.10 Open V4 Questions Resolved in V5

---

## 1. Game Overview

A single-player roguelike deckbuilder built on the traditional 48-card Hanafuda deck. The player captures card pairs across 36 rounds (6 acts of 6 rounds each), building a spirit loadout, modifying their deck, and scoring against escalating thresholds. Every capture scores immediately — yaku unlock the ability to push deeper into a round for more captures.

**Core Loop:** Play cards → capture pairs → score points → make yaku → push or bank → shop → repeat.

The game blends Koi-Koi matching mechanics with push-your-luck scoring, a spirit modifier system, Wu Xing material transformations, I Ching hexagram environments, Chakra-themed deck-modification tools, alchemical card transformations, Stamps as card-level enhancers, Blessings drawn from the Seven Lucky Gods of Japanese folklore, and a style scoring system that rewards aesthetically resonant play.

The cultural elements are not decoration — they are mechanically integrated such that the game would be fundamentally different (and weaker) without them. Hanafuda's traditional matching ruleset, Koi-Koi's bank/push tension, Wu Xing's five-element transformation framework, the I Ching's 64 hexagrams as environmental modifiers, the Seven Lucky Gods as run-modifier patrons, and Chakra Tools as deck-modification metaphors all serve concrete mechanical purposes. The game would be unrecognizable with these systems stripped out and replaced with generic equivalents.

---

## 2. Card System

### 2.1 The Deck

The base deck is 48 cards across 12 months, 4 cards per month. Each card has:

- **id** — unique identifier (e.g., `january_crane`)
- **month** — 1–12
- **monthName** — display name (e.g., "January")
- **flower** — flower or theme of the month (e.g., "Pine", "Plum Blossom")
- **type** — bright (5 cards), animal (9), ribbon (10), plain (24)
- **points** — bright: 20, animal: 12, ribbon: 10, plain: 3
- **name** — display name (e.g., "Crane and Rising Sun")
- **vertical** — `air` or `land` (24/24 split in base deck)
- **temporal** — `day` or `night` (24/24 split in base deck)
- **tags** — array of thematic descriptors used for spirit/hexagram affinity (e.g., `["bird", "sky", "winter"]`)
- **enhancement** — null by default; holds Wu Xing enhancement state when applied (Water, Wood, Fire, Earth, Metal — see Section 8)
- **edition** — null by default; holds card edition state when applied (Gold, Crystal, Ghost — see 2.X below and Section 8)
- **stamp** — null by default; holds applied Stamp data (9 types across 4 tiers — see Section 8)
- **speculative** — `true` only on the 13 cards that don't appear in the base deck

### 2.2 Base Deck — Full Card Listing (48 Cards)

The base deck includes every card listed below. Full axis mappings shown. The total breakdown is 5 brights, 9 animals, 10 ribbons, and 24 plains.

#### January · Pine (松 Matsu)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `january_crane` | Crane and Rising Sun | bright | air | day | sky, sun, crane, noble, auspicious, longevity, winter |
| `january_ribbon` | Pine Poetry Ribbon (Red) | ribbon | air | night | poetry, noble, winter, evergreen |
| `january_plain_1` | Pine Plain | plain | air | day | winter, evergreen |
| `january_plain_2` | Pine Plain | plain | air | night | winter, evergreen |

#### February · Plum Blossom (梅 Ume)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `february_warbler` | Bush Warbler on Plum | animal | air | day | bird, spring, song, blossom, delicate |
| `february_ribbon` | Plum Poetry Ribbon (Red) | ribbon | air | night | poetry, spring, blossom |
| `february_plain_1` | Plum Plain | plain | air | night | spring, blossom |
| `february_plain_2` | Plum Plain | plain | air | day | spring, blossom |

#### March · Cherry Blossom (桜 Sakura)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `march_curtain` | Cherry Blossom Viewing Curtain | bright | land | day | celebration, spring, noble, blossom, ceremony, revelry |
| `march_ribbon` | Cherry Poetry Ribbon (Red) | ribbon | air | night | poetry, spring, blossom |
| `march_plain_1` | Cherry Plain | plain | air | day | spring, blossom |
| `march_plain_2` | Cherry Plain | plain | air | night | spring, blossom |

#### April · Wisteria (藤 Fuji)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `april_cuckoo` | Cuckoo with Crescent Moon | animal | air | day | bird, moon, spring, night, longing, sky |
| `april_ribbon` | Wisteria Ribbon (Yellow) | ribbon | land | night | spring, vine, delicate |
| `april_plain_1` | Wisteria Plain | plain | land | day | spring, vine |
| `april_plain_2` | Wisteria Plain | plain | land | night | spring, vine |

#### May · Iris (菖蒲 Ayame)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `may_bridge` | Iris Fireflies | animal | air | night | firefly, insect, spring, night, light, water |
| `may_ribbon` | Iris Ribbon (Yellow) | ribbon | land | day | spring, water, flower |
| `may_plain_1` | Iris Plain | plain | land | day | spring, water |
| `may_plain_2` | Iris Plain | plain | land | night | spring, water |

> Note: The animal card uses the legacy ID `may_bridge` though its name is "Iris Fireflies". May/September animal naming is being clarified — the codebase ID is unchanged from earlier design.

#### June · Peony (牡丹 Botan)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `june_butterflies` | Butterflies on Peony | animal | land | day | butterfly, summer, transformation, flower, delicate |
| `june_ribbon` | Peony Blue Ribbon | ribbon | land | night | summer, flower, noble, poetry |
| `june_plain_1` | Peony Plain | plain | land | day | summer, flower |
| `june_plain_2` | Peony Plain | plain | land | night | summer, flower |

#### July · Bush Clover (萩 Hagi)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `july_boar` | Wild Boar | animal | land | night | animal, summer, wild, hunt, forest, earth |
| `july_ribbon` | Bush Clover Ribbon (Yellow) | ribbon | land | day | summer, field, wild |
| `july_plain_1` | Bush Clover Plain | plain | land | night | summer, field |
| `july_plain_2` | Bush Clover Plain | plain | land | day | summer, field |

#### August · Pampas Grass (芒 Susuki)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `august_moon` | Full Harvest Moon | bright | air | night | moon, autumn, sky, harvest, night, reflection |
| `august_geese` | Geese in Flight | animal | air | day | bird, autumn, sky, migration, moon, journey |
| `august_plain_1` | Pampas Plain | plain | air | night | autumn, field, wind |
| `august_plain_2` | Pampas Plain | plain | air | day | autumn, field, wind |

> Note: August has no ribbon in the base deck. August Ribbon (white) is a speculative card.

#### September · Chrysanthemum (菊 Kiku)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `september_sake` | Chrysanthemum Cricket | animal | land | night | insect, autumn, song, night, cricket, flower |
| `september_ribbon` | Chrysanthemum Blue Ribbon | ribbon | air | day | autumn, flower, noble, poetry |
| `september_plain_1` | Chrysanthemum Plain | plain | air | night | autumn, flower |
| `september_plain_2` | Chrysanthemum Plain | plain | air | day | autumn, flower |

> Note: The animal card uses the legacy ID `september_sake` though its name is "Chrysanthemum Cricket". May/September animal naming is being clarified — the codebase ID is unchanged from earlier design.

#### October · Maple (紅葉 Momiji)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `october_deer` | Deer among Maple | animal | land | night | animal, autumn, forest, grace, foliage, earth |
| `october_ribbon` | Maple Blue Ribbon | ribbon | air | day | autumn, foliage, noble, poetry |
| `october_plain_1` | Maple Plain | plain | air | night | autumn, foliage |
| `october_plain_2` | Maple Plain | plain | air | day | autumn, foliage |

#### November · Willow / Rain (柳 Yanagi)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `november_rainman` | Ono no Michikaze in the Rain | bright | land | night | rain, water, wisdom, scholar, perseverance, winter, frog |
| `november_swallow` | Swallow in Rain | animal | air | night | bird, rain, water, winter, journey, sky |
| `november_ribbon` | Willow Ribbon (White) | ribbon | land | day | rain, water, winter, sorrow |
| `november_lightning` | Lightning and Thunder Drum | plain | land | day | storm, sky, thunder, danger, winter |

> Note: November has only one plain in base deck (`november_lightning`, the unique storm-themed plain). A second plain (`november_plain_2`, generic Willow Plain) exists as a speculative card. November is the only month in the base deck that lacks a generic-style plain.

#### December · Paulownia (桐 Kiri)

| ID | Name | Type | Vertical | Temporal | Tags |
|---|---|---|---|---|---|
| `december_phoenix` | Phoenix on Paulownia | bright | land | day | sky, noble, mythical, fire, rebirth, auspicious, winter |
| `december_plain_1` | Paulownia Plain | plain | land | night | winter, noble, evergreen |
| `december_plain_2` | Paulownia Plain | plain | land | day | winter, noble, evergreen |
| `december_plain_1_dup` | Paulownia Plain (duplicate) | plain | land | night | winter, noble, evergreen |

> Note: December has the most distinctive base-deck composition — 1 bright + 3 plains, with no animal or ribbon. The third plain (`december_plain_1_dup`) is an explicit duplicate of `december_plain_1`, included to preserve the historical Hanafuda deck's distribution. December's animal (Fox) and ribbon (Paulownia White Ribbon) exist only as speculative cards.

### 2.3 Speculative Cards (13 cards)

Speculative cards never appear in the base deck. They exist as definitions for rank promotion mechanics (via Chakra Tools) and hexagram-driven deck modifications. Each speculative card has `speculative: true` in its data.

The 13 speculative cards fill missing month/rank slots so that every month has at least 1 bright, 1 animal, 1 ribbon, and 2 plains — the rank-balanced ideal that the historical Hanafuda deck does not achieve.

| ID | Name | Type | Month | Vertical | Temporal | Fills Slot |
|---|---|---|---|---|---|---|
| `january_bear` | Bear | animal | January | land | day | Animal |
| `february_scholar` | Scholar | bright | February | air | night | Bright |
| `march_ladybugs` | Ladybugs | animal | March | air | day | Animal |
| `april_pond` | Pond | bright | April | air | night | Bright |
| `may_kite` | Kite | bright | May | air | day | Bright |
| `june_kirin` | Kirin | bright | June | land | night | Bright |
| `july_farmer` | Farmer | bright | July | land | day | Bright |
| `august_ribbon` | Pampas Ribbon (White) | ribbon | August | air | day | Ribbon |
| `september_bell` | Bell | bright | September | air | day | Bright |
| `october_lantern` | Lantern | bright | October | land | night | Bright |
| `november_plain_2` | Willow Plain | plain | November | land | night | Generic plain (alongside Lightning) |
| `december_fox` | Fox | animal | December | land | night | Animal |
| `december_ribbon` | Paulownia Ribbon (White) | ribbon | December | land | night | Ribbon |

**Speculative card design intent:** Most speculative additions are brights (8 of 13) because most months lack a second bright in the base deck. Adding speculatives via rank promotion or hexagram effects concentrates bright density, enabling otherwise-unreachable Hikari thresholds.

**Tag assignment:** Speculative cards currently have empty tag arrays in code (`tags: []`). Tag assignment for speculatives is a deferred task — when speculatives are integrated into spirits/hexagrams, they will need appropriate thematic tags.

**Design status of `december_plain_3`:** A `december_plain_3` entry (Paulownia Yellow Sky Plain) exists in `cards.js` but is **deprecated**. It has been functionally replaced by `december_ribbon` so that integrating speculatives gives December the standard 1B/1A/1R/2P composition matching every other month. The `december_plain_3` entry should be removed in a future code cleanup pass.

### 2.4 Ribbon Colors (Updated)

Ribbon colors were renamed during the development of the Stamps system. The current naming scheme is:

- **Red** (formerly "Red writing" / poetry): January, February, March
- **Blue** (formerly "Blue writing" / elegance): June, September, October
- **Yellow** (formerly "Green"): April, May, July
- **White** (formerly "Yellow" — the singular): November (and August, December via speculatives)

The base deck contains 1 White ribbon (Willow). Speculative cards add 2 more (August Pampas, December Paulownia).

Ribbon colors function as a meaningful sub-grouping for spirits, style combos (Akatan = 3 Red, Aotan = 3 Blue), and Stamps.

### 2.5 Animal Subtypes

The 9 base-deck animals span three categories:

- **Birds (4):** Warbler (Feb), Cuckoo (Apr), Geese (Aug), Swallow (Nov)
- **Mammals (2):** Boar (Jul), Deer (Oct)
- **Insects (3):** Fireflies (May), Butterflies (Jun), Cricket (Sep)

Speculative additions: Bear (Jan, mammal), Ladybugs (Mar, insect), Fox (Dec, mammal). Integrating speculatives expands each subtype: 4 birds, 4 mammals (Bear, Boar, Deer, Fox), 4 insects (Ladybugs, Fireflies, Butterflies, Cricket).

### 2.6 Seasons

Equal quarters of 12 cards each in the base deck:

- **Spring:** March, April, May
- **Summer:** June, July, August
- **Autumn:** September, October, November
- **Winter:** December, January, February

Cards inherit their season from their month. Seasonal grouping is a primary axis for spirits and style combos.

### 2.7 Axis Distributions

#### Air / Land (Vertical)

The base deck splits 24/24 between air and land. Distribution by month:

- **Full air (4/4):** January, February, August
- **Full land (4/4):** June, July, December
- **3 air / 1 land:** March (curtain=land), September (cricket=land), October (deer=land)
- **1 air / 3 land:** April (cuckoo=air), May (fireflies=air), November (swallow=air)

The lopsided splits in spring/autumn create thematic asymmetry — the "outliers" in those months (Curtain in March, Cricket in September, Deer in October) represent earthly/grounded contrast against otherwise sky-dominant months.

#### Day / Night (Temporal)

The base deck splits 24/24 between day and night. Every month has a 2/2 day/night split. Distribution by rank:

- **Brights (5):** Day 3 (Crane, Curtain, Phoenix), Night 2 (Moon, Rainman)
- **Animals (9):** Day 4 (Warbler, Cuckoo, Butterflies, Geese), Night 5 (Fireflies, Boar, Cricket, Deer, Swallow)
- **Ribbons (10):** Day 5, Night 5 (even)
- **Plains (24):** Day 12, Night 12 (even)

#### Combined Quadrants

Cards group into four quadrants by combining vertical and temporal axes. In the base deck:

| Quadrant | Count | Identity |
|---|---|---|
| Air + Day | 12 | Bright, ascendant |
| Air + Night | 12 | Nocturnal, atmospheric |
| Land + Day | 12 | Lush, celebratory |
| Land + Night | 12 | Contemplative, quiet |

Quadrants are a primary axis for fusion spirits and several hexagram effects.

### 2.8 Tag System

Tags are thematic descriptors used to compute spirit and hexagram affinity. A single card may have multiple tags. Examples:

- **`january_crane`** has tags: `["sky", "sun", "crane", "noble", "auspicious", "longevity", "winter"]`
- **`july_boar`** has tags: `["animal", "summer", "wild", "hunt", "forest", "earth"]`

Tags include: cosmic descriptors (`sky`, `sun`, `moon`, `rain`, `water`, `fire`, `earth`), animal types (`bird`, `insect`, `firefly`, `cricket`), thematic qualities (`noble`, `auspicious`, `longevity`, `wisdom`, `revelry`, `journey`, `sorrow`), seasonal modifiers (`winter`, `spring`, `summer`, `autumn`), structural qualities (`evergreen`, `blossom`, `vine`, `field`, `foliage`).

Tags are accessed via the `cardsByTag` lookup helper in `cards.js`. Spirits and hexagrams query tags to determine affinity.

**Speculative cards have empty tag arrays.** Tag assignment for speculatives is a deferred design task — tags will be assigned when the cards are integrated into specific spirits/hexagrams.

### 2.9 Persistent Deck State

The deck is owned by `RunManager` and persists across rounds. All modifications — Chakra Tool promotions, Non-being deletions, Transcendence transformations, Wu Xing enhancements, Stamps, Alchemical applications, hexagram effects — are permanent mutations to the deck array.

Card objects are shared by reference between RunManager and the round's hand/field systems, so in-round mutations propagate automatically. There is no "round deck" separate from the "run deck" — the same array is used throughout.

This persistence model means:

- A Wu Xing enhancement applied in Round 5 affects the card in every subsequent round
- A Non-being deletion in Round 8 reduces the deck size for the rest of the run
- Promotion progress accumulates across rounds (e.g., Chakra Crown applied to a plain that has no animal in its month enters transitional state)
- Threshold proportions recompute each round based on current deck composition

### 2.10 ID Naming Legacy

Some card IDs do not match their human-readable names due to design evolution that didn't propagate to ID renames:

- **`may_bridge`** is named "Iris Fireflies" — the May animal. The ID references an earlier "Bridge" concept that was replaced.
- **`september_sake`** is named "Chrysanthemum Cricket" — the September animal. The ID references an earlier "Sake Cup" concept.

These legacy IDs persist in code and in style combo definitions. For example, the Hanami-zake style combo's trigger condition references `march_curtain + september_sake` — meaning Cherry Blossom Viewing Curtain + Chrysanthemum Cricket.

The May/September animal naming is still being clarified — there's some confusion about which animal belongs to which month historically (Fireflies vs Dragonfly for May, Cricket vs Fireflies for September). This is a deferred design question.

**Future Claude sessions reading this doc:** when working with style combos or animal-specific spirits, reference IDs (`may_bridge`, `september_sake`), not names. Code uses IDs.

### 2.11 Card-Level Modification Systems (Overview)

Cards can be modified through several systems, each producing persistent changes to the card. Full mechanics for each system are documented in Section 8 (Consumables); this overview lists what's possible at the card level for cross-reference.

**Wu Xing Enhancements** — Five element types (Water, Wood, Fire, Earth, Metal), each with base and upgraded tiers. Modify card behavior, scoring contribution, and interactions:

- Water (Snow/Ice) — multiplicative mult contribution per capture, depreciates with use
- Wood (Leaf/Silk) — field slot bypass; Silk additionally prevents stranding; both contribute to mult during scoring
- Fire (Ember/Charcoal) — flat point bonus, removes card identity (no month/type/axis)
- Earth (Clay/Pottery) — generates ki interest when held in hand at round end; held-in-hand mult contribution
- Metal (Iron/Meteorite) — held-in-hand mult contribution; Meteorite has jackpot ki proc chance

Stored on `card.enhancement = { element, tier, depLevel, ... }`.

**Editions** — Three rarity-style modifiers applied to cards via specific consumables/effects:

- Gold edition — +20 flat points to the card
- Crystal edition — +5 additive mult to the capture
- Ghost edition — ×1.5 multiplicative mult to the capture

Editions apply per-card during scoring, after Wu Xing enhancement effects but before spirit chain processing. Stored on `card.edition`.

**Stamps** — Nine stamp types organized into four tiers, applied to cards via Stamp consumables. Stamps trigger on specific events:

Primary tier (purchasable at any shrine):
- Red Stamp — yaku trigger: draw +1 card when this card contributes to a new yaku
- Blue Stamp — discarded trigger: gain a free consumable when discarded to full field
- Yellow Stamp — captured: +3 ki
- White Stamp — generic retrigger: any effect tied to this card fires twice

Secondary tier (Sacred Grove only):
- Orange Stamp — captured: draw +1 card and gain +3 ki
- Green Stamp — discarded: +8 ki when discarded to full field
- Purple Stamp — yaku: gain a free consumable when contributing to a new yaku

Tertiary tier (crafted from primary + secondary stamps):
- Black Stamp — generic compound: draws +1 card, gains a free consumable, and +3 ki on capture, discard, OR yaku contribution

Quaternary tier (crafted from White + Black):
- Gray Stamp — generic triple retrigger: any effect tied to this card fires 3 additional times (4× total)

Stamps fire after the main scoring pipeline. White and Gray stamps are generic retriggers — they amplify ANY effect on the card (held-in-hand mult, jackpot rolls, depreciation increment, discard-trigger spirits, yaku stamps, capture scoring), not just capture scoring. Stored on `card.stamp`. Full mechanics in Section 8.

**Rank promotion** — Solar Plexus Chakra Tools cycle a card's rank (plain → ribbon → animal → bright → plain). Promotion is instantaneous at the moment of Solar Plexus application. This is the primary path to bringing speculative-rank cards into a deck, since speculatives represent rank slots not present in the base deck for most months. See Section 8 for full mechanics.

**Multiple modifications stack on a single card.** A card can simultaneously have a Wu Xing enhancement, an edition, and a stamp. Modifications resolve in different phases of the scoring pipeline (see Section 5.1).

### 2.12 Card Dimensions and Rendering

- **Card size:** 64×104 pixels (hwatu proportions)
- **Scale:** `CARD_SCALE=1.0` (integer scaling, no fractional)
- **Rendering:** `pixelArt: true` in Phaser config, native 1280×720 window
- **Card back:** Red woven hwatu pattern, rendered at source resolution with `setDisplaySize`
- **Border:** 5px uniform color, rounded corners (6px radius on UI slots)

---

## 3. Game Elements

This section documents the foundational components of a round — the structural elements players interact with. Subsequent sections (Core Gameplay Loop, Scoring, Spirits, Consumables) reference these elements.

### 3.1 Hand

The player's hand holds cards available to play onto the field.

**Default hand size:** 8 cards.

**Hand size modifiers:**

- **Scholar / Fukurokuju Blessings** add +1 hand size each. Stackable for +2 total maximum.
- Hexagrams may add or reduce hand size.

**Initial deal:** At round start, the deck deals 8 cards (modified by Fisherman/Ebisu Blessings, +1 each) to the hand.

**Hand replenishment via push:**

- Push 1: +4 cards
- Push 2: +2 cards
- Push 3+: +1 card

Cards remaining in hand carry over into the push. There is no separate turn counter — the hand is the round's resource. Efficient card use is rewarded; wasteful plays empty the hand faster.

**Cards dealt modifiers:** Fisherman/Ebisu Blessings add +1 each to all deals (initial + pushes). Stackable for +2 total maximum.

**Cards in hand at round end:**

- If the player banks: each remaining card grants +1 ki bonus (modified by Piggybank spirit, etc.)
- If hand empties via failed push: the held-card ki bonus is forfeited (this is the primary cost of failing a push)

### 3.2 Deck

The deck is the source of new cards and the back-of-house pile.

**Composition:** 48 base cards (modifiable through deck-modification effects).

**Persistent across rounds:** The deck is the same array throughout the run. All modifications are permanent.

**Deck flip:** During play, the top card of the deck is flipped after a hand play, resolving capture or stranding based on month-matching rules. The deck flip is the primary source of stranding — a flipped card matching the pending pair joins the stack rather than triggering capture.

**Empty deck:** If the deck runs out, hand replenishment via push deals from the discard pile if present. If both empty, push is impossible; the round ends.

### 3.3 Field and Field Slots

The field is the central play area where cards are placed and matched.

**Default field slots:** 8 (hexagonal arrangement: top row 3, middle row 2 wider-spread, bottom row 3, with deck in center).

**Slot modifiers:**

- **Elder / Jurojin Blessings** add +1 field slot each. Stackable for +2 total maximum.
- **Rooster Zodiac consumable:** +1 field slot for one round (temporary).
- **Leaf-enhanced cards:** When all field slots are full, a Leaf card can occupy a temporary "phantom" slot rather than being discarded. The phantom slot exists only while the Leaf card is present.
- **Hexagram effects:** Specific hexagrams may add or subtract field slots for the run or per round.
- **Alchemical penalty:** A specific alchemical reduces field slots as a tradeoff for its primary effect.

The Expanse spirit referenced in V3-V4 has been **eliminated** — field slot expansion is now exclusively handled by Blessings, Rooster, and hexagram/alchemical effects.

**Slot stacking:** Each field slot can hold up to 3 cards in a stack (same-month cards stack vertically). When a slot reaches 4 cards, it auto-captures (+5 full month bonus).

**Stranding:** When a deck flip matches a pending pair's month, the flipped card joins the stack, stranding the pending pair (no capture occurs that turn). The Silk Wu Xing enhancement prevents stranding — Silk-enhanced cards trigger capture on deck flip even when the flip matches.

**Overflow:** When a card would be played to a full field with no Leaf bypass, it goes to the discard pile.

### 3.4 Capture Pile

The capture pile shows captured cards that are **still accumulating toward yakus** — i.e., unspent captures.

**Visual organization:** Cards in the capture pile are displayed in a fan UI, sorted by type (★ Brights, ♦ Animals, ║ Ribbons, □ Plains) with counts per type.

**Yaku tracking:** The scoring engine evaluates the capture pile after every capture event. When unspent captures meet a yaku threshold, the yaku triggers Bank/Push.

**"Spent" cards leave the capture pile:** When a yaku triggers, the cards meeting that yaku are marked spent and move from the capture pile to the banked pile. They no longer display in the capture area. This means the capture pile always reflects "what's still in play toward yakus" at a glance.

Spent cards continue to contribute to style combos (which evaluate the entire round's captures regardless of spent state) and to scoring (every capture's score is locked in at the moment of capture, regardless of subsequent spending).

**Persistence:** The capture pile is round-specific. It resets at round end.

### 3.5 Banked Pile

The banked pile shows captures that have been **spent in a yaku** during the current round.

**Visual organization:** Same fan UI as the capture pile, sorted by type with counts.

**Purpose:** The banked pile is a visual record of "which yakus have you already triggered this round." When a player triggers Tane (3 animals), those 3 animal cards leave the capture pile and appear in the banked pile. The banked pile thereby shows the cumulative yaku history within a round.

**Persistence:** The banked pile is round-specific. It resets at round end alongside the capture pile.

**Distinction from running score:** The banked pile is a visual element showing card-level yaku history, NOT the running point total. Score accumulates as a numeric running total tracked separately. The running score is what matters for threshold comparison; the banked pile is a UX affordance showing "what's already been locked in" toward yaku triggers.

### 3.6 Discard Pile

Cards that overflow the field (when no Leaf bypass available) go to the discard pile.

**No player-driven discards:** Unlike V4's design, the player cannot voluntarily discard from hand. Discards happen exclusively when:

- A played card cannot fit on the field (all 8 slots full + no Leaf enhancement)
- (Future spirit/consumable effects may add other discard sources — TBD)

**Discard retrieval:** The Dog Zodiac consumable retrieves 2 cards from the discard pile back to hand (see Section 8). Future spirits may also offer discard interaction. Discard mechanics are an underdeveloped area — more spirit/consumable effects targeting discards may emerge.

**Stamps that interact with discards:** Several stamps trigger on discard rather than capture (Blue, Green) — providing recovery value when cards overflow the field. See Section 2.11 and Section 8.

### 3.7 Spirit Slots

Spirit slots hold the player's equipped spirit loadout.

**Default spirit slots:** 6 (displayed in 2 rows of 3 in the Fan UI).

**Slot modifiers:**

- **Warrior / Bishamonten Blessings** add +1 spirit slot each. Stackable for +2 total maximum.
- Hexagrams may add or remove spirit slots across a run.

**No inventory:** All spirits are equipped to slots — there is no "bench" or stored spirits. To acquire a new spirit beyond capacity, the player must release an existing spirit (no refund), fuse spirits at Sacred Grove, or transcend a stacked spirit (4th copy or via Amber/Sulfur alchemicals — see Section 7.2). Transcendence is the primary mechanism for accumulating spirits beyond the 6-slot cap.

**Spirit release:** Available at any shop, no ki refund. The release path makes loadout management an active strategic decision.

**Spirit ordering matters strategically.** Spirits resolve their contributions in chain order (slot 1 → slot 2 → ... → slot N) during capture scoring. The same set of spirits in different positions can produce substantially different scores. Players can drag and reorder spirits within their loadout — and after transcendence, transcended Negatives can be reordered within the chain alongside regular slot spirits. See Section 5.7 for the chain-order mechanics.

### 3.8 Consumable Slots

Consumable slots hold the player's tactical inventory of single-use items.

**Default consumable slots:** 3.

**Slot modifiers:**

- **Artist / Benzaiten Blessings** add +1 consumable slot each. Stackable for +2 total maximum.
- Hexagrams may add or remove consumable slots.

**Inventory across rounds:** Consumables persist across rounds until used. This makes consumables a strategic resource — saving a Rooster (+1 field slot) for a round where it matters, holding a Snake for a tight yaku chase, etc.

**Slot pressure:** The 3-slot default forces prioritization between Wu Xing elements (held for in-round application), Zodiac consumables (tactical effects), Stamps, and Alchemicals.

### 3.9 Legendary Slots

Legendary slots hold the player's equipped Legendary spirits, separate from regular spirit slots.

**Default legendary slots:** 2.

Legendary spirits are a higher-power tier with unique mechanics that don't fit the standard Foundation/Engine/Utility spirit categories. Their separate slot system prevents them from competing with regular spirits for the same loadout space — a player can run 6 regular spirits AND 2 legendaries simultaneously.

The Legendary spirit roster includes 5 spirits (detailed in Section 7).

### 3.10 Element Summary

For quick reference, the player's full loadout potential at maximum Blessing investment:

| Element | Default | Max with Blessings | Other Modifiers |
|---|---|---|---|
| Hand size | 8 | 10 (+2 Scholar/Fukurokuju) | Hexagrams |
| Cards dealt | 8 | 10 (+2 Fisherman/Ebisu) | Hexagrams |
| Field slots | 8 | 10 (+2 Elder/Jurojin) | Rooster (+1 round), Leaf (phantom slot), Hexagrams, Alchemicals |
| Spirit slots | 6 | 8 (+2 Warrior/Bishamonten) | Hexagrams |
| Consumable slots | 3 | 5 (+2 Artist/Benzaiten) | Hexagrams |
| Legendary slots | 2 | 2 (no Blessing for these) | (none) |

The Hotei Blessing pair (Comedian/Hotei) doesn't expand a slot category but reduces all yaku thresholds by 1 (floored at 1, stackable to -2).

The Daikokuten Blessing pair (Merchant/Daikokuten) adds +1 item per shop section (stackable to +2), increasing shopping options without affecting in-round capacity.

---

## 4. Core Gameplay Loop

This section describes the procedural flow of a round and the rules governing player actions. It builds on Section 3 (Game Elements).

### 4.1 Round Structure

A round proceeds through these phases:

1. **Threshold computation** — Yaku thresholds are computed from the current deck composition using the proportional bracket function (see Section 5.5). Hexagram threshold modifiers (set at run start) apply additively. Spirit threshold modifiers (Hotei/Comedian Blessings, deferred spirit effects) apply. Floor at 1.
2. **Deal** — The deck deals 8 cards (modified by Fisherman/Ebisu Blessings and any hexagram effects) to the player's hand and 8 cards to the field. Same-month cards on the field auto-stack into shared slots, up to 3 per slot.
3. **Play phase** — The player makes plays repeatedly until the hand empties or the round ends. Each play involves:
   - **Hand play:** The player selects one or more same-month cards from hand and plays them onto a matching field card (or onto an empty slot if no match). This forms a pending pair.
   - **Deck flip:** The top card of the deck is flipped, resolving the pending pair based on matching rules (see 4.2).
   - **Consumable use (optional):** Between plays, the player can activate Chakra Tools, Wu Xing elements, Zodiac consumables, Stamps, or Alchemicals from inventory. Some target individual cards (uses card-target mode); others apply globally.
4. **Capture scoring** — Every successful capture immediately scores using the per-capture formula (Section 5.1). The running round score accumulates.
5. **Yaku check** — After each capture, the scoring engine evaluates whether a new yaku threshold has been met by unspent captures. If so, those cards transition from capture pile to banked pile, and the player gets a Bank/Push decision.
6. **Style check** — After each capture, style combos are detected. Each combo triggers once per round and adds its bonus to Flow.
7. **Round end** — When the hand empties (with no further pushing available) or the player banks. The running score is finalized.
8. **Earth Ki Generation** — If any Clay or Pottery (Earth-enhanced) cards are held in the player's hand at round end, they generate ki interest based on current ki reserves. This happens before the round result is finalized.
9. **Post-round enhancement effects** — Water depreciation increments on captured Snow/Ice cards, Fire break rolls fire on captured Ember/Charcoal cards, Metal proc rolls fire on captured Iron/Meteorite cards, etc.
10. **Threshold comparison** — Final round score is compared against the round's threshold. If met: round cleared, ki rewards calculated, proceed to shop. If not met: run ends.
11. **Shrine phase** — Visit Wayside Shrine or Sacred Grove to spend ki on spirits, consumables, enhancements, blessings (Grove only).

**Hexagram timing note:** Hexagrams are rolled at **run start** and persist for the entire run (or per act, depending on the hexagram — see Section 9). Hexagram-driven deck modifications occur once at run start. Hexagram conditions remain in effect throughout the run; there is no per-round hexagram "trigger." Threshold modifiers, slot modifiers, and other persistent hexagram effects apply continuously.

### 4.2 Matching Rules

During play, the following matching rules govern how plays resolve:

- **Hand card → field match:** The player selects a card from hand and plays it onto a matching field card (or stack with same-month cards). This forms a pending pair. The pair captures on the subsequent deck flip if the flip doesn't disrupt it.

- **Hand card → no field match:** If no field card matches the played card's month, the played card goes to an empty field slot. If no empty slots exist, the card goes to the discard pile (unless it has Leaf or Silk Wu Xing enhancement, which creates a phantom slot).

- **Deck flip → field match:** The flipped card matches a field card's month. They form a pair and capture (along with the pending pair from the hand play, if any).

- **Deck flip same month as pending pair:** The flipped card joins the pending stack rather than triggering capture. The pending pair is "stranded" — it remains on the field and cannot capture this turn. (Exception: Silk-enhanced pending cards prevent stranding and capture anyway.)

- **Deck flip → no field match:** The flipped card goes to an empty field slot. Pending pair captures normally if the pending played card found a match.

- **4-card stack auto-capture:** When a field slot reaches 4 cards (the full month), all 4 cards capture automatically. The capture grants a +5 full-month bonus to base points. This does NOT trigger Bank/Push (only the four scoring yakus trigger Bank/Push).

- **3-card stack auto-capture (Gankyil spirit):** With Gankyil equipped, 3-card stacks also auto-capture. This converts an otherwise-stranded month into a capture.

### 4.3 Hand Plays — Multi-Card

The player can play multiple same-month cards from hand simultaneously onto a matching field stack. This is allowed but rarely optimal because:

- Multi-card plays consume more hand resource per turn
- The pending pair becomes a pending group, but stranding rules still apply
- Wasting cards from hand reduces the available plays in subsequent turns

Multi-card plays are typically used when the player wants to clear specific cards from hand for strategic reasons (e.g., dumping a Lightning plain that has no scoring value).

### 4.4 Push-Your-Luck

When a yaku triggers, the player chooses **Bank** (end round, keep current running score) or **Push** (continue with escalating risk).

**Push triggers:** Only the four scoring yakus (Kasu, Tanzaku, Tane, Hikari) trigger Bank/Push decisions. Style combos, full-month auto-captures, and all other events do NOT trigger Bank/Push.

**Push effects:**

| Push # (successful) | Hand Replenishment | Push Factor (multiplicative on flow) |
|---|---|---|
| 1 | +4 cards | ×1.1 |
| 2 | +2 cards | ×1.1 (compounds: 1.1 × 1.1 = 1.21) |
| 3 | +1 card | ×1.1 (compounds further) |
| 4+ | +1 card | ×1.1 (compounds further) |

Cards remaining in hand carry over into the push (efficient hand use is rewarded).

**Push penalty:** When a push fails (hand empties without triggering a new yaku), Flow is multiplied by ×0.9 instead of ×1.1. The penalty is purely a Flow multiplier — there is NO direct score penalty applied to the running total at round end.

**Held-card ki forfeit:** Cards remaining in the player's hand at round end normally grant a ki bonus when banking. A failed push forfeits this bonus — held cards in hand at the moment of hand-empty grant zero ki.

**Resolution of in-progress push:** Completing a new yaku after pushing successfully clears the push as successful (Flow ×1.1). Failing to complete a new yaku before hand empty fails the push (Flow ×0.9, held-card ki forfeit).

### 4.5 Round End Conditions

A round ends when one of these occurs:

- **Bank:** The player chooses Bank after a yaku triggers. Running score is finalized. All held-card ki bonuses apply.

- **Hand empty after push:** No further pushing possible (cannot push without triggering a new yaku). If the most recent push was successful, the round ends with Flow ×1.1 applied. If the most recent push failed, Flow ×0.9 applies and held-card ki is forfeited.

- **Hand empty during initial deal (no yaku achieved):** The player ran out of cards without ever triggering a yaku. No penalty applied (couldn't have pushed anyway). Running score stands.

After round end, post-round enhancement effects fire and the threshold comparison determines whether the run continues.

### 4.6 Deck Exhaustion

If the deck runs out during play:

- Hand replenishment via push deals from the discard pile if cards are available there.
- If both deck and discard are empty, push is impossible. The current pending pair (if any) resolves, then the round ends.

In practice, deck exhaustion is rare — the 48-card base deck plus 8-card initial hand is sufficient to never empty even with multiple pushes in most rounds. Aggressive deck-thinning (Non-being Chakra Tool deletions) can make exhaustion more likely later in a run.

---

## 5. Scoring System

The current scoring model is **capture-based**: every capture is a scoring event. This replaced an earlier batch-scoring model where score resolved at round end through yaku multipliers. The capture-based model creates moment-to-moment scoring feedback and decouples score from yaku triggers.

### 5.1 Per-Capture Pipeline

When a capture occurs, scoring proceeds through several phases in fixed order. Each phase modifies running `points` and `mult` values, with the spirit chain applied left-to-right within the relevant phases.

**Conceptual model:**

```
points = 0          // (or cumulative from capstone_nature, see 5.7)
mult   = 1.0
```

The pipeline then resolves through these phases:

**Phase 1: Held-in-hand contributions**

Cards in the player's hand at the moment of capture contribute mult based on their Wu Xing enhancements:

- Metal-enhanced cards in hand (Iron/Meteorite) multiply mult.
- Earth-enhanced cards in hand (Clay/Pottery) multiply mult.
- Specific spirits (e.g., Applause) can retrigger held-in-hand effects multiple times.

These contributions apply BEFORE any spirit chain effects.

**Phase 2: Per-card processing**

For each card in the capture, in card order:

1. Base points + Fire flat additive (if Fire-enhanced)
2. Water mult: card's points multiplied by depreciation multiplier
3. Wood scoring mult: contributes to running `mult`
4. Edition bonuses: Gold (+20 pts), Crystal (+5 mult), Ghost (×1.5 mult)
5. Hexagram `onCardScored` modifier (if active hexagram has one)
6. Card's points added to running `points`
7. **Spirit chain** (slot order, left to right): each spirit's `onCardScored` effect fires, with the spirit's `stackCount` multiplying its contribution. Capstone effects (Yin-Yang, Universe) modify trigger counts and contribution scope.
8. Engine state updates (`onCardSeen`): each engine spirit tracks state per card seen — these don't directly score but accumulate state for later use.

Phase 2 is where the **spirit chain order matters most**. A spirit's `onCardScored` contribution applies to the running `points` and `mult` at its slot position in the chain.

**Phase 2.5: Retriggers**

Spirits with `getRetriggerCount` can cause additional firings of Phase 2 for specific cards. Each retrigger re-runs the full per-card scoring pipeline. (Note: Stamps also trigger retriggers, but those fire later in Phase 4.)

**Full month bonus:** If the capture is 4 cards (a complete month), +5 added to running `points` after Phase 2.

**Phase 3: Engine spirits**

After per-card processing, engine spirits with `applyEngine` fire in slot order. These spirits consume their accumulated state (from `onCardSeen` updates across the round/run) and contribute to `points` and `mult`. Yin-Yang capstone doubles application count.

**Final calculation:**

```
flow = run.flow
captureScore = round(points × mult × flow)
runningScore += captureScore
```

(A hexagram with `computeFinalScore` may override this final formula.)

**Phase 4: Post-scoring effects**

After the capture is scored, additional effects fire:

- Stamp triggered effects (Yellow ki, White/Gray retriggers re-running Phase 2 for the stamped card, Orange/Black draws and ki)
- Spirit-driven post-capture effects (e.g., Glory drawing on bright capture, Symbiosis generating symbionts on animal capture)
- Util_irrigation: +10 ki added to running score per plain captured (bypasses mult and flow — flat addition)
- Style combo detection (style combos add to flow if newly triggered — see 5.6)
- Hexagram `onCaptureComplete` hook
- Stamps and zodiac consumables can affect ki, generation, and card draw

**Spirit chain principle:**

The chain-order architecture lives within Phase 2 (per-card spirit effects) and Phase 3 (engine effects). Spirits process in slot order (left → right, slot 1 → slot N), with each spirit's contribution applied to the running `points` and `mult` at its position. **Two different orderings of the same spirits can produce substantially different scores.**

**Worked example (chain order):**

Consider two spirits, A and B:

- **Spirit A:** "+80 to mult per bright captured" (additive)
- **Spirit B:** "×2 to mult per bright captured" (multiplicative)

Capturing a single bright (20 base points) with no other modifiers:

**Order [A, B]** (A in slot 1, B in slot 2):
- Phase 2 base: points = 20, mult = 1.0
- Spirit A applies: mult = 1.0 + 80 = 81.0
- Spirit B applies: mult = 81.0 × 2 = 162.0
- Final: 20 × 162 × flow

**Order [B, A]** (B in slot 1, A in slot 2):
- Phase 2 base: points = 20, mult = 1.0
- Spirit B applies: mult = 1.0 × 2 = 2.0
- Spirit A applies: mult = 2.0 + 80 = 82.0
- Final: 20 × 82 × flow

Same spirits, same capture, ~2× difference in output based purely on positioning. Players who understand chain-order mechanics can craft loadouts that maximize chain efficiency.

**Reference:** Full spirit catalog including effect specifications, stack mechanics, and capstone interactions in Section 7. Card-level modifications (enhancements, editions, stamps) in Section 8.

### 5.2 Score Is Frozen At Capture

Score for a capture is locked in at the moment of capture. Subsequent state changes — yaku triggers moving cards from capture pile to banked pile, post-round enhancement effects, ki rewards, etc. — do NOT modify previously-captured cards' scores.

This means:

- A card scored at flow 1.0 stays scored at flow 1.0 even if Flow rises to 1.5 from a later style combo.
- A card scored before a successful push contributed to the running total; the post-push Flow ×1.1 boost only affects subsequent captures, not retroactive ones.
- Yaku triggers do not award score directly. The score the player earned came from the per-capture sum that built up to the yaku, not from achieving the yaku itself.

### 5.3 Yaku As Gates (Not Scoring)

**Yaku do NOT contribute to score.** They serve a different mechanical purpose: they unlock the Bank/Push decision.

| Yaku | Symbol | Condition |
|---|---|---|
| Hikari | ★ | Brights captured (threshold scales with deck composition) |
| Tane | ♦ | Animals captured (threshold scales) |
| Tanzaku | ║ | Ribbons captured (threshold scales) |
| Kasu | □ | Plains captured (threshold scales) |

When a yaku triggers:

1. The cards meeting the yaku are marked spent — they transition from capture pile to banked pile.
2. Spent cards no longer count toward future triggers of the same yaku.
3. The same yaku can re-trigger from fresh unspent captures (e.g., capturing 6 more plains in a single round can trigger Kasu twice, with two separate Bank/Push decisions).
4. The player must choose Bank or Push before continuing.

**Why yaku-as-gate (not scoring):** This was a deliberate design shift away from earlier multiplicative-yaku models. In the capture-based scoring model, yaku-as-multiplier would create end-of-round scoring spikes that override the per-capture rhythm. Making yaku gates only preserves moment-to-moment scoring while keeping yaku as meaningful structural events that pace the round.

### 5.4 Flow

**Flow** is a multiplier applied to every capture. It is the primary multiplicative scaling layer driven by player skill and choices (rather than by build).

**Flow modifications:**

- **Successful push:** Flow × 1.1 (multiplicative)
- **Failed push:** Flow × 0.9 (multiplicative)
- **Style combo:** Flow + variable bonus (additive at moment of trigger; see 5.6)
- **Round-end decay:** Flow × 0.95 (multiplicative, applied at round end after all other effects)

Flow can drop below 1.0 — for example, a player who never pushes in Round 1 still incurs the 0.95 decay at round end, leaving Flow at 0.95 entering Round 2. This creates structural pressure to push (and succeed) rather than play passively.

**Flow persistence:** Flow carries across rounds. The persistent value plus successful push history creates a strategic resource — building Flow in early rounds compounds in later rounds, but mismanagement (failed pushes, no pushes) erodes accumulated gains.

**Flow ceiling and floor:** No hard cap on maximum Flow (multiplicative compounding is uncapped), but the round-end ×0.95 decay creates natural pressure against runaway Flow. There is no hard floor either — Flow can drop arbitrarily low through repeated decay or failed pushes, though it asymptotically approaches but never reaches 0.

**Hexagram modifiers on Flow:**

Several hexagrams modify Flow mechanics directly:

| Hexagram | Effect | Notes |
|---|---|---|
| `volatile_flow` (hex_64, Wèi Jì) | Push success ×1.2, fail ×0.7, decay ×0.85 | Amplifies all swings |
| `stable_flow` (hex_63, Jì Jì) | Push success ×1.05, fail ×0.95, decay ×0.98 | Tamps down all swings |
| `style_ki_double` (hex_45, Cuì) | Style combo ki doubled; flow contribution removed | Reroutes combo rewards |
| `style_flow_double` (hex_46, Shēng) | Style combo flow contribution doubled; ki removed | Reroutes combo rewards |

The two style hexagrams (45/46) partition the combo reward economy — one doubles ki at the cost of flow, the other doubles flow at the cost of ki.

**Strategic implications of Flow management:**

Flow management is a strategic axis distinct from points or mult optimization. Two broad approaches:

- **Aggressive Flow building** — Push aggressively early when stakes are low, accumulate flow ×1.1 per success, then bank into a high-flow late-act run for amplified scoring. Pairs with Rabbit Zodiac (removes push penalty for a round, eliminating the ×0.9 flow penalty if used before risky pushes) and with Napoleon spirit (rewards push failures with additive mult — actively trades flow degradation for additive mult gains).
- **Conservative Flow preservation** — Bank reliably each round to avoid push failures, accept gradual ×0.95 decay, lean on score from points/mult dimensions instead.

**Push penalty interaction:** Push failures do triple damage — round ends with no captures from the failed push, hand-derived ki forfeited, AND Flow multiplied by ×0.9 (or ×0.7 under volatile_flow). This makes the push-or-bank decision a meaningful strategic moment each round.

**Style combo cherry-picking** — Builds can specifically target high-yield combos (e.g., Goko's +1.0 flow bonus, Full Year's +0.8) and time their triggers in optimal rounds, since combos are once-per-run.

### 5.5 Proportional Yaku Thresholds

Yaku thresholds scale with the current deck composition rather than being fixed values. This ensures yaku difficulty stays proportional even as the deck is modified through Chakra Tools, Non-being deletions, hexagram effects, or rank promotions.

**Bracket function:**

A rank's threshold is determined by its proportional share of the current deck:

| Proportion of deck | Threshold |
|---|---|
| < 1/12 | 1 |
| [1/12, 1/6) | 2 |
| [1/6, 1/4) | 3 |
| [1/4, 1/3) | 4 |
| [1/3, 1/2) | 5 |
| [1/2, 2/3) | 6 |
| [2/3, 3/4) | 7 |
| ≥ 3/4 | 8 |

**Verification with base 48-card deck:**

- 5 brights / 48 = 10.4% → bracket [1/12, 1/6) → Hikari threshold **2**
- 9 animals / 48 = 18.75% → bracket [1/6, 1/4) → Tane threshold **3**
- 10 ribbons / 48 = 20.8% → bracket [1/6, 1/4) → Tanzaku threshold **3**
- 24 plains / 48 = 50% → bracket [1/2, 2/3) → Kasu threshold **6**

These match the in-game display: `★(2) ♦(3) ║(3) □(6)`.

**Order of operations for threshold computation (at run/round start):**

1. Hexagram-driven deck modifications (run start)
2. Proportional threshold computed from current deck via bracket function
3. Hexagram threshold modifiers applied (additive, can be positive or negative)
4. Spirit threshold modifiers (Hotei/Comedian Blessings, other deferred spirit effects)
5. Floor at 1 (yaku can never have threshold less than 1)

**Hexagram threshold modifiers:** Hexagrams may add or subtract from any specific yaku threshold (e.g., "+1 to Hikari threshold this run") or all yaku thresholds globally.

**Hotei/Comedian Blessing:** Reduces all yaku thresholds by 1 (floored at 1). Stacking both blessings reduces by 2.

**Edge cases:**

- A rank with zero cards in the deck (e.g., zero brights remaining after extensive Non-being deletions) computes proportion 0 → threshold 1 (floored). This is degenerate — Hikari would trigger on the first bright captured, but if there are no brights in the deck at all, it's impossible to capture one and Hikari can never trigger. This is acceptable; the floor at 1 exists to prevent threshold-0 (which would auto-trigger immediately).

### 5.6 Style Combos (Flow Contributors)

Style combos are detected after each capture event. **Each combo triggers at most once per run** — once a player triggers Spring (capturing cards from months 3, 4, 5) in any round, Spring cannot trigger again in any subsequent round of that run. Combo triggers add their bonus to Flow at the moment of detection.

**Current 12 style combos:**

| Style Combo | Requirement | Flow Bonus |
|---|---|---|
| Hanami-zake | Cherry Curtain + Sake Cup* | +0.2 |
| Tsukimi-zake | Full Moon + Sake Cup* | +0.2 |
| Inoshikacho | Boar + Deer + Butterflies | +0.3 |
| Akatan | 3 red ribbons (Jan, Feb, Mar) | +0.4 |
| Aotan | 3 blue ribbons (Jun, Sep, Oct) | +0.4 |
| Spring | ≥1 card from each of months 3, 4, 5 | +0.2 |
| Summer | ≥1 card from each of months 6, 7, 8 | +0.2 |
| Autumn | ≥1 card from each of months 9, 10, 11 | +0.2 |
| Winter | ≥1 card from each of months 12, 1, 2 | +0.2 |
| Full Year | ≥1 card from all 12 months | +0.8 |
| Goko | All 5 brights | +1.0 |

*"Sake Cup" — the September animal card has the legacy ID `september_sake` though it's currently named "Chrysanthemum Cricket." Hanami-zake and Tsukimi-zake use the September Cricket card as the second component. May/September animal naming clarification is pending.

**Style combos are NOT yaku.** They do not trigger Bank/Push. They are pure Flow contributions, providing reward for thematic play without interrupting the round's flow.

**Once-per-run framing:** Because each combo triggers at most once per run, style combos function as run-level milestones rather than per-round farm targets. A player who triggers Spring in Round 2 cannot retrigger it later. This makes the **timing** of when each combo triggers a meaningful strategic question — earlier triggers compound more across the run via Flow's persistent multiplier nature, while waiting for the right round to trigger combos with smaller Flow bonuses can be used to set up bigger plays.

**System status:** The current 12 combos are stable but not the final roster. Many additional style combos will be added — the long-term goal is a substantially larger catalog. Some current combos may be revised. The style combo system is an active development area.

**Visual feedback:** Style combo triggers create a floating popup notification (non-blocking) and contribute to the end-of-round summary in the round overlay.

**Fire-enhanced cards excluded:** Cards with Fire (Ember/Charcoal) Wu Xing enhancement are excluded from style combo detection because Fire enhancements remove a card's identity (no month, type, vertical, or temporal data).

### 5.7 Spirit Contributions and Chain Order

Each spirit contributes to capture scoring through one or more of these operations applied at its position in the chain:

| Operation | What It Does |
|---|---|
| `addPoints` | Adds to the running points value |
| `addMult` | Adds to the running mult value |
| `multiplyMult` | Multiplies the running mult value |

A spirit may contribute multiple operations simultaneously, all applied at the spirit's slot position. Most spirits contribute only one or two types. (No current spirit combines `addMult` and `multiplyMult` — these would have ordering dependencies within the spirit, which is avoided.)

**Stack counts:** A spirit's `stackCount` (acquired via duplicate copies) multiplies its contribution. A 3-stack spirit applies its effect 3× per relevant trigger.

**Two phases of spirit processing within scoring:**

- **`onCardScored`** — Fires per card during Phase 2 (per-card processing). Most foundation spirits and rank-rewarding engine spirits use this path. Chain order matters: each spirit's contribution applies to the running totals at its slot position.
- **`applyEngine`** — Fires once per capture during Phase 3 (engine spirits). Spirits that accumulate state across the round/run typically apply via this path. Chain order also matters here, but applies after all per-card processing is complete.
- **`onCardSeen`** — Per-card state tracking only (no scoring contribution). Fires during Phase 2 alongside `onCardScored` for engines that accumulate state.

**Engine spirit pattern:**

Engine spirits track accumulated state via `onCardSeen` (e.g., Wildlife counts unique animal species captured this run, Plenty counts unique plain cards captured). When ANY capture happens, the engine's `applyEngine` contributes its current state value to that capture's mult or points. This decouples state-tracking (per-card) from state-application (per-capture).

For example: Wildlife counts a new animal species → its accumulator increments. On the next capture (any capture, not just animal), Wildlife applies its current accumulator to the chain.

**Capstone effects:**

Three special "capstone" spirits modify how the entire scoring pipeline operates rather than contributing through the normal channels. They apply globally rather than at chain position:

- One doubles trigger counts for spirit effects
- One redirects mult contributions to also affect points
- One compounds points across captures within a round

Specific capstone mechanics are documented in Section 7 (Spirits) alongside the rest of the spirit catalog.

**Reordering spirits:**

The player can drag and reorder spirits within the loadout. This is a primary strategic mechanic. Identical spirit collections in different positions can produce substantially different output. Common positioning principles:

- Place additive contributions before multiplicative contributions to maximize their leverage
- Place spirits with growing accumulator state (most engines) toward the end of the chain
- Foundation spirits (which contribute on every relevant card) typically belong near the front

**Other systems that affect scoring:**

Beyond spirits, the scoring pipeline incorporates contributions from:

- **Wu Xing enhancements** on captured cards (per-card, before spirit chain)
- **Wu Xing enhancements** on cards held in hand (Phase 1, before per-card processing)
- **Editions** on captured cards (per-card, after Wu Xing, before spirit chain)
- **Stamps** on captured cards (post-scoring, can trigger retriggers)
- **Hexagram effects** (multiple hooks throughout pipeline)
- **Transcended Negatives** (processed in spirit chain alongside slot spirits, contributing their frozen-power effect; see Section 7.2 for transcendence mechanics)

Full mechanics for each of these are documented in their respective sections (8, 9, 10).

**Cross-reference:** See Section 3.7 (Spirit Slots) for slot structure and management. See Section 7 (Spirits) for the full spirit catalog including specific spirits referenced above.

### 5.8 Per-Capture vs Per-Round Effects

Some scoring contributions fire per capture; others fire once per round or once per run.

**Per-capture (every capture):**

- Card base points and full-month bonuses
- Wu Xing enhancement effects (Fire flat, Water mult, Wood mult, Metal/Earth held-in-hand)
- Edition bonuses (Gold, Crystal, Ghost)
- Hexagram per-card hooks
- Spirit chain contributions in slot order (Phase 2)
- Engine spirit applications (Phase 3)
- Stamp triggered effects (Phase 4)
- Util_irrigation flat ki addition (per plain captured)

**Per-round (state updates that fire per capture but accumulate across the round):**

- Engine spirit state updates that reset each round (e.g., Radiance counting brights captured this round)

**Per-run (state updates that fire per capture but accumulate across the run):**

- Engine spirit state updates that persist across rounds (e.g., Wildlife counting unique animal species captured)
- Style combo Flow contributions (each combo +its bonus, once per run total)

**At round end:**

- Successful/failed push Flow modifier
- Round-end Flow decay (×0.95)
- Earth Ki Generation (Clay/Pottery cards in hand generate ki interest)
- Post-round enhancement effects (Water depreciation increment, Fire break rolls, Metal proc rolls)
- Held-card ki bonus (if banked, not if push failed)

### 5.9 Round End Scoring

At round end, the running score is the final score for the round. No batch recalculation happens — the per-capture scores accumulated throughout play ARE the final score.

**Threshold comparison:**

- Round score ≥ threshold: Round cleared. Ki rewards calculated. Proceed to shop.
- Round score < threshold: Run ends. Failure state.

**Ki rewards:**

- Base income per round survived (modifier: Bonds, Ingot, etc. spirits)
- Per yaku triggered this round
- Per successful push
- Surplus bonus when score significantly exceeds threshold
- Held-card ki bonus (each card in hand at bank moment grants ki, modified by Piggybank)
- Style combo ki bonus (Magpie spirit; Grace doubles style ki)
- Earth Ki Generation (handled separately, fires before bank/round-end)

(Specific values and formulas are in Section 11: Ki Economy.)

### 5.10 Naked Scoring Range

For balance reference, the score range a player can achieve without spirits, enhancements, consumables, or any modifier (just the 48-card base deck and matching luck):

- **Floor:** ~30 points (very poor draws, no yaku, no pushes)
- **Ceiling:** ~200 points (excellent draws, all yaku triggered, multiple pushes)

**Worked example (theoretical maximum, all-bright capture run):**

If the player happened to capture every bright card in the deck via 4-card stack auto-captures and triggered all 4 yakus with consecutive successful pushes, the maximum theoretical score is roughly:

- January (Crane bright + Pine ribbon + 2 Pine plains): 20 + 10 + 3 + 3 = 36 + 5 (full month) = 41
- March (Curtain bright + Cherry ribbon + 2 Cherry plains): 36 + 5 = 41
- August (Moon bright + Geese animal + 2 Pampas plains): 38 + 5 = 43
- November (Rainman bright + Swallow animal + Willow ribbon + Lightning): 45 + 5 = 50
- December (Phoenix bright + 3 Paulownia plains): 29 + 5 = 34

Total raw points: ~209

With Flow ramping through pushes (say, 4 successful pushes for ×1.1^4 ≈ ×1.46 final flow) and modest mult from style combos, an exceptional naked round might reach 200-250.

**Threshold curve design:** The threshold curve is designed so that beyond Act 2, naked play is almost certain to fail. Spirit and consumable investment becomes mandatory by Act 3. The 30-200 range describes the player's organic capability before they invest; the run's design assumption is that scaling far beyond this floor requires the spirit/enhancement systems.

**Stamps and other effects can extend the naked ceiling.** Stamps with retriggering (White, Gray) can multiply the effective scoring of individual cards even without spirits. A Gray-stamped Crane retriggered 3 times effectively contributes 4× its base score to the round. This means the "naked" ceiling is somewhat fuzzy — once any card-level modification is in play, scoring can exceed the bare-deck range.

### 5.11 Scoring Architecture Notes

These notes capture the implementation reality (post-May 2026 cleanup) for future Claude sessions working on scoring code.

**Authoritative scoring path:**

The per-capture scoring path lives in `GameRoundManager._addCapture()`. This method handles the multi-phase pipeline (held-in-hand → per-card → retriggers → engines → post-scoring) and adds the resulting captureScore to `_runningScore`. The running score IS the final score — no batch recalculation happens.

A vestigial method `_scoreFieldCards()` exists for hexagram-driven score-at-round-end behavior (gated by the `scoreFieldAtRoundEnd` hook). It only fires under specific hexagram conditions and is not the main scoring path.

**Vestigial code:**

`ScoringEngine.calculateFinalScore()` exists but only serves the metal proc side effect — its score output is discarded by all callers. After the May 2026 cleanup, this method's body was simplified to return only `{ metalConsumableCount: 0 }`. Removing it entirely is a deferred architectural cleanup item.

**Yaku checker simplification:**

The four yaku checker methods (`_checkKasu`, `_checkTanzaku`, `_checkTane`, `_checkHikari`) return only `{ name, count, threshold }`. The previous `bonus` field was removed during cleanup — yakus are gates, not score contributors, and the bonus value was vestigial.

**Yaku gate tracking:**

`_yakuBeforeTurn` is a Set (not Map, post-cleanup) of yaku names already triggered this turn snapshot. The new-yaku filter checks `!set.has(name)` to determine if a yaku is "new" and should fire Bank/Push.

**Style combo flow integration:**

Style combos fire `run.onStyleCombo()` which modifies `run._flow` directly. There is no separate "styleBase" tracker (this was removed during cleanup; the field was always 1.0 in practice).

**Card-targeting infrastructure:**

The `_cardTargetMode` system in GameScene (renamed from `_markMode` during cleanup) handles all consumables that target individual cards (Wu Xing elements, certain Chakra Tools, etc.). This infrastructure originated for the now-defunct Three Marks system but was preserved and renamed for the current systems that use it.

**Architectural debt (deferred):**

- `calculateFinalScore` could be removed entirely; metal proc handling could move to per-capture flow.
- Some `addKi`/`spendKi` callers still pass `'unspecified'` reason strings; tighter telemetry on the deferred list.
- May/September animal naming clarification (legacy IDs `may_bridge`, `september_sake`).
- December's deprecated `december_plain_3` entry could be removed.

---

## 6. Run Structure

A run consists of 36 rounds organized into 6 acts of 6 rounds each, with Sacred Grove visits punctuating the progression.

### 6.1 Acts and Rounds

| Act | Rounds |
|---|---|
| Act 1 | R1 – R6 |
| Act 2 | R7 – R12 |
| Act 3 | R13 – R18 |
| Act 4 | R19 – R24 |
| Act 5 | R25 – R30 |
| Act 6 | R31 – R36 |

Acts have no mechanical effect of their own — they're a structural division for thinking about run pacing, threshold curve shape, and shop variety. The threshold curve is currently TBD pending playtesting, but the design intent is for Act 1 to be approachable for naked play (no spirits required), with progressively higher thresholds requiring deeper investment in spirit/consumable systems by Act 3.

### 6.2 Sacred Grove Cadence

Sacred Grove visits occur every 3 rounds, before rounds R3, R6, R9, R12, R15, R18, R21, R24, R27, R30, R33, and R36. This produces **12 Sacred Grove visits per run**.

The cadence interleaves with regular shopping rounds. After every regular round (except the round just before a Grove visit), the player enters a Wayside Shrine. The pattern within an act is roughly:

```
R1 cleared → Wayside Shrine
R2 cleared → Wayside Shrine
R3 about to start → Sacred Grove (before R3)
R3 cleared → Wayside Shrine
R4 cleared → Wayside Shrine
R5 cleared → Wayside Shrine
R6 about to start → Sacred Grove (before R6)
... etc.
```

So each act of 6 rounds contains 2 Sacred Grove visits. Sacred Grove provides access to fusion spirits, blessings (the Seven Lucky Gods), and other run-shaping options not available in Wayside Shrines.

### 6.3 Run End Conditions

A run ends when one of the following occurs:

- **Run cleared (victory):** The player clears all 36 rounds. Final score is the sum of all banked round scores. Run statistics (best yaku triggered, most pushed, total ki spent, etc.) are summarized.
- **Run failed:** The player fails to meet a round's threshold. Run ends immediately at that round.
- **Player chooses to abandon:** The player can voluntarily end a run (typically rare; mostly during testing).

### 6.4 Hexagram Scoping (Reminder)

Hexagrams are rolled at run start and persist for the entire run. They do not change between acts or rounds. This is the "environmental modifier" design — one hexagram shapes the entire run's character, and the player adapts their build to fit.

See Section 9 (Hexagrams) for full hexagram mechanics.

### 6.5 Threshold Curve Status

The threshold curve (specific score targets for each round) is being tuned through playtesting. Tentative thresholds exist in code but should not be treated as final. Balance philosophy: ramp such that naked play is viable through Act 1, marginal in Act 2, and impractical from Act 3 onward without spirit investment.

---

## 7. Spirits

Spirits are the primary build element of a Hanatu run. The player equips up to 6 spirits (default) plus 2 legendary slot spirits, drawn from a roster of **113 spirits** across multiple tiers and acquisition paths.

This section catalogs the spirit roster organized by mechanical role rather than tier or acquisition path. For each role group, simple spirits (foundation point/additive boosters) are documented in compact tables, while more mechanically interesting spirits get individual subsections covering effect details, strategic context, and notable interactions.

### 7.1 Spirit Acquisition Paths

Before cataloging by mechanical role, here's how each spirit type enters a player's loadout:

- **Wayside Shrine spirits (Tier 1, 81 spirits):** Available in shops throughout the run. Most spirits fall here — foundation, engines, utility, economy, gameplay, meta, decay, retrigger, conditional, demoted rares, and the Tier 1 legendary (Gankyil). Cost ranges 3-8 ki. Rarity ranges common to legendary.

- **Sacred Grove fusions (Tier 2-4, 20 spirits):** Crafted only at Sacred Grove by combining spirits from compatible fusion groups.
  - **Tier 2 fusions (8 spirits):** Single-axis fusions, combining a point spirit and an additive spirit from the same fusion group (e.g., Pollen + Bees → Bloom).
  - **Tier 3 cross-fusions (8 spirits):** Cross-axis fusions, combining two Tier 2 fusions across compatible groups (e.g., Bloom + Heat-axis-fusion → seasonal extreme).
  - **Tier 4 capstones (4 spirits):** Endgame fusions combining Tier 3 spirits. These reshape entire scoring systems and have legendary status (count against legendary slot capacity).

- **Symbionts (Tier 0, 12 spirits):** Generated by the Symbiosis spirit when capturing animal cards. Each animal in the deck (including speculatives) maps to a specific symbiont. Symbionts cannot be purchased, found, or crafted — only summoned.

The player's standard 6 spirit slots can hold spirits of any tier 0-3. The 2 legendary slots are exclusive to Tier 1 legendaries and Tier 4 capstones (5 spirits total: Gankyil + 4 capstones).

### 7.2 Stacking and Transcendence

Spirits stack up to 3 copies maximum. A 4th instance triggers **transcendence** — the spirit becomes a "Negative" (label TBD; the design eventually wants better terminology), which is a frozen-power copy that no longer occupies a spirit slot.

Transcendence is the primary mechanism for accumulating spirits beyond the 6-slot loadout cap. Without it, a run is hard-capped at 6 regular spirits + 2 legendary spirits. With it, a player can build a chain of dozens of spirits across a run.

**Transcendence Power Scaling:**

The Negative inherits the cumulative effect of the stack at the moment of transcendence. Different paths produce different power levels:

| Trigger path | Stack at transcendence | Negative's power |
|---|---|---|
| Amber alchemical on singleton | 1 stack | 1× base |
| Amber alchemical on 2-stack | 2 stacks | 2× base |
| Amber alchemical on 3-stack | 3 stacks | 3× base |
| Natural — 4th copy reaches stack (shop reroll, etc.) | 3 stacks | 3× base |
| Sulfur duplication of a 3-stack (pushes to 4) | 3 stacks | 3× base |

For natural transcendence (4-stack accumulation), the 4th copy triggers transcendence but isn't included in the frozen snapshot — the Negative captures the 3-stack state. For Amber-forced transcendence, the Negative captures whatever the stack value was at the moment Amber activated.

**Note on Amber's tradeoff:** Amber costs **-1 permanent field slot** as a tradeoff for transcendence freedom. This means Amber-driven builds are committing to reduced field capacity for the rest of the run.

**Note on current implementation:** The codebase currently restricts Amber to 3-stack inputs only, contradicting design intent. This restriction is tracked as a deferred cleanup item (see DEFERRED_CLEANUP_ITEMS.md). The values in this table reflect design intent.

**Acquisition paths that contribute to stacking:**

- Purchasing duplicate copies from shops
- Past Life spirit duplication on release
- Symbiosis summoning (when symbionts duplicate existing equipped spirits, though this is rare)
- Sulfur alchemical (duplicates a random equipped stack — can push stack from 3→4 and trigger natural transcendence)

Mirror and Memory copies don't physically duplicate spirits — they copy effects in place during scoring. They don't contribute to stacking.

**How Negatives behave:**

- **Not stackable.** A Negative cannot be stacked with another Negative or with a regular copy of the same spirit.
- **No spirit slot occupied.** Negatives exist outside the 6-slot loadout entirely. They have no slot capacity limit.
- **Contribute to scoring identically to regular spirits.** Negatives apply their (frozen, possibly amplified) effect during scoring chain processing.
- **Interleaved in chain order.** Negatives are part of the spirit chain (Phase 2 and Phase 3 in Section 5.1) and can be reordered freely with regular spirits. They can be placed before, between, or after regular slot spirits.
- **Visually distinct.** Negatives appear different from regular spirits in the UI (specific styling TBD), but they don't have their own dedicated row or display area.
- **No acquisition cap.** A player can theoretically have unlimited Negatives in a single run.
- **Reset at run end.** Like all spirits, Negatives don't persist across runs.

**Strategic implications:**

- **Early-mid run:** Stack core spirits aggressively to reach 4 and transcend, freeing slots for new spirits
- **Late run:** Spirit chain becomes a mix of slot spirits + transcendent Negatives interleaved
- **Amber is precision tool:** Forces transcendence at any stack level, trading frozen power for slot freedom
- **Sulfur is RNG amplifier:** Duplicating an existing 3-stack with Sulfur gives 3× base power transcendence; on lower stacks, it bumps the stack count toward the 4-stack threshold

For sub-3-stack effects, refer to each spirit's per-stack value:
- Bonds at 3 stacks: +15% interest (3 × 5%)
- Coupon at 3 stacks: 45% discount (3 × 15%)
- Reward at 3 stacks: +30% of current ki per successful push (3 × 10%)
- Wildlife at 3 stacks: +1.5 mult per unique animal species (3 × 0.5)

Throughout this section, spirit descriptions reflect per-stack values. When a description in code or in this doc references a "max" value, assume it caps at 3 stacks unless explicitly overridden.

**Code naming note:** The codebase refers to transcended spirits as `negativeSpirits` (e.g., `run.negativeSpirits`). This naming is a legacy artifact from earlier design and will eventually be replaced. There are NO spirits with intrinsically antagonistic effects — every reference to "negative spirits" in code or in this doc means transcended Negatives.

### 7.3 Channel Taxonomy

The codebase uses a `channel` field on each spirit indicating its mechanical role. This taxonomy informs display, filtering, and some game logic:

| Channel | Role |
|---|---|
| `point` | Flat point boost to specific cards |
| `additive` | Adds to mult per qualifying card |
| `multiplicative` | Multiplies mult (engine pattern) |
| `rank` | Type-specific dual contribution (point + additive) |
| `both` | Tier 2 fusion dual contribution (point + additive) |
| `cross` | Tier 3 cross-fusion (multiplicative axis combination) |
| `unity` | Tier 4 capstone (special pipeline modifications) |
| `utility` | Non-scoring effect (draw, generate, transform) |
| `economy` | Ki-related effect |
| `gameplay` | Action-modifying effect |
| `meta` | Copies effects of other spirits |
| `retrigger` | Re-fires scoring on specific card types |
| `symbiont` | Generated by Symbiosis (Tier 0) |

Channels are not strictly mechanical — they serve as taxonomic labels. A spirit's actual scoring contribution operates through the operations described in Section 5.7 (`addPoints`, `addMult`, `multiplyMult`).

### 7.4 May/September Animal Naming Note

Two cards have a known mismatch between their stored names in `cards.js` and the design-canonical names:

| Legacy ID | `cards.js` name | Design canonical name |
|---|---|---|
| `may_bridge` | Iris Fireflies | **Iris Dragonfly** |
| `september_sake` | Chrysanthemum Cricket | **Chrysanthemum Fireflies** |

The design canonical names are confirmed by the symbiont source-animal mappings in `spirits.js` (`sym_algae` sources from "dragonfly"; `sym_snails` sources from "fireflies"). This naming will be updated in `cards.js` during a future cleanup pass.

For the rest of this section and throughout V5, references to these animals should use the **design-canonical names** (Dragonfly for May, Fireflies for September). Code paths still use the legacy IDs (`may_bridge`, `september_sake`).

### 7.5 Foundation Spirits

Foundation spirits are the simplest scoring spirits, providing flat point boosts or additive mult contributions per qualifying card captured. They're the building blocks of most early-game loadouts and remain useful through the run for their reliability.

All foundation spirits cost 3 ki and are common rarity. They contribute at their slot position in the chain.

#### 7.5.1 Seasonal Point Spirits

Each seasonal point spirit grants +20 base points to cards captured from its three-month season.

| ID | Name | Effect | Fusion Group |
|---|---|---|---|
| `spring_pollen` | Pollen | +20 base points per spring card (months 3-5) | spring |
| `summer_heat` | Heat | +20 base points per summer card (months 6-8) | summer |
| `autumn_harvest` | Harvest | +20 base points per autumn card (months 9-11) | autumn |
| `winter_cold` | Cold | +20 base points per winter card (months 12, 1, 2) | winter |

#### 7.5.2 Seasonal Additive Spirits

Each seasonal additive spirit grants +10 additive mult per card captured from its three-month season.

| ID | Name | Effect | Fusion Group |
|---|---|---|---|
| `spring_bees` | Bees | +10 additive mult per spring card | spring |
| `summer_humidity` | Wet | +10 additive mult per summer card | summer |
| `autumn_leaves` | Changing Leaves | +10 additive mult per autumn card | autumn |
| `winter_aridity` | Dry | +10 additive mult per winter card | winter |

A seasonal point spirit and its same-season additive spirit pair via fusion group — combining them at the Sacred Grove yields a Tier 2 fusion (e.g., Pollen + Bees → Bloom).

#### 7.5.3 Axis Point Spirits

Each axis point spirit grants +10 base points to cards along its axis (air, land, day, or night).

| ID | Name | Effect | Fusion Group |
|---|---|---|---|
| `air_clouds` | Clouds | +10 base points per air card | air |
| `land_soil` | Soil | +10 base points per land card | land |
| `day_light` | Light | +10 base points per day card | day |
| `night_dark` | Dark | +10 base points per night card | night |

#### 7.5.4 Axis Additive Spirits

Each axis additive spirit grants +5 additive mult per card along its axis.

| ID | Name | Effect | Fusion Group |
|---|---|---|---|
| `air_wind` | Wind | +5 additive mult per air card | air |
| `land_rock` | Rock | +5 additive mult per land card | land |
| `day_movement` | Movement | +5 additive mult per day card | day |
| `night_stillness` | Stillness | +5 additive mult per night card | night |

Axis foundations have lower individual contribution (+10/+5) than seasonal foundations (+20/+10), but they trigger on a much larger pool of cards. A seasonal spirit qualifies on 12 cards (3 months × 4 cards), while an axis spirit qualifies on 24 cards (half the deck). Net contribution per round tends to be similar.

#### 7.5.5 Rank Foundation Spirits

Rank foundations are slightly more interesting than seasonal/axis foundations because they grant **both** a flat point boost and an additive mult contribution per qualifying card. They use the `rank` channel in code.

| ID | Name | Effect | Notes |
|---|---|---|---|
| `rank_shine` | Shine | +80 base points per bright captured, +8 additive mult per bright | Brights are rarest (5/48 in base deck) so contribution is large per trigger |
| `rank_oxygen` | Oxygen | +50 base points per animal captured, +5 additive mult per animal | Animals are 9/48 in base deck |
| `rank_poem` | Poem | +40 base points per ribbon captured, +4 additive mult per ribbon | Ribbons are 10/48 in base deck |
| `rank_salt` | Salt | +20 base points per plain captured, +2 additive mult per plain | Plains are 24/48 in base deck — half of all captures |

The point/additive ratios are tuned so each rank foundation gives roughly comparable expected contribution per round, accounting for rank frequency. Brights are huge per-card but rare; plains are small per-card but constant.

**Strategic note:** Rank foundations don't share fusion groups with seasonal/axis foundations. They have no Tier 2 fusion path — they remain Tier 1 throughout a run.

### 7.6 Engine Spirits

Engine spirits track state across captures, rounds, or runs, then apply accumulated value to scoring. They use `onCardSeen` for state updates and `applyEngine` for scoring contributions (see Section 5.7). Engines are typically more expensive (4-8 ki) and rarer (uncommon to rare) than foundations.

Engines split into several thematic groups: rank-counting engines (track captures by rank), Wu Xing engines (track enhancement events), miscellaneous engines (various counters), and decay engines (start strong and weaken over rounds).

**Stack counts multiply engine effects.** A 2-stack Wildlife gives +1.0 mult per unique animal species (instead of +0.5). A 3-stack Devotion gives +12 additive mult per bright (instead of +4). This applies broadly to all engine spirits — stack count is a fundamental scaling lever.

#### 7.6.1 Rank Engine Spirits — Multiplicative

These engines accumulate multiplicative mult based on rank-specific events.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `engine_radiance` | Radiance | ×2.0 mult per bright captured this round (resets each round) | 3 | uncommon |
| `engine_wildlife` | Wildlife | Permanent +0.5 mult per unique animal species captured (run-wide) | 3 | uncommon |
| `engine_banner` | Banner | +1.0 mult per ribbon captured this round (resets each round) | 3 | uncommon |
| `engine_plenty` | Plenty | Permanent +0.1 mult per unique plain card captured (run-wide) | 3 | uncommon |

**Radiance** and **Banner** reset each round, making them per-round burst engines — the more captures of their target rank in one round, the bigger the late-round captures. Radiance's exponential ×2.0 stacking makes it explosive when paired with Hikari-targeting builds.

**Wildlife** and **Plenty** persist across the run, rewarding diverse animal/plain coverage. Wildlife counts unique *species* (so capturing the same animal multiple times doesn't help; capturing different animals across the run does). Plenty counts unique *plain cards* (each plain has a distinct ID even if visually similar within a month).

#### 7.6.2 Rank Engine Spirits — Additive

These engines accumulate additive mult based on rank-specific captures, persisting across rounds.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `engine_devotion` | Devotion | +4 additive mult per bright captured (run-wide permanent) | 6 | uncommon |
| `engine_habitat` | Habitat | +2.5 additive mult per animal captured (run-wide permanent) | 6 | uncommon |
| `engine_ceremony` | Ceremony | +2 additive mult per ribbon captured (run-wide permanent) | 6 | uncommon |
| `engine_agriculture` | Agriculture | +1 additive mult per plain captured (run-wide permanent) | 6 | uncommon |

Pattern mirrors the rank-multiplicative engines but accumulates additive mult instead. The 6-ki cost reflects their permanent stacking — by mid-run, these can reach substantial values (e.g., Agriculture in a plain-heavy build might hit +30 to +60 additive mult).

#### 7.6.3 Wu Xing Engine Spirits

These engines track Wu Xing enhancement events (depreciation, breakage, jackpots, etc.) and accumulate multiplicative mult.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `engine_glacier` | Glacier | +0.2 mult-mult per Snow depreciation, +0.4 per Ice depreciation | 4 | uncommon |
| `engine_carbon` | Carbon | +0.5 mult-mult per Ember break, +1.0 per Charcoal break | 4 | uncommon |
| `engine_velocity` | Velocity | +0.1 mult-mult per Iron card in deck, ×1.5 per Meteorite jackpot (compounds) | 4 | uncommon |
| `engine_fossil` | Fossil | +0.1 mult-mult per Clay interest proc, +0.3 per Pottery proc | 3 | uncommon |
| `engine_moths` | Moths | +0.3 mult-mult per Wood field slot creation, +0.6 per Silk stranding avoidance | 4 | uncommon |

Each Wu Xing engine pairs with one element. They reward investment in that specific Wu Xing path: a Glacier player should prioritize Snow/Ice cards in their deck; a Velocity player wants Iron/Meteorite enhancements; etc.

These engines are tier-aware — base-tier enhancements give smaller increments than upgraded-tier (Snow vs Ice, Ember vs Charcoal, Iron vs Meteorite, Clay vs Pottery, Leaf/Wood vs Silk). This rewards upgrading enhancements via Chakra Tools.

#### 7.6.4 Miscellaneous Engine Spirits

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `engine_missing_number` | Missing Number | +5 additive mult per 4-stack scored (run-wide permanent) | 7 | uncommon |
| `engine_palace` | Palace | +0.5 mult-mult per card added to deck (run-wide permanent) | 7 | uncommon |
| `engine_ship` | Ship | +0.3 mult-mult per card discarded (run-wide permanent) | 6 | uncommon |
| `engine_surplus` | Surplus | +1 additive mult per 3 ki currently owned (recalculated per capture) | 6 | uncommon |
| `engine_northern_lion` | Northern Lion | Gains a free reroll each time you push successfully | 7 | uncommon |
| `engine_kintaro` | Kintaro | +0.1 mult-mult per Gold edition consumed (consumes Gold from scored cards, card remains) | 4 | uncommon |
| `engine_golden_toad` | Golden Toad | Applies Gold edition to up to N scored cards per capture (N = stack count); skips cards with existing edition | 5 | uncommon |
| `engine_irrigation` | Irrigation | Each plain captured permanently gains +3 points (stacks across captures) | 5 | uncommon |
| `engine_bullseye` | Bullseye | +1 mult-mult per round where all 4 yaku ranks are completed | 8 | rare |
| `engine_lincoln` | Lincoln | +0.1 additive mult each time you bank (run-wide permanent) | 6 | uncommon |
| `engine_napoleon` | Napoleon | +0.2 additive mult each time a push fails (run-wide permanent) | 7 | uncommon |

A few of these warrant deeper notes:

- **Surplus** is recalculated per capture, not permanent — it reflects current ki, so spending in shops reduces it. Effective for ki-hoarding playstyles.
- **Kintaro and Golden Toad** form a synergy pair: Toad applies Gold edition to scored cards, Kintaro consumes Gold to grow. Together they build a stable engine without external Gold-edition sources.
- **Lincoln and Napoleon** are paired opposites: Lincoln rewards safe banking, Napoleon rewards risky pushing that sometimes fails. Combining them is theoretically possible but mechanically odd — push failures contribute to Napoleon, but successful banks (after pushes) contribute to Lincoln.
- **Irrigation (engine)** permanently mutates each plain it scores: a plain card gains +3 base points permanently when captured. A specific plain captured 5 times has +15 permanent base points. Engine Irrigation is the plain-rank utility spirit (see Section 7.9). A deprecated `util_irrigation` spirit (different effect: +10 ki running-score addition per plain) may still appear in `spirits.js` — that's a deferred cleanup item.

#### 7.6.5 Decay Spirits

Decay spirits start strong and weaken each round. Useful for early-act burst builds.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `decay_persimmon` | Persimmon | Starts at +30 additive mult, loses 3 per round (depleted at ~round 11) | 4 | common |
| `decay_pear` | Pear | Starts at +150 points, loses 5 per round (depleted at ~round 31) | 5 | common |

Decay spirits can be released back at the shop once depleted — they don't take up a slot indefinitely if played correctly.

### 7.7 Conditional Spirits

Conditional spirits apply mult only when specific capture compositions are met. They use the `multiplicative` channel.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `cond_horizon` | Horizon | ×2 mult if capture contains both air and land cards | 7 | uncommon |
| `cond_dream` | Dream | ×2 mult if capture contains both day and night cards | 7 | uncommon |
| `cond_hierarchy` | Hierarchy | ×1.5 mult per unique rank in capture (compounds) | 7 | uncommon |

**Horizon and Dream** require multi-card captures spanning their axis. A 1-card capture can't trigger them. Multi-card captures (especially 4-stack auto-captures) often have mixed axis composition naturally, making these spirits work organically with full-month builds.

**Hierarchy** rewards rank diversity within a capture. A 4-card capture with all 4 ranks (bright + animal + ribbon + plain) gets ×1.5⁴ = ×5.0625 mult. In the base deck, only **November** has all 4 ranks (Rainman bright + Swallow animal + Willow ribbon + Lightning plain), making it the natural target month for Hierarchy builds. Other months reach all-4-rank composition only with speculative cards integrated, or via card movement effects that bring foreign rank cards into a single month's stack.

### 7.8 Retrigger Spirits

Retrigger spirits cause specific captured cards to score multiple times, re-running the full per-card scoring pipeline (Phase 2). They use the `retrigger` channel.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `retrigger_rainbow` | Rainbow | Retrigger scored brights (1 extra trigger per copy) | 7 | uncommon |
| `retrigger_family` | Family | Retrigger scored animals (1 extra trigger per copy) | 6 | uncommon |
| `retrigger_wish` | Wish | Retrigger scored ribbons (1 extra trigger per copy) | 6 | uncommon |
| `retrigger_dew` | Dew | Retrigger scored plains (1 extra trigger per copy) | 6 | uncommon |
| `engine_applause` | Applause | Retrigger held-in-hand effects (Iron, Meteorite, Clay, Pottery) | 7 | uncommon |
| `game_echo` | Echo | The first card captured each round scores twice | 4 | common |

Stacking retriggers compounds linearly — 2 stacks of Rainbow gives 2 extra triggers per bright, scoring it 3 times total. Combined with rank engines (Radiance, Devotion), retriggers can produce massive per-bright burst.

**Applause** is unusual: it doesn't retrigger card captures, but rather the held-in-hand mult contributions from Metal/Earth-enhanced cards in the player's hand. With Applause equipped, a hand full of Iron cards multiplies score from each capture more times. It pairs heavily with Velocity (Iron/Meteorite tracking) and Glacier (Earth interest tracking).

**Echo** retriggers the first capture of every round. Unlike rank-specific retriggers (Rainbow, Family, etc.), Echo is rank-agnostic — it doubles whatever the player happens to capture first. Strategic implication: setting up a high-value first capture (full month, multi-card with rich enhancements) maximizes Echo's value. Codebase note: Echo's `description` field still reads "Coming soon" — this label is a cleanup item, the spirit is functional.

**Stamps as retriggers:** Note that White and Gray Stamps also cause retriggers (1 and 3 retriggers respectively). Retriggers from stamps fire in Phase 4 (post-scoring) using current state, while retrigger spirits fire in Phase 2.5 during the main scoring pass. These mechanisms layer — a Gray-stamped bright with Rainbow equipped can score many times.

### 7.9 Rank Utility Spirits

Rank utility spirits are a 4-spirit cluster, one per card rank (bright, animal, ribbon, plain), each providing a non-scoring effect that triggers when the corresponding rank is captured. Together with the foundation rank spirits (Section 7.5.5), additive rank engines (Section 7.6.2), and multiplicative rank engines (Section 7.6.1), this completes a 4×4 grid of rank-keyed spirits.

| Rank | Foundation (point + additive) | Additive Engine | Multiplicative Engine | Utility |
|---|---|---|---|---|
| Bright | Shine | Devotion | Radiance | Glory |
| Animal | Oxygen | Habitat | Wildlife | Symbiosis |
| Ribbon | Poem | Ceremony | Banner | Festival |
| Plain | Salt | Agriculture | Plenty | Engine Irrigation |

The 4 rank utility spirits:

| ID | Name | Effect | Cost | Rarity | Rank |
|---|---|---|---|---|---|
| `util_glory` | Glory | Whenever you capture a bright card, draw 2 cards | 3 | uncommon | Bright |
| `util_symbiosis` | Symbiosis | Capturing an animal summons a symbiont. 3 stacks summon 3 different symbionts per capture | 7 | uncommon | Animal |
| `util_festival` | Festival | Capturing a colored ribbon generates a stamp of that color (per stack, slot-gated) | 5 | uncommon | Ribbon |
| `engine_irrigation` | Irrigation | Each plain captured permanently gains +3 base points (mutates the card; stacks across captures) | 5 | uncommon | Plain |

Notable mechanics:

- **Glory's draw amount is hard-capped at the deck's available cards.** If the deck has fewer than 2 cards remaining, Glory draws what's available (which may be 0 or 1).
- **Festival's slot-gating** means it stops generating stamps if the player has no consumable slot space. This makes it a strong spirit only when paired with consumable slot expansion.
- **Symbiosis's stack mechanic** is unique: stacks expand the *variety* of symbionts summoned per capture, not the count. With 3 stacks, capturing one animal summons 3 different symbionts (one is the canonical animal-symbiont pairing, the others are random from the symbiont pool). This is documented further in Section 7.17 (Symbionts).
- **Engine Irrigation** is the rank-utility spirit for plains. It's labeled `engine_*` in code (legacy taxonomy) but functions as a rank utility — its effect (permanent per-card +3 base points) creates a long-tail accumulation on individual plain cards, transforming them into miniature engines themselves. A plain captured 5 times across a run has +15 permanent base points, making it more valuable than a fresh plain in subsequent captures.

**Note on `util_irrigation` (deprecated):** An earlier `util_irrigation` spirit existed with a different effect (+10 ki to running score per plain captured). It is now obsolete and replaced by `engine_irrigation` as the plain-rank utility spirit. The `util_irrigation` ID may still appear in `spirits.js`; if so, that's a deferred cleanup item.

### 7.10 Economy Spirits

Economy spirits modify ki acquisition, ki spending, or shop interactions. They use the `economy` channel.

#### 7.10.1 Ki Generation Spirits

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `econ_bonds` | Bonds | +5% addition to interest rate (stacks up to +15% over base; codebase description claiming +25% is incorrect) | 4 | uncommon |
| `econ_ingot` | Ingot | +0.01% interest per 1 ki held (scales with wealth) | 4 | common |
| `econ_grace` | Grace | Multiplies style combo ki: ×2 / ×3 / ×4 (additive stacking) | 3 | common |
| `econ_recycling` | Recycling | Gain +5 ki whenever a card is discarded due to a full field | 3 | common |
| `econ_piggybank` | Piggy Bank | Multiplies hand-card ki: ×2 / ×3 / ×4 (additive stacking) | 3 | common |

**Bonds** and **Ingot** target base interest rate but scale differently. Bonds is a flat +5% per stack (cap +15% over base at 3 stacks). Ingot scales with current ki holdings (+0.01% per ki) — by mid-run with hundreds of ki saved, Ingot becomes meaningful. At 1000 ki held, Ingot adds +10% to base interest. Combined with Bonds at full stack, total interest rate adjustment can exceed +25% over base, before any hexagram or other modifiers.

**Grace** and **Piggybank** modify ki bonuses from specific events (style combos and held-cards-at-bank). Both cap at ×4 with 3 stacks.

**Recycling** rewards full-field plays — useful in builds that intentionally clog the field with non-matching cards.

#### 7.10.2 Push & Shop Economy Spirits

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `econ_lucky_charm` | Lucky Charm | +15% to all probability rolls per stack (Fire breakage, Meteorite jackpot, etc.) | 6 | uncommon |
| `econ_reward` | Reward | Gain 10% of current ki each time a push succeeds (additive stacking, per push) | 5 | uncommon |
| `econ_coupon` | Coupon | 15% discount on all shop prices (stacks up to 45%) | 5 | uncommon |

**Lucky Charm** affects all probability rolls in the game — Fire/Charcoal break chances, Meteorite jackpot rolls, any RNG-driven event. Stacking 3 copies pushes most probabilities meaningfully higher.

**Reward** scales with current ki and stacks per-stack. With 1 stack, a successful push grants +10% of current ki. With 3 stacks (cap), +30% per push. A late-run successful push with 200 ki saved at 3 stacks grants +60 ki. Pairs with Ingot for a wealth-compounding loop.

**Coupon** caps at 45% discount, making it a strong long-term investment in builds with frequent shop purchases.

#### 7.10.3 Additional Economy Spirits

These spirits are functional in the codebase but their `description` fields still read "Coming soon" — a label cleanup item. The mechanics described here are the working design intent.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `econ_replica` | Replica | Duplicate a consumable at the start of each round | 5 | uncommon |
| `econ_print` | Print | Generate bonus ki each time ki is spent in the shop | 4 | rare |
| `econ_collector` | Collector | Each round held earns +3 ki bonus at round end | 3 | uncommon |

### 7.11 Gameplay & Meta Spirits

Gameplay spirits modify core action mechanics. Meta spirits copy or duplicate effects from other spirits.

#### 7.11.1 Gameplay Spirits

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `game_catcher` | Catcher | Cards discarded due to a full hand go to the field instead of lost | 4 | uncommon |

**Catcher** modifies card flow rather than scoring. In a build with frequent forced discards (Recycling, hexagram effects, full-field play), Catcher converts what would be lost cards into field cards — net positive on most measures.

#### 7.11.2 Meta Spirits

Meta spirits copy or duplicate effects from other spirits. They use the `meta` channel.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `game_mirror` | Mirror | Copies the effect of the closest spirit to its left | 6 | rare |
| `engine_memory` | Memory | Copies the effect of the rightmost non-Memory spirit | 8 | rare |
| `util_past_life` | Past Life | When released, creates 1 copy of a random spirit from another occupied slot | 5 | rare |

**Mirror** and **Memory** are powerful but situational. Their copy mechanics depend on positioning:

- **Mirror** copies left — placing Mirror in slot 2 copies slot 1's spirit. Mirror in slot 5 copies whoever's in slot 4.
- **Memory** copies the rightmost non-Memory spirit — always the right edge, regardless of where Memory is placed.

These spirits effectively double a key spirit's contribution. Strategic positioning matters significantly.

**Edge case behavior (verified in code):**

- **Mirror copies Mirror:** If two Mirrors are adjacent (Mirror in slot 1, Mirror in slot 2), the right-side Mirror copies the left-side Mirror, which copies whatever is in the slot to its left. If no spirit exists left of the leftmost Mirror, both Mirrors copy nothing — both effectively contribute zero.
- **Memory copies Memory:** If two Memorys exist and the second Memory is the rightmost non-Memory-target spirit (no other non-Memory spirits to copy), both Memorys copy nothing.
- **Memory left of Mirror:** Technically recursive — Memory copies the rightmost non-Memory (which might be Mirror), Mirror copies its left neighbor (which might be Memory). The game handles this gracefully and resolves to no effect when no other spirits are present.

**Past Life** triggers when it leaves the loadout (voluntary release at shop). On release, it duplicates a random other spirit currently equipped. Strategic use case: load Past Life mid-run, build a powerful loadout around another key spirit, then release Past Life to gain a duplicate of that key spirit. Different mechanism (release-triggered) and different ID prefix (`util_*`) than Mirror/Memory, but conceptually a meta spirit.

### 7.12 Demoted Rares

These six spirits were originally classified as legendary in earlier development but were demoted to rare during balance tuning. Their `id` prefix retains `legend_*` as a code legacy. They are powerful spirits with unique mechanics, but they no longer count toward the legendary slot capacity — they occupy regular spirit slots.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `legend_wuji` | Wuji | +0.3 mult-mult per destroyed card (run-wide permanent) | 8 | rare |
| `legend_dao` | Dao | +0.1 mult-mult per unaltered card in deck (per stack) | 8 | rare |
| `legend_chi` | Chi | multiplyMult equal to current flow value (additive across stacks) | 8 | rare |
| `legend_tengu` | Tengu | +0.3 mult-mult per equipped spirit (regular + Negative, includes itself) | 8 | rare |
| `legend_waidan` | Waidan | On Sacred Grove exit, creates a negative copy of a random consumable per stack | 8 | rare |
| `legend_feng_shui` | Feng Shui | 1× base mult, +0.5 per empty spirit slot (ignores Feng Shui slots when counting) | 8 | rare |

Notable mechanics:

- **Wuji** rewards destruction-based playstyles. Sources of "destroyed cards" include Caterpillar (eats leaf-enhanced cards), Non-being Chakra Tools (deletions), Fire-broken cards, and certain hexagram effects. A destruction-focused build can compound Wuji's effect substantially over a run.
- **Dao** rewards untouched decks. Every Wu Xing enhancement, edition, stamp, rank promotion, or any other card mutation removes a card from Dao's count. A Dao build avoids deck-modification systems entirely, making it antagonistic to most other build paths but effective on its own purist track.
- **Chi** dynamically scales with Flow. At Flow 2.0, Chi contributes ×2 mult; at Flow 0.8, it contributes ×0.8. Stacking is additive — a 2-stack Chi at Flow 2.0 gives a +2 contribution to mult-mult per capture. This makes Chi extremely synergistic with successful pushing and style combo accumulation.
- **Tengu** counts every equipped spirit including itself and all transcended Negatives. A late-run loadout with 6 slots filled + 8 Negatives gives Tengu +4.2 mult-mult per stack. Combined with transcendence accumulation, Tengu is one of the highest-ceiling rare spirits.
- **Waidan** creates **negative copies of consumables** at Sacred Grove exit. This is distinct from spirit transcendence — consumable negatives are a separate system (see Section 8 for consumable mechanics).
- **Feng Shui** rewards empty slots. A player with only Feng Shui equipped (5 empty slots) gets +2.5 mult-mult per stack. As more spirits get equipped, Feng Shui's contribution drops. This creates an unusual minimalist build path.

### 7.13 Tier 1 Legendary — Gankyil

Gankyil is the only Tier 1 spirit with `rarity: 'legendary'`. It occupies a legendary slot.

| ID | Name | Effect | Cost | Rarity |
|---|---|---|---|---|
| `legend_gankyil` | Gankyil | Auto-capture activates at 3-stack instead of 4-stack | 0 | legendary |

**Note:** Cost is 0 in code, indicating Gankyil is acquired through a non-shop path (likely as a reward, hexagram outcome, or specific event — TBD per implementation status).

**Effect:** Normally, a field slot triggers auto-capture when it reaches 4 cards (the full month). With Gankyil equipped, auto-capture triggers at 3 cards — converting an otherwise-stranded 3-stack month into a guaranteed capture.

**Strategic implications:**

- Gankyil eliminates the threat of stranding for any month it touches
- Combined with high-value full-month builds (Hierarchy spirit, edition-stamped cards), Gankyil makes 3-card captures viable
- The 4-card month bonus (+5 base points) doesn't apply to 3-card auto-captures, so Gankyil trades that bonus for guaranteed capture timing
- Gankyil is universal — it doesn't require specific cards or builds, making it a flexible legendary slot pick

### 7.14 Tier 2 Fusion Spirits

Tier 2 fusions are crafted at the Sacred Grove by combining a point spirit and an additive spirit from the same fusion group. They occupy regular spirit slots and offer dual contributions (point + additive) for their fusion group's qualifier (a season or an axis).

The 8 Tier 2 fusions:

#### Seasonal Fusions

| ID | Name | Component Spirits | Effect |
|---|---|---|---|
| `fusion_bloom` | Bloom | Pollen + Bees | Spring cards +15 base points, +7 additive mult per spring card |
| `fusion_thunderstorm` | Thunderstorm | Heat + Wet | Summer cards +15 base points, +7 additive mult per summer card |
| `fusion_decay` | Decay | Harvest + Changing Leaves | Autumn cards +15 base points, +7 additive mult per autumn card |
| `fusion_blizzard` | Blizzard | Cold + Dry | Winter cards +15 base points, +7 additive mult per winter card |

#### Axis Fusions

| ID | Name | Component Spirits | Effect |
|---|---|---|---|
| `fusion_atmosphere` | Atmosphere | Clouds + Wind | Air cards +8 base points, +3 additive mult per air card |
| `fusion_continent` | Continent | Soil + Rock | Land cards +8 base points, +3 additive mult per land card |
| `fusion_sun` | Sun | Light + Movement | Day cards +8 base points, +3 additive mult per day card |
| `fusion_moon` | Moon | Dark + Stillness | Night cards +8 base points, +3 additive mult per night card |

**Fusion mechanics:**

- Sacred Grove fuses two compatible Tier 1 spirits into one Tier 2. Both Tier 1 spirits are consumed.
- Tier 2 contributions are slightly less per-card than the sum of the unfused Tier 1 spirits would provide (e.g., Pollen's +20 + Bees's +10 mult vs Bloom's +15 + +7), but Bloom occupies one slot instead of two — opening room in the loadout.
- Slot efficiency is the primary motivation for T2 fusion. Late-run loadouts with limited slot space benefit substantially from fused versions.
- Tier 2 fusions are not directly purchasable. They can only be crafted at the Sacred Grove with the specific component spirits equipped.

### 7.15 Tier 3 Cross-Fusion Spirits

Tier 3 cross-fusions combine pairs of Tier 2 fusions across compatible axes. They use the `cross` channel and apply ×2 mult to cards qualifying for either of the two axes they span.

The 8 Tier 3 cross-fusions:

#### Polarity Path

| ID | Name | Effect |
|---|---|---|
| `cross_yang` | Yang | Air and Day cards score at ×2.0 mult |
| `cross_yin` | Yin | Land and Night cards score at ×2.0 mult |

Yang covers the "active/light" axis pair; Yin covers the "passive/dark" axis pair. They tile the 4 axes into the I Ching dualistic split.

#### Quadrant Path

| ID | Name | Effect |
|---|---|---|
| `cross_space` | Space | Air and Night cards score at ×2.0 mult |
| `cross_energy` | Energy | Land and Day cards score at ×2.0 mult |

Space and Energy partition the 4 axes by a different cross — air-night vs land-day. This creates two complementary cross-fusion paths that overlap differently.

#### Seasonal Extremes

| ID | Name | Effect |
|---|---|---|
| `cross_solstice` | Solstice | Summer and Winter cards score at ×2.0 mult |
| `cross_equinox` | Equinox | Spring and Autumn cards score at ×2.0 mult |

These pair the seasonal extremes (summer-winter, the heat/cold opposition) and seasonal transitions (spring-autumn, the equinox transitions).

#### Half-Year

| ID | Name | Effect |
|---|---|---|
| `cross_tropic` | Tropic | Spring and Summer cards score at ×2.0 mult |
| `cross_arctic` | Arctic | Autumn and Winter cards score at ×2.0 mult |

These pair adjacent half-years — Tropic covering the warm half, Arctic covering the cold half.

**Cross-fusion mechanics:**

- T3 fusions are crafted at the Sacred Grove by combining two Tier 2 fusions
- The combination must come from compatible fusion groups (e.g., Bloom + Thunderstorm → either a Tropic or seasonal-extreme path; specific recipes TBD in implementation)
- T3 fusions provide a flat ×2.0 mult to any qualifying card — much simpler than T2's point+additive pattern, but applied to a much larger pool of cards
- A player who fuses heavily can stack multiple T3 spirits, creating a chain where most captures hit at least one ×2 mult contribution

### 7.16 Tier 4 Capstone Spirits

Capstones are the endgame fusion tier. They occupy legendary slots and reshape entire scoring systems rather than contributing through normal channels. There are exactly 4 capstones, and they cannot be acquired any way other than Tier 3 fusion at the Sacred Grove.

| ID | Name | Effect |
|---|---|---|
| `capstone_yinyang` | Yin-Yang | Each spirit slot fires its effect twice in chain order |
| `capstone_universe` | Universe | Mult-modifying spirits also affect points by the same value |
| `capstone_time` | Time | Push success ×1.3, fail ×0.95, round decay ×0.98 |
| `capstone_nature` | Nature | Points carry across captures within a round (mult still resets) |

#### Yin-Yang

Yin-Yang doubles every spirit's effect application. Each spirit contributes twice in chain order rather than once. This effectively duplicates every spirit's contribution per capture without occupying additional slots.

- Affects all spirit chain effects: `onCardScored`, `applyEngine`, and `onCardSeen` events
- Engine state-tracking spirits (Wildlife, Plenty) double-count events — each captured animal increments Wildlife twice
- Stacks multiplicatively with existing stacking caps — a 3-stack spirit with Yin-Yang fires 6 times per relevant trigger

#### Universe

Universe redirects mult contributions to also affect points. Spirits that add to or multiply mult also add to or multiply points by the same value.

- A spirit contributing +50 to mult also contributes +50 to points
- A spirit contributing ×2 to mult also contributes ×2 to points
- This effectively doubles the impact of mult-focused spirits, scaling both vectors of the score formula
- Particularly powerful with chain-order optimization — the same chain produces vastly different scores under Universe than without

#### Time

Time modifies the Flow system itself rather than contributing to mult or points. It changes the multipliers Flow uses:

- Successful push: ×1.3 (instead of ×1.1) — over 3× the per-push gain
- Failed push: ×0.95 (instead of ×0.9) — half the penalty
- Round-end decay: ×0.98 (instead of ×0.95) — 60% reduced decay

Time is exceptional for push-heavy playstyles because every push is more valuable and less risky. It also reduces the floor erosion that comes from passive play, enabling more conservative builds to retain Flow.

#### Nature

Nature compounds points across captures within a round. Normally, each capture's points start at 0. With Nature equipped, each capture's points start at the previous capture's cumulative points value.

- The mult chain still resets per capture
- The points value carries forward, accumulating throughout the round
- Late-round captures benefit massively from accumulated point base
- Especially powerful with multi-capture rounds (more captures = more compounding)

**Capstone mechanics:**

- Capstones occupy legendary slots (the player has 2 legendary slots; can hold any combination of Gankyil + capstones)
- Capstones cannot be purchased, refunded, or sold — Sacred Grove is the only acquisition path
- Cost is 0 in code (no ki cost; the cost is the consumed Tier 3 spirits)
- Multiple capstones can be active simultaneously, creating exponentially scaling builds

### 7.17 Symbiont Spirits

Symbionts are Tier 0 spirits generated by the Symbiosis utility spirit (Section 7.9). They are the only spirits acquirable mid-round through gameplay rather than through shops or Sacred Grove. Each symbiont has a designated `sourceAnimal` — a specific animal card whose capture triggers the symbiont's generation.

#### Symbiont Generation Mapping

| Symbiont | Source Animal Card | Effect |
|---|---|---|
| `sym_caterpillar` | February Warbler | Eats leaf-enhanced cards on capture (removed from deck, no yaku credit). After 3, metamorphoses into a copy of a random equipped spirit |
| `sym_cuckoo_egg` | April Cuckoo | Blocks this slot for 3 rounds. Hatches into a random Tier 2 fusion spirit |
| `sym_algae` | May Iris Dragonfly (`may_bridge`) | +0.1 mult-mult each time a symbiont is summoned |
| `sym_ants` | June Butterflies | +0.5 additive mult per card played (permanent across run) |
| `sym_crow` | July Boar | Generate a random consumable at end of round (if slot available) |
| `sym_ducks` | August Geese | Starts at +1 additive mult. Doubles per deck-flip pair, halves per stranded pair. Permanent |
| `sym_snails` | September Chrysanthemum Fireflies (`september_sake`) | +1 additive mult per card NOT played at round end. Permanent across run |
| `sym_magpie` | October Deer | +3 ki each time a style combo triggers |
| `sym_osprey` | November Swallow | Draw the first deck flip into your hand instead of field. Stacks: first N flips |
| `sym_wolf` | January Bear (`january_bear`, speculative) | ×2 mult per scored bright (stacks: ×4/×6) |
| `sym_garden` | March Ladybugs (`march_ladybugs`, speculative) | +0.2 additive mult per unique card in deck |
| `sym_badger` | December Fox (`december_fox`, speculative) | +1 additive mult per consumable used (permanent across run) |

#### Symbiont Mechanics

- **Generation:** When the player has Symbiosis equipped and captures an animal card, the corresponding symbiont is summoned to a free spirit slot. If no spirit slot is available, generation fails (slot-gated).
- **Symbiosis stacking:** With multiple Symbiosis stacks, capturing one animal summons multiple different symbionts per capture. With 3 stacks, capture summons 3 different symbionts (the canonical pairing + 2 random from the symbiont pool).
- **Speculative animals:** Three symbionts (Wolf, Garden, Badger) are gated behind speculative animal cards (Bear, Ladybugs, Fox). They cannot be summoned until the speculatives are integrated into the deck.
- **Slot occupation:** Symbionts occupy regular spirit slots (not legendary slots, no dedicated symbiont slots). Their cost (`cost: 0`) reflects that they're generated rather than purchased.
- **Cuckoo Egg's special behavior:** This symbiont blocks its slot for 3 rounds before transforming into a random Tier 2 fusion. During the blocking period, the slot is occupied but provides no scoring contribution — a 3-round investment for a powerful payoff.
- **Caterpillar's metamorphosis:** After eating 3 leaf-enhanced cards, Caterpillar transforms into a copy of a random equipped spirit. This creates a synergy with leaf-heavy builds — the Caterpillar acts as a leaf consumer that converts into more spirits.

#### Symbiont Strategic Notes

- Symbiosis is a 7-cost uncommon spirit, so investing in it is a deliberate strategic choice
- Symbionts add to spirit count but consume slots — players need to maintain slot capacity to receive them
- The symbiont system is uniquely **emergent**: the available symbionts depend on which animals the player happens to capture during play, creating run-to-run variation even with the same Symbiosis stacks
- Sym_algae creates a feedback loop with Symbiosis itself — each summoned symbiont increments Algae's mult-mult, so symbiont-heavy builds become exponentially more valuable

---

## 8. Consumables

Consumables are single-use items the player accumulates and deploys for tactical effect during a round or for permanent deck/spirit modifications between rounds. Unlike spirits (which apply continuously), consumables fire once when activated and are then removed from the player's inventory.

The consumable system spans seven distinct categories:

- **Chakra Tools** — Deck-modification tools applied between rounds at shops
- **Wu Xing Elements** — Five-element card enhancements, applied to cards in deck or during a round
- **Editions** — Card-level rarity modifiers (Gold, Crystal, Ghost), applied via Heart Chakra and certain spirits
- **Stamps** — 9 card-level effect stamps in 4 tiers, applied to cards via Stamp consumables
- **Zodiac Consumables** — 13 tactical effects for in-round play
- **Alchemicals** — High-cost spirit/run modification consumables, applied at shops

Consumables share inventory slots (default 3, expandable via Artist/Benzaiten Blessings or hexagrams — see Section 3.8). They persist across rounds until used. Pricing across all consumables, like spirits, is being tuned through playtesting.

### 8.1 Chakra Tools

Chakra Tools are deck-modification consumables applied at shops between rounds. They modify cards permanently for the rest of the run. All 7 Chakra Tools cost 4 ki — a uniform price despite varying effect strengths, which is a deliberate design choice for thematic and economic simplicity (subject to playtest tuning).

| ID | Name | Effect | Max Targets |
|---|---|---|---|
| `chakra_root` | Root Chakra | Toggle the day/night axis of selected cards | 3 |
| `chakra_sacral` | Sacral Chakra | Advance the month of selected cards (December cycles back to January) | 3 |
| `chakra_solar_plexus` | Solar Plexus Chakra | Cycle the type of selected cards (plain → ribbon → animal → bright → plain) | 2 |
| `chakra_heart` | Heart Chakra | Apply a random edition to 1 card (60% Gold / 30% Crystal / 10% Ghost) | 1 |
| `chakra_throat` | Throat Chakra | Duplicate 1 card (add an exact copy to your deck) | 1 |
| `chakra_third_eye` | Third Eye Chakra | Permanently delete cards from your deck | 2 |
| `chakra_crown` | Crown Chakra | Copy the identity (month/type/name) of one card onto another, preserving the target's enhancements. Targets 2 cards (source + destination) but converts only 1 (the destination) | 2 |

**Notable mechanics:**

- **Solar Plexus's type cycling** is the primary path to bringing speculative-rank cards into a deck. Most months in the base deck lack one or more ranks (e.g., December has no animal or ribbon by default). Solar Plexus advances a card's rank (plain → ribbon → animal → bright → plain), and the promotion is instantaneous — the card becomes the new rank immediately. When the target rank exists as a speculative card for that month, the card transforms into that speculative; otherwise it becomes a duplicate of an existing rank in that month.
- **Heart Chakra's edition probabilities** (60/30/10) make Gold the common roll, Crystal the moderate roll, Ghost the rare roll. Ghost (×1.5 mult) is the most powerful edition but also the rarest.
- **Throat Chakra's duplication** copies all card properties exactly — including any existing enhancements, editions, or stamps. A duplicated card is a true clone.
- **Third Eye's deletion** is one of the few ways to thin the deck. A thinned deck improves card draw odds and can be used strategically with Dao spirit (rewards unaltered cards in deck, but a smaller deck has higher proportion of unaltered cards).
- **Crown Chakra's identity copy** transfers month/type/name from source card to destination card, but only the destination is converted (1 card changes; 2 cards must be selected to define the operation). The destination card retains its existing enhancements, editions, and stamps; only its identity properties (month, type, name, axis) are overwritten. Useful for replacing low-value cards with high-value identities while preserving accumulated card-level investments.

Chakra Tools use the **card-target mode** UI infrastructure (renamed during May 2026 cleanup from the legacy `_markMode`). When activated, the game enters a targeting state where the player selects up to `maxTargets` cards before applying.

### 8.2 Wu Xing Elements

Wu Xing element consumables apply enhancement states to cards. Each card holds one Wu Xing enhancement at a time (replacing any prior enhancement). Five elements correspond to the traditional Five Elements of Chinese cosmology, with both generative and destructive cycle interactions.

| ID | Name | Base Effect | Upgraded Effect (via cycle) |
|---|---|---|---|
| `element_water` | Water | **Snow** — ×2 mult when scored, depreciates by 0.25 per use | **Ice** — ×4 mult when scored, depreciates by 0.5 per use (via Metal cycle) |
| `element_wood` | Wood | **Leaf** — bypasses field slot limit (creates temporary slot) | **Silk** — bypasses field slot limit + immune to stranding (via Water cycle) |
| `element_fire` | Fire | **Ember** — wildcard worth 30 pts, satisfies all yaku, 20% chance to break | **Charcoal** — 100 pts, 10% break (via Wood cycle) |
| `element_earth` | Earth | **Clay** — 10% ki/round interest when held in hand at round end | **Pottery** — 20% ki/round (via Fire cycle) |
| `element_metal` | Metal | **Iron** — ×1.5 mult when held in hand during scoring, 5% jackpot (+30 ki) on capture | **Meteorite** — ×3.0 mult held-in-hand, jackpot retained (via Earth cycle) |

All Wu Xing element consumables cost 5 ki. Applied to cards via card-target mode during a round, or directly to cards in deck between rounds at shops. (Booster pack mechanics for element distribution have been considered but not yet designed; this is a candidate post-playtest enhancement.)

#### 8.2.1 Wu Xing Cycle Interactions

The five elements form two cycles based on the traditional Wu Xing relationships:

**Generative cycle (upgrades base form to upgraded form):**

- Metal → Water (Snow becomes Ice)
- Water → Wood (Leaf becomes Silk)
- Wood → Fire (Ember becomes Charcoal)
- Fire → Earth (Clay becomes Pottery)
- Earth → Metal (Iron becomes Meteorite)

To upgrade Snow to Ice, the player applies a Metal element consumable to a Snow-enhanced card. Metal "generates" Water in the cycle, upgrading the existing enhancement.

**Destructive cycle (strips enhancement entirely):**

- Earth → Water
- Metal → Wood
- Water → Fire
- Wood → Earth
- Fire → Metal

To remove an enhancement, the player applies the destructive-paired element. This restores the card to its base unenhanced state. Useful for builds that want to reset cards or for satisfying spirits that reward unaltered cards (Dao).

**Cycle reference table:**

| Card has | Apply this for upgrade | Apply this for removal |
|---|---|---|
| Snow (Water) | Metal → Ice | Earth → strip |
| Leaf (Wood) | Water → Silk | Metal → strip |
| Ember (Fire) | Wood → Charcoal | Water → strip |
| Clay (Earth) | Fire → Pottery | Wood → strip |
| Iron (Metal) | Earth → Meteorite | Fire → strip |

Applying an element to a card with no existing enhancement applies the base form (Snow, Leaf, Ember, Clay, or Iron) regardless of cycle position.

#### 8.2.2 Element-Specific Mechanics

**Snow / Ice (Water):** Provides a multiplicative mult per scoring contribution. Each use of the card depreciates the multiplier — Snow starts at ×2 mult, decreasing by 0.25 per use (so capture 1 = ×2, capture 2 = ×1.75, capture 3 = ×1.5, etc.). Ice starts at ×4, decreasing by 0.5 per use. Once a card's mult value reaches 1.0, the enhancement stops contributing. The Glacier engine spirit rewards depreciation events.

**Leaf / Silk (Wood):** Leaf creates a temporary field slot when all regular slots are full, allowing the card to play to the field rather than discarding. Silk additionally prevents stranding — Silk cards trigger capture on deck flip even when the flip would normally strand them. Wood enhancements also contribute to mult during scoring.

**Ember / Charcoal (Fire):** Fire-enhanced cards become wildcards with no specific identity. They have a flat point value (30 or 100), satisfy all yaku conditions, and have a chance to "break" (be destroyed) on capture. Fire enhancements also remove a card from style combo detection because they have no month/type/axis. Carbon engine spirit rewards break events.

**Clay / Pottery (Earth):** Earth-enhanced cards generate ki interest at round end if held in hand. The interest rate is a percentage of current ki. This makes Earth a passive economy enhancement — its value scales with how much ki the player holds. Earth enhancements also contribute mult when held in hand during scoring (Phase 1 of the scoring pipeline).

**Iron / Meteorite (Metal):** Metal-enhanced cards multiply mult when **held in hand during scoring** (not when captured) — this contribution fires in Phase 1 of the scoring pipeline (see Section 5.1). Iron contributes ×1.5 mult per held card, Meteorite ×3.0 mult. On capture, both have a 5% jackpot chance for +30 ki (Iron's jackpot retained on Meteorite). Velocity engine spirit rewards Iron cards in deck and Meteorite jackpots.

### 8.3 Editions

Editions are card-level rarity modifiers applied to cards via Heart Chakra (random) or specific spirit effects (Golden Toad applies Gold). Each card holds one edition at a time.

| Edition | Effect | Heart Chakra Probability |
|---|---|---|
| Gold | +20 flat points to the card | 60% |
| Crystal | +5 additive mult to the capture | 30% |
| Ghost | ×1.5 multiplicative mult to the capture | 10% |

**Edition mechanics:**

- Editions apply per-card during scoring, after Wu Xing enhancement effects but before spirit chain processing (see Section 5.1, Phase 2).
- Each card holds at most one edition. Applying a new edition replaces any existing one.
- Editions are independent of Wu Xing enhancements — a card can have both an enhancement and an edition simultaneously.
- Editions persist across rounds (same as enhancements and stamps).

**Edition acquisition paths:**

- **Heart Chakra** — Random application (60/30/10 distribution)
- **Golden Toad spirit** — Applies Gold to up to N scored cards per capture (N = stack count); skips cards with existing edition
- **Kintaro spirit** — Consumes Gold from scored cards (the card remains, but Gold is removed); each consumption gives Kintaro +0.1 mult-mult permanently

The Kintaro/Golden Toad pair (Section 7.6.4) creates a self-contained edition economy — Toad applies Gold, Kintaro consumes Gold to grow.

**Strategic note:** Editions stack their contributions across the chain. A Gold edition on a card adds +20 to the running points before any spirit applies. A Crystal edition adds +5 to mult before any spirit applies. A Ghost edition multiplies the running mult by 1.5 before any spirit applies. Multiple edition-bearing cards in a single capture can compound substantially.

### 8.4 Stamps

Stamps are 9 card-level effect markers in 4 tiers. Each card holds at most one stamp; applying a new stamp replaces any existing one. Stamps fire on specific triggers (capture, discard, or yaku contribution), with the highest-tier stamps acting as **generic retriggers** that fire on any trigger.

#### 8.4.1 Primary Tier (Purchasable at Any Shrine)

| ID | Name | Trigger | Effect | Cost |
|---|---|---|---|---|
| `stamp_red` | Red Stamp | Yaku | Draw +1 card when this card contributes to a new yaku | 4 |
| `stamp_blue` | Blue Stamp | Discarded | Gain a free consumable when discarded to full field | 4 |
| `stamp_yellow` | Yellow Stamp | Captured | +3 ki | 4 |
| `stamp_white` | White Stamp | Generic (any trigger) | Retrigger — any effect tied to this card fires twice | 6 |

#### 8.4.2 Secondary Tier (Sacred Grove Only)

| ID | Name | Trigger | Effect | Cost |
|---|---|---|---|---|
| `stamp_orange` | Orange Stamp | Captured | Draw +1 card and gain +3 ki | 6 |
| `stamp_green` | Green Stamp | Discarded | +8 ki when discarded to full field | 5 |
| `stamp_purple` | Purple Stamp | Yaku | Gain a free consumable when contributing to a new yaku | 6 |

#### 8.4.3 Tertiary Tier (Crafted by Combining Primary + Secondary)

| ID | Name | Trigger | Effect | Cost |
|---|---|---|---|---|
| `stamp_black` | Black Stamp | Generic (any trigger) | Black's compound effect fires — draw +1 card, gain a free consumable, and +3 ki — when scored, discarded, OR contributing to a yaku | 9 |

Black Stamp is crafted by combining a primary stamp with a secondary stamp:
- Red on Green → Black (yaku-trigger primary + discard-trigger secondary)
- Blue on Orange → Black (discard-trigger primary + capture-trigger secondary)
- Yellow on Purple → Black (capture-trigger primary + yaku-trigger secondary)

Each recipe combines stamps with **different trigger types**. This is the design pattern — Black is generic (fires on any trigger), so its construction requires combining stamps that span different trigger conditions.

#### 8.4.4 Quaternary Tier (Crafted by Combining White + Black)

| ID | Name | Trigger | Effect | Cost |
|---|---|---|---|---|
| `stamp_gray` | Gray Stamp | Generic (any trigger) | Triple retrigger — any effect tied to this card fires 3 additional times (4× total) | 12 |

Gray Stamp is crafted by combining a White Stamp with a Black Stamp:
- White on Black → Gray

Gray is the highest-tier stamp. It has no intrinsic effect of its own — it's a generic retrigger that amplifies whatever other interactions the card has.

#### 8.4.5 Stamp Mechanics

**White and Gray stamps are generic retriggers.** They don't restrict to capture-trigger events — they retrigger ANY effect tied to the stamped card. The retrigger applies the effect a second time using the same arithmetic the effect already uses:

- **Multiplicative effects compound.** A White-stamped Iron card held in hand contributes ×1.5 mult, then retriggers to apply ×1.5 again — so mult is multiplied by 1.5 × 1.5 = ×2.25. Same compounding for any held-in-hand mult, scoring mult, or any multiplicative bonus.
- **Additive effects add twice.** A White-stamped card with a +5 additive mult spirit contribution adds +5, then retriggers to add +5 again — net +10 additive mult.
- **Multiplicative-mult effects multiply twice.** A spirit with ×2 mult-mult contribution applies ×2, then retriggers to apply ×2 again — net ×4.

**Examples:**

- A White-stamped Snow (×2 mult) card scored: applies ×2 mult once base, then retriggers to apply ×2 again — final mult contribution is ×4 (compounding). Depreciation increments **twice** (consuming 0.5 of mult per scoring instead of 0.25), so the next capture's Snow value drops to ×1.5.
- A White-stamped Iron card held in hand: contributes ×1.5 once + retriggers to apply ×1.5 again = ×2.25 effective mult contribution.
- A White-stamped card discarded to a full field, with a discard-trigger spirit equipped, fires that spirit's effect **twice** (applying its arithmetic twice).
- A Gray-stamped card retriggers any effect 3 additional times — a Gray-stamped Iron contributes ×1.5⁴ = ×5.0625 mult held-in-hand. Heavy ki accumulation territory.

**Black Stamp is a generic compound effect.** Black fires its full compound (draw + free consumable + 3 ki) on any of the three trigger events — captured, discarded, or contributing to a yaku.

> **Open design question (pending playtest):** Whether Black should fire all three bonuses (draw + consumable + ki) on every trigger event, or whether the bonuses should split such that Black gives different rewards depending on which trigger fires (e.g., draw on capture, consumable on discard, ki on yaku contribution). The full-bonus model is simpler but may be too powerful; the split model creates more interesting trigger-dependent strategy. This is a tuning decision for playtesting.

**Single-trigger stamps fire once on their specific trigger:**

- **Yaku-trigger stamps (Red, Purple)** fire only when their stamped card is part of the yaku trigger — i.e., when the card moves from capture pile to banked pile by satisfying a yaku threshold. They don't fire if the stamped card is already in the banked pile from a prior yaku.
- **Discard-trigger stamps (Blue, Green)** fire when the stamped card is discarded due to field overflow. This makes them strategic in builds with frequent forced discards (Recycling spirit, hexagram effects).
- **Capture-trigger stamps (Yellow, Orange)** fire on capture only.

**Storage:** Stamps are stored on the card in `card.stamp`. (Codebase currently uses a legacy `card.ribbonStamp` property name — naming cleanup tracked as a deferred item.)

**Stamp depreciation persistence:** Snow/Ice depreciation persists across rounds. A Snow card scored 4 times in a run has used 4 × 0.25 = 1.0 depreciation, dropping its mult contribution to ×1.0 (effective no-op). This requires reapplication of Water enhancement for Snow/Ice builds to remain viable late-run. Glacier engine spirit benefits from depreciation events along the way.

**Stamps can layer with Editions and Wu Xing enhancements.** A single card can have an enhancement, an edition, and a stamp simultaneously, with all three contributing during scoring. Generic retrigger stamps (White, Gray) amplify all of these effects together.

#### 8.4.6 Stamp Acquisition Paths

- **Festival spirit** — Capturing a colored ribbon generates a stamp of that color (slot-gated). Festival is the primary in-round stamp generation path.
- **Shop purchases** — Primary stamps from any shrine; secondary stamps from Sacred Grove only.
- **Crafting** — Tertiary (Black) crafted by combining primary + secondary stamps; Quaternary (Gray) crafted by combining White + Black.
- **Other paths** — Hexagram effects and specific event drops may grant stamps under certain conditions.

Stamps are NOT acquired through Heart Chakra — Heart Chakra applies editions only (Gold, Crystal, Ghost), which are a distinct card-level system.

### 8.5 Zodiac Consumables

Zodiac consumables are 13 single-use tactical effects, each named after one of the 12 zodiac animals plus the Cat (the 13th animal added beyond the traditional Chinese zodiac). They cover hand manipulation, field manipulation, yaku assistance, ki generation, and spirit acquisition. Zodiacs are typically activated during a round for immediate tactical impact.

| ID | Name | Effect | Cost | Category |
|---|---|---|---|---|
| `zodiac_rat` | Rat | Draw 2 extra cards from the deck | 3 | hand |
| `zodiac_ox` | Ox | Clear a stranded stack from one field slot | 2 | field |
| `zodiac_tiger` | Tiger | Force a push without meeting a yaku threshold | 8 | yaku |
| `zodiac_rabbit` | Rabbit | Remove push penalty for this round | 5 | yaku |
| `zodiac_dragon` | Dragon | Ki lottery: gain 0–30 ki (random) | 4 | ki |
| `zodiac_snake` | Snake | Lower one yaku threshold by 1 this round | 4 | yaku |
| `zodiac_horse` | Horse | Discard your hand and draw 8 fresh cards | 5 | hand |
| `zodiac_goat` | Goat | +1 ki per capture for the rest of this round | 4 | ki |
| `zodiac_monkey` | Monkey | Capture all cards on a field slot; discard equal count from hand | 4 | field |
| `zodiac_rooster` | Rooster | Open a 9th field slot for this round | 3 | field |
| `zodiac_dog` | Dog | Retrieve 2 cards from the discard pile | 3 | hand |
| `zodiac_pig` | Pig | +10 ki immediately | 3 | ki |
| `zodiac_cat` | Cat | Summon a random Tier 1 Foundation spirit to an open slot | 3 | spirit |

#### 8.5.1 Zodiac Mechanics by Category

**Hand manipulation (Rat, Horse, Dog):**

- **Rat** is a flat draw +2. Useful for emergency hand replenishment without pushing, or for setting up specific captures.
- **Horse** is a hand reset — discards all current hand cards (which go to discard pile) and draws 8 fresh. Useful when the current hand is unworkable. Note: discarded cards from Horse can trigger discard-stamps (Blue, Green) on those cards, providing an indirect benefit beyond the reset.
- **Dog** retrieves 2 cards from the discard pile back to hand. Especially valuable when paired with discard-trigger stamps or with builds that intentionally cycle cards through the discard pile.

**Field manipulation (Ox, Monkey, Rooster):**

- **Ox** clears a stranded stack — converting an otherwise-locked field slot into an empty one (no capture occurs). Useful when stranded stacks block captures the player wants.
- **Monkey** captures all cards on a field slot at once (regardless of stack count) and discards equal cards from hand. This is a powerful late-round consolidation tool but expensive in hand resource.
- **Rooster** opens a 9th field slot for the round. Pairs with builds that have many full-field captures or need extra room for stacking.

**Yaku assistance (Tiger, Rabbit, Snake):**

- **Tiger** is the most expensive zodiac (8 ki). It forces a push without meeting any yaku threshold. Useful for setting up Napoleon spirit (rewards push failures) or for accessing more captures when the yaku gate is blocking progress.
- **Rabbit** removes the push penalty for the rest of the round. Once activated, any failed push during the remainder of the round skips the ×0.9 Flow penalty. Aggressive players use Rabbit before risky pushes. (Code naming note: the internal flag is `_dogProtection`, a legacy naming artifact that should refer to Rabbit's effect, not Dog's. Deferred cleanup item.)
- **Snake** lowers one yaku threshold by 1 for the current round. Useful when a yaku is just out of reach (e.g., needing 6 more plains for Kasu, but Snake reduces threshold to 5).

**Ki generation (Dragon, Goat, Pig):**

- **Dragon** is a ki lottery — randomly grants 0-30 ki. Average expectation 15 ki for a 4-ki cost — net +11. Variance is high.
- **Goat** grants +1 ki per capture for the rest of the round. Effective in capture-heavy rounds (likely 5+ captures expected to break even).
- **Pig** is a flat +10 ki. Reliable.

**Spirit acquisition (Cat):**

- **Cat** summons a random Tier 1 Foundation spirit (16 candidates) to an open slot. Provides a budget alternative to shop browsing for foundation spirits — but the random target may not align with the player's build.

#### 8.5.2 Code Naming Note: `_dogProtection`

The internal flag for "push penalty suppression" is named `_dogProtection` in the codebase. This is a legacy artifact from the **deprecated `consumable_dog` legacy consumable** (which had this exact effect — nullify push penalty). Rabbit (`zodiac_rabbit`) reuses this flag for backward compatibility while also setting its own `_rabbitActive` flag. Since `consumable_dog` is now deprecated (see DEFERRED_CLEANUP_ITEMS.md) and Rabbit is the current consumable doing this work, the flag should ideally be renamed to `_pushPenaltySuppression` or `_rabbitActive` (already partially done).

When working with the codebase: searching for `_dogProtection` is the path to push-penalty mechanics, but Rabbit is the consumable that activates it.

### 8.6 Alchemicals

Alchemicals are high-cost spirit and run-modification consumables. They typically perform structural transformations — creating, fusing, defusing, or transforming spirits and their stacks. Their high ki costs (15-50) make them late-game investments rather than routine tactical tools.

| ID | Name | Effect | Cost |
|---|---|---|---|
| `alch_cinnabar` | Cinnabar | Fuse 2 selected spirits into a Tier 2 or Tier 3 fusion | 30 |
| `alch_mercury` | Mercury | De-fuse a Tier 2/3 fusion into its 2 ingredients (requires 2 open spirit slots) | 20 |
| `alch_jade` | Jade | Add 1 stack to a selected spirit (max 3) | 15 |
| `alch_sulfur` | Sulfur | Duplicate a random occupied slot, then clear another random occupied slot | 25 |
| `alch_amber` | Amber | Transcend a stacked spirit. Cost: -1 permanent field slot | 35 |
| `alch_lead` | Lead | Summon a random Rare spirit. Cost: half your current ki | 20 |
| `alch_pearl` | Pearl | Fuse 2 Tier 3 cross-fusions into a Tier 4 Capstone (Legendary slot). Components preserved | 50 |

#### 8.6.1 Spirit Fusion Path

**Cinnabar** is the standard fusion path — combines 2 selected spirits into a higher-tier fusion. The fusion type depends on the input pair:

- 2 Tier 1 spirits sharing a fusion group → Tier 2 fusion (e.g., Pollen + Bees → Bloom)
- 2 Tier 2 fusions in a compatible cross-pair → Tier 3 cross-fusion (e.g., Bloom + Thunderstorm → Tropic)

**Pearl** is the endgame fusion path — combines 2 Tier 3 cross-fusions into a Tier 4 Capstone. Critically, Pearl **preserves the components** rather than consuming them. This means Pearl is effectively a duplicator that creates a capstone without losing the underlying fusions. Highest ki cost (50) but highest payoff.

**Mercury** is the defusion path — splits a Tier 2 or Tier 3 fusion back into its 2 ingredient spirits. Requires 2 open spirit slots to receive the components. Useful for reverting a fusion choice (e.g., a player fused too aggressively early and needs to unwind for a different build direction).

#### 8.6.2 Stack Manipulation Path

**Jade** adds 1 stack to a selected spirit, capped at 3 stacks. This is the precision stacking path — buying a Jade gives a controlled stack increase rather than rolling shop randomness or hoping for duplicate copies.

**Sulfur** duplicates a random occupied slot, then clears another random occupied slot. Net effect: shifts the loadout's composition randomly while increasing one stack. Sulfur is double-edged — the duplicated slot might be a desired build piece (good) or a low-priority spirit (wasteful), and the cleared slot is similarly random. **Edge case:** When only one spirit is equipped, no clearing happens — Sulfur becomes a pure duplication. Sulfur can push a 3-stack to a 4-stack and trigger natural transcendence (3× power Negative).

**Amber** is the precision transcendence path. Forces transcendence on a stacked spirit, producing a Negative whose power equals the stack count at the moment of transcendence (1× / 2× / 3× for 1-stack / 2-stack / 3-stack inputs). Costs **-1 permanent field slot** as a tradeoff — Amber-driven builds are committing to reduced field capacity for the rest of the run. **Note:** The codebase currently restricts Amber to 3-stack inputs only — this is incorrect implementation, tracked as a deferred cleanup item.

#### 8.6.3 Run-Wide Acquisition Path

**Lead** summons a random Rare spirit at the cost of half the player's current ki. Provides access to the rare-rarity spirit pool without browsing shops. Lead's pool excludes any rare spirit the player has already at 3-stack with an existing Negative copy — preventing redundant summons of fully-transcended spirits. Variance is high — the random rare may not fit the build, and the half-ki cost is significant late-run.

#### 8.6.4 Strategic Implications

Alchemicals enable build pivots that aren't available through normal shop progression:

- **Cinnabar/Pearl** create fusion paths the shop can't directly offer
- **Mercury** reverses a fusion mistake
- **Jade/Sulfur** modify stacking economy
- **Amber** transitions stacked spirits to Negatives, freeing slots
- **Lead** opens up the rare-rarity pool

Pricing across alchemicals (15-50 ki) reflects the mid-late-run timeline when these tools become useful. Alchemicals are NOT viable in early rounds when the player has 10-20 ki to spend.

### 8.7 Consumable Acquisition Paths

Consumables enter the player's inventory through several paths:

| Source | What it offers |
|---|---|
| Wayside Shrine | Primary stamps, Wu Xing elements, Chakra Tools, Zodiacs, Tier 1 spirits |
| Sacred Grove | Above + Secondary stamps, Tier 2-4 fusions (via Cinnabar/Pearl), Blessings |
| Spirit Festival | Stamp generation on ribbon capture (matches ribbon color) |
| Spirit Crow (symbiont) | Random consumable generation at end of round (slot-gated) |
| Spirit Waidan | Negative copies of consumables on Sacred Grove exit |
| Stamp triggers (Blue, Black, Purple) | Free consumable on stamp activation (slot-gated) |
| Hexagram outcomes | Various consumable rewards depending on hexagram |
| Crafting | Tertiary stamps via primary+secondary combination; Quaternary stamps via White+Black |

The consumable inventory has 3 default slots (expandable to 5 via Artist/Benzaiten Blessings, plus hexagram modifications). Slot pressure is significant — late-run players often need to choose between holding strategic alchemicals, in-round zodiacs, and reserve Wu Xing elements.

### 8.8 Strategic Notes and Cross-System Synergies

The consumable system creates several emergent synergies with spirits and other game systems:

**Wu Xing + Engine Spirits:** Each Wu Xing engine (Glacier, Carbon, Velocity, Fossil, Moths) rewards specific Wu Xing events. A Wu Xing-themed build pairs the relevant element consumables with the matching engine for compounding gains.

**Stamp Festival Loop:** Festival generates stamps on ribbon captures. With Festival equipped + multiple stacks, a heavy ribbon-capture round produces stamps that the player can apply to other cards, generating more triggers — a self-sustaining loop. Engine Banner amplifies this further (mult-mult per ribbon captured).

**Edition Kintaro/Toad Loop:** Golden Toad applies Gold to scored cards; Kintaro consumes Gold for permanent mult-mult. The pair is a self-contained edition economy that scales with capture volume.

**Discard Trigger Cluster:** Builds that intentionally cycle cards through the discard pile leverage Blue/Green stamps (discard ki/consumables), Recycling spirit (+5 ki per discard), Engine Ship (+0.3 mult-mult per discard), and Caterpillar symbiont (eats leaf-enhanced cards on capture). This cluster supports a "controlled chaos" archetype.

**Generic Stamp Multiplier Stack:** White and Gray stamps amplify any effect on the card. Stacking generic stamps with mult-multiplying enhancements (Iron, Snow, Ghost edition) produces compounding burst per capture. Gray on a Meteorite-Ghost-edition card with Velocity and Wildlife engines is end-game scoring territory.

**Alchemical Build Pivots:** Mercury reverses a fusion mistake. Lead opens rare access without shop dependency. Pearl preserves T3 fusions while creating capstones. Together, alchemicals enable mid-run build pivots that pure shop progression can't.

**Speculative Card Strategy:** Solar Plexus brings speculatives into the deck; speculative animals enable additional symbiont options (Wolf, Garden, Badger). Building toward speculative animal density requires Solar Plexus investment plus Symbiosis equipped — a dedicated strategic axis.

**Transcendence Slot Economy:** Amber + Sulfur + Jade form a stacking/transcendence economy. Stack with Jade, transcend with Amber (or accidentally via Sulfur), free up slots, fill with new spirits, repeat. This is the path beyond the 6-slot cap.

---

## 9. Hexagrams

The hexagram system applies a single I Ching-derived modifier to the entire run, rolled at run start and persistent for all 36 rounds. Hexagrams shape the strategic character of a run more than any other system — a Hexagram with `volatile_flow` rewards aggressive pushing, while `score_field_at_round_end` inverts capture incentives entirely.

There are **64 hexagrams** total, matching the I Ching's traditional set. Each has six binary lines (yin/yang) determining its identity, plus a name (Chinese, English), a category, and a coded effect.

This section covers (1) the system's mechanics and design framework, (2) eight double-trigram hexagrams that produce the most game-changing effects, and (3) a full catalog of all 64 hexagrams organized by category.

### 9.1 System Mechanics

#### 9.1.1 Acquisition and Persistence

A hexagram is rolled at run start via a coin-throw mechanic (mechanic specifics TBD per implementation status). Once rolled, the hexagram persists for the entire run — it does not change between rounds, acts, or shop visits.

The default hexagram for a player's first run is **`hex_02` (Kūn / Receptive Earth)**, which has a `no_effect` payload. New players experience normal gameplay before progressing to other hexagrams in subsequent runs.

#### 9.1.2 Effect Hooks

Hexagram effects are implemented as a set of optional hook methods. The active hexagram's hooks are queried by the game engine at relevant moments. Hooks include:

- `onRunStart(runManager)` / `onRoundStart()` / `onRoundEnd()` — Lifecycle hooks
- `onCardScored(card)` — Per-card during scoring chain (Phase 2)
- `onCardSeen(card)` — Per-card during scoring chain (state tracking)
- `onCaptureComplete({run})` — After each capture
- `onPushSuccess(run)` / `onPushFailure(run)` — Push events
- `modifyDeck(cards)` — Deck composition (run start only)
- `modifyYakuThreshold(yakuName, baseThreshold)` — Yaku threshold tuning
- `modifyFieldSlots(base)` / `modifyHandSize(base)` / `modifySpiritSlots(base)` / `modifyCardsDealt(base)` — Slot/hand modifiers
- `modifyPushSuccess()` / `modifyPushFailure()` / `modifyFlowDecay()` — Flow modifiers
- `modifyStyleKi(baseKi)` / `modifyStyleFlow(baseFlow)` — Style combo tuning
- `modifyKiReward()` / `modifyHandKi()` / `modifyInterestRate()` / `modifyShopPrice()` / `modifyShopCount()` / `modifyRerollCost()` — Economy modifiers
- `modifyFirePoints(tier)` / `modifyFireBreakChance(tier)` / `modifyWoodScoring(tier)` / `modifyEarthInterest(tier)` / `modifyEarthHeld(tier)` / `modifyMetalHeldMult(tier)` / `modifyMeteoriteJackpot()` / `modifyWaterDepreciation(tier)` — Wu Xing parameter tuning
- `computeFinalScore(points, mult, flow)` — Override final score formula
- `revealsDeckFlip()` / `discardUnmatchedDeckFlip()` / `forceAutoBankOnYaku()` / `modifyPlaysPerTurn()` / `overridesCaptureRule()` / `disableCaptureScoring()` / `scoreFieldAtRoundEnd()` / `disablesYaku()` / `shouldSpiritsFireTwice()` / `modifyDeckFlipsPerTurn()` — Radical mode flags

A hexagram needs only the hooks relevant to its effect; most hexagrams use 1-3 hooks.

#### 9.1.3 Boost-and-Debuff Pattern

Many hexagrams in the boost categories (axis, combined axis, seasonal, rank) follow a **boost-and-debuff pattern**:

- Cards in the target category receive a multiplicative bonus (typically ×1.5, ×2.0, ×2.5, or ×3.0)
- Cards in the **opposite category** receive a debuff (typically ×0.5)
- Cards in unrelated categories are unaffected

For example, `boost_air` (`hex_09`):
- Air cards: ×1.5 mult contribution
- Land cards: ×0.5 mult contribution
- (Day/night categorization unaffected — but a land+day card would still get ×0.5 because it's land)

This pattern creates risk-reward decisions: a hexagram boosting one category implicitly punishes its opposite, encouraging players to lean into the boosted axis or face score reductions on opposite-category captures.

#### 9.1.4 Categories

The 64 hexagrams fall into 15 categories:

| Category | Count | Description |
|---|---|---|
| `double_trigram` | 8 | The 8 hexagrams composed of doubled trigrams. These produce the most game-changing effects. |
| `axis_individual` | 4 | Boost a single axis (air, land, day, night) |
| `axis_combined` | 4 | Boost a quadrant intersection (yang, yin, space, energy) |
| `seasonal_individual` | 4 | Boost a single season (spring, summer, autumn, winter) |
| `seasonal_combined` | 4 | Boost a multi-month seasonal grouping (equinox, solstice, tropic, arctic) |
| `rank` | 4 | Boost a single rank (brights, animals, ribbons, plains) — also raises that rank's yaku threshold |
| `wuxing_cycle` | 5 | Modify Wu Xing element parameters (water, wood, fire, earth, metal) |
| `push_flow` | 2 | Modify Flow's push success/failure/decay multipliers |
| `style_combo` | 2 | Modify style combo rewards (ki double / flow double) |
| `field_hand` | 4 | Trade off field slots vs hand size or threshold modifications |
| `spirits` | 4 | Trade off spirit slots vs cards/spirit-firing |
| `deck_composition` | 10 | Add/remove/duplicate cards in the deck |
| `economy` | 7 | Modify ki acquisition/spending economics |
| `misc_scoring` | 1 | Replace the scoring formula entirely (Inner Truth) |
| `misc` | 1 | Total deck randomization (Youthful Folly) |

### 9.2 Double-Trigram Hexagrams (The 8 Most Game-Changing)

The 8 double-trigram hexagrams are formed from a trigram repeated twice. They produce the most fundamental gameplay alterations — these aren't multiplier tweaks; they change how the game itself plays.

| ID | Name | Effect | Description |
|---|---|---|---|
| `hex_02` | Kūn (Receptive Earth) | `no_effect` | Default hexagram for first runs; gameplay proceeds normally |
| `hex_01` | Qián (Creative Heaven) | `score_field_at_round_end` | Score field contents at round end. Captures REMOVE cards from scoring — captures become detrimental |
| `hex_29` | Kǎn (Abysmal Water) | `match_by_rank` | Cards match by rank (bright/animal/ribbon/plain) instead of by month. Yaku are disabled |
| `hex_30` | Lí (Clinging Fire) | `one_yaku_disabled` | One yaku is disabled each round, cycling kasu→tanzaku→tane→hikari. The non-disabled yaku get threshold-1 |
| `hex_51` | Zhèn (Arousing Thunder) | `deck_flip_revealed` | All deck cards are revealed face-up; the next deck flip is known in advance. Unmatched flips are discarded |
| `hex_52` | Gèn (Keeping Still) | `yaku_ends_round` | Completing any yaku immediately auto-banks the round. No pushing |
| `hex_57` | Xùn (Gentle Wind) | `match_by_adjacent_month` | Cards match the months directly before and after them (wraps Jan/Dec) |
| `hex_58` | Duì (Joyous Lake) | `play_two_cards` | Play two hand cards per turn instead of one. Both play before deck flips |

These 8 hexagrams represent the deepest variation in the game. Each fundamentally alters the moment-to-moment play loop:

**Qián (Creative Heaven) inverts capture logic.** Instead of captures contributing to score, captures REMOVE cards from the field's eventual end-of-round score. Players must carefully avoid over-capturing while still satisfying yaku requirements. This is the steepest learning curve hexagram.

**Kǎn (Abysmal Water) replaces month-matching with rank-matching.** The fundamental capture mechanic changes — instead of matching cherry blossom with another cherry blossom, players match brights with brights, ribbons with ribbons. Yaku are disabled because rank-matching removes the yaku gate's meaning. Push-your-luck still functions but yaku gates do not.

**Lí (Clinging Fire) creates a rotating disability.** Each round, a different yaku is unreachable (Infinity threshold). The other three yaku get threshold-1 to compensate. Players adapt loadouts to whichever yaku is disabled this round.

**Zhèn (Arousing Thunder) eliminates deck-flip surprise.** Every deck card is visible. Strategy shifts from probabilistic capture planning to deterministic capture planning. Unmatched flips are discarded (rather than placed on field), changing the field-overflow dynamic.

**Gèn (Keeping Still) removes pushing.** Any yaku trigger immediately ends the round. Score becomes purely accumulation-up-to-first-yaku, with no extension via push. Reward calibration shifts dramatically.

**Xùn (Gentle Wind) expands matching.** Cards match adjacent months as well as their own — January cards match December and February cards. This roughly triples the matching pool, making captures much easier and changing how monthly stacking works.

**Duì (Joyous Lake) doubles per-turn play volume.** Two cards play before each deck flip. Resource consumption (hand) doubles; capture density doubles. Round pacing changes substantially.

**Kūn (Receptive Earth)** is the no-effect baseline. It's the hexagram a first-time player gets, ensuring their first run experiences vanilla mechanics before the system layers in.

### 9.3 Full Hexagram Catalog

The complete catalog organized by category. For each hexagram: ID, number, English name, effect identifier, brief description.

#### 9.3.1 Double Trigrams (8)

See 9.2 above for detailed coverage.

#### 9.3.2 Axis Individual (4) — Boost target axis ×1.5, debuff opposite ×0.5

| Hex | Number | Name | Effect | Target |
|---|---|---|---|---|
| `hex_09` | 9 | Xiǎo Xù (Small Taming) | `boost_air` | Air cards (24 in base deck) |
| `hex_19` | 19 | Lín (Approach) | `boost_land` | Land cards (24 in base deck) |
| `hex_35` | 35 | Jìn (Progress) | `boost_day` | Day cards (24 in base deck) |
| `hex_36` | 36 | Míng Yí (Darkening Light) | `boost_night` | Night cards (24 in base deck) |

#### 9.3.3 Axis Combined (4) — Boost target quadrant ×1.5, debuff opposite quadrant ×0.5

| Hex | Number | Name | Effect | Target Quadrant |
|---|---|---|---|---|
| `hex_11` | 11 | Tài (Peace) | `boost_yang` | Air ∩ Day (12 cards) |
| `hex_12` | 12 | Pǐ (Standstill) | `boost_yin` | Land ∩ Night (12 cards) |
| `hex_33` | 33 | Dùn (Retreat) | `boost_space` | Air ∩ Night (12 cards) |
| `hex_34` | 34 | Dà Zhuàng (Great Power) | `boost_energy` | Land ∩ Day (12 cards) |

#### 9.3.4 Seasonal Combined (4) — Boost target months ×3.0/×2.5, debuff opposite months ×0.5

| Hex | Number | Name | Effect | Target Months (intent) | Debuff Months |
|---|---|---|---|---|---|
| `hex_56` | 56 | Lǚ (Wanderer) | `boost_equinox` | Mar, Sep — boost ×3.0 | Solstice (Jun, Dec) ×0.5 |
| `hex_55` | 55 | Fēng (Abundance) | `boost_solstice` | Jun, Dec — boost ×3.0 | Equinox (Mar, Sep) ×0.5 |
| `hex_42` | 42 | Yì (Increase) | `boost_tropic` | Mar, Apr, May, Jun, Jul, Aug (Spring + Summer) — boost ×2.5 | Arctic (Sep–Feb) ×0.5 |
| `hex_41` | 41 | Sǔn (Decrease) | `boost_arctic` | Sep, Oct, Nov, Dec, Jan, Feb (Autumn + Winter) — boost ×2.5 | Tropic (Mar–Aug) ×0.5 |

Equinox and Solstice are 2-month boundary-point sets. Tropic covers the 6 warm months (Spring + Summer); Arctic covers the 6 cold months (Autumn + Winter). Tropic and Arctic overlap with the individual seasonal hexagrams and the Equinox/Solstice hexagrams.

**Code/design discrepancy:** The current `HexagramEffects.js` implementation uses non-overlapping 4-month sets for Tropic (Apr/May/Jul/Aug) and Arctic (Oct/Nov/Jan/Feb) — excluding the boundary months. This is incorrect per design intent. The fix is tracked in `DEFERRED_CLEANUP_ITEMS.md`. The values in this table reflect the design intent.

#### 9.3.5 Seasonal Individual (4) — Boost target season ×2.5, debuff next season in cycle ×0.5

| Hex | Number | Name | Effect | Target |
|---|---|---|---|---|
| `hex_03` | 3 | Zhūn (Sprouting) | `boost_spring` | Spring cards; Summer ×0.5 |
| `hex_47` | 47 | Kùn (Oppression) | `boost_summer` | Summer cards; Autumn ×0.5 |
| `hex_18` | 18 | Gǔ (Work on the Decayed) | `boost_autumn` | Autumn cards; Winter ×0.5 |
| `hex_27` | 27 | Yí (Nourishment) | `boost_winter` | Winter cards; Spring ×0.5 |

The cycle is unidirectional — each season debuffs the season AFTER it (Spring→Summer→Autumn→Winter→Spring). Two opposing seasons cannot fight (e.g., `boost_spring` doesn't debuff Autumn directly).

#### 9.3.6 Rank (4) — Boost target rank, also raise that rank's yaku threshold by 1

| Hex | Number | Name | Effect | Multiplier | Yaku Affected |
|---|---|---|---|---|---|
| `hex_14` | 14 | Dà Yǒu (Great Possession) | `boost_brights` | ×2.0 | hikari +1 threshold |
| `hex_13` | 13 | Tóng Rén (Fellowship) | `boost_animals` | ×1.5 | tane +1 threshold |
| `hex_22` | 22 | Bì (Adorning) | `boost_ribbons` | ×1.3 | tanzaku +1 threshold |
| `hex_08` | 8 | Bǐ (Holding Together) | `boost_plains` | ×1.2 | kasu +1 threshold |

The rank hexagrams have inverse multiplier scaling — rarer ranks get bigger multipliers (brights ×2, plains ×1.2). Each makes its target rank's yaku harder to trigger but the cards more valuable.

#### 9.3.7 Wu Xing Cycle (5) — Modify Wu Xing parameters per element

These hexagrams alter Wu Xing element behavior rather than card scoring directly. Each modifies several parameters specific to its element's mechanics.

| Hex | Number | Name | Effect | Notable Modifications |
|---|---|---|---|---|
| `hex_50` | 50 | Dǐng (Cauldron) | `boost_wood` | Fire flat points reduced (15/50), Fire break chance increased (40%/20%), Wood scoring mult increased (1.3/1.5) |
| `hex_49` | 49 | Gé (Revolution) | `boost_fire` | Fire flat points significantly increased (60/200), Fire break reduced (10%/5%), Earth interest increased |
| `hex_15` | 15 | Qiān (Modesty) | `boost_earth` | Earth held mult and Metal held mult both increased; Meteorite jackpot rate slightly reduced |
| `hex_43` | 43 | Guài (Breakthrough) | `boost_metal` | Metal held mult increased (1.75/3.5), Meteorite jackpot greatly increased (15%), Water depreciation accelerated |
| `hex_48` | 48 | Jǐng (The Well) | `boost_water` | Water depreciation slowed substantially, Wood scoring reduced |

Exact tier values for each are encoded in `HexagramEffects.js` per element parameter.

#### 9.3.8 Push / Flow (2)

| Hex | Number | Name | Effect | Modification |
|---|---|---|---|---|
| `hex_64` | 64 | Wèi Jì (Before Completion) | `volatile_flow` | Push success ×1.2 (instead of ×1.1), fail ×0.7 (instead of ×0.9), decay ×0.85 (instead of ×0.95) |
| `hex_63` | 63 | Jì Jì (After Completion) | `stable_flow` | Push success ×1.05 (instead of ×1.1), fail ×0.95 (instead of ×0.9), decay ×0.98 (instead of ×0.95) |

`volatile_flow` amplifies all flow swings — bigger gains, bigger losses. `stable_flow` tamps everything down — smaller gains and losses, slower decay.

#### 9.3.9 Style Combo (2)

| Hex | Number | Name | Effect | Modification |
|---|---|---|---|---|
| `hex_45` | 45 | Cuì (Gathering Together) | `style_ki_double` | Style combo ki rewards doubled; flow contribution removed |
| `hex_46` | 46 | Shēng (Pushing Upward) | `style_flow_double` | Style combo flow contributions doubled; ki removed |

These two hexagrams partition the style reward economy — one doubles ki at the cost of flow, the other doubles flow at the cost of ki.

#### 9.3.10 Field / Hand (4)

| Hex | Number | Name | Effect | Tradeoff |
|---|---|---|---|---|
| `hex_59` | 59 | Huàn (Dispersion) | `field_plus_hand_minus` | Field +1, Hand size -1 |
| `hex_60` | 60 | Jié (Limitation) | `field_minus_hand_plus` | Field -1, Hand size +1 |
| `hex_62` | 62 | Xiǎo Guò (Small Exceeding) | `field_plus_two_double_flip` | Field +2, deck flips reveal 2 cards per flip |
| `hex_28` | 28 | Dà Guò (Great Exceeding) | `field_minus_two_threshold_minus` | Field -2, all yaku thresholds -1 |

#### 9.3.11 Spirits (4)

| Hex | Number | Name | Effect | Tradeoff |
|---|---|---|---|---|
| `hex_26` | 26 | Dà Xù (Great Accumulation) | `spirit_plus_cards_minus` | Spirit slots +1, cards dealt -1 |
| `hex_40` | 40 | Jiě (Deliverance) | `spirit_minus_cards_plus` | Spirit slots -1, cards dealt +1 |
| `hex_32` | 32 | Héng (Persevering) | `four_spirits_fire_twice` | Spirit slots capped at 4, all spirit effects fire twice per trigger |
| `hex_21` | 21 | Shì Kè (Biting Through) | `eight_spirits_graduated_tax` | Spirit slots expand to 8, but each round-end taxes ki based on spirit count (5+: 1 ki, 6: 3 ki, 7: 6 ki, 8: 10 ki) |

#### 9.3.12 Deck Composition (10)

These hexagrams modify the deck at run start. Some remove categories of cards entirely; others duplicate cards.

| Hex | Number | Name | Effect | Deck Modification |
|---|---|---|---|---|
| `hex_38` | 38 | Kuí (Polarising) | `no_brights_plain_threshold_minus` | Bright cards removed; kasu threshold -1 |
| `hex_39` | 39 | Jiǎn (Limping) | `deck_36_field_plus` | Deck reduced to 36 cards (1 plain removed per month); field +1 |
| `hex_20` | 20 | Guān (Contemplation) | `deck_60_hand_plus` | Deck expanded to 60 (1 plain duplicated per month); hand +1 |
| `hex_23` | 23 | Bō (Stripping) | `no_plains_double_others` | All plain cards removed; non-plains duplicated |
| `hex_17` | 17 | Suí (Following) | `animal_deck` | Each month's highest-rank non-animal replaced with a duplicate of that month's animal |
| `hex_31` | 31 | Xián (Conjoining) | `ribbon_deck` | Each month's highest-rank non-ribbon replaced with a duplicate of that month's ribbon |
| `hex_25` | 25 | Wú Wàng (Innocence) | `day_deck` | All night cards removed; remaining day cards duplicated |
| `hex_53` | 53 | Jiàn (Infiltrating) | `night_deck` | All day cards removed; remaining night cards duplicated |
| `hex_44` | 44 | Gòu (Coming to Meet) | `air_deck` | All land cards removed; remaining air cards duplicated |
| `hex_37` | 37 | Jiā Rén (The Family) | `land_deck` | All air cards removed; remaining land cards duplicated |

These hexagrams require revision and balancing pass — each fundamentally alters deck composition, which affects yaku thresholds (which scale with deck composition), card draw frequencies, and overall round pacing. The exact behaviors are subject to playtesting.

#### 9.3.13 Economy (7)

| Hex | Number | Name | Effect | Modification |
|---|---|---|---|---|
| `hex_05` | 5 | Xū (Waiting) | `no_hand_ki_double_interest` | Held-card ki bonus removed at round end; ki interest rate doubled |
| `hex_24` | 24 | Fù (Returning) | `start_50_ki_no_income` | Run starts with 50 ki; no ki income from any source |
| `hex_07` | 7 | Shī (Leading) | `plus_offerings_double_reroll` | Shop offerings +1 per visit; reroll cost doubled |
| `hex_54` | 54 | Guī Mèi (Marrying Maiden) | `minus_offerings_discount` | Shop offerings -1 per visit; all items 25% discount |
| `hex_16` | 16 | Yù (Enthusiasm) | `no_banking_ki_plus_capture` | Banking disabled (must push or let round end); +1 ki per capture |
| `hex_06` | 6 | Sòng (Conflict) | `push_ki_swing` | Push success grants +10 ki; push failure costs up to 10 ki |
| `hex_10` | 10 | Lǚ (Treading) | `price_increase_more_consumable_slots` | Shop prices +25%; consumable inventory expanded to 5 slots permanently |

#### 9.3.14 Misc Scoring (1)

| Hex | Number | Name | Effect | Description |
|---|---|---|---|---|
| `hex_61` | 61 | Zhōng Fú (Inner Truth) | `balanced_scoring` | Replaces final score formula. Standard: `points × mult × flow`. Inner Truth: `((points + mult) / 2)² × flow`. The formula averages points and mult, then squares — this rewards balanced builds (similar points and mult) rather than extreme skew toward one. |

Inner Truth fundamentally changes optimal build strategy. Builds that maximize a single dimension (e.g., all multipliers, no point boosts) score worse than balanced builds. The squaring at the end means moderate balance with modest values produces large scores.

#### 9.3.15 Misc (1)

| Hex | Number | Name | Effect | Description |
|---|---|---|---|---|
| `hex_04` | 4 | Méng (Youthful Folly) | `randomized_deck` | Each round, the deck is reshuffled with months and types randomly redistributed across cards. Nothing is consistent across rounds |

Youthful Folly is the most chaotic hexagram. Card identities (month, type) are randomized each round, breaking continuity assumptions for nearly every other system (yaku tracking, style combo detection, spirit affinity). It rewards adaptable play styles.

### 9.4 Note on Description-vs-Implementation Discrepancies

Many hexagram descriptions in `hexagrams.js` do not accurately reflect the actual implementation in `HexagramEffects.js`. The descriptions in this section reflect the **actual implementation** rather than the codebase's player-facing flavor text. Multiple description corrections are tracked as deferred cleanup items (see `DEFERRED_CLEANUP_ITEMS.md`):

- Axis hexagrams describe by month rather than by per-card axis
- Boost hexagrams omit the debuff to opposite category
- `volatile_flow` and `stable_flow` descriptions are completely wrong
- `four_spirits_fire_twice` description references Fire enhancement (should reference all spirits)
- `balanced_scoring` description claims spirits are removed (actually formula change)
- Rank hexagrams omit the yaku threshold modification
- Wu Xing cycle hexagrams oversimplify the parameter changes

Players should expect hexagram descriptions to be revised in a future update pass.

---

## 10. Blessings — The Seven Lucky Gods

Blessings are foundational permanent run modifiers, distinct from spirits and consumables. Once obtained, a Blessing applies for the entire run and cannot be sold or removed. The 14 Blessings are organized as 7 pairs, each pair drawn from the **Shichifukujin** (Seven Lucky Gods) of Japanese folklore — the divine patrons of fortune.

Blessings are acquired exclusively at the Sacred Grove (mechanic specifics: not yet implemented as of May 2026; see Section 17 Implementation Status).

### 10.1 The Pair Structure

Each Blessing has two forms:

- **Tier 1 (colloquial)** — Named after a mortal pursuit or role (Fisherman, Merchant, Warrior, Artist, Scholar, Elder, Comedian)
- **Tier 2 (deity)** — Named after the corresponding Lucky God (Ebisu, Daikokuten, Bishamonten, Benzaiten, Fukurokuju, Jurojin, Hotei)

Both tiers in a pair have **identical effects**. Owning both stacks the bonus (e.g., owning Fisherman + Ebisu = +2 cards dealt across all deals).

**Tier 2 requires Tier 1.** A player cannot acquire the deity form without first owning the colloquial form. This creates a progression — Fisherman first, Ebisu second, with the pairing representing the alignment of mortal practice with divine grace.

### 10.2 The Seven Pairs

Each pair represents one of the Seven Lucky Gods and their thematic mortal counterpart. Effects are listed once per pair (since both tiers have identical effects).

| Pair | Tier 1 (Colloquial) | Tier 2 (Deity) | Effect | Stack Cap |
|---|---|---|---|---|
| 1 | Fisherman | Ebisu | +1 cards dealt across all deals (initial + pushes) | +2 max |
| 2 | Merchant | Daikokuten | +1 item per shop section | +2 max |
| 3 | Warrior | Bishamonten | +1 spirit slot | +2 max |
| 4 | Artist | Benzaiten | +1 consumable slot | +2 max |
| 5 | Scholar | Fukurokuju | +1 hand size capacity | +2 max |
| 6 | Elder | Jurojin | +1 field slot | +2 max |
| 7 | Comedian | Hotei | -1 to all yaku thresholds (floored at 1) | -2 max |

### 10.3 Cultural Significance

Each Lucky God's domain in Japanese folklore informs their mechanical effect:

- **Ebisu** (恵比寿) — God of fishermen, luck, and prosperity. The mortal counterpart "Fisherman" reflects the catching of fortune. Effect: +1 cards dealt — more catches, more captures.
- **Daikokuten** (大黒天) — God of commerce and wealth. The mortal counterpart "Merchant" reflects trade and exchange. Effect: +1 shop offering — wider selection at each shrine.
- **Bishamonten** (毘沙門天) — God of warriors and treasure-guarding. The mortal counterpart "Warrior" reflects battle and protection. Effect: +1 spirit slot — more allies in the chain.
- **Benzaiten** (弁才天) — Goddess of arts, music, eloquence, and skill. The mortal counterpart "Artist" reflects creative practice. Effect: +1 consumable slot — more tools of craft.
- **Fukurokuju** (福禄寿) — God of wisdom, longevity, and the scholarly life. The mortal counterpart "Scholar" reflects study and learning. Effect: +1 hand size — greater capacity to hold knowledge (cards).
- **Jurojin** (寿老人) — God of longevity and elder wisdom, the most senior of the Lucky Gods. The mortal counterpart "Elder" reflects life experience. Effect: +1 field slot — room to maneuver, more strategic options.
- **Hotei** (布袋) — The laughing Buddha-monk who carries gifts and brings laughter. The mortal counterpart "Comedian" reflects humor and accessibility. Effect: -1 yaku thresholds (floor 1) — lowers the bar, makes things easier.

The pairing structure (mortal + divine) is itself culturally meaningful: practitioners of mortal pursuits could be patronized by their corresponding deity. A fisherman might be blessed by Ebisu directly (Tier 2), but only after demonstrating commitment to the practice (Tier 1).

### 10.4 Mechanical Implications

Blessings modify foundational game capacities (slots, cards, thresholds, shop offerings). Their effects compound across the run — a player with all 14 Blessings has substantially more capacity than a player without:

| Element | Default | With 1 Blessing tier | With Both Pair Tiers |
|---|---|---|---|
| Hand size | 8 | 9 | 10 |
| Cards dealt | 8 | 9 | 10 |
| Field slots | 8 | 9 | 10 |
| Spirit slots | 6 | 7 | 8 |
| Consumable slots | 3 | 4 | 5 |
| Shop offerings | per shop default | +1 per section | +2 per section |
| Yaku threshold reduction | 0 | -1 (floor 1) | -2 (floor 1) |

The **Hotei pair (Comedian/Hotei)** is particularly notable because it doesn't expand a slot category but modifies yaku thresholds. A 2-stack Hotei in a build with otherwise low-density yaku contribution can make Hikari (1-2 brights) or Kasu (4-5 plains) reachable that would otherwise require deck modification.

The **Daikokuten pair (Merchant/Daikokuten)** expands shop access without affecting in-round capacity. Pairs with builds that depend heavily on specific shop pickups (rare engines, alchemicals, specific consumables).

### 10.5 Acquisition

Blessings are acquired exclusively at Sacred Grove. The acquisition mechanic is **not yet implemented** as of May 2026. The intent is for Blessings to be a Grove-specific reward path distinct from spirit purchasing — a player visiting the Grove chooses whether to spend ki on fusion crafting, blessings, or specific Grove-only stamps/spirits.

When implemented, the acquisition is expected to:
- Be ki-cost-based (specific costs TBD)
- Require the player to actively choose and accept the blessing
- Make Tier 2 deity blessings unavailable until the corresponding Tier 1 colloquial is owned
- Persist through the run; cannot be sold or refunded

**12 Sacred Grove visits per run** (every 3 rounds, before R3 through R36) provide the acquisition windows. With 14 Blessings to acquire and only 12 visit opportunities, players cannot collect all 14 in a single run — choices must be made.

### 10.6 Strategic Notes

**Build dependency:** Blessings shape build viability significantly. A Wildlife-heavy animal build might prioritize Bishamonten (extra spirit slots for engines), while a deck-modification build might prioritize Daikokuten (more Chakra Tools available per shop).

**Tier 2 as commitment marker:** Acquiring both tiers of a pair locks 2 Blessing investments into a single effect. This is a deeper commitment than diversifying across 7 different Tier 1 Blessings. Strategic consideration depends on whether a single effect's amplification matters more than breadth.

**Hotei's late-act value:** The threshold reduction is most valuable late-run when threshold curves are highest. A 2-stack Hotei in Act 5-6 can enable yaku triggers that would otherwise be unreachable.

**Comedian first or Hotei?** Acquiring Comedian (Tier 1) gives -1 thresholds. Acquiring Hotei (Tier 2) without yet having Comedian is impossible. So players must commit to the path: take Comedian, then later if they want -2, take Hotei. Other pairs work similarly — Tier 1 is the gateway.

---

## 11. Ki Economy

Ki is the primary resource currency in Hanatu. Players earn ki through scoring, combos, capture-trigger rewards, and economic spirits, and spend it on shop purchases (spirits, consumables, fusions). Strategic ki management — knowing when to bank, when to push, when to invest in interest-bearing spirits — is a major axis of decision-making.

### 11.1 Round-End Ki Reward

At the end of each round (round end, not push fail), the player earns ki from the following formula:

```
Ki Reward = 5 (base)
          + cards_in_hand × Piggybank multiplier
          + style_combos × Grace multiplier
          + earth_ki_bonus
```

| Component | Description |
|---|---|
| **Base** | Flat 5 ki per round, regardless of performance |
| **Cards-in-hand** | +1 ki per card remaining in hand at bank time. Forfeited entirely on push failure |
| **Piggybank multiplier** | Multiplies cards-in-hand ki by `1 + piggybank_stacks`. No hard cap; soft-capped by build economy (slots spent on Piggybank are slots not spent on point/mult contributors) |
| **Style combos** | +1 ki per style combo triggered this round (once-per-run combos only) |
| **Grace multiplier** | Multiplies style combo ki by `1 + grace_stacks`. No hard cap; soft-capped same as Piggybank |
| **Earth ki bonus** | Interest earned from Clay/Pottery-enhanced cards held in hand at round end (10%/20% of current ki) |

**Push failure penalty:**

If the round ends due to push failure, the player forfeits all hand-derived ki (the `cards_in_hand × Piggybank` component). Base 5 ki and style combo ki are still awarded — style combo ki because it accrues at the moment a combo is achieved (before any push attempt), and base 5 ki by current implementation.

> **Open design question:** Whether the base 5 ki should also be forfeited on push failure, increasing the punishment for failed pushes. This is a tuning decision pending playtest.

**Hexagram modifiers:**

Round-end ki rewards are passed through the `modifyKiReward` hexagram hook. Specific hexagrams that modify this:

- `no_hand_ki_double_interest` (Xū / Waiting) — Hand-derived ki removed; interest rate doubled instead
- `start_50_ki_no_income` (Fù / Returning) — Run starts with 50 ki; no ki income from any source for the entire run
- `no_banking_ki_plus_capture` (Yù / Enthusiasm) — Banking disabled (must push or let round end); +1 ki per capture
- `push_ki_swing` (Sòng / Conflict) — Push success grants +10 ki; push failure costs up to 10 ki

### 11.2 Round-Start Interest

Before each round begins, ki interest is applied to the current balance:

```
Interest = floor(ki × interest_rate)
```

**Interest rate composition:**

| Component | Rate Modifier |
|---|---|
| Base rate | 10% |
| Bonds spirit | +5% per stack. No hard cap; soft-capped by stacking limits (max 3 stacks per spirit naturally; further copies become Negatives) and by slot economy |
| Ingot spirit | +0.01% per ki held (so ×100 ki = +1% rate; ×1000 ki = +10% rate). At low ki balances this produces fractional values that current implementation truncates — the spirit needs redesign for low-ki contexts |
| Hexagram modifier | Various (e.g., `no_hand_ki_double_interest` doubles base to 20%) |

**Strategic implications:**

- **Bonds** is a flat boost — useful at all wealth levels, with steeper benefit early when 5% matters more. Each stack adds another flat +5%; the soft cap is how many slots a player commits to Bonds vs. scoring spirits.
- **Ingot** scales with wealth — meaningful only at high ki balances. At 100 ki, +1%; at 500 ki, +5%; at 1000 ki, +10%. At low ki balances, Ingot's fractional contribution is currently truncated by integer floor, making the spirit weak in early rounds.
- **Bonds + Ingot stacking** at 500+ ki produces compounding gains: 10% base + +15% (3 stacks Bonds) + 5% Ingot = 30% interest per round
- **Hexagram modifiers** can dramatically alter the economic profile — `start_50_ki_no_income` makes any economy spirits useless for the run
- The interest is calculated **per round**, applied at round start. So 12 rounds at ~30% interest each create exponential growth for late-game wealth

### 11.3 In-Round Ki Sources

During a round, ki accumulates through capture-trigger and discard-trigger events:

| Source | Ki Yielded | Trigger |
|---|---|---|
| Yellow Stamp | +3 ki | On capture of stamped card |
| Orange Stamp | +3 ki + 1 card draw | On capture of stamped card |
| Green Stamp | +8 ki | On discard of stamped card |
| Black Stamp | +3 ki (+ draw + consumable) | On capture/discard/yaku trigger |
| Iron / Meteorite jackpot | +30 ki | 5% chance per Metal-enhanced card capture |
| Recycling spirit | +5 ki | Per discard event (per stack) |
| Goat Zodiac (active) | +1 ki per capture | Round-long buff once activated |
| Style combo ki rewards | +3 ki per combo | When a style combo unlocks (once-per-run) |
| Pig Zodiac (immediate) | +10 ki | Activated as consumable |
| Dragon Zodiac (lottery) | 0–30 ki | Activated as consumable |

The Goat round-long buff and Recycling per-discard ki create incentives for high-volume capture and discard play styles respectively.

### 11.4 Ki Sinks

Ki is spent on:

| Sink | Cost Range |
|---|---|
| Tier 1 spirits (Wayside Shrine) | 5–8 ki |
| Tier 1 spirits (Sacred Grove) | 6–10 ki |
| Tier 1 Legendary (Sacred Grove) | 12–15 ki |
| Wu Xing element consumables | 5 ki |
| Chakra Tools | 4 ki (uniform) |
| Primary Stamps | 4–6 ki |
| Secondary Stamps | 5–6 ki |
| Tertiary Stamp (Black) | 9 ki |
| Quaternary Stamp (Gray) | 12 ki |
| Zodiacs | 2–8 ki |
| Cinnabar (T2/T3 fusion) | 30 ki |
| Mercury (de-fusion) | 20 ki |
| Jade (+1 stack) | 15 ki |
| Sulfur | 25 ki |
| Amber (-1 field slot, transcendence) | 35 ki |
| Lead (random rare, half ki) | 20 ki + half current ki |
| Pearl (T4 capstone) | 50 ki |
| Speculative cards | 10–20 ki |
| Shop reroll | 3 ki (increases with each reroll, modifiable) |

**Hexagram modifiers on costs:**

- `price_increase_more_consumable_slots` (Lǚ / Treading) — All shop prices +25%
- `minus_offerings_discount` (Guī Mèi / Marrying Maiden) — All items 25% discount
- `plus_offerings_double_reroll` (Shī / Leading) — Reroll cost doubled

**Effective cost calculation:**

The shop applies `run.getEffectiveCost(baseCost)` to all listed costs, which incorporates hexagram price modifiers, blessings, and any discount sources. The displayed cost reflects what the player actually pays.

### 11.5 Economic Spirits

Several spirits modify the ki economy directly:

| Spirit | Effect |
|---|---|
| `econ_recycling` | +5 ki per discard event |
| `econ_piggybank` | Multiplies hand-derived round-end ki by `1 + count` (no hard cap; soft-capped by slot economy) |
| `econ_grace` | Multiplies style combo ki by `1 + count` (no hard cap; soft-capped by slot economy) |
| `econ_bonds` | +5% interest rate per stack (no hard cap; soft-capped by slot/stack economy) |
| `econ_ingot` | +0.01% interest rate per ki held (scales with wealth; needs redesign for low-ki contexts where fractional contribution truncates) |
| `econ_replica` | Replicates a copy of the spirit it sits next to in chain (amplifies adjacent effect) |
| `econ_print` | (Description: "Coming soon" — see Section 7.10.3) |
| `econ_collector` | (Description: "Coming soon" — see Section 7.10.3) |

These spirits are typically rare-tier or higher, requiring strategic investment. They scale in different directions:

- **Volume scalers** (Recycling, Piggybank, Grace) reward many small events
- **Wealth scalers** (Ingot) reward large accumulated balances
- **Flat scalers** (Bonds) reward consistent ki balance management

A "wealthy hoarder" build combines Bonds + Ingot + minimal in-round spending. A "high-volume" build uses Recycling + Piggybank + Grace + frequent discards.

### 11.6 Run-Wide Ki Trajectory

A typical run's ki curve (illustrative ranges, subject to revision via playtesting):

| Phase | Rounds | Ki Range | Notes |
|---|---|---|---|
| Early (Act 1) | R1–R6 | 0–80 | Limited spending power; basic shop purchases only |
| Mid-early (Act 2) | R7–R12 | 50–200 | First Sacred Grove visits enable T2 fusions |
| Mid (Act 3-4) | R13–R24 | 100–500 | Build commitment phase; investment vs. tactical spending |
| Late (Act 5-6) | R25–R36 | 200–1500+ | High interest yields; capstones become accessible |

These ranges are illustrative and will be calibrated through playtesting. The economy as a whole — including ki sources, sinks, and pricing — is subject to balance passes that may shift these curves substantially.

Wealth-scaling spirits (Ingot, compound interest) make late-run economy fundamentally different from early-run. A 15% interest rate at 100 ki is +15 ki, but at 1000 ki is +150 ki. Players who don't invest in economy early may struggle to keep up with the increasing scaling demands of late-act yaku thresholds.

### 11.7 Strategic Notes

**Compound interest as a build axis:** Bonds + Ingot + Piggybank is a self-reinforcing build. Each round's surplus ki increases the next round's interest, creating exponential growth if maintained. The catch: this build sacrifices spirit slots that could otherwise hold scoring engines.

**Push-or-bank as ki management:** Pushing risks losing the round's ki entirely (push failure forfeits hand-derived ki). Banking secures the ki but caps the round's scoring. A run focused on ki maximization may bank more conservatively than a run focused on score maximization.

**Economic blessings:** Merchant/Daikokuten Blessings expand shop offerings (+1 each), giving more options per Sacred Grove visit. This indirectly improves ki efficiency by reducing reroll costs.

**Hexagram volatility:** Some hexagrams fundamentally change ki economy (Fù starts you with 50 ki and removes income; Yù makes capturing more lucrative but removes banking). Build planning must adapt to the active hexagram's ki profile.

**Ki vs. score trade-offs:** Heart Chakra investments trade ki for editions (Gold, Crystal, Ghost) that boost score. Late-run, ki has diminishing utility (no shops left to spend at), so converting ki to edition mult during the final acts can be optimal.

---

## 12. Shop Structure

The shop system uses a single Phaser scene (`ShrineScene`) with two variants distinguished by an `isGrove` flag: **Wayside Shrine** (regular shop) and **Sacred Grove** (special shop). The visual layout of both is documented in detail in Section 13.11 (UI & Presentation); this section focuses on shop logic — offering generation, purchase rules, and acquisition paths.

### 12.1 Shop Cadence

- **Wayside Shrine** appears between regular rounds (every round except those preceding Sacred Grove visits).
- **Sacred Grove** appears every 3 rounds — before R3, R6, R9, R12, R15, R18, R21, R24, R27, R30, R33, R36 — for a total of **12 visits per run**.

This means out of 35 inter-round gaps in a 36-round run, 12 are Sacred Groves and 23 are Wayside Shrines.

**Endless mode (planned):** A future endless mode will continue rounds beyond R36 with continually increasing thresholds. The shop cadence pattern (Sacred Grove every 3 rounds, Wayside Shrines between) will continue repeating indefinitely.

### 12.2 Offering Generation

Each shop visit generates fresh offerings across four quadrants (Spirits, Deck-Fixing, Playing Cards, Zodiacs). The number of offerings per quadrant scales with the shop type and modifiers:

```
Base offerings = isGrove ? 4 : 2
                + Merchant blessing count
                + Daikokuten blessing count
Final offerings = applyHook('modifyShopCount', baseOfferings)
```

So:
- Default Wayside: 2 per quadrant (8 total)
- Default Sacred Grove: 4 per quadrant (16 total). Planned reduction to 3 per quadrant (12 total) during balance pass.
- With both Merchant + Daikokuten: +2 per quadrant
- Hexagram modifiers (e.g., `plus_offerings_double_reroll` adds offerings) further adjust this

**Quadrant contents:**

| Quadrant | Wayside Shrine | Sacred Grove |
|---|---|---|
| Spirits (Q_TL) | Random Tier 1 | Random Tier 1; **15% chance per slot** to roll a Tier 1 Legendary instead |
| Deck-Fixing (Q_TR) | Chakra Tools, Wu Xing, Primary Stamps | All of those + Secondary Stamps; **20% chance per slot** to roll an Alchemical instead |
| Playing Cards (Q_BL) | Speculative cards from a smaller pool | Speculative cards from a wider pool (more rare cards) |
| Zodiacs (Q_BR) | Random Zodiacs | Random Zodiacs (same pool) |

### 12.3 Spirit Offering Filtering

The spirit pool is filtered before random selection to exclude spirits the player has already maxed out:

- A spirit is **excluded** if the player has 3 stacks of it AND already has a Negative copy of it. (This prevents shops from offering spirits whose only value would be redundant transcendence triggers.)
- Owned non-maxed spirits remain in the pool — purchasing them increases the stack count, which is strategically valuable.

This filtering means late-run shops with many maxed-out spirits in the player's loadout have a smaller effective pool, naturally reducing offering diversity.

> **Open design question:** Stacking is a core mechanism for making spirits more powerful, but the rules for obtaining additional copies need explicit design. The current filter (exclude only if 3-stack + Negative) is a starting point, but questions remain — should shops weight non-owned spirits more heavily? Should owning a Tier 1 spirit increase or decrease the chance of seeing Tier 2 fusion ingredients? Should there be a per-shop visibility limit on already-owned spirits to encourage diversity? These rules need refinement during playtesting.

### 12.4 Deck-Fixing Pool Expansion at Sacred Grove

The Deck-Fixing quadrant's pool changes between shop types:

**Wayside pool:** Chakra Tools (7) + Wu Xing Elements (5) + Primary Stamps (4) = 16 items

**Sacred Grove pool:** Above + Secondary Stamps (3) = 19 items, with 20% per-slot rolls replaced by an Alchemical (7 candidates)

Tertiary stamps (Black) and Quaternary stamps (Gray) do not appear in any shop pool — they're crafted by combining stamps already owned (Section 8.4.3, 8.4.4).

### 12.5 Reroll System

Every shop has a reroll button that regenerates all four quadrants' offerings (preserving the persistent state but rolling fresh offerings).

- **Base reroll cost:** 3 ki
- **Per-reroll cost increase:** Each subsequent reroll in the same shop visit costs more by default (escalation pattern modifiable by hexagrams)
- **Hexagram modifiers:** `plus_offerings_double_reroll` (Shī / Leading) doubles reroll cost. Other hexagrams may modify the escalation rate or the base cost.

### 12.6 Purchase Flow

The purchase flow is identical across shop types:

1. Player clicks an offering to expand it (full description, cost, prerequisites)
2. Expanded item highlights, purchase button activates if eligible
3. Player must satisfy prerequisites:
   - **Sufficient ki** — Cost ≤ current ki balance
   - **Slot space** — Spirit slots free for spirit purchases; consumable inventory has space for consumables
   - **Tier prerequisites** — Some Sacred Grove items require owned Tier 1 to access Tier 2 (fusion)
4. Cost is deducted, item is added to player's loadout
5. Item is removed from the shop's offerings (cannot be re-purchased without rerolling)

Purchases that fail prerequisites display feedback (toast or button-disabled state) without spending ki.

### 12.7 Sacred Grove Fusion Section

When Sacred Grove is active and the player owns ≥2 fusion-eligible Tier 1 spirits, an additional fusion section appears at the bottom of the shop (below the four quadrants, above the continue button).

**Fusion section structure:**

- Lists available fusion recipes based on the player's current spirits
- Each recipe shows the input pair → output spirit
- Costs are determined by the underlying alchemical (Cinnabar for T2/T3, Pearl for T4)
- Selecting a recipe opens a fusion confirm overlay showing the consumption and result

**Fusion paths:**

- **Tier 1 + Tier 1 (compatible)** → Tier 2 (via Cinnabar, 30 ki)
- **Tier 2 + Tier 2 (cross-pair)** → Tier 3 (via Cinnabar, 30 ki)
- **Tier 3 + Tier 3** → Tier 4 (via Pearl, 50 ki, **components preserved**)

Fusion availability is dynamic — as the player's loadout shifts mid-shop (via fusion completion), the available recipes refresh.

### 12.8 Blessing Acquisition (Not Yet Implemented)

Per Section 10, Blessings are acquired exclusively at Sacred Grove. The acquisition UI and mechanic are **not yet implemented** as of May 2026.

**Intended design:**

- Blessings appear as a separate selection panel during Sacred Grove visits (alongside or replacing one of the existing quadrants)
- Each Blessing has a ki cost (specifics TBD)
- Tier 2 (deity) Blessings require owning the corresponding Tier 1 (colloquial) Blessing first
- Once acquired, Blessings cannot be sold, refunded, or removed from the run

**Selection economy:** With 12 Sacred Grove visits and 14 Blessings, players cannot collect all Blessings in a single run. Strategic choice between Blessing investment and other Sacred Grove offerings (spirits, fusions, alchemicals) is intentional.

### 12.9 Stamp Acquisition Refinements

Stamps have multiple acquisition paths (cross-referenced from Section 8.4.6):

| Path | Tier Available | Notes |
|---|---|---|
| Wayside Shrine purchase | Primary only | 4 candidates (Red, Blue, Yellow, White), shopper's choice |
| Sacred Grove purchase | Primary + Secondary | Wider stamp selection |
| Festival spirit (in-round) | Matches captured ribbon color | Slot-gated by consumable inventory |
| Crafting (post-purchase) | Tertiary (Black), Quaternary (Gray) | Combines existing stamps |
| Hexagram outcomes | Variable | Specific hexagrams may grant stamps |

Stamps are NOT acquired through Heart Chakra (which only does editions) and not through any random consumable generation paths.

### 12.10 Continue Button and Round Progression

The continue button at the bottom of each shop returns the player to GameScene to begin the next round. The continue button is always available — players are never forced to spend ki, and unspent offerings are simply discarded at shop exit.


## 13. UI & Presentation

This section documents the game's scene architecture, screen layouts, and key interactive UI mechanics. The game runs in Phaser.js at a fixed 1280×720 canvas. There are five primary scenes plus several overlays and modal panels.

### 13.1 Scene Architecture

The game is organized into five Phaser scenes, each with a unique key and lifecycle. The scenes form a navigation graph:

```
MenuScene
  ├── GameScene (first run, hex_02 default)
  ├── DivinationScene → GameScene
  └── HexagramCollectionScene
        └── GameScene (with chosen hexagram)

GameScene
  ├── ShrineScene (Wayside Shrine)
  ├── ShrineScene (Sacred Grove)
  └── MenuScene (back/forfeit)

ShrineScene
  └── GameScene (continue)

DivinationScene
  └── GameScene
```

| Scene | Purpose |
|---|---|
| `MenuScene` | Main menu / title screen |
| `DivinationScene` | Hexagram divination (coin-throw mechanic) before each non-first run |
| `GameScene` | Core gameplay round-by-round |
| `ShrineScene` | Wayside Shrine and Sacred Grove (shop variants share this scene) |
| `HexagramCollectionScene` | Persistent collection view of all 64 hexagrams |

Scene transitions use `this.scene.start(key)` for full transitions. A singleton `RunManager` (`run`) holds run state across scenes. Persistent state (beaten hexagrams, first-run completion) uses `localStorage`.

### 13.2 MenuScene

The main menu / title screen. First scene the player sees on game launch.

**Layout (centered, vertical stack):**
- Title "H A N A T U" (52px, gold) at y=160
- Subtitle "A Hanafuda Deckbuilder" at y=220
- Separator line at y=270
- Buttons stacked vertically starting at y=340:
  - **New Run** — Begins a new run. On first-ever run, sets `hex_02` (no-effect) and goes directly to GameScene; subsequent runs go to DivinationScene first.
  - **Dev Mode** — Bypasses normal setup with elevated starting state (orange button, dev-only). Currently always visible during development; will be gated entirely before public release.
  - **Hexagram Collection** — Visible only after the player has completed at least one run (gated by `localStorage` flag)
- Version label "v0.1" at the bottom

**State persistence:**
- `localStorage.hanatu_first_run_complete` — Set after first successful run; gates DivinationScene access
- `localStorage.hanatu_beaten_hexagrams` — JSON array of hexagram IDs the player has completed runs with; gates HexagramCollectionScene visibility

### 13.3 DivinationScene

The hexagram divination ritual. Player throws six coins to determine the run's hexagram via classical I Ching divination.

**Mechanic:**
- Six coin throws, each producing a yin (broken) or yang (solid) line
- Lines are drawn from the bottom up, building the hexagram one line at a time
- Each throw randomizes 3 coin tosses; the sum determines the line value (6=yin, 7=yang, 8=yang, 9=yin)
- After the 6th line is drawn, the resulting hexagram is revealed and the player can begin the run with that hexagram

**Special elements:**
- **Empty hexagram frame** (top, prominent) — Lines fill in as throws complete
- **Throw button** — Initiates the next coin sequence
- **Coin animation** — Coins flip in animated fashion before settling
- **Dev selector** (dev mode only) — Allows direct hexagram selection bypassing the divination process

**Result handling:**
- The drawn hexagram becomes the run's hexagram via `run.setHexagram(hexId)`
- A "Begin Run" button appears after reveal, transitioning to GameScene

### 13.4 HexagramCollectionScene

Persistent collection view showing all 64 hexagrams. Functions as both progress tracker and run-launcher.

**Layout:**
- Header "Hexagram Collection" at y=30
- Progress counter "Unlocked: X / 64" below
- Back button to MenuScene at top-left
- 8×8 grid of hexagram tiles centered (64 total tiles) at y=100, each tile ~110×65px
- Hover tooltip panel fixed at the bottom of the screen showing the hovered hexagram's details

**Per-tile presentation:**
- Number (small, top-left) — e.g., "1", "2", ..., "64"
- Chinese character (large, centered) — visible if unlocked, "?" placeholder if locked
- Color/border distinguish unlocked (gold/teal) from locked (dimmed)

**Interaction:**
- **Hover** — Shows the hexagram's name and description in the bottom tooltip (or "Locked" message for locked hexagrams)
- **Click on unlocked** — Opens a detail modal showing the chosen hexagram with a "Begin Run" button to start a run with it directly (bypassing divination)
- **Locked tiles** — Non-interactive, dim styling

**Detail modal:**
- Large Chinese character (72px)
- Pinyin / English name
- Number and category
- Full description
- "Begin Run" button (green, sets hexagram and transitions to GameScene)
- "Back" button (returns to grid)

The Collection scene serves as a rerun mechanic — players can choose to play any unlocked hexagram repeatedly to refine builds for that hexagram, rather than relying on random divination.

### 13.5 GameScene — Core Layout

The main gameplay screen. The 1280×720 canvas is divided into functional zones.

```
┌─────────────────────────────────────────────────────────────┐
│ INFO    [SPIRIT FAN]                  [CONSUMABLES]         │  Top: y 0-114
├──────┬──────────────────────────────────────────┬───────────┤
│      │                                          │           │
│      │           [FIELD HEXAGON]                │ [CAPTURE  │  Center: y 100-590
│      │              + [DECK]                    │   FAN]    │  x 130-890 / 948-1280
│      │                                          │           │
├──────┴──────────────────────────────────────────┴───────────┤
│ [CONS]              [HAND]            [BANKED] [DISCARD]    │  Bottom: y 590-720
└─────────────────────────────────────────────────────────────┘
```

**Zones:**

- **Top (y 0-114):** Info cluster (top-left corner) showing round/act/ki/threshold. Spirit fan (centered horizontally). Consumable fan (right side).
- **Center (x 130-890, centered y 340):** Hexagonal field layout with the deck at center. Cards on the field are arranged in a hexagonal pattern.
- **Right panel (x 948-1280):** Capture fan organized by card type (brights/animals/ribbons/plains in stacked rows).
- **Bottom (y 590-720):** Hand cards (centered). Banked and Discard piles in the bottom-right zone.

**Layout constants:**

| Element | Position | Notes |
|---|---|---|
| Card dimensions | 64 × 104 px | Pixel-art native size |
| Spirit row | y=62, horizontal full-portrait | Slot count dynamic per hexagram |
| Consumable row | y=62 | Slot count dynamic per hexagram (3 default, +1/+2 from Artist/Benzaiten Blessings) |
| Field center | (596, 340) | Hexagonal layout around this point |
| Hand center | (596, 660) | Aligned with field on horizontal axis |
| Capture fan | x=1060, y=100 | Right panel, full-scale, organized by type |
| Banked pile | (1111, 645) | Bottom-right |
| Discard pile | (1205, 645) | Bottom-right |
| Deck position | (596, 340) | Center of field, rotated 90° |

The play area is bounded between vertical dividers at x=155 (left) and x=1036 (right). Central elements (field, hand, deck) align on the play-center axis at x=596.

### 13.6 GameScene — Hexagonal Field Layout

The field uses a **hexagonal three-row layout** that scales dynamically based on the player's current field slot count (default 8, modifiable by Blessings, hexagrams, and consumables like Rooster).

**Structure:**

- **Middle row** is fixed at 2 slots, positioned at the hexagonal "wide point" — left at MIDDLE_LEFT_X = `FIELD_CX - FIELD_COL_W × 1.75` and right at MIDDLE_RIGHT_X = `FIELD_CX + FIELD_COL_W × 1.75`.
- **Top and bottom rows** are populated dynamically based on the remaining slot count after the middle 2.
- For a default 8-slot field: 3 top, 2 middle, 3 bottom.
- For 9-slot (Rooster active): 3 top, 2 middle, 4 bottom (bottom-heavy for odd counts).
- For 10-slot (Elder/Jurojin Blessing): 4 top, 2 middle, 4 bottom.
- Slot positions are computed by `_distributeRow(count, y)` which handles 1-, 2-, 3-, and 4+-slot rows with different distribution logic.

Additions or subtractions to field slots maintain the hexagonal silhouette — the middle row stays at 2 slots, and changes are absorbed by the top and bottom rows, preserving the diamond shape.

**Distribution rules:**

- 1-slot row: centered at FIELD_CX
- 2-slot row: symmetric around center, half-gap of `FIELD_COL_W × 0.55`
- 3-slot row: exact default positions at -COL_W, 0, +COL_W from center
- 4+-slot row: equidistant within an inner span (left edge at MIDDLE_LEFT_X + 30 inset, right edge at MIDDLE_RIGHT_X - 30 inset)

**Rationale for hexagonal layout:**

- The middle row's wider extent forms the "wide" of the hexagon
- Top/bottom rows are narrower, creating the diamond-like silhouette
- Hexagonal arrangement keeps all field slots roughly equidistant from the deck (which sits at the geometric center)
- Visually evokes the classical hanafuda layout while accommodating dynamic slot counts

**Slot mechanics:**

- Cards play to slots either by month-matching (replacing or stacking on existing month-matched cards) or to empty slots when no match exists
- A captured slot becomes empty after capture
- A "stranded stack" occurs when a slot accumulates multiple cards but the topmost can't be captured by hand or deck — these can be cleared by Ox Zodiac
- Wood-enhanced cards (Leaf, Silk) bypass the field-slot limit by creating a temporary slot when all regular slots are full

### 13.7 GameScene — Spirit Chain Drag-and-Drop

The spirit chain (top of screen) supports drag-and-drop for reordering spirits and pulling individual stack copies out of their stacks. This is the player's primary way to control scoring chain order.

**Spirit fan layout:**

- Spirits arranged left-to-right in `SPIRIT_FAN_LEFT` to `SPIRIT_FAN_LEFT + SPIRIT_FAN_W` zone
- Positions computed by `computeFanPositions(count, fanWidth, cardWidth, idealGap)` which balances overlap when crowded vs. ideal spacing when sparse
- Negatives are interleaved freely — they don't occupy slot count but appear in the same fan visually
- Legendaries have their own fan zone (`LEGENDARY_FAN_LEFT` / `LEGENDARY_FAN_W`)

**Interaction model — three modes:**

1. **Click on collapsed stack** — Expands the stack visually, fanning out the individual stack copies inline. Stacks of 2 or 3 copies become visually distinct cards in the same slot region.

2. **Click again on expanded stack** (specifically on the source) — Initiates a "drag-1" mode: the player drags one copy out of the stack to be inserted elsewhere in the chain. Releases on a target position to insert the single copy at that index, leaving the rest of the stack at the original position.

3. **Drag from collapsed stack** — Initiates a "whole-stack drag" mode: the player drags the entire stack to a new position in the chain.

The distinction between click-to-expand and drag uses an 8px movement threshold — small movements are clicks, larger movements are drags. This matches standard desktop UI conventions.

**Drop targets:**

- Any position in the spirit chain (insertion between existing spirits)
- Releasing outside the spirit chain returns the spirit to its original position

**Why this matters:**

The spirit chain order determines scoring order (Section 5.5). Players strategically reorder spirits to maximize compounding (e.g., placing additive spirits first, then multiplicative spirits, then engine spirits to capture all accumulated additive boosts). The drag-1 functionality from expanded stacks is critical because it allows fine-grained reordering within a stack — pulling one copy of a multi-stack spirit to a different position than its siblings.

### 13.8 GameScene — Slot Mechanics: Add/Remove

Slot counts (field, hand, spirits, consumables, cards-dealt) are dynamic and computed at scene render time from the current `RunManager` state.

**Field slots:**
- Default: 8
- Modifiers (cumulative): +1 from Elder Blessing, +1 from Jurojin Blessing, +1 from hexagram (if active), -1 from Amber alchemical (permanent), +1 temporary slot from Leaf/Silk-enhanced card (only when all regular slots are full)
- Minimum: 4 (game becomes unplayable below this)
- Read at render time: `run.fieldSlots`

**Hand size:**
- Default: 8
- Modifiers: +1 from Scholar Blessing, +1 from Fukurokuju Blessing, +1 from hexagram (`field_minus_hand_plus`), -1 from hexagram (`field_plus_hand_minus`)
- Read at render time: `run.maxHandSize`

**Spirit slots:**
- Default: 6
- Modifiers: +1 from Warrior Blessing, +1 from Bishamonten Blessing, +1 from hexagram (`spirit_plus_cards_minus`), -1 from hexagram (`spirit_minus_cards_plus`), capped at 4 by hexagram (`four_spirits_fire_twice`), expanded to 8 by hexagram (`eight_spirits_graduated_tax`)
- Negatives don't count toward this cap (they're managed separately)
- Read at render time: `run.spiritSlots`

**Consumable slots:**
- Default: 3
- Modifiers: +1 from Artist Blessing, +1 from Benzaiten Blessing, expanded to 5 from hexagram (`price_increase_more_consumable_slots`)
- Read at render time: `run.maxConsumableSlots`

**Cards dealt at round start:**
- Default: 8
- Modifiers: +1 from Fisherman Blessing, +1 from Ebisu Blessing
- Read at render time: `run.cardsDealt`

When slot counts change between rounds (e.g., after Sacred Grove visit), the next render at GameScene re-creates the layout with the new dimensions. Layout recomputation happens automatically via the `_distributeRow` function for fields and `computeFanPositions` for spirit/consumable fans.

### 13.9 GameScene — Field & Capture Visual Mechanics

The field hosts the active capture interaction. Visual elements communicate game state:

**Tints and indicators:**
- `TINT_PENDING` (yellow #ffee33) — Highlights cards selected for play
- `TINT_DIM` (#445566) — Greys out unselectable or stranded cards
- `TINT_HOVER` (#ddeeff) — On-hover highlight
- `TINT_DISCARD` (red #ff2222) — Highlights cards about to be discarded

**Rarity colors** (used for spirit borders):
- Common: #667788 (gray)
- Uncommon: #44aa44 (green)
- Rare: #4488ff (blue)
- Legendary: #ddaa22 (gold)
- Negative: #aa44cc (purple, overrides rarity)

**Capture fan:**
- Right panel (x=1060+), organized by card type in stacked rows (Brights at top, then Animals, Ribbons, Plains)
- Cards within a row overlap by `CAPTURE_OVERLAP=16px` for compact display
- Banked cards (those moved to banked pile via yaku) are removed from this fan
- The fan grows as captures accumulate, providing visual feedback on capture density

**Floating score and feedback:**
- `_showFloatingScore(text, x, y, color)` — Pop-up text that floats up and fades, used for score events
- `_showSpiritTrigger(spirit, label)` — Briefly highlights the spirit firing, with a label showing what it contributed
- `_showStyleComboPopup(combos)` — Animated reveal of unlocked style combos (once-per-run events)
- `_showCaptureYakuOverlay(result)` — Shows yaku gates being satisfied, with proportional scoring breakdown
- `_showCaptureOverlay()` — Animation of cards moving to capture pile

### 13.10 GameScene — Other UI Elements

**Top-left info cluster:**
- Round counter (e.g., "Act 3, Round 14/36")
- Ki count (yellow text)
- Yaku threshold for this round
- Flow value (during round)
- Active hexagram name and short description

**Yaku guide** (`_showYakuGuide`):
- Toggleable panel showing the current yaku thresholds and which yaku are active/disabled (relevant for Lí hexagram and Snake/Comedian threshold modifiers)
- Accessible via a button in the info cluster

**Card tooltip** (`_showCardTooltip`):
- Hover-activated tooltip on cards showing name, type, axis, season, point value, and any active enhancement/edition/stamp
- Used in field, hand, capture fan, and banked pile

**Toast messages** (`_showToast`):
- Short-lived bottom-screen messages for non-critical info (e.g., "Not enough ki", "Field is full")

**Forfeit confirm** (`_showForfeitConfirm`):
- Modal dialog when player chooses to abandon a run mid-game
- Two-step confirmation prevents accidental forfeit

### 13.11 ShrineScene — Shop Layout

Both Wayside Shrine and Sacred Grove use the same scene with a `isGrove` flag distinguishing them.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ INFO  [PERSISTENT SPIRITS]              [CONSUMABLES]        │  Top
├─────────────────────────┬────────────────────────────────────┤
│                         │                                    │
│  [Q_TL: SPIRITS]        │  [Q_TR: DECK-FIXING]               │  Upper quadrants
│                         │                                    │  (180,145) (680,145)
├─────────────────────────┼────────────────────────────────────┤
│                         │                                    │
│  [Q_BL: PLAYING CARDS]  │  [Q_BR: ZODIACS]                   │  Lower quadrants
│                         │                                    │  (180,385) (680,385)
├─────────────────────────┴────────────────────────────────────┤
│  [FUSION SECTION (Sacred Grove only, y=555+)]                │
│  [Continue button] / [Reroll button] / [Purchase button]     │  Bottom
└──────────────────────────────────────────────────────────────┘
```

**Four quadrants of offerings:**

- **Q_TL Spirits** — Tier 1 spirits (random from pool); 15% chance for a Legendary at Sacred Grove
- **Q_TR Deck-Fixing** — Chakra Tools, Wu Xing elements, Primary Stamps. Sacred Grove also offers Secondary Stamps and 20% chance of an Alchemical
- **Q_BL Playing Cards** — Speculative cards (Sacred Grove offers different pool)
- **Q_BR Zodiacs** — Zodiac consumables (random pool subset)

**Variants:**

| Element | Wayside Shrine | Sacred Grove |
|---|---|---|
| Default offerings per quadrant | 2 | 4 |
| Title color | #e8c96a (gold) | #ffcc44 (bright gold) |
| Spirit pool | T1 only | T1 + 15% Legendary chance |
| Deck-fixing pool | Primary stamps only | Primary + Secondary stamps + 20% Alchemical chance |
| Special section | (none) | Fusion section appears at y=555+ |
| Card pool | Smaller | Wider (includes more rare cards) |

**Offering counts** are modifiable by hexagrams (`modifyShopCount`) and Merchant/Daikokuten Blessings (+1 each, up to +2 total).

**Purchase flow:**

1. Player clicks an offering to expand it (shows full description, cost, and any prerequisites)
2. The expanded item highlights, and a central "Purchase" button activates
3. If the player has enough ki and any prerequisites (e.g., consumable slot space, Tier 1 owned for Tier 2 fusion), the purchase completes
4. Reroll button (cost increases per use, modifiable by hexagram) replaces all four quadrants with new offerings
5. Continue button advances back to GameScene

**Sacred Grove fusion section:**

When Sacred Grove is active and the player owns ≥2 fusable Tier 1 spirits, a fusion crafting section appears at the bottom (above the continue button). The section lists available T2 fusion recipes as buttons; clicking initiates a fusion confirm overlay which consumes the input spirits and produces the T2 result.

### 13.12 ShrineScene — Per-Item Overlays

Each consumable type has a custom overlay with category-specific UX:

**Chakra Tool overlays** (one per chakra):
- **Root Chakra** — Card list grouped by month with one card highlighted as Demon (Akumon)
- **Sacral Chakra** — Card-target picker with element selection
- **Solar Plexus** — Card-target picker showing rank-cycling preview
- **Heart Chakra** — Card-target picker showing edition probability (60/30/10)
- **Throat Chakra** — Card-target picker for duplication
- **Third Eye** — Card-target picker for deletion
- **Crown Chakra** — Two-card picker (source + destination) showing identity copy preview

**Stamp card selector:**
- Card grid of all deck cards (filtered by stampability)
- Stamp preview on hover
- Confirm to apply the stamp

**Booster pack overlay:**
- Interactive card pack opening UI (used for some consumables)

**Fusion confirm:**
- Visual representation of input spirits → output spirit
- Cost display, confirm/cancel

**Alchemical result:**
- Post-fusion success screen showing the new spirit
- Or failure feedback

### 13.13 Persistent State Across Scenes

`RunManager` (singleton) holds all run state shared across scenes:

- `run.ki`, `run.act`, `run.round`, `run.threshold`
- `run.spirits`, `run.allSpirits`, `run.negativeSpirits`, `run.legendarySpirits`
- `run.consumables`, `run.deck`, `run.flow`
- `run.fieldSlots`, `run.maxHandSize`, `run.spiritSlots`, `run.maxConsumableSlots`, `run.cardsDealt`
- `run.activeHexagram`, `run.blessings`

Scenes read this state on render and write it back via setters/methods (e.g., `run.addKi(amount)`, `run.applyStamp(cardId, stampId)`).

`localStorage` keys:
- `hanatu_first_run_complete` — Boolean gate for divination access
- `hanatu_beaten_hexagrams` — JSON array for collection scene unlocks

### 13.14 Future / Planned UI Elements

The following UI elements are referenced in design but not yet fully implemented:

- **Blessings collection UI** — A button-accessible off-screen panel showing the player's currently owned Blessings (so the GameScene info cluster doesn't get cluttered). Section 10 acquisition is also not yet implemented.
- **Sacred Grove blessing selection UI** — Per Section 10, blessings are acquired exclusively at Sacred Grove. The selection UI is not yet built.
- **Hexagram detail panel** — Some hexagrams need richer player communication (e.g., showing the boost-and-debuff pattern visually with up/down arrows on affected cards).
- **Spirit chain reorder visual feedback** — Stronger visual cues for which scoring phase a spirit is in (additive, multiplicative, engine), to communicate why order matters.
- **Stamp tier display** — The four-tier stamp system could benefit from a small tier indicator on the stamp icon itself.

These are tracked as design items pending playtest and visual design pass.

---

## 14. Logging

The game maintains a comprehensive gameplay log via the `GameplayLogger` system. Logs serve two purposes: real-time console feedback during development, and structured transcript export for playtesting analysis (the transcripts can be pasted into Claude conversations or spreadsheet tools for post-run analysis).

### 14.1 Logger Architecture

`GameplayLogger` is a singleton (`logger`) imported throughout the codebase. It maintains an in-memory entry buffer plus mirrors output to `console.log`. Key properties:

- **Singleton** — One logger instance per page load, accumulates all entries
- **Toggleable** — `logger.enable()` / `logger.disable()` for runtime control
- **Auto-resets on new run** — `logRunStart()` clears the entry buffer
- **Transcript export** — `getTranscript()` returns a plain-text string with structured delimiters

Entries are stored as plain text strings, formatted with visual separators (60-char `═` lines) for round and shop boundaries. The transcript is designed to be human-readable when pasted into a chat or document.

### 14.2 Log Categories

Logger methods are organized by event category:

| Category | Methods |
|---|---|
| **Run lifecycle** | `logRunStart`, `logRunEnd`, `logRunSummary` |
| **Round lifecycle** | `logRoundStart`, `logRoundEnd`, `logSpiritLoadout` |
| **Player actions** | `logAction` (play/discard), `logBankPushDecision` |
| **Card events** | `logDeckFlip`, `logCapture`, `logCardEnhanced`, `logCardStamped`, `logCardEditionApplied`, `logCardDestroyed`, `logCardAdded`, `logCardTranscended` |
| **Yaku & combos** | `logYakuState`, `logYakuAchieved`, `logYakuThresholds`, `logStyleCombos` |
| **Scoring** | `logCaptureScoring`, `logRetriggerScoring` |
| **Consumables** | `logConsumableUse`, `logConsumableSold`, `logNegativeConsumableObtained` |
| **Spirits** | `logSpiritSold`, `logSpiritStacked`, `logSpiritTranscended` |
| **Shop** | `logShopEnter`, `logShopOfferings`, `logShopPurchase`, `logShopFusion`, `logShopExit` |
| **Blessings** | `logBlessingObtained` |
| **Economy** | `logKiChange`, `logFlowChange` |

Each method formats its arguments into a structured log entry with relevant context (round number, current values, state changes).

### 14.3 Transcript Format

A typical transcript reads as a structured event log:

```
════════════════════════════════════════════════════════════
RUN START
════════════════════════════════════════════════════════════
Timestamp: 2026-05-04T19:45:12.345Z

════════════════════════════════════════════════════════════
ROUND 1 (Act 1) — Threshold: 100
════════════════════════════════════════════════════════════
Ki: 0 | Deck size: 48
Hand: Jan-Crane, Mar-Cherry, ...
Field: Apr-Cuckoo, Jun-Butterflies, ...
Spirits: (none)

[Action: play] Jan-Crane → field
[Capture] Jan-Crane + Jan-Plain (matching January)
[Yaku achieved] Hikari (1/2)
[Bank decision] BANK
...

════════════════════════════════════════════════════════════
SHOP — Wayside Shrine
════════════════════════════════════════════════════════════
Ki: 8
Offerings: ...
[Purchase] Spirit: Pollen (5 ki)
...
```

This format is designed for both human readability (during development) and AI/spreadsheet parsing (for analysis).

### 14.4 Telemetry Sources

Several event types capture rich state for post-run analysis:

**`logCaptureScoring`** captures the full per-card scoring breakdown:
- Base points, enhancement contributions, edition bonuses, stamp triggers
- Per-spirit contributions in chain order with their effect type (additive/multiplicative/engine)
- Final mult, points, and capture score

**`logRetriggerScoring`** captures White/Gray stamp retrigger details with the same depth as the base capture, allowing analysis of retrigger-specific contribution.

**`logYakuThresholds`** captures the exact threshold values at round start, including the deck composition that produced them — useful for verifying the proportional threshold system.

**`logRunSummary`** captures the final run state: total score, rounds reached, spirits owned, consumables used, ki balance — a snapshot for post-run review.

### 14.5 Export Methods

The logger provides three ways to extract transcripts:

| Method | Purpose |
|---|---|
| `getTranscript()` | Returns the full transcript as a plain-text string |
| `copyToClipboard()` | Copies transcript to clipboard via browser API |
| `printToConsole()` | Outputs the full transcript to `console.log` |

These are exposed for runtime use during development and playtesting.

### 14.6 Code-Level Telemetry Concerns

A known issue (tracked as a deferred cleanup item) is that many `addKi`/`spendKi` callers pass `'unspecified'` as the reason argument. This makes ki-flow analysis less precise — the transcript shows ki delta but not always the source. Cleanup of these reason strings to meaningful tags (e.g., `'shop_purchase_chakra'`, `'yaku_kasu_trigger'`) is on the deferred list (see "Architectural Cleanup" section of `DEFERRED_CLEANUP_ITEMS.md`).

### 14.7 Future Logging Enhancements

The current logger is plain-text only. Future enhancements may include:

- **Structured JSON output** alongside the plain-text format, for richer programmatic analysis
- **Round-scoped queryable indexes** (e.g., "all captures in Round 5") to avoid linear text scanning
- **Replay reconstruction** — Replaying a run from its transcript to verify deterministic behavior or test alternative branches
- **Optional anonymized telemetry export** for aggregate playtesting data

These are exploratory directions, not committed roadmap items.

---

## 15. Catalogs

This section provides consolidated lookup tables for all game entities. Each catalog summarizes information detailed elsewhere in the document — use these tables for quick reference, then jump to the relevant primary section for full mechanics.

### 15.1 Card Catalog

The full 48-card base deck plus 13 speculative cards. For full per-card descriptions including IDs, axis, tags, and themes, see Section 2.2 (the authoritative source).

#### 15.1.1 Base Deck Summary by Month

Each month has 4 cards. Most months follow the pattern of 1 high-rank card + 1 ribbon + 2 plains, but August (1 bright + 1 animal + 2 plains, no ribbon), November (1 bright + 1 animal + 1 ribbon + 1 plain), and December (1 bright + 3 plains) break this pattern.

| Month | Theme | Bright | Animal | Ribbon | Plains |
|---|---|---|---|---|---|
| 1 (Jan) | Pine 松 | Crane and Rising Sun | — | Red poetry ribbon | 2 |
| 2 (Feb) | Plum Blossom 梅 | — | Bush Warbler on Plum | Red poetry ribbon | 2 |
| 3 (Mar) | Cherry Blossom 桜 | Cherry Blossom Viewing Curtain | — | Red poetry ribbon | 2 |
| 4 (Apr) | Wisteria 藤 | — | Cuckoo with Crescent Moon | Yellow ribbon | 2 |
| 5 (May) | Iris 菖蒲 | — | Iris Fireflies* | Yellow ribbon | 2 |
| 6 (Jun) | Peony 牡丹 | — | Butterflies on Peony | Blue ribbon | 2 |
| 7 (Jul) | Bush Clover 萩 | — | Wild Boar | Yellow ribbon | 2 |
| 8 (Aug) | Pampas Grass 芒 | Full Harvest Moon | Geese in Flight | — | 2 |
| 9 (Sep) | Chrysanthemum 菊 | — | Chrysanthemum Cricket** | Blue ribbon | 2 |
| 10 (Oct) | Maple 紅葉 | — | Deer | Blue ribbon | 2 |
| 11 (Nov) | Willow 柳 | Rainstorm | Swallow | Red ribbon | 1 |
| 12 (Dec) | Paulownia 桐 | Phoenix | — | — | 3 |

\*The May animal uses the legacy ID `may_bridge` though its name is "Iris Fireflies." Design canonical name continues "Iris Dragonfly." See Section 2.10 and deferred cleanup items.

\*\*The September animal uses the legacy ID `september_sake` though its name is "Chrysanthemum Cricket." Design canonical name continues "Chrysanthemum Fireflies." See Section 2.10 and deferred cleanup items.

#### 15.1.2 Speculative Cards (13)

For the full speculative card catalog with month/rank/axis details, see Section 2.3 (the authoritative source). Speculative cards are brought into the deck via Solar Plexus Chakra rank promotion or specific consumable effects.

#### 15.1.3 Card Distribution Summary

| Category | Count (base deck) | Count (with speculatives) |
|---|---|---|
| Total cards | 48 | 61 |
| Brights | 5 | 7 |
| Animals | 9 | 16 |
| Ribbons | 10 | 11 |
| Plains | 24 | 27 |
| Air axis | 24 | varies |
| Land axis | 24 | varies |
| Day axis | 24 | varies |
| Night axis | 24 | varies |

The base deck's perfectly balanced axis distribution (24/24/24/24) is a deliberate design property.

### 15.2 Spirit Catalog

The full 113 spirits across 17 categories. For full descriptions, see Section 7.

#### 15.2.1 Spirit Tier Summary

| Tier | Count | Acquisition |
|---|---|---|
| Tier 0 (Symbionts) | 12 | Tied to Animal cards in deck |
| Tier 1 (Common/Uncommon/Rare/Legendary) | 81 | Wayside Shrine, Sacred Grove (Legendary 15% in Grove only) |
| Tier 2 (Fusion) | 8 | Sacred Grove fusion (Cinnabar) |
| Tier 3 (Cross-Fusion) | 8 | Sacred Grove fusion (Cinnabar) |
| Tier 4 (Capstone) | 4 | Sacred Grove fusion (Pearl) |
| Negatives | dynamic | Transcendence (Amber, Sulfur, natural) |
| **TOTAL** | **113** | (excluding Negatives) |

#### 15.2.2 Tier 1 Spirits by Category

For the full Tier 1 catalog organized by role, see Section 7.5–7.13.

| Category | Count | Examples |
|---|---|---|
| Foundation Spirits | 20 | Pollen, Bees, Falcon, Crow (Section 7.5: 4 seasonal-point + 4 seasonal-additive + 4 axis-point + 4 axis-additive + 4 rank-foundation) |
| Engine Spirits | 26 | Velocity, Glacier, Ship, Banner (Section 7.6) |
| Conditional Spirits | 3 | Horizon, Dream, Hierarchy (Section 7.7) |
| Retrigger Spirits | 6 | Rainbow, Family, Wish, Dew, Applause, Echo (Section 7.8) |
| Rank Utility Spirits | 4 | Glory, Symbiosis, Festival, Engine_Irrigation (Section 7.9) |
| Economy Spirits | 11 | Recycling, Piggybank, Grace, Bonds, Ingot, Replica (Section 7.10) |
| Gameplay & Meta Spirits | 5 | Catcher, Mirror, Memory, Past Life (Section 7.11) |
| Demoted Rares | 6 | Wuji, Dao, Chi, Tengu, Waidan, Feng Shui (Section 7.12) |
| Tier 1 Legendary | 1 | Gankyil (Section 7.13) |
| **Sum (categorized)** | **82** | |

The Section 7 categorization sums to 82, while `spirits.js` contains 81 Tier 1 entries. The discrepancy is likely the `util_irrigation` deprecated duplicate flagged for cleanup (see DEFERRED_CLEANUP_ITEMS.md), which is counted in Rank Utility but should be removed from code.

#### 15.2.3 Higher-Tier Spirits

| Tier | Count | Examples |
|---|---|---|
| Tier 2 Fusion | 8 | Bloom, Thunderstorm, Hibernation, Mountain (Section 7.14) |
| Tier 3 Cross-Fusion | 8 | Tropic, Arctic, Equinox, Solstice (Section 7.15) |
| Tier 4 Capstone | 4 | Yin-Yang, Universe, Time, Nature (Section 7.16) |
| Symbionts | 12 | Algae, Snails, Wolf, Garden, Badger (Section 7.17) |

### 15.3 Consumable Catalog

The full consumable list across 6 categories. For mechanics, see Section 8.

#### 15.3.1 Chakra Tools (7)

All Chakra Tools cost 4 ki uniform. Full mechanics in Section 8.1.

| ID | Name | Effect | Targets |
|---|---|---|---|
| `chakra_root` | Root | Mark a card as Demon (Akumon) for run-long persistence | 1 |
| `chakra_sacral` | Sacral | Apply a random Wu Xing element | 1 |
| `chakra_solar_plexus` | Solar Plexus | Cycle a card's rank (plain→ribbon→animal→bright→plain) | 1 |
| `chakra_heart` | Heart | Apply a random Edition (60% Gold, 30% Crystal, 10% Ghost) | 1 |
| `chakra_throat` | Throat | Duplicate a card | 1 |
| `chakra_third_eye` | Third Eye | Delete a card | 1 |
| `chakra_crown` | Crown | Copy identity from source onto destination | 2 (1 converted) |

#### 15.3.2 Wu Xing Elements (5)

All Wu Xing elements cost 5 ki uniform. Full mechanics in Section 8.2.

| ID | Element | Base Form | Upgraded Form |
|---|---|---|---|
| `element_water` | Water | Snow (×2 mult, depreciates 0.25/use) | Ice (×4 mult, depreciates 0.5/use) |
| `element_wood` | Wood | Leaf (temporary slot bypass) | Silk (temporary slot + immune to stranding) |
| `element_fire` | Fire | Ember (30 pts wildcard, 20% break) | Charcoal (100 pts, 10% break) |
| `element_earth` | Earth | Clay (10% ki interest held in hand) | Pottery (20% ki interest) |
| `element_metal` | Metal | Iron (×1.5 mult held + 5% jackpot) | Meteorite (×3.0 mult held, jackpot retained) |

#### 15.3.3 Editions (3)

Editions are not direct purchase consumables — they're applied via Heart Chakra (60/30/10 random roll) or by specific spirits.

| Edition | Effect | Heart Chakra Probability |
|---|---|---|
| Gold | +20 points | 60% |
| Crystal | +5 mult | 30% |
| Ghost | ×1.5 mult | 10% |

#### 15.3.4 Stamps (9 across 4 tiers)

Full mechanics in Section 8.4.

| ID | Name | Tier | Trigger | Effect | Cost |
|---|---|---|---|---|---|
| `stamp_red` | Red | Primary | Yaku | Draw +1 card on yaku contribution | 4 |
| `stamp_blue` | Blue | Primary | Discarded | Free consumable on discard to full field | 4 |
| `stamp_yellow` | Yellow | Primary | Captured | +3 ki | 4 |
| `stamp_white` | White | Primary | **Generic retrigger** | Any effect tied to card fires twice | 6 |
| `stamp_orange` | Orange | Secondary | Captured | +1 draw + 3 ki | 6 |
| `stamp_green` | Green | Secondary | Discarded | +8 ki | 5 |
| `stamp_purple` | Purple | Secondary | Yaku | Free consumable on yaku contribution | 6 |
| `stamp_black` | Black | Tertiary | **Generic compound** | +1 draw + free consumable + 3 ki on capture/discard/yaku | 9 |
| `stamp_gray` | Gray | Quaternary | **Generic triple retrigger** | Any effect tied to card fires 3 additional times (4× total) | 12 |

Crafting recipes:
- Black = Red + Green | Blue + Orange | Yellow + Purple
- Gray = White + Black

#### 15.3.5 Zodiac Consumables (13)

Full mechanics in Section 8.5.

| ID | Name | Category | Effect | Cost |
|---|---|---|---|---|
| `zodiac_rat` | Rat | hand | Draw 2 extra cards | 3 |
| `zodiac_ox` | Ox | field | Clear stranded stack | 2 |
| `zodiac_tiger` | Tiger | yaku | Force a push without yaku threshold | 8 |
| `zodiac_rabbit` | Rabbit | yaku | Remove push penalty for round | 5 |
| `zodiac_dragon` | Dragon | ki | Ki lottery: 0–30 ki | 4 |
| `zodiac_snake` | Snake | yaku | Lower a yaku threshold by 1 | 4 |
| `zodiac_horse` | Horse | hand | Discard hand, draw 8 fresh | 5 |
| `zodiac_goat` | Goat | ki | +1 ki per capture rest of round | 4 |
| `zodiac_monkey` | Monkey | field | Capture all on a slot, discard equal from hand | 4 |
| `zodiac_rooster` | Rooster | field | Open 9th field slot for round | 3 |
| `zodiac_dog` | Dog | hand | Retrieve 2 cards from discard | 3 |
| `zodiac_pig` | Pig | ki | +10 ki immediately | 3 |
| `zodiac_cat` | Cat | spirit | Summon random T1 Foundation spirit | 3 |

#### 15.3.6 Alchemicals (7)

High-cost spirit and run-modification consumables. Full mechanics in Section 8.6.

| ID | Name | Effect | Cost |
|---|---|---|---|
| `alch_cinnabar` | Cinnabar | Fuse 2 spirits → T2 or T3 | 30 |
| `alch_mercury` | Mercury | De-fuse T2/T3 → 2 ingredients | 20 |
| `alch_jade` | Jade | +1 stack to a spirit (max 3) | 15 |
| `alch_sulfur` | Sulfur | Random duplicate + random clear | 25 |
| `alch_amber` | Amber | Transcend any stacked spirit (-1 perm field slot) | 35 |
| `alch_lead` | Lead | Random rare spirit + costs half ki | 20 |
| `alch_pearl` | Pearl | Fuse 2 T3 → T4 (components preserved) | 50 |

### 15.4 Hexagram Catalog (Quick Reference)

All 64 hexagrams. For full mechanics, see Section 9.

| Category | Count | Hexagrams |
|---|---|---|
| Double Trigrams | 8 | hex_01 (Qián), hex_02 (Kūn), hex_29 (Kǎn), hex_30 (Lí), hex_51 (Zhèn), hex_52 (Gèn), hex_57 (Xùn), hex_58 (Duì) |
| Axis Individual | 4 | hex_09, hex_19, hex_35, hex_36 |
| Axis Combined | 4 | hex_11, hex_12, hex_33, hex_34 |
| Seasonal Combined | 4 | hex_56, hex_55, hex_42, hex_41 |
| Seasonal Individual | 4 | hex_03, hex_47, hex_18, hex_27 |
| Rank | 4 | hex_14, hex_13, hex_22, hex_08 |
| Wu Xing Cycle | 5 | hex_50, hex_49, hex_15, hex_43, hex_48 |
| Push/Flow | 2 | hex_64 (volatile), hex_63 (stable) |
| Style Combo | 2 | hex_45, hex_46 |
| Field/Hand | 4 | hex_59, hex_60, hex_62, hex_28 |
| Spirits | 4 | hex_26, hex_40, hex_32, hex_21 |
| Deck Composition | 10 | hex_38, hex_39, hex_20, hex_23, hex_17, hex_31, hex_25, hex_53, hex_44, hex_37 |
| Economy | 7 | hex_05, hex_24, hex_07, hex_54, hex_16, hex_06, hex_10 |
| Misc Scoring | 1 | hex_61 (Inner Truth) |
| Misc | 1 | hex_04 (Youthful Folly) |

For full hexagram listings with effects, see Section 9.3.

### 15.5 Blessing Catalog

All 14 Blessings as 7 pairs. Full mechanics in Section 10.

| Pair # | Tier 1 Colloquial | Tier 2 Deity | Effect |
|---|---|---|---|
| 1 | Fisherman | Ebisu | +1 cards dealt |
| 2 | Merchant | Daikokuten | +1 shop offering per quadrant |
| 3 | Warrior | Bishamonten | +1 spirit slot |
| 4 | Artist | Benzaiten | +1 consumable slot |
| 5 | Scholar | Fukurokuju | +1 hand size capacity |
| 6 | Elder | Jurojin | +1 field slot |
| 7 | Comedian | Hotei | -1 to all yaku thresholds (floor 1) |

Acquisition: Sacred Grove only (NYI). Tier 2 requires Tier 1 ownership.

### 15.6 Yaku Catalog

Yaku are scoring gates, not scoring contributions themselves. Full mechanics in Section 5.3 and 5.5.

| Yaku | Requirement | Default Threshold (48-card deck) |
|---|---|---|
| Hikari | Bright cards | 2 |
| Tane | Animal cards | 3 |
| Tanzaku | Ribbon cards | 3 |
| Kasu | Plain cards | 6 |

Thresholds scale proportionally with deck composition (see Section 5.5). Yaku gates open the option to push for more captures or bank the round.

### 15.7 Style Combo Catalog

The current 12 style combos. Each triggers at most once per run. Full mechanics in Section 5.6.

| Style Combo | Requirement | Flow Bonus |
|---|---|---|
| Hanami-zake | Cherry Curtain + Sake Cup* | +0.2 |
| Tsukimi-zake | Full Moon + Sake Cup* | +0.2 |
| Inoshikacho | Boar + Deer + Butterflies | +0.3 |
| Akatan | 3 red ribbons (Jan, Feb, Mar) | +0.4 |
| Aotan | 3 blue ribbons (Jun, Sep, Oct) | +0.4 |
| Spring | ≥1 card from each of months 3, 4, 5 | +0.2 |
| Summer | ≥1 card from each of months 6, 7, 8 | +0.2 |
| Autumn | ≥1 card from each of months 9, 10, 11 | +0.2 |
| Winter | ≥1 card from each of months 12, 1, 2 | +0.2 |
| Full Year | ≥1 card from all 12 months | +0.8 |
| Goko | All 5 brights | +1.0 |

*"Sake Cup" — September animal card; see Section 7.4 for naming legacy.

### 15.8 Cost Reference Table

Cross-system summary of common costs. For context, see Section 11.4.

| Item Class | Typical Range |
|---|---|
| Chakra Tools | 4 ki (uniform) |
| Wu Xing Elements | 5 ki (uniform) |
| Primary Stamps | 4–6 ki |
| Secondary Stamps | 5–6 ki |
| Tertiary Stamp (Black) | 9 ki |
| Quaternary Stamp (Gray) | 12 ki |
| Tier 1 Spirits (Wayside) | 5–8 ki |
| Tier 1 Spirits (Sacred Grove) | 6–10 ki |
| Tier 1 Legendary | 12–15 ki |
| Zodiacs | 2–8 ki |
| Speculative Cards | 10–20 ki |
| Cinnabar (T2/T3 fusion) | 30 ki |
| Pearl (T4 fusion) | 50 ki |
| Mercury (de-fusion) | 20 ki |
| Jade (+1 stack) | 15 ki |
| Sulfur | 25 ki |
| Amber | 35 ki |
| Lead | 20 ki + half current ki |
| Shop Reroll | 3 ki base, escalates |

All costs subject to revision via playtesting.

### 15.9 Run-Wide Constants

Quick reference for game-wide numerical constants. For context, see relevant sections.

| Constant | Value | Section |
|---|---|---|
| Total rounds | 36 | 6.1 |
| Acts | 6 (6 rounds each) | 6.1 |
| Sacred Grove visits | 12 (every 3 rounds) | 6.2, 12.1 |
| Wayside Shrine visits | 23 | 12.1 |
| Default hand size | 8 | 3.1 |
| Default field slots | 8 | 3.3 |
| Default spirit slots | 6 | 3.7 |
| Default consumable slots | 3 | 3.8 |
| Default cards dealt at round start | 8 | 3.1 |
| Default reroll cost | 3 ki | 12.5 |
| Base ki per round | 5 | 11.1 |
| Base interest rate | 10% | 11.2 |
| Push success multiplier | ×1.1 | 5.4 |
| Push failure multiplier | ×0.9 | 5.4 |
| Round-end flow decay | ×0.95 | 5.4 |
| Heart Chakra Gold probability | 60% | 8.3 |
| Heart Chakra Crystal probability | 30% | 8.3 |
| Heart Chakra Ghost probability | 10% | 8.3 |
| Iron jackpot chance | 5% | 8.2.2 |
| Iron jackpot reward | +30 ki | 8.2.2 |
| Sacred Grove Legendary chance | 15% | 12.2 |
| Sacred Grove Alchemical chance | 20% | 12.2 |
| Total hexagrams | 64 | 9 |
| Total spirits | 113 | 7 |
| Total Blessings | 14 (7 pairs) | 10 |
| Total style combos | 12 (current) | 5.6 |

---

## 16. Implementation Status

This section tracks the implementation state of every major system. Status indicators:

- ✅ **Complete** — Fully implemented per design intent and verified working
- 🟡 **Partial** — Implemented but with known gaps, bugs, or incomplete coverage (cross-referenced to deferred items)
- ❌ **Not yet implemented** — System designed but no code yet
- 🔵 **Future / planned** — Conceptual; awaiting design refinement before implementation

Status as of May 2026.

### 16.1 Core Gameplay Systems

| System | Status | Notes |
|---|---|---|
| 48-card base deck | ✅ | All 48 cards implemented with axis/tags |
| 13 speculative cards | ✅ | Available via Solar Plexus rank promotion |
| Field hexagonal layout | ✅ | Dynamic 8/9/10-slot configurations |
| Hand & deck | ✅ | Standard hanafuda mechanics |
| Capture/banked/discard piles | ✅ | All three pile systems working |
| Yaku gates (Hikari/Tane/Tanzaku/Kasu) | ✅ | Proportional thresholds with deck composition |
| Push-or-bank mechanics | ✅ | Full push-your-luck loop |
| Round-end conditions | ✅ | Hand exhausted, deck exhausted, bank, push fail |
| Multi-card hand plays | ✅ | Same-month cards play together |

### 16.2 Scoring Systems

| System | Status | Notes |
|---|---|---|
| Per-capture scoring pipeline | ✅ | Multi-phase: held-in-hand → per-card → retriggers → engines → final |
| Score frozen at capture | ✅ | Mid-round mutations don't retroactively rescore |
| Spirit chain order scoring | ✅ | Drag-and-drop reorder affects scoring |
| Flow (push/decay/style) | ✅ | All three flow modifiers active |
| Style combo detection | ✅ | All 12 current combos detected |
| Once-per-run combo gating | ✅ | Combos cannot retrigger same run |
| Proportional yaku thresholds | ✅ | Bracket function on deck composition |
| Naked scoring range | ✅ | 30-200 range achievable without spirits |

### 16.3 Card-Level Modifications

| System | Status | Notes |
|---|---|---|
| Wu Xing enhancements (5 elements) | ✅ | Snow/Ice, Leaf/Silk, Ember/Charcoal, Clay/Pottery, Iron/Meteorite |
| Generative cycle (upgrade) | ✅ | Apply parent → upgrade |
| Destructive cycle (strip) | ✅ | Apply destroyer → strip |
| Editions (Gold/Crystal/Ghost) | ✅ | Heart Chakra rolls 60/30/10 |
| Stamps (9 across 4 tiers) | 🟡 | All 9 implemented; White/Gray generic retrigger and Black generic compound trigger are partial — only fire on capture (see DEFERRED_CLEANUP_ITEMS.md) |
| Stamp tier system | 🟡 | Code uses 3 tiers; design intent is 4 tiers (Gray as quaternary) |
| Rank promotion via Solar Plexus | ✅ | Instantaneous cycling |
| Persistent card mutations | ✅ | Card mutations (e.g., Demon mark, Irrigation bonus pts) persist across rounds. Note: terminology is being revisited — see Section 17.3 |

### 16.4 Spirits System

| System | Status | Notes |
|---|---|---|
| Tier 1 spirits (81 total) | ✅ | All Tier 1 spirits functional |
| Tier 2 fusion spirits (8) | ✅ | Available via Sacred Grove Cinnabar |
| Tier 3 cross-fusion spirits (8) | ✅ | Available via Sacred Grove Cinnabar |
| Tier 4 capstone spirits (4) | ✅ | Available via Sacred Grove Pearl |
| Tier 0 symbionts (12) | ✅ | Tied to animal cards in deck |
| Stacking up to 3 | ✅ | Standard mechanic |
| Transcendence to Negative | 🟡 | 3-stack natural transcendence works; Amber on 1-stack/2-stack is incorrectly blocked (see DEFERRED_CLEANUP_ITEMS.md) |
| Negative spirits | ✅ | Power 1×/2×/3× per stack snapshot (when Amber bug is fixed) |
| Spirit chain reorder | ✅ | Drag-and-drop with click/drag distinction |
| Replica/Print/Collector descriptions | 🟡 | Functional but show "Coming soon" placeholder text |
| Echo description | 🟡 | Functional but shows "Coming soon" |
| Two Irrigation versions | 🟡 | `engine_irrigation` (current) and `util_irrigation` (deprecated) both present |
| Demoted rare ID prefixes (`legend_*`) | 🟡 | Should be renamed `rare_*` |

### 16.5 Consumables System

| System | Status | Notes |
|---|---|---|
| Chakra Tools (7) | ✅ | All seven implemented; uniform 4 ki cost |
| Wu Xing element consumables (5) | ✅ | All five element types working |
| Editions via Heart Chakra | ✅ | 60/30/10 roll |
| Zodiac consumables (13 incl. Cat) | ✅ | All 13 working |
| Alchemicals (7) | 🟡 | All 7 present; Amber has 3-stack restriction bug |
| Legacy `consumable_*` entries | 🟡 | Four legacy entries (horse/dog/pig/rooster) should be removed |
| `_dogProtection` flag naming | 🟡 | Should be renamed `_pushPenaltySuppression` |
| Booster pack mechanics | 🔵 | Considered but not yet designed |

### 16.6 Hexagrams System

| System | Status | Notes |
|---|---|---|
| 64 hexagrams | ✅ | All 64 defined and active |
| Hook architecture | ✅ | Lifecycle, scoring, slot, economy, Wu Xing hooks |
| Coin-throw divination | ✅ | DivinationScene fully working |
| First-run default (hex_02 Kūn) | ✅ | New players get no-effect hexagram |
| Run-scoping (one per run) | ✅ | Single hexagram per run |
| Hexagram description accuracy | 🟡 | Multiple description-vs-implementation discrepancies tracked in DEFERRED_CLEANUP_ITEMS.md |
| Tropic/Arctic month ranges | 🟡 | Code uses 4-month sets; design intent is 6-month half-years |
| Hexagram Collection unlock | ✅ | localStorage persistence working |

### 16.7 Blessings System

| System | Status | Notes |
|---|---|---|
| 14 Blessings (7 pairs) defined | ✅ | All effects defined in code |
| Effect application | ✅ | `countBlessingsByEffect` working in shop hooks |
| Tier 1 / Tier 2 distinction | ✅ | Pair structure recognized |
| Sacred Grove acquisition UI | ❌ | Not yet implemented |
| Off-screen blessings panel | ❌ | Not yet implemented; per design, blessings will be hidden behind a button |
| Tier 2 prerequisite enforcement | ❌ | Awaiting acquisition UI |

### 16.8 Run Structure

| System | Status | Notes |
|---|---|---|
| 36 rounds (6 acts of 6) | ✅ | Full structure |
| Sacred Grove cadence (12 visits) | ✅ | Every 3 rounds before R3, R6, ..., R36 |
| Threshold curve | 🟡 | Pricing TBD per playtesting |
| Endless mode | 🔵 | Planned future feature; pattern repeats post-R36 |
| Run summary screen | ✅ | Final score and statistics displayed |

### 16.9 Shop System

| System | Status | Notes |
|---|---|---|
| Wayside Shrine (Round-between) | ✅ | 2 offerings per quadrant default |
| Sacred Grove (every 3 rounds) | ✅ | 4 offerings per quadrant default (planned reduction to 3) |
| Four-quadrant layout | ✅ | Spirits / Deck-Fixing / Cards / Zodiacs |
| Spirit pool filtering | ✅ | Excludes 3-stack + Negative spirits |
| Reroll with cost escalation | ✅ | Per-reroll cost increase by default |
| Sacred Grove fusion section | ✅ | T2/T3 fusion available |
| Pearl T4 fusion path | ✅ | Component-preserving fusion |
| Stamp shop variations | ✅ | Wayside primary only; Grove also secondary |
| Booster pack consumables | 🔵 | Not yet designed |

### 16.10 Ki Economy

| System | Status | Notes |
|---|---|---|
| Round-end ki reward formula | ✅ | Base 5 + hand × Piggybank + combo × Grace + earth |
| Push failure penalty | ✅ | Forfeits hand-derived ki |
| Round-start interest | ✅ | Base 10% + Bonds + Ingot + hexagram |
| Piggybank/Grace caps | 🟡 | Hard caps in code; design intent is no hard caps (soft-capped only) |
| Bonds 5-stack cap | 🟡 | Mathematically unreachable cap; should be removed |
| Ingot fractional truncation | 🟡 | Spirit needs redesign for low-ki balances |
| Earth-enhanced held-in-hand interest | ✅ | Clay 10%, Pottery 20% |
| `addKi`/`spendKi` reason strings | 🟡 | Many callers pass 'unspecified'; cleanup deferred |

### 16.11 UI & Presentation

| System | Status | Notes |
|---|---|---|
| MenuScene | ✅ | Title, New Run, Dev Mode, Hexagram Collection |
| DivinationScene | ✅ | Coin-throw, line-by-line reveal, hexagram display |
| HexagramCollectionScene | ✅ | 8×8 grid, hover tooltip, click-to-detail, run-launcher |
| GameScene field/spirits/cons | ✅ | All zones functional |
| GameScene spirit drag-drop | ✅ | Click-expand, drag-1, whole-stack drag |
| GameScene capture animation | ✅ | Card movement to capture pile |
| Style combo popup | ✅ | Animated reveal |
| Yaku guide overlay | ✅ | Threshold display |
| ShrineScene | ✅ | Wayside and Sacred Grove variants |
| Per-Chakra overlay panels | ✅ | Custom UX for each Chakra Tool |
| Stamp card selector | ✅ | Card grid with stampability filter |
| Fusion confirm overlay | ✅ | T2/T3/T4 fusion preview |
| Dev mode | 🟡 | Currently always visible; will be gated entirely before release |
| Blessings UI | ❌ | Not yet implemented |
| Blessing acquisition at Grove | ❌ | Not yet implemented |
| Hexagram detail panel (boost/debuff visualization) | 🔵 | Planned enhancement |

### 16.12 Logging

| System | Status | Notes |
|---|---|---|
| GameplayLogger singleton | ✅ | All event categories logged |
| Round/shop separators | ✅ | Visual delimiters in transcript |
| getTranscript / clipboard / console | ✅ | Three export methods |
| Capture scoring breakdown | ✅ | Full per-spirit attribution |
| Retrigger scoring breakdown | ✅ | Stamp retrigger details captured |
| Yaku threshold logging | ✅ | Includes deck composition snapshot |
| Run summary logging | ✅ | End-of-run snapshot |
| Structured JSON output | 🔵 | Future enhancement |
| Replay reconstruction | 🔵 | Future enhancement |

### 16.13 Save/Load State

| System | Status | Notes |
|---|---|---|
| `localStorage` first-run gate | ✅ | Gates DivinationScene access |
| `localStorage` beaten hexagrams | ✅ | Gates Hexagram Collection visibility |
| In-run save/restore | ❌ | No mid-run save; runs are single-session |
| Run history / statistics | 🔵 | Future enhancement |

### 16.14 Summary

The game is largely playable end-to-end. Core scoring, capture, deck modification, spirit, hexagram, and shop systems are complete. The most significant unfinished work is:

1. **Blessings acquisition UI** at Sacred Grove (Section 16.7)
2. **Stamp generic-trigger semantics** for White/Gray/Black (Section 16.3)
3. **Amber 3-stack restriction** removal (Section 16.5)
4. **Piggybank/Grace/Bonds hard cap** removals (Section 16.10)
5. **Hexagram description corrections** matching implementation (Section 16.6)
6. **Code-level naming cleanups** (`_dogProtection`, `card.ribbonStamp`, `legend_*` IDs, `consumable_*` legacy entries — Section 16.4–16.5)

These are tracked in detail in `DEFERRED_CLEANUP_ITEMS.md`. Beyond this list, balance pass and playtesting will surface additional refinements.

---

## 17. Open Design Questions

This section consolidates open questions, TBD items, and design decisions awaiting playtesting or further consideration. These are scattered through the document; this section provides a single navigable list.

Open questions are organized by impact area. Each entry notes the relevant section for full context.

### 17.1 Balance & Tuning (Pending Playtesting)

These items have working implementations but their numerical values are subject to revision through playtesting.

**Threshold curve.** The exact yaku threshold growth curve across 36 rounds is TBD. Design intent is for Act 1 (R1-6) to be approachable for naked play (no spirits), with progressively higher thresholds requiring deeper investment by Act 3+. (Section 6.1, 6.5)

**Ki economy ranges.** Run-wide ki trajectory (early 0–80, mid 100–500, late 200–1500+) is illustrative. Costs and rewards across the entire economy are subject to balance passes. (Section 11.4, 11.6, 15.8)

**Pricing across all systems.** Most current costs (spirits, consumables, alchemicals, stamps, speculative cards, reroll) are placeholder values. Many are uniform (Chakra Tools all 4 ki, Wu Xing all 5 ki) for development simplicity but may differentiate during balance pass. (Section 11.4, 15.8)

**Sacred Grove offerings count.** Currently 4 per quadrant; planned reduction to 3 during balance pass. (Section 12.2)

**Reroll cost escalation rate.** Base 3 ki, escalates per reroll, but the exact escalation curve is open. (Section 12.5)

### 17.2 Mechanical Design Questions

These require explicit design decisions before final implementation.

**Black Stamp split-vs-full bonuses.** Should Black Stamp fire all three bonuses (draw + consumable + ki) on every trigger event (captured/discarded/yaku), or split bonuses by trigger type (e.g., draw on capture, consumable on discard, ki on yaku)? The full-bonus model is simpler but potentially too powerful. The split model creates more interesting trigger-dependent strategy. (Section 8.4.5)

**Push failure base ki forfeiture.** Should the base 5 ki round-end reward also be forfeited on push failure (in addition to the hand-derived ki), increasing punishment for failed pushes? (Section 11.1)

**Spirit acquisition stacking rules.** Stacking is a core mechanism but the rules for obtaining additional copies need refinement. Open questions:
- Should shops weight non-owned spirits more heavily?
- Should owning a Tier 1 spirit increase or decrease the chance of seeing Tier 2 fusion ingredients?
- Should there be a per-shop visibility limit on already-owned spirits to encourage diversity? (Section 12.3)

**Showman-like duplicate filtering.** Currently already-owned non-Legendary spirits CAN reappear in shop offerings (intentional, since stacking matters). Open question whether to add a Balatro-style "Showman" mechanism — reduce duplicate appearances when a spirit is at 3 stacks, with an optional consumable/spirit that re-enables duplicates. Creates strategic tension around stacking commitment. (Section 12.3)

**Spirit stacking as player choice.** Currently identical spirits auto-stack on acquisition. Decoupling that — making stacking a deliberate drag-and-drop action — would create richer strategic decisions but requires UI work. (Section 7.2)

**Ingot economy spirit redesign.** Current formula (+0.01% per ki held) produces fractional values that truncate at low ki balances, making the spirit nearly useless early-run. Possible redesigns: flat +1% per stack baseline + scaling tail; higher per-ki coefficient; different mechanic entirely. (Section 11.5)

**Fire card identity.** Fire-enhanced cards (Ember/Charcoal) are currently exempt from per-card spirit scoring because they have "no identity" (count as all 4 yaku). Question: does exempting them from spirits reduce their value too much given the new stamp/edition system and additive Fire points? Options: keep as-is, preserve full identity, preserve axes only, wild rank only. Decision trigger: playtest Fire-heavy builds and measure if Fire feels underpowered. (Section 8.2.2)

**Compound stacking balance.** The capture-wide mult pool allows compound stacks (e.g., 3 Ghost cards = ×1.5³ = ×3.375; White-stamped bright under boost_brights = ×2.0² = ×4.0; Shine + boost_brights + Ghost stack producing very high multipliers). Open question whether compound stacks feel rewarding (Balatro-style joy) or broken (trivializing runs). Decision trigger: playtest runs with intentional stacking; tune individual multipliers if runs trivialize. (Section 5.1, 5.7)

**Earth interest + boost_fire/boost_earth interaction.** Earth interest is `run.ki × rate × clayCount` at round end. Boost_earth increases Clay/Pottery's held mult AND the interest rate. Boost_fire reduces Earth interest. Question: at high ki pools, does boost_earth compound Earth interest into overpowered ki generation? (Section 8.2.2, 9.3.7, 11.2)

**animal_deck / ribbon_deck replacement priority.** `animal_deck` (hex_17 Suí) replaces highest-rank non-animal in each month with a duplicate animal — currently this removes ALL 5 brights from the deck. Question whether this is intended or should spare brights:
- Option A (current): Replace highest-rank non-animal → removes brights (dramatic transformation)
- Option B: Replace lowest-rank non-animal → preserves brights (less transformative)
- Option C: Only replace in months without a base animal → minimal change
The same question applies to `ribbon_deck` (hex_31 Xián) which removes both brights and animals. (Section 9.3.12)

**transcendCard mutation reset.** `transcendCard()` clears all keys on a card and copies from a target card. This means persistent mutations (Irrigation's bonus points, future card-mutation spirits) RESET when a card is path-converted. Question: is this the intended behavior, or should mutations persist through transcendCard? Decision trigger: playtest. If players feel "robbed" by losing mutation bonuses on path-conversion, refactor `transcendCard` to preserve the `mutations` field. (Section 2.9, 7.6.4)

**Fusion recipes (T2/T3).** Specific fusion recipes (which Tier 1 pairs produce which Tier 2 fusions; which Tier 2 pairs produce which Tier 3 cross-fusions) are partially designed but specific recipes remain TBD. (Section 7.14, 7.15)

**Hexagram acquisition for first run.** Currently the first run uses `hex_02` (Kūn / Receptive Earth, no-effect). After that, hexagrams are obtained through coin-throw divination. Specific divination mechanic is implemented but the broader question of how hexagrams are unlocked over time (e.g., are all 64 always rollable, or is unlock progressive?) — current implementation: all 64 always rollable, but selection from Hexagram Collection requires having beaten that hexagram. Confirmed design intent. (Section 9.1.1, 13.4)

**Gankyil acquisition path.** Cost is 0 in code, indicating Gankyil is acquired through a non-shop path (reward, hexagram outcome, specific event). Specific acquisition mechanic is TBD. (Section 7.13)

### 17.3 Terminology & Naming

These items have working systems but need terminology or naming refinement.

**"Negative" spirit terminology.** The term "Negative" for transcended spirit copies is a working label but the design eventually wants better terminology. Considerations: cultural fit, tonal appropriateness, semantic clarity. (Section 7.2)

**"Three Marks" terminology.** Used for persistent card mutations (Demon, etc.). Stale terminology that should eventually be replaced with relevant new terms. (Section 2.9, 16.3)

**Style combo system development.** The current 12 combos are stable but not the final roster. Many additional style combos will be added; some current combos may be revised. (Section 5.6)

**May/September animal naming.** Card IDs (`may_bridge`, `september_sake`) are legacy from earlier design. Design canonical names are "Iris Dragonfly" and "Chrysanthemum Fireflies" but the codebase displays "Iris Fireflies" and "Chrysanthemum Cricket." IDs will likely stay; display names need updating. (Section 2.10, 7.4)

### 17.4 UI/UX Design

These UI elements are conceptually planned but lack design or implementation.

**Blessings acquisition UI at Sacred Grove.** Blessings are intended to be acquired exclusively at Sacred Grove with ki costs. Selection UI not yet designed or implemented. Forced choice between Blessing investment and other Sacred Grove offerings (spirits, fusions, alchemicals) is intentional. (Section 10.5, 12.8)

**Off-screen Blessings panel.** A button-accessible panel showing currently owned Blessings (so GameScene info cluster doesn't get cluttered). Not yet designed. (Section 10, 13.14)

**Hexagram detail visualization.** Some hexagrams need richer player communication — e.g., showing the boost-and-debuff pattern visually with up/down arrows on affected cards. Not yet designed. (Section 13.14)

**Spirit chain reorder visual feedback.** Stronger visual cues for which scoring phase a spirit is in (additive, multiplicative, engine), to communicate why order matters. (Section 13.14)

**Stamp tier visual indicator.** The four-tier stamp system could benefit from a small tier indicator on the stamp icon itself. (Section 13.14)

**Negative spirit visual differentiation.** Negatives should appear visually distinct from regular spirits in the UI but specific styling is TBD. Currently styled with purple borders and `bgCol = 0x1a0d2a`. Future UI iterations may explore a separate panel, more pronounced interleaving differentiation, or hybrid approaches. Tied to spirit stacking choice. (Section 7.2)

**Hand size label.** UI element next to the hand showing current card count over max (e.g., "5/8" or "5/9" with hexagram active). With silent skip-on-cap behavior shipped, players need a way to see why draws are being skipped. Should respect `modifyHandSize` hook for hexagram modifications.

**Mult display rounding precision.** The scoring animation side panel uses `toFixed(1)` which rounds values like 0.75 → "0.8" and 0.25 → "0.3". For debuff hexagrams compounding to values like 0.75, the displayed math looks slightly off even though the backing calculation is correct. Consider `toFixed(2)` or smart rounding that only adds the second decimal when needed.

**Field slot layout polish for non-default counts.** Dynamic layout algorithm preserves the 8-slot default well, but non-8 layouts (7-slot, 9-slot) could use visual tuning. Potential tweaks: adjust 2-slot `halfGap`, adjust 4-slot `INNER_MARGIN`, asymmetry smoothing for odd counts.

**Divination Scene description occlusion.** The hexagram reveal screen displays the hexagram frame (lines) and the effect description text, but the description is visually blocked by the hexagram itself. Needs layout rework — move the description below the hexagram, shrink/reposition during reveal, or use a dedicated description panel.

**Dev hexagram picker ordering.** Hexagrams in the dev picker currently appear in random order. Sort by hexagram number (1-64, matches I Ching sequence) or by category (double_trigram, axis_individual, etc.). Numerical is simpler; categorical groups related effects for testing. (Dev Mode is dev-only; will be gated entirely before public release per Section 13.2.)

**Animation polish for spirit fan transitions.** Smooth transitions between fan positions on drag — currently snaps. Tied to Fan UI v2 deferrals.

**Mobile/touch interaction patterns.** Current UX assumes desktop with mouse hover and click. Mobile/touch adaptation deferred.

### 17.5 Future Features

These are conceptual additions awaiting design and implementation.

**Endless mode.** Continue rounds beyond R36 with continually increasing thresholds. Shop cadence pattern (Sacred Grove every 3 rounds, Wayside between) will repeat indefinitely. (Section 6.3, 12.1)

**Booster pack mechanics.** Considered for some consumables (e.g., Wu Xing element distribution) but not yet designed. Candidate post-playtest enhancement. (Section 8.2)

**Run history / statistics.** No mid-run save; runs are single-session. Future enhancement: aggregate run statistics, leaderboard, etc. (Section 16.13)

**Structured logging output.** Current logger is plain-text; JSON output, replay reconstruction, structured indexes are exploratory enhancements. (Section 14.7)

### 17.6 Visualization & Display Verification Items

These are bugs or potential bugs in animation/visualization that need verification during testing. They differ from Section 17.4 (UI design) in that the underlying logic is correct but the display may not match.

**Balanced scoring animation accuracy (hex_61).** Hexagram 61 (Zhōng Fú) replaces `points × mult × flow` with `((points + mult) / 2)² × flow`. Question: does the score animation correctly show the final score for balanced_scoring, or does it try to reconstruct the old formula? Verify the animation displays the correct final value when testing this hexagram. If wrong, wire animation to use stored `captureScore` value rather than recomputing. (Section 9.3.14)

**Retrigger + hexagram visualization.** White/Gray stamp retriggers occur in a separate code path from the main capture animation. Hexagram contribution animations (e.g., a white-stamped bright with boost_brights triggering ×2.0 twice) may not display correctly in retrigger animations. Test under boost_brights with white-stamped brights once both systems are integrated. (Section 8.4.5, 9.3.6)

### 17.7 Code-vs-Design Discrepancies

Items where the codebase doesn't match design intent and needs fixing. These are NOT open design questions — design is decided; code needs updating. Comprehensive entries with code line references are tracked in `DEFERRED_CLEANUP_ITEMS.md`. The summary below provides quick navigation.

#### 17.7.1 Stamps System
- **White/Gray retrigger semantics** are partial: only fire on capture trigger, don't re-roll jackpot/break/depreciation. Should fire on any trigger and re-roll randomness per retrigger. (DEFERRED_CLEANUP_ITEMS.md → "White/Gray stamps not fully generic")
- **Black stamp trigger semantics** are partial: only fires on capture. Should fire on captured/discarded/yaku. (DEFERRED_CLEANUP_ITEMS.md → "Black stamp not generic")
- **Stamp tier system** uses 3 tiers in code; design intent is 4 tiers with Gray as quaternary. (DEFERRED_CLEANUP_ITEMS.md → "Stamp tier system uses 3 tiers")
- **`card.ribbonStamp` legacy property** still in active use; should be `card.stamp`. (DEFERRED_CLEANUP_ITEMS.md → "card.ribbonStamp legacy property")

#### 17.7.2 Spirits System
- **Amber 3-stack restriction** blocks 1-stack and 2-stack inputs; design intent is any stacked spirit (1× / 2× / 3× variants). (DEFERRED_CLEANUP_ITEMS.md → "Amber alchemical restricted to 3-stack only")
- **Demoted rare ID prefixes** use `legend_*`; should be `rare_*`. (DEFERRED_CLEANUP_ITEMS.md → "Demoted rare spirit IDs")
- **Two versions of Irrigation** (`util_irrigation` deprecated and `engine_irrigation` current) coexist. (DEFERRED_CLEANUP_ITEMS.md → "Two versions of Irrigation")
- **"Coming soon" descriptions** on functional spirits (Replica, Print, Collector, Echo). (DEFERRED_CLEANUP_ITEMS.md → "Coming Soon Description Fields")

#### 17.7.3 Economy System
- **Piggybank, Grace, Bonds hard caps** in code (×4, ×4, +25%). Design intent: no hard caps; soft-capped by slot/stack economy. (DEFERRED_CLEANUP_ITEMS.md → "Piggybank, Grace, and Bonds hard caps")
- **Ingot fractional truncation** at low ki balances. Spirit needs redesign. (DEFERRED_CLEANUP_ITEMS.md → "Ingot spirit fractional ki truncation"; also Section 17.2)

#### 17.7.4 Hexagrams System
- **Tropic/Arctic month ranges** in code use 4-month exclusionary sets; should be 6-month half-years. (DEFERRED_CLEANUP_ITEMS.md → "Tropic/Arctic month ranges")
- **Hexagram description text** has multiple discrepancies vs. actual implementation (axis hexagrams describe by month not axis; boost hexagrams omit debuffs; volatile/stable_flow descriptions wrong; four_spirits_fire_twice references Fire enhancement; balanced_scoring claims spirits removed; rank hexagrams omit threshold modification; Wu Xing cycle hexagrams oversimplify). (DEFERRED_CLEANUP_ITEMS.md → "Hexagram Description Discrepancies")

#### 17.7.5 Consumables System
- **Legacy `consumable_*` entries** (consumable_horse, consumable_dog, consumable_pig, consumable_rooster) superseded by zodiac equivalents but still in code. (DEFERRED_CLEANUP_ITEMS.md → "Legacy consumable_* entries")
- **`_dogProtection` flag naming** is misleading — actually corresponds to Rabbit's effect, not Dog's. Should be `_pushPenaltySuppression`. (DEFERRED_CLEANUP_ITEMS.md → "_dogProtection flag")

#### 17.7.6 Card-Targeting System Naming
- **`_markMode` and related identifiers** were named for the deprecated Three Marks system. Card-targeting infrastructure is now used by Wu Xing elements and Chakra Tools. Identifiers requiring rename: `_markMode` → `_cardTargetMode`, `_activateMark()` → `_activateCardTarget()`, `_onMarkCardSelected()` → `_onCardTargetSelected()`, `_showBoosterPack(markDef)` → `_showBoosterPack(consumableDef)`. (DEFERRED_CLEANUP_ITEMS.md needs new entry — see below)

#### 17.7.7 Card Data Cleanup
- **`december_plain_3` deprecated entry** in cards.js, replaced by `december_ribbon`. (DEFERRED_CLEANUP_ITEMS.md → "december_plain_3 deprecated entry")
- **May/September animal naming** (Iris Fireflies should be Iris Dragonfly; Chrysanthemum Cricket should be Chrysanthemum Fireflies). (DEFERRED_CLEANUP_ITEMS.md → "May/September animal naming legacy")

#### 17.7.8 Architectural Cleanup (Lower Priority)
- **`calculateFinalScore()` vestigial method** in ScoringEngine. Output discarded by all callers; only retained for metal proc side effect. Two parallel scoring paths (per-capture accumulation in GRM + this batch method) is acknowledged technical debt. (DEFERRED_CLEANUP_ITEMS.md → "calculateFinalScore() vestigial method"; also "Architecture: Two Scoring Paths" carryover)
- **`addKi`/`spendKi` 'unspecified' reason strings** — many callers pass 'unspecified' instead of meaningful telemetry tags. Cleanup deferred. (DEFERRED_CLEANUP_ITEMS.md → "addKi/spendKi callers with 'unspecified' reason strings")
- **Paramita / Yaku Upgrades obsolete code** — `RunManager.buyYakuUpgrade()` method and related state from a removed scoring system. Audit and removal pending. (DEFERRED_CLEANUP_ITEMS.md needs new entry — see below)

For full code line references, fix proposals, and additional details on each item, see `DEFERRED_CLEANUP_ITEMS.md`.

---

## 18. Decisions Log

This section records major design decisions made between Design Doc V4 (March 2026) and Design Doc V5 (May 2026). The V4→V5 timeframe was a substantial systems-implementation phase that introduced new systems (hexagrams, blessings, alchemicals, editions, transcendence), expanded existing systems (spirits, stamps, chakras, zodiacs, symbionts), restructured run pacing, and consolidated naming.

Decisions are organized by impact area. Each entry notes what changed, why, and the V5 section where the current design lives.

### 18.1 Run Structure

**Run length doubled: 18 rounds → 36 rounds.** V4 had 18 rounds across 6 acts (3 rounds/act). V5 has 36 rounds across 6 acts (6 rounds/act). Rationale: 18 rounds proved too short for builds to come together; the longer arc gives more space for build progression and shop investment cycles. The threshold curve and ki economy were not directly carried over — both will be calibrated to the 36-round shape during playtesting. (Section 6.1)

**Sacred Grove cadence reframed.** V4 placed Sacred Grove at act boundaries (6 total visits). V5 places it every 3 rounds (12 total visits before R3, R6, ..., R36). Rationale: with 36 rounds, more frequent Sacred Grove access is needed to enable mid-run build pivots without making the visits feel too rare relative to the longer arc. (Section 6.2, 12.1)

**Endless mode as planned future feature.** Not present in V4. V5 documents endless mode as a planned post-launch feature that continues the round cadence pattern indefinitely beyond R36. (Section 6.3, 12.1)

### 18.2 Scoring System Simplifications

**Push escalation removed.** V4's per-capture formula included a `push_escalation` factor of `1.0 + pushCount × 0.3`. V5 removes this entirely in favor of Flow as the unified push-related multiplier. Rationale: the additive `× 0.3 per push` factor was redundant with Flow's `×1.1 per success`, and removing it simplifies the scoring formula to `points × mult × flow`. (Section 5.1)

**Push penalty rebalanced.** V4 had a progressive penalty curve: -30% / -50% / -70% / -90% based on push depth. V5 replaces this with Flow ×0.9 multiplier on push failure, plus hand-derived ki forfeiture. Rationale: The V4 progressive penalty was punitive in a way that discouraged pushing entirely; the Flow-only penalty creates a softer but persistent disincentive that's still meaningful across multiple rounds. (Section 5.4, 11.1)

**Three scoring modes consolidated to one.** V4 preserved three scoring modes behind `run.scoringMode`: `'capture'` (default), `'additive'` (previous), `'multiplicative'` (original). V5 is capture-only — additive and multiplicative modes were removed from the codebase during the cleanup chapter. Rationale: maintaining three modes was a development hedge that became unnecessary once capture-based scoring stabilized. (Section 5)

**Proportional yaku thresholds (NEW in V5).** V4 had fixed yaku thresholds (Kasu 6, Tanzaku 3, Tane 3, Hikari 2) calibrated for the 48-card base deck. V5 introduces a bracket function that scales thresholds proportionally to deck composition, so deck modifications (Chakra Tools, hexagram filters, rank promotion) appropriately adjust difficulty. Rationale: deck mutation became a much larger axis of build variation in V5 (hexagrams remove cards, speculative cards add them, Chakra Tools transform them), making fixed thresholds untenable. (Section 5.5)

### 18.3 Flow System Unification

**Style System renamed to Flow System.** V4 had a separate "STYLE SYSTEM" section with Style Base × Push Factor as a multiplier. V5 unifies push/bank dynamics with style combos under a single "Flow" concept. Rationale: Style Base and Push Factor were always multiplied together to produce the same final value; treating them as a single tracked variable reduces conceptual overhead. The renamed term also better captures the "momentum" intuition. (Section 5.4)

**Style combos as Flow contributors (not standalone bonuses).** V4 framed style combos as Style Base contributors. V5 makes them additive Flow contributors with explicit per-combo bonuses (+0.2 to +1.0). Mechanically equivalent but presentationally clearer. (Section 5.6)

**Once-per-run constraint on style combos.** Newly explicit in V5. V4 didn't specify this constraint. Rationale: prevents repetitive looping on the same combos and makes combo timing a strategic decision (early triggers compound longer through Flow's persistent multiplier). (Section 5.6)

### 18.4 New Systems Introduced in V5

**Hexagram System (64 hexagrams).** V4 listed "Hexagram environment system" as TBD in open questions (V4 §11.5). V5 has a fully implemented 64-hexagram system with hooks across all major game systems, divination scene, and hexagram collection scene. The 8 double-trigram hexagrams produce the most game-changing effects. Rationale: hexagrams emerged as the run-modifier framework that gives each run a distinct strategic character without requiring deck modifications. The I Ching's 64-hexagram structure provided a natural design space. (Section 9, 13.3, 13.4)

**Blessings (Seven Lucky Gods).** Not in V4. V5 introduces 14 Blessings as 7 paired entries (Tier 1 colloquial + Tier 2 deity), acquired exclusively at Sacred Grove (UI not yet implemented). Each pair represents one of the Shichifukujin and modifies a foundational game capacity. Rationale: provided a permanent run-modifier system distinct from spirits and consumables, with cultural depth that fits the game's Japanese folkloric foundation. (Section 10)

**Alchemicals (7 high-cost consumables).** Not in V4. V5 introduces Cinnabar, Mercury, Jade, Sulfur, Amber, Lead, Pearl as Sacred Grove-only structural transformation tools. They enable spirit fusion paths, defusion, stack manipulation, and rare summoning. Rationale: gave players controlled paths to fusion outcomes (Cinnabar T2/T3, Pearl T4) and stack management (Jade, Sulfur, Amber) that pure shop randomness couldn't provide. (Section 8.6)

**Card Editions (Gold/Crystal/Ghost).** Not in V4. V5 introduces three editions applied via Heart Chakra (60/30/10 random roll). Editions stack with Wu Xing enhancements and stamps. Rationale: added a third card-level modification axis (alongside Wu Xing and stamps) for build differentiation. The probabilistic acquisition via Heart Chakra creates strategic decisions about Heart Chakra timing. (Section 8.3)

**Stamp tier system expansion.** V4 had 4 ribbon stamps (Red, Blue, Green, Yellow) as flat-cost purchases. V5 has 9 stamps in 4 tiers (Primary/Secondary/Tertiary/Quaternary) with crafting paths (Black = Primary+Secondary; Gray = White+Black). Rationale: the V4 stamps were a flat tier with limited progression. V5 introduces depth — generic retriggers (White, Gray) and generic compound triggers (Black) provide late-run optionality, while the crafting paths give mid-run players a reason to acquire multiple stamps. (Section 8.4)

**Speculative cards (13).** Not in V4. V5 introduces 13 cards beyond the 48-card base deck, brought into play via Solar Plexus Chakra rank promotion. Each completes a rank slot that's missing in the base deck for that month. Rationale: enables deck shape variation while preserving the 48-card base structure. Solar Plexus becomes the primary deck-shape modification path. (Section 2.3)

**Spirit transcendence and Negatives.** Not in V4. V5 introduces transcendence — when a 4th copy of a spirit would be acquired, the spirit becomes a "Negative" (frozen-power copy) that no longer occupies a slot. Triggered naturally (4th copy) or via Amber alchemical (any stacked spirit, 1×/2×/3× variants). Rationale: created a build trajectory where over-stacking an effect doesn't feel wasted — it converts to a permanent slot-free contribution. (Section 7.2)

### 18.5 System Expansions

**Spirit count expansion.** V4 had ~90 spirits. V5 has 113 total: 12 Tier 0 symbionts, 81 Tier 1 (incl. Gankyil legendary), 8 Tier 2 fusions, 8 Tier 3 cross-fusions, 4 Tier 4 capstones. Rationale: the V4 roster left build archetypes thin in several axes; V5 added retrigger spirits (Rainbow, Family, Wish, Dew, Applause, Echo), more economy spirits (Replica, Print, Collector), more meta spirits (Memory, Past Life), and additional symbionts (Wolf, Garden, Badger) to fill gaps. (Section 7)

**Chakra Tools replace Four Practices.** V4 had "Four Practices" (Path, Fasting, Mind, Tree). V5 has 7 Chakra Tools (Root, Sacral, Solar Plexus, Heart, Throat, Third Eye, Crown). Rationale: the chakra metaphor provides a richer thematic framework with clearer mechanical mapping (each chakra has a distinct kind of card transformation). The Four Practices were less visually distinct and less expandable. (Section 8.1)

**Zodiac roster expanded to 13.** V4 had 12 zodiac consumables (the traditional 12 animals). V5 adds Cat as the 13th, summoning a random Tier 1 Foundation spirit. Rationale: Cat acknowledges the cultural backstory of the Cat being excluded from the traditional zodiac. Mechanically, it provides a budget alternative for Foundation spirit acquisition. (Section 8.5)

**Symbiont roster expanded to 12.** V4 had 9 symbionts. V5 adds Wolf, Garden, and Badger, tied to speculative animals. Rationale: speculative cards introduced new animal IDs that needed corresponding symbionts. The expansion ensures every animal in the deck has a symbiont path. (Section 7.17)

**Tier 4 capstone effects defined.** V4 had Yin-Yang, Gravity, Time, Planet listed with effects "TBD." V5 has defined capstones: Yin-Yang (each spirit fires twice), Universe (mult-modifying spirits also affect points), Time (push success ×1.3, fail ×0.95, decay ×0.98), Nature (points carry across captures within a round). The roster also shifted: V4's Gravity → V5's Universe, V4's Planet → V5's Nature. Rationale: TBD effects needed concrete definition as capstone fusion paths matured. (Section 7.16)

### 18.6 Wu Xing Mechanics Refinement

**Snow/Ice as multiplicative mult, not points.** V4 listed Snow as "(mult-mult, depreciates)" without specific values. V5 clarifies: Snow is ×2 mult on capture (depreciates by 0.25/use), Ice is ×4 mult (depreciates by 0.5/use). Rationale: the mult interpretation, with explicit depreciation rates, made the "depreciates" mechanic concrete and gave Glacier engine spirit a clear trigger event. (Section 8.2.2)

**Iron/Meteorite as held-in-hand mult, not capture mult.** V4 described Iron as "random proc" without specifying when. V5 clarifies: Iron contributes ×1.5 mult when held in hand during scoring, plus a 5% jackpot (+30 ki) on capture. Meteorite ×3.0 mult held + jackpot retained. Rationale: the held-in-hand framing creates strategic depth around hand management — Iron-enhanced cards that the player chooses NOT to play add ongoing value. (Section 8.2.2, 5.1)

**Generative and destructive cycles formalized.** V4 didn't explicitly document the Wu Xing application cycles. V5 documents both: generative (parent upgrades) and destructive (applied element strips current). Specific mappings: Wood→Fire→Earth→Metal→Water→Wood (generative); Wood destroys Earth, Earth destroys Water, etc. Rationale: enables strategic reasoning about element application order. (Section 8.2.1)

### 18.7 Field & Layout Changes

**Dynamic field slot algorithm.** V4 had a fixed 3-2-3 hexagonal arrangement with up to 10 slots (Expanse + Rooster). V5 has a dynamic algorithm (`_distributeRow`) that supports any slot count from minimum to current maximum. Rationale: hexagrams that modify field slots (`field_plus_hand_minus`, `field_minus_two_threshold_minus`, `field_plus_two_double_flip`) needed flexible layout that gracefully handles 5-10 slot configurations. (Section 13.6)

**Phantom/temporary slot via Wood enhancements.** New in V5. V4 didn't specify behavior when field is full. V5 documents that Leaf and Silk Wood enhancements bypass the field-slot limit by creating a temporary slot when all regular slots are full. Rationale: reframed Wood from "consumed by Caterpillar" (V4) to a strategic field-management tool. (Section 8.2.2, 13.6)

### 18.8 UI Architecture Decisions

**Fan UI for spirits and consumables.** New in V5. V4 had fixed-slot rows. V5 has a fan layout (Balatro-inspired) that overlaps cards on overflow. Spirit chain reorder via drag-and-drop became a deliberate strategic action. Rationale: with 6 spirit slots + dynamic Negatives + Legendaries, the old fixed-slot row didn't scale visually. (Section 13.7)

**Click-to-expand stack model.** New in V5. Stacks of identical spirits collapse visually, expand on click, and individual copies can be dragged out via a drag-1 mechanism. Rationale: stacking became a more frequent and strategically meaningful action in V5 (transcendence depends on it), so the UX needed explicit stack manipulation primitives. (Section 13.7)

**Cross-scene UI consistency via shared SpiritLayout.** ShrineScene and GameScene now share a `SpiritLayout.js` module. V4 had divergent layouts. Rationale: visual consistency across scenes reduces cognitive load when transitioning between gameplay and shop. (Section 13.11)

**Hexagonal field silhouette preserved across slot counts.** New in V5. The middle row stays at 2 slots; additions/removals are absorbed by top/bottom rows. Rationale: maintaining the visual identity of the field across all configurations reinforces the core "tabletop" feel. (Section 13.6)

### 18.9 Architectural / Cleanup Decisions

**Three Marks system removed.** V4 had Three Marks (impermanence, non-being, transcendence) referenced in `data/consumables.js`. V5 removes the Three Marks data; the underlying card-targeting infrastructure was reused for Wu Xing elements and Chakra Tools. Rationale: Three Marks didn't survive the design iteration but the targeting UI machinery was reusable. (Naming cleanup deferred — see DEFERRED_CLEANUP_ITEMS.md)

**Yaku Upgrades / Paramita removed.** V4's earlier scoring iterations had a yaku upgrade mechanic. V5 removes the gameplay but `RunManager.buyYakuUpgrade()` and related state remain in the codebase. Rationale: the mechanic conflicted with the proportional threshold system. (Cleanup deferred — see DEFERRED_CLEANUP_ITEMS.md)

**Two scoring paths consolidation in progress.** V4 had three scoring modes. V5 consolidated to capture-only, but the vestigial `calculateFinalScore()` method remains in `ScoringEngine.js` because it still runs metal proc rolls. Rationale: removing the method entirely required refactoring metal procs into the per-capture flow, which was scoped out of the cleanup chapter. (Architectural debt — see DEFERRED_CLEANUP_ITEMS.md)

**Cleanup Chapter executed before V5 drafting.** A focused cleanup pass preceded V5 documentation: Three Marks data removed, yaku upgrade plumbing removed, dead style base code removed, ScoringEngine signatures simplified. Rationale: cleaning before documenting ensures the design doc reflects only systems that actually exist and matter; cleaning before testing ensures playtesters don't encounter dead-code confusion.

### 18.10 Open V4 Questions Resolved in V5

V4 §11 "Open Design Questions" listed 9 items. Most are now resolved:

| V4 Question | V5 Resolution |
|---|---|
| Tier 4 unity spirit effects (Yin-Yang, Gravity, Time, Planet) | Resolved — defined effects for Yin-Yang, Universe (was Gravity), Time, Nature (was Planet) |
| Play pattern engines | Partially — Wildlife, Plenty, Velocity, Glacier, Carbon, Fossil, Moths cover this design space |
| Threshold curve recalibration | Still open — proportional thresholds via bracket function are in place but exact curve TBD per playtesting |
| Mirror interaction specifics | Implemented — Mirror retriggers spirit to its right |
| Hexagram environment system | Resolved — full 64-hexagram system implemented |
| Card art pipeline | Out of design doc scope; ongoing production concern |
| Shop UI overhaul | Partially — Fan UI delivered the spirit/consumable improvements; full shop redesign ongoing |
| Sound design | Out of design doc scope (Noisy app is separate project) |
| Day/night background coloring | Not implemented; deferred consideration |

---

*Design Doc V5 — drafted and audited May 2026. All 18 sections complete. See `DEFERRED_CLEANUP_ITEMS.md` for tracked code-vs-design fixes pending the next code chapter.*