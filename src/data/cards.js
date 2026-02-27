// ─────────────────────────────────────────────────────────────────────────────
// Hanafuda card data — all 48 cards across 12 months
//
// Type distribution (canonical):
//   bright  ×5  — 20 pts  (Jan, Mar, Aug, Nov, Dec)
//   animal  ×9  — 12 pts  (Feb, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov)
//   ribbon  ×10 — 10 pts  (Jan, Feb, Mar, Apr, May, Jun, Jul, Sep, Oct, Nov)
//   plain   ×24 —  3 pts  (all months)
//
// Tags are thematic descriptors used to compute spirit / hexagram affinity.
//
// vertical: 'sky' | 'land' — cosmic axis of the card's imagery
// temporal: 'day' | 'night' — time-of-day quality of the card
// ─────────────────────────────────────────────────────────────────────────────

export const cards = [

  // ── January · Pine (松 Matsu) ────────────────────────────────────────────
  {
    id: "january_crane",
    month: 1,
    monthName: "January",
    flower: "Pine",
    type: "bright",
    points: 20,
    name: "Crane and Rising Sun",
    tags: ["sky", "sun", "crane", "noble", "auspicious", "longevity", "winter"],
    vertical: "sky",
    temporal: "day",
  },
  {
    id: "january_ribbon",
    month: 1,
    monthName: "January",
    flower: "Pine",
    type: "ribbon",
    points: 10,
    name: "Pine Poetry Ribbon",
    tags: ["poetry", "noble", "winter", "evergreen"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "january_plain_1",
    month: 1,
    monthName: "January",
    flower: "Pine",
    type: "plain",
    points: 3,
    name: "Pine Plain",
    tags: ["winter", "evergreen"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "january_plain_2",
    month: 1,
    monthName: "January",
    flower: "Pine",
    type: "plain",
    points: 3,
    name: "Pine Plain",
    tags: ["winter", "evergreen"],
    vertical: "land",
    temporal: "night",
  },

  // ── February · Plum Blossom (梅 Ume) ─────────────────────────────────────
  {
    id: "february_warbler",
    month: 2,
    monthName: "February",
    flower: "Plum Blossom",
    type: "animal",
    points: 12,
    name: "Bush Warbler on Plum",
    tags: ["bird", "spring", "song", "blossom", "delicate"],
    vertical: "sky",
    temporal: "day",
  },
  {
    id: "february_ribbon",
    month: 2,
    monthName: "February",
    flower: "Plum Blossom",
    type: "ribbon",
    points: 10,
    name: "Plum Poetry Ribbon",
    tags: ["poetry", "spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "february_plain_1",
    month: 2,
    monthName: "February",
    flower: "Plum Blossom",
    type: "plain",
    points: 3,
    name: "Plum Plain",
    tags: ["spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "february_plain_2",
    month: 2,
    monthName: "February",
    flower: "Plum Blossom",
    type: "plain",
    points: 3,
    name: "Plum Plain",
    tags: ["spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },

  // ── March · Cherry Blossom (桜 Sakura) ───────────────────────────────────
  {
    id: "march_curtain",
    month: 3,
    monthName: "March",
    flower: "Cherry Blossom",
    type: "bright",
    points: 20,
    name: "Cherry Blossom Viewing Curtain",
    tags: ["celebration", "spring", "noble", "blossom", "ceremony", "revelry"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "march_ribbon",
    month: 3,
    monthName: "March",
    flower: "Cherry Blossom",
    type: "ribbon",
    points: 10,
    name: "Cherry Poetry Ribbon",
    tags: ["poetry", "spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "march_plain_1",
    month: 3,
    monthName: "March",
    flower: "Cherry Blossom",
    type: "plain",
    points: 3,
    name: "Cherry Plain",
    tags: ["spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "march_plain_2",
    month: 3,
    monthName: "March",
    flower: "Cherry Blossom",
    type: "plain",
    points: 3,
    name: "Cherry Plain",
    tags: ["spring", "blossom"],
    vertical: "land",
    temporal: "day",
  },

  // ── April · Wisteria (藤 Fuji) ────────────────────────────────────────────
  {
    id: "april_cuckoo",
    month: 4,
    monthName: "April",
    flower: "Wisteria",
    type: "animal",
    points: 12,
    name: "Cuckoo with Crescent Moon",
    tags: ["bird", "moon", "spring", "night", "longing", "sky"],
    vertical: "sky",
    temporal: "night",
  },
  {
    id: "april_ribbon",
    month: 4,
    monthName: "April",
    flower: "Wisteria",
    type: "ribbon",
    points: 10,
    name: "Wisteria Ribbon",
    tags: ["spring", "vine", "delicate"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "april_plain_1",
    month: 4,
    monthName: "April",
    flower: "Wisteria",
    type: "plain",
    points: 3,
    name: "Wisteria Plain",
    tags: ["spring", "vine"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "april_plain_2",
    month: 4,
    monthName: "April",
    flower: "Wisteria",
    type: "plain",
    points: 3,
    name: "Wisteria Plain",
    tags: ["spring", "vine"],
    vertical: "land",
    temporal: "night",
  },

  // ── May · Iris (菖蒲 Ayame) ───────────────────────────────────────────────
  {
    id: "may_bridge",
    month: 5,
    monthName: "May",
    flower: "Iris",
    type: "animal",
    points: 12,
    name: "Eight-Plank Bridge",
    tags: ["water", "bridge", "spring", "journey", "passage"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "may_ribbon",
    month: 5,
    monthName: "May",
    flower: "Iris",
    type: "ribbon",
    points: 10,
    name: "Iris Ribbon",
    tags: ["spring", "water", "flower"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "may_plain_1",
    month: 5,
    monthName: "May",
    flower: "Iris",
    type: "plain",
    points: 3,
    name: "Iris Plain",
    tags: ["spring", "water"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "may_plain_2",
    month: 5,
    monthName: "May",
    flower: "Iris",
    type: "plain",
    points: 3,
    name: "Iris Plain",
    tags: ["spring", "water"],
    vertical: "land",
    temporal: "night",
  },

  // ── June · Peony (牡丹 Botan) ─────────────────────────────────────────────
  {
    id: "june_butterflies",
    month: 6,
    monthName: "June",
    flower: "Peony",
    type: "animal",
    points: 12,
    name: "Butterflies on Peony",
    tags: ["butterfly", "summer", "transformation", "flower", "delicate"],
    vertical: "sky",
    temporal: "day",
  },
  {
    id: "june_ribbon",
    month: 6,
    monthName: "June",
    flower: "Peony",
    type: "ribbon",
    points: 10,
    name: "Peony Blue Ribbon",
    tags: ["summer", "flower", "noble", "poetry"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "june_plain_1",
    month: 6,
    monthName: "June",
    flower: "Peony",
    type: "plain",
    points: 3,
    name: "Peony Plain",
    tags: ["summer", "flower"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "june_plain_2",
    month: 6,
    monthName: "June",
    flower: "Peony",
    type: "plain",
    points: 3,
    name: "Peony Plain",
    tags: ["summer", "flower"],
    vertical: "land",
    temporal: "day",
  },

  // ── July · Bush Clover (萩 Hagi) ──────────────────────────────────────────
  {
    id: "july_boar",
    month: 7,
    monthName: "July",
    flower: "Bush Clover",
    type: "animal",
    points: 12,
    name: "Wild Boar",
    tags: ["animal", "summer", "wild", "hunt", "forest", "earth"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "july_ribbon",
    month: 7,
    monthName: "July",
    flower: "Bush Clover",
    type: "ribbon",
    points: 10,
    name: "Bush Clover Ribbon",
    tags: ["summer", "field", "wild"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "july_plain_1",
    month: 7,
    monthName: "July",
    flower: "Bush Clover",
    type: "plain",
    points: 3,
    name: "Bush Clover Plain",
    tags: ["summer", "field"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "july_plain_2",
    month: 7,
    monthName: "July",
    flower: "Bush Clover",
    type: "plain",
    points: 3,
    name: "Bush Clover Plain",
    tags: ["summer", "field"],
    vertical: "land",
    temporal: "night",
  },

  // ── August · Pampas Grass (芒 Susuki) ─────────────────────────────────────
  {
    id: "august_moon",
    month: 8,
    monthName: "August",
    flower: "Pampas Grass",
    type: "bright",
    points: 20,
    name: "Full Harvest Moon",
    tags: ["moon", "autumn", "sky", "harvest", "night", "reflection"],
    vertical: "sky",
    temporal: "night",
  },
  {
    id: "august_geese",
    month: 8,
    monthName: "August",
    flower: "Pampas Grass",
    type: "animal",
    points: 12,
    name: "Geese in Flight",
    tags: ["bird", "autumn", "sky", "migration", "moon", "journey"],
    vertical: "sky",
    temporal: "night",
  },
  {
    id: "august_plain_1",
    month: 8,
    monthName: "August",
    flower: "Pampas Grass",
    type: "plain",
    points: 3,
    name: "Pampas Plain",
    tags: ["autumn", "field", "wind"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "august_plain_2",
    month: 8,
    monthName: "August",
    flower: "Pampas Grass",
    type: "plain",
    points: 3,
    name: "Pampas Plain",
    tags: ["autumn", "field", "wind"],
    vertical: "land",
    temporal: "night",
  },

  // ── September · Chrysanthemum (菊 Kiku) ───────────────────────────────────
  {
    id: "september_sake",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "animal",
    points: 12,
    name: "Sake Cup",
    tags: ["celebration", "autumn", "longevity", "ritual", "drink", "noble"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "september_ribbon",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "ribbon",
    points: 10,
    name: "Chrysanthemum Blue Ribbon",
    tags: ["autumn", "flower", "noble", "poetry"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "september_plain_1",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "plain",
    points: 3,
    name: "Chrysanthemum Plain",
    tags: ["autumn", "flower"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "september_plain_2",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "plain",
    points: 3,
    name: "Chrysanthemum Plain",
    tags: ["autumn", "flower"],
    vertical: "land",
    temporal: "day",
  },

  // ── October · Maple (紅葉 Momiji) ─────────────────────────────────────────
  {
    id: "october_deer",
    month: 10,
    monthName: "October",
    flower: "Maple",
    type: "animal",
    points: 12,
    name: "Deer among Maple",
    tags: ["animal", "autumn", "forest", "grace", "foliage", "earth"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "october_ribbon",
    month: 10,
    monthName: "October",
    flower: "Maple",
    type: "ribbon",
    points: 10,
    name: "Maple Blue Ribbon",
    tags: ["autumn", "foliage", "noble", "poetry"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "october_plain_1",
    month: 10,
    monthName: "October",
    flower: "Maple",
    type: "plain",
    points: 3,
    name: "Maple Plain",
    tags: ["autumn", "foliage"],
    vertical: "land",
    temporal: "day",
  },
  {
    id: "october_plain_2",
    month: 10,
    monthName: "October",
    flower: "Maple",
    type: "plain",
    points: 3,
    name: "Maple Plain",
    tags: ["autumn", "foliage"],
    vertical: "land",
    temporal: "day",
  },

  // ── November · Willow / Rain (柳 Yanagi) ──────────────────────────────────
  {
    id: "november_rainman",
    month: 11,
    monthName: "November",
    flower: "Willow",
    type: "bright",
    points: 20,
    name: "Ono no Michikaze in the Rain",
    tags: ["rain", "water", "wisdom", "scholar", "perseverance", "winter", "frog"],
    vertical: "sky",
    temporal: "night",
  },
  {
    id: "november_swallow",
    month: 11,
    monthName: "November",
    flower: "Willow",
    type: "animal",
    points: 12,
    name: "Swallow in Rain",
    tags: ["bird", "rain", "water", "winter", "journey", "sky"],
    vertical: "sky",
    temporal: "night",
  },
  {
    id: "november_ribbon",
    month: 11,
    monthName: "November",
    flower: "Willow",
    type: "ribbon",
    points: 10,
    name: "Willow Ribbon",
    tags: ["rain", "water", "winter", "sorrow"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "november_lightning",
    month: 11,
    monthName: "November",
    flower: "Willow",
    type: "plain",
    points: 3,
    name: "Lightning and Thunder Drum",
    tags: ["storm", "sky", "thunder", "danger", "winter"],
    vertical: "sky",
    temporal: "night",
  },

  // ── December · Paulownia (桐 Kiri) ────────────────────────────────────────
  {
    id: "december_phoenix",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "bright",
    points: 20,
    name: "Phoenix on Paulownia",
    tags: ["sky", "noble", "mythical", "fire", "rebirth", "auspicious", "winter"],
    vertical: "sky",
    temporal: "day",
  },
  {
    id: "december_plain_1",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "plain",
    points: 3,
    name: "Paulownia Plain",
    tags: ["winter", "noble", "evergreen"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "december_plain_2",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "plain",
    points: 3,
    name: "Paulownia Plain",
    tags: ["winter", "noble", "evergreen"],
    vertical: "land",
    temporal: "night",
  },
  {
    id: "december_plain_3",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "plain",
    points: 3,
    name: "Paulownia Yellow Sky Plain",
    tags: ["winter", "noble", "sky"],
    vertical: "land",
    temporal: "night",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper lookup objects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cards grouped by month number (1–12).
 * @type {Object.<number, typeof cards>}
 * @example cardsByMonth[1] // all four January cards
 */
export const cardsByMonth = cards.reduce((acc, card) => {
  (acc[card.month] ??= []).push(card);
  return acc;
}, {});

/**
 * Cards grouped by type: "bright" | "animal" | "ribbon" | "plain".
 * @type {Object.<string, typeof cards>}
 * @example cardsByType.bright // the five 20-point cards
 */
export const cardsByType = cards.reduce((acc, card) => {
  (acc[card.type] ??= []).push(card);
  return acc;
}, {});

/**
 * Cards grouped by tag. A single card may appear under multiple tags.
 * @type {Object.<string, typeof cards>}
 * @example cardsByTag.moon // Full Moon + Cuckoo with Crescent Moon
 */
export const cardsByTag = cards.reduce((acc, card) => {
  for (const tag of card.tags) {
    (acc[tag] ??= []).push(card);
  }
  return acc;
}, {});

/**
 * Cards grouped by vertical axis: "sky" | "land".
 * @type {{ sky: typeof cards, land: typeof cards }}
 * @example cardsByVertical.sky // the 10 sky cards
 */
export const cardsByVertical = {
  sky:  cards.filter(c => c.vertical === "sky"),
  land: cards.filter(c => c.vertical === "land"),
};

/**
 * Cards grouped by temporal quality: "day" | "night".
 * @type {{ day: typeof cards, night: typeof cards }}
 * @example cardsByTemporal.night // the 25 night cards
 */
export const cardsByTemporal = {
  day:   cards.filter(c => c.temporal === "day"),
  night: cards.filter(c => c.temporal === "night"),
};

/**
 * Cards grouped by combined vertical+temporal quadrant.
 * Keys: "sky+day" | "sky+night" | "land+day" | "land+night".
 * @type {Object.<string, typeof cards>}
 * @example cardsByQuadrant['sky+night'] // Moon, Geese, Cuckoo, Rain Man, Swallow, Lightning
 */
export const cardsByQuadrant = {
  "sky+day":   cards.filter(c => c.vertical === "sky"  && c.temporal === "day"),
  "sky+night": cards.filter(c => c.vertical === "sky"  && c.temporal === "night"),
  "land+day":  cards.filter(c => c.vertical === "land" && c.temporal === "day"),
  "land+night":cards.filter(c => c.vertical === "land" && c.temporal === "night"),
};
