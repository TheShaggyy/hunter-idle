// Awakening — the prestige loop.
// Each awakening lifts your rank ceiling AND grants System Coins to spend on
// permanent upgrades. Beyond awakening 6 (Monarch), Monarch+N grants infinite
// power multipliers but no further content gates.
//
// Design intent:
//   - First run (awakening 0) caps at D-Rank. The player WILL hit this wall.
//     The wall is the reveal — it teaches them awakening exists.
//   - Each subsequent awakening lifts the ceiling one rank.
//   - Past Monarch (awakening 6), "Monarch+N" stacks pure multipliers infinitely.
//   - Hunters and System Coins carry over. Everything else resets.

import { RANKS } from "./ranks.js";

// Rank ceiling per awakening level. Index = awakening level.
// Awakening 0 → D, 1 → C, 2 → B, 3 → A, 4 → S, 5 → National, 6 → Monarch.
// Beyond 6, ceiling stays at Monarch but Monarch+N flavor titles unlock.
export const CEILING_BY_AWAKENING = ["D", "C", "B", "A", "S", "NATIONAL", "MONARCH"];

// Returns the rank ID the player is capped at given their awakening level.
export function getRankCeiling(awakeningLevel) {
  const idx = Math.min(awakeningLevel, CEILING_BY_AWAKENING.length - 1);
  return CEILING_BY_AWAKENING[idx];
}

// True if the player has reached the Monarch+ infinite tail.
export function isInMonarchPlusTail(awakeningLevel) {
  return awakeningLevel >= CEILING_BY_AWAKENING.length;
}

// Returns a flavor title for the player's current awakening state.
// Pre-Monarch: just their rank. At Monarch+N: themed titles.
export function getAwakeningTitle(awakeningLevel) {
  if (awakeningLevel < CEILING_BY_AWAKENING.length) {
    return `Awakening ${awakeningLevel}`;
  }
  // Monarch+N tail. Themed names cycle, but the +N keeps incrementing.
  const tailIdx = awakeningLevel - CEILING_BY_AWAKENING.length;
  const themes = ["Crimson", "Void", "Eclipse", "Sovereign", "Primal", "Eternal"];
  const themeName = themes[tailIdx % themes.length];
  return `${themeName} Monarch +${tailIdx + 1}`;
}

// ----- Awakening eligibility -----

// To awaken, the player must have reached the rank at their current ceiling
// AND cleared at least the stage requirement of the NEXT rank (so they're
// actually pushing past the wall, not just touching it).
//
// Edge case: at the Monarch+N tail there's no "next rank stage" — instead
// we require the player to have been at Monarch for at least 50 stages past
// the Monarch threshold (gives a meaningful prestige floor at infinite levels).
export function canAwaken(state) {
  const ceiling = getRankCeiling(state.awakeningLevel);
  if (state.rank !== ceiling) return false;

  // Find the requirements that come AFTER the current ceiling.
  const ceilingIdx = RANKS.findIndex((r) => r.id === ceiling);
  const nextRank = RANKS[ceilingIdx + 1];

  if (nextRank) {
    return state.stage >= nextRank.stageRequired;
  }

  // Monarch+ tail: require stage >= Monarch stageReq + 50 per awakening above 6.
  const monarchRank = RANKS[RANKS.length - 1];
  const tailLevel = state.awakeningLevel - (CEILING_BY_AWAKENING.length - 1);
  const requiredStage = monarchRank.stageRequired + 50 * Math.max(1, tailLevel);
  return state.stage >= requiredStage;
}

// Tells the player what they still need to awaken.
export function getAwakeningRequirements(state) {
  const ceiling = getRankCeiling(state.awakeningLevel);
  const ceilingIdx = RANKS.findIndex((r) => r.id === ceiling);
  const nextRank = RANKS[ceilingIdx + 1];

  if (nextRank) {
    return {
      ceilingRank: ceiling,
      requiredStage: nextRank.stageRequired,
      stageOk: state.stage >= nextRank.stageRequired,
      rankOk: state.rank === ceiling,
    };
  }

  // Tail
  const monarchRank = RANKS[RANKS.length - 1];
  const tailLevel = state.awakeningLevel - (CEILING_BY_AWAKENING.length - 1);
  const requiredStage = monarchRank.stageRequired + 50 * Math.max(1, tailLevel);
  return {
    ceilingRank: ceiling,
    requiredStage,
    stageOk: state.stage >= requiredStage,
    rankOk: state.rank === ceiling,
  };
}

// ----- System Coin earnings -----

// Calculate System Coins earned by awakening with the current state.
// Formula favors pushing further: log-scaled stage bonus, big bonus for ceiling reach,
// modest bonus for Legendary hunters.
export function calculateSystemCoinsEarned(state) {
  // Base: 50 coins for awakening at all
  let coins = 50;

  // Stage bonus — log10 scaled, with high stages giving meaningful boost
  coins += Math.floor(Math.log10(Math.max(10, state.stage)) * 30);

  // Bonus for each awakening level — past runs scale gently
  coins += state.awakeningLevel * 25;

  // Bonus for Legendary hunters in roster (encourages building the team)
  const legendaryCount = (state.hunters || []).filter(
    (h) => h.rarity === "Legendary"
  ).length;
  coins += legendaryCount * 15;

  // Monarch+ tail bonus
  if (isInMonarchPlusTail(state.awakeningLevel)) {
    coins = Math.floor(coins * 1.5);
  }

  return coins;
}

// ----- Permanent upgrade tree -----

// Each upgrade defines: id, name, description, max level, cost curve, effect curve.
// Effects compound MULTIPLICATIVELY across awakenings — pure permanent power growth.
export const PERMANENT_UPGRADES = [
  {
    id: "goldMult",
    name: "Greed of the System",
    icon: "🪙",
    description: "Permanent gold income multiplier.",
    maxLevel: 50,
    costAtLevel: (lvl) => Math.floor(20 * Math.pow(1.15, lvl)),
    effectAtLevel: (lvl) => 1 + lvl * 0.05, // 1.0 → 3.5 at max
    formatEffect: (lvl) => `+${(lvl * 5)}% Gold`,
  },
  {
    id: "crystalMult",
    name: "Mana Affinity",
    icon: "💎",
    description: "Permanent crystal drop multiplier.",
    maxLevel: 30,
    costAtLevel: (lvl) => Math.floor(40 * Math.pow(1.20, lvl)),
    effectAtLevel: (lvl) => 1 + lvl * 0.03, // 1.0 → 1.9 at max
    formatEffect: (lvl) => `+${(lvl * 3)}% Crystals`,
  },
  {
    id: "critChance",
    name: "Sharpened Instincts",
    icon: "🎯",
    description: "Adds to base crit chance.",
    maxLevel: 30,
    costAtLevel: (lvl) => Math.floor(30 * Math.pow(1.18, lvl)),
    effectAtLevel: (lvl) => lvl * 0.005, // additive: +0% → +15% at max (added to 15% base)
    formatEffect: (lvl) => `+${(lvl * 0.5).toFixed(1)}% Crit`,
  },
  {
    id: "dropRate",
    name: "Loot Sense",
    icon: "📦",
    description: "Permanent equipment drop rate boost.",
    maxLevel: 25,
    costAtLevel: (lvl) => Math.floor(50 * Math.pow(1.22, lvl)),
    effectAtLevel: (lvl) => lvl * 0.01, // additive: 0 → +25% at max
    formatEffect: (lvl) => `+${lvl}% Drop Rate`,
  },
  {
    id: "staminaCap",
    name: "Mana Reserves",
    icon: "⚡",
    description: "Permanent stamina cap increase.",
    maxLevel: 40,
    costAtLevel: (lvl) => Math.floor(25 * Math.pow(1.16, lvl)),
    effectAtLevel: (lvl) => lvl * 5, // additive: +0 → +200 at max
    formatEffect: (lvl) => `+${lvl * 5} Max Stamina`,
  },
  {
    id: "startingGold",
    name: "Inheritance",
    icon: "💰",
    description: "Gold you start with after each awakening.",
    maxLevel: 20,
    costAtLevel: (lvl) => Math.floor(60 * Math.pow(1.25, lvl)),
    effectAtLevel: (lvl) => lvl * 500, // 0 → 10000 starting gold
    formatEffect: (lvl) => `+${(lvl * 500).toLocaleString()} Gold on awaken`,
  },
];

// Empty starting upgrades map.
export function getInitialPermanentUpgrades() {
  const obj = {};
  for (const u of PERMANENT_UPGRADES) obj[u.id] = 0;
  return obj;
}

// Helpers to read upgrade values by id (defensive against missing fields).
export function getUpgradeLevel(permanentUpgrades, id) {
  return permanentUpgrades?.[id] ?? 0;
}

export function getUpgradeEffect(permanentUpgrades, id) {
  const upgrade = PERMANENT_UPGRADES.find((u) => u.id === id);
  if (!upgrade) return 0;
  return upgrade.effectAtLevel(getUpgradeLevel(permanentUpgrades, id));
}
