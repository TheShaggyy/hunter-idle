import { useState } from "react";
import {
  EQUIP_SLOTS,
  EQUIP_TIERS,
  getEquipPower,
  getEquipHpBonus,
  getEquipDefense,
  getEquipMaxLevel,
  getEquipLevelCost,
  getAccessoryBonus,
} from "../data/equipment.js";
import {
  equipItem,
  unequipSlot,
  upgradeItem,
  salvageItem,
} from "../systems/equipment.js";
import { incrementCounter } from "../data/quests.js";

const SLOT_LABELS = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };
const SLOT_ICONS = { weapon: "🗡️", armor: "🛡️", accessory: "💍" };

export default function EquipScreen({ state, update }) {
  const [filter, setFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState(null);

  const filteredInventory = filter === "all"
    ? state.inventory
    : state.inventory.filter((i) => i.slot === filter);

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const tierA = EQUIP_TIERS.findIndex((t) => t.id === a.tier);
    const tierB = EQUIP_TIERS.findIndex((t) => t.id === b.tier);
    if (tierA !== tierB) return tierB - tierA;
    return b.level - a.level;
  });

  function handleEquip(item) {
    update((s) => {
      const result = equipItem(s.equipped, s.inventory, item);
      return { ...s, equipped: result.equipped, inventory: result.inventory };
    });
    setSelectedItemId(null);
  }

  function handleUnequip(slot) {
    update((s) => {
      const result = unequipSlot(s.equipped, s.inventory, slot);
      return { ...s, equipped: result.equipped, inventory: result.inventory };
    });
  }

  function handleUpgrade(item) {
    const result = upgradeItem(item, state.essence);
    if (!result) return;

    update((s) => {
      const isEquipped = Object.values(s.equipped).some(
        (e) => e?.instanceId === item.instanceId
      );

      // Quest hook: equipment upgraded
      const counters = s.quests?.counters || {};
      const questList = s.quests?.list || [];
      const inc = incrementCounter(counters, questList, "equipUpgrades", 1);

      if (isEquipped) {
        const slot = item.slot;
        return {
          ...s,
          essence: s.essence - result.essenceSpent,
          equipped: { ...s.equipped, [slot]: result.item },
          quests: { counters: inc.counters, list: inc.quests },
        };
      }

      return {
        ...s,
        essence: s.essence - result.essenceSpent,
        inventory: s.inventory.map((i) =>
          i.instanceId === item.instanceId ? result.item : i
        ),
        quests: { counters: inc.counters, list: inc.quests },
      };
    });
  }

  function handleSalvage(item) {
    if (!confirm(`Salvage ${item.name} for essence?`)) return;
    const essenceGained = salvageItem(item);
    update((s) => ({
      ...s,
      essence: s.essence + essenceGained,
      inventory: s.inventory.filter((i) => i.instanceId !== item.instanceId),
    }));
    setSelectedItemId(null);
  }

  return (
    <div className="page-panel">
      <h2>Equipment</h2>

      <div className="card">
        <h3>Equipped</h3>
        <div className="equip-slots">
          {EQUIP_SLOTS.map((slot) => {
            const item = state.equipped[slot];
            const tier = item ? EQUIP_TIERS.find((t) => t.id === item.tier) : null;
            return (
              <div
                key={slot}
                className={`equip-slot ${item ? "filled" : ""}`}
                style={item ? { borderColor: tier?.color || "#888" } : {}}
              >
                <span>{SLOT_ICONS[slot]} {SLOT_LABELS[slot]}</span>
                {item ? (
                  <>
                    <strong style={{ color: tier?.color }}>{item.name}</strong>
                    <p className="dim small">{item.tier}-Tier · +{item.level}</p>
                    <p className="dim small">
                      {formatItemStats(item)}
                    </p>
                    <div className="equip-slot-actions">
                      <button
                        className="upgrade-btn-mini"
                        onClick={() => handleUpgrade(item)}
                        disabled={
                          item.level >= getEquipMaxLevel(item.tier) ||
                          state.essence < getEquipLevelCost(item.level, item.tier)
                        }
                      >
                        {item.level >= getEquipMaxLevel(item.tier)
                          ? "MAX"
                          : `+1 (${getEquipLevelCost(item.level, item.tier)} ✨)`}
                      </button>
                      <button
                        className="unequip-btn-mini"
                        onClick={() => handleUnequip(slot)}
                      >
                        Unequip
                      </button>
                    </div>
                  </>
                ) : (
                  <strong>—</strong>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="inv-header">
          <h3>Inventory ({state.inventory.length})</h3>
          <span className="dim small">✨ {state.essence}</span>
        </div>
        <div className="inv-filter-row">
          {["all", "weapon", "armor", "accessory"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : SLOT_LABELS[f]}
            </button>
          ))}
        </div>

        {sortedInventory.length === 0 ? (
          <p className="dim center">
            {filter === "all"
              ? "No equipment yet. Clear Gates to find gear drops."
              : `No ${SLOT_LABELS[filter]?.toLowerCase()} pieces.`}
          </p>
        ) : (
          <div className="inventory-grid">
            {sortedInventory.map((item) => {
              const tier = EQUIP_TIERS.find((t) => t.id === item.tier);
              const isSelected = selectedItemId === item.instanceId;
              const maxLevel = getEquipMaxLevel(item.tier);
              const upgradeCost = getEquipLevelCost(item.level, item.tier);
              const canUpgrade =
                item.level < maxLevel && state.essence >= upgradeCost;

              return (
                <div
                  key={item.instanceId}
                  className={`inv-item ${isSelected ? "selected" : ""}`}
                  style={{ borderColor: tier?.color || "#666" }}
                  onClick={() => setSelectedItemId(isSelected ? null : item.instanceId)}
                >
                  <div className="inv-item-emoji">{item.emoji}</div>
                  <strong style={{ color: tier?.color }}>{item.name}</strong>
                  <p className="dim small">{item.tier}-Tier · +{item.level}</p>
                  <p className="dim small">
                    {formatItemStats(item)}
                  </p>

                  {isSelected && (
                    <div className="inv-item-actions">
                      <button
                        className="equip-btn-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquip(item);
                        }}
                      >
                        Equip
                      </button>
                      <button
                        className="upgrade-btn-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpgrade(item);
                        }}
                        disabled={!canUpgrade}
                      >
                        {item.level >= maxLevel ? "MAX" : `+1 (${upgradeCost} ✨)`}
                      </button>
                      <button
                        className="salvage-btn-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSalvage(item);
                        }}
                      >
                        Salvage
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAccessoryBonus(item) {
  const b = getAccessoryBonus(item);
  const parts = [];
  if (b.gold > 0) parts.push(`+${Math.round(b.gold * 100)}% Gold`);
  if (b.crystal > 0) parts.push(`+${Math.round(b.crystal * 100)}% Crystals`);
  if (b.stamina > 0) parts.push(`+${Math.round(b.stamina * 100)}% Stamina Regen`);
  return parts.join(" · ") || "—";
}

// One-stop stat string for the inventory tile. Weapons show ATK, armor
// shows HP + DEF (its new role), accessories show their % buffs.
function formatItemStats(item) {
  if (!item) return "—";
  if (item.slot === "accessory") return formatAccessoryBonus(item);
  if (item.slot === "weapon") return `+${getEquipPower(item)} ATK`;
  if (item.slot === "armor") {
    return `+${getEquipHpBonus(item)} HP · +${getEquipDefense(item)} DEF`;
  }
  return "—";
}