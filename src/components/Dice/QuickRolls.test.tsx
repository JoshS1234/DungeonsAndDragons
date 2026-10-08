import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiceProvider from "./DiceProvider";
import QuickRolls from "./QuickRolls";
import { makeCharacter } from "../../test/fixtures";

vi.mock("../../../firebaseSetup", () => ({ db: {} }));

describe("QuickRolls", () => {
  it("rolls skills with the character's modifier", async () => {
    const user = userEvent.setup();
    render(
      <DiceProvider random={() => 0.5}>
        <QuickRolls
          character={makeCharacter({
            dexterity: 16,
            proficiencyBonus: 2,
            skillProficiencies: ["Stealth"],
          })}
        />
      </DiceProvider>
    );

    await user.click(screen.getByRole("button", { name: "Roll Stealth (+5)" }));

    const history = screen.getByRole("list", { name: "Roll history" });
    expect(within(history).getByText("Thalia: Stealth")).toBeInTheDocument();
    expect(within(history).getByLabelText("Total 16")).toBeInTheDocument();
  });

  it("offers saves, checks and initiative", () => {
    render(
      <DiceProvider>
        <QuickRolls
          character={makeCharacter({
            wisdom: 8,
            initiative: 3,
            savingThrowProficiencies: ["WIS"],
          })}
        />
      </DiceProvider>
    );

    expect(
      screen.getByRole("button", { name: "Roll Wisdom check (-1)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Roll Wisdom save (+1)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Roll Initiative (+3)" })
    ).toBeInTheDocument();
  });

  it("rolls attacks and damage", async () => {
    const user = userEvent.setup();
    render(
      <DiceProvider random={() => 0.5}>
        <QuickRolls
          character={makeCharacter({
            strength: 16,
            proficiencyBonus: 2,
            attacks: [
              {
                name: "Longsword",
                ability: "STR",
                proficient: true,
                damageDice: "1d8",
                damageType: "Slashing",
                magicBonus: 0,
              },
            ],
          })}
        />
      </DiceProvider>
    );

    await user.click(
      screen.getByRole("button", { name: "Roll Longsword to hit (+5)" })
    );
    await user.click(
      screen.getByRole("button", { name: "Roll Longsword damage (1d8+3)" })
    );

    const history = screen.getByRole("list", { name: "Roll history" });
    expect(
      within(history).getByText("Thalia: Longsword to hit")
    ).toBeInTheDocument();
    expect(within(history).getByLabelText("Total 8")).toBeInTheDocument();
  });
});
