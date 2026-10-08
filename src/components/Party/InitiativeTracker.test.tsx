import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InitiativeTracker from "./InitiativeTracker";
import DiceProvider from "../Dice/DiceProvider";
import { endEncounter, saveEncounter } from "../../services/encounters";
import { storedCharacter } from "../../test/fixtures";
import { NEW_ENCOUNTER } from "../../utils/encounter";
import type { Encounter } from "../../utils/encounter";

vi.mock("../../services/encounters", () => ({
  saveEncounter: vi.fn(),
  endEncounter: vi.fn(),
}));

const party = [
  storedCharacter({ characterName: "Thalia", initiative: 3 }, { id: "c1" }),
];

/** Stands in for Firestore: saves feed straight back in as the live value. */
const Harness = ({
  isDm = true,
  initial = null,
}: {
  isDm?: boolean;
  initial?: Encounter | null;
}) => {
  const [encounter, setEncounter] = useState(initial);
  vi.mocked(saveEncounter).mockImplementation(async (_id, next) =>
    setEncounter(next)
  );
  vi.mocked(endEncounter).mockImplementation(async () => setEncounter(null));
  return (
    <DiceProvider random={() => 0.5}>
      <InitiativeTracker
        campaignId="camp-1"
        isDm={isDm}
        party={party}
        encounter={encounter}
      />
    </DiceProvider>
  );
};

const order = () =>
  within(screen.getByRole("list", { name: "Initiative order" }))
    .getAllByRole("listitem")
    .map((row) => row.textContent);

describe("InitiativeTracker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets the DM start an encounter and roll the party in", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Start encounter" }));
    await user.click(
      screen.getByRole("button", { name: "Add party (roll initiative)" })
    );

    // d20 lands on 11, +3 initiative
    expect(screen.getByLabelText("Thalia initiative")).toHaveValue(14);
    expect(
      screen.queryByRole("button", { name: "Add party (roll initiative)" })
    ).not.toBeInTheDocument();
  });

  it("adds numbered SRD monsters and tracks their HP", async () => {
    const user = userEvent.setup();
    render(<Harness initial={NEW_ENCOUNTER} />);

    await user.click(screen.getByRole("button", { name: "Add monsters" }));
    await user.type(screen.getByLabelText("Search monsters"), "goblin");
    await user.clear(screen.getByLabelText("How many"));
    await user.type(screen.getByLabelText("How many"), "2");
    await user.click(await screen.findByRole("button", { name: "Add Goblin" }));

    expect(order()).toHaveLength(2);
    expect(screen.getByText("Goblin 1")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Amount for Goblin 1"), "5");
    await user.click(screen.getByRole("button", { name: "Damage Goblin 1" }));
    expect(screen.getByLabelText("Goblin 1 hit points")).toHaveTextContent(
      "2/7 HP"
    );
  });

  it("moves through turns and rounds", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          ...NEW_ENCOUNTER,
          combatants: [
            { id: "a", name: "Orc", initiative: 15, kind: "monster" },
            { id: "b", name: "Wolf", initiative: 9, kind: "monster" },
          ],
        }}
      />
    );
    const current = () =>
      screen.getAllByRole("listitem").find((li) => li.ariaCurrent === "step");

    expect(current()).toHaveTextContent("Orc");
    await user.click(screen.getByRole("button", { name: "Next turn →" }));
    expect(current()).toHaveTextContent("Wolf");
    await user.click(screen.getByRole("button", { name: "Next turn →" }));
    expect(screen.getByText("Round 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "End encounter" }));
    expect(endEncounter).toHaveBeenCalledWith("camp-1");
    expect(
      screen.getByRole("button", { name: "Start encounter" })
    ).toBeInTheDocument();
  });

  it("shows players the order but not monsters' exact HP", () => {
    render(
      <Harness
        isDm={false}
        initial={{
          ...NEW_ENCOUNTER,
          combatants: [
            {
              id: "a",
              name: "Ogre",
              initiative: 8,
              kind: "monster",
              hitPoints: 20,
              maxHitPoints: 59,
            },
          ],
        }}
      />
    );

    expect(order()[0]).toContain("Bloodied");
    expect(order()[0]).not.toContain("20");
    expect(
      screen.queryByRole("button", { name: "Next turn →" })
    ).not.toBeInTheDocument();
  });

  it("tells players when nothing is running", () => {
    render(<Harness isDm={false} />);
    expect(screen.getByText("No encounter running.")).toBeInTheDocument();
  });
});
