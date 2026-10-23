// src/config/env.js
export const ENV = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Bizika LMS',
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  R2_PUBLIC_DOMAIN: import.meta.env.VITE_R2_PUBLIC_DOMAIN,
  R2_WORKER_URL: import.meta.env.VITE_R2_WORKER_URL,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  CLOUDFLARE_WORKER_URL: import.meta.env.VITE_CLOUDFLARE_WORKER_URL,
  RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  RECAPTCHA_SECRET: import.meta.env.VITE_RECAPTCHA_SECRET,
  R2_WORKER_URL: import.meta.env.VITE_R2_WORKER_URL,
  R2_ACCOUNT_ID: import.meta.env.VITE_R2_ACCOUNT_ID,
  R2_ACCESS_KEY: import.meta.env.VITE_R2_ACCESS_KEY,
  R2_SECRET_KEY: import.meta.env.VITE_R2_SECRET_KEY,
  R2_BUCKET_NAME: import.meta.env.VITE_R2_BUCKET_NAME,
};
  