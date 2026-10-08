import { useEffect, useMemo, useState } from "react";
import NumberInput from "../NumberInput/NumberInput";
import { formatChallengeRating, loadSrdMonsters } from "../../utils/encounter";
import type { Monster } from "../../utils/encounter";

type MonsterPickerProps = {
  onAddMonster: (monster: Monster, count: number) => void;
  onAddCustom: (details: {
    name: string;
    initiative: number;
    hitPoints: number;
    armorClass: number;
  }) => void;
};

const MonsterPicker = ({ onAddMonster, onAddCustom }: MonsterPickerProps) => {
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(1);
  const [custom, setCustom] = useState({
    name: "",
    initiative: 10,
    hitPoints: 10,
    armorClass: 12,
  });

  useEffect(() => {
    loadSrdMonsters().then(setMonsters);
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term && monsters
      ? monsters.filter((m) => m.name.toLowerCase().includes(term))
      : [];
  }, [monsters, search]);

  return (
    <div className="spell-picker monster-picker">
      <div className="spell-picker__filters">
        <label htmlFor="monster-search">Search monsters</label>
        <input
          id="monster-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Goblin"
        />
        <label htmlFor="monster-count">How many</label>
        <NumberInput
          id="monster-count"
          value={count}
          onChange={setCount}
          fallback={1}
          min={1}
          max={20}
        />
      </div>
      {!monsters ? (
        <p>Loading monsters…</p>
      ) : (
        search.trim() && (
          <ul className="spell-picker__results" aria-label="Monster results">
            {matches.slice(0, 50).map((monster) => (
              <li key={monster.index} className="spell-picker__result">
                <span>
                  <strong>{monster.name}</strong>{" "}
                  <span className="spell-picker__meta">
                    CR {formatChallengeRating(monster.challengeRating)} · AC{" "}
                    {monster.armorClass} · {monster.hitPoints} HP
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onAddMonster(monster, count)}
                  aria-label={`Add ${monster.name}`}
                >
                  Add
                </button>
              </li>
            ))}
            {matches.length === 0 && <li>No monsters match.</li>}
          </ul>
        )
      )}
      <div className="spell-picker__custom">
        <h5>Custom combatant</h5>
        <label htmlFor="custom-combatant-name">Name</label>
        <input
          id="custom-combatant-name"
          type="text"
          value={custom.name}
          onChange={(e) => setCustom({ ...custom, name: e.target.value })}
        />
        {(
          [
            ["initiative", "Initiative"],
            ["hitPoints", "Hit points"],
            ["armorClass", "Armor class"],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className="monster-picker__number">
            <label htmlFor={`custom-combatant-${key}`}>{label}</label>
            <NumberInput
              id={`custom-combatant-${key}`}
              value={custom[key]}
              onChange={(value) => setCustom({ ...custom, [key]: value })}
              fallback={key === "initiative" ? 10 : 1}
              min={key === "initiative" ? -10 : 0}
            />
          </span>
        ))}
        <button
          type="button"
          disabled={!custom.name.trim()}
          onClick={() => {
            onAddCustom({ ...custom, name: custom.name.trim() });
            setCustom({ ...custom, name: "" });
          }}
        >
          Add custom combatant
        </button>
      </div>
    </div>
  );
};

export default MonsterPicker;
