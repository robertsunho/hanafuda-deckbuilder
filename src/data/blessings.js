// ─────────────────────────────────────────────────────────────────────────────
// Blessings — foundational permanent run modifiers
// Distinct from spirits and consumables. Acquired permanently for the run.
// Cannot be sold or removed once obtained.
//
// Each Blessing has a tier-1 (colloquial) and tier-2 (deity) form.
// Effects are identical between tiers — owning both stacks the bonus.
// ─────────────────────────────────────────────────────────────────────────────

export const BLESSING_CATALOG = [
  // Pair 1: Ebisu
  { id: 'bless_fisherman', name: 'Fisherman', tier: 1, effect: 'plus_deal_count',
    description: '+1 cards dealt across all deals (initial + pushes).' },
  { id: 'bless_ebisu', name: 'Ebisu', tier: 2, effect: 'plus_deal_count',
    requires: 'bless_fisherman',
    description: '+1 cards dealt across all deals (initial + pushes).' },

  // Pair 2: Daikokuten
  { id: 'bless_merchant', name: 'Merchant', tier: 1, effect: 'plus_shop_offering',
    description: '+1 item per shop section.' },
  { id: 'bless_daikokuten', name: 'Daikokuten', tier: 2, effect: 'plus_shop_offering',
    requires: 'bless_merchant',
    description: '+1 item per shop section.' },

  // Pair 3: Bishamonten
  { id: 'bless_warrior', name: 'Warrior', tier: 1, effect: 'plus_spirit_slot',
    description: '+1 spirit slot.' },
  { id: 'bless_bishamonten', name: 'Bishamonten', tier: 2, effect: 'plus_spirit_slot',
    requires: 'bless_warrior',
    description: '+1 spirit slot.' },

  // Pair 4: Benzaiten
  { id: 'bless_artist', name: 'Artist', tier: 1, effect: 'plus_consumable_slot',
    description: '+1 consumable slot.' },
  { id: 'bless_benzaiten', name: 'Benzaiten', tier: 2, effect: 'plus_consumable_slot',
    requires: 'bless_artist',
    description: '+1 consumable slot.' },

  // Pair 5: Fukurokuju
  { id: 'bless_scholar', name: 'Scholar', tier: 1, effect: 'plus_hand_size',
    description: '+1 hand size capacity.' },
  { id: 'bless_fukurokuju', name: 'Fukurokuju', tier: 2, effect: 'plus_hand_size',
    requires: 'bless_scholar',
    description: '+1 hand size capacity.' },

  // Pair 6: Jurojin
  { id: 'bless_elder', name: 'Elder', tier: 1, effect: 'plus_field_slot',
    description: '+1 field slot.' },
  { id: 'bless_jurojin', name: 'Jur\u014Djin', tier: 2, effect: 'plus_field_slot',
    requires: 'bless_elder',
    description: '+1 field slot.' },

  // Pair 7: Hotei
  { id: 'bless_comedian', name: 'Comedian', tier: 1, effect: 'minus_yaku_threshold',
    description: '-1 to all yaku thresholds (floored at 1).' },
  { id: 'bless_hotei', name: 'Hotei', tier: 2, effect: 'minus_yaku_threshold',
    requires: 'bless_comedian',
    description: '-1 to all yaku thresholds (floored at 1).' },
];

export const getBlessingDef = (id) => BLESSING_CATALOG.find(b => b.id === id);
