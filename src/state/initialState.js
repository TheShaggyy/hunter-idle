// Single source of truth for game state. Versioned so future schema changes
// can migrate old saves without wiping players.

import { getInitialPermanentUpgrades } from "../data/awakening.js";
import { getInitialSkills } from "../data/skills.js";
import { getInitialQuestState } from "../data/quests.js";

export const SAVE_VERSION = 4;
export const SAVE_KEY = "hunterIdleSave";

export function getInitialState() {
  return {
    version: SAVE_VERSION,

    // Currencies
    gold: 0,
    crystals: 0, // Mana Crystals — gacha currency
    essence: 0, // Equipment upgrade currency
    systemCoins: 0, // Awakening prestige currency

    // Stamina (for Gates + Special Dungeons)
    stamina: 100,
    staminaUpdatedAt: Date.now(),

    // Castle progression (passive idle)
    stage: 1,
    onBossFight: false, // Has player clicked "Fight Boss" on current stage?
    enemyHp: 0, // Lazily set by combat loop
    enemyMaxHp: 0,

    // Main hunter
    damageLevel: 0,
    vitalityLevel: 0, // Gold-sink upgrade for max HP. See systems/health.js.

    // Roster
    hunters: [],
    pity: { pullsSinceEpic: 0, pullsSinceLegendary: 0 },
    totalPulls: 0,

    // Free starter pull — granted on first reach of Castle 2 (stage 11).
    freeStarterPullAvailable: false,
    freeStarterPullClaimed: false,
    huntersUnlocked: false,

    // Rank — starts at F. Capped by awakening ceiling (see data/awakening.js).
    rank: "F",

    // Awakening / prestige
    awakeningLevel: 0, // 0 = first run, ceiling = D
    awakeningCount: 0, // lifetime count
    lastAwakeningCoinsEarned: 0, // for the awakening-complete celebration
    permanentUpgrades: getInitialPermanentUpgrades(),
    awakeningRevealed: false, // true once player has seen the awakening tutorial reveal

    // Skills
    skills: getInitialSkills(),

    // Rank-Up Dungeon state (transient mini-fight)
    rankUpInProgress: false,
    rankUpEnemyHp: 0,
    rankUpEnemyMaxHp: 0,
    rankUpStartedAt: 0,
    rankUpTimeLimit: 90, // seconds

    // Castle Lord: first attempt within any rolling hour is free; subsequent
    // attempts cost 25 stamina. Tracks the timestamp of the last FREE attempt
    // consumed. 0 = no free attempts used yet → next attempt is free.
    lastFreeLordAttemptAt: 0,

    // Equipment
    inventory: [], // [{ instanceId, templateId, name, slot, tier, level, emoji }]
    equipped: { weapon: null, armor: null, accessory: null },

    // Affiliation: "none" | "association" | "guild"
    affiliation: "none",
    guildName: null,

    // Daily flags (used to reset Training Grounds, etc.)
    dailyResetAt: getNextDailyResetTs(),
    trainingDoneToday: false,
    essenceTrialsToday: 0,

    // Daily quests
    quests: getInitialQuestState(),

    // Bookkeeping
    lastPlayed: Date.now(),
    createdAt: Date.now(),
  };
}

// Daily reset at midnight local time.
export function getNextDailyResetTs() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// Migrate an older save to the current version. Returns a fresh state with carryover.
export function migrate(oldSave) {
  if (!oldSave) return getInitialState();

  // Pre-versioned saves: carry nothing per user's wipe-OK decision.
  if (!oldSave.version) {
    return getInitialState();
  }

  let save = oldSave;

  // v1 → v2: add hunters-unlocked tracking and free starter pull fields.
  if (save.version === 1) {
    save = {
      ...save,
      version: 2,
      freeStarterPullAvailable: false,
      freeStarterPullClaimed: true, // don't gift to returning players
      huntersUnlocked: save.stage >= 11,
    };
  }

  // v2 → v3: add awakening, skills, quests, rank-up dungeon state.
  if (save.version === 2) {
    save = {
      ...save,
      version: 3,
      systemCoins: 0,
      awakeningLevel: 0,
      awakeningCount: 0,
      lastAwakeningCoinsEarned: 0,
      permanentUpgrades: getInitialPermanentUpgrades(),
      awakeningRevealed: false,
      skills: getInitialSkills(),
      rankUpInProgress: false,
      rankUpEnemyHp: 0,
      rankUpEnemyMaxHp: 0,
      rankUpStartedAt: 0,
      rankUpTimeLimit: 90,
      quests: getInitialQuestState(),
    };
  }

  // v3 → v4: add player HP system.
  // NOTE: armor stats also changed in v4 — they now grant HP + Defense
  // instead of feeding into damage. Existing armor items in inventory
  // keep their { templateId, tier, level } unchanged; the data file
  // reinterprets them. Players will see their damage drop slightly and
  // their HP/Defense rise. No data is lost.
  if (save.version === 3) {
    save = {
      ...save,
      version: 4,
      vitalityLevel: 0,
      lastFreeLordAttemptAt: 0,
    };
  }

  if (save.version === SAVE_VERSION) {
    // Same version — merge with defaults to backfill any new fields added since save was written
    return { ...getInitialState(), ...save };
  }

  // Unknown future version — start fresh.
  return getInitialState();
}