import { afterEach, describe, expect, it, vi } from "vitest";
import * as firestore from "firebase/firestore";
import { getDoc, writeBatch } from "./firebaseCalls";
import { LIMIT, UsageLimitError, resetUsageGuard } from "./usageGuard";

vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  getDoc: vi.fn(() => Promise.resolve("snapshot")),
  writeBatch: vi.fn(() => ({ commit: vi.fn(() => Promise.resolve()) })),
}));

describe("guarded Firebase calls", () => {
  afterEach(() => resetUsageGuard());

  it("passes calls through to Firebase", async () => {
    const ref = {} as firestore.DocumentReference;
    expect(await getDoc(ref)).toBe("snapshot");
    expect(firestore.getDoc).toHaveBeenCalledWith(ref);
  });

  it("stops calling Firebase once a loop trips the guard", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ref = {} as firestore.DocumentReference;
    vi.mocked(firestore.getDoc).mockClear();

    expect(() => {
      for (let i = 0; i <= LIMIT; i++) getDoc(ref);
    }).toThrow(UsageLimitError);
    expect(firestore.getDoc).toHaveBeenCalledTimes(LIMIT);
  });

  it("counts batch commits", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const batch = writeBatch({} as firestore.Firestore);
    expect(() => {
      for (let i = 0; i <= LIMIT; i++) batch.commit();
    }).toThrow(UsageLimitError);
  });
});
