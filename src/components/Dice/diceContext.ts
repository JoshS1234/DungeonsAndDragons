import { createContext, useContext } from "react";
import type { RollMode, RollResult } from "../../utils/dice";

export interface LoggedRoll extends RollResult {
  id: number;
  label?: string;
}

export interface DiceContextValue {
  history: LoggedRoll[];
  mode: RollMode;
  setMode: (mode: RollMode) => void;
  /** Roll and log an expression. Throws DiceError for invalid input. */
  roll: (expression: string, label?: string) => LoggedRoll;
  clear: () => void;
}

export const DiceContext = createContext<DiceContextValue | null>(null);

export const useDice = (): DiceContextValue => {
  const dice = useContext(DiceContext);
  if (!dice) throw new Error("useDice must be used inside DiceProvider");
  return dice;
};
