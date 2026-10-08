import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InventorySection from "./InventorySection";
import AttacksSection from "./AttacksSection";
import { makeCharacter } from "../../test/fixtures";
import type { CharacterData } from "../../utils/dnd";

vi.mock("../../../firebaseSetup", () => ({ db: {} }));

let latest: CharacterData;
const Harness = ({ initial }: { initial: CharacterData }) => {
  const [character, setCharacter] = useState(initial);
  const update = (fields: Partial<CharacterData>) =>
    setCharacter((prev) => {
      latest = { ...prev, ...fields };
      return latest;
    });
  return (
    <>
      <InventorySection character={character} onChange={update} />
      <AttacksSection
        character={character}
        onChange={(attacks) => update({ attacks })}
      />
    </>
  );
};

describe("InventorySection", () => {
  it("tracks coins", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeCharacter()} />);

    await user.clear(screen.getByLabelText("Gold (GP)"));
    await user.type(screen.getByLabelText("Gold (GP)"), "25");

    expect(latest.currency.gp).toBe(25);
  });

  it("adds an SRD weapon as an item and an attack", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeCharacter({ strength: 16 })} />);

    await user.click(screen.getByRole("button", { name: "Add items" }));
    await user.type(screen.getByLabelText("Search equipment"), "longsword");
    await user.click(
      await screen.findByRole("button", { name: "Add Longsword" })
    );

    expect(latest.inventory).toEqual([
      { name: "Longsword", quantity: 1, srdIndex: "longsword" },
    ]);
    expect(screen.getByText(/\+5 to hit, 1d8\+3 Slashing/)).toBeInTheDocument();
  });

  it("stacks repeated items and adds custom ones", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeCharacter()} />);
    await user.click(screen.getByRole("button", { name: "Add items" }));

    await user.type(screen.getByLabelText("Custom item"), "Lucky coin{Enter}");
    await user.type(screen.getByLabelText("Custom item"), "Lucky coin{Enter}");

    expect(latest.inventory).toEqual([{ name: "Lucky coin", quantity: 2 }]);
    expect(screen.getByLabelText("Lucky coin quantity")).toHaveValue(2);
  });

  it("removes items", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={makeCharacter({ inventory: [{ name: "Rope", quantity: 1 }] })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove Rope" }));

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
  });
});

describe("AttacksSection", () => {
  it("updates the to-hit and damage summary as fields change", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeCharacter({ dexterity: 16 })} />);

    await user.click(screen.getByRole("button", { name: "Add attack" }));
    await user.type(screen.getByLabelText("Name"), "Hand crossbow");
    await user.selectOptions(screen.getByLabelText("Ability"), "DEX");
    await user.clear(screen.getByLabelText("Damage dice"));
    await user.type(screen.getByLabelText("Damage dice"), "1d6");

    expect(screen.getByText(/\+5 to hit, 1d6\+3/)).toBeInTheDocument();
    expect(latest.attacks[0]).toMatchObject({
      name: "Hand crossbow",
      ability: "DEX",
    });
  });

  it("warns about damage dice it can't roll", async () => {
    const user = userEvent.setup();
    render(<Harness initial={makeCharacter()} />);

    await user.click(screen.getByRole("button", { name: "Add attack" }));
    await user.clear(screen.getByLabelText("Damage dice"));
    await user.type(screen.getByLabelText("Damage dice"), "lots");

    expect(
      screen.getByText("Damage dice should look like 1d8 or 2d6.")
    ).toBeInTheDocument();
  });
});
