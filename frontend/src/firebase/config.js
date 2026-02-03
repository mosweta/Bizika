// src/firebase/config.js - FIXED VERSION
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { confirmPasswordReset } from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// console.log("🔧 Firebase Config Check:");
// console.log("Project ID:", firebaseConfig.projectId);
// console.log("API Key exists:", !!firebaseConfig.apiKey);
// console.log("API Key starts with AIza:", firebaseConfig.apiKey?.startsWith('AIza'));

// Validate API key format
if (!firebaseConfig.apiKey || !firebaseConfig.apiKey.startsWith('AIza')) {
  console.error("❌ ERROR: Invalid API key format!");
  console.error("Expected: AIzaSy... (starts with AIza)");
  console.error("Got:", firebaseConfig.apiKey);
  console.error("Please check your .env file");
  
  // Show helpful message
  alert("Firebase configuration error! Please check the console for details.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services (skip analytics for now)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "africa-south1");
export { confirmPasswordReset };
export default app;

console.log("✅ Firebase initialized successfully!");