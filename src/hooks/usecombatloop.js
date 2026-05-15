import { useEffect, useRef } from "react";
import { rollCrit } from "../systems/combat.js";

// Shared combat tick driver. Owned by hook:
//   - the setInterval
//   - the crit + active-skill-multiplier math (same rules everywhere)
//   - reading live values via refs so a fast-changing state doesn't stale the loop
//
// Owned by the caller:
//   - what counts as "the enemy" (their HP lives wherever the caller wants it)
//   - what to do with the damage (update game state, update local state, both)
//   - floating-text rendering (callers vary on animation timing/visuals)
//   - victory / defeat / timeout decisions
//
// Why this matters: BattleScreen, RankUpScreen, and (future) Gate fights all
// share the player-attacks-once-per-tick rule with crits and Berserk, but
// disagree about literally everything else. This hook captures only what they
// share. Future step 4 will extend with player HP / enemy damage; existing
// callers won't need to change unless they want death.
//
// Contract:
//   useCombatLoop({
//     enabled,        // boolean — when false, no ticks. Use to pause.
//     intervalMs,     // default 1000. Don't change this casually; damage
//                     //   numbers across the game are tuned to per-second ticks.
//     getBaseDamage,  // () => number  — caller computes their pre-crit damage
//     getBuffs,       // () => buffs    — needs .critBonus and .activeSkillMult
//     onAttack,       // ({ damage, isCrit }) => void  — your hit lands here
//   })
//
// Notes:
//   - All four function props can change between renders; the hook re-reads
//     them via refs each tick so callers don't need to memoize.
//   - `enabled` is read live too — flipping it doesn't tear down the interval,
//     just skips ticks. This means you can pause/resume without losing pace.
export function useCombatLoop({
  enabled,
  intervalMs = 1000,
  getBaseDamage,
  getBuffs,
  onAttack,
}) {
  // Ref-mirror everything that can change so the interval body never closes
  // over stale values. This matches the pattern already used throughout the
  // codebase (see BattleScreen damageRef/stateRef/passiveGpmRef).
  const enabledRef = useRef(enabled);
  const getBaseDamageRef = useRef(getBaseDamage);
  const getBuffsRef = useRef(getBuffs);
  const onAttackRef = useRef(onAttack);

  enabledRef.current = enabled;
  getBaseDamageRef.current = getBaseDamage;
  getBuffsRef.current = getBuffs;
  onAttackRef.current = onAttack;

  useEffect(() => {
    const interval = setInterval(() => {
      if (!enabledRef.current) return;

      const baseDamage = getBaseDamageRef.current();
      const buffs = getBuffsRef.current();
      const critBonus = buffs?.critBonus ?? 0;
      const activeSkillMult = buffs?.activeSkillMult ?? 1;

      const { isCrit, mult } = rollCrit(critBonus);
      const damage = Math.floor(baseDamage * mult * activeSkillMult);

      onAttackRef.current({ damage, isCrit });
    }, intervalMs);

    return () => clearInterval(interval);
    // intervalMs intentionally the only dep — changing tick rate restarts the
    // loop, but changing damage/buffs/onAttack/enabled does not.
  }, [intervalMs]);
}