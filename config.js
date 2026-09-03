// All app-specific values live here, overridable by environment variables.
// The defaults are examples showing the shape — set APP_BASE_URL (and the others
// as needed) to point the test at your app.
const env = process.env;

module.exports = {
  baseURL: env.APP_BASE_URL || 'http://localhost:3000',

  // Step 1 reuses a pre-authenticated session captured once (`npm run auth`).
  // This keeps sign-in simple and sidesteps OTP/MFA. It depends on the app: for a
  // plain email+password login you could instead drive the sign-in form in the
  // test; for anything with a second factor, a saved session is the sane path.
  storageState: env.STORAGE_STATE || 'auth.json',

  paths: {
    signIn: env.SIGNIN_PATH || '/sign_in',
    credentials: env.CREDENTIALS_PATH || '/webauthn/credentials', // passkey register page
  },

  selectors: {
    registerButtonName: env.REGISTER_BUTTON_NAME || 'Register a passkey',
    // Element to click to start passkey sign-in. Leave empty when the page fires
    // the ceremony on mount (conditional / autofill UI). Set it for apps with an
    // explicit "sign in with passkey" button.
    passkeySignInTrigger: env.PASSKEY_SIGNIN_TRIGGER || '',
  },
};
