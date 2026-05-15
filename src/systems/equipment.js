// Equipment system — pure functions for managing inventory, equipping/unequipping,
// upgrading, and aggregating equipment-derived buffs.
//
// CRUCIAL: this file is now the SINGLE source of truth for ALL buffs in the game:
//   - equipment damage
//   - accessory percentage buffs
//   - affiliation perks (Association/Guild)
//   - permanent awakening upgrades
//   - active skill effects (Berserk damage multiplier, etc.)
//   - passive skill bonuses (Sharpened Senses crit chance)
//
// Everything that wants to know "what bonuses does this player currently have"
// should call getAllBuffs(state).

import {
  getEquipPower,
  getEquipHpBonus,
  getEquipDefense,
  getAccessoryBonus,
  getEquipMaxLevel,
  getEquipLevelCost,
  getSalvageValue,
} from "../data/equipment.js";
import { getUpgradeEffect } from "../data/awakening.js";
import {
  SKILLS,
  getSkillLevel,
  isSkillActive,
} from "../data/skills.js";

// ---------- Inventory mutators (return new arrays/objects, never mutate) ----------

export function addToInventory(inventory, item) {
  return [...inventory, item];
}

export function removeFromInventory(inventory, instanceId) {
  return inventory.filter((i) => i.instanceId !== instanceId);
}

export function equipItem(equipped, inventory, item) {
  const slot = item.slot;
  const previouslyEquipped = equipped[slot];
  const newInventory = inventory.filter((i) => i.instanceId !== item.instanceId);
  const newEquipped = { ...equipped, [slot]: item };
  if (previouslyEquipped) {
    newInventory.push(previouslyEquipped);
  }
  return { equipped: newEquipped, inventory: newInventory };
}

export function unequipSlot(equipped, inventory, slot) {
  const item = equipped[slot];
  if (!item) return { equipped, inventory };
  return {
    equipped: { ...equipped, [slot]: null },
    inventory: [...inventory, item],
  };
}

export function upgradeItem(item, currentEssence) {
  const maxLevel = getEquipMaxLevel(item.tier);
  if (item.level >= maxLevel) return null;
  const cost = getEquipLevelCost(item.level, item.tier);
  if (currentEssence < cost) return null;
  return {
    item: { ...item, level: item.level + 1 },
    essenceSpent: cost,
  };
}

export function salvageItem(item) {
  return getSalvageValue(item);
}

// ---------- Buff aggregation ----------

// Sum of weapon damage from equipped items. Armor no longer contributes
// here — see getEquippedHpBonus / getEquippedDefense below.
export function getEquippedCombatPower(equipped) {
  if (!equipped) return 0;
  let total = 0;
  for (const slot of Object.keys(equipped)) {
    const item = equipped[slot];
    if (item && item.slot === "weapon") {
      total += getEquipPower(item);
    }
  }
  return total;
}

// Sum of HP bonus from all equipped armor.
export function getEquippedHpBonus(equipped) {
  if (!equipped) return 0;
  let total = 0;
  for (const slot of Object.keys(equipped)) {
    const item = equipped[slot];
    if (item && item.slot === "armor") {
      total += getEquipHpBonus(item);
    }
  }
  return total;
}

// Sum of defense from all equipped armor.
export function getEquippedDefense(equipped) {
  if (!equipped) return 0;
  let total = 0;
  for (const slot of Object.keys(equipped)) {
    const item = equipped[slot];
    if (item && item.slot === "armor") {
      total += getEquipDefense(item);
    }
  }
  return total;
}

export function getAffiliationBuffs(affiliation) {
  if (affiliation === "association") {
    return { gold: 0.10, crystal: 0.05, staminaRegen: 0 };
  }
  if (affiliation === "guild") {
    return { gold: 0, crystal: 0.20, staminaRegen: 0 };
  }
  return { gold: 0, crystal: 0, staminaRegen: 0 };
}

// THE master buff calculator. Returns all multipliers, bonuses, and damage modifiers
// from every source (equipment, affiliation, permanent upgrades, skills).
//
// Returns:
//   {
//     goldMult, crystalMult, staminaRegenMult,
//     equipDamage,         // flat damage from weapons only
//     equipHpBonus,        // flat HP from armor
//     equipDefense,        // flat defense from armor
//     critBonus,           // additive crit chance from upgrades + passive skill
//     dropRateBonus,       // additive drop rate from upgrades
//     bonusStaminaCap,     // additive max stamina from upgrades
//     activeSkillMult,     // damage multiplier from currently-active skill (e.g. Berserk)
//     berserkActive,
//   }
export function getAllBuffs(state, now = Date.now()) {
  const equipped = state.equipped || { weapon: null, armor: null, accessory: null };
  const affBuffs = getAffiliationBuffs(state.affiliation);
  const accBonus = getAccessoryBonus(equipped.accessory);

  // Permanent upgrades from awakening tree
  const pu = state.permanentUpgrades || {};
  const permGoldMult = getUpgradeEffect(pu, "goldMult");
  const permCrystalMult = getUpgradeEffect(pu, "crystalMult");
  const permCritBonus = getUpgradeEffect(pu, "critChance");
  const permDropBonus = getUpgradeEffect(pu, "dropRate");
  const permStaminaCap = getUpgradeEffect(pu, "staminaCap");

  // Passive skill: Sharpened Senses adds to crit chance
  const skills = state.skills || {};
  const sharpenedLevel = getSkillLevel(skills, "sharpened_senses");
  const skillCritBonus = SKILLS.sharpened_senses.effectAtLevel(sharpenedLevel);

  // Active skill: Berserk — if active, multiply damage by 2.0
  const berserkActive = isSkillActive(skills, "berserk", now);
  const activeSkillMult = berserkActive ? 2.0 : 1.0;

  return {
    // Multiplicative buffs (1.15 = "+15%")
    goldMult: (1 + affBuffs.gold + accBonus.gold) * permGoldMult,
    crystalMult: (1 + affBuffs.crystal + accBonus.crystal) * permCrystalMult,
    staminaRegenMult: 1 + affBuffs.staminaRegen + accBonus.stamina,

    // Flat stats from gear
    equipDamage: getEquippedCombatPower(equipped),
    equipHpBonus: getEquippedHpBonus(equipped),
    equipDefense: getEquippedDefense(equipped),

    // Additive bonuses
    critBonus: permCritBonus + skillCritBonus,
    dropRateBonus: permDropBonus,
    bonusStaminaCap: permStaminaCap,

    // Skill effects
    activeSkillMult,
    berserkActive,
  };
}