import { Link } from "react-router-dom";
import Portrait from "../Portrait/Portrait";
import type { StoredCharacter } from "../../services/characters";
import { SKILLS, skillModifier } from "../../utils/dnd";
import { deathState } from "../../utils/play";
import { SPELL_LEVEL_NAMES, spellcastingFor } from "../../utils/spellcasting";

const DEATH_LABELS = { dying: "Dying", stable: "Stable", dead: "Dead" };

/** One character's live status, for the party view. */
const PartyCard = ({
  stored,
  playerName,
}: {
  stored: StoredCharacter;
  playerName: string;
}) => {
  const c = stored.character;
  const state = deathState(c);
  const perception = SKILLS.find((s) => s.name === "Perception")!;
  const slots = spellcastingFor(c)?.slots ?? [];
  const hpPercent = Math.min(
    100,
    (c.currentHitPoints / Math.max(1, c.maxHitPoints)) * 100
  );

  return (
    <article className="party-card" aria-label={c.characterName}>
      <header className="party-card__header">
        <Portrait url={c.portraitUrl} name={c.characterName} size="small" />
        <div>
          <Link to={`/characters/${stored.id}/play`}>
            <h3>{c.characterName || "Unnamed"}</h3>
          </Link>
          <p>
            {playerName} · Level {c.level} {c.class}
          </p>
        </div>
      </header>
      <div className="party-card__hp">
        <span aria-label={`${c.characterName} hit points`}>
          {c.currentHitPoints} / {c.maxHitPoints} HP
          {c.temporaryHitPoints > 0 && ` (+${c.temporaryHitPoints})`}
        </span>
        <div className="party-card__bar">
          <div style={{ width: `${hpPercent}%` }} />
        </div>
      </div>
      <p className="party-card__stats">
        AC <strong>{c.armorClass}</strong> · Passive Perception{" "}
        <strong>{10 + skillModifier(c, perception)}</strong>
      </p>
      {state !== "alive" && (
        <p className={`party-card__death party-card__death--${state}`}>
          {DEATH_LABELS[state]} ({c.deathSaveSuccesses} ✓ /{" "}
          {c.deathSaveFailures} ✗)
        </p>
      )}
      {(c.conditions.length > 0 || c.inspiration) && (
        <ul className="party-card__conditions" aria-label="Conditions">
          {c.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
          {c.inspiration && <li>✨ Inspiration</li>}
        </ul>
      )}
      {slots.some((n) => n > 0) && (
        <p className="party-card__slots">
          Slots:{" "}
          {slots
            .map((total, i) =>
              total > 0
                ? `${SPELL_LEVEL_NAMES[i + 1].split(" ")[0]} ${total - (c.spellSlotsUsed[i] ?? 0)}/${total}`
                : null
            )
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </article>
  );
};

export default PartyCard;
