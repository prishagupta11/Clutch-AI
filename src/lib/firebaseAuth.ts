import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, signInWithCredential } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase applet instance
// Force cache clear
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with requested scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

/**
 * Initiates the real Google Sign-In popup using Firebase Authentication
 */
export const googleSignIn = async (): Promise<{ user: User; token: string | undefined }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || undefined;
    return { user: result.user, token };
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    throw error;
  }
};

/**
 * Signs in using a Google Identity Services ID token
 */
export const googleSignInWithIdToken = async (idToken: string): Promise<{ user: User; token: string | undefined }> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const gCred = GoogleAuthProvider.credentialFromResult(result);
    const token = gCred?.accessToken || undefined;
    return { user: result.user, token };
  } catch (error: any) {
    console.error('Firebase Google Sign-In via ID Token error:', error);
    throw error;
  }
};

/**
 * Signs out the current user from Firebase session
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
};
