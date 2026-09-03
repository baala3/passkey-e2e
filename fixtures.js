const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const {
  addVirtualAuthenticator,
  injectCredential,
  signInWithPasskey,
} = require('./lib/passkey');

const CRED_FILE = path.join(__dirname, 'credential.json');

// Feature tests get `signedInPage`: a page already signed in with the passkey that
// setup registered. It adds a fresh virtual authenticator, injects the saved
// credential, and runs the passkey sign-in. The feature project starts logged out
// (empty storageState — see playwright.config), so the passkey is the only way in.
exports.test = base.test.extend({
  signedInPage: async ({ page }, use) => {
    const { client, authenticatorId } = await addVirtualAuthenticator(page);
    const credential = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
    await injectCredential(client, authenticatorId, credential, cfg);
    await signInWithPasskey(page, client, cfg);
    await use(page);
  },
});

exports.expect = base.expect;
