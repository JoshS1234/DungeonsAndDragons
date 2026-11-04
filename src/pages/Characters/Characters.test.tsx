import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Characters from "./Characters";
import { createCharacter, listMyCharacters } from "../../services/characters";
import { toCharacterFile } from "../../utils/characterFile";
import { makeCharacter, storedCharacter } from "../../test/fixtures";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import { renderSignedIn } from "../../test/renderSignedIn";

vi.mock("../../services/characters", () => ({
  listMyCharacters: vi.fn(),
  createCharacter: vi.fn(),
  fallbackPlayerName: () => "Josh",
}));
vi.mock("../../utils/fillCharacterPDF", () => ({
  fillCharacterPDF: vi.fn(),
}));

describe("Characters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the user's characters", async () => {
    vi.mocked(listMyCharacters).mockResolvedValue([
      storedCharacter({ characterName: "Thalia", background: "Urchin" }),
      storedCharacter({ characterName: "Vex" }, { id: "char-2" }),
    ]);
    renderSignedIn(<Characters />);

    expect(
      await screen.findByRole("heading", { name: "Your Characters (2)" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Thalia/ })).toHaveAttribute(
      "href",
      "/characters/char-1"
    );
    expect(screen.getByText("Urchin")).toBeInTheDocument();
    expect(listMyCharacters).toHaveBeenCalledWith("user-1");
  });

  it("shows an empty state", async () => {
    vi.mocked(listMyCharacters).mockResolvedValue([]);
    renderSignedIn(<Characters />);

    expect(
      await screen.findByText(/No characters created yet/)
    ).toBeInTheDocument();
  });

  it("shows load errors", async () => {
    vi.mocked(listMyCharacters).mockRejectedValue(new Error("Offline"));
    renderSignedIn(<Characters />);

    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });

  it("exports a character's PDF from the list", async () => {
    const user = userEvent.setup();
    const thalia = storedCharacter();
    vi.mocked(listMyCharacters).mockResolvedValue([thalia]);
    renderSignedIn(<Characters />);

    await user.click(
      await screen.findByRole("button", { name: "📄 Export PDF" })
    );

    expect(fillCharacterPDF).toHaveBeenCalledWith(thalia.character);
  });

  it("imports a character from a backup file", async () => {
    const user = userEvent.setup();
    vi.mocked(listMyCharacters).mockResolvedValue([]);
    vi.mocked(createCharacter).mockResolvedValue("new-id");
    renderSignedIn(<Characters />);
    const file = new File(
      [toCharacterFile(makeCharacter({ characterName: "Vex" }))],
      "Vex.json",
      { type: "application/json" }
    );

    await user.upload(await screen.findByLabelText("Import character"), file);

    expect(createCharacter).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ characterName: "Vex" }),
      "Josh"
    );
    expect(
      await screen.findByText("Navigated to another page")
    ).toBeInTheDocument();
  });

  it("explains files it can't import", async () => {
    const user = userEvent.setup();
    vi.mocked(listMyCharacters).mockResolvedValue([]);
    renderSignedIn(<Characters />);

    await user.upload(
      await screen.findByLabelText("Import character"),
      new File(["{}"], "random.json", { type: "application/json" })
    );

    expect(
      await screen.findByText(/doesn't look like a character file/)
    ).toBeInTheDocument();
    expect(createCharacter).not.toHaveBeenCalled();
  });
});
