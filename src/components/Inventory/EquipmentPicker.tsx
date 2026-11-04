import { useEffect, useMemo, useState } from "react";
import { loadSrdEquipment } from "../../utils/inventory";
import type { Equipment } from "../../utils/inventory";

type EquipmentPickerProps = {
  onAddSrd: (item: Equipment) => void;
  onAddCustom: (name: string) => void;
};

const describe = (item: Equipment) => {
  if (item.weapon) {
    return `${item.weapon.category} ${item.weapon.range.toLowerCase()} weapon · ${item.weapon.damage} ${item.weapon.damageType ?? ""}`;
  }
  if (item.armor) {
    return `${item.armor.category} armor · AC ${item.armor.baseAC}${item.armor.dexBonus ? " + DEX" : ""}`;
  }
  return item.category;
};

const EquipmentPicker = ({ onAddSrd, onAddCustom }: EquipmentPickerProps) => {
  const [items, setItems] = useState<Equipment[] | null>(null);
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    loadSrdEquipment().then(setItems);
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (items ?? []).filter(
      (item) => !term || item.name.toLowerCase().includes(term)
    );
  }, [items, search]);

  const addCustom = () => {
    if (!customName.trim()) return;
    onAddCustom(customName.trim());
    setCustomName("");
  };

  // Not a <form>: this sits inside the character form
  return (
    <div className="spell-picker">
      <div className="spell-picker__filters">
        <label htmlFor="equipment-search">Search equipment</label>
        <input
          id="equipment-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="e.g. Longsword, rope"
        />
      </div>
      {!items ? (
        <p>Loading equipment…</p>
      ) : (
        <ul className="spell-picker__results" aria-label="Equipment results">
          {matches.slice(0, 100).map((item) => (
            <li key={item.index} className="spell-picker__result">
              <span>
                <strong>{item.name}</strong>{" "}
                <span className="spell-picker__meta">{describe(item)}</span>
              </span>
              <button
                type="button"
                onClick={() => onAddSrd(item)}
                aria-label={`Add ${item.name}`}
              >
                Add
              </button>
            </li>
          ))}
          {matches.length === 0 && <li>No equipment matches.</li>}
        </ul>
      )}
      <div className="spell-picker__custom">
        <label htmlFor="custom-item-name">Custom item</label>
        <input
          id="custom-item-name"
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="e.g. Bag of Holding"
        />
        <button type="button" onClick={addCustom} disabled={!customName.trim()}>
          Add custom item
        </button>
      </div>
    </div>
  );
};

export default EquipmentPicker;
