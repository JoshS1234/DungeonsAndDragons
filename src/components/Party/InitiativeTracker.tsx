import { useEffect, useState } from "react";
import NumberInput from "../NumberInput/NumberInput";
import MonsterPicker from "./MonsterPicker";
import { useDice } from "../Dice/diceContext";
import { endEncounter, saveEncounter } from "../../services/encounters";
import type { StoredCharacter } from "../../services/characters";
import { checkExpression } from "../../utils/dice";
import {
  NEW_ENCOUNTER,
  addCombatants,
  loadSrdMonsters,
  monsterInitiativeBonus,
  nextTurn,
  numberedNames,
  previousTurn,
  removeCombatant,
  updateCombatant,
} from "../../utils/encounter";
import type { Combatant, Encounter, Monster } from "../../utils/encounter";
import { errorMessage } from "../../utils/errors";

type InitiativeTrackerProps = {
  campaignId: string;
  isDm: boolean;
  party: StoredCharacter[];
  encounter: Encounter | null;
};

let idCounter = 0;
const newId = () => `${Date.now().toString(36)}-${idCounter++}`;

/** What players see instead of a monster's exact HP. */
const monsterHealth = (c: Combatant) => {
  if (c.hitPoints === undefined || c.maxHitPoints === undefined) return null;
  if (c.hitPoints <= 0) return "Down";
  return c.hitPoints <= c.maxHitPoints / 2 ? "Bloodied" : "Healthy";
};

const MonsterHp = ({
  combatant,
  onChange,
}: {
  combatant: Combatant;
  onChange: (hitPoints: number) => void;
}) => {
  const [amount, setAmount] = useState("");
  const hp = combatant.hitPoints ?? 0;
  const value = Math.max(0, parseInt(amount, 10) || 0);
  const apply = (sign: 1 | -1) => {
    onChange(
      Math.min(
        combatant.maxHitPoints ?? Infinity,
        Math.max(0, hp + sign * value)
      )
    );
    setAmount("");
  };
  return (
    <span className="initiative__hp">
      <span aria-label={`${combatant.name} hit points`}>
        {hp}/{combatant.maxHitPoints} HP
      </span>
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label={`Amount for ${combatant.name}`}
      />
      <button
        type="button"
        disabled={!value}
        onClick={() => apply(-1)}
        aria-label={`Damage ${combatant.name}`}
      >
        −
      </button>
      <button
        type="button"
        disabled={!value}
        onClick={() => apply(1)}
        aria-label={`Heal ${combatant.name}`}
      >
        +
      </button>
    </span>
  );
};

const StatBlock = ({ srdIndex }: { srdIndex: string }) => {
  const [monster, setMonster] = useState<Monster | null>(null);
  useEffect(() => {
    loadSrdMonsters().then((all) =>
      setMonster(all.find((m) => m.index === srdIndex) ?? null)
    );
  }, [srdIndex]);
  if (!monster) return <p>Loading…</p>;
  return (
    <div className="initiative__statblock">
      <p>
        <em>
          {monster.size} {monster.type}, {monster.alignment}
        </em>{" "}
        · Speed {monster.speed}
      </p>
      <p>
        STR {monster.abilities[0]} · DEX {monster.abilities[1]} · CON{" "}
        {monster.abilities[2]} · INT {monster.abilities[3]} · WIS{" "}
        {monster.abilities[4]} · CHA {monster.abilities[5]}
      </p>
      {[...monster.traits, ...monster.actions].map((entry) => (
        <p key={entry.name}>
          <strong>{entry.name}.</strong> {entry.description}
        </p>
      ))}
    </div>
  );
};

const InitiativeTracker = ({
  campaignId,
  isDm,
  party,
  encounter,
}: InitiativeTrackerProps) => {
  const { roll } = useDice();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  // Firestore applies local writes to the live listener straight away, so
  // there's no need to keep a separate optimistic copy here
  const shown = encounter;

  const save = (next: Encounter) => {
    setError(null);
    saveEncounter(campaignId, next).catch((err) =>
      setError(errorMessage(err, "Couldn't save the encounter"))
    );
  };

  if (!shown) {
    return (
      <section className="initiative" aria-label="Initiative">
        <h3>⚔️ Initiative</h3>
        {isDm ? (
          <button type="button" onClick={() => save(NEW_ENCOUNTER)}>
            Start encounter
          </button>
        ) : (
          <p className="spells__hint">No encounter running.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }

  const inEncounter = new Set(shown.combatants.map((c) => c.characterId));
  const partyToAdd = party.filter((p) => !inEncounter.has(p.id));
  const hpOf = (c: Combatant) =>
    party.find((p) => p.id === c.characterId)?.character;

  const addParty = () =>
    save(
      addCombatants(
        shown,
        partyToAdd.map(({ id, character }) => ({
          id: newId(),
          name: character.characterName || "Unnamed",
          kind: "pc",
          characterId: id,
          armorClass: character.armorClass,
          initiative: roll(
            checkExpression(character.initiative),
            `${character.characterName}: Initiative`
          ).total,
        }))
      )
    );

  const addMonster = (monster: Monster, count: number) =>
    save(
      addCombatants(
        shown,
        numberedNames(monster.name, count, shown.combatants).map((name) => ({
          id: newId(),
          name,
          kind: "monster",
          srdIndex: monster.index,
          hitPoints: monster.hitPoints,
          maxHitPoints: monster.hitPoints,
          armorClass: monster.armorClass,
          initiative: roll(
            checkExpression(monsterInitiativeBonus(monster)),
            `${name}: Initiative`
          ).total,
        }))
      )
    );

  return (
    <section className="initiative" aria-label="Initiative">
      <div className="initiative__header">
        <h3>⚔️ Initiative</h3>
        <span className="initiative__round">Round {shown.round}</span>
      </div>
      {error && (
        <p className="play__error" role="alert">
          {error}
        </p>
      )}

      {shown.combatants.length === 0 ? (
        <p className="spells__hint">
          {isDm ? "Add the party and some monsters." : "Waiting for the DM…"}
        </p>
      ) : (
        <ol className="initiative__list" aria-label="Initiative order">
          {shown.combatants.map((c, i) => {
            const pc = hpOf(c);
            const active = i === shown.turn;
            return (
              <li
                key={c.id}
                className={`initiative__row${active ? " initiative__row--active" : ""}`}
                aria-current={active ? "step" : undefined}
              >
                <div className="initiative__main">
                  {isDm ? (
                    <NumberInput
                      className="initiative__score"
                      aria-label={`${c.name} initiative`}
                      value={c.initiative}
                      onChange={(initiative) =>
                        save(updateCombatant(shown, c.id, { initiative }))
                      }
                      fallback={c.initiative}
                    />
                  ) : (
                    <span className="initiative__score">{c.initiative}</span>
                  )}
                  {c.srdIndex && isDm ? (
                    <button
                      type="button"
                      className="initiative__name"
                      aria-expanded={open === c.id}
                      onClick={() => setOpen(open === c.id ? null : c.id)}
                    >
                      {c.name}
                    </button>
                  ) : (
                    <span className="initiative__name">{c.name}</span>
                  )}
                  {c.armorClass !== undefined && (
                    <span className="initiative__ac">AC {c.armorClass}</span>
                  )}
                  {pc && (
                    <span className="initiative__hp">
                      {pc.currentHitPoints}/{pc.maxHitPoints} HP
                      {pc.conditions.length > 0 &&
                        ` · ${pc.conditions.join(", ")}`}
                    </span>
                  )}
                  {c.kind === "monster" &&
                    (isDm ? (
                      <MonsterHp
                        combatant={c}
                        onChange={(hitPoints) =>
                          save(updateCombatant(shown, c.id, { hitPoints }))
                        }
                      />
                    ) : (
                      <span className="initiative__hp">{monsterHealth(c)}</span>
                    ))}
                  {isDm && (
                    <button
                      type="button"
                      className="spells__remove"
                      onClick={() => save(removeCombatant(shown, c.id))}
                      aria-label={`Remove ${c.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {open === c.id && c.srdIndex && (
                  <StatBlock srdIndex={c.srdIndex} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {isDm && (
        <div className="initiative__controls">
          <button type="button" onClick={() => save(previousTurn(shown))}>
            ← Previous
          </button>
          <button type="button" onClick={() => save(nextTurn(shown))}>
            Next turn →
          </button>
          {partyToAdd.length > 0 && (
            <button type="button" onClick={addParty}>
              Add party (roll initiative)
            </button>
          )}
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Done adding" : "Add monsters"}
          </button>
          <button
            type="button"
            onClick={() =>
              endEncounter(campaignId).catch((err) =>
                setError(errorMessage(err, "Couldn't end the encounter"))
              )
            }
          >
            End encounter
          </button>
        </div>
      )}
      {isDm && adding && (
        <MonsterPicker
          onAddMonster={addMonster}
          onAddCustom={(details) =>
            save(
              addCombatants(shown, [
                {
                  id: newId(),
                  kind: "monster",
                  name: details.name,
                  initiative: details.initiative,
                  hitPoints: details.hitPoints,
                  maxHitPoints: details.hitPoints,
                  armorClass: details.armorClass,
                },
              ])
            )
          }
        />
      )}
    </section>
  );
};

export default InitiativeTracker;
