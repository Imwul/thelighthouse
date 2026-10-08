// Loaded only when the keeper opens account settings.
export { auth, db, googleProvider } from "./firebase.js";
export { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
export { doc, getDoc, setDoc } from "firebase/firestore";
