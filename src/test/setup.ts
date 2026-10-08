import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unit tests never talk to Firebase. Mocking the setup module everywhere
// also means they don't depend on a local .env file (CI has none). Tests
// that need specific behaviour still override this with their own mock.
vi.mock("../../firebaseSetup", () => ({ auth: {}, db: {}, storage: {} }));

afterEach(() => {
  cleanup();
});
