// CombatPortal: full-screen overlay that takes over the viewport when
// state.activeCombat is set. The arena where stage bosses, Castle Lords,
// Gates, and (eventually) Rank-Up dungeon all happen.
//
// STEP 6a: This is currently a stub. It mounts when activeCombat is set,
// shows a debug placeholder, and lets the player close it. No animation,
// no actual fight logic. Steps 6b-6e fill it in:
//   6b → warp-in / warp-out animations
//   6c → useCombatLoop wiring, HP bars, timer, damage floats
//   6d → BattleScreen wired to start stage boss fights via the portal
//   6e → Castle Lord-specific flow (free attempt per hour, etc.)

export default function CombatPortal({ state, update }) {
  if (!state.activeCombat) return null;
  const c = state.activeCombat;

  function close() {
    // Clear the portal. In later steps this will be triggered by victory/defeat,
    // and the player won't have a manual close button during the fight.
    update((s) => ({ ...s, activeCombat: null }));
  }

  return (
    <div className="combat-portal" style={{ "--portal-color": c.themeColor }}>
      <div className="combat-portal-stub">
        <h2>⚔ Combat Portal (stub)</h2>
        <p><strong>Kind:</strong> {c.kind}</p>
        <p><strong>Enemy:</strong> {c.enemySprite} {c.enemyName}</p>
        <p><strong>Enemy HP:</strong> {c.enemyMaxHp.toLocaleString()}</p>
        <p><strong>Enemy Attack:</strong> {c.enemyAttack}/sec</p>
        <p><strong>Time Limit:</strong> {c.timeLimitSec}s</p>
        <p><strong>Theme:</strong> <span style={{ color: c.themeColor }}>{c.themeColor}</span></p>
        <button onClick={close} className="flee-btn" style={{ marginTop: 20 }}>
          Close (debug)
        </button>
      </div>
    </div>
  );
}