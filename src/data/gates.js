// Gates — the ACTIVE dungeon mode. Costs stamina, gives big rewards.
// Each gate tier is locked behind a Hunter Rank.
// Red Gates are the endgame, requiring Monarch rank.

export const GATE_TIERS = [
  {
    id: "F",
    name: "F-Gate",
    color: "#9ca3af",
    rankRequired: "F",
    staminaCost: 10,
    durationSec: 60,
    rewards: { goldMin: 200, goldMax: 400, crystalsMin: 1, crystalsMax: 3, essenceMin: 1, essenceMax: 2 },
    description: "Common monsters. A safe place to test your strength.",
  },
  {
    id: "E",
    name: "E-Gate",
    color: "#a3b18a",
    rankRequired: "E",
    staminaCost: 15,
    durationSec: 90,
    rewards: { goldMin: 500, goldMax: 900, crystalsMin: 2, crystalsMax: 5, essenceMin: 2, essenceMax: 4 },
    description: "Stronger foes. Better drops.",
  },
  {
    id: "D",
    name: "D-Gate",
    color: "#52b788",
    rankRequired: "D",
    staminaCost: 20,
    durationSec: 120,
    rewards: { goldMin: 1200, goldMax: 2200, crystalsMin: 4, crystalsMax: 8, essenceMin: 4, essenceMax: 8 },
    description: "Real danger begins here.",
  },
  {
    id: "C",
    name: "C-Gate",
    color: "#48cae4",
    rankRequired: "C",
    staminaCost: 25,
    durationSec: 150,
    rewards: { goldMin: 2800, goldMax: 5000, crystalsMin: 7, crystalsMax: 14, essenceMin: 8, essenceMax: 15 },
    description: "Mid-rank hunters' bread and butter.",
  },
  {
    id: "B",
    name: "B-Gate",
    color: "#3b82f6",
    rankRequired: "B",
    staminaCost: 30,
    durationSec: 180,
    rewards: { goldMin: 6000, goldMax: 11000, crystalsMin: 12, crystalsMax: 24, essenceMin: 15, essenceMax: 28 },
    description: "Elite hunters only. Equipment drops begin here.",
  },
  {
    id: "A",
    name: "A-Gate",
    color: "#a855f7",
    rankRequired: "A",
    staminaCost: 40,
    durationSec: 210,
    rewards: { goldMin: 14000, goldMax: 26000, crystalsMin: 20, crystalsMax: 40, essenceMin: 30, essenceMax: 55 },
    description: "Few return. Fewer thrive.",
  },
  {
    id: "S",
    name: "S-Gate",
    color: "#ffd700",
    rankRequired: "S",
    staminaCost: 50,
    durationSec: 240,
    rewards: { goldMin: 35000, goldMax: 65000, crystalsMin: 35, crystalsMax: 75, essenceMin: 60, essenceMax: 110 },
    description: "Only S-Ranks dare enter.",
  },
  {
    id: "NATIONAL",
    name: "National Gate",
    color: "#ff6b35",
    rankRequired: "NATIONAL",
    staminaCost: 70,
    durationSec: 300,
    rewards: { goldMin: 90000, goldMax: 170000, crystalsMin: 70, crystalsMax: 150, essenceMin: 130, essenceMax: 240 },
    description: "Pillars of nations have died here.",
  },
  {
    id: "RED",
    name: "Red Gate",
    color: "#ff174f",
    rankRequired: "MONARCH",
    staminaCost: 100,
    durationSec: 360,
    rewards: { goldMin: 250000, goldMax: 500000, crystalsMin: 200, crystalsMax: 400, essenceMin: 350, essenceMax: 700 },
    description: "Reality fractures. Few have survived. Monarchs only.",
  },
];

export function getGateById(id) {
  return GATE_TIERS.find((g) => g.id === id);
}

// Power recommended to clear a gate comfortably. Used for warnings, not blocking.
export function getRecommendedPower(gateId) {
  const tierIndex = GATE_TIERS.findIndex((g) => g.id === gateId);
  return [50, 250, 800, 2200, 6000, 16000, 42000, 105000, 280000][tierIndex] || 0;
}
