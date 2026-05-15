// Guild screen — the Association vs Guild choice.
// In Solo Leveling fashion: you can join the Association OR a Guild, never both.
// Association = institutional, structured perks. Guild = player-driven, custom perks.

export default function GuildScreen({ state, update }) {
  function joinAssociation() {
    if (state.affiliation !== "none") return;
    update({ affiliation: "association" });
  }

  function joinGuildPlaceholder() {
    // Real guild joining will come with backend / player-made guilds later.
    if (state.affiliation !== "none") return;
    update({ affiliation: "guild", guildName: "Shadow Pack (placeholder)" });
  }

  function leave() {
    update({ affiliation: "none", guildName: null });
  }

  if (state.affiliation === "association") {
    return (
      <div className="page-panel">
        <h2>The Association</h2>
        <div className="card affiliation-card association-card">
          <h3>You are an Association Hunter</h3>
          <p>Official benefits:</p>
          <ul className="perk-list">
            <li>+10% Gold from all sources</li>
            <li>+5% Crystal drops from Gates</li>
            <li>Access to Association-exclusive missions</li>
            <li>Stable, structured progression</li>
          </ul>
          <p className="dim">Daily missions and exclusive Gates coming soon.</p>
          <button onClick={leave} className="leave-btn">Leave Association</button>
        </div>
      </div>
    );
  }

  if (state.affiliation === "guild") {
    return (
      <div className="page-panel">
        <h2>{state.guildName}</h2>
        <div className="card affiliation-card guild-card">
          <h3>You are a Guild member</h3>
          <p>Guild benefits:</p>
          <ul className="perk-list">
            <li>+20% Crystal drops from Gates</li>
            <li>Custom guild buffs (set by guild leader)</li>
            <li>Guild Wars (PvP coming soon)</li>
            <li>Higher cap, higher risk</li>
          </ul>
          <p className="dim">Real guilds with player-set names coming soon.</p>
          <button onClick={leave} className="leave-btn">Leave Guild</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-panel">
      <h2>Choose Your Path</h2>
      <p className="dim center">Hunters either join the Association or form Guilds. You cannot be both.</p>

      <div className="card affiliation-card association-card">
        <h3>🏛️ The Association</h3>
        <p>Government-backed. Stable benefits. Structured progression.</p>
        <ul className="perk-list">
          <li>+10% Gold from all sources</li>
          <li>+5% Crystal drops from Gates</li>
          <li>Association-exclusive missions</li>
        </ul>
        <button onClick={joinAssociation}>Join Association</button>
      </div>

      <div className="card affiliation-card guild-card">
        <h3>⚔️ Guilds</h3>
        <p>Player-formed. Higher rewards, custom perks, guild wars.</p>
        <ul className="perk-list">
          <li>+20% Crystal drops from Gates</li>
          <li>Custom guild-set buffs</li>
          <li>Guild Wars (PvP) — coming soon</li>
        </ul>
        <button onClick={joinGuildPlaceholder}>Browse Guilds (placeholder)</button>
      </div>
    </div>
  );
}
