import { useEffect, useState, useCallback } from "react";
import { SAVE_KEY, getInitialState, migrate, getNextDailyResetTs } from "./initialState.js";
import { tickStamina, getMaxStamina } from "../systems/stamina.js";
import { getRankIndex } from "../data/ranks.js";
import { getCastleForStage, getStageBossHp, getPassiveGoldPerMin } from "../data/castles.js";
import { getTotalDamage } from "../systems/combat.js";
import { getAllBuffs } from "../systems/equipment.js";
import { getPlayerMaxHp } from "../systems/health.js";
import { rollDailyQuests, getInitialQuestState } from "../data/quests.js";
import { getRankCeiling } from "../data/awakening.js";

// Single source-of-truth state hook. Owns:
// - loading/saving to localStorage
// - autosave on changes
// - offline progress calculation (now buffed by skills/upgrades/equipment)
// - stamina regen on load
// - daily quest reset
// - awakening reset application

export function useGameState() {
  // _loaded is part of state on purpose. A ref guard was unreliable under
  // React StrictMode dev: the autosave effect could fire on the initial
  // default state before the load effect ran, clobbering the real save
  // (stage/gold/damage/etc. resetting to defaults on reload — see git log).
  // Putting the marker in state means the autosave snapshot itself knows
  // whether it's safe to persist. The flag is stripped before writing.
  const [state, setState] = useState(() => ({ ...getInitialState(), _loaded: false }));
  const [offlineReward, setOfflineReward] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const migrated = migrate(parsed);

        const now = Date.now();
        const secondsAway = Math.max(0, Math.floor((now - migrated.lastPlayed) / 1000));
        const minutesAway = Math.floor(secondsAway / 60);
        const cappedMinutes = Math.min(minutesAway, 480); // 8h offline cap

        const buffs = getAllBuffs(migrated, now);

        const baseDamage = 5 + migrated.damageLevel * 5;
        const teamDamage = (migrated.hunters || []).reduce(
          (sum, h) => sum + h.baseDamage * h.level,
          0
        );
        const totalDmg = baseDamage + teamDamage + buffs.equipDamage;
        const gpm = getPassiveGoldPerMin(migrated.stage, totalDmg);
        const earnedOfflineGold = Math.floor(cappedMinutes * gpm * buffs.goldMult);

        const rankIdx = getRankIndex(migrated.rank);
        const maxStam = getMaxStamina(rankIdx, buffs.bonusStaminaCap);
        const staminaResult = tickStamina({
          stamina: migrated.stamina,
          lastUpdatedAt: migrated.staminaUpdatedAt,
          max: maxStam,
          now,
          regenMult: buffs.staminaRegenMult,
        });

        // Daily reset check — also rolls fresh quests
        const dailyExpired = now >= migrated.dailyResetAt;
        let dailyFields = {};
        if (dailyExpired) {
          const newReset = getNextDailyResetTs();
          dailyFields = {
            dailyResetAt: newReset,
            trainingDoneToday: false,
            essenceTrialsToday: 0,
            quests: {
              counters: {
                bossesKilled: 0,
                gatesCleared: 0,
                hunterSummons: 0,
                equipUpgrades: 0,
                goldSpent: 0,
                stagesAdvanced: 0,
              },
              list: rollDailyQuests(newReset, migrated.awakeningLevel || 0),
            },
          };
        } else if (!migrated.quests || !migrated.quests.list || migrated.quests.list.length === 0) {
          // Quests never rolled — roll for today's window.
          dailyFields = {
            quests: {
              counters: (migrated.quests && migrated.quests.counters) || getInitialQuestState().counters,
              list: rollDailyQuests(migrated.dailyResetAt, migrated.awakeningLevel || 0),
            },
          };
        }

        const enemyMaxHp = getStageBossHp(migrated.stage);

        setState({
          ...migrated,
          gold: migrated.gold + earnedOfflineGold,
          stamina: staminaResult.stamina,
          staminaUpdatedAt: staminaResult.lastUpdatedAt,
          enemyHp: migrated.enemyHp > 0 ? migrated.enemyHp : enemyMaxHp,
          enemyMaxHp,
          ...dailyFields,
          _loaded: true,
        });

        if (earnedOfflineGold > 0) {
          setOfflineReward({ gold: earnedOfflineGold, minutes: cappedMinutes });
        }
      } catch (e) {
        console.error("Save load failed, starting fresh.", e);
        const fresh = getInitialState();
        // Roll today's quests
        fresh.quests = {
          counters: fresh.quests.counters,
          list: rollDailyQuests(fresh.dailyResetAt, 0),
        };
        setState({ ...fresh, _loaded: true });
      }
    } else {
      setState((s) => {
        const max = getStageBossHp(s.stage);
        return {
          ...s,
          enemyHp: max,
          enemyMaxHp: max,
          quests: {
            counters: s.quests.counters,
            list: rollDailyQuests(s.dailyResetAt, 0),
          },
          _loaded: true,
        };
      });
    }

    // hasLoaded ref pattern removed; _loaded is now part of state.
  }, []);

  useEffect(() => {
    // Don't persist until the load effect has explicitly marked state as
    // loaded. Using a state flag (not a ref) is critical: React StrictMode
    // in dev double-mounts effects, and a fresh useRef(false) on remount
    // can let a default-state autosave fire before load completes,
    // overwriting the real save. The state flag is part of the snapshot
    // itself, so this never races.
    if (!state._loaded) return;
    const { _loaded, ...persisted } = state;
    const toSave = { ...persisted, lastPlayed: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error("Autosave failed", e);
    }
  }, [state]);

  const update = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  const dismissOfflineReward = useCallback(() => setOfflineReward(null), []);

  const resetSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    const fresh = getInitialState();
    const max = getStageBossHp(fresh.stage);
    fresh.quests = {
      counters: fresh.quests.counters,
      list: rollDailyQuests(fresh.dailyResetAt, 0),
    };
    setState({ ...fresh, enemyHp: max, enemyMaxHp: max, _loaded: true });
  }, []);

  return { state, update, offlineReward, dismissOfflineReward, resetSave };
}

// Derived getters — convenient computed values used across screens.
export function deriveStats(state) {
  const buffs = getAllBuffs(state);
  const totalDamage = getTotalDamage({
    damageLevel: state.damageLevel,
    hunters: state.hunters,
    equipDamage: buffs.equipDamage,
  });
  const rankIdx = getRankIndex(state.rank);
  const maxStamina = getMaxStamina(rankIdx, buffs.bonusStaminaCap);
  const castle = getCastleForStage(state.stage);
  const passiveGoldPerMin = Math.floor(
    getPassiveGoldPerMin(state.stage, totalDamage) * buffs.goldMult
  );
  const associationPower = totalDamage + state.stage * 4 + state.hunters.length * 12;
  const rankCeiling = getRankCeiling(state.awakeningLevel || 0);

  // HP/Defense are per-encounter values (no persistent player HP),
  // but max-HP and defense ARE derived so we expose them for HUD use.
  const playerMaxHp = getPlayerMaxHp(state, buffs.equipHpBonus);
  const playerDefense = buffs.equipDefense;

  return {
    totalDamage,
    rankIdx,
    maxStamina,
    castle,
    passiveGoldPerMin,
    associationPower,
    buffs,
    rankCeiling,
    playerMaxHp,
    playerDefense,
  };
}