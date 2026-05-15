// Daily Quests — 5 rotating quests per day. Simple counters.
// Counters reset at the daily reset time (midnight local, already in state).

// Quest templates. Each has: id, name, description, target (varies by tier),
// reward (varies by tier).
// "tier" scales rewards based on player awakening level — early-game players get
// gentler targets, awakened players get bigger ones.
export const QUEST_TEMPLATES = [
  {
    id: "kill_bosses",
    name: "Boss Hunter",
    description: "Defeat stage bosses",
    icon: "⚔️",
    counterKey: "bossesKilled",
    targets: [3, 5, 10, 15, 25], // by awakening tier
    rewards: { crystals: 30, essence: 15 },
  },
  {
    id: "clear_gates",
    name: "Gate Walker",
    description: "Clear gate runs",
    icon: "🌀",
    counterKey: "gatesCleared",
    targets: [2, 3, 5, 8, 12],
    rewards: { crystals: 50, essence: 25 },
  },
  {
    id: "summon_hunters",
    name: "Call to Arms",
    description: "Summon hunters",
    icon: "🧍",
    counterKey: "hunterSummons",
    targets: [1, 3, 5, 10, 15],
    rewards: { crystals: 40, essence: 10 },
  },
  {
    id: "upgrade_equipment",
    name: "Forge Master",
    description: "Upgrade equipment pieces",
    icon: "🔨",
    counterKey: "equipUpgrades",
    targets: [3, 5, 8, 12, 18],
    rewards: { crystals: 35, essence: 30 },
  },
  {
    id: "spend_gold",
    name: "Big Spender",
    description: "Spend gold on upgrades",
    icon: "🪙",
    counterKey: "goldSpent",
    targets: [500, 2000, 8000, 30000, 100000],
    rewards: { crystals: 25, essence: 15 },
  },
  {
    id: "advance_stages",
    name: "Climber",
    description: "Advance stages",
    icon: "🏔️",
    counterKey: "stagesAdvanced",
    targets: [3, 5, 8, 12, 20],
    rewards: { crystals: 30, essence: 20 },
  },
];

// Roll today's quests. We always give 5 quests, deterministically based on the
// daily reset timestamp so all sessions on the same day share the same quest list.
export function rollDailyQuests(dailyResetAt, awakeningLevel = 0) {
  const tier = Math.min(awakeningLevel, 4);
  const seed = dailyResetAt; // deterministic per day
  const shuffled = shuffleSeeded([...QUEST_TEMPLATES], seed);
  const picked = shuffled.slice(0, 5);

  return picked.map((tpl) => ({
    id: tpl.id,
    target: tpl.targets[tier],
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

// Seeded shuffle so quest list is stable across reloads within the same day.
function shuffleSeeded(arr, seed) {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Increment a quest counter. Called by event hooks throughout the game.
// counters is an object like { bossesKilled: 3, gatesCleared: 1, ... }
// Returns the new counters object and the new quests array (with progress updated
// and completed flags set).
export function incrementCounter(counters, quests, counterKey, delta = 1) {
  const newCounters = { ...counters, [counterKey]: (counters[counterKey] || 0) + delta };

  const newQuests = (quests || []).map((q) => {
    const tpl = QUEST_TEMPLATES.find((t) => t.id === q.id);
    if (!tpl || tpl.counterKey !== counterKey) return q;

    const newProgress = newCounters[counterKey];
    const completed = newProgress >= q.target;
    return { ...q, progress: newProgress, completed };
  });

  return { counters: newCounters, quests: newQuests };
}

export function getQuestTemplate(questId) {
  return QUEST_TEMPLATES.find((q) => q.id === questId);
}

// Empty quest state shape.
export function getInitialQuestState() {
  return {
    counters: {
      bossesKilled: 0,
      gatesCleared: 0,
      hunterSummons: 0,
      equipUpgrades: 0,
      goldSpent: 0,
      stagesAdvanced: 0,
    },
    list: [], // populated on first daily roll
  };
}
