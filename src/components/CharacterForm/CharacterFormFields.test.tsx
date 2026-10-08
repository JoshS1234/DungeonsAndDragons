import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CharacterFormFields from "./CharacterFormFields";
import { DEFAULT_CHARACTER } from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";

const onChange = vi.fn<(character: CharacterData) => void>();
/** The character after the most recent field change. */
const latest = () => onChange.mock.lastCall![0];

const Harness = ({
  initial = DEFAULT_CHARACTER,
  disabled,
}: {
  initial?: CharacterData;
  disabled?: boolean;
}) => {
  const [character, setCharacter] = useState(initial);
  return (
    <CharacterFormFields
      character={character}
      onFieldChange={(key, value) => {
        const next = { ...character, [key]: value };
        setCharacter(next);
        onChange(next);
      }}
      disabled={disabled}
    />
  );
};

describe("CharacterFormFields", () => {
  it("updates text and select fields", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Character Name"), "Bruenor");
    await user.selectOptions(screen.getByLabelText("Class"), "Fighter");

    expect(latest().characterName).toBe("Bruenor");
    expect(latest().class).toBe("Fighter");
  });

  it("shows the ability modifier for the current score", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const strength = screen.getByRole("spinbutton", { name: "Strength (STR)" });

    await user.clear(strength);
    await user.type(strength, "17");

    expect(latest().strength).toBe(17);
    expect(strength.parentElement).toHaveTextContent("Modifier: +3");
  });

  it("toggles skill and saving throw proficiencies", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("Stealth (DEX)"));
    await user.click(screen.getByRole("checkbox", { name: "Wisdom (WIS)" }));
    expect(latest().skillProficiencies).toEqual(["Stealth"]);
    expect(latest().savingThrowProficiencies).toEqual(["WIS"]);

    await user.click(screen.getByLabelText("Stealth (DEX)"));
    expect(latest().skillProficiencies).toEqual([]);
  });

  it("keeps 0 current hit points", () => {
    render(<Harness initial={{ ...DEFAULT_CHARACTER, currentHitPoints: 0 }} />);
    expect(screen.getByLabelText("Current Hit Points")).toHaveValue(0);
  });

  it("disables every input in view-only mode", () => {
    const { container } = render(<Harness disabled />);
    const inputs = container.querySelectorAll("input, select, textarea");

    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect(input).toBeDisabled());
  });
});
