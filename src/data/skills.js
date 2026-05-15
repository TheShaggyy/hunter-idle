// Skills — the main hunter's actives + passive.
// Two actives (Berserk, Shadow Strike), one passive (Sharpened Senses).
// All upgradeable with gold, all carry over through awakening.

export const SKILLS = {
  sharpened_senses: {
    id: "sharpened_senses",
    name: "Sharpened Senses",
    type: "passive",
    icon: "👁️",
    description: "Permanent crit chance bonus.",
    maxLevel: 5,
    costAtLevel: (lvl) => Math.floor(500 * Math.pow(2.5, lvl)),
    effectAtLevel: (lvl) => lvl * 0.03, // +3% crit per level
    formatEffect: (lvl) => `+${lvl * 3}% Crit Chance`,
  },
  berserk: {
    id: "berserk",
    name: "Berserk",
    type: "active",
    icon: "🔥",
    description: "Double damage for a short burst.",
    maxLevel: 5,
    cooldownSec: 60,
    durationSec: 10,
    costAtLevel: (lvl) => Math.floor(800 * Math.pow(2.4, lvl)),
    // Level affects duration (base 10s, +2s per level → 20s max)
    durationAtLevel: (lvl) => 10 + lvl * 2,
    formatEffect: (lvl) => `2.0× damage for ${10 + lvl * 2}s`,
  },
  shadow_strike: {
    id: "shadow_strike",
    name: "Shadow Strike",
    type: "active",
    icon: "🌑",
    description: "Devastating instant burst.",
    maxLevel: 5,
    cooldownSec: 90,
    costAtLevel: (lvl) => Math.floor(1500 * Math.pow(2.6, lvl)),
    // Level affects multiplier (base 5x, +2x per level → 15x max)
    multiplierAtLevel: (lvl) => 5 + lvl * 2,
    formatEffect: (lvl) => `${5 + lvl * 2}× current damage as burst`,
  },
};

export const ACTIVE_SKILL_IDS = ["berserk", "shadow_strike"];
export const PASSIVE_SKILL_IDS = ["sharpened_senses"];

export function getSkillLevel(skillState, id) {
  return skillState?.[id]?.level ?? 0;
}

export function getSkillCooldownExpiry(skillState, id) {
  return skillState?.[id]?.cooldownExpiresAt ?? 0;
}

export function getSkillActiveExpiry(skillState, id) {
  return skillState?.[id]?.activeUntil ?? 0;
}

export function isSkillActive(skillState, id, now = Date.now()) {
  return getSkillActiveExpiry(skillState, id) > now;
}

export function isSkillReady(skillState, id, now = Date.now()) {
  return getSkillCooldownExpiry(skillState, id) <= now;
}

// Empty skill state shape.
export function getInitialSkills() {
  return {
    sharpened_senses: { level: 0 },
    berserk: { level: 0, cooldownExpiresAt: 0, activeUntil: 0 },
    shadow_strike: { level: 0, cooldownExpiresAt: 0 },
  };
}
