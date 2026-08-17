const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../config/firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();

const googleAuth = new GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: [
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase',
  ],
});

let cachedWebApiKey = process.env.FIREBASE_WEB_API_KEY || '';

async function getAccessToken() {
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse?.token) {
    throw new Error('Failed to obtain Google access token');
  }
  return tokenResponse.token;
}

async function resolveWebApiKey() {
  if (cachedWebApiKey) return cachedWebApiKey;

  const accessToken = await getAccessToken();
  const appsRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${serviceAccount.project_id}/webApps`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const appsData = await appsRes.json();
  const appName = appsData?.apps?.[0]?.name;
  if (!appName) {
    throw new Error('No Firebase web app found. Add a Web app in Firebase Console.');
  }

  const cfgRes = await fetch(`https://firebase.googleapis.com/v1beta1/${appName}/config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const cfg = await cfgRes.json();
  if (!cfg.apiKey) {
    throw new Error('Could not resolve Firebase Web API key.');
  }

  cachedWebApiKey = cfg.apiKey;
  return cachedWebApiKey;
}

async function identityToolkitWithApiKey(endpoint, body) {
  const apiKey = await resolveWebApiKey();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Identity Toolkit request failed');
    error.code = data?.error?.message;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function identityToolkitWithBearer(endpoint, body) {
  const accessToken = await getAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Identity Toolkit request failed');
    error.code = data?.error?.message;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function signInWithEmailPassword(email, password) {
  try {
    return await identityToolkitWithApiKey('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });
  } catch (err) {
    // Fallback for environments where API key is restricted
    return identityToolkitWithBearer('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });
  }
}

async function sendPasswordResetEmail(email) {
  const continueUrl =
    process.env.PASSWORD_RESET_CONTINUE_URL || 'http://localhost:5173/signin';

  // Web API key path is what actually triggers Firebase's password-reset email.
  return identityToolkitWithApiKey('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
    continueUrl,
    canHandleCodeInApp: false,
  });
}

async function sendEmailVerification(idToken) {
  const continueUrl =
    process.env.EMAIL_VERIFY_CONTINUE_URL || 'http://localhost:5173/signin?verified=1';

  return identityToolkitWithApiKey('accounts:sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken,
    continueUrl,
    canHandleCodeInApp: false,
  });
}

module.exports = {
  auth,
  signInWithEmailPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  resolveWebApiKey,
};
