import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { SessionData } from '../types';

// Firebase configuration for MindSight RV Trainer
const firebaseConfig = {
  apiKey: "AIzaSyBJynPxrdKXuF6vYp1KDIq0I5TD100VL-k",
  authDomain: "mindsight-rv-trainer.firebaseapp.com",
  projectId: "mindsight-rv-trainer",
  storageBucket: "mindsight-rv-trainer.firebasestorage.app",
  messagingSenderId: "254659078126",
  appId: "1:254659078126:web:88e7d09499817d5a0ad0ff",
  measurementId: "G-GJC14C6WQL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Auth Functions ---

export const registerWithEmail = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Set the display name immediately after registration
    await updateProfile(userCredential.user, {
      displayName: name
    });
    return userCredential.user;
  } catch (error) {
    console.error("Error registering", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// --- Database Functions ---

export const saveSessionToCloud = async (userId: string, session: SessionData) => {
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    await addDoc(sessionsRef, {
      ...session,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error saving session to cloud", error);
    throw error;
  }
};

export const subscribeToHistory = (userId: string, callback: (sessions: SessionData[]) => void) => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  // Order by timestamp descending (newest first)
  const q = query(sessionsRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const sessions: SessionData[] = [];
    snapshot.forEach((doc) => {
      sessions.push(doc.data() as SessionData);
    });
    callback(sessions);
  });
};