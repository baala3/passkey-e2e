const { expect } = require('@playwright/test');

// Reusable steps for a passkey E2E flow, driven by a Chrome DevTools Protocol
// virtual authenticator. App-specific values come from config, so nothing here
// is tied to a particular app.

// Capabilities of a typical platform passkey: platform attachment, resident
// (discoverable) key, user verification. isUserVerified sets the UV flag so a
// server enforcing userVerification:required accepts the assertion;
// automaticPresenceSimulation auto-approves the gesture.
const VIRTUAL_AUTHENTICATOR = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  automaticPresenceSimulation: true,
};

// Add a CDP virtual authenticator to the page's browser context. Returns the CDP
// client and authenticatorId. The authenticator lives for the context's lifetime,
// so a credential registered on it survives a logout within the same test.
async function addVirtualAuthenticator(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  const { authenticatorId } = await client.send(
    'WebAuthn.addVirtualAuthenticator',
    { options: VIRTUAL_AUTHENTICATOR },
  );
  return { client, authenticatorId };
}

// Resolve when the authenticator emits a CDP WebAuthn ceremony event
// (credentialAdded on create(), credentialAsserted on get()). Tied to the
// ceremony, not the app's endpoints — deterministic and app-agnostic.
function waitForCdpEvent(client, event, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);
    const handler = (params) => {
      cleanup();
      resolve(params);
    };
    const cleanup = () => {
      clearTimeout(timer);
      client.off(event, handler);
    };
    client.on(event, handler);
  });
}

// Step 1: sign in. We reuse a session captured once (see config.storageState),
// so the context starts authenticated. This just confirms that session is still
// valid by loading a protected page and checking we weren't bounced to sign-in.
async function verifySignedIn(page, cfg) {
  await page.goto(cfg.paths.credentials);
  if (new URL(page.url()).pathname.startsWith(cfg.paths.signIn)) {
    throw new Error(
      'Not authenticated — capture a session with `npm run auth` (it may have expired).',
    );
  }
}

// Step 3: register a passkey on the (already authenticated) account.
// credentialAdded fires during create(); then wait for the app's follow-up
// request + any reload to settle so a later navigation doesn't race it.
async function registerPasskey(page, client, cfg) {
  await page.goto(cfg.paths.credentials);
  const button = page.getByRole('button', {
    name: cfg.selectors.registerButtonName,
  });

  const added = waitForCdpEvent(client, 'WebAuthn.credentialAdded');
  await button.click();
  await added;
  await page.waitForLoadState('networkidle');
}

// Step 4: sign out. Re-load a page and let the network settle first, then clear
// cookies. Clearing while sitting on a just-reloaded authenticated page is racy —
// a late response can re-issue the session cookie after the clear, leaving you
// still signed in.
async function signOut(page, cfg) {
  await page.goto(cfg.paths.credentials, { waitUntil: 'networkidle' });
  await page.context().clearCookies();
}

// Step 5: sign in using the registered passkey. Clicks the configured trigger,
// then waits for the authenticator to sign (credentialAsserted) and the app to
// leave the sign-in page.
async function signInWithPasskey(page, client, cfg) {
  // Arm before navigating: with conditional UI the get() fires on page load, so
  // the listener must already be attached.
  const asserted = waitForCdpEvent(client, 'WebAuthn.credentialAsserted');
  await page.goto(cfg.paths.signIn);

  // Click the trigger only if the app has one; otherwise the ceremony fires on mount.
  const trigger = cfg.selectors.passkeySignInTrigger;
  if (trigger) {
    await page.locator(trigger).click();
  }
  await asserted;

  await page.waitForURL((url) => !url.pathname.startsWith(cfg.paths.signIn), {
    timeout: 20000,
  });
}

// A passkey's private key lives in the authenticator's memory for one run only.
// To reuse it across tests, export it here and inject it into a fresh
// authenticator later. Returns the first stored credential.
async function exportCredential(client, authenticatorId) {
  const { credentials } = await client.send('WebAuthn.getCredentials', {
    authenticatorId,
  });
  return credentials[0];
}

// Inject a previously exported credential into an authenticator, so it can sign
// in without registering again. getCredentials may omit rpId, so fall back to the
// app host.
async function injectCredential(client, authenticatorId, credential, cfg) {
  await client.send('WebAuthn.addCredential', {
    authenticatorId,
    credential: {
      credentialId: credential.credentialId,
      isResidentCredential: credential.isResidentCredential ?? true,
      rpId: credential.rpId || new URL(cfg.baseURL).hostname,
      privateKey: credential.privateKey,
      userHandle: credential.userHandle ?? null,
      signCount: credential.signCount ?? 0,
    },
  });
}

module.exports = {
  addVirtualAuthenticator,
  waitForCdpEvent,
  verifySignedIn,
  registerPasskey,
  signOut,
  signInWithPasskey,
  exportCredential,
  injectCredential,
};
