import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayMode from "./PlayMode";
import {
  updateCharacterFields,
  watchCharacter,
} from "../../services/characters";
import type { StoredCharacter } from "../../services/characters";
import { renderSignedIn } from "../../test/renderSignedIn";
import { permissionDenied, storedCharacter } from "../../test/fixtures";
import type { CharacterData } from "../../utils/dnd";

vi.mock("../../services/characters", () => ({
  watchCharacter: vi.fn(),
  updateCharacterFields: vi.fn(() => Promise.resolve()),
}));

let emit: (character: StoredCharacter | null) => void;
let fail: (error: Error) => void;

const renderPlay = (
  overrides: Partial<CharacterData> = {},
  owner = "user-1"
) => {
  vi.mocked(watchCharacter).mockImplementation((_id, onChange, onError) => {
    emit = onChange;
    fail = onError;
    return () => {};
  });
  renderSignedIn(<PlayMode />, {
    path: "/characters/:id/play",
    url: "/characters/char-1/play",
  });
  act(() =>
    emit(
      storedCharacter(
        { maxHitPoints: 20, currentHitPoints: 15, ...overrides },
        { userId: owner }
      )
    )
  );
};

const hp = () => screen.getByLabelText("Current hit points");

describe("PlayMode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies damage, using temporary HP first, and saves", async () => {
    const user = userEvent.setup();
    renderPlay({ temporaryHitPoints: 3 });

    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Damage" }));

    expect(hp()).toHaveTextContent("13");
    expect(updateCharacterFields).toHaveBeenCalledWith("char-1", {
      temporaryHitPoints: 0,
      currentHitPoints: 13,
    });
    expect(screen.getByLabelText("Amount")).toHaveValue(null);
  });

  it("heals up to max", async () => {
    const user = userEvent.setup();
    renderPlay();

    await user.type(screen.getByLabelText("Amount"), "50");
    await user.click(screen.getByRole("button", { name: "Heal" }));

    expect(hp()).toHaveTextContent("20");
  });

  it("shows death saves at 0 HP", async () => {
    const user = userEvent.setup();
    renderPlay({ currentHitPoints: 0 });

    const saves = screen.getByRole("region", { name: "Death saves" });
    expect(saves).toHaveTextContent("Dying");

    await user.click(within(saves).getByRole("button", { name: "Failures 1" }));
    expect(updateCharacterFields).toHaveBeenLastCalledWith("char-1", {
      deathSaveFailures: 1,
    });

    await user.click(
      within(saves).getByRole("button", { name: "Roll death save" })
    );
    expect(screen.getByText("Thalia: Death save")).toBeInTheDocument();
  });

  it("tracks spell slots for casters", async () => {
    const user = userEvent.setup();
    renderPlay({ class: "Wizard", level: 3 });

    await user.click(screen.getByLabelText("1st level slot 1 used"));

    expect(updateCharacterFields).toHaveBeenLastCalledWith("char-1", {
      spellSlotsUsed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(screen.getByLabelText("1st level slot 1 used")).toBeChecked();
    expect(screen.getByLabelText("2nd level slot 2 used")).not.toBeChecked();
  });

  it("toggles conditions and inspiration", async () => {
    const user = userEvent.setup();
    renderPlay();

    await user.click(screen.getByRole("button", { name: "Poisoned" }));
    await user.click(screen.getByRole("button", { name: "✨ Inspiration" }));

    expect(screen.getByRole("button", { name: "Poisoned" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(updateCharacterFields).toHaveBeenLastCalledWith("char-1", {
      inspiration: true,
    });
  });

  it("restores everything on a long rest", async () => {
    const user = userEvent.setup();
    renderPlay({
      currentHitPoints: 4,
      spellSlotsUsed: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    await user.click(screen.getByRole("button", { name: "Long rest" }));

    expect(hp()).toHaveTextContent("20");
    expect(updateCharacterFields).toHaveBeenLastCalledWith(
      "char-1",
      expect.objectContaining({
        currentHitPoints: 20,
        spellSlotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      })
    );
  });

  it("spends a hit die on a short rest", async () => {
    const user = userEvent.setup();
    renderPlay({ hitDice: "3d8" });

    await user.click(
      screen.getByRole("button", { name: "Short rest (spend a Hit Die)" })
    );

    expect(
      screen.getByText("Thalia: Hit Die (short rest)")
    ).toBeInTheDocument();
    expect(Number(hp().textContent)).toBeGreaterThan(15);
  });

  it("shows save errors", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCharacterFields).mockRejectedValueOnce(
      new Error("Offline")
    );
    renderPlay();

    await user.click(screen.getByRole("button", { name: "Poisoned" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  });

  it("is view-only for other people's characters", () => {
    renderPlay({}, "someone-else");

    expect(screen.getByText(/View only/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poisoned" })).toBeDisabled();
  });

  it("explains permission errors", () => {
    renderPlay();
    act(() => fail(permissionDenied()));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You don't have permission to view this character"
    );
  });
});
