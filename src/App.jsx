import "./App.css";
import { useEffect, useState } from "react";
import { useGameState, deriveStats } from "./state/useGameState.js";
import TopHud from "./components/TopHud.jsx";
import BottomNav from "./components/BottomNav.jsx";
import OfflineRewardModal from "./components/OfflineRewardModal.jsx";
import AwakeningRevealModal from "./components/AwakeningRevealModal.jsx";
import BattleScreen from "./screens/BattleScreen.jsx";
import GatesScreen from "./screens/GatesScreen.jsx";
import HuntersScreen from "./screens/HuntersScreen.jsx";
import EquipScreen from "./screens/EquipScreen.jsx";
import GuildScreen from "./screens/GuildScreen.jsx";
import ShopScreen from "./screens/ShopScreen.jsx";
import { getRankById, getRankIndex } from "./data/ranks.js";

function App() {
  const { state, update, offlineReward, dismissOfflineReward, resetSave } = useGameState();
  const [activeTab, setActiveTab] = useState("battle");
  const stats = deriveStats(state);

  // Awakening reveal trigger: fires ONCE the first time the player's rank equals
  // their awakening ceiling AND awakeningRevealed is still false. This is the
  // narrative beat that introduces the prestige system. After dismissal we set
  // awakeningRevealed = true so it doesn't fire again on subsequent ceilings.
  const [showReveal, setShowReveal] = useState(false);
  useEffect(() => {
    if (state.awakeningRevealed) return;
    if (!state.rank || !stats.rankCeiling) return;
    const rankIdx = getRankIndex(state.rank);
    const ceilingIdx = getRankIndex(stats.rankCeiling);
    if (rankIdx >= ceilingIdx && ceilingIdx >= 0) {
      setShowReveal(true);
    }
  }, [state.rank, state.awakeningRevealed, stats.rankCeiling]);

  function dismissReveal() {
    setShowReveal(false);
    update({ awakeningRevealed: true });
  }

  const ceilingRankObj = stats.rankCeiling ? getRankById(stats.rankCeiling) : null;

  return (
    <div className="app">
      <OfflineRewardModal reward={offlineReward} onClaim={dismissOfflineReward} />
      <AwakeningRevealModal
        open={showReveal}
        ceilingRank={ceilingRankObj}
        onDismiss={dismissReveal}
      />
      <TopHud
        state={state}
        associationPower={stats.associationPower}
        playerMaxHp={stats.playerMaxHp}
        playerDefense={stats.playerDefense}
      />

      {activeTab === "battle" && <BattleScreen state={state} update={update} />}
      {activeTab === "gates" && (
        <GatesScreen state={state} update={update} associationPower={stats.associationPower} />
      )}
      {activeTab === "hunters" && <HuntersScreen state={state} update={update} />}
      {activeTab === "equip" && <EquipScreen state={state} update={update} />}
      {activeTab === "guild" && <GuildScreen state={state} update={update} />}
      {activeTab === "shop" && (
        <ShopScreen
          state={state}
          update={update}
          associationPower={stats.associationPower}
          resetSave={resetSave}
        />
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;