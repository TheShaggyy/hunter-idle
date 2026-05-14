import "./App.css";
import { useEffect, useRef, useState, useCallback } from "react";

const hunterPool = [
  { name: "Jin", rarity: "Common", baseDamage: 5, odds: 60 },
  { name: "Kael", rarity: "Rare", baseDamage: 15, odds: 25 },
  { name: "Riven", rarity: "Epic", baseDamage: 40, odds: 12 },
  { name: "Ashborn", rarity: "Legendary", baseDamage: 100, odds: 3 },
];

const gateThemes = [
  {
    name: "Grasslands Gate",
    enemy: "🐺",
    background: "grass-bg",
    particleClass: "particle-leaf",
    accent: "#5cff9b",
  },
  {
    name: "Desert Gate",
    enemy: "🦂",
    background: "desert-bg",
    particleClass: "particle-sand",
    accent: "#ffb24d",
  },
  {
    name: "Frozen Gate",
    enemy: "❄️",
    background: "ice-bg",
    particleClass: "particle-snow",
    accent: "#7adfff",
  },
  {
    name: "Inferno Gate",
    enemy: "🔥",
    background: "fire-bg",
    particleClass: "particle-ember",
    accent: "#ff6a3d",
  },
  {
    name: "Shadow Gate",
    enemy: "👁️",
    background: "shadow-bg",
    particleClass: "particle-shadow",
    accent: "#b873ff",
  },
];

// Idle-game style exponential cost scaling
function getDamageCost(level) {
  return Math.floor(50 * Math.pow(1.15, level));
}

function App() {
  const [activeTab, setActiveTab] = useState("battle");
  const hasLoaded = useRef(false);

  const [gold, setGold] = useState(0);
  const [stage, setStage] = useState(1);
  const [damageLevel, setDamageLevel] = useState(0);
  const [enemyHp, setEnemyHp] = useState(20);
  const [enemyMaxHp, setEnemyMaxHp] = useState(20);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [hunters, setHunters] = useState([]);
  const [offlineReward, setOfflineReward] = useState(null);
  const [hunterAttacking, setHunterAttacking] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [stageCleared, setStageCleared] = useState(false);
  const [particles, setParticles] = useState([]);

  // Derived stats
  const baseDamage = 5 + damageLevel * 5;
  const damageCost = getDamageCost(damageLevel);
  const recruitCost = 100;

  const totalHunterDamage = hunters.reduce(
    (sum, hunter) => sum + hunter.baseDamage * hunter.level,
    0
  );

  const totalDamage = baseDamage + totalHunterDamage;
  const associationPower = totalDamage + stage * 3 + hunters.length * 10;
  const currentTheme =
    gateThemes[Math.floor((stage - 1) / 10) % gateThemes.length];
  const isBossStage = stage % 10 === 0;
  const goldPerMinute = Math.max(5, Math.floor(totalDamage * 2 + stage * 5));

  function getStageHp(targetStage) {
    return targetStage % 10 === 0
      ? 300 + targetStage * 80
      : 20 + targetStage * 30;
  }

  // Use refs so the interval can read current values without rebuilding
  const totalDamageRef = useRef(totalDamage);
  const stageRef = useRef(stage);
  totalDamageRef.current = totalDamage;
  stageRef.current = stage;

  const spawnFloatingText = useCallback((value, isCrit) => {
    const id = Date.now() + Math.random();
    // Random horizontal offset so stacked numbers don't overlap perfectly
    const offsetX = (Math.random() - 0.5) * 40;
    setFloatingTexts((prev) => [...prev, { id, value, isCrit, offsetX }]);
    // Auto-remove after animation completes
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 900);
  }, []);

  // Combat tick — runs on a stable interval, reads latest values from refs
  useEffect(() => {
    const combatLoop = setInterval(() => {
      const dmg = totalDamageRef.current;

      // 15% crit chance, 2.5x damage
      const isCrit = Math.random() < 0.15;
      const finalDmg = isCrit ? Math.floor(dmg * 2.5) : dmg;

      spawnFloatingText(finalDmg, isCrit);

      // Trigger animations
      setHunterAttacking(true);
      setEnemyHit(true);
      setTimeout(() => setHunterAttacking(false), 220);
      setTimeout(() => setEnemyHit(false), 200);

      setEnemyHp((prev) => {
        const newHp = prev - finalDmg;

        if (newHp <= 0) {
          const currentStage = stageRef.current;
          const nextStage = currentStage + 1;
          const reward =
            currentStage % 10 === 0 ? currentStage * 75 : currentStage * 20;

          setGold((g) => g + reward);
          setStage(nextStage);
          setStageCleared(true);
          setTimeout(() => setStageCleared(false), 700);

          const scaledHp = getStageHp(nextStage);
          setEnemyMaxHp(scaledHp);
          return scaledHp;
        }

        return newHp;
      });
    }, 1000);

    return () => clearInterval(combatLoop);
  }, [spawnFloatingText]);

  // Ambient particles — generate based on theme
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now() + Math.random();
      const left = Math.random() * 100;
      const duration = 3 + Math.random() * 3;
      const delay = Math.random() * 0.5;
      const size = 4 + Math.random() * 6;
      setParticles((prev) => [
        ...prev.slice(-25),
        { id, left, duration, delay, size, themeClass: currentTheme.particleClass },
      ]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, (duration + delay) * 1000);
    }, 350);

    return () => clearInterval(interval);
  }, [currentTheme.particleClass]);

  // Save
  useEffect(() => {
    if (!hasLoaded.current) return;

    localStorage.setItem(
      "hunterIdleSave",
      JSON.stringify({
        gold,
        stage,
        damageLevel,
        hunters,
        lastPlayed: Date.now(),
      })
    );
  }, [gold, stage, damageLevel, hunters]);

  // Load
  useEffect(() => {
    const save = localStorage.getItem("hunterIdleSave");

    if (save) {
      const parsed = JSON.parse(save);

      const loadedGold = parsed.gold || 0;
      const loadedStage = parsed.stage || 1;
      // Backwards compat with old saves that used baseDamage directly
      const loadedDamageLevel =
        parsed.damageLevel ??
        (parsed.baseDamage ? Math.max(0, (parsed.baseDamage - 5) / 5) : 0);
      const loadedHunters = parsed.hunters || [];

      const loadedBaseDamage = 5 + loadedDamageLevel * 5;
      const loadedTeamDamage = loadedHunters.reduce(
        (sum, hunter) => sum + hunter.baseDamage * hunter.level,
        0
      );

      const loadedTotalDamage = loadedBaseDamage + loadedTeamDamage;
      const loadedGoldPerMinute = Math.max(
        5,
        Math.floor(loadedTotalDamage * 2 + loadedStage * 5)
      );

      const lastPlayed = parsed.lastPlayed || Date.now();
      const secondsAway = Math.floor((Date.now() - lastPlayed) / 1000);
      const minutesAway = Math.floor(secondsAway / 60);
      const cappedMinutes = Math.min(minutesAway, 480);
      const earnedOfflineGold = cappedMinutes * loadedGoldPerMinute;

      setGold(loadedGold + earnedOfflineGold);
      setStage(loadedStage);
      setDamageLevel(loadedDamageLevel);
      setHunters(loadedHunters);

      const scaledHp = getStageHp(loadedStage);
      setEnemyHp(scaledHp);
      setEnemyMaxHp(scaledHp);

      if (earnedOfflineGold > 0) {
        setOfflineReward({
          gold: earnedOfflineGold,
          minutes: cappedMinutes,
        });
      }
    }

    hasLoaded.current = true;
  }, []);

  function upgradeDamage() {
    if (gold < damageCost) return;
    setGold(gold - damageCost);
    setDamageLevel(damageLevel + 1);
  }

  function rollHunter() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const hunter of hunterPool) {
      cumulative += hunter.odds;
      if (roll <= cumulative) return hunter;
    }
    return hunterPool[0];
  }

  function recruitHunter() {
    if (gold < recruitCost) return;
    setGold(gold - recruitCost);
    const pulledHunter = rollHunter();

    setHunters((prev) => {
      const existing = prev.find((h) => h.name === pulledHunter.name);
      if (existing) {
        return prev.map((h) =>
          h.name === pulledHunter.name ? { ...h, level: h.level + 1 } : h
        );
      }
      return [...prev, { ...pulledHunter, level: 1 }];
    });
  }

  function rarityClass(rarity) {
    return rarity.toLowerCase();
  }

  function closeOfflineReward() {
    setOfflineReward(null);
  }

  const hpPercent = (enemyHp / enemyMaxHp) * 100;

  return (
    <div className="app">
      {offlineReward && (
        <div className="modal-backdrop">
          <div className="offline-modal">
            <h2>While You Were Away</h2>
            <p>Your Association kept clearing gates.</p>
            <div className="reward-amount">+{offlineReward.gold} Gold</div>
            <p>Time counted: {offlineReward.minutes} minutes</p>
            <button onClick={closeOfflineReward}>Claim</button>
          </div>
        </div>
      )}

      <header className="top-hud">
        <div className="profile-box">
          <div className="avatar">H</div>
          <div>
            <h1>Hunter Idle</h1>
            <p>Association Power: {associationPower}</p>
          </div>
        </div>

        <div className="resource-row">
          <div className="resource">🪙 {gold}</div>
          <div className="resource">⚔️ Stage {stage}</div>
        </div>
      </header>

      {activeTab === "battle" && (
        <>
          <section
            className={`runner-arena ${currentTheme.background}`}
            style={{ "--theme-accent": currentTheme.accent }}
          >
            <div className="gate-banner">
              <span>Stage {stage}</span>
              <strong>{currentTheme.name}</strong>
              {isBossStage && <em>BOSS</em>}
            </div>

            <div className="moving-bg bg-layer-one" />
            <div className="moving-bg bg-layer-two" />

            {/* Ambient theme particles */}
            <div className="particle-layer">
              {particles.map((p) => (
                <span
                  key={p.id}
                  className={`particle ${p.themeClass}`}
                  style={{
                    left: `${p.left}%`,
                    animationDuration: `${p.duration}s`,
                    animationDelay: `${p.delay}s`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                  }}
                />
              ))}
            </div>

            {stageCleared && (
              <div className="stage-cleared-flash">
                <span>Stage Cleared!</span>
              </div>
            )}

            <div className="battle-lane">
              <div
                className={`runner hunter-runner ${
                  hunterAttacking ? "attacking" : ""
                }`}
              >
                <div className="sprite hunter-sprite">⚔️</div>
                <p>Main Hunter</p>
              </div>

              <div className="runner enemy-runner">
                <div
                  className={`sprite enemy-sprite ${
                    isBossStage ? "boss" : ""
                  } ${enemyHit ? "hit" : ""}`}
                >
                  {currentTheme.enemy}
                </div>

                <div className="floating-text-container">
                  {floatingTexts.map((t) => (
                    <div
                      key={t.id}
                      className={`floating-text ${t.isCrit ? "crit" : ""}`}
                      style={{ "--offset-x": `${t.offsetX}px` }}
                    >
                      {t.isCrit && <span className="crit-label">CRIT</span>}
                      -{t.value}
                    </div>
                  ))}
                </div>

                <p>{isBossStage ? "Gate Boss" : "Gate Monster"}</p>
              </div>
            </div>

            <div className="enemy-hp-box">
              <div className="hp-label">
                <span>Enemy HP</span>
                <span>
                  {Math.max(0, enemyHp)} / {enemyMaxHp}
                </span>
              </div>

              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{
                    width: `${Math.max(0, hpPercent)}%`,
                    filter:
                      hpPercent < 25 ? "brightness(1.3) saturate(1.4)" : "none",
                  }}
                />
              </div>
            </div>
          </section>

          <section className="combat-panel">
            <div className="combat-stats">
              <div>
                <span>Total DMG</span>
                <strong>{totalDamage}</strong>
              </div>
              <div>
                <span>Team DMG</span>
                <strong>{totalHunterDamage}</strong>
              </div>
              <div>
                <span>Offline</span>
                <strong>{goldPerMinute}/min</strong>
              </div>
            </div>

            <div className="skill-row">
              <button
                onClick={upgradeDamage}
                disabled={gold < damageCost}
                className={gold < damageCost ? "disabled-skill" : ""}
              >
                <span>Upgrade</span>
                <strong>{damageCost} Gold</strong>
              </button>

              <button className="locked-skill" disabled>
                <span>Skill</span>
                <strong>Soon</strong>
              </button>

              <button className="locked-skill" disabled>
                <span>Burst</span>
                <strong>Soon</strong>
              </button>
            </div>
          </section>
        </>
      )}

      {activeTab === "hunters" && (
        <div className="page-panel">
          <h2>Hunters</h2>

          <div className="card">
            <h3>Association</h3>
            <p>Power: {associationPower}</p>
            <p>Recruited Hunters: {hunters.length}</p>
            <p>Team Damage: {totalHunterDamage}</p>
          </div>

          <button
            onClick={recruitHunter}
            disabled={gold < recruitCost}
            className={gold < recruitCost ? "disabled-skill" : ""}
          >
            Recruit Hunter ({recruitCost} Gold)
          </button>

          <div className="summon-rates">
            <p>Common 60%</p>
            <p>Rare 25%</p>
            <p>Epic 12%</p>
            <p>Legendary 3%</p>
          </div>

          <div className="hunter-grid">
            {hunters.length === 0 && <p>No hunters recruited yet.</p>}

            {hunters.map((hunter) => (
              <div
                key={hunter.name}
                className={`hunter-card ${rarityClass(hunter.rarity)}`}
              >
                <h3>{hunter.name}</h3>
                <p>{hunter.rarity}</p>
                <p>Level: {hunter.level}</p>
                <p>Damage: {hunter.baseDamage * hunter.level}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "gates" && (
        <div className="page-panel">
          <h2>Gates</h2>

          <div className="card">
            <h3>{currentTheme.name}</h3>
            <p>Current Stage: {stage}</p>
            <p>
              {isBossStage
                ? "Boss stage active."
                : "Clear stages to reach the next gate."}
            </p>
          </div>
        </div>
      )}

      {activeTab === "shop" && (
        <div className="page-panel">
          <h2>Shop</h2>

          <div className="card">
            <h3>Coming Soon</h3>
            <p>Cosmetics, boosts, and summons later.</p>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button
          className={activeTab === "battle" ? "active" : ""}
          onClick={() => setActiveTab("battle")}
        >
          ⚔️ Battle
        </button>
        <button
          className={activeTab === "hunters" ? "active" : ""}
          onClick={() => setActiveTab("hunters")}
        >
          🧍 Hunters
        </button>
        <button
          className={activeTab === "gates" ? "active" : ""}
          onClick={() => setActiveTab("gates")}
        >
          🌀 Gates
        </button>
        <button
          className={activeTab === "shop" ? "active" : ""}
          onClick={() => setActiveTab("shop")}
        >
          💰 Shop
        </button>
      </nav>
    </div>
  );
}

export default App;