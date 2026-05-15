import { useState } from "react";
import { HUNTER_POOL, RARITY_COLOR, SUMMON_COST, PITY } from "../data/hunters.js";
import { rollHunter, rollStarterHunter, addHunterToTeam } from "../systems/gacha.js";
import { incrementCounter } from "../data/quests.js";

export default function HuntersScreen({ state, update }) {
  const [lastPulls, setLastPulls] = useState(null);
  const [animatingPull, setAnimatingPull] = useState(false);

  if (!state.huntersUnlocked) {
    const stagesToGo = Math.max(0, 11 - state.stage);
    return (
      <div className="page-panel">
        <h2>Hunter Summons</h2>
        <div className="card lock-card">
          <h3>🔒 Locked</h3>
          <p>The Summoning Hall is sealed to F-Rank novices.</p>
          <p className="dim">
            Push into <strong>Castle 2 (Stage 11)</strong> to unlock hunter summons
            and claim a free Hunter to aid your climb.
          </p>
          {stagesToGo > 0 && (
            <p className="dim small">
              {stagesToGo} stage{stagesToGo === 1 ? "" : "s"} to go.
            </p>
          )}
        </div>
      </div>
    );
  }

  function pullOnce() {
    if (state.crystals < SUMMON_COST.single.crystals) return;
    runPulls(1, SUMMON_COST.single.crystals);
  }

  function pullTen() {
    if (state.crystals < SUMMON_COST.ten.crystals) return;
    runPulls(10, SUMMON_COST.ten.crystals);
  }

  function claimFreeStarter() {
    if (!state.freeStarterPullAvailable || state.freeStarterPullClaimed) return;
    setAnimatingPull(true);
    setTimeout(() => {
      const { hunter } = rollStarterHunter();
      const existing = state.hunters.find((h) => h.id === hunter.id);
      const isNew = !existing;
      const team = addHunterToTeam(state.hunters, hunter);

      update((s) => ({
        ...s,
        hunters: team,
        freeStarterPullAvailable: false,
        freeStarterPullClaimed: true,
      }));
      setLastPulls([{ hunter, isNew, isStarter: true }]);
      setAnimatingPull(false);
    }, 600);
  }

  function runPulls(count, cost) {
    setAnimatingPull(true);
    setTimeout(() => {
      let pity = { ...state.pity };
      let team = [...state.hunters];
      const results = [];

      for (let i = 0; i < count; i++) {
        const { hunter, updatedPity } = rollHunter(pity);
        pity = updatedPity;
        const existing = team.find((h) => h.id === hunter.id);
        const isNew = !existing;
        team = addHunterToTeam(team, hunter);
        results.push({ hunter, isNew });
      }

      update((s) => {
        // Quest hook: hunter summons
        const counters = s.quests?.counters || {};
        const questList = s.quests?.list || [];
        const inc = incrementCounter(counters, questList, "hunterSummons", count);
        // Also goldSpent... wait, summons cost crystals not gold. So no goldSpent.

        return {
          ...s,
          crystals: s.crystals - cost,
          hunters: team,
          pity,
          totalPulls: s.totalPulls + count,
          quests: { counters: inc.counters, list: inc.quests },
        };
      });
      setLastPulls(results);
      setAnimatingPull(false);
    }, 600);
  }

  return (
    <div className="page-panel">
      <h2>Hunter Summons</h2>

      {state.freeStarterPullAvailable && !state.freeStarterPullClaimed && (
        <div className="card starter-pull-card">
          <h3>🎁 Welcome to the Hall</h3>
          <p>The Association grants every new Hunter one free Summon.</p>
          <p className="dim small">Common or Rare guaranteed — fate decides which.</p>
          <button
            onClick={claimFreeStarter}
            disabled={animatingPull}
            className="starter-pull-btn"
          >
            Claim Free Summon
          </button>
        </div>
      )}

      <div className="card pity-card">
        <div className="pity-row">
          <span>Total Pulls</span>
          <strong>{state.totalPulls}</strong>
        </div>
        <div className="pity-row">
          <span>Next Epic+ in</span>
          <strong>{Math.max(0, PITY.epicAt - state.pity.pullsSinceEpic)}</strong>
        </div>
        <div className="pity-row">
          <span>Next Legendary in</span>
          <strong>{Math.max(0, PITY.legendaryAt - state.pity.pullsSinceLegendary)}</strong>
        </div>
      </div>

      <div className="summon-buttons">
        <button
          onClick={pullOnce}
          disabled={state.crystals < SUMMON_COST.single.crystals || animatingPull}
          className={state.crystals < SUMMON_COST.single.crystals ? "disabled-skill" : ""}
        >
          <span>Summon ×1</span>
          <strong>{SUMMON_COST.single.crystals} 💎</strong>
        </button>
        <button
          onClick={pullTen}
          disabled={state.crystals < SUMMON_COST.ten.crystals || animatingPull}
          className={state.crystals < SUMMON_COST.ten.crystals ? "disabled-skill" : ""}
        >
          <span>Summon ×10</span>
          <strong>{SUMMON_COST.ten.crystals} 💎</strong>
        </button>
      </div>

      {lastPulls && (
        <div className="pull-results">
          <h3>{lastPulls[0]?.isStarter ? "Welcome, Hunter!" : "Summoned!"}</h3>
          <div className="pull-grid">
            {lastPulls.map((res, i) => (
              <div
                key={i}
                className={`pull-card ${res.hunter.rarity.toLowerCase()}`}
                style={{ borderColor: RARITY_COLOR[res.hunter.rarity] }}
              >
                <div className="pull-rarity" style={{ color: RARITY_COLOR[res.hunter.rarity] }}>
                  {res.hunter.rarity}
                </div>
                <strong>{res.hunter.name}</strong>
                <p className="dim small">{res.hunter.trait}</p>
                {res.isNew ? (
                  <span className="new-tag">NEW</span>
                ) : (
                  <span className="dupe-tag">+1 LVL</span>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setLastPulls(null)}>Close</button>
        </div>
      )}

      <h3 className="section-h">Your Roster ({state.hunters.length}/{HUNTER_POOL.length})</h3>
      <div className="hunter-grid">
        {state.hunters.length === 0 && <p>No hunters summoned yet. Pull to build your team.</p>}
        {state.hunters.map((hunter) => (
          <div
            key={hunter.id}
            className={`hunter-card ${hunter.rarity.toLowerCase()}`}
            style={{ borderColor: RARITY_COLOR[hunter.rarity] }}
          >
            <h3>{hunter.name}</h3>
            <p style={{ color: RARITY_COLOR[hunter.rarity], fontWeight: 900 }}>
              {hunter.rarity}
            </p>
            <p>Level {hunter.level}</p>
            <p className="dim">DMG: {hunter.baseDamage * hunter.level}</p>
            <p className="dim small">{hunter.trait}</p>
          </div>
        ))}
      </div>

      <h3 className="section-h">Summon Rates</h3>
      <div className="summon-rates">
        <p style={{ color: RARITY_COLOR.Common }}>Common — 60%</p>
        <p style={{ color: RARITY_COLOR.Rare }}>Rare — 28%</p>
        <p style={{ color: RARITY_COLOR.Epic }}>Epic — 10%</p>
        <p style={{ color: RARITY_COLOR.Legendary }}>Legendary — 2%</p>
      </div>
    </div>
  );
}
