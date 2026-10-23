// src/firebase/auth-setup.js
import { auth } from "./config";

export const setupAuthListeners = () => {
  // Handle auth state changes
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User is signed in:", user.email);
      // You can dispatch user data to your state management here
    } else {
      console.log("User is signed out");
    }
  });

  return unsubscribe;
};

export const handleAuthErrors = (error) => {
  let message = "An error occurred during authentication";
  
  switch (error.code) {
    case 'auth/email-already-in-use':
      message = "This email is already registered. Please sign in instead.";
      break;
    case 'auth/invalid-email':
      message = "Please enter a valid email address.";
      break;
    case 'auth/operation-not-allowed':
      message = "Email/password authentication is not enabled. Please contact support.";
      break;
    case 'auth/weak-password':
      message = "Password is too weak. Please use a stronger password.";
      break;
    case 'auth/user-disabled':
      message = "This account has been disabled. Please contact support.";
      break;
    case 'auth/user-not-found':
      message = "No account found with this email. Please sign up first.";
      break;
    case 'auth/wrong-password':
      message = "Incorrect password. Please try again.";
      break;
    case 'auth/too-many-requests':
      message = "Too many failed attempts. Please try again later.";
      break;
    case 'auth/network-request-failed':
      message = "Network error. Please check your internet connection.";
      break;
    default:
      message = error.message;
  }
  
  return message;
};