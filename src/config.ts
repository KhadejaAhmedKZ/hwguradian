// Build-time configuration. Values come from .env.local (see .env.example).
// Nothing secret belongs here: a Firebase web API key is a public project
// identifier, not a credential — access is controlled by Firestore rules.

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

export const FUNCTIONS_REGION = env.VITE_FUNCTIONS_REGION ?? 'us-central1';
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true';

/**
 * DEV ONLY. When set, Gemini is called straight from the extension and the key
 * ships inside the bundle where anyone can read it. Leave empty and use the
 * `geminiAssist` callable function instead.
 */
export const DEV_GEMINI_API_KEY = env.VITE_GEMINI_API_KEY ?? '';

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.projectId);

/** Polling fallback for the background worker, per the spec. */
export const SYNC_ALARM_MINUTES = 1;

/** How far back a focused blocked tab still counts as "just before". */
export const RECENT_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

export const DEFAULT_TASK_POINTS = 10;
