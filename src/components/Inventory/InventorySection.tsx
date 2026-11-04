import { useState } from "react";
import NumberInput from "../NumberInput/NumberInput";
import EquipmentPicker from "./EquipmentPicker";
import { COINS, attackFromWeapon } from "../../utils/inventory";
import type { CharacterData } from "../../utils/dnd";
import "../Spells/Spells.scss";

type InventorySectionProps = {
  character: CharacterData;
  onChange: (fields: Partial<CharacterData>) => void;
  disabled?: boolean;
};

const InventorySection = ({
  character,
  onChange,
  disabled = false,
}: InventorySectionProps) => {
  const [picking, setPicking] = useState(false);
  const { inventory, currency } = character;

  const addItem = (name: string, srdIndex?: string) => {
    const existing = inventory.find((item) => item.name === name);
    return existing
      ? inventory.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item
        )
      : [...inventory, { name, quantity: 1, ...(srdIndex && { srdIndex }) }];
  };

  return (
    <section className="character-form__section">
      <h3>Inventory</h3>

      <div className="inventory__coins">
        {COINS.map((coin) => (
          <div key={coin.key} className="character-form__group">
            <label htmlFor={`coin-${coin.key}`}>{coin.label}</label>
            <NumberInput
              id={`coin-${coin.key}`}
              value={currency[coin.key]}
              onChange={(value) =>
                onChange({ currency: { ...currency, [coin.key]: value } })
              }
              fallback={0}
              min={0}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {inventory.length > 0 ? (
        <ul className="spells__list inventory__list" aria-label="Inventory">
          {inventory.map((item) => (
            <li key={item.name} className="spells__item">
              <div className="spells__row">
                <span className="spells__name">
                  {item.name}
                  {!item.srdIndex && (
                    <span className="spells__custom"> (custom)</span>
                  )}
                </span>
                <NumberInput
                  className="inventory__quantity"
                  aria-label={`${item.name} quantity`}
                  value={item.quantity}
                  onChange={(quantity) =>
                    onChange({
                      inventory: inventory.map((i) =>
                        i === item ? { ...i, quantity } : i
                      ),
                    })
                  }
                  fallback={1}
                  min={0}
                  disabled={disabled}
                />
                {!disabled && (
                  <button
                    type="button"
                    className="spells__remove"
                    onClick={() =>
                      onChange({
                        inventory: inventory.filter((i) => i !== item),
                      })
                    }
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="spells__hint">No items yet.</p>
      )}

      {!disabled && (
        <>
          <button
            type="button"
            className="spells__add"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
          >
            {picking ? "Done adding items" : "Add items"}
          </button>
          {picking && (
            <EquipmentPicker
              onAddSrd={(item) => {
                const fields: Partial<CharacterData> = {
                  inventory: addItem(item.name, item.index),
                };
                // Weapons also get an attack, unless there already is one
                if (
                  item.weapon &&
                  !character.attacks.some((a) => a.name === item.name)
                ) {
                  fields.attacks = [
                    ...character.attacks,
                    attackFromWeapon(character, item),
                  ];
                }
                onChange(fields);
              }}
              onAddCustom={(name) => onChange({ inventory: addItem(name) })}
            />
          )}
        </>
      )}

      <div className="character-form__group">
        <label htmlFor="equipment">Other equipment</label>
        <textarea
          id="equipment"
          name="equipment"
          value={character.equipment}
          onChange={(e) => onChange({ equipment: e.target.value })}
          disabled={disabled}
          rows={3}
        />
      </div>
    </section>
  );
};

export default InventorySection;
