import { useEffect, useRef, useState } from "react";
import { RANKS, getRankIndex, getEligibleRank } from "../data/ranks.js";
import { getTotalDamage } from "../systems/combat.js";
import { getAllBuffs } from "../systems/equipment.js";
import { useCombatLoop } from "../hooks/useCombatLoop.js";
import { getRankCeiling } from "../data/awakening.js";

// Rank-Up Dungeon — a focused 90-second mini-fight.
// Boss has 5x the HP of the current stage's Castle Lord, scaled to next-rank power.
// Win: ascend to the next rank (clamped by awakening ceiling).
// Lose/timeout: no penalty, just retry when ready.

const TIME_LIMIT_SEC = 90;

export default function RankUpScreen({ state, update, onClose }) {
  const buffs = getAllBuffs(state);
  const totalDamage = getTotalDamage({
    damageLevel: state.damageLevel,
    hunters: state.hunters,
    equipDamage: buffs.equipDamage,
  });
  const power = totalDamage + state.stage * 4 + state.hunters.length * 12;

  const rankIdx = getRankIndex(state.rank);
  const ceiling = getRankCeiling(state.awakeningLevel || 0);
  const ceilingIdx = getRankIndex(ceiling);
  const nextRank = RANKS[rankIdx + 1];
  const eligible = getEligibleRank(state.stage, power, ceiling);
  const eligibleIdx = getRankIndex(eligible.id);

  const canStart = eligibleIdx > rankIdx && !!nextRank;
  const ceilingReached = nextRank && rankIdx >= ceilingIdx;

  // Boss HP scales to the next rank's powerRequired so the fight feels like a wall.
  const bossMaxHp = nextRank ? Math.max(500, nextRank.powerRequired * 4) : 0;
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [, forceTick] = useState(0);
  const [outcome, setOutcome] = useState(null); // null | 'win' | 'timeout'
  const [floatingTexts, setFloatingTexts] = useState([]);

  const bossHpRef = useRef(bossMaxHp);
  bossHpRef.current = bossHp;
  const stateRef = useRef(state);
  stateRef.current = state;
  const totalDmgRef = useRef(totalDamage);
  totalDmgRef.current = totalDamage;

  // Damage tick: shared with BattleScreen. Crit + active skill mult handled inside.
  // We only apply damage; the timeout check lives in the effect below.
  useCombatLoop({
    enabled: running,
    getBaseDamage: () => totalDmgRef.current,
    getBuffs: () => getAllBuffs(stateRef.current),
    onAttack: ({ damage, isCrit }) => {
      const id = Date.now() + Math.random();
      const offsetX = (Math.random() - 0.5) * 40;
      setFloatingTexts((prev) => [...prev, { id, value: damage, isCrit, offsetX }]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
      }, 900);

      const newHp = bossHpRef.current - damage;
      if (newHp <= 0) {
        setBossHp(0);
        setRunning(false);
        setOutcome("win");
        return;
      }
      setBossHp(newHp);
    },
  });

  // Timeout watcher: separate from damage loop because timeouts can fire even
  // if no damage was dealt (e.g. if the player's DPS is 0 somehow), and we
  // want a precise expiry rather than "checked on the next tick."
  useEffect(() => {
    if (!running) return;
    const expiresIn = TIME_LIMIT_SEC * 1000 - (Date.now() - startedAt);
    if (expiresIn <= 0) {
      setRunning(false);
      setOutcome("timeout");
      return;
    }
    const t = setTimeout(() => {
      setRunning(false);
      setOutcome("timeout");
    }, expiresIn);
    return () => clearTimeout(t);
  }, [running, startedAt]);

  // 250ms cosmetic re-render so the "Xs left" countdown updates smoothly even
  // when no other state is changing.
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(i);
  }, [running]);

  function start() {
    if (!canStart) return;
    if (state.stamina < 30) return;
    setBossHp(bossMaxHp);
    setOutcome(null);
    setStartedAt(Date.now());
    setRunning(true);
    update((s) => ({ ...s, stamina: s.stamina - 30 }));
  }

  function claimRankUp() {
    if (outcome !== "win") return;
    update((s) => ({ ...s, rank: eligible.id }));
    setOutcome(null);
    onClose?.();
  }

  function retry() {
    setOutcome(null);
    setBossHp(bossMaxHp);
  }

  const elapsed = running ? (Date.now() - startedAt) / 1000 : 0;
  const remaining = Math.max(0, TIME_LIMIT_SEC - elapsed);
  const bossHpPct = (bossHp / Math.max(1, bossMaxHp)) * 100;

  if (ceilingReached) {
    return (
      <div className="page-panel">
        <h2>Rank-Up Dungeon</h2>
        <div className="card">
          <h3>🔒 Ceiling Reached</h3>
          <p>
            You stand at <strong style={{ color: RANKS[ceilingIdx].color }}>
              {RANKS[ceilingIdx].name}
            </strong> — the limit of your current awakening.
          </p>
          <p className="dim">Awaken in the Hub to raise your ceiling and continue your ascent.</p>
          <button onClick={onClose} className="flee-btn">Back</button>
        </div>
      </div>
    );
  }

  if (!nextRank) {
    return (
      <div className="page-panel">
        <h2>Rank-Up Dungeon</h2>
        <div className="card">
          <p style={{ color: "#ff174f", fontWeight: 900 }}>
            ✨ You have reached MONARCH — the highest rank.
          </p>
          <button onClick={onClose} className="flee-btn">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-panel">
      <h2>Rank-Up Dungeon</h2>

      <div className="card rankup-prebrief">
        <p>
          Ascend to <strong style={{ color: nextRank.color }}>{nextRank.name}</strong>
        </p>
        <p className="dim small">
          Defeat the gatekeeper within {TIME_LIMIT_SEC}s. Costs 30 ⚡ per attempt.
        </p>
        {!canStart && (
          <p className="dim small">
            Requires Stage {nextRank.stageRequired} & Power {nextRank.powerRequired.toLocaleString()}.
          </p>
        )}
      </div>

      {!running && outcome === null && (
        <div className="card">
          <p>Boss HP: {bossMaxHp.toLocaleString()}</p>
          <p>Your DPS: {totalDamage.toLocaleString()}/sec</p>
          <p className="dim small">
            Estimated kill time: {Math.ceil(bossMaxHp / Math.max(1, totalDamage))}s
          </p>
          <button
            onClick={start}
            disabled={!canStart || state.stamina < 30}
            className={!canStart || state.stamina < 30 ? "disabled-skill" : "boss-btn"}
          >
            {state.stamina < 30 ? "Not enough stamina" : "Begin Trial (30 ⚡)"}
          </button>
          <button onClick={onClose} className="flee-btn" style={{ marginTop: 8 }}>Cancel</button>
        </div>
      )}

      {running && (
        <div className="card rankup-arena">
          <div className="rankup-timer">⏱ {Math.ceil(remaining)}s</div>
          <div className="rankup-boss-sprite">👹</div>

          <div className="floating-text-container">
            {floatingTexts.map((t) => (
              <div
                key={t.id}
                className={`floating-text ${t.isCrit ? "crit" : ""}`}
                style={{ "--offset-x": `${t.offsetX}px` }}
              >
                {t.isCrit && <span className="crit-label">CRIT</span>}
                -{t.value.toLocaleString()}
              </div>
            ))}
          </div>

          <div className="enemy-hp-box">
            <div className="hp-label">
              <span>Gatekeeper HP</span>
              <span>{Math.max(0, bossHp).toLocaleString()} / {bossMaxHp.toLocaleString()}</span>
            </div>
            <div className="hp-bar">
              <div
                className="hp-fill boss-hp"
                style={{ width: `${Math.max(0, bossHpPct)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {outcome === "win" && (
        <div className="card reward-card">
          <h3>Trial Cleared!</h3>
          <p>You have ascended to <strong style={{ color: nextRank.color }}>{nextRank.name}</strong>.</p>
          <button onClick={claimRankUp}>Accept Promotion</button>
        </div>
      )}

      {outcome === "timeout" && (
        <div className="card">
          <h3>Time's Up</h3>
          <p>The Gatekeeper repelled you. Grow stronger and return.</p>
          <div className="skill-row">
            <button onClick={retry} className="boss-btn">Try Again (30 ⚡)</button>
            <button onClick={onClose} className="flee-btn">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}