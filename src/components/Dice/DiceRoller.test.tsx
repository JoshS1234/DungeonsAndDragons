import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DiceProvider from "./DiceProvider";
import DiceRoller from "./DiceRoller";

/** A fake Math.random that always returns `fraction`. */
const always = (fraction: number) => () => fraction;

const renderRoller = (random = always(0.5)) =>
  render(
    <DiceProvider random={random}>
      <DiceRoller />
    </DiceProvider>
  );

const history = () => screen.getByRole("list", { name: "Roll history" });

describe("DiceRoller", () => {
  it("rolls a single die from the quick buttons", async () => {
    const user = userEvent.setup();
    renderRoller(always(0.5));

    await user.click(screen.getByRole("button", { name: "d20" }));

    expect(within(history()).getByLabelText("Total 11")).toBeInTheDocument();
  });

  it("rolls a typed expression", async () => {
    const user = userEvent.setup();
    renderRoller(always(0));

    await user.type(screen.getByLabelText("Roll"), "2d6 + 3{Enter}");

    expect(within(history()).getByText("2d6 + 3")).toBeInTheDocument();
    expect(within(history()).getByLabelText("Total 5")).toBeInTheDocument();
  });

  it("explains invalid expressions", async () => {
    const user = userEvent.setup();
    renderRoller();

    await user.type(screen.getByLabelText("Roll"), "fireball{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Couldn\'t understand "fireball".'
    );
  });

  it("applies advantage to d20 rolls", async () => {
    const user = userEvent.setup();
    let call = 0;
    renderRoller(() => (call++ % 2 === 0 ? 0.1 : 0.9));

    await user.click(screen.getByRole("radio", { name: "Advantage" }));
    await user.click(screen.getByRole("button", { name: "d20" }));

    expect(within(history()).getByLabelText("Total 19")).toBeInTheDocument();
    expect(history()).toHaveTextContent("dropped 3");
    expect(screen.getByRole("radio", { name: "Advantage" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("calls out natural 20s and clears history", async () => {
    const user = userEvent.setup();
    renderRoller(always(0.99));

    await user.click(screen.getByRole("button", { name: "d20" }));
    expect(history()).toHaveTextContent("Natural 20!");

    await user.click(screen.getByRole("button", { name: "Clear history" }));
    expect(screen.getByText("No rolls yet.")).toBeInTheDocument();
  });
});
