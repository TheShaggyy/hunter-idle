import { useEffect, useRef, useState } from "react";
import { GATE_TIERS, getRecommendedPower } from "../data/gates.js";
import { getRankIndex, getRankById } from "../data/ranks.js";
import { rollGateRewards } from "../systems/gateRuns.js";
import { getMaxStamina, tickStamina, getSecondsUntilNextStamina } from "../systems/stamina.js";
import { getAllBuffs } from "../systems/equipment.js";
import { EQUIP_TIERS } from "../data/equipment.js";
import { incrementCounter } from "../data/quests.js";

export default function GatesScreen({ state, update, associationPower }) {
  const playerRankIdx = getRankIndex(state.rank);
  const [activeRun, setActiveRun] = useState(null);
  const [lastRewards, setLastRewards] = useState(null);
  const [, forceTick] = useState(0);

  const activeRunRef = useRef(activeRun);
  activeRunRef.current = activeRun;
  const powerRef = useRef(associationPower);
  powerRef.current = associationPower;
  const stateRef = useRef(state);
  stateRef.current = state;

  const buffs = getAllBuffs(state);
  const maxStamina = getMaxStamina(playerRankIdx, buffs.bonusStaminaCap);
  const regenMult = buffs.staminaRegenMult;

  useEffect(() => {
    const i = setInterval(() => {
      const live = stateRef.current;
      const liveBuffs = getAllBuffs(live);
      const livePlayerRankIdx = getRankIndex(live.rank);
      const liveMax = getMaxStamina(livePlayerRankIdx, liveBuffs.bonusStaminaCap);

      const result = tickStamina({
        stamina: live.stamina,
        lastUpdatedAt: live.staminaUpdatedAt,
        max: liveMax,
        regenMult: liveBuffs.staminaRegenMult,
      });
      if (result.stamina !== live.stamina || result.lastUpdatedAt !== live.staminaUpdatedAt) {
        update({ stamina: result.stamina, staminaUpdatedAt: result.lastUpdatedAt });
      }

      const run = activeRunRef.current;
      if (run) {
        const elapsed = (Date.now() - run.startedAt) / 1000;
        if (elapsed >= run.durationSec) {
          const rewards = rollGateRewards(run.gateId, powerRef.current, liveBuffs);
          if (rewards) {
            update((s) => {
              const newInventory = rewards.equipInstance
                ? [...s.inventory, rewards.equipInstance]
                : s.inventory;

              // Quest hook: gate cleared
              const counters = s.quests?.counters || {};
              const questList = s.quests?.list || [];
              const inc = incrementCounter(counters, questList, "gatesCleared", 1);

              return {
                ...s,
                gold: s.gold + rewards.gold,
                crystals: s.crystals + rewards.crystals,
                essence: s.essence + rewards.essence,
                inventory: newInventory,
                quests: { counters: inc.counters, list: inc.quests },
              };
            });
            setLastRewards({ ...rewards, gateId: run.gateId });
          }
          setActiveRun(null);
        }
      }

      forceTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(i);
  }, [update]);

  function enterGate(gate) {
    if (state.stamina < gate.staminaCost) return;
    if (activeRun) return;
    const requiredRankIdx = getRankIndex(gate.rankRequired);
    if (playerRankIdx < requiredRankIdx) return;

    update((s) => ({ ...s, stamina: s.stamina - gate.staminaCost }));
    setActiveRun({ gateId: gate.id, startedAt: Date.now(), durationSec: gate.durationSec });
    setLastRewards(null);
  }

  function dismissRewards() {
    setLastRewards(null);
  }

  const secondsToNextStam = getSecondsUntilNextStamina({
    stamina: state.stamina,
    lastUpdatedAt: state.staminaUpdatedAt,
    max: maxStamina,
    regenMult,
  });

  return (
    <div className="page-panel">
      <h2>Gates</h2>

      <div className="card stamina-card">
        <div className="stamina-bar-wrap">
          <div className="stamina-label">
            <span>⚡ Stamina</span>
            <span>
              {state.stamina} / {maxStamina}
            </span>
          </div>
          <div className="stamina-bar">
            <div
              className="stamina-fill"
              style={{ width: `${(state.stamina / maxStamina) * 100}%` }}
            />
          </div>
          {secondsToNextStam !== null && state.stamina < maxStamina && (
            <p className="dim small">
              +1 in {formatSecs(secondsToNextStam)}
              {regenMult > 1.0 && (
                <span className="dim"> · {Math.round((regenMult - 1) * 100)}% faster</span>
              )}
            </p>
          )}
        </div>
      </div>

      {activeRun && (
        <ActiveRunCard
          activeRun={activeRun}
          onAbandon={() => setActiveRun(null)}
        />
      )}

      {lastRewards && (
        <div className="card reward-card">
          <h3>Gate Cleared!</h3>
          <p>+{lastRewards.gold.toLocaleString()} 🪙 Gold</p>
          <p>+{lastRewards.crystals} 💎 Crystals</p>
          <p>+{lastRewards.essence} ✨ Essence</p>
          {lastRewards.equipInstance && (
            <p style={{ color: getEquipTierColor(lastRewards.equipInstance.tier) }}>
              ★ {lastRewards.equipInstance.emoji} {lastRewards.equipInstance.name} ({lastRewards.equipInstance.tier}-Tier)!
            </p>
          )}
          <button onClick={dismissRewards}>Continue</button>
        </div>
      )}

      <div className="gate-list">
        {GATE_TIERS.map((gate) => {
          const requiredIdx = getRankIndex(gate.rankRequired);
          const locked = playerRankIdx < requiredIdx;
          const rank = getRankById(gate.rankRequired);
          const canAfford = state.stamina >= gate.staminaCost;
          const recommendedPower = getRecommendedPower(gate.id);
          const isUnderpowered = associationPower < recommendedPower * 0.6;

          return (
            <div
              key={gate.id}
              className={`gate-tile ${locked ? "locked" : ""} ${gate.id === "RED" ? "red-gate" : ""}`}
              style={{ "--gate-color": gate.color }}
            >
              <div className="gate-tile-head">
                <strong>{gate.name}</strong>
                <span className="gate-rank-badge" style={{ background: rank.color }}>
                  {rank.name}
                </span>
              </div>
              <p className="gate-desc">{gate.description}</p>
              <div className="gate-stats">
                <span>⚡ {gate.staminaCost}</span>
                <span>⏱ {formatSecs(gate.durationSec)}</span>
                <span>🪙 {gate.rewards.goldMin}–{gate.rewards.goldMax}</span>
                <span>💎 {gate.rewards.crystalsMin}–{gate.rewards.crystalsMax}</span>
              </div>

              {locked ? (
                <button disabled className="gate-btn locked-btn">
                  🔒 Requires {rank.name}
                </button>
              ) : (
                <button
                  className={`gate-btn ${!canAfford ? "disabled-skill" : ""}`}
                  disabled={!canAfford || !!activeRun}
                  onClick={() => enterGate(gate)}
                >
                  {!canAfford ? "Not enough stamina" : activeRun ? "Gate run active" : "Enter Gate"}
                </button>
              )}

              {isUnderpowered && !locked && (
                <p className="dim small">⚠ Recommended Power: {recommendedPower.toLocaleString()}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveRunCard({ activeRun, onAbandon }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(i);
  }, []);

  const elapsed = (Date.now() - activeRun.startedAt) / 1000;
  const remaining = Math.max(0, activeRun.durationSec - elapsed);
  const pct = Math.min(100, (elapsed / activeRun.durationSec) * 100);

  return (
    <div className="card active-run-card">
      <h3>Gate in Progress</h3>
      <p>Your party is fighting through the gate...</p>
      <div className="run-progress-bar">
        <div className="run-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="dim">⏱ {formatSecs(Math.ceil(remaining))} remaining</p>
      <button onClick={onAbandon} className="flee-btn">Abandon Run</button>
    </div>
  );
}

function getEquipTierColor(tierId) {
  const tier = EQUIP_TIERS.find((t) => t.id === tierId);
  return tier ? tier.color : "#ffd700";
}

function formatSecs(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}
