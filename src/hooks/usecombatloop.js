import { useEffect, useRef, useState, useCallback } from "react";
import { rollCrit } from "../systems/combat.js";
import { computeIncomingDamage } from "../systems/health.js";

// Shared combat tick driver. Two modes, decided by what the caller passes:
//
//   MODE A — "lightweight" (Step 2 behavior, current BattleScreen idle loop):
//     Pass only enabled / getBaseDamage / getBuffs / onAttack.
//     Hook ticks once a second, computes crit + active-skill mult, hands the
//     final damage to onAttack. Nothing else. No HP. No death. No timer.
//
//   MODE B — "real fight" (RankUp, future Gate fights, future Lord fights):
//     Also pass playerMaxHp / getPlayerDefense / getEnemyAttack / timeLimitSec.
//     Hook now ALSO:
//       - tracks player HP internally (resets on enabled flip)
//       - applies enemy hits AFTER the player's strike each tick (player-first)
//       - fires onDefeat({ reason }) on HP <= 0 or timeout
//       - returns { playerHp, playerMaxHp, elapsed, outcome, endRun }
//
//   In Mode B, the caller still detects victory inside onAttack (because
//   "what counts as winning" varies wildly across screens) and signals by
//   calling endRun('victory'). After endRun (or onDefeat), the loop stops
//   ticking. Toggle enabled off→on to start a fresh run.
//
// Caller-owned, hook-shared:
//   - floating text rendering (animation, color, positioning)
//   - what to do with the player's damage roll
//   - victory detection + side effects (rewards, stage advance, etc.)
//
// All function props are read via refs each tick — no memoization needed.
//
// IMPORTANT: do not switch modes mid-life. A caller is either Mode A (never
// passes playerMaxHp) or Mode B (always passes it). Going A → B or B → A
// across renders would change the effect dependency graph in confusing ways.
export function useCombatLoop({
  enabled,
  intervalMs = 1000,
  getBaseDamage,
  getBuffs,
  onAttack,

  // Mode B opt-ins. Any one of these triggers HP tracking; if you pass
  // playerMaxHp you should also pass getEnemyAttack (otherwise the enemy
  // never hits back, which is probably not what you want).
  playerMaxHp = null,
  getPlayerDefense = null,
  getEnemyAttack = null,
  getEnemyStage = null,    // () => stage number, for the mitigation curve
  timeLimitSec = null,
  onTakeDamage = null,     // ({ rawDamage, mitigatedDamage }) => void
  onDefeat = null,         // ({ reason: 'death' | 'timeout' }) => void
}) {
  // ------- Ref-mirror everything that the interval body reads -------
  const enabledRef = useRef(enabled);
  const getBaseDamageRef = useRef(getBaseDamage);
  const getBuffsRef = useRef(getBuffs);
  const onAttackRef = useRef(onAttack);
  const playerMaxHpRef = useRef(playerMaxHp);
  const getPlayerDefenseRef = useRef(getPlayerDefense);
  const getEnemyAttackRef = useRef(getEnemyAttack);
  const getEnemyStageRef = useRef(getEnemyStage);
  const timeLimitSecRef = useRef(timeLimitSec);
  const onTakeDamageRef = useRef(onTakeDamage);
  const onDefeatRef = useRef(onDefeat);

  enabledRef.current = enabled;
  getBaseDamageRef.current = getBaseDamage;
  getBuffsRef.current = getBuffs;
  onAttackRef.current = onAttack;
  playerMaxHpRef.current = playerMaxHp;
  getPlayerDefenseRef.current = getPlayerDefense;
  getEnemyAttackRef.current = getEnemyAttack;
  getEnemyStageRef.current = getEnemyStage;
  timeLimitSecRef.current = timeLimitSec;
  onTakeDamageRef.current = onTakeDamage;
  onDefeatRef.current = onDefeat;

  // ------- Internal run state (only meaningful in Mode B) -------
  const isModeB = playerMaxHp != null;

  const [playerHp, setPlayerHp] = useState(playerMaxHp ?? 0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [outcome, setOutcome] = useState(null); // null | 'victory' | 'death' | 'timeout'

  // Mirror outcome into a ref so the tick body can short-circuit cleanly
  // without depending on a re-render between victory and the next tick.
  const outcomeRef = useRef(null);
  outcomeRef.current = outcome;

  const playerHpRef = useRef(playerMaxHp ?? 0);
  playerHpRef.current = playerHp;

  // Caller signals victory via this. We stop ticking and surface outcome.
  // The hook intentionally doesn't run "victory side effects" — that's the
  // caller's job (rewards, stage advance, etc.).
  const endRun = useCallback((reason = "victory") => {
    if (outcomeRef.current) return; // already over
    outcomeRef.current = reason;
    setOutcome(reason);
  }, []);

  // ------- Reset on enabled flipping from false → true (start a new run) -------
  // Edge-trigger: only fire on transition, not on every render where enabled=true.
  const wasEnabledRef = useRef(false);
  useEffect(() => {
    const prev = wasEnabledRef.current;
    wasEnabledRef.current = enabled;
    if (!prev && enabled && isModeB) {
      // Fresh run
      const maxHp = playerMaxHpRef.current ?? 0;
      playerHpRef.current = maxHp;
      outcomeRef.current = null;
      setPlayerHp(maxHp);
      setOutcome(null);
      setStartedAt(Date.now());
      setElapsedSec(0);
    }
    // Don't clear outcome on disable — the caller may still render a
    // "you died" panel after the run ends. Clearing happens on next enable.
  }, [enabled, isModeB]);

  // ------- The tick -------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!enabledRef.current) return;
      if (outcomeRef.current) return; // run is over, waiting for caller to reset

      // 1. Player attacks first.
      const baseDamage = getBaseDamageRef.current();
      const buffs = getBuffsRef.current();
      const critBonus = buffs?.critBonus ?? 0;
      const activeSkillMult = buffs?.activeSkillMult ?? 1;
      const { isCrit, mult } = rollCrit(critBonus);
      const damage = Math.floor(baseDamage * mult * activeSkillMult);

      onAttackRef.current({ damage, isCrit });

      // 1b. If the caller called endRun('victory') during onAttack, stop here —
      // the enemy got killed by that hit and shouldn't get a counter-swing.
      if (outcomeRef.current) return;

      // 2. Mode B only: enemy hits back. Apply mitigation, update HP, check death.
      if (isModeB) {
        const enemyAtkFn = getEnemyAttackRef.current;
        const defFn = getPlayerDefenseRef.current;
        const stageFn = getEnemyStageRef.current;
        const rawDamage = enemyAtkFn ? enemyAtkFn() : 0;
        const defense = defFn ? defFn() : 0;
        const stage = stageFn ? stageFn() : 0;

        if (rawDamage > 0) {
          const mitigated = computeIncomingDamage(rawDamage, defense, stage);
          const newHp = Math.max(0, playerHpRef.current - mitigated);
          playerHpRef.current = newHp;
          setPlayerHp(newHp);
          onTakeDamageRef.current?.({ rawDamage, mitigatedDamage: mitigated });

          if (newHp <= 0) {
            outcomeRef.current = "death";
            setOutcome("death");
            onDefeatRef.current?.({ reason: "death" });
            return;
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, isModeB]);

  // ------- Timeout watcher (Mode B with timeLimitSec) -------
  // Separate from the damage tick because timeouts should fire at the exact
  // expiry, not on the next 1s boundary.
  useEffect(() => {
    if (!isModeB) return;
    if (!enabled) return;
    if (timeLimitSec == null) return;
    if (outcome) return;
    if (!startedAt) return;

    const expiresIn = timeLimitSec * 1000 - (Date.now() - startedAt);
    if (expiresIn <= 0) {
      outcomeRef.current = "timeout";
      setOutcome("timeout");
      onDefeatRef.current?.({ reason: "timeout" });
      return;
    }
    const t = setTimeout(() => {
      if (outcomeRef.current) return;
      outcomeRef.current = "timeout";
      setOutcome("timeout");
      onDefeatRef.current?.({ reason: "timeout" });
    }, expiresIn);
    return () => clearTimeout(t);
  }, [isModeB, enabled, timeLimitSec, startedAt, outcome]);

  // ------- 250ms cosmetic re-render so elapsed/remaining countdowns are smooth -------
  // Cheap and only runs during an active Mode B fight.
  useEffect(() => {
    if (!isModeB) return;
    if (!enabled) return;
    if (outcome) return;
    if (!startedAt) return;
    const i = setInterval(() => {
      setElapsedSec((Date.now() - startedAt) / 1000);
    }, 250);
    return () => clearInterval(i);
  }, [isModeB, enabled, startedAt, outcome]);

  if (!isModeB) {
    // Mode A callers don't read the return value (matches Step 2 behavior).
    return undefined;
  }

  const remainingSec = timeLimitSec != null
    ? Math.max(0, timeLimitSec - elapsedSec)
    : null;

  return {
    playerHp,
    playerMaxHp: playerMaxHp ?? 0,
    elapsedSec,
    remainingSec,
    outcome,           // null while running, 'victory' | 'death' | 'timeout' after
    isOver: !!outcome,
    endRun,            // call with 'victory' from inside onAttack on enemy kill
  };
}