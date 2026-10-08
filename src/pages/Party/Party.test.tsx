import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Party from "./Party";
import { getCampaign } from "../../services/campaigns";
import { watchCharacter } from "../../services/characters";
import type { StoredCharacter } from "../../services/characters";
import { watchEncounter } from "../../services/encounters";
import { renderSignedIn } from "../../test/renderSignedIn";
import {
  makeCampaign,
  makePlayer,
  permissionDenied,
  storedCharacter,
} from "../../test/fixtures";

vi.mock("../../services/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/campaigns")>()),
  getCampaign: vi.fn(),
}));
vi.mock("../../services/characters", () => ({ watchCharacter: vi.fn() }));
vi.mock("../../services/encounters", () => ({
  watchEncounter: vi.fn(() => () => {}),
  saveEncounter: vi.fn(),
  endEncounter: vi.fn(),
}));

let emitCharacter: (c: StoredCharacter | null) => void;

const renderParty = () =>
  renderSignedIn(<Party />, {
    path: "/campaigns/:id/party",
    url: "/campaigns/camp-1/party",
  });

describe("Party", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(watchCharacter).mockImplementation((_id, onChange) => {
      emitCharacter = onChange;
      return () => {};
    });
  });

  it("shows each character's live status", async () => {
    vi.mocked(getCampaign).mockResolvedValue({
      campaign: makeCampaign(),
      isDm: true,
      players: [makePlayer({ characterId: "char-2", characterName: "Vex" })],
      notes: "",
    });
    renderParty();

    expect(await screen.findByText("Loading Vex…")).toBeInTheDocument();
    act(() =>
      emitCharacter(
        storedCharacter(
          {
            characterName: "Vex",
            currentHitPoints: 0,
            maxHitPoints: 12,
            conditions: ["Prone"],
            deathSaveFailures: 1,
          },
          { id: "char-2", userId: "user-2" }
        )
      )
    );

    expect(screen.getByLabelText("Vex hit points")).toHaveTextContent(
      "0 / 12 HP"
    );
    expect(screen.getByText(/Dying \(0 ✓ \/ 1 ✗\)/)).toBeInTheDocument();
    expect(screen.getByText("Prone")).toBeInTheDocument();
    expect(watchEncounter).toHaveBeenCalledWith(
      "camp-1",
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("explains permission errors", async () => {
    vi.mocked(getCampaign).mockRejectedValue(permissionDenied());
    renderParty();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to view this campaign"
    );
  });
});
