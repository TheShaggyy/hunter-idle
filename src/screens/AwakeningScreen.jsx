import { useState } from "react";
import {
  PERMANENT_UPGRADES,
  CEILING_BY_AWAKENING,
  getRankCeiling,
  canAwaken,
  getAwakeningRequirements,
  calculateSystemCoinsEarned,
  getAwakeningTitle,
  isInMonarchPlusTail,
  getUpgradeLevel,
} from "../data/awakening.js";
import { performAwakening } from "../systems/awakening.js";
import { getRankById } from "../data/ranks.js";

// AwakeningScreen — the prestige system.
// Shows: current state, requirements to awaken, System Coins balance,
// the permanent upgrade tree, and the big scary "Awaken" button.

export default function AwakeningScreen({ state, update, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const reqs = getAwakeningRequirements(state);
  const coinsToEarn = calculateSystemCoinsEarned(state);
  const eligible = canAwaken(state);
  const ceiling = getRankCeiling(state.awakeningLevel || 0);
  const ceilingRank = getRankById(ceiling);
  const inTail = isInMonarchPlusTail(state.awakeningLevel || 0);
  const nextCeiling = inTail
    ? "MONARCH" // Past Monarch, ceiling stays. Multipliers grow.
    : CEILING_BY_AWAKENING[Math.min((state.awakeningLevel || 0) + 1, CEILING_BY_AWAKENING.length - 1)];
  const nextCeilingRank = getRankById(nextCeiling);

  function doUpgrade(upgrade) {
    const lvl = getUpgradeLevel(state.permanentUpgrades, upgrade.id);
    if (lvl >= upgrade.maxLevel) return;
    const cost = upgrade.costAtLevel(lvl);
    if (state.systemCoins < cost) return;
    update((s) => ({
      ...s,
      systemCoins: s.systemCoins - cost,
      permanentUpgrades: {
        ...s.permanentUpgrades,
        [upgrade.id]: lvl + 1,
      },
    }));
  }

  function doAwaken() {
    update((s) => performAwakening(s));
    setConfirming(false);
    onClose?.();
  }

  return (
    <div className="page-panel">
      <h2>The System</h2>

      <div className="card awakening-status-card">
        <div className="awakening-level">
          <span className="dim small">Current</span>
          <h3>{getAwakeningTitle(state.awakeningLevel || 0)}</h3>
        </div>
        <div className="awakening-ceiling-row">
          <div>
            <span className="dim small">Ceiling</span>
            <strong style={{ color: ceilingRank.color }}>{ceilingRank.name}</strong>
          </div>
          <div>
            <span className="dim small">System Coins</span>
            <strong>⚪ {state.systemCoins?.toLocaleString() || 0}</strong>
          </div>
          <div>
            <span className="dim small">Lifetime</span>
            <strong>{state.awakeningCount || 0} awakenings</strong>
          </div>
        </div>
      </div>

      {/* Awakening eligibility / call to action */}
      <div className={`card awaken-cta-card ${eligible ? "ready" : ""}`}>
        <h3>{eligible ? "✨ Ready to Awaken" : "Not Yet Ready"}</h3>
        {eligible ? (
          <>
            <p>
              You will earn <strong style={{ color: "#ffd700" }}>⚪ {coinsToEarn}</strong> System Coins.
            </p>
            <p className="dim small">
              Next ceiling: <strong style={{ color: nextCeilingRank.color }}>{nextCeilingRank.name}</strong>
              {inTail && " (Monarch+ tail — new flavor title each awakening)"}
            </p>
            <p className="dim small awakening-warning">
              ⚠ Stage, rank, gold, crystals, essence, equipment, and main hunter damage will reset.
              Hunters and System Coins carry over.
            </p>
            {!confirming ? (
              <button onClick={() => setConfirming(true)} className="awaken-btn">
                Awaken
              </button>
            ) : (
              <div className="awaken-confirm-row">
                <button onClick={doAwaken} className="awaken-btn confirm">
                  Confirm Awakening
                </button>
                <button onClick={() => setConfirming(false)} className="flee-btn">
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="dim">
              Reach <strong style={{ color: ceilingRank.color }}>{ceilingRank.name}</strong> rank
              and stage <strong>{reqs.requiredStage}</strong> to awaken.
            </p>
            <ul className="awakening-reqs-list">
              <li className={reqs.rankOk ? "ok" : ""}>
                {reqs.rankOk ? "✓" : "✗"} Hold {ceilingRank.name}
              </li>
              <li className={reqs.stageOk ? "ok" : ""}>
                {reqs.stageOk ? "✓" : "✗"} Reach Stage {reqs.requiredStage} (currently {state.stage})
              </li>
            </ul>
          </>
        )}
      </div>

      {/* Permanent upgrade tree */}
      <h3 className="section-h">Permanent Upgrades</h3>
      <p className="dim small center">Spend System Coins. Effects compound across awakenings.</p>

      <div className="upgrade-tree">
        {PERMANENT_UPGRADES.map((upgrade) => {
          const lvl = getUpgradeLevel(state.permanentUpgrades, upgrade.id);
          const atMax = lvl >= upgrade.maxLevel;
          const cost = upgrade.costAtLevel(lvl);
          const canBuy = !atMax && state.systemCoins >= cost;

          return (
            <div key={upgrade.id} className="upgrade-tile">
              <div className="upgrade-head">
                <span className="upgrade-icon">{upgrade.icon}</span>
                <div>
                  <strong>{upgrade.name}</strong>
                  <p className="dim small">{upgrade.description}</p>
                </div>
              </div>
              <div className="upgrade-stats">
                <span className="dim small">
                  Level {lvl} / {upgrade.maxLevel}
                </span>
                <span className="dim small upgrade-current-effect">
                  Now: {upgrade.formatEffect(lvl)}
                </span>
                {!atMax && (
                  <span className="dim small">
                    Next: {upgrade.formatEffect(lvl + 1)}
                  </span>
                )}
              </div>
              <button
                onClick={() => doUpgrade(upgrade)}
                disabled={!canBuy}
                className={`upgrade-buy-btn ${atMax ? "maxed" : ""}`}
              >
                {atMax ? "MAX" : `⚪ ${cost.toLocaleString()}`}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onClose} className="flee-btn" style={{ marginTop: 12, width: "100%" }}>
        Back to Hub
      </button>
    </div>
  );
}
