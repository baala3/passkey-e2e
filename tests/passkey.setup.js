const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const {
  addVirtualAuthenticator,
  verifySignedIn,
  registerPasskey,
  exportCredential,
} = require('../lib/passkey');

// Setup: runs once before the feature tests. Register a passkey and export it to
// credential.json so every feature test can reuse it (no re-registering).
// This project uses the authenticated session (storageState) — see playwright.config.
const CRED_FILE = path.join(__dirname, '..', 'credential.json');

test('register a passkey and export it', async ({ page }) => {
  // Register only once. If we already have an exported credential, skip — no need
  // to hit the service again. Delete credential.json to force a fresh register.
  test.skip(
    fs.existsSync(CRED_FILE),
    'credential.json already exists — delete it to re-register',
  );

  const { client, authenticatorId } = await addVirtualAuthenticator(page);

  await verifySignedIn(page, cfg);
  await registerPasskey(page, client, cfg);

  const credential = await exportCredential(client, authenticatorId);
  expect(credential).toBeTruthy();

  // Holds the private key — git-ignored.
  fs.writeFileSync(CRED_FILE, JSON.stringify(credential, null, 2));
});
