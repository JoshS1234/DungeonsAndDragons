import NumberInput from "../NumberInput/NumberInput";
import { ABILITIES, formatModifier } from "../../utils/dnd";
import type { AbilityAbbrev, CharacterData } from "../../utils/dnd";
import { attackBonus, damageExpression } from "../../utils/inventory";
import type { Attack } from "../../utils/inventory";
import { parseDice } from "../../utils/dice";
import "../Spells/Spells.scss";

type AttacksSectionProps = {
  character: CharacterData;
  onChange: (attacks: Attack[]) => void;
  disabled?: boolean;
};

const BLANK_ATTACK: Attack = {
  name: "",
  ability: "STR",
  proficient: true,
  damageDice: "1d6",
  damageType: "",
  magicBonus: 0,
};

const validDice = (dice: string) => {
  try {
    parseDice(dice);
    return true;
  } catch {
    return false;
  }
};

const AttacksSection = ({
  character,
  onChange,
  disabled = false,
}: AttacksSectionProps) => {
  const { attacks } = character;
  const update = (index: number, change: Partial<Attack>) =>
    onChange(attacks.map((a, i) => (i === index ? { ...a, ...change } : a)));

  return (
    <section className="character-form__section attacks">
      <h3>Attacks</h3>
      {attacks.length === 0 && (
        <p className="spells__hint">
          No attacks yet. Adding a weapon to the inventory adds one
          automatically.
        </p>
      )}
      {attacks.map((attack, i) => {
        const id = `attack-${i}`;
        return (
          <fieldset key={i} className="attacks__item">
            <legend>
              {attack.name || "New attack"}:{" "}
              <strong>
                {formatModifier(attackBonus(character, attack))} to hit,{" "}
                {damageExpression(character, attack)} {attack.damageType}
              </strong>
            </legend>
            <div className="attacks__fields">
              <label htmlFor={`${id}-name`}>Name</label>
              <input
                id={`${id}-name`}
                type="text"
                value={attack.name}
                onChange={(e) => update(i, { name: e.target.value })}
                disabled={disabled}
              />
              <label htmlFor={`${id}-ability`}>Ability</label>
              <select
                id={`${id}-ability`}
                value={attack.ability}
                onChange={(e) =>
                  update(i, { ability: e.target.value as AbilityAbbrev })
                }
                disabled={disabled}
              >
                {ABILITIES.map((a) => (
                  <option key={a.abbrev} value={a.abbrev}>
                    {a.abbrev}
                  </option>
                ))}
              </select>
              <label htmlFor={`${id}-dice`}>Damage dice</label>
              <input
                id={`${id}-dice`}
                type="text"
                value={attack.damageDice}
                onChange={(e) => update(i, { damageDice: e.target.value })}
                disabled={disabled}
                aria-invalid={!validDice(attack.damageDice)}
              />
              <label htmlFor={`${id}-type`}>Damage type</label>
              <input
                id={`${id}-type`}
                type="text"
                value={attack.damageType}
                onChange={(e) => update(i, { damageType: e.target.value })}
                disabled={disabled}
              />
              <label htmlFor={`${id}-magic`}>Magic bonus</label>
              <NumberInput
                id={`${id}-magic`}
                value={attack.magicBonus}
                onChange={(magicBonus) => update(i, { magicBonus })}
                fallback={0}
                min={0}
                max={5}
                disabled={disabled}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={attack.proficient}
                  onChange={(e) => update(i, { proficient: e.target.checked })}
                  disabled={disabled}
                />
                Proficient
              </label>
            </div>
            {!validDice(attack.damageDice) && (
              <p className="attacks__warning">
                Damage dice should look like 1d8 or 2d6.
              </p>
            )}
            {!disabled && (
              <button
                type="button"
                className="spells__remove"
                onClick={() => onChange(attacks.filter((_, j) => j !== i))}
                aria-label={`Remove ${attack.name || "attack"}`}
              >
                Remove
              </button>
            )}
          </fieldset>
        );
      })}
      {!disabled && (
        <button
          type="button"
          className="spells__add"
          onClick={() => onChange([...attacks, BLANK_ATTACK])}
        >
          Add attack
        </button>
      )}
    </section>
  );
};

export default AttacksSection;
