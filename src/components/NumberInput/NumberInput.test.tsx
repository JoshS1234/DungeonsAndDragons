import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NumberInput from "./NumberInput";

const Harness = ({
  initial = 10,
  onChange = () => {},
}: {
  initial?: number;
  onChange?: (v: number) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="score">Score</label>
      <NumberInput
        id="score"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        fallback={10}
        min={1}
        max={30}
      />
      <button onClick={() => setValue(18)}>Set externally</button>
      <output>{value}</output>
    </>
  );
};

describe("NumberInput", () => {
  it("lets the field be cleared while typing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Score");

    await user.clear(input);
    expect(input).toHaveValue(null);

    await user.type(input, "15");
    expect(input).toHaveValue(15);
    expect(screen.getByRole("status")).toHaveTextContent("15");
  });

  it("restores the fallback when left empty", async () => {
    const user = userEvent.setup();
    render(<Harness initial={14} />);
    const input = screen.getByLabelText("Score");

    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue(10);
    expect(screen.getByRole("status")).toHaveTextContent("10");
  });

  it("clamps to min/max on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText("Score");

    await user.clear(input);
    await user.type(input, "45");
    await user.tab();

    expect(input).toHaveValue(30);
    expect(onChange).toHaveBeenLastCalledWith(30);
  });

  it("picks up value changes made elsewhere", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Set externally" }));

    expect(screen.getByLabelText("Score")).toHaveValue(18);
  });
});
