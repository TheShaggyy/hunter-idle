import { useEffect, useRef, useState, useCallback } from "react";
import {
  getCastleForStage,
  isCastleLordStage,
  getStageBossHp,
  getStageReward,
  getPassiveGoldPerMin,
} from "../data/castles.js";
import { getTotalDamage, getDamageUpgradeCost } from "../systems/combat.js";
import { getTeamDamage } from "../systems/combat.js";
import { getAllBuffs } from "../systems/equipment.js";
import { useCombatLoop } from "../hooks/useCombatLoop.js";
import { getVitalityUpgradeCost } from "../systems/health.js";
import {
  SKILLS,
  getSkillLevel,
  isSkillReady,
  isSkillActive,
  getSkillCooldownExpiry,
  getSkillActiveExpiry,
} from "../data/skills.js";
import { incrementCounter } from "../data/quests.js";

// Castle/Battle screen.
//
// Modes:
//   1. IDLE: passive auto-combat against trash — passive gold per second, no progression.
//   2. BOSS: real HP bar, killing it advances stage.
//
// New in Chunk B:
//   - Skill activation buttons (Berserk, Shadow Strike) appear below combat panel
//   - Crit chance now includes permanent upgrade + passive skill bonuses
//   - Berserk active doubles damage; Shadow Strike deals burst damage on use
//   - Quest counters (bossesKilled, stagesAdvanced, goldSpent) hooked here

const CASTLE_2_STAGE = 11;

export default function BattleScreen({ state, update }) {
  const castle = getCastleForStage(state.stage);
  const isLord = isCastleLordStage(state.stage);

  // Re-tick at 250ms so cooldown timers update visually
  const [, forceTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(i);
  }, []);

  const buffs = getAllBuffs(state);
  const totalDamage = getTotalDamage({
    damageLevel: state.damageLevel,
    hunters: state.hunters,
    equipDamage: buffs.equipDamage,
  });
  const teamDamage = getTeamDamage(state.hunters);
  const passiveGpm = Math.floor(getPassiveGoldPerMin(state.stage, totalDamage) * buffs.goldMult);
  const damageCost = getDamageUpgradeCost(state.damageLevel);
  const vitalityCost = getVitalityUpgradeCost(state.vitalityLevel || 0);

  const [floatingTexts, setFloatingTexts] = useState([]);
  const [hunterAttacking, setHunterAttacking] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [stageCleared, setStageCleared] = useState(false);
  const [particles, setParticles] = useState([]);

  const damageRef = useRef(totalDamage);
  const stateRef = useRef(state);
  const passiveGpmRef = useRef(passiveGpm);
  damageRef.current = totalDamage;
  stateRef.current = state;
  passiveGpmRef.current = passiveGpm;

  const spawnFloatingText = useCallback((value, isCrit, color) => {
    const id = Date.now() + Math.random();
    const offsetX = (Math.random() - 0.5) * 40;
    setFloatingTexts((prev) => [...prev, { id, value, isCrit, offsetX, color }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 900);
  }, []);

  // Player attacks once per second. The hook handles crit + active-skill
  // multiplier; our onAttack callback applies the damage to whatever target
  // mode we're in (trash idle or boss fight) and handles passive gold,
  // animations, and stage advancement on victory.
  useCombatLoop({
    enabled: true,
    getBaseDamage: () => damageRef.current,
    getBuffs: () => getAllBuffs(stateRef.current),
    onAttack: ({ damage, isCrit }) => {
      const cur = stateRef.current;
      spawnFloatingText(damage, isCrit);

      setHunterAttacking(true);
      setEnemyHit(true);
      setTimeout(() => setHunterAttacking(false), 220);
      setTimeout(() => setEnemyHit(false), 200);

      const gpm = passiveGpmRef.current;

      if (cur.onBossFight) {
        const newHp = cur.enemyHp - damage;
        if (newHp <= 0) {
          const reward = getStageReward(cur.stage);
          const nextStage = cur.stage + 1;
          const nextMaxHp = getStageBossHp(nextStage);
          const liveBuffs = getAllBuffs(cur);

          const earnedGold = Math.floor(reward.gold * liveBuffs.goldMult);
          const earnedCrystals = Math.floor(reward.crystals * liveBuffs.crystalMult);

          const justUnlockedHunters = !cur.huntersUnlocked && nextStage >= CASTLE_2_STAGE;
          const grantFreeStarter = justUnlockedHunters && !cur.freeStarterPullClaimed;

          update((s) => {
            // Quest hooks: boss killed + stage advanced
            const counters = s.quests?.counters || {};
            const questList = s.quests?.list || [];
            const bossInc = incrementCounter(counters, questList, "bossesKilled", 1);
            const stageInc = incrementCounter(bossInc.counters, bossInc.quests, "stagesAdvanced", 1);

            return {
              ...s,
              gold: s.gold + earnedGold,
              crystals: s.crystals + earnedCrystals,
              stage: nextStage,
              onBossFight: false,
              enemyHp: nextMaxHp,
              enemyMaxHp: nextMaxHp,
              huntersUnlocked: s.huntersUnlocked || nextStage >= CASTLE_2_STAGE,
              freeStarterPullAvailable: grantFreeStarter ? true : s.freeStarterPullAvailable,
              quests: { counters: stageInc.counters, list: stageInc.quests },
            };
          });
          setStageCleared(true);
          setTimeout(() => setStageCleared(false), 700);
        } else {
          update((s) => ({ ...s, enemyHp: newHp }));
        }
      } else {
        // Idle trash mode — trash respawns at 40% boss HP on kill, passive gold ticks.
        const trashHp = Math.max(20, Math.floor(cur.enemyMaxHp * 0.4));
        const newHp = cur.enemyHp - damage;
        const goldThisTick = Math.max(1, Math.floor(gpm / 60));
        if (newHp <= 0) {
          update((s) => ({ ...s, gold: s.gold + goldThisTick, enemyHp: trashHp }));
        } else {
          update((s) => ({ ...s, gold: s.gold + goldThisTick, enemyHp: newHp }));
        }
      }
    },
  });

  useEffect(() => {
    const maxHp = getStageBossHp(state.stage);
    if (state.onBossFight) {
      update((s) => ({ ...s, enemyHp: maxHp, enemyMaxHp: maxHp }));
    } else {
      const trashHp = Math.max(20, Math.floor(maxHp * 0.4));
      update((s) => ({ ...s, enemyHp: trashHp, enemyMaxHp: maxHp }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.onBossFight]);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now() + Math.random();
      const left = Math.random() * 100;
      const duration = 3 + Math.random() * 3;
      const delay = Math.random() * 0.5;
      const size = 4 + Math.random() * 6;
      setParticles((prev) => [
        ...prev.slice(-25),
        { id, left, duration, delay, size, themeClass: castle.particleClass },
      ]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, (duration + delay) * 1000);
    }, 350);
    return () => clearInterval(interval);
  }, [castle.particleClass]);

  function upgradeDamage() {
    if (state.gold < damageCost) return;
    update((s) => {
      const counters = s.quests?.counters || {};
      const questList = s.quests?.list || [];
      const inc = incrementCounter(counters, questList, "goldSpent", damageCost);
      return {
        ...s,
        gold: s.gold - damageCost,
        damageLevel: s.damageLevel + 1,
        quests: { counters: inc.counters, list: inc.quests },
      };
    });
  }

  // Vitality: gold-sink, +25 max HP per level. Goes through the same goldSpent
  // quest counter as damage upgrades so both feed the "spend gold" daily.
  function upgradeVitality() {
    if (state.gold < vitalityCost) return;
    update((s) => {
      const counters = s.quests?.counters || {};
      const questList = s.quests?.list || [];
      const inc = incrementCounter(counters, questList, "goldSpent", vitalityCost);
      return {
        ...s,
        gold: s.gold - vitalityCost,
        vitalityLevel: (s.vitalityLevel || 0) + 1,
        quests: { counters: inc.counters, list: inc.quests },
      };
    });
  }

  function startBossFight() {
    if (state.onBossFight) return;
    update({ onBossFight: true });
  }

  function fleeBossFight() {
    if (!state.onBossFight) return;
    update({ onBossFight: false });
  }

  // -------- Skill activation --------
  function activateBerserk() {
    const now = Date.now();
    const level = getSkillLevel(state.skills, "berserk");
    if (level === 0) return;
    if (!isSkillReady(state.skills, "berserk", now)) return;
    const skill = SKILLS.berserk;
    const duration = skill.durationAtLevel(level) * 1000;
    update((s) => ({
      ...s,
      skills: {
        ...s.skills,
        berserk: {
          ...s.skills.berserk,
          activeUntil: now + duration,
          cooldownExpiresAt: now + skill.cooldownSec * 1000,
        },
      },
    }));
  }

  function activateShadowStrike() {
    const now = Date.now();
    const level = getSkillLevel(state.skills, "shadow_strike");
    if (level === 0) return;
    if (!isSkillReady(state.skills, "shadow_strike", now)) return;
    const skill = SKILLS.shadow_strike;
    const burstMult = skill.multiplierAtLevel(level);
    const liveBuffs = getAllBuffs(stateRef.current);
    const burstDmg = Math.floor(damageRef.current * burstMult * liveBuffs.activeSkillMult);

    spawnFloatingText(burstDmg, true, "#a855f7");

    update((s) => {
      if (s.onBossFight) {
        const newHp = s.enemyHp - burstDmg;
        if (newHp <= 0) {
          const reward = getStageReward(s.stage);
          const nextStage = s.stage + 1;
          const nextMaxHp = getStageBossHp(nextStage);
          const earnedGold = Math.floor(reward.gold * liveBuffs.goldMult);
          const earnedCrystals = Math.floor(reward.crystals * liveBuffs.crystalMult);

          const justUnlockedHunters = !s.huntersUnlocked && nextStage >= CASTLE_2_STAGE;
          const grantFreeStarter = justUnlockedHunters && !s.freeStarterPullClaimed;

          let counters = s.quests?.counters || {};
          let questList = s.quests?.list || [];
          const bossInc = incrementCounter(counters, questList, "bossesKilled", 1);
          const stageInc = incrementCounter(bossInc.counters, bossInc.quests, "stagesAdvanced", 1);

          return {
            ...s,
            gold: s.gold + earnedGold,
            crystals: s.crystals + earnedCrystals,
            stage: nextStage,
            onBossFight: false,
            enemyHp: nextMaxHp,
            enemyMaxHp: nextMaxHp,
            huntersUnlocked: s.huntersUnlocked || nextStage >= CASTLE_2_STAGE,
            freeStarterPullAvailable: grantFreeStarter ? true : s.freeStarterPullAvailable,
            quests: { counters: stageInc.counters, list: stageInc.quests },
            skills: {
              ...s.skills,
              shadow_strike: {
                ...s.skills.shadow_strike,
                cooldownExpiresAt: now + skill.cooldownSec * 1000,
              },
            },
          };
        }
        return {
          ...s,
          enemyHp: newHp,
          skills: {
            ...s.skills,
            shadow_strike: {
              ...s.skills.shadow_strike,
              cooldownExpiresAt: now + skill.cooldownSec * 1000,
            },
          },
        };
      }

      // Idle mode — burst still triggers cooldown but mostly cosmetic
      return {
        ...s,
        skills: {
          ...s.skills,
          shadow_strike: {
            ...s.skills.shadow_strike,
            cooldownExpiresAt: now + skill.cooldownSec * 1000,
          },
        },
      };
    });
  }

  const hpPercent = (state.enemyHp / Math.max(1, state.enemyMaxHp)) * 100;
  const displayEnemy = state.onBossFight
    ? isLord
      ? castle.bossEmoji
      : castle.enemy
    : castle.enemy;
  const enemyLabel = state.onBossFight
    ? isLord
      ? castle.lord
      : "Stage Boss"
    : `${castle.name} Trash`;

  // Skill button states
  const now = Date.now();
  const berserkLevel = getSkillLevel(state.skills, "berserk");
  const berserkReady = isSkillReady(state.skills, "berserk", now);
  const berserkActive = isSkillActive(state.skills, "berserk", now);
  const berserkCdRemaining = Math.max(0, Math.ceil((getSkillCooldownExpiry(state.skills, "berserk") - now) / 1000));
  const berserkActiveRemaining = Math.max(0, Math.ceil((getSkillActiveExpiry(state.skills, "berserk") - now) / 1000));

  const shadowLevel = getSkillLevel(state.skills, "shadow_strike");
  const shadowReady = isSkillReady(state.skills, "shadow_strike", now);
  const shadowCdRemaining = Math.max(0, Math.ceil((getSkillCooldownExpiry(state.skills, "shadow_strike") - now) / 1000));

  return (
    <>
      <section
        className={`runner-arena ${castle.background} ${state.onBossFight ? "boss-mode" : ""} ${berserkActive ? "berserk-mode" : ""}`}
        style={{ "--theme-accent": castle.accent }}
      >
        <div className="gate-banner">
          <span>Stage {state.stage}</span>
          <strong>{castle.name}</strong>
          {isLord && <em>LORD</em>}
        </div>

        <div className="moving-bg bg-layer-one" />
        <div className="moving-bg bg-layer-two" />

        <div className="particle-layer">
          {particles.map((p) => (
            <span
              key={p.id}
              className={`particle ${p.themeClass}`}
              style={{
                left: `${p.left}%`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
              }}
            />
          ))}
        </div>

        {stageCleared && (
          <div className="stage-cleared-flash">
            <span>Stage Cleared!</span>
          </div>
        )}

        <div className="battle-lane">
          <div className={`runner hunter-runner ${hunterAttacking ? "attacking" : ""}`}>
            <div className="sprite hunter-sprite">⚔️</div>
            <p>Main Hunter</p>
          </div>

          <div className="runner enemy-runner">
            <div
              className={`sprite enemy-sprite ${state.onBossFight ? "boss" : ""} ${
                isLord && state.onBossFight ? "lord" : ""
              } ${enemyHit ? "hit" : ""}`}
            >
              {displayEnemy}
            </div>

            <div className="floating-text-container">
              {floatingTexts.map((t) => (
                <div
                  key={t.id}
                  className={`floating-text ${t.isCrit ? "crit" : ""}`}
                  style={{ "--offset-x": `${t.offsetX}px`, color: t.color }}
                >
                  {t.isCrit && <span className="crit-label">CRIT</span>}
                  -{t.value}
                </div>
              ))}
            </div>

            <p>{enemyLabel}</p>
          </div>
        </div>

        <div className="enemy-hp-box">
          <div className="hp-label">
            <span>{state.onBossFight ? (isLord ? "Castle Lord HP" : "Boss HP") : "Trash HP"}</span>
            <span>
              {Math.max(0, state.enemyHp)} / {state.enemyMaxHp}
            </span>
          </div>
          <div className="hp-bar">
            <div
              className={`hp-fill ${state.onBossFight ? "boss-hp" : ""}`}
              style={{
                width: `${Math.max(0, hpPercent)}%`,
                filter: hpPercent < 25 ? "brightness(1.3) saturate(1.4)" : "none",
              }}
            />
          </div>
        </div>
      </section>

      <section className="combat-panel">
        <div className="combat-stats">
          <div>
            <span>Total DMG</span>
            <strong>{totalDamage}</strong>
          </div>
          <div>
            <span>Team DMG</span>
            <strong>{teamDamage}</strong>
          </div>
          <div>
            <span>Gear DMG</span>
            <strong>{buffs.equipDamage}</strong>
          </div>
          <div>
            <span>Gold/min</span>
            <strong>{passiveGpm}</strong>
          </div>
        </div>

        {/* Skill row — only show if at least one skill is unlocked */}
        {(berserkLevel > 0 || shadowLevel > 0) && (
          <div className="skill-actives-row">
            {berserkLevel > 0 && (
              <button
                onClick={activateBerserk}
                disabled={!berserkReady || berserkActive}
                className={`skill-active-btn ${berserkActive ? "active" : ""} ${!berserkReady ? "on-cd" : ""}`}
              >
                <span>🔥 Berserk</span>
                <strong>
                  {berserkActive
                    ? `${berserkActiveRemaining}s left`
                    : berserkReady
                      ? "Ready!"
                      : `${berserkCdRemaining}s`}
                </strong>
              </button>
            )}
            {shadowLevel > 0 && (
              <button
                onClick={activateShadowStrike}
                disabled={!shadowReady}
                className={`skill-active-btn ${!shadowReady ? "on-cd" : ""}`}
              >
                <span>🌑 Shadow Strike</span>
                <strong>{shadowReady ? "Ready!" : `${shadowCdRemaining}s`}</strong>
              </button>
            )}
          </div>
        )}

        <div className="skill-row">
          <button
            onClick={upgradeDamage}
            disabled={state.gold < damageCost}
            className={state.gold < damageCost ? "disabled-skill" : ""}
          >
            <span>Upgrade DMG</span>
            <strong>{damageCost} 🪙</strong>
          </button>

          <button
            onClick={upgradeVitality}
            disabled={state.gold < vitalityCost}
            className={state.gold < vitalityCost ? "disabled-skill" : ""}
          >
            <span>Upgrade VIT</span>
            <strong>{vitalityCost} 🪙</strong>
          </button>
        </div>

        <div className="skill-row">
          {state.onBossFight ? (
            <button onClick={fleeBossFight} className="flee-btn">
              <span>Flee Boss</span>
              <strong>Resume idle</strong>
            </button>
          ) : (
            <button
              onClick={startBossFight}
              className={isLord ? "lord-btn" : "boss-btn"}
            >
              <span>{isLord ? "⚔️ Challenge Lord" : "⚔️ Fight Boss"}</span>
              <strong>Advance stage</strong>
            </button>
          )}
        </div>
      </section>
    </>
  );
}