import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CampaignFormFields from "./CampaignFormFields";
import type { CampaignFormValues } from "./CampaignFormFields";
import { DEFAULT_CAMPAIGN } from "../../services/campaigns";

vi.mock("../../../firebaseSetup", () => ({ db: {} }));

const onChange = vi.fn<(values: CampaignFormValues) => void>();
const latest = () => onChange.mock.lastCall![0];

const Harness = (props: { disabled?: boolean; showNotes?: boolean }) => {
  const [values, setValues] = useState<CampaignFormValues>({
    ...DEFAULT_CAMPAIGN,
    notes: "",
  });
  return (
    <CampaignFormFields
      values={values}
      onFieldChange={(key, value) => {
        const next = { ...values, [key]: value };
        setValues(next);
        onChange(next);
      }}
      {...props}
    />
  );
};

describe("CampaignFormFields", () => {
  it("updates fields and formats the start date", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Campaign Name *"), "Strahd");
    await user.type(
      screen.getByLabelText("Start Date (DD/MM/YYYY)"),
      "31102026"
    );
    await user.selectOptions(screen.getByLabelText("Status"), "On Hold");

    expect(latest()).toMatchObject({
      campaignName: "Strahd",
      startDate: "31/10/2026",
      status: "On Hold",
    });
  });

  it("hides DM notes when asked and disables fields for players", () => {
    const { container } = render(<Harness disabled showNotes={false} />);

    expect(screen.queryByLabelText(/DM Notes/)).not.toBeInTheDocument();
    container
      .querySelectorAll("input, select, textarea")
      .forEach((field) => expect(field).toBeDisabled());
  });
});
