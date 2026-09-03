const { test } = require('@playwright/test');
const cfg = require('../config');
const {
  addVirtualAuthenticator,
  verifySignedIn,
  registerPasskey,
  signOut,
  signInWithPasskey,
} = require('../lib/passkey');

// Full passkey lifecycle as five readable steps. The virtual authenticator is
// added once and reused, so the passkey registered in step 3 is still available
// to sign in with in step 5 after logging out.
test('register a passkey, then sign in with it', async ({ page }) => {
  let client;

  await test.step('sign in (reuse captured session)', () =>
    verifySignedIn(page, cfg));

  await test.step('add a virtual authenticator', async () => {
    ({ client } = await addVirtualAuthenticator(page));
  });

  await test.step('register a passkey', () => registerPasskey(page, client, cfg));

  await test.step('sign out', () => signOut(page, cfg));

  await test.step('sign in with the passkey', () =>
    signInWithPasskey(page, client, cfg));
});
