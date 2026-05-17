// Active combat system: the "shape" of a portal fight + pure functions for
// starting one, applying victory/defeat side effects.
//
// The CombatPortal component (rendered at App level) reads state.activeCombat
// and runs the fight. When the fight ends, it calls applyVictory or
// applyDefeat here, which returns a state patch. The portal then clears
// activeCombat and dismisses itself.
//
// Why centralize side effects here instead of inside the portal:
//   - The portal is just a UI shell. It shouldn't know what "winning a
//     stage 10 castle lord fight" means in terms of stage advancement,
//     hunter unlocks, quest counters, etc.
//   - Different fight kinds (stageBoss, castleLord, gate, rankUp) all
//     have wildly different reward logic, but the portal renders them
//     all the same way. Keeping the differences in data, not UI, mirrors
//     the existing pattern (combat.js, equipment.js, etc.).

import {
  getCastleForStage,
  isCastleLordStage,
  getStageBossHp,
  getStageReward,
} from "../data/castles.js";
import { getEnemyAttack } from "./health.js";
import { incrementCounter } from "../data/quests.js";

// One free Castle Lord attempt per rolling hour. Subsequent attempts cost stamina.
export const LORD_FREE_COOLDOWN_MS = 60 * 60 * 1000;
export const LORD_STAMINA_COST = 25;

// Time limits per fight kind, in seconds.
export const FIGHT_TIME_LIMITS = {
  stageBoss: 60,
  castleLord: 90,
  // gate, rankUp come later
};

const CASTLE_2_STAGE = 11;
const LORD_THEME_COLOR = "#ff174f"; // Lords override castle accent — they're red, always.

// ---------- Start helpers ----------
// Each returns either { activeCombat } to splat into state, or { error } if not allowed.

// Stage boss fight. Free, no stamina cost, no preconditions beyond stage>=1.
export function startStageBossFight(state) {
  const stage = state.stage;
  const castle = getCastleForStage(stage);
  return {
    activeCombat: {
      kind: "stageBoss",
      enemyName: castle.lord, // e.g. "Wolf Tyrant" — we re-use the castle's named entity
      enemySprite: castle.bossEmoji,
      enemyMaxHp: getStageBossHp(stage),
      enemyAttack: getEnemyAttack({ stage, isLord: false }),
      timeLimitSec: FIGHT_TIME_LIMITS.stageBoss,
      themeColor: castle.accent,
      context: { stage },
    },
  };
}

// Castle Lord fight. May be free or cost stamina depending on the rolling hour.
// Caller should check `isLordAttemptFree(state)` to decide whether to charge stamina.
export function startCastleLordFight(state) {
  const stage = state.stage;
  const castle = getCastleForStage(stage);
  return {
    activeCombat: {
      kind: "castleLord",
      enemyName: castle.lord,
      enemySprite: castle.bossEmoji,
      enemyMaxHp: getStageBossHp(stage),
      enemyAttack: getEnemyAttack({ stage, isLord: true }),
      timeLimitSec: FIGHT_TIME_LIMITS.castleLord,
      themeColor: LORD_THEME_COLOR, // Lords are always blood-red, regardless of castle
      context: { stage, castleAccent: castle.accent }, // keep castle accent in case the UI wants it
    },
  };
}

// Is the next Castle Lord attempt free (within the rolling hour) or does it cost stamina?
export function isLordAttemptFree(state, now = Date.now()) {
  const last = state.lastFreeLordAttemptAt || 0;
  return now - last >= LORD_FREE_COOLDOWN_MS;
}

// How many ms until the next free Lord attempt? Returns 0 if free right now.
export function msUntilFreeLord(state, now = Date.now()) {
  const last = state.lastFreeLordAttemptAt || 0;
  if (now - last >= LORD_FREE_COOLDOWN_MS) return 0;
  return last + LORD_FREE_COOLDOWN_MS - now;
}

// ---------- Outcome handlers ----------
// Each takes (state, activeCombat) and returns a partial state patch to apply.
// Pure: no side effects, no Date.now() inside reward math.

// Apply victory rewards + progression for a finished fight.
export function applyVictory(state, activeCombat) {
  if (!activeCombat) return {};

  switch (activeCombat.kind) {
    case "stageBoss":
    case "castleLord": {
      const stage = activeCombat.context.stage;
      const reward = getStageReward(stage);
      const nextStage = stage + 1;
      const nextMaxHp = getStageBossHp(nextStage);

      // Apply buff multipliers using state.equipped → buffs. We don't import
      // getAllBuffs here to avoid a cycle; instead, callers should pass in
      // the buff multipliers if they want them applied. For now apply raw
      // rewards — the portal will re-apply multipliers before calling.
      // (See applyVictoryWithBuffs below.)
      const earnedGold = reward.gold;
      const earnedCrystals = reward.crystals;

      // Quest counters: boss killed + stage advanced
      const counters = state.quests?.counters || {};
      const questList = state.quests?.list || [];
      const bossInc = incrementCounter(counters, questList, "bossesKilled", 1);
      const stageInc = incrementCounter(bossInc.counters, bossInc.quests, "stagesAdvanced", 1);

      // Free starter pull if first time crossing into castle 2
      const justUnlockedHunters = !state.huntersUnlocked && nextStage >= CASTLE_2_STAGE;
      const grantFreeStarter = justUnlockedHunters && !state.freeStarterPullClaimed;

      return {
        gold: state.gold + earnedGold,
        crystals: state.crystals + earnedCrystals,
        stage: nextStage,
        onBossFight: false, // legacy flag — portal replaces it but keep clean
        enemyHp: nextMaxHp,
        enemyMaxHp: nextMaxHp,
        huntersUnlocked: state.huntersUnlocked || nextStage >= CASTLE_2_STAGE,
        freeStarterPullAvailable: grantFreeStarter ? true : state.freeStarterPullAvailable,
        quests: { counters: stageInc.counters, list: stageInc.quests },
        activeCombat: null,
        // Reward summary for the outcome card to display:
        _lastFightReward: { gold: earnedGold, crystals: earnedCrystals, advancedTo: nextStage },
      };
    }
    default:
      return { activeCombat: null };
  }
}

// Version that applies gold/crystal multipliers from buffs. Portal uses this.
export function applyVictoryWithBuffs(state, activeCombat, buffs) {
  const base = applyVictory(state, activeCombat);
  if (!base._lastFightReward) return base;

  const gold = Math.floor(base._lastFightReward.gold * (buffs.goldMult ?? 1));
  const crystals = Math.floor(base._lastFightReward.crystals * (buffs.crystalMult ?? 1));

  // Recompute gold/crystals on top of original state, not on top of the
  // already-incremented base (which used raw values). Subtract the raw bump
  // and add the buffed bump.
  return {
    ...base,
    gold: state.gold + gold,
    crystals: state.crystals + crystals,
    _lastFightReward: { ...base._lastFightReward, gold, crystals },
  };
}

// Apply defeat: clear the portal, no progression, no penalty (per design).
// Lord stamina was deducted at start; not refunded. Player can retry by
// reopening the portal.
export function applyDefeat(state, activeCombat /* eslint-disable-line no-unused-vars */, reason) {
  return {
    activeCombat: null,
    _lastFightReward: null,
    _lastFightDefeat: { reason: reason || "death" }, // 'death' | 'timeout'
    onBossFight: false,
    // Boss HP gets re-initialized when player next enters a fight; no need to touch enemyHp here.
  };
}