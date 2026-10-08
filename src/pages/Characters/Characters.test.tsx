import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Characters from "./Characters";
import { listMyCharacters } from "../../services/characters";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import { renderSignedIn } from "../../test/renderSignedIn";
import { storedCharacter } from "../../test/fixtures";

vi.mock("../../services/characters", () => ({ listMyCharacters: vi.fn() }));
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
});
