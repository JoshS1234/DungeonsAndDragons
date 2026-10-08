import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

const renderDialog = (overrides = {}) => {
  const props = {
    title: "Delete Campaign",
    description: "This cannot be undone.",
    confirmName: "Curse of Strahd",
    deleting: false,
    error: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmDeleteDialog {...props} />);
  return props;
};

describe("ConfirmDeleteDialog", () => {
  it("only enables delete once the exact name is typed", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    const confirm = screen.getByRole("button", { name: "Delete Campaign" });

    await user.type(
      screen.getByLabelText("Name to confirm deletion"),
      "curse of strahd"
    );
    expect(confirm).toBeDisabled();

    await user.clear(screen.getByLabelText("Name to confirm deletion"));
    await user.type(
      screen.getByLabelText("Name to confirm deletion"),
      "Curse of Strahd"
    );
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("cancels", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows errors and a busy state", () => {
    renderDialog({ deleting: true, error: "Network error" });
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
  });
});
