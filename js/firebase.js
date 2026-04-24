// firebase.js - Firebase initialization and configuration

import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLEOis13JFDm9k6HhNfc5nuVj2P-G_pBU",
  authDomain: "urban-threads-8c33c.firebaseapp.com",
  projectId: "urban-threads-8c33c",
  storageBucket: "urban-threads-8c33c.firebasestorage.app",
  messagingSenderId: "1063374441027",
  appId: "1:1063374441027:web:1c159f03bc6631a9aae2f6",
  measurementId: "G-MJ1ZQDVX2Q"
};

// Avoid duplicate initialization across modules.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Ensure refresh-safe login persistence.
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence setup failed. Falling back to default behavior.", error);
  return null;
});

export { app, db, auth, storage, authPersistenceReady };
