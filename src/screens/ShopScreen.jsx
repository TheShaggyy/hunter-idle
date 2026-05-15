import { useState } from "react";
import { SPECIAL_DUNGEONS, getTrainingExpReward } from "../data/specialDungeons.js";
import { RANKS, getRankIndex, getEligibleRank, getRankById } from "../data/ranks.js";
import { getAllBuffs } from "../systems/equipment.js";
import { getRankCeiling, canAwaken } from "../data/awakening.js";
import RankUpScreen from "./RankUpScreen.jsx";
import AwakeningScreen from "./AwakeningScreen.jsx";
import SkillsScreen from "./SkillsScreen.jsx";
import QuestsScreen from "./QuestsScreen.jsx";

// Hub screen — the central directory.
// Houses sub-screens for Rank-Up Dungeon, Skills, Quests, Awakening,
// plus Training Grounds and Essence Trials.

export default function ShopScreen({ state, update, associationPower, resetSave }) {
  const [subscreen, setSubscreen] = useState(null); // null | 'rankup' | 'skills' | 'quests' | 'awakening'

  if (subscreen === "rankup") {
    return <RankUpScreen state={state} update={update} onClose={() => setSubscreen(null)} />;
  }
  if (subscreen === "skills") {
    return <SkillsScreen state={state} update={update} onClose={() => setSubscreen(null)} />;
  }
  if (subscreen === "quests") {
    return <QuestsScreen state={state} update={update} onClose={() => setSubscreen(null)} />;
  }
  if (subscreen === "awakening") {
    return <AwakeningScreen state={state} update={update} onClose={() => setSubscreen(null)} />;
  }

  const rankIdx = getRankIndex(state.rank);
  const ceiling = getRankCeiling(state.awakeningLevel || 0);
  const ceilingIdx = getRankIndex(ceiling);
  const eligible = getEligibleRank(state.stage, associationPower, ceiling);
  const eligibleIdx = getRankIndex(eligible.id);
  const canRankUp = eligibleIdx > rankIdx;
  const nextRank = RANKS[rankIdx + 1];
  const buffs = getAllBuffs(state);
  const awakenReady = canAwaken(state);

  // Count completed-but-unclaimed quests for the badge
  const unclaimedQuests = (state.quests?.list || []).filter(
    (q) => q.completed && !q.claimed
  ).length;

  function doTraining() {
    if (state.trainingDoneToday) return;
    if (state.stamina < 10) return;

    const expGold = Math.floor(getTrainingExpReward(rankIdx) * 5 * buffs.goldMult);
    update((s) => ({
      ...s,
      stamina: s.stamina - 10,
      gold: s.gold + expGold,
      trainingDoneToday: true,
    }));
  }

  function doEssenceTrial() {
    if (state.essenceTrialsToday >= 3) return;
    if (state.stamina < 20) return;
    const essenceGain = 20 + rankIdx * 15;
    update((s) => ({
      ...s,
      stamina: s.stamina - 20,
      essence: s.essence + essenceGain,
      essenceTrialsToday: s.essenceTrialsToday + 1,
    }));
  }

  return (
    <div className="page-panel">
      <h2>Hub</h2>

      {/* Awakening callout — only when awaken is ready */}
      {awakenReady && (
        <div
          className="card awaken-banner-card"
          onClick={() => setSubscreen("awakening")}
        >
          <h3>✨ The System Calls You</h3>
          <p>You have reached your awakening ceiling. Step beyond.</p>
        </div>
      )}

      <div className="hub-nav-grid">
        <button
          className="hub-nav-btn"
          onClick={() => setSubscreen("quests")}
        >
          <span className="hub-nav-icon">📜</span>
          <strong>Daily Quests</strong>
          {unclaimedQuests > 0 && (
            <span className="hub-badge">{unclaimedQuests}</span>
          )}
        </button>
        <button
          className="hub-nav-btn"
          onClick={() => setSubscreen("skills")}
        >
          <span className="hub-nav-icon">🌀</span>
          <strong>Skills</strong>
        </button>
        <button
          className="hub-nav-btn"
          onClick={() => setSubscreen("rankup")}
          disabled={!canRankUp || rankIdx >= ceilingIdx}
        >
          <span className="hub-nav-icon">🏆</span>
          <strong>Rank-Up Dungeon</strong>
          {!canRankUp && <span className="dim small">Locked</span>}
        </button>
        <button
          className={`hub-nav-btn ${awakenReady ? "ready" : ""}`}
          onClick={() => setSubscreen("awakening")}
        >
          <span className="hub-nav-icon">✨</span>
          <strong>The System</strong>
          <span className="dim small">⚪ {state.systemCoins || 0}</span>
        </button>
      </div>

      <h3 className="section-h">Special Dungeons</h3>

      <div className="card special-dungeon-card">
        <h3>{SPECIAL_DUNGEONS.TRAINING_GROUNDS.icon} Training Grounds</h3>
        <p>{SPECIAL_DUNGEONS.TRAINING_GROUNDS.description}</p>
        <p className="dim small">Reward: bonus Gold + EXP · Cost: 10 ⚡</p>
        <button
          onClick={doTraining}
          disabled={state.trainingDoneToday || state.stamina < 10}
          className={state.trainingDoneToday ? "disabled-skill" : ""}
        >
          {state.trainingDoneToday ? "✓ Done today — resets at midnight" : "Train (10 ⚡)"}
        </button>
      </div>

      <div className="card special-dungeon-card">
        <h3>{SPECIAL_DUNGEONS.ESSENCE_TRIAL.icon} Essence Trial</h3>
        <p>{SPECIAL_DUNGEONS.ESSENCE_TRIAL.description}</p>
        <p className="dim small">
          {3 - state.essenceTrialsToday}/3 runs left today · Cost: 20 ⚡
        </p>
        <button
          onClick={doEssenceTrial}
          disabled={state.essenceTrialsToday >= 3 || state.stamina < 20}
          className={state.essenceTrialsToday >= 3 ? "disabled-skill" : ""}
        >
          {state.essenceTrialsToday >= 3
            ? "✓ All runs used — resets at midnight"
            : `Run Trial (20 ⚡)`}
        </button>
      </div>

      <h3 className="section-h">Shop</h3>
      <div className="card coming-soon-card">
        <h3>💎 Crystal Bundles</h3>
        <p>Premium crystal packs and starter bundles.</p>
        <p className="dim">Coming soon — F2P-friendly with optional purchases.</p>
      </div>

      <h3 className="section-h">Dev</h3>
      <div className="card">
        <p className="dim small">Pre-alpha tools. Will be removed before launch.</p>
        <button
          onClick={() => {
            if (confirm("Wipe save and start over?")) resetSave();
          }}
          className="leave-btn"
        >
          Reset Save
        </button>
      </div>
    </div>
  );
}
