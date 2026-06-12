// ─────────────────────────────────────────────────────────────────────────────
// Hanafuda card data — 48 base cards + 13 speculative cards across 12 months
//
// Base deck type distribution (canonical, 48 cards):
//   bright  ×5  — 20 pts  (Jan, Mar, Aug, Nov, Dec)
//   animal  ×9  — 12 pts  (Feb, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov)
//   ribbon  ×10 — 10 pts  (Jan, Feb, Mar, Apr, May, Jun, Jul, Sep, Oct, Nov)
//   plain   ×24 —  3 pts  (all months)
//
// Speculative cards (13) fill missing month/rank slots so every month has
// at least one bright, animal, ribbon, and two plains.  They never appear in
// the base deck — only via rank promotion or hexagram deck modifications.
// Marked with `speculative: true`.
//
// Tags are thematic descriptors used to compute spirit / hexagram affinity.
//
// vertical: 'air' | 'land' — cosmic axis of the card's imagery (24/24 base)
// temporal: 'day' | 'night' — time-of-day quality of the card (24/24 base)
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
    vertical: "air",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
    temporal: "day",
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
    vertical: "air",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
    temporal: "day",
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
    temporal: "day",
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
    name: "Iris Fireflies",
    tags: ["firefly", "insect", "spring", "night", "light", "water"],
    vertical: "air",
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
    temporal: "day",
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
    temporal: "day",
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
    vertical: "land",
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
    temporal: "night",
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
    temporal: "night",
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
    temporal: "night",
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
    temporal: "night",
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
    temporal: "day",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "day",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "day",
  },

  // ── September · Chrysanthemum (菊 Kiku) ───────────────────────────────────
  {
    id: "september_sake",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "animal",
    points: 12,
    name: "Chrysanthemum Cricket",
    tags: ["insect", "autumn", "song", "night", "cricket", "flower"],
    vertical: "land",
    temporal: "night",
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
    vertical: "air",
    temporal: "day",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
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
    vertical: "air",
    temporal: "day",
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
    vertical: "air",
    temporal: "night",
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
    vertical: "air",
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
    vertical: "land",
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
    vertical: "air",
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
    temporal: "day",
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
    vertical: "land",
    temporal: "day",
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
    vertical: "land",
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
    temporal: "day",
  },
  {
    id: "december_plain_1_dup",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "plain",
    points: 3,
    name: "Paulownia Plain",
    tags: ["winter", "noble", "evergreen"],
    vertical: "land",
    temporal: "night",
    baseImageId: "december_plain_1",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Speculative cards — missing month/rank slots
  //
  // These cards never enter the base deck.  They exist as definitions for
  // rank promotion mechanics and hexagram deck modifications.
  // ─────────────────────────────────────────────────────────────────────────

  // ── January speculative ──────────────────────────────────────────────────
  {
    id: "january_bear",
    month: 1,
    monthName: "January",
    flower: "Pine",
    type: "animal",
    points: 12,
    name: "Bear",
    tags: [],
    vertical: "land",
    temporal: "day",
    speculative: true,
  },

  // ── February speculative ─────────────────────────────────────────────────
  {
    id: "february_scholar",
    month: 2,
    monthName: "February",
    flower: "Plum Blossom",
    type: "bright",
    points: 20,
    name: "Scholar",
    tags: [],
    vertical: "air",
    temporal: "night",
    speculative: true,
  },

  // ── March speculative ────────────────────────────────────────────────────
  {
    id: "march_ladybugs",
    month: 3,
    monthName: "March",
    flower: "Cherry Blossom",
    type: "animal",
    points: 12,
    name: "Ladybugs",
    tags: [],
    vertical: "air",
    temporal: "day",
    speculative: true,
  },

  // ── April speculative ────────────────────────────────────────────────────
  {
    id: "april_pond",
    month: 4,
    monthName: "April",
    flower: "Wisteria",
    type: "bright",
    points: 20,
    name: "Pond",
    tags: [],
    vertical: "air",
    temporal: "night",
    speculative: true,
  },

  // ── May speculative ──────────────────────────────────────────────────────
  {
    id: "may_kite",
    month: 5,
    monthName: "May",
    flower: "Iris",
    type: "bright",
    points: 20,
    name: "Kite",
    tags: [],
    vertical: "air",
    temporal: "day",
    speculative: true,
  },

  // ── June speculative ─────────────────────────────────────────────────────
  {
    id: "june_kirin",
    month: 6,
    monthName: "June",
    flower: "Peony",
    type: "bright",
    points: 20,
    name: "Kirin",
    tags: [],
    vertical: "land",
    temporal: "night",
    speculative: true,
  },

  // ── July speculative ─────────────────────────────────────────────────────
  {
    id: "july_farmer",
    month: 7,
    monthName: "July",
    flower: "Bush Clover",
    type: "bright",
    points: 20,
    name: "Farmer",
    tags: [],
    vertical: "land",
    temporal: "day",
    speculative: true,
  },

  // ── August speculative ───────────────────────────────────────────────────
  {
    id: "august_ribbon",
    month: 8,
    monthName: "August",
    flower: "Pampas Grass",
    type: "ribbon",
    points: 10,
    name: "Pampas Ribbon",
    tags: [],
    vertical: "air",
    temporal: "day",
    speculative: true,
  },

  // ── September speculative ────────────────────────────────────────────────
  {
    id: "september_bell",
    month: 9,
    monthName: "September",
    flower: "Chrysanthemum",
    type: "bright",
    points: 20,
    name: "Bell",
    tags: [],
    vertical: "air",
    temporal: "day",
    speculative: true,
  },

  // ── October speculative ──────────────────────────────────────────────────
  {
    id: "october_lantern",
    month: 10,
    monthName: "October",
    flower: "Maple",
    type: "bright",
    points: 20,
    name: "Lantern",
    tags: [],
    vertical: "land",
    temporal: "night",
    speculative: true,
  },

  // ── November speculative ─────────────────────────────────────────────────
  {
    id: "november_plain_2",
    month: 11,
    monthName: "November",
    flower: "Willow",
    type: "plain",
    points: 3,
    name: "Willow Plain",
    tags: [],
    vertical: "land",
    temporal: "night",
    speculative: true,
  },

  // ── December speculative ─────────────────────────────────────────────────
  {
    id: "december_fox",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "animal",
    points: 12,
    name: "Fox",
    tags: [],
    vertical: "land",
    temporal: "night",
    speculative: true,
  },
  {
    id: "december_ribbon",
    month: 12,
    monthName: "December",
    flower: "Paulownia",
    type: "ribbon",
    points: 10,
    name: "Paulownia Ribbon",
    tags: [],
    vertical: "land",
    temporal: "night",
    speculative: true,
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
    speculative: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Filtered subsets
// ─────────────────────────────────────────────────────────────────────────────

/** The 48-card base deck (no speculative cards). */
export const baseCards = cards.filter(c => !c.speculative);

/** The 13+1 speculative cards (not part of the base deck). */
export const speculativeCards = cards.filter(c => c.speculative);

/**
 * Map `${month}_${type}` → the first card of that month/type in `cards`
 * (base cards win over speculative because they appear first). The canonical
 * base-card lookup used by rank promotion and chakra month/type mutations.
 */
const _baseCardByMonthType = new Map();
for (const card of cards) {
  const key = `${card.month}_${card.type}`;
  if (!_baseCardByMonthType.has(key)) _baseCardByMonthType.set(key, card);
}

/**
 * Look up the base card for a month/type pair.
 * @param {number} month  1–12
 * @param {string} type   'plain' | 'ribbon' | 'animal' | 'bright'
 * @returns {object|null}
 */
export const getBaseCard = (month, type) => _baseCardByMonthType.get(`${month}_${type}`) ?? null;

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
 * Cards grouped by vertical axis: "air" | "land" (24 each).
 * @type {{ air: typeof cards, land: typeof cards }}
 */
export const cardsByVertical = {
  air:  cards.filter(c => c.vertical === "air"),
  land: cards.filter(c => c.vertical === "land"),
};

/**
 * Cards grouped by temporal quality: "day" | "night" (24 each).
 * @type {{ day: typeof cards, night: typeof cards }}
 */
export const cardsByTemporal = {
  day:   cards.filter(c => c.temporal === "day"),
  night: cards.filter(c => c.temporal === "night"),
};

/**
 * Cards grouped by combined vertical+temporal quadrant.
 * Keys: "air+day" | "air+night" | "land+day" | "land+night".
 * @type {Object.<string, typeof cards>}
 */
export const cardsByQuadrant = {
  "air+day":    cards.filter(c => c.vertical === "air"  && c.temporal === "day"),
  "air+night":  cards.filter(c => c.vertical === "air"  && c.temporal === "night"),
  "land+day":   cards.filter(c => c.vertical === "land" && c.temporal === "day"),
  "land+night": cards.filter(c => c.vertical === "land" && c.temporal === "night"),
};
