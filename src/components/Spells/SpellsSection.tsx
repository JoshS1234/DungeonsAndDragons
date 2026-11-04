import { useEffect, useState } from "react";
import { formatModifier } from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";
import {
  SPELL_LEVEL_NAMES,
  loadSrdSpells,
  spellCounts,
  spellcastingFor,
} from "../../utils/spellcasting";
import type { KnownSpell, Spell } from "../../utils/spellcasting";
import SpellPicker from "./SpellPicker";
import "./Spells.scss";

type SpellsSectionProps = {
  character: CharacterData;
  onChange: (spells: KnownSpell[]) => void;
  disabled?: boolean;
};

const Count = ({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) => {
  const over = limit !== null && count > limit;
  return (
    <span className={`spells__count${over ? " spells__count--over" : ""}`}>
      {label}: {count}
      {limit !== null && ` / ${limit}`}
      {over && " (over the usual limit)"}
    </span>
  );
};

const SpellDetails = ({ spell, srd }: { spell: KnownSpell; srd?: Spell }) => {
  if (!srd) {
    return spell.notes ? (
      <p className="spells__details">{spell.notes}</p>
    ) : null;
  }
  return (
    <div className="spells__details">
      <p className="spells__meta">
        {srd.school} · {srd.castingTime} · {srd.range} · {srd.components} ·{" "}
        {srd.duration}
      </p>
      {srd.description.split("\n\n").map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      {srd.higherLevel && (
        <p>
          <strong>At higher levels.</strong> {srd.higherLevel}
        </p>
      )}
    </div>
  );
};

const SpellsSection = ({
  character,
  onChange,
  disabled = false,
}: SpellsSectionProps) => {
  const casting = spellcastingFor(character);
  const spells = character.knownSpells;
  const counts = spellCounts(spells);
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [srd, setSrd] = useState<Map<string, Spell>>(new Map());

  const hasSrdSpells = spells.some((s) => s.srdIndex);
  useEffect(() => {
    if (!hasSrdSpells) return;
    loadSrdSpells().then((all) =>
      setSrd(new Map(all.map((s) => [s.index, s])))
    );
  }, [hasSrdSpells]);

  const isPreparedCaster = casting?.preparedLimit != null;

  const update = (name: string, change: Partial<KnownSpell>) =>
    onChange(spells.map((s) => (s.name === name ? { ...s, ...change } : s)));

  const byLevel = SPELL_LEVEL_NAMES.map((title, level) => ({
    title,
    level,
    spells: spells
      .filter((s) => s.level === level)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.spells.length > 0);

  return (
    <section className="character-form__section spells">
      <h3>Spells</h3>

      {casting ? (
        <div className="spells__summary">
          <div className="spells__stats">
            <span>
              Ability: <strong>{casting.ability}</strong>
            </span>
            <span>
              Save DC: <strong>{casting.saveDC}</strong>
            </span>
            <span>
              Attack: <strong>{formatModifier(casting.attackBonus)}</strong>
            </span>
          </div>
          <div className="spells__slots" aria-label="Spell slots">
            {casting.slots.map(
              (n, i) =>
                n > 0 && (
                  <span key={i} className="spells__slot">
                    {SPELL_LEVEL_NAMES[i + 1]}: {n}
                  </span>
                )
            )}
          </div>
          <div className="spells__counts">
            <Count
              label="Cantrips"
              count={counts.cantrips}
              limit={casting.cantripsKnown || null}
            />
            {casting.spellsKnown !== null && (
              <Count
                label="Spells known"
                count={counts.leveled}
                limit={casting.spellsKnown}
              />
            )}
            {isPreparedCaster && (
              <Count
                label="Prepared"
                count={counts.prepared}
                limit={casting.preparedLimit}
              />
            )}
          </div>
        </div>
      ) : (
        <p className="spells__hint">
          {character.class
            ? `${character.class}s don't cast spells at level ${character.level} (subclasses like Eldritch Knight aren't in the free rules). You can still add spells from feats or traits.`
            : "Choose a class to see spellcasting details."}
        </p>
      )}

      {byLevel.map((group) => (
        <div key={group.level} className="spells__group">
          <h4>{group.title}</h4>
          <ul className="spells__list">
            {group.spells.map((spell) => (
              <li key={spell.name} className="spells__item">
                <div className="spells__row">
                  {isPreparedCaster && spell.level > 0 && (
                    <input
                      type="checkbox"
                      checked={spell.prepared}
                      onChange={(e) =>
                        update(spell.name, { prepared: e.target.checked })
                      }
                      disabled={disabled}
                      aria-label={`${spell.name} prepared`}
                    />
                  )}
                  <button
                    type="button"
                    className="spells__name"
                    aria-expanded={open === spell.name}
                    onClick={() =>
                      setOpen(open === spell.name ? null : spell.name)
                    }
                  >
                    {spell.name}
                    {!spell.srdIndex && (
                      <span className="spells__custom"> (custom)</span>
                    )}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      className="spells__remove"
                      onClick={() =>
                        onChange(spells.filter((s) => s.name !== spell.name))
                      }
                      aria-label={`Remove ${spell.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {open === spell.name && (
                  <SpellDetails
                    spell={spell}
                    srd={spell.srdIndex ? srd.get(spell.srdIndex) : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {spells.length === 0 && <p className="spells__hint">No spells yet.</p>}

      {!disabled && (
        <>
          <button
            type="button"
            className="spells__add"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
          >
            {picking ? "Done adding spells" : "Add spells"}
          </button>
          {picking && (
            <SpellPicker
              characterClass={character.class}
              casting={casting}
              known={spells}
              preparedByDefault={!isPreparedCaster}
              onAdd={(spell) => onChange([...spells, spell])}
            />
          )}
        </>
      )}

      <p className="spells__credit">
        Spell data from the D&amp;D 5e System Reference Document 5.1 by Wizards
        of the Coast, licensed under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC-BY-4.0
        </a>
        .
      </p>
    </section>
  );
};

export default SpellsSection;
