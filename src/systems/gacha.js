import { HUNTER_POOL, PITY } from "../data/hunters.js";

// Roll a single hunter from the pool, factoring pity counters.
// pity = { pullsSinceEpic, pullsSinceLegendary }
// Returns { hunter, updatedPity }
export function rollHunter(pity, rng = Math.random) {
  const pullsSinceLegendary = pity.pullsSinceLegendary + 1;
  const pullsSinceEpic = pity.pullsSinceEpic + 1;

  // Hard pity: forced Legendary
  if (pullsSinceLegendary >= PITY.legendaryAt) {
    const legendaries = HUNTER_POOL.filter((h) => h.rarity === "Legendary");
    const picked = pickWeighted(legendaries, rng);
    return {
      hunter: picked,
      updatedPity: { pullsSinceEpic: 0, pullsSinceLegendary: 0 },
    };
  }

  // Soft pity: forced Epic+
  if (pullsSinceEpic >= PITY.epicAt) {
    const epicPlus = HUNTER_POOL.filter(
      (h) => h.rarity === "Epic" || h.rarity === "Legendary"
    );
    const picked = pickWeighted(epicPlus, rng);
    const isLegendary = picked.rarity === "Legendary";
    return {
      hunter: picked,
      updatedPity: {
        pullsSinceEpic: 0,
        pullsSinceLegendary: isLegendary ? 0 : pullsSinceLegendary,
      },
    };
  }

  // Standard roll
  const picked = pickWeighted(HUNTER_POOL, rng);
  return {
    hunter: picked,
    updatedPity: {
      pullsSinceEpic: picked.rarity === "Epic" || picked.rarity === "Legendary"
        ? 0
        : pullsSinceEpic,
      pullsSinceLegendary: picked.rarity === "Legendary" ? 0 : pullsSinceLegendary,
    },
  };
}

// Free starter pull — Common/Rare only. Doesn't touch pity counters.
// Used for the one-time gift when player first hits Castle 2.
export function rollStarterHunter(rng = Math.random) {
  const eligible = HUNTER_POOL.filter((h) => h.rarity === "Common" || h.rarity === "Rare");
  const picked = pickWeighted(eligible, rng);
  return { hunter: picked };
}

function pickWeighted(pool, rng) {
  const total = pool.reduce((s, h) => s + h.odds, 0);
  let roll = rng() * total;
  for (const h of pool) {
    roll -= h.odds;
    if (roll <= 0) return h;
  }
  return pool[0];
}

// Add a rolled hunter to the team. Dupes increase level.
export function addHunterToTeam(team, pulled) {
  const existing = team.find((h) => h.id === pulled.id);
  if (existing) {
    return team.map((h) =>
      h.id === pulled.id ? { ...h, level: h.level + 1 } : h
    );
  }
  return [...team, { ...pulled, level: 1 }];
}
