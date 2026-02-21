// Temporary smoke test — delete when real tests exist.
// Run with: node src/test-run.js

import DeckManager   from "./systems/DeckManager.js";
import ScoringEngine from "./systems/ScoringEngine.js";

// ── Setup ──────────────────────────────────────────────────────────────────

const deck    = new DeckManager();
const engine  = new ScoringEngine();

deck.shuffle();

const drawn = deck.draw(15);

// ── Print drawn cards ──────────────────────────────────────────────────────

console.log("=".repeat(56));
console.log(" DRAWN CARDS  (15 of 48)");
console.log("=".repeat(56));

const typeLabel = { bright: "★ BRIGHT", animal: "● ANIMAL", ribbon: "▪ RIBBON", plain: "· PLAIN " };

for (const card of drawn) {
  const label  = typeLabel[card.type] ?? card.type.padEnd(8);
  const pts    = `${card.points}pt`.padStart(4);
  const month  = `[${card.monthName}]`.padEnd(12);
  console.log(`  ${label}  ${pts}  ${month}  ${card.name}`);
}

console.log(`\n  Remaining in deck: ${deck.drawPileSize}`);

// ── Evaluate yaku ──────────────────────────────────────────────────────────

const yaku = engine.evaluate(drawn);

console.log("\n" + "=".repeat(56));
console.log(" YAKU FOUND");
console.log("=".repeat(56));

if (yaku.length === 0) {
  console.log("  (none — try drawing more cards)");
} else {
  for (const y of yaku) {
    console.log(`\n  ${y.name}  —  ${y.points} point${y.points !== 1 ? "s" : ""}`);
    for (const card of y.cards) {
      console.log(`    · ${card.name}  (${card.monthName})`);
    }
  }
}

// ── Score summary ──────────────────────────────────────────────────────────

const yakuTotal = engine.totalPoints(drawn);
const rawTotal  = drawn.reduce((sum, c) => sum + c.points, 0);

console.log("\n" + "=".repeat(56));
console.log(` Yaku score  : ${yakuTotal} point${yakuTotal !== 1 ? "s" : ""}`);
console.log(` Raw card pts: ${rawTotal}  (sum of printed values)`);
console.log("=".repeat(56) + "\n");
