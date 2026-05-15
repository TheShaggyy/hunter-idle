// Special Dungeons — limited-use dungeons that drop unique resources.
// Three types so far:
//
// 1. TRAINING GROUNDS: 1/day, gives bonus EXP for hunters/main character.
// 2. RANK-UP DUNGEON: unlocked when player meets stage + power requirements for next rank.
//    Beating it advances the player's Hunter Rank.
// 3. ESSENCE TRIAL: score-based dungeon, higher score = more Essence (equipment upgrade currency).
//    1-3 entries per day depending on rank.

export const SPECIAL_DUNGEONS = {
  TRAINING_GROUNDS: {
    id: "training",
    name: "Training Grounds",
    description: "Daily personal training. Beat the timer for max EXP.",
    cooldownHours: 24,
    entriesPerDay: 1,
    icon: "🏯",
    color: "#ffd700",
  },
  RANK_UP: {
    id: "rank_up",
    name: "Rank-Up Dungeon",
    description: "Prove your strength to ascend to the next Hunter Rank.",
    cooldownHours: 0,
    entriesPerDay: -1, // unlimited retries until cleared
    icon: "🏆",
    color: "#ff174f",
  },
  ESSENCE_TRIAL: {
    id: "essence",
    name: "Essence Trial",
    description: "Score as high as you can. Bigger scores = better drops.",
    cooldownHours: 8, // 3 runs/day
    entriesPerDay: 3,
    icon: "💎",
    color: "#48cae4",
  },
};

// Training Grounds EXP reward — scales with current rank.
export function getTrainingExpReward(rankIndex) {
  return 100 * Math.pow(1.5, rankIndex);
}

// Essence Trial reward curve: score → essence dropped.
// Logarithmic so higher scores yield diminishing-but-still-good returns.
export function getEssenceTrialReward(score) {
  if (score <= 0) return 0;
  return Math.floor(Math.log10(score + 1) * 25);
}
