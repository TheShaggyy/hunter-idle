import { getRankById } from "../data/ranks.js";
import { getAwakeningTitle } from "../data/awakening.js";

export default function TopHud({ state, associationPower, playerMaxHp, playerDefense }) {
  const rank = getRankById(state.rank);
  const awakeningTitle = getAwakeningTitle(state.awakeningLevel || 0);

  return (
    <header className="top-hud">
      <div className="profile-box">
        <div
          className="avatar rank-avatar"
          style={{ "--rank-color": rank.color }}
        >
          {rank.id}
        </div>
        <div>
          <h1>Hunter Idle</h1>
          <p>
            <span style={{ color: rank.color }}>{rank.name}</span>
            <span className="dim"> · Power {formatNum(associationPower)}</span>
          </p>
          <p className="dim small">{awakeningTitle}</p>
          {/* Player vitals — only shown if computed (App always passes them post-Step 5). */}
          {(playerMaxHp != null) && (
            <p className="hud-vitals small">
              <span className="hud-hp">❤️ {formatNum(playerMaxHp)}</span>
              <span className="hud-def"> · 🛡️ {playerDefense ?? 0}</span>
            </p>
          )}
        </div>
      </div>

      <div className="resource-row">
        <div className="resource">🪙 {formatNum(state.gold)}</div>
        <div className="resource">💎 {formatNum(state.crystals)}</div>
        <div className="resource">✨ {formatNum(state.essence)}</div>
        <div className="resource">⚪ {formatNum(state.systemCoins || 0)}</div>
        <div className="resource">⚡ {state.stamina}</div>
      </div>
    </header>
  );
}

function formatNum(n) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0) + "M";
  return (n / 1_000_000_000).toFixed(1) + "B";
}