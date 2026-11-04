import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { rollDice } from "../../utils/dice";
import type { RollMode } from "../../utils/dice";
import { DiceContext } from "./diceContext";
import type { LoggedRoll } from "./diceContext";

const HISTORY_LENGTH = 20;

/** Keeps one roll history for the whole session, shared by every page. */
const DiceProvider = ({
  children,
  random,
}: {
  children: ReactNode;
  /** Override for tests. */
  random?: () => number;
}) => {
  const [history, setHistory] = useState<LoggedRoll[]>([]);
  const [mode, setMode] = useState<RollMode>("normal");
  const nextId = useRef(1);

  const roll = useCallback(
    (expression: string, label?: string) => {
      const result: LoggedRoll = {
        ...rollDice(expression, mode, random),
        id: nextId.current++,
        label,
      };
      setHistory((prev) => [result, ...prev].slice(0, HISTORY_LENGTH));
      return result;
    },
    [mode, random]
  );

  const value = useMemo(
    () => ({ history, mode, setMode, roll, clear: () => setHistory([]) }),
    [history, mode, roll]
  );

  return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>;
};

export default DiceProvider;
