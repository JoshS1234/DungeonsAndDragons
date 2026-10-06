import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDoc } from "firebase/firestore";
import CreateCharacter from "./CreateCharacter";

vi.mock("../../../firebaseSetup", () => ({
  auth: { currentUser: { uid: "user-1", displayName: "Josh", email: null } },
  db: {},
}));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "characters-collection"),
  addDoc: vi.fn(() => Promise.resolve({ id: "new-character" })),
  serverTimestamp: vi.fn(() => "now"),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
}));
vi.mock("../../utils/dnd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/dnd")>()),
  rollAbilityScores: () => [17, 15, 14, 12, 10, 8],
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <CreateCharacter />
    </MemoryRouter>
  );

describe("CreateCharacter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("assigns rolled scores to abilities", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /Roll Ability Scores/ })
    );
    await user.click(
      screen.getByRole("button", { name: "Assign 17 to Strength" })
    );

    expect(
      screen.getByRole("spinbutton", { name: "Strength (STR)" })
    ).toHaveValue(17);
    // The same rolled score can't be used for the other five abilities
    const taken = screen.getAllByRole("button", {
      name: "17 is already assigned to Strength",
    });
    expect(taken).toHaveLength(5);
    taken.forEach((button) => expect(button).toBeDisabled());

    await user.click(
      screen.getByRole("button", { name: "Click to unassign 17 from Strength" })
    );
    expect(
      screen.getByRole("spinbutton", { name: "Strength (STR)" })
    ).toHaveValue(10);
  });

  it("saves the character to Firestore", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Character Name"), "Bruenor");
    await user.selectOptions(screen.getByLabelText("Class"), "Fighter");
    await user.selectOptions(screen.getByLabelText("Race"), "Dwarf");
    await user.click(screen.getByRole("button", { name: "Create Character" }));

    expect(addDoc).toHaveBeenCalledWith(
      "characters-collection",
      expect.objectContaining({
        characterName: "Bruenor",
        class: "Fighter",
        race: "Dwarf",
        strength: 10,
        userId: "user-1",
        campaignIds: [],
      })
    );
  });
});
