import { initializeApp } from '@firebase/app'
import { connectAuthEmulator, getAuth } from '@firebase/auth'
const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_AUTH_DOMAIN } = import.meta.env

export const accountAuth = VITE_FIREBASE_API_KEY && VITE_FIREBASE_PROJECT_ID && VITE_FIREBASE_APP_ID && VITE_FIREBASE_AUTH_DOMAIN
  ? getAuth(initializeApp({
    apiKey: VITE_FIREBASE_API_KEY,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: VITE_FIREBASE_APP_ID,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  }))
  : null

if (accountAuth && import.meta.env.DEV && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR) {
  connectAuthEmulator(accountAuth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR)
}
