// Castles — passive auto-battler biomes. Every 10 stages = a new Castle.
// Each Castle has a Lord (mega boss) on the 10th stage.
// Players auto-grind a stage until they hit "Fight Boss" to advance.
//
// The Castle list loops after the last entry, with scaling difficulty.

export const CASTLES = [
  {
    id: "grasslands",
    name: "Grasslands Castle",
    lord: "Wolf Tyrant",
    enemy: "🐺",
    bossEmoji: "🐺",
    background: "grass-bg",
    particleClass: "particle-leaf",
    accent: "#5cff9b",
  },
  {
    id: "desert",
    name: "Desert Castle",
    lord: "Scorpion King",
    enemy: "🦂",
    bossEmoji: "🦂",
    background: "desert-bg",
    particleClass: "particle-sand",
    accent: "#ffb24d",
  },
  {
    id: "frozen",
    name: "Frozen Castle",
    lord: "Frost Sovereign",
    enemy: "❄️",
    bossEmoji: "🧊",
    background: "ice-bg",
    particleClass: "particle-snow",
    accent: "#7adfff",
  },
  {
    id: "inferno",
    name: "Inferno Castle",
    lord: "Flame Lord",
    enemy: "🔥",
    bossEmoji: "👹",
    background: "fire-bg",
    particleClass: "particle-ember",
    accent: "#ff6a3d",
  },
  {
    id: "shadow",
    name: "Shadow Castle",
    lord: "Eye of the Abyss",
    enemy: "👁️",
    bossEmoji: "🕷️",
    background: "shadow-bg",
    particleClass: "particle-shadow",
    accent: "#b873ff",
  },
];

// Returns castle for a given stage (1-indexed), looping the list.
export function getCastleForStage(stage) {
  const index = Math.floor((stage - 1) / 10) % CASTLES.length;
  return CASTLES[index];
}

// The 10th stage of every castle is the Castle Lord fight.
export function isCastleLordStage(stage) {
  return stage % 10 === 0;
}

// HP scaling for a regular monster vs the Castle Lord.
// Players must defeat the boss to advance — the boss is intentionally a wall.
export function getStageBossHp(stage) {
  if (isCastleLordStage(stage)) {
    // Castle Lord: ~5x a normal stage monster
    return 500 + stage * 120;
  }
  // Regular stage boss
  return 60 + stage * 35;
}

// Reward for defeating the stage boss.
export function getStageReward(stage) {
  const base = isCastleLordStage(stage) ? stage * 90 : stage * 22;
  const crystalDrop = isCastleLordStage(stage) ? 5 + Math.floor(stage / 10) : 0;
  return { gold: base, crystals: crystalDrop };
}

// Passive gold/min generated while idling on a stage.
// This is the "auto-battler" income — independent of boss progression.
export function getPassiveGoldPerMin(stage, totalDamage) {
  return Math.max(8, Math.floor(totalDamage * 1.5 + stage * 6));
}
