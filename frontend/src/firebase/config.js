// src/infrastructure/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth, confirmPasswordReset } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate API key format
if (!firebaseConfig.apiKey || !firebaseConfig.apiKey.startsWith('AIza')) {
  console.error("❌ ERROR: Invalid API key format!");
  console.error("Expected: AIzaSy... (starts with AIza)");
  console.error("Got:", firebaseConfig.apiKey);
  console.error("Please check your .env file");
  alert("Firebase configuration error! Please check the console for details.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services with advanced React 19/Firebase v11 multi-tab persistence
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "africa-south1"); // Preserves your regional backend
export { confirmPasswordReset };

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

console.log("✅ Firebase infrastructure layer initialized successfully!");
export default app;
