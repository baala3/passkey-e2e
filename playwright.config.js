const { defineConfig, devices } = require('@playwright/test');
const cfg = require('./config');

// CDP virtual authenticator is Chromium-only. Runs headless; use `npm run
// test:headed` to watch it.
//
// storageState reuses a session captured once via `npm run auth`.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: cfg.baseURL,
    storageState: cfg.storageState,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
