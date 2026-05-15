// Combat math — pure functions. Easy to unit-test, easy to balance.

// Base hunter (main character) damage scales linearly with damage level.
export function getMainHunterDamage(damageLevel) {
  return 5 + damageLevel * 5;
}

// Cost to upgrade main hunter damage (exponential idle-game curve).
export function getDamageUpgradeCost(damageLevel) {
  return Math.floor(50 * Math.pow(1.15, damageLevel));
}

// Damage from recruited hunters (gacha companions).
export function getTeamDamage(hunters) {
  return hunters.reduce((sum, h) => sum + h.baseDamage * h.level, 0);
}

// Total damage dealt per combat tick.
// equipDamage is passed in by the caller (it's computed in systems/equipment.js
// because that's where equipment math lives — keeps this file focused on combat).
export function getTotalDamage({ damageLevel, hunters, equipDamage = 0 }) {
  return getMainHunterDamage(damageLevel) + getTeamDamage(hunters) + equipDamage;
}

// Association Power — the headline stat. Used for rank eligibility, gate recommendations.
export function getAssociationPower({ totalDamage, stage, hunters }) {
  return totalDamage + stage * 4 + hunters.length * 12;
}

// Critical hit calculation.
// BASE_CRIT_CHANCE is the floor; permanent upgrades + skills add on top of it.
export const BASE_CRIT_CHANCE = 0.15;
export const CRIT_MULT = 2.5;

// bonusCritChance: additive bonus from upgrades/skills (e.g., 0.10 = +10%).
export function rollCrit(bonusCritChance = 0, rng = Math.random) {
  const totalCrit = Math.min(0.95, BASE_CRIT_CHANCE + bonusCritChance);
  const isCrit = rng() < totalCrit;
  return { isCrit, mult: isCrit ? CRIT_MULT : 1 };
}
