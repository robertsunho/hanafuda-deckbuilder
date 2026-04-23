// ─────────────────────────────────────────────────────────────────────────────
// hexagrams.js — All 64 I Ching hexagram definitions
//
// Each hexagram is a run-level modifier acquired at run start by coin throw.
// lines[] is bottom-to-top, 1 = yang (solid), 0 = yin (broken).
// sortOrder reflects internal V5 display ordering (not the King Wen sequence).
//
// Hexagram #2 (Kūn / Receptive Earth) is the default "no effect" hexagram
// used on the player's very first run before any hexagram has been unlocked.
// ─────────────────────────────────────────────────────────────────────────────

const _ALL = [

  // ── Double trigrams (8) ────────────────────────────────────────────────────

  {
    id: 'hex_51', number: 51, sortOrder: 1,
    chineseName: 'Zhèn', chineseCharacter: '震', englishName: 'Arousing Thunder',
    category: 'double_trigram', effect: 'deck_flip_revealed',
    description: 'All deck cards are revealed face-up. Matches become strategic — opponents know exactly what you will draw.',
    lines: [1,0,0,1,0,0],
  },
  {
    id: 'hex_52', number: 52, sortOrder: 2,
    chineseName: 'Gèn', chineseCharacter: '艮', englishName: 'Keeping Still',
    category: 'double_trigram', effect: 'yaku_ends_round',
    description: 'Completing any yaku immediately ends the round and triggers scoring. Rounds are shorter and more decisive.',
    lines: [0,0,1,0,0,1],
  },
  {
    id: 'hex_58', number: 58, sortOrder: 3,
    chineseName: 'Duì', chineseCharacter: '兌', englishName: 'Joyous Lake',
    category: 'double_trigram', effect: 'play_two_cards',
    description: 'You must play two hand cards per turn instead of one. Both are played before the deck flips.',
    lines: [1,1,0,1,1,0],
  },
  {
    id: 'hex_29', number: 29, sortOrder: 4,
    chineseName: 'Kǎn', chineseCharacter: '坎', englishName: 'Abysmal Water',
    category: 'double_trigram', effect: 'match_by_rank',
    description: 'Cards match by type (bright/animal/ribbon/plain) rather than by month. Completely changes capture logic.',
    lines: [0,1,0,0,1,0],
  },
  {
    id: 'hex_01', number: 1, sortOrder: 5,
    chineseName: 'Qián', chineseCharacter: '乾', englishName: 'Creative Heaven',
    category: 'double_trigram', effect: 'score_field_at_round_end',
    description: 'Score field contents at round end. Captures remove cards from scoring — captures become detrimental.',
    lines: [1,1,1,1,1,1],
  },
  {
    id: 'hex_57', number: 57, sortOrder: 6,
    chineseName: 'Xùn', chineseCharacter: '巽', englishName: 'Gentle Wind',
    category: 'double_trigram', effect: 'match_by_adjacent_month',
    description: 'Cards also match with the months directly before and after them (wrap-around at Jan/Dec).',
    lines: [0,1,1,0,1,1],
  },
  {
    id: 'hex_02', number: 2, sortOrder: 7,
    chineseName: 'Kūn', chineseCharacter: '坤', englishName: 'Receptive Earth',
    category: 'double_trigram', effect: 'no_effect',
    description: 'No modifier. The run proceeds normally. Default hexagram for first-time players.',
    lines: [0,0,0,0,0,0],
  },
  {
    id: 'hex_30', number: 30, sortOrder: 8,
    chineseName: 'Lí', chineseCharacter: '離', englishName: 'Clinging Fire',
    category: 'double_trigram', effect: 'one_yaku_disabled',
    description: 'One randomly selected yaku is disabled for the entire run. Determined at run start.',
    lines: [1,0,1,1,0,1],
  },

  // ── Individual axis (4) ────────────────────────────────────────────────────

  {
    id: 'hex_09', number: 9, sortOrder: 9,
    chineseName: 'Xiǎo Xù', chineseCharacter: '小畜', englishName: 'Small Taming',
    category: 'axis_individual', effect: 'boost_air',
    description: 'Air-axis cards (Sky months: Mar, Jun, Sep, Dec) score ×2 points.',
    lines: [1,1,1,0,1,1],
  },
  {
    id: 'hex_19', number: 19, sortOrder: 10,
    chineseName: 'Lín', chineseCharacter: '臨', englishName: 'Approach',
    category: 'axis_individual', effect: 'boost_land',
    description: 'Land-axis cards (Earth months: Jan, Apr, Jul, Oct) score ×2 points.',
    lines: [1,1,0,0,0,0],
  },
  {
    id: 'hex_35', number: 35, sortOrder: 11,
    chineseName: 'Jìn', chineseCharacter: '晉', englishName: 'Progress',
    category: 'axis_individual', effect: 'boost_day',
    description: 'Day-axis cards (Feb, Mar, Apr, May, Jun, Jul) score ×2 points.',
    lines: [0,0,0,1,0,1],
  },
  {
    id: 'hex_36', number: 36, sortOrder: 12,
    chineseName: 'Míng Yí', chineseCharacter: '明夷', englishName: 'Darkening Light',
    category: 'axis_individual', effect: 'boost_night',
    description: 'Night-axis cards (Aug, Sep, Oct, Nov, Dec, Jan) score ×2 points.',
    lines: [1,0,1,0,0,0],
  },

  // ── Combined axis (4) ──────────────────────────────────────────────────────

  {
    id: 'hex_11', number: 11, sortOrder: 13,
    chineseName: 'Tài', chineseCharacter: '泰', englishName: 'Peace',
    category: 'axis_combined', effect: 'boost_yang',
    description: 'Yang cards (Air + Day axes) score ×2 points. Four months overlap both axes.',
    lines: [1,1,1,0,0,0],
  },
  {
    id: 'hex_12', number: 12, sortOrder: 14,
    chineseName: 'Pǐ', chineseCharacter: '否', englishName: 'Standstill',
    category: 'axis_combined', effect: 'boost_yin',
    description: 'Yin cards (Land + Night axes) score ×2 points. Four months overlap both axes.',
    lines: [0,0,0,1,1,1],
  },
  {
    id: 'hex_33', number: 33, sortOrder: 15,
    chineseName: 'Dùn', chineseCharacter: '遯', englishName: 'Retreat',
    category: 'axis_combined', effect: 'boost_space',
    description: 'Space cards (Air + Night axes) score ×2 points.',
    lines: [0,0,1,1,1,1],
  },
  {
    id: 'hex_34', number: 34, sortOrder: 16,
    chineseName: 'Dà Zhuàng', chineseCharacter: '大壯', englishName: 'Great Power',
    category: 'axis_combined', effect: 'boost_energy',
    description: 'Energy cards (Land + Day axes) score ×2 points.',
    lines: [1,1,1,1,0,0],
  },

  // ── Combined seasonal (4) ──────────────────────────────────────────────────

  {
    id: 'hex_56', number: 56, sortOrder: 17,
    chineseName: 'Lǚ', chineseCharacter: '旅', englishName: 'Wanderer',
    category: 'seasonal_combined', effect: 'boost_equinox',
    description: 'Equinox months (Mar, Sep) score ×3 points.',
    lines: [0,0,1,1,0,1],
  },
  {
    id: 'hex_55', number: 55, sortOrder: 18,
    chineseName: 'Fēng', chineseCharacter: '豐', englishName: 'Abundance',
    category: 'seasonal_combined', effect: 'boost_solstice',
    description: 'Solstice months (Jun, Dec) score ×3 points.',
    lines: [1,0,1,1,0,0],
  },
  {
    id: 'hex_42', number: 42, sortOrder: 19,
    chineseName: 'Yì', chineseCharacter: '益', englishName: 'Increase',
    category: 'seasonal_combined', effect: 'boost_tropic',
    description: 'Tropic months (Apr, May, Jul, Aug) score ×2.5 points.',
    lines: [1,0,0,0,1,1],
  },
  {
    id: 'hex_41', number: 41, sortOrder: 20,
    chineseName: 'Sǔn', chineseCharacter: '損', englishName: 'Decrease',
    category: 'seasonal_combined', effect: 'boost_arctic',
    description: 'Arctic months (Oct, Nov, Jan, Feb) score ×2.5 points.',
    lines: [1,1,0,0,0,1],
  },

  // ── Individual seasonal (4) ────────────────────────────────────────────────

  {
    id: 'hex_03', number: 3, sortOrder: 21,
    chineseName: 'Zhūn', chineseCharacter: '屯', englishName: 'Sprouting',
    category: 'seasonal_individual', effect: 'boost_spring',
    description: 'Spring cards (Jan, Feb, Mar) score ×2.5 points.',
    lines: [1,0,0,0,1,0],
  },
  {
    id: 'hex_47', number: 47, sortOrder: 22,
    chineseName: 'Kùn', chineseCharacter: '困', englishName: 'Oppression',
    category: 'seasonal_individual', effect: 'boost_summer',
    description: 'Summer cards (Apr, May, Jun) score ×2.5 points.',
    lines: [0,1,0,1,1,0],
  },
  {
    id: 'hex_18', number: 18, sortOrder: 23,
    chineseName: 'Gǔ', chineseCharacter: '蠱', englishName: 'Work on the Decayed',
    category: 'seasonal_individual', effect: 'boost_autumn',
    description: 'Autumn cards (Jul, Aug, Sep) score ×2.5 points.',
    lines: [0,1,1,0,0,1],
  },
  {
    id: 'hex_27', number: 27, sortOrder: 24,
    chineseName: 'Yí', chineseCharacter: '頤', englishName: 'Nourishment',
    category: 'seasonal_individual', effect: 'boost_winter',
    description: 'Winter cards (Oct, Nov, Dec) score ×2.5 points.',
    lines: [1,0,0,0,0,1],
  },

  // ── Rank (4) ───────────────────────────────────────────────────────────────

  {
    id: 'hex_14', number: 14, sortOrder: 25,
    chineseName: 'Dà Yǒu', chineseCharacter: '大有', englishName: 'Great Possession',
    category: 'rank', effect: 'boost_brights',
    description: 'Bright cards score ×3 points.',
    lines: [1,1,1,1,0,1],
  },
  {
    id: 'hex_13', number: 13, sortOrder: 26,
    chineseName: 'Tóng Rén', chineseCharacter: '同人', englishName: 'Fellowship',
    category: 'rank', effect: 'boost_animals',
    description: 'Animal cards score ×2.5 points.',
    lines: [1,0,1,1,1,1],
  },
  {
    id: 'hex_22', number: 22, sortOrder: 27,
    chineseName: 'Bì', chineseCharacter: '賁', englishName: 'Adorning',
    category: 'rank', effect: 'boost_ribbons',
    description: 'Ribbon cards score ×2 points.',
    lines: [1,0,1,0,0,1],
  },
  {
    id: 'hex_08', number: 8, sortOrder: 28,
    chineseName: 'Bǐ', chineseCharacter: '比', englishName: 'Holding Together',
    category: 'rank', effect: 'boost_plains',
    description: 'Plain cards score ×2 points.',
    lines: [0,0,0,0,1,0],
  },

  // ── Wu Xing cycle (5) ─────────────────────────────────────────────────────

  {
    id: 'hex_50', number: 50, sortOrder: 29,
    chineseName: 'Dǐng', chineseCharacter: '鼎', englishName: 'Cauldron',
    category: 'wuxing_cycle', effect: 'boost_wood',
    description: 'Wood-enhanced cards score ×2 points and apply their effects twice.',
    lines: [0,1,1,1,0,1],
  },
  {
    id: 'hex_49', number: 49, sortOrder: 30,
    chineseName: 'Gé', chineseCharacter: '革', englishName: 'Revolution',
    category: 'wuxing_cycle', effect: 'boost_fire',
    description: 'Fire-enhanced cards score ×2 points and apply their effects twice.',
    lines: [1,0,1,1,1,0],
  },
  {
    id: 'hex_15', number: 15, sortOrder: 31,
    chineseName: 'Qiān', chineseCharacter: '謙', englishName: 'Modesty',
    category: 'wuxing_cycle', effect: 'boost_earth',
    description: 'Earth-enhanced cards score ×2 points and apply their effects twice.',
    lines: [0,0,1,0,0,0],
  },
  {
    id: 'hex_43', number: 43, sortOrder: 32,
    chineseName: 'Guài', chineseCharacter: '夬', englishName: 'Breakthrough',
    category: 'wuxing_cycle', effect: 'boost_metal',
    description: 'Metal-enhanced cards score ×2 points and apply their effects twice.',
    lines: [1,1,1,1,1,0],
  },
  {
    id: 'hex_48', number: 48, sortOrder: 33,
    chineseName: 'Jǐng', chineseCharacter: '井', englishName: 'The Well',
    category: 'wuxing_cycle', effect: 'boost_water',
    description: 'Water-enhanced cards score ×2 points and apply their effects twice.',
    lines: [0,1,1,0,1,0],
  },

  // ── Push / flow (2) ───────────────────────────────────────────────────────

  {
    id: 'hex_64', number: 64, sortOrder: 34,
    chineseName: 'Wèi Jì', chineseCharacter: '未濟', englishName: 'Before Completion',
    category: 'push_flow', effect: 'volatile_flow',
    description: 'Flow doubles every time you push. Flow resets to 1.0 if you bank without pushing.',
    lines: [0,1,0,1,0,1],
  },
  {
    id: 'hex_63', number: 63, sortOrder: 35,
    chineseName: 'Jì Jì', chineseCharacter: '既濟', englishName: 'After Completion',
    category: 'push_flow', effect: 'stable_flow',
    description: 'Flow never decays between rounds. Your style base is locked at its current value permanently.',
    lines: [1,0,1,0,1,0],
  },

  // ── Style combo (2) ───────────────────────────────────────────────────────

  {
    id: 'hex_45', number: 45, sortOrder: 36,
    chineseName: 'Cuì', chineseCharacter: '萃', englishName: 'Gathering Together',
    category: 'style_combo', effect: 'style_ki_double',
    description: 'Style combos award double ki. Flow from combos is unchanged.',
    lines: [0,0,0,1,1,0],
  },
  {
    id: 'hex_46', number: 46, sortOrder: 37,
    chineseName: 'Shēng', chineseCharacter: '升', englishName: 'Pushing Upward',
    category: 'style_combo', effect: 'style_flow_double',
    description: 'Style combos award double flow. Ki from combos is unchanged.',
    lines: [0,1,1,0,0,0],
  },

  // ── Misc scoring (1) ──────────────────────────────────────────────────────

  {
    id: 'hex_61', number: 61, sortOrder: 38,
    chineseName: 'Zhōng Fú', chineseCharacter: '中孚', englishName: 'Inner Truth',
    category: 'misc_scoring', effect: 'balanced_scoring',
    description: 'Score is calculated as (base points) × (yaku mult) × (number of unique months captured). Additive and multiplicative spirits are removed.',
    lines: [1,1,0,0,1,1],
  },

  // ── Field / hand (4) ──────────────────────────────────────────────────────

  {
    id: 'hex_59', number: 59, sortOrder: 39,
    chineseName: 'Huàn', chineseCharacter: '渙', englishName: 'Dispersion',
    category: 'field_hand', effect: 'field_plus_hand_minus',
    description: 'Field starts with 10 slots. Hand size is reduced to 5 cards.',
    lines: [0,1,0,0,1,1],
  },
  {
    id: 'hex_60', number: 60, sortOrder: 40,
    chineseName: 'Jié', chineseCharacter: '節', englishName: 'Limitation',
    category: 'field_hand', effect: 'field_minus_hand_plus',
    description: 'Field starts with 6 slots. Hand size is increased to 9 cards.',
    lines: [1,1,0,0,1,0],
  },
  {
    id: 'hex_62', number: 62, sortOrder: 41,
    chineseName: 'Xiǎo Guò', chineseCharacter: '小過', englishName: 'Small Exceeding',
    category: 'field_hand', effect: 'field_plus_two_double_flip',
    description: 'Field starts with 10 slots. Each deck flip reveals 2 cards instead of 1.',
    lines: [0,0,1,1,0,0],
  },
  {
    id: 'hex_28', number: 28, sortOrder: 42,
    chineseName: 'Dà Guò', chineseCharacter: '大過', englishName: 'Great Exceeding',
    category: 'field_hand', effect: 'field_minus_two_threshold_minus',
    description: 'Field starts with 6 slots. All yaku thresholds are reduced by 1.',
    lines: [0,1,1,1,1,0],
  },

  // ── Spirits (4) ───────────────────────────────────────────────────────────

  {
    id: 'hex_26', number: 26, sortOrder: 43,
    chineseName: 'Dà Xù', chineseCharacter: '大畜', englishName: 'Great Accumulation',
    category: 'spirits', effect: 'spirit_plus_cards_minus',
    description: 'Start with +2 spirit slots. Start with 8 fewer cards in the deck.',
    lines: [1,1,1,0,0,1],
  },
  {
    id: 'hex_40', number: 40, sortOrder: 44,
    chineseName: 'Jiě', chineseCharacter: '解', englishName: 'Deliverance',
    category: 'spirits', effect: 'spirit_minus_cards_plus',
    description: 'Start with 2 fewer spirit slots. Start with 8 additional cards in the deck.',
    lines: [0,1,0,1,0,0],
  },
  {
    id: 'hex_32', number: 32, sortOrder: 45,
    chineseName: 'Héng', chineseCharacter: '恆', englishName: 'Persevering',
    category: 'spirits', effect: 'four_spirits_fire_twice',
    description: 'Spirit slots are limited to 4. Fire-enhanced cards trigger spirit effects twice.',
    lines: [0,1,1,1,0,0],
  },
  {
    id: 'hex_21', number: 21, sortOrder: 46,
    chineseName: 'Shì Kè', chineseCharacter: '噬嗑', englishName: 'Biting Through',
    category: 'spirits', effect: 'eight_spirits_graduated_tax',
    description: 'Spirit slots expand to 8. Each spirit beyond the 4th costs 2× as much ki to equip.',
    lines: [1,0,0,1,0,1],
  },

  // ── Deck composition (10) ─────────────────────────────────────────────────

  {
    id: 'hex_38', number: 38, sortOrder: 47,
    chineseName: 'Kuí', chineseCharacter: '睽', englishName: 'Polarising',
    category: 'deck_composition', effect: 'no_brights_plain_threshold_minus',
    description: 'Bright cards are removed from the deck. Kasu threshold reduced by 2.',
    lines: [1,1,0,1,0,1],
  },
  {
    id: 'hex_39', number: 39, sortOrder: 48,
    chineseName: 'Jiǎn', chineseCharacter: '蹇', englishName: 'Limping',
    category: 'deck_composition', effect: 'deck_36_field_plus',
    description: 'Deck is reduced to 36 cards (remove 3 random plain cards per month). Field gains +1 slot.',
    lines: [0,0,1,0,1,0],
  },
  {
    id: 'hex_20', number: 20, sortOrder: 49,
    chineseName: 'Guān', chineseCharacter: '觀', englishName: 'Contemplation',
    category: 'deck_composition', effect: 'deck_60_hand_plus',
    description: 'Deck is expanded to 60 cards (add 1 extra plain per month). Hand size increases by 1.',
    lines: [0,0,0,0,1,1],
  },
  {
    id: 'hex_23', number: 23, sortOrder: 50,
    chineseName: 'Bō', chineseCharacter: '剝', englishName: 'Stripping',
    category: 'deck_composition', effect: 'no_plains_double_others',
    description: 'All plain cards are removed from the deck. All other card types score double points.',
    lines: [0,0,0,0,0,1],
  },
  {
    id: 'hex_17', number: 17, sortOrder: 51,
    chineseName: 'Suí', chineseCharacter: '隨', englishName: 'Following',
    category: 'deck_composition', effect: 'animal_deck',
    description: 'Deck contains only animal cards (plus brights). Ribbons and plains are removed.',
    lines: [1,0,0,1,1,0],
  },
  {
    id: 'hex_31', number: 31, sortOrder: 52,
    chineseName: 'Xián', chineseCharacter: '咸', englishName: 'Conjoining',
    category: 'deck_composition', effect: 'ribbon_deck',
    description: 'Deck contains only ribbon cards (plus brights). Animals and plains are removed.',
    lines: [0,0,1,1,1,0],
  },
  {
    id: 'hex_25', number: 25, sortOrder: 53,
    chineseName: 'Wú Wàng', chineseCharacter: '無妄', englishName: 'Innocence',
    category: 'deck_composition', effect: 'day_deck',
    description: 'Deck contains only day-axis cards (Feb–Jul). Night-axis cards are removed.',
    lines: [1,0,0,1,1,1],
  },
  {
    id: 'hex_53', number: 53, sortOrder: 54,
    chineseName: 'Jiàn', chineseCharacter: '漸', englishName: 'Infiltrating',
    category: 'deck_composition', effect: 'night_deck',
    description: 'Deck contains only night-axis cards (Aug–Jan). Day-axis cards are removed.',
    lines: [0,0,1,0,1,1],
  },
  {
    id: 'hex_44', number: 44, sortOrder: 55,
    chineseName: 'Gòu', chineseCharacter: '姤', englishName: 'Coming to Meet',
    category: 'deck_composition', effect: 'air_deck',
    description: 'Deck contains only air-axis cards (Mar, Jun, Sep, Dec). Land-axis cards are removed.',
    lines: [0,1,1,1,1,1],
  },
  {
    id: 'hex_37', number: 37, sortOrder: 56,
    chineseName: 'Jiā Rén', chineseCharacter: '家人', englishName: 'The Family',
    category: 'deck_composition', effect: 'land_deck',
    description: 'Deck contains only land-axis cards (Jan, Apr, Jul, Oct). Air-axis cards are removed.',
    lines: [1,0,1,0,1,1],
  },

  // ── Economy (7) ───────────────────────────────────────────────────────────

  {
    id: 'hex_05', number: 5, sortOrder: 57,
    chineseName: 'Xū', chineseCharacter: '需', englishName: 'Waiting',
    category: 'economy', effect: 'no_hand_ki_double_interest',
    description: 'No ki from hand cards at round end. Ki interest rate is doubled.',
    lines: [1,1,1,0,1,0],
  },
  {
    id: 'hex_24', number: 24, sortOrder: 58,
    chineseName: 'Fù', chineseCharacter: '復', englishName: 'Returning',
    category: 'economy', effect: 'start_50_ki_no_income',
    description: 'Start the run with 50 ki. Earn no ki from any source during the run.',
    lines: [1,0,0,0,0,0],
  },
  {
    id: 'hex_07', number: 7, sortOrder: 59,
    chineseName: 'Shī', chineseCharacter: '師', englishName: 'Leading',
    category: 'economy', effect: 'plus_offerings_double_reroll',
    description: 'Shrine offerings increased by 2 each visit. Reroll cost is doubled.',
    lines: [0,1,0,0,0,0],
  },
  {
    id: 'hex_54', number: 54, sortOrder: 60,
    chineseName: 'Guī Mèi', chineseCharacter: '歸妹', englishName: 'Marrying Maiden',
    category: 'economy', effect: 'minus_offerings_discount',
    description: 'Shrine offers 1 fewer item each visit. All items cost 1 less ki.',
    lines: [1,1,0,1,0,0],
  },
  {
    id: 'hex_16', number: 16, sortOrder: 61,
    chineseName: 'Yù', chineseCharacter: '豫', englishName: 'Enthusiasm',
    category: 'economy', effect: 'no_banking_ki_plus_capture',
    description: 'Banking is disabled — you must push or let the round end. Each capture earns +3 ki.',
    lines: [0,0,0,1,0,0],
  },
  {
    id: 'hex_06', number: 6, sortOrder: 62,
    chineseName: 'Sòng', chineseCharacter: '訟', englishName: 'Conflict',
    category: 'economy', effect: 'push_ki_swing',
    description: 'Pushing earns +10 ki. Banking costs 5 ki. Push-heavy playstyle is heavily rewarded.',
    lines: [0,1,0,1,1,1],
  },
  {
    id: 'hex_10', number: 10, sortOrder: 63,
    chineseName: 'Lǚ', chineseCharacter: '履', englishName: 'Treading',
    category: 'economy', effect: 'price_increase_more_consumable_slots',
    description: 'All shop prices are increased by 2 ki. Consumable inventory expands to 5 slots.',
    lines: [1,1,0,1,1,1],
  },

  // ── Misc (1) ──────────────────────────────────────────────────────────────

  {
    id: 'hex_04', number: 4, sortOrder: 64,
    chineseName: 'Méng', chineseCharacter: '蒙', englishName: 'Youthful Folly',
    category: 'misc', effect: 'randomized_deck',
    description: 'Each round the deck is reshuffled from 48 randomly selected cards. Nothing is consistent.',
    lines: [0,1,0,0,0,1],
  },

];

// ── Lookup maps ───────────────────────────────────────────────────────────────

/** All 64 hexagrams keyed by their internal id ('hex_01' … 'hex_64'). */
export const HEXAGRAMS = Object.fromEntries(_ALL.map(h => [h.id, h]));

/** All 64 hexagrams keyed by their traditional King Wen number (1–64). */
export const HEXAGRAM_BY_NUMBER = Object.fromEntries(_ALL.map(h => [h.number, h]));

/** Look up a hexagram by internal id. Returns null if not found. */
export function getHexagram(id) {
  return HEXAGRAMS[id] ?? null;
}

/** Look up a hexagram by traditional I Ching number (1–64). Returns null if not found. */
export function getHexagramByNumber(num) {
  return HEXAGRAM_BY_NUMBER[num] ?? null;
}

/** All 64 entries as an ordered array (ascending sortOrder). */
export const HEXAGRAM_LIST = [..._ALL].sort((a, b) => a.sortOrder - b.sortOrder);

/** The default no-effect hexagram used on a player's first run. */
export const DEFAULT_HEXAGRAM = HEXAGRAM_BY_NUMBER[2]; // Kūn — no_effect
