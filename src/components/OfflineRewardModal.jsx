export default function OfflineRewardModal({ reward, onClaim }) {
  if (!reward) return null;
  return (
    <div className="modal-backdrop">
      <div className="offline-modal">
        <h2>While You Were Away</h2>
        <p>Your Hunters kept the castle clear.</p>
        <div className="reward-amount">+{reward.gold.toLocaleString()} Gold</div>
        <p>Time counted: {reward.minutes} minutes</p>
        <button onClick={onClaim}>Claim</button>
      </div>
    </div>
  );
}
