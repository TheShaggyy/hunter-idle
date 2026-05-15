// Awakening system — performs the prestige reset.
// Pure-ish function: takes current state, returns new state. Awarded System Coins
// and starting gold (from Inheritance upgrade) are applied here.

import {
  calculateSystemCoinsEarned,
  getUpgradeEffect,
} from "../data/awakening.js";
import { getNextDailyResetTs } from "../state/initialState.js";

// Performs an awakening. Caller is expected to have already validated canAwaken(state).
//
// Carries over:
//   - hunters (full roster + levels — paying-player safe)
//   - pity counters + totalPulls (so 89 pulls of pity isn't wasted)
//   - systemCoins (the new currency, accumulated)
//   - permanentUpgrades (the upgrade tree)
//   - awakeningLevel (incremented)
//   - affiliation
//   - quests/daily reset state (don't punish someone awakening mid-day)
//   - huntersUnlocked + freeStarterPullClaimed (don't re-tutorial)
//   - skills + skill levels (skills carry over)
//   - awakeningCount (lifetime count, for achievements)
//
// Resets:
//   - stage → 1
//   - rank → F
//   - gold/crystals/essence → starting amounts (Inheritance upgrade contributes gold)
//   - inventory + equipped → empty (gear is reset, salvage before awakening)
//   - main hunter damageLevel → 0
//   - enemy hp → fresh
//   - onBossFight → false
//   - stamina → full
//   - rankUpDungeon progress → cleared
export function performAwakening(state) {
  const coinsEarned = calculateSystemCoinsEarned(state);
  const startingGold = getUpgradeEffect(state.permanentUpgrades || {}, "startingGold");

  return {
    // Carry over
    version: state.version,
    hunters: state.hunters || [],
    pity: state.pity || { pullsSinceEpic: 0, pullsSinceLegendary: 0 },
    totalPulls: state.totalPulls || 0,
    systemCoins: (state.systemCoins || 0) + coinsEarned,
    permanentUpgrades: state.permanentUpgrades || {},
    awakeningLevel: (state.awakeningLevel || 0) + 1,
    awakeningCount: (state.awakeningCount || 0) + 1,
    lastAwakeningCoinsEarned: coinsEarned,
    affiliation: state.affiliation || "none",
    guildName: state.guildName || null,
    huntersUnlocked: state.huntersUnlocked || false,
    freeStarterPullAvailable: false,
    freeStarterPullClaimed: state.freeStarterPullClaimed || false,
    skills: state.skills || {},
    quests: state.quests || null,
    dailyResetAt: state.dailyResetAt || getNextDailyResetTs(),
    trainingDoneToday: state.trainingDoneToday || false,
    essenceTrialsToday: state.essenceTrialsToday || 0,
    createdAt: state.createdAt || Date.now(),

    // Reset
    gold: startingGold,
    crystals: 0,
    essence: 0,
    stamina: 100,
    staminaUpdatedAt: Date.now(),
    stage: 1,
    onBossFight: false,
    enemyHp: 0,
    enemyMaxHp: 0,
    damageLevel: 0,
    rank: "F",
    inventory: [],
    equipped: { weapon: null, armor: null, accessory: null },

    // Bookkeeping
    lastPlayed: Date.now(),

    // Reset rank-up dungeon state if any was in progress
    rankUpInProgress: false,
    rankUpEnemyHp: 0,
    rankUpEnemyMaxHp: 0,
  };
}
