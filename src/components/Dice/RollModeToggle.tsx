import type { RollMode } from "../../utils/dice";
import { useDice } from "./diceContext";

const MODES: Array<{ mode: RollMode; label: string }> = [
  { mode: "disadvantage", label: "Disadvantage" },
  { mode: "normal", label: "Normal" },
  { mode: "advantage", label: "Advantage" },
];

/** Advantage applies to d20 rolls only. */
const RollModeToggle = () => {
  const { mode, setMode } = useDice();
  return (
    <div className="roll-mode" role="radiogroup" aria-label="d20 roll mode">
      {MODES.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          className={`roll-mode__option${
            mode === option.mode ? " roll-mode__option--active" : ""
          }`}
          onClick={() => setMode(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default RollModeToggle;
