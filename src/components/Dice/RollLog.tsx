import { useDice } from "./diceContext";
import type { LoggedRoll } from "./diceContext";
import type { RolledTerm } from "../../utils/dice";

const describeTerm = (term: RolledTerm, index: number) => {
  const sign = term.sign < 0 ? "−" : index > 0 ? "+" : "";
  if (term.kind === "flat") return `${sign} ${term.value}`.trim();
  const kept = `[${term.rolls.join(", ")}]`;
  const dropped = term.dropped.length
    ? ` (dropped ${term.dropped.join(", ")})`
    : "";
  return `${sign} ${term.count}d${term.sides} ${kept}${dropped}`.trim();
};

const RollEntry = ({ roll }: { roll: LoggedRoll }) => {
  const isCrit = roll.natural === 20;
  const isFumble = roll.natural === 1;
  return (
    <li className="roll-log__entry">
      <div className="roll-log__summary">
        <span className="roll-log__label">{roll.label ?? roll.expression}</span>
        <span
          className={`roll-log__total${
            isCrit ? " roll-log__total--crit" : ""
          }${isFumble ? " roll-log__total--fumble" : ""}`}
          aria-label={`Total ${roll.total}`}
        >
          {roll.total}
        </span>
      </div>
      <div className="roll-log__detail">
        {roll.terms.map(describeTerm).join(" ")}
        {roll.mode !== "normal" && roll.natural !== undefined && (
          <span> · {roll.mode}</span>
        )}
        {isCrit && <strong className="roll-log__flag"> Natural 20!</strong>}
        {isFumble && <strong className="roll-log__flag"> Natural 1</strong>}
      </div>
    </li>
  );
};

const RollLog = ({ limit }: { limit?: number }) => {
  const { history, clear } = useDice();
  const shown = limit ? history.slice(0, limit) : history;

  if (shown.length === 0) {
    return <p className="roll-log__empty">No rolls yet.</p>;
  }

  return (
    <div className="roll-log">
      <ol className="roll-log__list" aria-label="Roll history">
        {shown.map((roll) => (
          <RollEntry key={roll.id} roll={roll} />
        ))}
      </ol>
      <button type="button" className="roll-log__clear" onClick={clear}>
        Clear history
      </button>
    </div>
  );
};

export default RollLog;
