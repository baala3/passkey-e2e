# Passkey E2E

End-to-end passkey testing with a Playwright [Chrome DevTools Protocol virtual
authenticator][cdp-webauthn] — no physical key, no fingerprint prompt.

Playwright runs real Chromium, so `navigator.credentials.create()`/`get()` hand
back real `PublicKeyCredential`s and native WebAuthn just works, no mocks.
Chromium only though — the CDP WebAuthn domain doesn't exist in Firefox/WebKit.

## The idea

A passkey's private key lives on its virtual authenticator for one test run only.
So instead of registering in every test, we register **once**, export the
credential, and inject it into a fresh authenticator whenever we need to sign in.
That gives QA a clean starting point: every feature test begins already signed in
with a passkey, no login boilerplate.

Three stages:

1. **Sign in with password (once).** Capture an authenticated session by hand.
   This is `npm run auth` — if your app has an OTP/MFA step it can't be scripted,
   so you do it once by hand.
2. **Register + export (setup).** `tests/passkey.setup.js` registers a passkey and
   writes it to `credential.json`. It runs before the feature tests but registers
   only **once** — if `credential.json` already exists it skips, so you don't hit
   the service every run. Delete `credential.json` to re-register.
3. **Import + test features.** `tests/features/*.spec.js` — a `signedInPage`
   fixture injects the credential into a fresh authenticator and signs in, so QA
   just writes normal feature assertions.

Playwright wires the order: the feature project `dependencies: ['setup']`, so the
passkey is registered and exported before any feature test runs.

## Layout

```
config.js              # app-specific values, env-overridable
lib/passkey.js         # helpers: add authenticator, register, export, inject, sign in
fixtures.js            # signedInPage fixture (import credential + passkey sign-in)
playwright.config.js   # setup project -> feature project (dependency)
tests/
  passkey.setup.js     # stage 2: register a passkey, export -> credential.json
  features/
    account.spec.js    # stage 3: your feature tests, already signed in
```

## Stage 1: capture a session (once)

The setup registers a passkey, which requires being logged in first. Capture that
session by hand:

```bash
npm run auth   # opens a browser at the sign-in page — log in (+ OTP), then close it
```

That writes `auth.json` (git-ignored — session cookies, don't commit it). If setup
starts failing on sign-in, the session expired; re-run `npm run auth`.

> How you sign in depends on the app. A saved session sidesteps OTP/MFA. If your
> app is plain email+password with no second factor, you could script the sign-in
> form in an `auth.setup.js` instead.

## Run

```bash
npm install
npx playwright install chromium

npm run auth   # once
npm test       # runs setup, then the feature tests — or `npm run test:headed` to watch
```

## Writing feature tests (stage 3)

Use the fixture and skip auth entirely — `signedInPage` is already signed in with
the passkey:

```js
const { test, expect } = require('../../fixtures');

test('feature works', async ({ signedInPage }) => {
  await signedInPage.goto('/whatever');
  await expect(signedInPage.getByRole('heading')).toBeVisible();
});
```

The feature project starts logged out (`storageState: { cookies: [], origins: []
}`), so the passkey is genuinely the only way in — no leftover session
short-circuiting the sign-in.

## Configure

Everything app-specific is in `config.js`, overridable by env vars. The defaults
are examples — set these to aim at your app:

| Variable | Meaning | Default |
| --- | --- | --- |
| `APP_BASE_URL` | Base URL of the app | `http://localhost:3000` |
| `STORAGE_STATE` | Saved session file | `auth.json` |
| `SIGNIN_PATH` | Sign-in page path | `/sign_in` |
| `CREDENTIALS_PATH` | Passkey registration page | `/webauthn/credentials` |
| `REGISTER_BUTTON_NAME` | Accessible name of the register button | `Register a passkey` |
| `PASSKEY_SIGNIN_TRIGGER` | Element to click to start passkey sign-in (empty = fires on page load) | empty |

## How the waits work

No fixed sleeps. Register and sign-in wait on the authenticator's own [CDP
events][cdp-webauthn] — `WebAuthn.credentialAdded` and `WebAuthn.credentialAsserted`
— which fire when the ceremony finishes, so we don't depend on the app's endpoints.
One thing to note: these are CDP test-only affordances, a real authenticator
doesn't expose them.

Reusing a passkey across runs uses two more CDP calls: `WebAuthn.getCredentials`
to export (private key included) and `WebAuthn.addCredential` to inject.

[cdp-webauthn]: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
[pw-auth]: https://playwright.dev/docs/auth
[pw-cdp]: https://playwright.dev/docs/api/class-cdpsession
