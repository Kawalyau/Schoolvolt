// config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize other Firebase services
const auth = getAuth(app);
const storage = getStorage(app);

// Define collections
const resourcesCollection = collection(db, 'resources');
const subjectsCollection = collection(db, 'subjects');
const categoriesCollection = collection(db, 'categories');



export { db, auth, storage, resourcesCollection, subjectsCollection, categoriesCollection};
export default app;