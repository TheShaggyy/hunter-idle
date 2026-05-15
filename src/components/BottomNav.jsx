const TABS = [
  { id: "battle", label: "Battle", icon: "⚔️" },
  { id: "gates", label: "Gates", icon: "🌀" },
  { id: "hunters", label: "Hunters", icon: "🧍" },
  { id: "equip", label: "Equip", icon: "🛡️" },
  { id: "guild", label: "Guild", icon: "🏛️" },
  { id: "shop", label: "Shop", icon: "💰" },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={activeTab === t.id ? "active" : ""}
          onClick={() => setActiveTab(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
