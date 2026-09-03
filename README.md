# Passkey E2E

An end-to-end test for the whole passkey flow — register a passkey, then sign in
with it. It uses a Playwright [Chrome DevTools Protocol virtual
authenticator][cdp-webauthn], so there's no physical key and no fingerprint prompt.

Playwright runs real Chromium, so `navigator.credentials.create()`/`get()` hand
back real `PublicKeyCredential`s and native WebAuthn just works, no mocks.
Chromium only though — the CDP WebAuthn domain doesn't exist in Firefox/WebKit.

## The flow

One test file, five steps (`tests/passkey.spec.js`):

1. Sign in with email + password.
2. Add a virtual authenticator.
3. Register a passkey.
4. Sign out.
5. Sign in again with the registered passkey.

The authenticator is added once (over a [CDP session][pw-cdp]) and reused, so the
passkey from step 3 is still around in step 5. It has to be one test — the virtual
authenticator only holds the credential for that run.

## Sign in once

Step 1 reuses a [saved session][pw-auth] (Playwright's `storageState`), so you log
in by hand once and the test skips it after that. Capture it with:

```bash
npm run auth   # opens a browser at the sign-in page — log in (+ OTP), then close it
```

That writes `auth.json` (git-ignored, it holds session cookies, so don't commit
it). If the test starts failing at step 1, the session probably expired — just
re-run `npm run auth`.

> How you sign in depends on the app. A saved session sidesteps OTP/MFA and keeps
> things simple. If your app is plain email+password with no second factor, you
> could drive the form in the test instead — swap step 1 for a helper that fills
> the fields and submits.

## Configure

Everything app-specific is in `config.js`, and you can override it with env vars.
The defaults are just examples — set these to aim at your app:

| Variable | Meaning | Default |
| --- | --- | --- |
| `APP_BASE_URL` | Base URL of the app | `http://localhost:3000` |
| `STORAGE_STATE` | Saved session file | `auth.json` |
| `SIGNIN_PATH` | Sign-in page path | `/sign_in` |
| `CREDENTIALS_PATH` | Passkey registration page | `/webauthn/credentials` |
| `REGISTER_BUTTON_NAME` | Accessible name of the register button | `Register a passkey` |
| `PASSKEY_SIGNIN_TRIGGER` | Element to click to start passkey sign-in (empty = fires on page load) | empty |

## Run

```bash
npm install
npx playwright install chromium

npm run auth   # once
npm test       # or `npm run test:headed` to watch it
```

## How the waits work

No fixed sleeps. Register and sign-in wait on the authenticator's own [CDP
events][cdp-webauthn] — `WebAuthn.credentialAdded` and `WebAuthn.credentialAsserted`
— which fire when the ceremony finishes, so we don't depend on the app's endpoints.
One thing to note: these are CDP test-only affordances, a real authenticator
doesn't expose them.

[cdp-webauthn]: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
[pw-auth]: https://playwright.dev/docs/auth
[pw-cdp]: https://playwright.dev/docs/api/class-cdpsession
