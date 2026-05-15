import {
  SKILLS,
  ACTIVE_SKILL_IDS,
  PASSIVE_SKILL_IDS,
  getSkillLevel,
} from "../data/skills.js";

// SkillsScreen — purchase + upgrade the main hunter's skills.
// Skills carry over through awakening.

export default function SkillsScreen({ state, update, onClose }) {
  function upgradeSkill(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return;
    const lvl = getSkillLevel(state.skills, skillId);
    if (lvl >= skill.maxLevel) return;
    const cost = skill.costAtLevel(lvl);
    if (state.gold < cost) return;
    update((s) => ({
      ...s,
      gold: s.gold - cost,
      skills: {
        ...s.skills,
        [skillId]: {
          ...(s.skills?.[skillId] || {}),
          level: lvl + 1,
        },
      },
    }));
  }

  return (
    <div className="page-panel">
      <h2>Skills</h2>
      <p className="dim small center">Persist through awakenings. Costs grow steeply.</p>

      <h3 className="section-h">Active Skills</h3>
      {ACTIVE_SKILL_IDS.map((id) => (
        <SkillTile key={id} skill={SKILLS[id]} state={state} onUpgrade={upgradeSkill} />
      ))}

      <h3 className="section-h">Passive Skills</h3>
      {PASSIVE_SKILL_IDS.map((id) => (
        <SkillTile key={id} skill={SKILLS[id]} state={state} onUpgrade={upgradeSkill} />
      ))}

      <button onClick={onClose} className="flee-btn" style={{ marginTop: 12, width: "100%" }}>
        Back
      </button>
    </div>
  );
}

function SkillTile({ skill, state, onUpgrade }) {
  const lvl = getSkillLevel(state.skills, skill.id);
  const atMax = lvl >= skill.maxLevel;
  const cost = skill.costAtLevel(lvl);
  const canAfford = !atMax && state.gold >= cost;

  return (
    <div className="card skill-tile">
      <div className="skill-tile-head">
        <span className="skill-icon">{skill.icon}</span>
        <div>
          <strong>{skill.name}</strong>
          <p className="dim small">{skill.description}</p>
        </div>
      </div>
      <div className="skill-stats">
        <span className="dim small">Level {lvl} / {skill.maxLevel}</span>
        {lvl > 0 && (
          <span className="dim small">
            Now: {skill.formatEffect(lvl)}
          </span>
        )}
        {!atMax && (
          <span className="dim small">
            {lvl === 0 ? "Unlock" : "Next"}: {skill.formatEffect(lvl + 1)}
          </span>
        )}
        {skill.type === "active" && (
          <span className="dim small">CD: {skill.cooldownSec}s</span>
        )}
      </div>
      <button
        onClick={() => onUpgrade(skill.id)}
        disabled={!canAfford}
        className={`upgrade-buy-btn ${atMax ? "maxed" : ""}`}
      >
        {atMax ? "MAX" : `🪙 ${cost.toLocaleString()}`}
      </button>
    </div>
  );
}
