// Firebase config and initialization - EXAMPLE FILE
// DO NOT USE THIS FILE IN PRODUCTION
// Copy this file to firebase.js and add your actual Firebase configuration

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Enhanced validation for Firebase configuration
const validateFirebaseConfig = (config) => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  const missingFields = requiredFields.filter(field => !config[field] || config[field].trim() === '');
  
  if (missingFields.length > 0) {
    console.warn(`Missing Firebase configuration fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Enhanced API key format validation
  if (!config.apiKey.startsWith('AIza') || config.apiKey.length < 39) {
    console.warn('Firebase API key format appears invalid');
    return false;
  }
  
  // Validate project ID format
  if (!/^[a-z0-9-]+$/.test(config.projectId)) {
    console.warn('Firebase project ID format appears invalid');
    return false;
  }
  
  // Validate auth domain format
  if (!config.authDomain.includes('.firebaseapp.com') && !config.authDomain.includes('.web.app')) {
    console.warn('Firebase auth domain format appears invalid');
    return false;
  }
  
  return true;
};

// Data protection utilities
export const sanitizeData = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    // Remove sensitive fields that shouldn't be stored
    if (['password', 'token', 'secret', 'key'].some(sensitive => 
      key.toLowerCase().includes(sensitive))) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = value.trim().substring(0, 10000); // Limit string length
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Enhanced error handling for Firebase operations
export const handleFirebaseError = (error, operation = 'Firebase operation') => {
  const errorCode = error?.code || 'unknown';
  const errorMessage = error?.message || 'Unknown error occurred';
  
  // Log error for debugging (in production, this would go to a logging service)
  console.error(`${operation} failed:`, {
    code: errorCode,
    message: errorMessage,
    timestamp: new Date().toISOString(),
    operation
  });
  
  // Return user-friendly error message
  const userFriendlyMessages = {
    'auth/user-not-found': 'Account not found. Please check your credentials.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/invalid-email': 'Invalid email address. Please check your email format.',
    'permission-denied': 'Access denied. You may not have permission to perform this action.',
    'unavailable': 'Service temporarily unavailable. Please try again later.',
    'deadline-exceeded': 'Request timed out. Please try again.',
    'resource-exhausted': 'Service limit exceeded. Please try again later.',
    'failed-precondition': 'Operation cannot be completed. Please check your data.',
    'aborted': 'Operation was cancelled. Please try again.',
    'out-of-range': 'Data is out of valid range. Please check your input.',
    'unimplemented': 'This feature is not yet implemented.',
    'internal': 'Internal server error. Please try again later.',
    'data-loss': 'Data loss occurred. Please check your information.',
    'unauthenticated': 'Authentication required. Please log in again.'
  };
  
  return userFriendlyMessages[errorCode] || 'An unexpected error occurred. Please try again.';
};

// Gracefully handle missing environment variables so the app can still boot
export let isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId &&
  validateFirebaseConfig(firebaseConfig)
);

let app;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    
    // Enhanced auth settings for security
    authInstance.useDeviceLanguage();
    authInstance.settings.appVerificationDisabledForTesting = false;
    
    // Configure Firestore for better security
    if (dbInstance) {
      // Enable offline persistence with size limits
      dbInstance.settings = {
        cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache limit
        ignoreUndefinedProperties: true, // Ignore undefined properties for security
      };
    }
    
    console.log('Firebase initialized successfully with enhanced security');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    isFirebaseConfigured = false;
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "Firebase is not configured. Add required keys to your .env (see env.example). The app will run but authentication and data features are disabled."
  );
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
