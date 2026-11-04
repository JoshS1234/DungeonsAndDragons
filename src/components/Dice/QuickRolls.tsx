import {
  ABILITIES,
  SKILLS,
  calculateModifier,
  formatModifier,
  savingThrowModifier,
  skillModifier,
} from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";
import { checkExpression, parseDice } from "../../utils/dice";
import { attackBonus, damageExpression } from "../../utils/inventory";
import { useDice } from "./diceContext";
import RollModeToggle from "./RollModeToggle";
import RollLog from "./RollLog";
import "./Dice.scss";

type Check = { label: string; name: string; modifier: number };

const isRollable = (expression: string) => {
  try {
    parseDice(expression);
    return true;
  } catch {
    return false;
  }
};

/** One-tap d20 rolls using a character's modifiers. */
const QuickRolls = ({ character }: { character: CharacterData }) => {
  const { roll } = useDice();
  const name = character.characterName || "Character";

  const groups: Array<{ title: string; checks: Check[] }> = [
    {
      title: "Ability checks",
      checks: ABILITIES.map((ability) => ({
        label: ability.abbrev,
        name: `${ability.name} check`,
        modifier: calculateModifier(character[ability.key]),
      })),
    },
    {
      title: "Saving throws",
      checks: ABILITIES.map((ability) => ({
        label: ability.abbrev,
        name: `${ability.name} save`,
        modifier: savingThrowModifier(character, ability),
      })),
    },
    {
      title: "Skills",
      checks: SKILLS.map((skill) => ({
        label: skill.name,
        name: skill.name,
        modifier: skillModifier(character, skill),
      })),
    },
    {
      title: "Combat",
      checks: [
        {
          label: "Initiative",
          name: "Initiative",
          modifier: character.initiative,
        },
      ],
    },
  ];

  return (
    <div className="quick-rolls">
      <RollModeToggle />
      {groups.map((group) => (
        <div key={group.title} className="quick-rolls__group">
          <h4>{group.title}</h4>
          <div className="quick-rolls__buttons">
            {group.checks.map((check) => (
              <button
                key={check.name}
                type="button"
                className="quick-rolls__button"
                aria-label={`Roll ${check.name} (${formatModifier(check.modifier)})`}
                onClick={() =>
                  roll(
                    checkExpression(check.modifier),
                    `${name}: ${check.name}`
                  )
                }
              >
                <span>{check.label}</span>
                <span className="quick-rolls__modifier">
                  {formatModifier(check.modifier)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {character.attacks.length > 0 && (
        <div className="quick-rolls__group">
          <h4>Attacks</h4>
          <div className="quick-rolls__buttons">
            {character.attacks.map((attack, i) => {
              const toHit = attackBonus(character, attack);
              const damage = damageExpression(character, attack);
              const label = attack.name || "Attack";
              return (
                <span key={i} className="quick-rolls__attack">
                  <button
                    type="button"
                    className="quick-rolls__button"
                    aria-label={`Roll ${label} to hit (${formatModifier(toHit)})`}
                    onClick={() =>
                      roll(checkExpression(toHit), `${name}: ${label} to hit`)
                    }
                  >
                    <span>{label}</span>
                    <span className="quick-rolls__modifier">
                      {formatModifier(toHit)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="quick-rolls__button"
                    aria-label={`Roll ${label} damage (${damage})`}
                    disabled={!isRollable(damage)}
                    onClick={() => roll(damage, `${name}: ${label} damage`)}
                  >
                    <span className="quick-rolls__modifier">{damage}</span>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
      <RollLog limit={5} />
    </div>
  );
};

export default QuickRolls;
