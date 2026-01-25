// src/firebase/config.js - UPDATED FOR CLOUDFLARE PAGES
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Debug logging for Cloudflare Pages
console.log("🌐 Environment:", import.meta.env.MODE);
console.log("🏢 Host:", window.location.hostname);

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: Check what environment variables are loaded
console.log("🔧 Firebase Config Check:");
console.log("Project ID:", firebaseConfig.projectId);
console.log("API Key exists:", !!firebaseConfig.apiKey);
console.log("All env vars:", Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

// For Cloudflare Pages, we need to be more lenient with validation
if (import.meta.env.PROD) {
  // Production validation
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("❌ Firebase config missing in production!");
    console.error("Please check Cloudflare Pages environment variables.");
    
    // Don't show alert in production - just log
    if (typeof Sentry !== 'undefined') {
      Sentry.captureMessage('Firebase config missing in production');
    }
  }
} else {
  // Development validation
  if (!firebaseConfig.apiKey || !firebaseConfig.apiKey.startsWith('AIza')) {
    console.warn("⚠️ Development: Invalid or missing Firebase API key");
    console.warn("This is OK for development, but will fail in production.");
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// IMPORTANT: Specify the region for Cloud Functions
// Your functions are deployed in africa-south1
export const functions = getFunctions(app, "africa-south1");

// Optional: Connect to emulator in development
if (import.meta.env.DEV) {
  console.log("🔧 Development mode - enabling debug features");
  
  // Enable Firestore logging
  import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Firestore persistence error:", err);
    });
  });
}

export default app;

console.log("✅ Firebase initialized successfully!");
console.log("📡 Functions region: africa-south1");