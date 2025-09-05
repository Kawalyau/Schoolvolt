// config/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Define collections
const resourcesCollection = collection(db, 'resources');
const subjectsCollection = collection(db, 'subjects');
const categoriesCollection = collection(db, 'categories');
const usersCollection = collection(db, 'users');

// Cache for performance
let cachedSchoolId: string | null = null;

/**
 * Fetch the schoolId for the currently authenticated user.
 * Handles errors, caching, and edge cases more gracefully.
 */
const getSchoolId = async (forceRefresh = false): Promise<string | null> => {
  try {
    if (!forceRefresh && cachedSchoolId) {
      return cachedSchoolId;
    }

    const user: User | null = auth.currentUser;

    if (!user) {
      console.warn("No authenticated user found.");
      return null;
    }

    // Try fetching the user doc by UID (more efficient than querying)
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let schoolId: string | null = null;

    if (userDoc.exists()) {
      schoolId = userDoc.data()?.schoolId ?? null;
    } else {
      // Fallback: try querying users collection by UID (in case doc ID != UID)
      const q = query(usersCollection, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        schoolId = querySnapshot.docs[0].data()?.schoolId ?? null;
      }
    }

    if (!schoolId) {
      console.error(`School ID not found for user: ${user.uid}`);
      return null;
    }

    // Cache the result for faster subsequent calls
    cachedSchoolId = schoolId;
    return schoolId;

  } catch (error) {
    console.error('Error fetching school ID:', error);
    return null;
  }
};

/**
 * Listen for auth changes and reset cache when user changes.
 */
onAuthStateChanged(auth, () => {
  cachedSchoolId = null; // clear cache on sign-in/out
});

export { 
  db, 
  auth, 
  storage, 
  resourcesCollection, 
  subjectsCollection, 
  categoriesCollection, 
  usersCollection,
  getSchoolId 
};
export default app;
