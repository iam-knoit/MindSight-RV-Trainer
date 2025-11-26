import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';

import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';

import { SessionData, IntuitionStats } from '../types';

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

// Explicitly set persistence to local storage to keep users logged in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// Helper to remove undefined values from objects (Firestore doesn't like undefined)
const cleanData = (data: any) => {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
};

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
    // Use the session.id (timestamp string) as the document ID for easier updates
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    
    // Clean data to remove undefined values
    const sanitizedSession = cleanData(session);
    
    await setDoc(sessionRef, {
      ...sanitizedSession,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error saving session to cloud", error);
    throw error;
  }
};

export const deleteSession = async (userId: string, sessionId: string) => {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    console.error("Error deleting session", error);
    throw error;
  }
};

export const updateSessionRemarks = async (userId: string, sessionId: string, remarks: string) => {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      postSessionRemarks: remarks
    });
  } catch (error) {
    console.error("Error updating session remarks", error);
    throw error;
  }
};

export const updateSessionData = async (userId: string, sessionId: string, data: Partial<SessionData>) => {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    
    // Clean data to remove undefined values
    const sanitizedData = cleanData(data);

    await updateDoc(sessionRef, sanitizedData);
  } catch (error) {
    console.error("Error updating session data", error);
    throw error;
  }
};

export const subscribeToHistory = (userId: string, callback: (sessions: SessionData[]) => void) => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  // Order by timestamp descending (newest first)
  const q = query(sessionsRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const sessions: SessionData[] = [];
    snapshot.forEach((docSnap) => {
      sessions.push(docSnap.data() as SessionData);
    });
    callback(sessions);
  });
};

// --- Intuition Stats Functions ---

export const updateIntuitionStats = async (userId: string, newStats: IntuitionStats) => {
  try {
    const statsRef = doc(db, 'users', userId, 'stats', 'intuition');
    await setDoc(statsRef, cleanData(newStats), { merge: true });
  } catch (error) {
    console.error("Error updating intuition stats", error);
  }
};

export const subscribeToIntuitionStats = (userId: string, callback: (stats: IntuitionStats | null) => void) => {
  const statsRef = doc(db, 'users', userId, 'stats', 'intuition');
  return onSnapshot(statsRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as IntuitionStats);
    } else {
      callback(null);
    }
  });
};