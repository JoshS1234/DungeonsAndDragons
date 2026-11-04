import { defineConfig, devices } from "@playwright/test";

// Run with `npm run test:e2e`, which starts the Auth and Firestore
// emulators first. The app is served by Vite, pointed at the emulators.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /layout\.spec\.ts/,
    },
  ],
  webServer: {
    command: "vite --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    env: {
      VITE_USE_EMULATORS: "true",
      VITE_FIREBASE_API_KEY: "demo-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-dnd.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "demo-dnd",
      VITE_FIREBASE_STORAGE_BUCKET: "demo-dnd.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "0",
      VITE_FIREBASE_APP_ID: "demo-app",
      VITE_FIREBASE_MEASUREMENT_ID: "",
    },
  },
});
