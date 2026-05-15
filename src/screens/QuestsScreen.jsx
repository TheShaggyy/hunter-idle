import { QUEST_TEMPLATES, getQuestTemplate } from "../data/quests.js";

export default function QuestsScreen({ state, update, onClose }) {
  const quests = state.quests?.list || [];
  const counters = state.quests?.counters || {};

  function claim(questId) {
    const quest = quests.find((q) => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return;
    const tpl = getQuestTemplate(questId);
    if (!tpl) return;

    update((s) => ({
      ...s,
      crystals: s.crystals + tpl.rewards.crystals,
      essence: s.essence + tpl.rewards.essence,
      quests: {
        ...s.quests,
        list: s.quests.list.map((q) =>
          q.id === questId ? { ...q, claimed: true } : q
        ),
      },
    }));
  }

  const msUntilReset = Math.max(0, state.dailyResetAt - Date.now());
  const hoursUntil = Math.floor(msUntilReset / (60 * 60 * 1000));
  const minutesUntil = Math.floor((msUntilReset % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <div className="page-panel">
      <h2>Daily Quests</h2>
      <p className="dim small center">
        Resets in {hoursUntil}h {minutesUntil}m
      </p>

      {quests.length === 0 ? (
        <div className="card">
          <p className="dim">No quests rolled yet. Try refreshing.</p>
        </div>
      ) : (
        quests.map((q) => {
          const tpl = QUEST_TEMPLATES.find((t) => t.id === q.id);
          if (!tpl) return null;
          const pct = Math.min(100, (q.progress / q.target) * 100);

          return (
            <div
              key={q.id}
              className={`card quest-tile ${q.completed ? "completed" : ""} ${q.claimed ? "claimed" : ""}`}
            >
              <div className="quest-head">
                <span className="quest-icon">{tpl.icon}</span>
                <div className="quest-info">
                  <strong>{tpl.name}</strong>
                  <p className="dim small">{tpl.description}</p>
                </div>
              </div>
              <div className="quest-progress-row">
                <div className="quest-progress-bar">
                  <div
                    className="quest-progress-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="dim small">
                  {Math.min(q.progress, q.target).toLocaleString()} / {q.target.toLocaleString()}
                </span>
              </div>
              <div className="quest-rewards">
                <span>💎 {tpl.rewards.crystals}</span>
                <span>✨ {tpl.rewards.essence}</span>
                {q.claimed ? (
                  <button disabled className="claimed-btn">✓ Claimed</button>
                ) : q.completed ? (
                  <button onClick={() => claim(q.id)} className="claim-btn">
                    Claim
                  </button>
                ) : (
                  <button disabled className="disabled-skill">
                    In Progress
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      <button onClick={onClose} className="flee-btn" style={{ marginTop: 12, width: "100%" }}>
        Back
      </button>
    </div>
  );
}
