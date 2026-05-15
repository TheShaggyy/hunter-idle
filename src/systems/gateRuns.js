import { getGateById, getRecommendedPower } from "../data/gates.js";
import { generateEquipmentInstance } from "../data/equipment.js";

// Roll rewards for a completed gate run.
// buffs: { goldMult, crystalMult, dropRateBonus } from getAllBuffs(state).
export function rollGateRewards(gateId, playerPower, buffs = null, rng = Math.random) {
  const gate = getGateById(gateId);
  if (!gate) return null;

  const goldMult = buffs?.goldMult ?? 1.0;
  const crystalMult = buffs?.crystalMult ?? 1.0;
  const dropRateBonus = buffs?.dropRateBonus ?? 0;

  const recommended = getRecommendedPower(gateId);
  const powerRatio = Math.max(0.3, Math.min(1.5, playerPower / Math.max(1, recommended)));

  const r = gate.rewards;
  const gold = Math.floor(randRange(r.goldMin, r.goldMax, rng) * powerRatio * goldMult);
  const crystals = Math.floor(randRange(r.crystalsMin, r.crystalsMax, rng) * powerRatio * crystalMult);
  const essence = Math.floor(randRange(r.essenceMin, r.essenceMax, rng) * powerRatio);

  // Base 10% + small gate scaling + permanent upgrade bonus
  const equipDropChance = Math.min(0.95, 0.10 + (gate.staminaCost / 1000) + dropRateBonus);
  const equipDropped = rng() < equipDropChance;
  const equipInstance = equipDropped ? generateEquipmentInstance(gate.id, rng) : null;

  return {
    gold,
    crystals,
    essence,
    equipDropped,
    equipInstance,
    equipTier: equipDropped ? gate.id : null,
  };
}

function randRange(min, max, rng) {
  return min + rng() * (max - min);
}
