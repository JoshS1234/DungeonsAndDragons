import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpellsSection from "./SpellsSection";
import { makeCharacter } from "../../test/fixtures";
import type { CharacterData } from "../../utils/dnd";
import type { KnownSpell } from "../../utils/spellcasting";

vi.mock("../../../firebaseSetup", () => ({ db: {} }));

const onChange = vi.fn<(spells: KnownSpell[]) => void>();

const Harness = ({
  character,
  disabled,
}: {
  character: CharacterData;
  disabled?: boolean;
}) => {
  const [spells, setSpells] = useState(character.knownSpells);
  return (
    <SpellsSection
      character={{ ...character, knownSpells: spells }}
      onChange={(next) => {
        setSpells(next);
        onChange(next);
      }}
      disabled={disabled}
    />
  );
};

const wizard = (knownSpells: KnownSpell[] = []) =>
  makeCharacter({
    class: "Wizard",
    level: 3,
    intelligence: 16,
    proficiencyBonus: 2,
    knownSpells,
  });

describe("SpellsSection", () => {
  it("summarises spellcasting for the class and level", () => {
    render(<Harness character={wizard()} />);

    expect(screen.getByText("INT")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument(); // save DC
    const slots = screen.getByLabelText("Spell slots");
    expect(slots).toHaveTextContent("1st level: 4");
    expect(slots).toHaveTextContent("2nd level: 2");
    expect(screen.getByText("Prepared: 0 / 6")).toBeInTheDocument();
  });

  it("adds SRD spells filtered to the class", async () => {
    const user = userEvent.setup();
    render(<Harness character={wizard()} />);

    await user.click(screen.getByRole("button", { name: "Add spells" }));
    await user.type(screen.getByLabelText("Search spells"), "magic missile");
    await user.click(
      await screen.findByRole("button", { name: "Add Magic Missile" })
    );

    expect(onChange).toHaveBeenLastCalledWith([
      {
        name: "Magic Missile",
        level: 1,
        srdIndex: "magic-missile",
        prepared: false,
      },
    ]);
    expect(
      screen.getByRole("button", { name: "Magic Missile added" })
    ).toBeDisabled();
  });

  it("hides spells above the character's level unless asked", async () => {
    const user = userEvent.setup();
    render(<Harness character={wizard()} />);
    await user.click(screen.getByRole("button", { name: "Add spells" }));
    await user.type(screen.getByLabelText("Search spells"), "fireball");

    expect(await screen.findByText("No spells match.")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Show all classes and levels"));
    expect(
      screen.getByRole("button", { name: "Add Fireball" })
    ).toBeInTheDocument();
  });

  it("adds custom spells", async () => {
    const user = userEvent.setup();
    render(<Harness character={wizard()} />);
    await user.click(screen.getByRole("button", { name: "Add spells" }));

    await user.type(screen.getByLabelText("Name"), "Toll the Dead");
    await user.selectOptions(screen.getByLabelText("Level"), "Cantrip");
    await user.type(screen.getByLabelText("Details"), "WIS save, 1d8 necrotic");
    await user.click(screen.getByRole("button", { name: "Add custom spell" }));

    expect(onChange).toHaveBeenLastCalledWith([
      {
        name: "Toll the Dead",
        level: 0,
        prepared: true,
        notes: "WIS save, 1d8 necrotic",
      },
    ]);
    expect(screen.getByText("(custom)")).toBeInTheDocument();
  });

  it("prepares, expands and removes spells", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        character={wizard([
          { name: "Shield", level: 1, prepared: false, srdIndex: "shield" },
        ])}
      />
    );

    await user.click(screen.getByLabelText("Shield prepared"));
    expect(screen.getByText("Prepared: 1 / 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Shield" }));
    expect(
      await screen.findByText(/An invisible barrier of magical force/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Shield" }));
    expect(screen.getByText("No spells yet.")).toBeInTheDocument();
  });

  it("flags going over the class limits", () => {
    render(
      <Harness
        character={makeCharacter({
          class: "Sorcerer",
          level: 1,
          knownSpells: ["A", "B", "C"].map((name) => ({
            name,
            level: 1,
            prepared: true,
          })),
        })}
      />
    );

    expect(screen.getByText(/Spells known: 3 \/ 2/)).toHaveTextContent(
      "over the usual limit"
    );
  });

  it("explains when a class can't cast", () => {
    render(<Harness character={makeCharacter({ class: "Fighter" })} />);
    expect(screen.getByText(/Fighters don't cast spells/)).toBeInTheDocument();
  });

  it("is read-only when disabled", () => {
    render(
      <Harness
        character={wizard([{ name: "Shield", level: 1, prepared: true }])}
        disabled
      />
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("checkbox")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Remove Shield" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add spells" })
    ).not.toBeInTheDocument();
  });
});
