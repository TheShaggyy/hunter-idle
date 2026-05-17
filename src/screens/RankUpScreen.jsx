import { useEffect, useState, useRef } from "react";
import { RANKS, getRankIndex, getEligibleRank } from "../data/ranks.js";
import { getTotalDamage } from "../systems/combat.js";
import { getAllBuffs } from "../systems/equipment.js";
import { useCombatLoop } from "../hooks/useCombatLoop.js";
import { getRankCeiling } from "../data/awakening.js";
import {
  getPlayerMaxHp,
  getRankUpGatekeeperAttack,
} from "../systems/health.js";

// Rank-Up Dungeon — a focused 90-second mini-fight.
// Boss HP scales to next rank's powerRequired; Gatekeeper now hits back, so
// you can die. Player HP refills to max on every attempt. Death and timeout
// are both failure states; only kill = ascension.
//
// Stage used for the mitigation curve is the player's CURRENT stage —
// underleveled players get little defensive benefit; deep-stage geared
// players get the value they paid for.

const TIME_LIMIT_SEC = 90;
const STAMINA_COST = 30;

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
  const nextRankIdx = rankIdx + 1;
  const eligible = getEligibleRank(state.stage, power, ceiling);
  const eligibleIdx = getRankIndex(eligible.id);

  const canStart = eligibleIdx > rankIdx && !!nextRank;
  const ceilingReached = nextRank && rankIdx >= ceilingIdx;

  // Boss + player stats
  const bossMaxHp = nextRank ? Math.max(500, nextRank.powerRequired * 4) : 0;
  const gatekeeperAttack = nextRank ? getRankUpGatekeeperAttack(nextRankIdx) : 0;
  const playerMaxHp = getPlayerMaxHp(state, buffs.equipHpBonus);
  const playerDefense = buffs.equipDefense;

  // Local fight state — bossHp lives here (hook doesn't track enemy HP).
  const [running, setRunning] = useState(false);
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [floatingTexts, setFloatingTexts] = useState([]);

  // Refs for live reads inside hook callbacks.
  const bossHpRef = useRef(bossMaxHp);
  bossHpRef.current = bossHp;
  const stateRef = useRef(state);
  stateRef.current = state;
  const totalDmgRef = useRef(totalDamage);
  totalDmgRef.current = totalDamage;
  const playerDefenseRef = useRef(playerDefense);
  playerDefenseRef.current = playerDefense;
  const stageRef = useRef(state.stage);
  stageRef.current = state.stage;

  // The fight. Hook owns: player HP, timer, outcome, defeat-fire.
  // We own: boss HP, victory detection (signaled via combat.endRun).
  // `combat` is referenced inside onAttack — that's safe because the arrow
  // only accesses `combat` when called (next tick), by which time it's been
  // assigned. Capturing a not-yet-assigned const in a closure is legal in JS.
  const combat = useCombatLoop({
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
        combat.endRun("victory");
        return;
      }
      setBossHp(newHp);
    },

    // Mode B fields — this is what makes the Gatekeeper hit back.
    playerMaxHp,
    getPlayerDefense: () => playerDefenseRef.current,
    getEnemyAttack: () => gatekeeperAttack,
    getEnemyStage: () => stageRef.current,
    timeLimitSec: TIME_LIMIT_SEC,
    onDefeat: () => {
      // Death or timeout both flow through onDefeat. The hook has already
      // set its outcome; we just need to release `running` so the UI shows
      // the failure card instead of the arena.
      setRunning(false);
    },
  });

  const outcome = combat?.outcome ?? null;
  const playerHp = combat?.playerHp ?? playerMaxHp;
  const remaining = combat?.remainingSec ?? TIME_LIMIT_SEC;

  // When the player wins, the hook sets outcome='victory' via endRun() but
  // doesn't flip our local `running` flag. Do that here so the arena card
  // swaps to the trial-cleared card on the next render.
  useEffect(() => {
    if (running && outcome === "victory") {
      setRunning(false);
    }
  }, [running, outcome]);

  function start() {
    if (!canStart) return;
    if (state.stamina < STAMINA_COST) return;
    setBossHp(bossMaxHp);
    setRunning(true);
    update((s) => ({ ...s, stamina: s.stamina - STAMINA_COST }));
  }

  function claimRankUp() {
    if (outcome !== "victory") return;
    update((s) => ({ ...s, rank: eligible.id }));
    onClose?.();
  }

  function retry() {
    if (state.stamina < STAMINA_COST) return;
    setBossHp(bossMaxHp);
    setRunning(true);
    update((s) => ({ ...s, stamina: s.stamina - STAMINA_COST }));
  }

  const bossHpPct = (bossHp / Math.max(1, bossMaxHp)) * 100;
  const playerHpPct = (playerHp / Math.max(1, playerMaxHp)) * 100;
  const lowHp = playerHpPct <= 25;

  // ---- Early-exit panels ----

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

  // ---- Main fight panel ----

  return (
    <div className="page-panel">
      <h2>Rank-Up Dungeon</h2>

      <div className="card rankup-prebrief">
        <p>
          Ascend to <strong style={{ color: nextRank.color }}>{nextRank.name}</strong>
        </p>
        <p className="dim small">
          Defeat the Gatekeeper within {TIME_LIMIT_SEC}s. Costs {STAMINA_COST} ⚡ per attempt.
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
          <p>Boss Attack: {gatekeeperAttack}/sec</p>
          <p>Your DPS: {totalDamage.toLocaleString()}/sec</p>
          <p>Your HP: {playerMaxHp.toLocaleString()} · DEF {playerDefense}</p>
          <p className="dim small">
            Estimated kill time: {Math.ceil(bossMaxHp / Math.max(1, totalDamage))}s
          </p>
          <button
            onClick={start}
            disabled={!canStart || state.stamina < STAMINA_COST}
            className={!canStart || state.stamina < STAMINA_COST ? "disabled-skill" : "boss-btn"}
          >
            {state.stamina < STAMINA_COST ? "Not enough stamina" : `Begin Trial (${STAMINA_COST} ⚡)`}
          </button>
          <button onClick={onClose} className="flee-btn" style={{ marginTop: 8 }}>Cancel</button>
        </div>
      )}

      {running && (
        <div className="card rankup-arena">
          <div className="rankup-timer">⏱ {Math.ceil(remaining)}s</div>
          <div className={`rankup-boss-sprite ${lowHp ? "danger-pulse" : ""}`}>👹</div>

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

            <div className="hp-label" style={{ marginTop: 10 }}>
              <span>{lowHp ? "⚠ Your HP" : "Your HP"}</span>
              <span>{Math.max(0, Math.ceil(playerHp)).toLocaleString()} / {playerMaxHp.toLocaleString()}</span>
            </div>
            <div className="hp-bar">
              <div
                className={`hp-fill player-hp ${lowHp ? "danger" : ""}`}
                style={{ width: `${Math.max(0, playerHpPct)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {outcome === "victory" && (
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
            <button
              onClick={retry}
              disabled={state.stamina < STAMINA_COST}
              className={state.stamina < STAMINA_COST ? "disabled-skill" : "boss-btn"}
            >
              {state.stamina < STAMINA_COST ? "Not enough stamina" : `Try Again (${STAMINA_COST} ⚡)`}
            </button>
            <button onClick={onClose} className="flee-btn">Back</button>
          </div>
        </div>
      )}

      {outcome === "death" && (
        <div className="card">
          <h3 style={{ color: "#ff174f" }}>💀 Defeated</h3>
          <p>The Gatekeeper struck you down. Upgrade your armor and vitality before another attempt.</p>
          <p className="dim small">
            Tip: armor grants both HP and Defense. Defense reduces incoming hits via diminishing returns.
          </p>
          <div className="skill-row">
            <button
              onClick={retry}
              disabled={state.stamina < STAMINA_COST}
              className={state.stamina < STAMINA_COST ? "disabled-skill" : "boss-btn"}
            >
              {state.stamina < STAMINA_COST ? "Not enough stamina" : `Try Again (${STAMINA_COST} ⚡)`}
            </button>
            <button onClick={onClose} className="flee-btn">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}