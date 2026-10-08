import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortraitUpload from "./PortraitUpload";
import { removePortrait, uploadPortrait } from "../../services/portraits";
import { resizeImage } from "../../utils/image";

vi.mock("../../services/portraits", () => ({
  uploadPortrait: vi.fn(),
  removePortrait: vi.fn(),
}));
vi.mock("../../utils/image", () => ({ resizeImage: vi.fn() }));

const Harness = ({ canEdit = true, initial = "" }) => {
  const [url, setUrl] = useState(initial);
  return (
    <PortraitUpload
      characterId="char-1"
      name="Thalia"
      url={url}
      onChange={setUrl}
      canEdit={canEdit}
    />
  );
};

const photo = new File(["fake"], "thalia.png", { type: "image/png" });

describe("PortraitUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an initial until there's a portrait", () => {
    render(<Harness canEdit={false} />);
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.queryByLabelText("Upload portrait")).not.toBeInTheDocument();
  });

  it("shrinks and uploads a chosen image", async () => {
    const user = userEvent.setup();
    const small = new Blob(["small"], { type: "image/jpeg" });
    vi.mocked(resizeImage).mockResolvedValue(small);
    vi.mocked(uploadPortrait).mockResolvedValue("https://example.com/p.jpg");
    render(<Harness />);

    await user.upload(screen.getByLabelText("Upload portrait"), photo);

    expect(resizeImage).toHaveBeenCalledWith(photo);
    expect(uploadPortrait).toHaveBeenCalledWith("char-1", small);
    expect(
      await screen.findByRole("img", { name: "Portrait of Thalia" })
    ).toHaveAttribute("src", "https://example.com/p.jpg");
  });

  it("removes the portrait", async () => {
    const user = userEvent.setup();
    render(<Harness initial="https://example.com/p.jpg" />);

    await user.click(screen.getByRole("button", { name: "Remove portrait" }));

    expect(removePortrait).toHaveBeenCalledWith("char-1");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("explains failures", async () => {
    const user = userEvent.setup();
    vi.mocked(resizeImage).mockRejectedValue(
      new Error("Please choose an image file.")
    );
    render(<Harness />);

    await user.upload(screen.getByLabelText("Upload portrait"), photo);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please choose an image file."
    );
  });
});
