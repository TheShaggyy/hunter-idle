// Health, defense, mitigation, enemy damage, and Vitality upgrade math.
// All pure functions — single source of truth for "how much can I take, how
// hard do they hit?" Plug into the combat loop via getAllBuffs() in
// systems/equipment.js (which exposes equipHpBonus + equipDefense).
//
// Design intent (see chat history for full reasoning):
//   - Player max HP = rank floor + Vitality upgrade + armor bonus.
//     Armor DOMINATES at high tiers; ungear'd players hit a wall at ~stage 30.
//   - Defense uses a mitigation curve with stage scaling so it never trivializes
//     content. At any stage you can be useful, but raw def alone never makes
//     you immortal — caps at ~80%.
//   - Enemy damage scales with stage. Lords hit 2x. Gates scale by tier index.

import { getRankIndex, RANKS } from "../data/ranks.js";

// ---------- Player HP ----------

// Base HP floor per rank. F=200, E=300, D=400, ... MONARCH=1000.
// Idea: even with no gear, you survive the first few stage bosses while you
// learn the game. Without armor, you become paste around stage 30-40.
export function getBaseHp(rankId) {
  const rankIdx = Math.max(0, getRankIndex(rankId));
  return 200 + rankIdx * 100;
}

// Bonus HP from Vitality upgrade level. 25 HP per level.
// At level 50 (a reasonable mid-late investment): +1250 HP.
// At level 100 (whale-tier grind): +2500 HP.
export function getVitalityHpBonus(vitalityLevel) {
  return (vitalityLevel || 0) * 25;
}

// Master player max HP calc. Plug in buffs.equipHpBonus from getAllBuffs().
export function getPlayerMaxHp(state, equipHpBonus = 0) {
  return getBaseHp(state.rank) + getVitalityHpBonus(state.vitalityLevel) + equipHpBonus;
}

// Vitality upgrade cost curve. Slightly cheaper than damage so it stays a
// real choice when you have spare gold, not a tax.
export function getVitalityUpgradeCost(vitalityLevel) {
  return Math.floor(60 * Math.pow(1.17, vitalityLevel));
}

// ---------- Defense & mitigation ----------

// Mitigation curve: def / (def + 100 + stage*10). Caps at 80%.
//
// At stage 50, 200 defense → 200 / (200 + 600) = 25% mitigation.
// At stage 50, 1000 defense → 1000 / (1000 + 600) = 62.5% mitigation.
// At stage 500, 1000 defense → 1000 / (1000 + 5100) = 16.4% mitigation.
//
// The +stage*10 term means defense scales with you: you need to keep
// upgrading gear to stay relevant, not just stack one piece forever.
export function computeMitigation(defense, stage) {
  if (defense <= 0) return 0;
  const k = 100 + stage * 10;
  const raw = defense / (defense + k);
  return Math.min(0.80, raw);
}

// Apply mitigation to a single incoming hit. Floors at 1 so high-def players
// can't be perfectly immune — chip damage always lands.
export function computeIncomingDamage(rawDmg, defense, stage) {
  const mit = computeMitigation(defense, stage);
  return Math.max(1, Math.floor(rawDmg * (1 - mit)));
}

// ---------- Enemy damage ----------

// Enemy attack power per tick. Called by the combat loop when the enemy
// gets its swing in.
//
// Modes:
//   - Castle stage boss: scales linearly with stage. Lord = 2x.
//   - Gate enemy: scales with gate tier index (F=0, RED=8). Quadratic so Red
//     Gates are genuinely terrifying.
//   - Castle trash: not used (trash doesn't hit back in the idle loop).
//
// gateTierIdx is the index into GATE_TIERS (0–8). Pass null for castle fights.
export function getEnemyAttack({ stage, isLord = false, gateTierIdx = null }) {
  if (gateTierIdx != null) {
    // Gate scaling: F=10, E=34, D=70, C=118, B=178, A=250, S=334, NATIONAL=430, RED=538
    return 10 + gateTierIdx * 18 + gateTierIdx * gateTierIdx * 6;
  }
  // Castle scaling
  const base = Math.floor(5 + stage * 0.6);
  return isLord ? base * 2 : base;
}

// Rank-Up Dungeon Gatekeeper attack. Tuned so a player at the minimum rank-up
// power threshold with NO ARMOR dies in ~30 seconds — well under the 90s
// timer, so gearing up extends your survival window and timer matters too.
// nextRankIdx is the index of the rank you're trying to ascend to (1 = E, etc.).
export function getRankUpGatekeeperAttack(nextRankIdx) {
  return Math.max(4, 4 + nextRankIdx * 3);
}

// ---------- Convenience: rough survival estimates (for UI hints) ----------

// Returns approximate seconds-to-die for a given matchup. Used to show
// "Danger" warnings on the boss/lord button without doing it in JSX.
export function estimateSecondsToDie(playerHp, enemyAttack, playerDefense, stage) {
  const dmgPerTick = computeIncomingDamage(enemyAttack, playerDefense, stage);
  if (dmgPerTick <= 0) return Infinity;
  return Math.ceil(playerHp / dmgPerTick);
}

// Returns approximate seconds-to-kill — already implicit in existing screens
// as bossHp / totalDamage, but exposing here for symmetry.
export function estimateSecondsToKill(enemyHp, playerDamage) {
  if (playerDamage <= 0) return Infinity;
  return Math.ceil(enemyHp / playerDamage);
}

// Re-export so consumers can `import { RANKS } from "../systems/health.js"`
// if they want — but mainly this keeps the import graph honest about why
// this file depends on ranks.
export { RANKS };