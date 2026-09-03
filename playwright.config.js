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
    trace: 'on-first-retry',
  },
  projects: [
    // Runs once: register a passkey and export it. Uses the authenticated session.
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: { ...devices['Desktop Chrome'], storageState: cfg.storageState },
    },
    // Feature tests. Start logged out so the passkey (via the signedInPage fixture)
    // is the only way in. Depends on setup, so credential.json exists first.
    {
      name: 'chromium',
      testMatch: /features\/.*\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
