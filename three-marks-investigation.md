# Three Marks Investigation Report

**Generated:** 2026-05-01

---

## Section A: Mark Definitions

**File:** `src/data/consumables.js`, lines 105–127

| ID | Name | Description | Cost | Category |
|----|------|-------------|------|----------|
| `mark_impermanence` | Impermanence | Promote one card to the next card type in its month | 5 | three_marks |
| `mark_nonbeing` | Non-being | Remove one card permanently from your deck | 5 | three_marks |
| `mark_transcendence` | Transcendence | Copy all properties from a target card onto a source card | 5 | three_marks |

The array has a `@deprecated` JSDoc tag. The lookup helper `getMarkDef(id)` (line 134) is actively used.

---

## Section B: Offering Paths — Where Marks Enter the Game

### Are marks offered in shops?

**NO.** Three Marks are NOT in any shop offering pool.

The shop offering generator `_generateDeckFixOfferings()` (ShrineScene line 167) draws from:
```js
const pool = [
  ...CHAKRA_TOOLS,         // ← 7 chakra tools
  ...WUXING_CONSUMABLES,   // ← 5 element consumables
  ...PRIMARY_STAMPS,       // ← stamps
  ...(isGrove ? SECONDARY_STAMPS : []),
];
```

`THREE_MARKS` is NOT included in this pool. Marks cannot be purchased from the shop.

### How DO marks enter inventory?

Marks can only enter the player's inventory via:

1. **Wu Xing element consumables** — when a player buys an `element_*` consumable at the shrine, it goes through `_buyConsumable()` → `_showUseOrCarryChoice()`. If the player chooses "Carry into Round," the element consumable is added to the consumable inventory with its `element_*` ID.

2. **sym_crow spirit** — `generateRandomConsumable()` in RunManager (line 1577) generates random consumables, but the pool is only `WUXING_CONSUMABLES` (no marks).

3. **Direct `addConsumable` calls** — Marks could theoretically be added via `run.addConsumable({id: 'mark_*', ...})`, but no code path does this.

**Conclusion: Three Marks are NEVER offered or obtainable in normal gameplay.**

---

## Section C: Effect Mechanics — What Each Mark Does

Despite being unobtainable, the mark effect handlers are fully implemented.

### mark_impermanence — Card Type Promotion
**GameScene** (line 2310–2316): Calls `run.promoteCard(card.id)`, then `run.consumeById(id)`.
**ShrineScene** (line 1646–1649): Same via booster pack overlay — calls `run.promoteCard(card.id)`.
**Effect:** Promotes a card's type within its month (plain→ribbon→animal→bright), using the type-order system.

### mark_nonbeing — Card Deletion
**GameScene** (line 2318–2326): Calls `run.deleteCard(card.id)`, removes from hand/field, then `run.consumeById(id)`.
**ShrineScene** (line 1650–1653): Same via booster pack — calls `run.deleteCard(card.id)`.
**Effect:** Permanently removes a card from the deck.

### mark_transcendence — Card Identity Copy
**GameScene** (line 2328–2354): Two-step flow. Step 1: select source card. Step 2: select target card. Calls `run.transcendCard(sourceId, targetId)`.
**ShrineScene** (line 1654–1666): Same two-step via booster pack overlay.
**Effect:** Copies all properties from the target card onto the source card. Source becomes an exact copy of target.

### Activation Path

The activation path is shared between marks and Wu Xing elements:

```
GameScene:  _activateMark(cons, idx) → _markMode state → _onMarkCardSelected(card)
             ↳ handles mark_* IDs (lines 2310–2354)
             ↳ handles element_* IDs (lines 2356–2400)

ShrineScene: _showBoosterPack(markDef) → card click handlers
              ↳ handles mark_* IDs (lines 1646–1666)
              ↳ handles element_* IDs (lines 1668+)
```

The function/parameter name `markDef` in ShrineScene is misleading — it's used for BOTH marks and elements. The `_markMode` state in GameScene similarly handles both mark_* and element_* IDs.

---

## Section D: UI Integration

### GameScene — `_markMode` system

**State:** `this._markMode = { id, index, step, sourceCard }` (line 2280)

When a mark or element consumable is activated:
1. `_markMode` is set
2. `_renderAll()` is called — hand/field cards render with teal highlights
3. Clicking a card routes to `_onMarkCardSelected(card)` which dispatches by ID prefix
4. ESC cancels mark mode
5. On completion, `_markMode` is set to null

This is the SAME UI system used for Wu Xing element application. The "mark mode" is really "card-targeting mode" for any consumable that targets individual cards.

### ShrineScene — Booster Pack overlay

When a mark or element consumable is purchased:
1. `_showUseOrCarryChoice(markDef)` offers "Use Now" or "Carry into Round"
2. "Use Now" opens `_showBoosterPack(markDef)` — shows 8 random deck cards
3. Player clicks a card to apply the effect immediately
4. "Carry" adds the consumable to inventory (for use during a round via `_markMode`)

This is the SAME UI system for both marks and elements.

---

## Section E: Verdict

### Classification: **Possibility C** — Marks are infrastructure used by a CURRENT system under different naming.

**Evidence:**

1. **The Three Marks definitions themselves are dead** — they are never offered in shops, never generated by any spirit, and cannot enter the game naturally. The `THREE_MARKS` array data is orphaned.

2. **BUT the mark EFFECT HANDLERS are actively shared** with Wu Xing element consumables:
   - `_activateMark()` handles both `mark_*` and `element_*` IDs
   - `_onMarkCardSelected()` dispatches by ID prefix to handle both
   - `_showBoosterPack()` renders UI for both mark and element consumables
   - `_markMode` state manages card-targeting for both systems

3. **The underlying RunManager methods called by marks are independently active:**
   - `run.promoteCard()` — also called by Chakra Solar Plexus
   - `run.deleteCard()` — also called by Chakra Third Eye
   - `run.transcendCard()` — also called by Chakra Crown

4. **`getMarkDef()` is the only import from `THREE_MARKS`** — it's used nowhere in the current codebase (verified by grep). The function exists but has zero callers outside its own file.

### What's safe to remove:

| Item | Safe to remove? | Reason |
|------|----------------|--------|
| `THREE_MARKS` array | YES | Never offered, never generated, zero importers |
| `getMarkDef()` function | YES | Zero callers outside consumables.js |
| `@deprecated` JSDoc on THREE_MARKS | YES (with array) | Removed together |
| `mark_impermanence` handler in GameScene | NO | Handler code is reachable if a mark_* consumable were somehow in inventory |
| `mark_nonbeing` handler in GameScene | NO | Same — defensive keep |
| `mark_transcendence` handler in GameScene | NO | Same |
| `_markMode` system | NO | Actively used by Wu Xing elements |
| `_activateMark()` | NO | Actively used by elements |
| `_onMarkCardSelected()` | NO | Actively used — dispatches element_* handling |
| `_showBoosterPack()` | NO | Actively used by elements |
| ShrineScene mark handlers (lines 1599–1666) | NO | Part of the shared booster pack UI |
| `ConsumableEffects.js` comment (line 18) | YES | Misleading comment, marks aren't handled there |

### Naming confusion:

The "mark" naming pervades the card-targeting system:
- `_markMode` — should really be `_cardTargetMode`
- `_activateMark` — should be `_activateCardTarget`
- `_onMarkCardSelected` — should be `_onCardTargetSelected`
- `_showBoosterPack(markDef)` — parameter should be `consumableDef`

These renames would improve readability but are cosmetic and outside the scope of a cleanup pass.

### Summary:

**The `THREE_MARKS` array and `getMarkDef` are dead data** — safe to remove. The mark *effect handlers* (promote, delete, transcend) and the *card-targeting UI system* (`_markMode`, `_activateMark`, `_onMarkCardSelected`, `_showBoosterPack`) are alive and actively used by Wu Xing element consumables. The system is confusingly named after its original purpose (Three Marks) but now serves a broader role (any card-targeting consumable).
