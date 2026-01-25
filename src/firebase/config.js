// src/firebase/config.js - COMPLETE COMPAT VERSION
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/functions";

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

// Initialize Firebase - COMPAT STYLE
const app = firebase.initializeApp(firebaseConfig);

// Export services - COMPAT STYLE (not modular!)
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

// Functions with region - COMPAT STYLE
export const functions = firebase.app().functions("africa-south1");

// Optional: Connect to emulator in development
if (import.meta.env.DEV) {
  console.log("🔧 Development mode - enabling debug features");
  
  // Enable Firestore persistence (compat style)
  db.enablePersistence()
    .catch((err) => {
      console.warn("Firestore persistence error:", err);
    });
}

export default app;

console.log("✅ Firebase initialized successfully!");
console.log("📡 Functions region: africa-south1");