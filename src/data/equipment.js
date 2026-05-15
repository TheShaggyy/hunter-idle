// Equipment — weapons, armor, accessories.
// Tiered like ranks: F → Red. Higher tiers drop from higher-tier gates.
// Each piece has stats, a tier, and can be leveled with Essence (drops from Gates / Dungeons).
 
export const EQUIP_SLOTS = ["weapon", "armor", "accessory"];
 
export const EQUIP_TIERS = [
  { id: "F", name: "Worn", color: "#9ca3af", multiplier: 1.0 },
  { id: "E", name: "Standard", color: "#a3b18a", multiplier: 1.5 },
  { id: "D", name: "Fine", color: "#52b788", multiplier: 2.2 },
  { id: "C", name: "Superior", color: "#48cae4", multiplier: 3.5 },
  { id: "B", name: "Master", color: "#3b82f6", multiplier: 5.5 },
  { id: "A", name: "Heroic", color: "#a855f7", multiplier: 9.0 },
  { id: "S", name: "Mythic", color: "#ffd700", multiplier: 15.0 },
  { id: "RED", name: "Monarch's Relic", color: "#ff174f", multiplier: 28.0 },
];
 
// Pre-defined templates. Actual items drop with stat rolls.
// accessory bonuses: staminaRegen (% faster), goldBonus (% more gold), crystalBonus (% more crystals)
export const EQUIP_TEMPLATES = [
  // Weapons
  { id: "iron_sword", name: "Iron Sword", slot: "weapon", baseAttack: 10, emoji: "🗡️" },
  { id: "shadow_dagger", name: "Shadow Dagger", slot: "weapon", baseAttack: 14, emoji: "🗡️" },
  { id: "demon_blade", name: "Demon Blade", slot: "weapon", baseAttack: 22, emoji: "⚔️" },
  { id: "kasaka_fang", name: "Kasaka's Venom Fang", slot: "weapon", baseAttack: 38, emoji: "🐍" },
  { id: "monarch_blade", name: "Monarch's Blade", slot: "weapon", baseAttack: 80, emoji: "🌑" },
 
  // Armor — gives HP and Defense, NOT damage.
  // baseHp is flat HP added to player max HP. baseDefense feeds the mitigation curve.
  { id: "cloth_robes", name: "Cloth Robes", slot: "armor", baseHp: 80, baseDefense: 8, emoji: "🥋" },
  { id: "leather_vest", name: "Leather Vest", slot: "armor", baseHp: 160, baseDefense: 18, emoji: "🦺" },
  { id: "knight_plate", name: "Knight's Plate", slot: "armor", baseHp: 320, baseDefense: 40, emoji: "🛡️" },
  { id: "shadow_cloak", name: "Cloak of the Shadow Monarch", slot: "armor", baseHp: 700, baseDefense: 90, emoji: "🧥" },
 
  // Accessories — bonuses scale with tier multiplier
  { id: "stamina_ring", name: "Ring of Vigor", slot: "accessory", staminaRegen: 0.20, emoji: "💍" },
  { id: "gold_amulet", name: "Amulet of Greed", slot: "accessory", goldBonus: 0.15, emoji: "📿" },
  { id: "crystal_eye", name: "Crystal Eye", slot: "accessory", crystalBonus: 0.10, emoji: "🔮" },
];
 
// Level cap scales with tier. F=5, E=8, D=11, C=14, B=17, A=20, S=23, RED=26
export function getEquipMaxLevel(tierId) {
  const tierIndex = EQUIP_TIERS.findIndex((t) => t.id === tierId);
  return 5 + Math.max(0, tierIndex) * 3;
}
 
// Essence cost to level a piece (exponential, scaled by tier).
export function getEquipLevelCost(currentLevel, tierId) {
  const tierIndex = EQUIP_TIERS.findIndex((t) => t.id === tierId);
  return Math.floor(10 * Math.pow(1.25, currentLevel) * (1 + Math.max(0, tierIndex) * 0.5));
}
 
// Final damage stat for WEAPONS only. Armor no longer contributes damage —
// it gives HP + Defense instead (see getEquipHpBonus / getEquipDefense below).
// Formula: baseAttack * tier.multiplier * (1 + level * 0.10)
export function getEquipPower(item) {
  if (!item) return 0;
  if (item.slot !== "weapon") return 0;
  const tier = EQUIP_TIERS.find((t) => t.id === item.tier);
  const tpl = EQUIP_TEMPLATES.find((t) => t.id === item.templateId);
  if (!tier || !tpl) return 0;
 
  const baseStat = tpl.baseAttack ?? 0;
  return Math.floor(baseStat * tier.multiplier * (1 + item.level * 0.10));
}
 
// Flat HP an armor piece contributes to the player's max HP.
// Same scaling shape as weapon damage: baseHp * tier.multiplier * (1 + level * 0.10)
export function getEquipHpBonus(item) {
  if (!item || item.slot !== "armor") return 0;
  const tier = EQUIP_TIERS.find((t) => t.id === item.tier);
  const tpl = EQUIP_TEMPLATES.find((t) => t.id === item.templateId);
  if (!tier || !tpl) return 0;
 
  const baseHp = tpl.baseHp ?? 0;
  return Math.floor(baseHp * tier.multiplier * (1 + item.level * 0.10));
}
 
// Defense stat from armor. Feeds the mitigation curve in systems/health.js.
// Same scaling shape as HP/damage. Lower base numbers than HP because the
// mitigation curve has diminishing returns built in.
export function getEquipDefense(item) {
  if (!item || item.slot !== "armor") return 0;
  const tier = EQUIP_TIERS.find((t) => t.id === item.tier);
  const tpl = EQUIP_TEMPLATES.find((t) => t.id === item.templateId);
  if (!tier || !tpl) return 0;
 
  const baseDef = tpl.baseDefense ?? 0;
  return Math.floor(baseDef * tier.multiplier * (1 + item.level * 0.10));
}
 
// For accessories: returns the effective bonus value (0.15 → "+15%" gold, etc.)
// Scales with tier so a Red Tier Amulet of Greed is much better than a Worn one.
export function getAccessoryBonus(item) {
  if (!item || item.slot !== "accessory") return { stamina: 0, gold: 0, crystal: 0 };
  const tier = EQUIP_TIERS.find((t) => t.id === item.tier);
  const tpl = EQUIP_TEMPLATES.find((t) => t.id === item.templateId);
  if (!tier || !tpl) return { stamina: 0, gold: 0, crystal: 0 };
 
  // Accessory bonuses scale with tier multiplier and level (gentler curve than weapons).
  const scale = tier.multiplier * (1 + item.level * 0.05);
  return {
    stamina: (tpl.staminaRegen ?? 0) * scale,
    gold: (tpl.goldBonus ?? 0) * scale,
    crystal: (tpl.crystalBonus ?? 0) * scale,
  };
}
 
// Roll a fresh equipment instance from a drop. Called when a gate awards equipment.
// gateTierId determines the equipment tier (gate F drops F-tier, gate RED drops RED-tier, etc.)
// Small chance (10%) to upgrade one tier above the gate for excitement.
let _instanceCounter = 0;
export function generateEquipmentInstance(gateTierId, rng = Math.random) {
  // Pick a random template
  const tpl = EQUIP_TEMPLATES[Math.floor(rng() * EQUIP_TEMPLATES.length)];
 
  // Determine tier — match gate tier, with 10% chance to bump up one
  let tierIdx = EQUIP_TIERS.findIndex((t) => t.id === gateTierId);
  if (tierIdx < 0) tierIdx = 0;
  if (rng() < 0.10 && tierIdx < EQUIP_TIERS.length - 1) {
    tierIdx += 1;
  }
  const tier = EQUIP_TIERS[tierIdx];
 
  _instanceCounter += 1;
  return {
    instanceId: `eq_${Date.now()}_${_instanceCounter}_${Math.floor(rng() * 1e6)}`,
    templateId: tpl.id,
    name: tpl.name,
    slot: tpl.slot,
    tier: tier.id,
    level: 0,
    emoji: tpl.emoji,
  };
}
 
// Salvage value — how much essence you get back from destroying an item.
export function getSalvageValue(item) {
  const tierIdx = EQUIP_TIERS.findIndex((t) => t.id === item.tier);
  return 5 + tierIdx * 8 + item.level * 2;
}
