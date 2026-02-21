#!/usr/bin/env node
/**
 * extract-cards.js
 *
 * Slices all 48 individual card images out of assets/cards/hanafuda_cards.png
 * and saves them to assets/cards/ using the filenames from cardImageMap.js
 * (e.g. 1_crane.png, 2_curtain.png, …).
 *
 * Detection strategy:
 *   Each card is surrounded by a red border.  Between cards and at the image
 *   edges there is white space with zero red pixels.  The script builds a
 *   per-column and per-row "redness count" array, finds the runs of all-zero
 *   columns/rows (the white gaps), and derives the exact card pixel ranges
 *   from those gaps — no hardcoded coordinates.
 *
 * Grid layout (from the sprite sheet spec):
 *   Row 0: January  (cols 0-3) + February  (cols 4-7)
 *   Row 1: March    (cols 0-3) + April     (cols 4-7)
 *   Row 2: May      (cols 0-3) + June      (cols 4-7)
 *   Row 3: July     (cols 0-3) + August    (cols 4-7)
 *   Row 4: September(cols 0-3) + October   (cols 4-7)
 *   Row 5: November (cols 0-3) + December  (cols 4-7)
 *
 *   Within each 4-card group cards are ordered highest→lowest type value:
 *   bright → animal → ribbon → plain  (skipping absent types).
 *
 * Usage:  node extract-cards.js
 */

import sharp from 'sharp';
import path  from 'path';
import { fileURLToPath } from 'url';
import { cardsByMonth }  from './src/data/cards.js';
import { cardImageMap }  from './src/data/cardImageMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE    = path.join(__dirname, 'assets/cards/hanafuda_cards.png');
const OUT_DIR   = path.join(__dirname, 'assets/cards');

// ── Card grid ─────────────────────────────────────────────────────────────────

const TYPE_RANK = { bright: 0, animal: 1, ribbon: 2, plain: 3 };

// Each row in the sprite sheet contains two consecutive months.
const ROW_MONTHS = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]];

// Build the 6×8 grid: GRID[row][col] = card object.
// Within each 4-card month group, sort by type rank (highest value first).
const GRID = ROW_MONTHS.map(([m1, m2]) => {
  const byRank = m => [...cardsByMonth[m]].sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type]);
  return [...byRank(m1), ...byRank(m2)];
});

// ── Redness profile ───────────────────────────────────────────────────────────

/** Returns true for pixels that are unmistakably red (card border colour). */
function isRed(r, g, b) {
  return r > 150 && g < 100 && b < 100;
}

/**
 * For each column x, count how many pixels in that column are red.
 * Returns a Uint32Array of length = image width.
 */
function buildColProfile(data, width, height, channels) {
  const profile = new Uint32Array(width);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isRed(data[i], data[i+1], data[i+2])) profile[x]++;
    }
  return profile;
}

/**
 * For each row y, count how many pixels in that row are red.
 * Returns a Uint32Array of length = image height.
 */
function buildRowProfile(data, width, height, channels) {
  const profile = new Uint32Array(height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isRed(data[i], data[i+1], data[i+2])) profile[y]++;
    }
  return profile;
}

// ── Gap / band detection ──────────────────────────────────────────────────────

/**
 * Find all contiguous runs of zero values in a profile array.
 * Returns [{ s, e }] where s/e are the inclusive start/end indices.
 */
function zeroRuns(profile) {
  const runs = [];
  let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    const zero = i < profile.length && profile[i] === 0;
    if (zero  && start === -1) start = i;
    if (!zero && start !== -1) { runs.push({ s: start, e: i - 1 }); start = -1; }
  }
  return runs;
}

/**
 * Given a redness profile and the expected number of card bands (8 or 6),
 * returns an array of { start, end } pixel ranges — one per card band.
 *
 * The white gaps between cards (zero-redness runs) are used as boundaries.
 * Outer-margin runs (touching pixel 0 or the last pixel) are stripped first,
 * leaving exactly n-1 interior gaps that divide the n card bands.
 */
function detectBands(profile, n, axis) {
  const len  = profile.length;
  const runs = zeroRuns(profile);

  if (runs.length === 0) {
    console.warn(`  ⚠  No zero-redness runs on ${axis}-axis — using even split`);
    return evenSplit(len, n);
  }

  // Separate outer margins (touching edges) from interior gaps.
  const outerL   = runs.find(r => r.s === 0);
  const outerR   = runs.find(r => r.e === len - 1);
  const interior = runs.filter(r => !(r.s === 0 || r.e === len - 1));

  // If more interior gaps than needed (noise), keep the n-1 widest ones.
  const gaps = interior
    .sort((a, b) => (b.e - b.s) - (a.e - a.s))   // widest first
    .slice(0, n - 1)
    .sort((a, b) => a.s - b.s);                    // restore left-to-right order

  if (gaps.length < n - 1) {
    console.warn(`  ⚠  Found only ${gaps.length} interior ${axis}-gaps (need ${n-1}) — using even split`);
    return evenSplit(len, n);
  }

  const cardStart = outerL ? outerL.e + 1 : 0;
  const cardEnd   = outerR ? outerR.s - 1 : len - 1;

  const bands = [];
  let pos = cardStart;
  for (const gap of gaps) {
    bands.push({ start: pos, end: gap.s - 1 });
    pos = gap.e + 1;
  }
  bands.push({ start: pos, end: cardEnd });

  // Sanity check
  if (bands.length !== n || bands.some(b => b.start > b.end)) {
    console.warn(`  ⚠  Band detection produced unexpected results on ${axis}-axis — using even split`);
    return evenSplit(len, n);
  }

  return bands;
}

function evenSplit(len, n) {
  const step = len / n;
  return Array.from({ length: n }, (_, i) => ({
    start: Math.round(i * step),
    end:   Math.round((i + 1) * step) - 1,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Loading sprite sheet…');
  const { data, info } = await sharp(SPRITE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`  ${width} × ${height} px  (${channels} channels)`);

  console.log('Building redness profiles…');
  const colProfile = buildColProfile(data, width, height, channels);
  const rowProfile = buildRowProfile(data, width, height, channels);

  console.log('Detecting card bands…');
  const colBands = detectBands(colProfile, 8, 'column');
  const rowBands = detectBands(rowProfile, 6, 'row');

  const colW = colBands.map(b => b.end - b.start + 1);
  const rowH = rowBands.map(b => b.end - b.start + 1);
  console.log(`  Column widths : ${colW.join(', ')} px`);
  console.log(`  Row heights   : ${rowH.join(', ')} px`);

  const cardW = colW[0], cardH = rowH[0];
  const uniform = colW.every(w => w === cardW) && rowH.every(h => h === cardH);
  if (!uniform) console.warn('  ⚠  Cards are not all the same size — check results');

  console.log(`\n  Card size: ${cardW} × ${cardH} px\n`);
  console.log(`Extracting 48 cards into ${OUT_DIR}…\n`);

  let n = 0;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const card = GRID[row][col];
      const rb   = rowBands[row];
      const cb   = colBands[col];
      const dest = path.join(OUT_DIR, path.basename(cardImageMap[card.id]));

      await sharp(SPRITE)
        .extract({
          left:   cb.start,
          top:    rb.start,
          width:  cb.end - cb.start + 1,
          height: rb.end - rb.start + 1,
        })
        .toFile(dest);

      process.stdout.write(
        `  [${String(++n).padStart(2)}/48]  ${card.id.padEnd(26)} → ${path.basename(dest)}\n`
      );
    }
  }

  console.log(`\n✓  Done — ${n} cards extracted.`);
  console.log('   Update CARD_W / CARD_H in GameScene.js if the card size changed.');
}

run().catch(err => {
  console.error('\n✗ ', err.message);
  process.exit(1);
});
