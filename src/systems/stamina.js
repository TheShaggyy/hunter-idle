// Stamina — gates how many Gate runs / Special Dungeons a player can do.
// Regenerates over time. Cap scales with rank + permanent upgrades.

export const STAMINA_REGEN_SEC = 360; // 1 stamina per 6 minutes (10/hour) at 1.0x

// Base max stamina, before permanent upgrades.
export function getBaseMaxStamina(rankIndex) {
  return 100 + rankIndex * 20; // F=100, MONARCH=260
}

// Effective max stamina including bonus from permanent upgrades.
// Callers should pass bonusCap from getAllBuffs().bonusStaminaCap.
export function getMaxStamina(rankIndex, bonusCap = 0) {
  return getBaseMaxStamina(rankIndex) + bonusCap;
}

export function tickStamina({ stamina, lastUpdatedAt, max, now = Date.now(), regenMult = 1.0 }) {
  if (stamina >= max) {
    return { stamina: max, lastUpdatedAt: now };
  }
  const effectiveInterval = Math.max(30, Math.floor(STAMINA_REGEN_SEC / Math.max(0.1, regenMult)));
  const secondsElapsed = Math.floor((now - lastUpdatedAt) / 1000);
  const regenerated = Math.floor(secondsElapsed / effectiveInterval);
  if (regenerated <= 0) {
    return { stamina, lastUpdatedAt };
  }
  const leftoverSec = secondsElapsed % effectiveInterval;
  const newStamina = Math.min(max, stamina + regenerated);
  const newTimestamp = now - leftoverSec * 1000;
  return { stamina: newStamina, lastUpdatedAt: newTimestamp };
}

export function getSecondsUntilNextStamina({ stamina, lastUpdatedAt, max, now = Date.now(), regenMult = 1.0 }) {
  if (stamina >= max) return null;
  const effectiveInterval = Math.max(30, Math.floor(STAMINA_REGEN_SEC / Math.max(0.1, regenMult)));
  const secondsElapsed = Math.floor((now - lastUpdatedAt) / 1000);
  return Math.max(0, effectiveInterval - (secondsElapsed % effectiveInterval));
}
