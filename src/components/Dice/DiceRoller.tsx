import { useState } from "react";
import type { FormEvent } from "react";
import { DiceError } from "../../utils/dice";
import { useDice } from "./diceContext";
import RollModeToggle from "./RollModeToggle";
import RollLog from "./RollLog";
import "./Dice.scss";

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

const DiceRoller = () => {
  const { roll } = useDice();
  const [expression, setExpression] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tryRoll = (expr: string) => {
    try {
      roll(expr);
      setError(null);
    } catch (err) {
      if (!(err instanceof DiceError)) throw err;
      setError(err.message);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    tryRoll(expression);
  };

  return (
    <div className="dice-roller">
      <RollModeToggle />
      <div className="dice-roller__quick">
        {QUICK_DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            className="dice-roller__die"
            onClick={() => tryRoll(`1d${sides}`)}
          >
            d{sides}
          </button>
        ))}
      </div>
      <form className="dice-roller__form" onSubmit={handleSubmit}>
        <label htmlFor="dice-expression">Roll</label>
        <input
          id="dice-expression"
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="e.g. 2d6+3"
          autoComplete="off"
        />
        <button type="submit" className="dice-roller__roll">
          Roll
        </button>
      </form>
      {error && (
        <p className="dice-roller__error" role="alert">
          {error}
        </p>
      )}
      <RollLog />
    </div>
  );
};

export default DiceRoller;
