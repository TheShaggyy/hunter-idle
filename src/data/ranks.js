// Hunter Rank progression — the spine of the game.
// Each rank unlocks higher gate tiers, gacha rate-ups, equipment caps.
// Rank-up requires clearing a "Rank-Up Dungeon" (special dungeon type) at the threshold.

export const RANKS = [
  { id: "F", name: "F-Rank", color: "#9ca3af", stageRequired: 1, powerRequired: 0 },
  { id: "E", name: "E-Rank", color: "#a3b18a", stageRequired: 15, powerRequired: 200 },
  { id: "D", name: "D-Rank", color: "#52b788", stageRequired: 35, powerRequired: 600 },
  { id: "C", name: "C-Rank", color: "#48cae4", stageRequired: 65, powerRequired: 1800 },
  { id: "B", name: "B-Rank", color: "#3b82f6", stageRequired: 110, powerRequired: 5000 },
  { id: "A", name: "A-Rank", color: "#a855f7", stageRequired: 175, powerRequired: 14000 },
  { id: "S", name: "S-Rank", color: "#ffd700", stageRequired: 260, powerRequired: 38000 },
  { id: "NATIONAL", name: "National Level", color: "#ff6b35", stageRequired: 370, powerRequired: 95000 },
  { id: "MONARCH", name: "Monarch", color: "#ff174f", stageRequired: 500, powerRequired: 250000 },
];

export function getRankById(id) {
  return RANKS.find((r) => r.id === id) || RANKS[0];
}

export function getRankIndex(id) {
  return RANKS.findIndex((r) => r.id === id);
}

// Determine the highest rank a player CAN currently hold based on stage + power.
// Players still have to clear the rank-up dungeon to actually advance.
// ceilingRankId (optional): if provided, the eligible rank will not exceed it.
//   This is how awakening clamps the rank ladder on a per-run basis.
export function getEligibleRank(stage, power, ceilingRankId = null) {
  const ceilingIdx = ceilingRankId
    ? RANKS.findIndex((r) => r.id === ceilingRankId)
    : RANKS.length - 1;

  let eligible = RANKS[0];
  for (let i = 0; i < RANKS.length; i++) {
    if (i > ceilingIdx) break;
    const rank = RANKS[i];
    if (stage >= rank.stageRequired && power >= rank.powerRequired) {
      eligible = rank;
    }
  }
  return eligible;
}
