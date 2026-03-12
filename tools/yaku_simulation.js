/**
 * Yaku Possibility Simulator
 *
 * Tests whether every random deal has at least one possible play sequence
 * that produces a yaku, across many random deck orderings.
 *
 * Run: node tools/yaku_simulation.js
 */

// ── Card data (simplified) ──────────────────────────────────────────────────

const CARDS = [];

// Card types per month — matches the actual hanafuda deck.
const TYPES_BY_MONTH = {
  1:  ['bright', 'ribbon', 'plain', 'plain'],
  2:  ['animal', 'ribbon', 'plain', 'plain'],
  3:  ['bright', 'ribbon', 'plain', 'plain'],
  4:  ['animal', 'ribbon', 'plain', 'plain'],
  5:  ['animal', 'ribbon', 'plain', 'plain'],
  6:  ['animal', 'ribbon', 'plain', 'plain'],
  7:  ['animal', 'ribbon', 'plain', 'plain'],
  8:  ['bright', 'animal', 'plain', 'plain'],
  9:  ['animal', 'ribbon', 'plain', 'plain'],
  10: ['animal', 'ribbon', 'plain', 'plain'],
  11: ['bright', 'animal', 'ribbon', 'plain'],
  12: ['bright', 'plain', 'plain', 'plain'],
};

for (let month = 1; month <= 12; month++) {
  TYPES_BY_MONTH[month].forEach((type, i) => {
    CARDS.push({ id: `m${month}_${i}`, month, type });
  });
}

// ── Yaku thresholds ─────────────────────────────────────────────────────────
// Kasu: 5+ plains | Tanzaku: 3+ ribbons | Tane: 3+ animals | Hikari: 2+ brights
function checkYaku(captured) {
  let bright = 0, animal = 0, ribbon = 0, plain = 0;
  for (const c of captured) {
    if (c.type === 'bright') bright++;
    else if (c.type === 'animal') animal++;
    else if (c.type === 'ribbon') ribbon++;
    else plain++;
  }
  return bright >= 2 || animal >= 3 || ribbon >= 3 || plain >= 5;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Score how useful a set of cards is toward completing a yaku. */
function scoreCapture(cards, alreadyCaptured) {
  let bright = 0, animal = 0, ribbon = 0, plain = 0;
  for (const c of alreadyCaptured) {
    if (c.type === 'bright') bright++;
    else if (c.type === 'animal') animal++;
    else if (c.type === 'ribbon') ribbon++;
    else plain++;
  }
  let value = 0;
  for (const c of cards) {
    if (c.type === 'plain')  value += (plain  < 5) ? 3 : 1;
    if (c.type === 'ribbon') value += (ribbon < 3) ? 5 : 2;
    if (c.type === 'animal') value += (animal < 3) ? 5 : 2;
    if (c.type === 'bright') value += (bright < 2) ? 10 : 3;
  }
  return value;
}

function findWorstCard(hand, captured) {
  let worstIdx = 0, worstVal = Infinity;
  for (let i = 0; i < hand.length; i++) {
    const val = scoreCapture([hand[i]], captured);
    if (val < worstVal) { worstVal = val; worstIdx = i; }
  }
  return worstIdx;
}

// ── Greedy round simulation ──────────────────────────────────────────────────
// Simulates one round with a greedy strategy (always prefer matching plays).
// Returns true if any yaku is triggered during play.
function simulateRound(hand, field, deckOrder) {
  const captured   = [];
  // Each field slot is an array of stacked cards.
  const fieldSlots = field.map(c => [c]);
  const deck       = [...deckOrder];
  let   handCards  = [...hand];
  const MAX_PLAYS  = 5;

  const getMatches = () => {
    const matches = [];
    for (let hi = 0; hi < handCards.length; hi++) {
      for (let fi = 0; fi < fieldSlots.length; fi++) {
        if (fieldSlots[fi].length > 0 && fieldSlots[fi][0].month === handCards[hi].month) {
          matches.push({ hi, fi });
        }
      }
    }
    return matches;
  };

  const placeFlipCard = (flipCard) => {
    // Find a matching normal slot.
    for (let fi = 0; fi < fieldSlots.length; fi++) {
      const slot = fieldSlots[fi];
      if (slot.length > 0 && slot[0].month === flipCard.month) {
        slot.push(flipCard);
        if (slot.length >= 4) {
          captured.push(...slot);
          fieldSlots[fi] = [];
        }
        return;
      }
    }
    // No match — place in first empty slot.
    for (let fi = 0; fi < fieldSlots.length; fi++) {
      if (fieldSlots[fi].length === 0) { fieldSlots[fi] = [flipCard]; return; }
    }
    fieldSlots.push([flipCard]);
  };

  for (let play = 0; play < MAX_PLAYS && handCards.length > 0; play++) {
    const matches = getMatches();

    if (matches.length > 0) {
      // Pick the match with the highest capture value.
      let best = matches[0], bestVal = -1;
      for (const m of matches) {
        const v = scoreCapture([handCards[m.hi], ...fieldSlots[m.fi]], captured);
        if (v > bestVal) { bestVal = v; best = m; }
      }
      const { hi, fi } = best;
      const hCard = handCards.splice(hi, 1)[0];
      const slot  = fieldSlots[fi];

      // Check if this completes a 4-stack.
      if (slot.length + 1 >= 4) {
        // Auto-capture all.
        captured.push(hCard, ...slot);
        fieldSlots[fi] = [];
        if (checkYaku(captured)) return true;
        // Still do a deck flip.
        if (deck.length > 0) placeFlipCard(deck.shift());
        continue;
      }

      // Standard pending match.
      const pending = [...slot, hCard];
      fieldSlots[fi] = pending;

      // Deck flip.
      if (deck.length > 0) {
        const flipCard = deck.shift();
        if (flipCard.month === hCard.month) {
          // Flip joins the pending slot — strand (3) or capture (2→3? no, pending+flip=3: strand).
          pending.push(flipCard);
          if (pending.length >= 4) {
            captured.push(...pending);
            fieldSlots[fi] = [];
          }
          // else strand — stays on field
        } else {
          // Clean flip — capture the pending pair.
          if (pending.length === 2) {
            captured.push(...pending);
            fieldSlots[fi] = [];
          }
          // else 3-card strand stays on field.
          placeFlipCard(flipCard);
        }
      } else {
        // Deck empty — if pending has 2 cards, capture them.
        if (pending.length === 2) {
          captured.push(...pending);
          fieldSlots[fi] = [];
        }
      }
    } else {
      // No match — play least-useful card to empty slot.
      const worstIdx = findWorstCard(handCards, captured);
      const hCard = handCards.splice(worstIdx, 1)[0];

      // Place to empty slot.
      let placed = false;
      for (let fi = 0; fi < fieldSlots.length; fi++) {
        if (fieldSlots[fi].length === 0) { fieldSlots[fi] = [hCard]; placed = true; break; }
      }
      if (!placed) fieldSlots.push([hCard]);

      // Deck flip.
      if (deck.length > 0) {
        const flipCard = deck.shift();
        // Fix D rule: if flip matches the card we just placed on empty slot → capture pair.
        if (flipCard.month === hCard.month) {
          // Find and remove hCard from field, then capture.
          for (let fi = 0; fi < fieldSlots.length; fi++) {
            if (fieldSlots[fi].length === 1 && fieldSlots[fi][0] === hCard) {
              fieldSlots[fi] = [];
              captured.push(hCard, flipCard);
              break;
            }
          }
        } else {
          placeFlipCard(flipCard);
        }
      }
    }

    if (checkYaku(captured)) return true;
  }

  return checkYaku(captured);
}

// ── Main simulation ──────────────────────────────────────────────────────────

const NUM_DEALS         = 100_000;
const DECK_SIMS_PER_DEAL = 50;

let impossibleDeals = 0;
let totalDeals      = 0;

console.log(`Simulating ${NUM_DEALS.toLocaleString()} random deals, ${DECK_SIMS_PER_DEAL} deck orderings each...`);
console.log('');

for (let d = 0; d < NUM_DEALS; d++) {
  const shuffled  = shuffle(CARDS);
  const hand      = shuffled.slice(0, 8);
  const field     = shuffled.slice(8, 16);
  const remaining = shuffled.slice(16); // 32 cards

  let anySuccess = false;

  for (let s = 0; s < DECK_SIMS_PER_DEAL; s++) {
    const deckOrder = shuffle(remaining);
    if (simulateRound(hand, field, deckOrder)) {
      anySuccess = true;
      break;
    }
  }

  if (!anySuccess) {
    impossibleDeals++;
    if (impossibleDeals <= 10) {
      const handTypes  = { bright: 0, animal: 0, ribbon: 0, plain: 0 };
      const fieldTypes = { bright: 0, animal: 0, ribbon: 0, plain: 0 };
      hand.forEach(c => handTypes[c.type]++);
      field.forEach(c => fieldTypes[c.type]++);
      console.log(`IMPOSSIBLE DEAL #${impossibleDeals}:`);
      console.log(`  Hand:  ${hand.map(c => `${c.type[0].toUpperCase()}${c.month}`).join(', ')}`);
      console.log(`  Field: ${field.map(c => `${c.type[0].toUpperCase()}${c.month}`).join(', ')}`);
      console.log(`  Hand types:  B:${handTypes.bright} A:${handTypes.animal} R:${handTypes.ribbon} P:${handTypes.plain}`);
      console.log(`  Field types: B:${fieldTypes.bright} A:${fieldTypes.animal} R:${fieldTypes.ribbon} P:${fieldTypes.plain}`);
      console.log('');
    }
  }

  totalDeals++;

  if ((d + 1) % 10_000 === 0) {
    const pct = (impossibleDeals / totalDeals * 100).toFixed(3);
    console.log(`  Progress: ${(d + 1).toLocaleString()}/${NUM_DEALS.toLocaleString()} — ${impossibleDeals} impossible so far (${pct}%)`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log(`Total deals tested: ${totalDeals.toLocaleString()}`);
console.log(`Impossible deals:   ${impossibleDeals}`);
console.log(`Percentage:         ${(impossibleDeals / totalDeals * 100).toFixed(4)}%`);
console.log(`Possible deals:     ${(totalDeals - impossibleDeals).toLocaleString()}`);
console.log('═══════════════════════════════════════════');

if (impossibleDeals === 0) {
  console.log('\nResult: In all tested deals, at least one deck ordering produced a yaku.');
  console.log('This strongly suggests that yaku-less rounds are extremely rare or impossible.');
} else {
  console.log(`\nResult: ${impossibleDeals} deals found where NO deck ordering produced a yaku.`);
  console.log('These deals may represent genuinely impossible rounds.');
  console.log('Consider adjusting yaku thresholds or adding safety mechanics.');
}
