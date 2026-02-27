# Hanafuda Deck-Builder — Design Document

---

## Game Overview

A roguelike deck-builder built on Hanafuda card mechanics. Each run consists of 12 rounds across 4 acts. The player captures cards, completes yaku (scoring combinations), and pushes their luck to maximise score. Between rounds, the player visits a shrine to equip spirits and buy consumables using earned Ki.

---

## Game Structure

### Run Progression

| Layer | Description |
|---|---|
| Run | 12 rounds split across 4 acts |
| Round | One full game of Koi-Koi (5 plays, push-your-luck decision on each yaku) |
| Shrine | Between-round shop — spend Ki on spirits and consumables |
| Sacred Grove | Every 3rd shrine visit — spirit fusion opportunity |

### Acts

| Act | Rounds | Theme |
|---|---|---|
| 1 | R1–R3 | Learning |
| 2 | R4–R6 | Rising |
| 3 | R7–R9 | Peak |
| 4 | R10–R12 | Climax |

### Round Parameters

| Setting | Value |
|---|---|
| Hand size | 8 cards |
| Field size | 8 cards |
| Plays per round | 5 |
| Free discards | 2 |
| Max spirit slots | 4 |
| Max consumable slots | 3 |

On each push, hand size shrinks by 2 (floor 2) and plays shrink by 1 (floor 2).

---

## Card System

### 48 Cards — 12 Months

| Month | Plant | Bright | Animal | Ribbon | Plains |
|---|---|---|---|---|---|
| 1 | Pine | Crane | — | Poetry Ribbon | ×2 |
| 2 | Plum | — | Bush Warbler | Poetry Ribbon | ×2 |
| 3 | Cherry | Curtain | — | Poetry Ribbon | ×2 |
| 4 | Wisteria | — | Cuckoo | Ribbon | ×2 |
| 5 | Iris | — | Bridge | Ribbon | ×2 |
| 6 | Peony | — | Butterflies | Blue Ribbon | ×2 |
| 7 | Bush Clover | — | Boar | Ribbon | ×2 |
| 8 | Pampas | Moon | Geese | — | ×2 |
| 9 | Chrysanthemum | — | Sake Cup | Blue Ribbon | ×2 |
| 10 | Maple | — | Deer | Blue Ribbon | ×2 |
| 11 | Willow | Rain Man | Swallow | Ribbon | Lightning* |
| 12 | Paulownia | Phoenix | — | — | ×3 |

\* November plain renamed `november_lightning` to reflect its imagery.

### Card Values

| Type | Points |
|---|---|
| Bright | 20 |
| Animal | 12 |
| Ribbon | 10 |
| Plain | 3 |

Full-month capture (all 4 cards of a month in one sweep) earns a **+5 bonus** on top of face values.

### Element Tags

Each card carries two binary axes:

| Field | Values | Meaning |
|---|---|---|
| `vertical` | `sky` \| `land` | Cosmic axis of the card's imagery |
| `temporal` | `day` \| `night` | Time-of-day quality of the card |

These define four quadrants (`sky+day`, `sky+night`, `land+day`, `land+night`) used by spirit affinity calculations. The old label `earth` was renamed to `land` to avoid Wu Xing element confusion.

---

## Yaku Reference

All yaku compound **multiplicatively**. No yaku → multiplier is ×1.0 (no change to base points).

### Tane (Animals)
- **Threshold:** 3+ Animal cards
- **Base:** ×1.3
- **Scaling:** +0.2× per animal beyond 3
- **Bonus:** +0.5× if Boar + Deer + Butterflies all present (Inoshikacho)

### Tanzaku (Ribbons)
- **Threshold:** 4+ Ribbon cards
- **Base:** ×1.3
- **Scaling:** +0.2× per ribbon beyond 4
- **Bonus:** +0.4× for red poetry set (Pine + Plum + Cherry ribbons)
- **Bonus:** +0.4× for blue set (Peony + Chrysanthemum + Maple ribbons)
- Both bonuses stack.

### Hikari (Brights)
- **Threshold:** 2+ Bright cards
- **Base:** ×1.5
- **Scaling:** +0.3× per bright beyond 2
- **Penalty:** Rain Man (November) subtracts −0.2× from the total
- **Goko override:** All 5 brights captured → flat ×5.0

### Kasu (Plains)
- **Threshold:** 5+ Plain cards
- **Base:** ×1.3
- **Scaling:** +0.15× per plain beyond 5

### Tsuki-narabi (Month Sequence)
- **Threshold:** 4+ consecutive months represented among captured cards (at least one card per month)
- **Base:** ×1.4 (longest consecutive run only)
- **Scaling:** +0.2× per month beyond 4
- *Examples: months 3-4-5-6 → ×1.4; months 1-2-3-4-5 → ×1.6; months 2-3-4-5-6-7 → ×1.8*

### Full Month
- **Threshold:** All 4 cards of any single month captured
- **Scaling:** Additive — 1 complete month = ×1.5, each additional +0.5×
- **Formula:** `multiplier = 1.0 + 0.5 × count`
- **Maximum:** 12 complete months = ×7.0
- Returns a **single combined entry** (not one per month) to prevent exponential compounding.

### Removed Yaku
- ~~Hanami-zake~~ (Cherry Blossom Viewing) — removed
- ~~Tsukimi-zake~~ (Moon Viewing) — removed

The Sake Cup card (september_sake_cup) remains in the game as an Animal card but no longer activates a special combination.

---

## Scoring System

### Formula

```
Score = (Base Points × Point Boosts) × (Yaku Mult + Additive Boosts) × Mult Boosts × Flow
```

| Layer | What it is | Who controls it |
|---|---|---|
| **Base Points** | Sum of captured card face values + full-month bonuses | Cards |
| **Point Boosts** | Multipliers on individual card values before the yaku layer | Point Spirits |
| **Yaku Mult** | Product of all active yaku multipliers | Yaku |
| **Additive Boosts** | Added to the yaku multiplier (not compounding) | Yaku Spirits |
| **Mult Boosts** | Multiply the entire multiplier layer | Mult Spirits |
| **Flow** | Skill expression layer — Style Base × Push Factor | Player |

### Spirit Scoring Channels

Spirits interact with the formula through three distinct channels:

**1. Point Boosts**
Multiply the base value of matching cards before the multiplier layer is applied.
Example: Spring Spirit makes March/April/May cards worth ×2 their face value.

**2. Additive Multiplier Boosts**
Add directly to the Yaku Multiplier (not multiplicatively). Active only when the relevant yaku fires.
Example: Radiance Spirit adds +0.3× when Hikari is active.

**3. Multiplicative Multiplier Boosts**
Multiply the entire multiplier layer after all additive contributions are summed.
Example: Harmony Spirit applies ×1.2 to the total Yaku Mult. Fusion spirits are the primary exponential scaling engine.

### Spirit Categories

| Category | Examples | Channel |
|---|---|---|
| **Seasonal** | Spring / Summer / Autumn / Winter | Point Boost |
| **Elemental** | Cloud / Soil / Noon / Midnight | Point Boost |
| **Yaku** | Radiance / Festival / Seeds / Calendar | Additive Mult Boost |
| **Harmony / Fusions** | Harmony + fusion spirits | Multiplicative Mult Boost |

*Animal Yaku spirit name TBD.*

### Flow System

```
Flow = Style Base × Push Factor   (minimum ×1.0)
```

Flow is the player-skill layer. Spirits cannot boost it directly.

#### Style Base
- Persists across rounds as part of the run state.
- Starts at ×1.0 at the beginning of a run.
- **+0.1** per resonance (style) play made during a round.
- **Decays 30% toward ×1.0** between rounds: `newStyle = 1.0 + (old − 1.0) × 0.7`

#### Push Factor
- Resets to ×1.0 at the start of each round.
- Tracks the push-your-luck chain within the round.

| Pushes | Success sequence | Failure sequence |
|---|---|---|
| 0 | ×1.0 | ×1.0 |
| 1 | ×1.1 | ×0.9 |
| 2 | ×1.2 | ×0.8 |
| 3 | ×1.3 | ×0.7 |
| 4 | ×1.4 | ×0.6 |
| 5+ | ×1.5 (cap) | ×0.5 (floor) |

Success = round ends with a new yaku, or the player banks.
Failure = round ends while push-penalty-active with no new yaku since the last push.

Dog consumable suppresses the failure branch (treats the outcome as success regardless).

#### Flow Floor
Flow is clamped to a minimum of ×1.0. The player always scores at least `Base Points × Yaku Mult`, even on a failed push.

---

## Threshold Curve & Expected Scoring Power

The threshold is used by the Ki reward formula to calculate surplus bonuses.

| Round | Act | Threshold | Expected Score |
|---|---|---|---|
| R1 | 1 | 25 | 50 |
| R2 | 1 | 45 | 80 |
| R3 | 1 | 80 | 120 |
| R4 | 2 | 200 | 300 |
| R5 | 2 | 475 | 600 |
| R6 | 2 | 850 | 1,000 |
| R7 | 3 | 2,200 | 3,000 |
| R8 | 3 | 4,400 | 5,500 |
| R9 | 3 | 8,800 | 10,000 |
| R10 | 4 | 18,000 | 25,000 |
| R11 | 4 | 44,000 | 55,000 |
| R12 | 4 | 82,000 | 100,000 |

Scoring power grows roughly ×10 per act (acts 1→2→3→4 correspond to ×3–4 jumps at act boundaries).

---

## Ki Economy

Ki is the run currency spent at the shrine on spirits and consumables.

### Ki Reward Formula

```
base         = 3
+ unique yaku earned this round
+ surplus bonus: +1 if finalScore ≥ threshold × 2
                 +2 if finalScore ≥ threshold × 3
× push mult:  × (1.0 + 0.25 × successfulPushCount)  on success
              × 0.5 if failed push (penaltyApplied)
× pig double: × 2 if Pig consumable was active
→ round to nearest integer
```

---

## Consumables

One-use items carried into a round (max 3 slots).

| Consumable | Effect |
|---|---|
| **Dog** | Suppresses the push-penalty for the round — failed push is treated as success |
| **Pig** | Doubles Ki earned at round end |
| **Rooster** | Reveals a portion of the draw pile |

---

## Implementation Notes

- `src/data/cards.js` — 48 card objects; `cardsByVertical`, `cardsByTemporal`, `cardsByQuadrant` helper exports
- `src/systems/ScoringEngine.js` — 6-yaku evaluation; spirit hooks via `SpiritEffects.js`
- `src/systems/GameRoundManager.js` — turn phases, push-your-luck state machine, Flow calculation
- `src/systems/RunManager.js` — cross-round state: Ki, styleBase, spirits, consumables, round counter
- `src/scenes/GameScene.js` — Phaser 3 game scene; renders hand/field/capture/spirits/consumables
- `src/scenes/ShrineScene.js` — between-round shrine shop
