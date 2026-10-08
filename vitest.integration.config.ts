import { defineConfig } from "vitest/config";

// Runs against the Firestore emulator: `npm run test:integration`
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
  },
});
