const { test, expect } = require('../../fixtures');
const cfg = require('../../config');

// QA feature tests go here. `signedInPage` is already authenticated with the
// passkey from setup — no login boilerplate. Write assertions about the app.
test('reaches the credentials page when signed in', async ({ signedInPage }) => {
  await signedInPage.goto(cfg.paths.credentials);
  await expect(signedInPage).toHaveURL(new RegExp(cfg.paths.credentials));
});
