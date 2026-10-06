import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "onBlur" | "min" | "max"
> & {
  value: number;
  onChange: (value: number) => void;
  /** Value used when the field is left empty or invalid. */
  fallback: number;
  min?: number;
  max?: number;
};

/**
 * Number input that lets the user clear the field while typing, then
 * restores `fallback` (or clamps to min/max) when the field loses focus.
 */
const NumberInput = ({
  value,
  onChange,
  fallback,
  min,
  max,
  ...inputProps
}: NumberInputProps) => {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Pick up changes made outside this input (loading a character, dice rolls).
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const commit = (next: number) => {
    setDraft(String(next));
    onChange(next);
  };

  return (
    <input
      {...inputProps}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseInt(e.target.value, 10);
        if (!isNaN(parsed)) onChange(parsed);
      }}
      onBlur={(e) => {
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed)) {
          commit(fallback);
          return;
        }
        commit(Math.min(Math.max(parsed, min ?? -Infinity), max ?? Infinity));
      }}
    />
  );
};

export default NumberInput;
