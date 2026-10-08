import { useEffect, useMemo, useState } from "react";
import { SPELL_LEVEL_NAMES, loadSrdSpells } from "../../utils/spellcasting";
import type { KnownSpell, Spell, Spellcasting } from "../../utils/spellcasting";

type SpellPickerProps = {
  characterClass: string;
  casting: Spellcasting | null;
  known: KnownSpell[];
  /** Whether new spells start prepared (true for "known" casters). */
  preparedByDefault: boolean;
  onAdd: (spell: KnownSpell) => void;
};

const SpellPicker = ({
  characterClass,
  casting,
  known,
  preparedByDefault,
  onAdd,
}: SpellPickerProps) => {
  const [spells, setSpells] = useState<Spell[] | null>(null);
  const [search, setSearch] = useState("");
  // Non-casters and feats/multiclassing need the full list
  const [showAll, setShowAll] = useState(!casting);
  const [customName, setCustomName] = useState("");
  const [customLevel, setCustomLevel] = useState(0);
  const [customNotes, setCustomNotes] = useState("");

  useEffect(() => {
    loadSrdSpells().then(setSpells);
  }, []);

  const knownNames = new Set(known.map((s) => s.name.toLowerCase()));
  const maxLevel = casting?.maxSpellLevel ?? 9;

  const matches = useMemo(() => {
    if (!spells) return [];
    const term = search.trim().toLowerCase();
    return spells.filter(
      (spell) =>
        (showAll ||
          (spell.classes.includes(characterClass) &&
            spell.level <= maxLevel)) &&
        (!term || spell.name.toLowerCase().includes(term))
    );
  }, [spells, search, showAll, characterClass, maxLevel]);

  const addSrd = (spell: Spell) =>
    onAdd({
      name: spell.name,
      level: spell.level,
      srdIndex: spell.index,
      prepared: spell.level === 0 || preparedByDefault,
    });

  const addCustom = () => {
    if (!customName.trim()) return;
    onAdd({
      name: customName.trim(),
      level: customLevel,
      prepared: customLevel === 0 || preparedByDefault,
      notes: customNotes.trim(),
    });
    setCustomName("");
    setCustomNotes("");
  };

  return (
    <div className="spell-picker">
      <div className="spell-picker__filters">
        <label htmlFor="spell-search">Search spells</label>
        <input
          id="spell-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // Enter would otherwise submit the character form
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="e.g. Fireball"
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show all classes and levels
        </label>
      </div>

      {!spells ? (
        <p>Loading spells…</p>
      ) : (
        <ul className="spell-picker__results" aria-label="Spell results">
          {matches.slice(0, 100).map((spell) => {
            const added = knownNames.has(spell.name.toLowerCase());
            return (
              <li key={spell.index} className="spell-picker__result">
                <span>
                  <strong>{spell.name}</strong>{" "}
                  <span className="spell-picker__meta">
                    {spell.level === 0
                      ? "Cantrip"
                      : SPELL_LEVEL_NAMES[spell.level]}{" "}
                    · {spell.school}
                    {spell.concentration && " · Concentration"}
                    {spell.ritual && " · Ritual"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => addSrd(spell)}
                  disabled={added}
                  aria-label={
                    added ? `${spell.name} added` : `Add ${spell.name}`
                  }
                >
                  {added ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
          {matches.length === 0 && <li>No spells match.</li>}
          {matches.length > 100 && (
            <li>Showing 100 of {matches.length}. Search to narrow down.</li>
          )}
        </ul>
      )}

      {/* Not a <form>: this sits inside the character form */}
      <div className="spell-picker__custom">
        <h5>Custom spell</h5>
        <p>For spells from other books, or homebrew.</p>
        <label htmlFor="custom-spell-name">Name</label>
        <input
          id="custom-spell-name"
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <label htmlFor="custom-spell-level">Level</label>
        <select
          id="custom-spell-level"
          value={customLevel}
          onChange={(e) => setCustomLevel(Number(e.target.value))}
        >
          {SPELL_LEVEL_NAMES.map((name, level) => (
            <option key={level} value={level}>
              {level === 0 ? "Cantrip" : name}
            </option>
          ))}
        </select>
        <label htmlFor="custom-spell-notes">Details</label>
        <textarea
          id="custom-spell-notes"
          rows={3}
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Range, duration, effect…"
        />
        <button type="button" onClick={addCustom} disabled={!customName.trim()}>
          Add custom spell
        </button>
      </div>
    </div>
  );
};

export default SpellPicker;
