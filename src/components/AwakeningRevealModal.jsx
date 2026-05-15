// The Reveal — shown ONCE, the first time the player hits their rank ceiling
// (e.g., reaches D-Rank on awakening level 0). The narrative beat that introduces
// the awakening system as a Solo Leveling "System interface" moment.

export default function AwakeningRevealModal({ open, ceilingRank, onDismiss }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="awakening-reveal-modal">
        <div className="reveal-glyph">✦</div>
        <h2>The System</h2>
        <p className="reveal-quote">
          "Hunter. You have reached the limit of your current form."
        </p>
        <p>
          You have ascended to <strong style={{ color: ceilingRank?.color || "#ffd700" }}>
            {ceilingRank?.name || "your rank ceiling"}
          </strong> — the ceiling of your first awakening.
        </p>
        <p className="dim">
          To grow further, you must <strong>Awaken</strong>. Stage and rank will reset.
          Your hunters and earned power will remain. Each awakening grants
          <strong> System Coins </strong> to spend on permanent upgrades, and lifts
          your ceiling to the next rank.
        </p>
        <p className="dim small">
          Visit the <strong>Hub</strong> → <strong>The System</strong> when you're ready.
        </p>
        <button onClick={onDismiss} className="reveal-btn">
          I Accept
        </button>
      </div>
    </div>
  );
}
