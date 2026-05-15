// Hunter Pool — the gacha summons.
// Each hunter has a rarity, a base stat profile, and a special trait.
// Dupes increase the hunter's level (ascension), boosting their damage.

export const HUNTER_POOL = [
  // COMMON (60% combined)
  { id: "jin", name: "Jin", rarity: "Common", baseDamage: 5, odds: 20, trait: "Quick striker" },
  { id: "mira", name: "Mira", rarity: "Common", baseDamage: 5, odds: 20, trait: "Steady aim" },
  { id: "tarek", name: "Tarek", rarity: "Common", baseDamage: 6, odds: 20, trait: "Tough hide" },

  // RARE (28% combined)
  { id: "kael", name: "Kael", rarity: "Rare", baseDamage: 14, odds: 14, trait: "Twin blades" },
  { id: "nyx", name: "Nyx", rarity: "Rare", baseDamage: 16, odds: 14, trait: "Shadow step" },

  // EPIC (10% combined)
  { id: "riven", name: "Riven", rarity: "Epic", baseDamage: 38, odds: 5, trait: "Storm caller" },
  { id: "vale", name: "Vale", rarity: "Epic", baseDamage: 42, odds: 5, trait: "Frost lance" },

  // LEGENDARY (2% combined)
  { id: "ashborn", name: "Ashborn", rarity: "Legendary", baseDamage: 100, odds: 1.5, trait: "Shadow Monarch — bonus dmg to bosses" },
  { id: "iri", name: "Iri", rarity: "Legendary", baseDamage: 95, odds: 0.5, trait: "Sun Empress — +Crystal drops" },
];

export const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];

export const RARITY_COLOR = {
  Common: "#9ca3af",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#ffd700",
};

// Summon costs.
export const SUMMON_COST = {
  single: { crystals: 30 },
  ten: { crystals: 270 }, // 10% discount for pulling 10
};

// Pity: a guaranteed Epic+ at 30 pulls, guaranteed Legendary at 90 pulls.
export const PITY = {
  epicAt: 30,
  legendaryAt: 90,
};
