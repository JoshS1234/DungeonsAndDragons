import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import Portrait from "../../components/Portrait/Portrait";
import QuickRolls from "../../components/Dice/QuickRolls";
import { useDice } from "../../components/Dice/diceContext";
import {
  updateCharacterFields,
  watchCharacter,
} from "../../services/characters";
import type { StoredCharacter } from "../../services/characters";
import { SKILLS, formatModifier, skillModifier } from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";
import { errorMessage, isPermissionDenied } from "../../utils/errors";
import {
  CONDITIONS,
  applyDamage,
  applyDeathSave,
  applyHealing,
  applyTemporaryHitPoints,
  deathState,
  hitDieExpression,
  longRest,
  shortRest,
} from "../../utils/play";
import { SPELL_LEVEL_NAMES, spellcastingFor } from "../../utils/spellcasting";
import "./PlayMode.scss";

const DEATH_STATE_TEXT = {
  dying: "Dying: make death saving throws",
  stable: "Stable at 0 HP",
  dead: "Dead",
};

/** Three toggleable pips, e.g. for death save successes. */
const Pips = ({
  label,
  count,
  onSet,
  disabled,
}: {
  label: string;
  count: number;
  onSet: (count: number) => void;
  disabled: boolean;
}) => (
  <div className="play__pips" role="group" aria-label={label}>
    <span>{label}</span>
    {[1, 2, 3].map((n) => (
      <button
        key={n}
        type="button"
        className={`play__pip${n <= count ? " play__pip--on" : ""}`}
        aria-pressed={n <= count}
        aria-label={`${label} ${n}`}
        disabled={disabled}
        onClick={() => onSet(n <= count ? n - 1 : n)}
      />
    ))}
  </div>
);

const PlayMode = () => {
  const user = useCurrentUser();
  const { roll } = useDice();
  const characterId = useParams<{ id: string }>().id!;
  const [stored, setStored] = useState<StoredCharacter | null | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(
    () =>
      watchCharacter(characterId, setStored, (err) =>
        setLoadError(
          isPermissionDenied(err)
            ? "You don't have permission to view this character"
            : errorMessage(err, "Failed to load character")
        )
      ),
    [characterId]
  );

  if (loadError || stored === null) {
    return (
      <div className="page-content">
        <h2>Character unavailable</h2>
        <p role="alert">{loadError ?? "Character not found"}</p>
      </div>
    );
  }
  if (!stored) return <p className="app-loading">Loading…</p>;

  const c = stored.character;
  const canEdit = stored.userId === user.uid;
  const casting = spellcastingFor(c);
  const state = deathState(c);
  const perception = SKILLS.find((s) => s.name === "Perception")!;

  // Apply locally straight away; the snapshot listener confirms the save
  const apply = (fields: Partial<CharacterData>) => {
    if (Object.keys(fields).length === 0) return;
    setStored({ ...stored, character: { ...c, ...fields } });
    setSaveError(null);
    updateCharacterFields(characterId, fields).catch((err) =>
      setSaveError(errorMessage(err, "Couldn't save. Check your connection."))
    );
  };

  const amountValue = Math.max(0, parseInt(amount, 10) || 0);
  const applyAmount = (
    change: (vitals: CharacterData, n: number) => Partial<CharacterData>
  ) => {
    apply(change(c, amountValue));
    setAmount("");
  };

  const rollDeathSave = () => {
    const result = roll("1d20", `${c.characterName}: Death save`);
    apply(applyDeathSave(c, result.natural ?? result.total));
  };

  const takeShortRest = () => {
    const result = roll(
      hitDieExpression(c),
      `${c.characterName}: Hit Die (short rest)`
    );
    apply({
      ...applyHealing(c, Math.max(0, result.total)),
      ...shortRest(c),
    });
  };

  const toggleSlot = (levelIndex: number, slot: number) => {
    const used = [...c.spellSlotsUsed];
    used[levelIndex] = slot < used[levelIndex] ? slot : slot + 1;
    apply({ spellSlotsUsed: used });
  };

  const toggleCondition = (condition: string) =>
    apply({
      conditions: c.conditions.includes(condition)
        ? c.conditions.filter((x) => x !== condition)
        : [...c.conditions, condition],
    });

  return (
    <div className="play">
      <div className="play__header">
        <Portrait url={c.portraitUrl} name={c.characterName} />
        <div className="play__title">
          <h2>{c.characterName || "Unnamed"}</h2>
          <p>
            Level {c.level} {c.race} {c.class}
          </p>
        </div>
        <Link to={`/characters/${characterId}`} className="back-button">
          Full sheet
        </Link>
      </div>

      {!canEdit && (
        <p className="view-only-note">View only: this isn't your character</p>
      )}
      {saveError && (
        <p className="play__error" role="alert">
          {saveError}
        </p>
      )}

      <div className="play__stats">
        <span>
          AC <strong>{c.armorClass}</strong>
        </span>
        <span>
          Speed <strong>{c.speed} ft</strong>
        </span>
        <span>
          Initiative <strong>{formatModifier(c.initiative)}</strong>
        </span>
        <span>
          Proficiency <strong>{formatModifier(c.proficiencyBonus)}</strong>
        </span>
        <span>
          Passive Perception{" "}
          <strong>{10 + skillModifier(c, perception)}</strong>
        </span>
      </div>

      <section className="play__card play__hp" aria-label="Hit points">
        <div className="play__hp-values">
          <span className="play__hp-current" aria-label="Current hit points">
            {c.currentHitPoints}
          </span>
          <span className="play__hp-max">/ {c.maxHitPoints} HP</span>
          {c.temporaryHitPoints > 0 && (
            <span className="play__hp-temp">+{c.temporaryHitPoints} temp</span>
          )}
        </div>
        <div
          className="play__hp-bar"
          role="presentation"
          style={{
            width: `${Math.min(100, (c.currentHitPoints / Math.max(1, c.maxHitPoints)) * 100)}%`,
          }}
        />
        {canEdit && (
          <div className="play__hp-controls">
            <label htmlFor="hp-amount">Amount</label>
            <input
              id="hp-amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              className="play__damage"
              disabled={!amountValue}
              onClick={() => applyAmount(applyDamage)}
            >
              Damage
            </button>
            <button
              type="button"
              className="play__heal"
              disabled={!amountValue}
              onClick={() => applyAmount(applyHealing)}
            >
              Heal
            </button>
            <button
              type="button"
              disabled={!amountValue}
              onClick={() => applyAmount(applyTemporaryHitPoints)}
            >
              Temp HP
            </button>
          </div>
        )}
      </section>

      {state !== "alive" && (
        <section
          className={`play__card play__death play__death--${state}`}
          aria-label="Death saves"
        >
          <h3>{DEATH_STATE_TEXT[state]}</h3>
          <Pips
            label="Successes"
            count={c.deathSaveSuccesses}
            onSet={(n) => apply({ deathSaveSuccesses: n })}
            disabled={!canEdit}
          />
          <Pips
            label="Failures"
            count={c.deathSaveFailures}
            onSet={(n) => apply({ deathSaveFailures: n })}
            disabled={!canEdit}
          />
          {canEdit && state === "dying" && (
            <button type="button" onClick={rollDeathSave}>
              Roll death save
            </button>
          )}
        </section>
      )}

      {casting && casting.maxSpellLevel > 0 && (
        <section className="play__card" aria-label="Spell slots">
          <h3>Spell slots</h3>
          {casting.slots.map((total, i) =>
            total > 0 ? (
              <div key={i} className="play__slots">
                <span>{SPELL_LEVEL_NAMES[i + 1]}</span>
                {Array.from({ length: total }, (_, slot) => (
                  <input
                    key={slot}
                    type="checkbox"
                    checked={slot < (c.spellSlotsUsed[i] ?? 0)}
                    onChange={() => toggleSlot(i, slot)}
                    disabled={!canEdit}
                    aria-label={`${SPELL_LEVEL_NAMES[i + 1]} slot ${slot + 1} used`}
                  />
                ))}
              </div>
            ) : null
          )}
          <p className="play__hint">
            Save DC {casting.saveDC} · Spell attack{" "}
            {formatModifier(casting.attackBonus)}
          </p>
        </section>
      )}

      <section className="play__card" aria-label="Conditions">
        <h3>Conditions</h3>
        <div className="play__chips">
          {CONDITIONS.map((condition) => (
            <button
              key={condition}
              type="button"
              className={`play__chip${
                c.conditions.includes(condition) ? " play__chip--on" : ""
              }`}
              aria-pressed={c.conditions.includes(condition)}
              disabled={!canEdit}
              onClick={() => toggleCondition(condition)}
            >
              {condition}
            </button>
          ))}
          <button
            type="button"
            className={`play__chip${c.inspiration ? " play__chip--on" : ""}`}
            aria-pressed={c.inspiration}
            disabled={!canEdit}
            onClick={() => apply({ inspiration: !c.inspiration })}
          >
            ✨ Inspiration
          </button>
        </div>
      </section>

      {canEdit && (
        <div className="play__rests">
          <button type="button" onClick={takeShortRest}>
            Short rest (spend a Hit Die)
          </button>
          <button type="button" onClick={() => apply(longRest(c))}>
            Long rest
          </button>
        </div>
      )}

      <section className="play__card" aria-label="Quick rolls">
        <h3>Rolls</h3>
        <QuickRolls character={c} />
      </section>
    </div>
  );
};

export default PlayMode;
