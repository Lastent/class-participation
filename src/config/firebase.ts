// Firebase configuration
// You'll need to replace these with your actual Firebase config values

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCKKvcovOkpfM_IGxoloMxoMZGmYkbK0Ok",
  authDomain: "class-tools-f66b3.firebaseapp.com",
  projectId: "class-tools-f66b3",
  storageBucket: "class-tools-f66b3.firebasestorage.app",
  messagingSenderId: "266443601403",
  appId: "1:266443601403:web:ea383dc195d1a3d703475e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;