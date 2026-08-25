import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCq6yWPt42xp7CHMRvONFVsCOVpVAS1QvM",
  authDomain: "crazykiller-aff67.firebaseapp.com",
  projectId: "crazykiller-aff67",
  storageBucket: "crazykiller-aff67.firebasestorage.app",
  messagingSenderId: "79620656555",
  appId: "1:79620656555:web:8a3e4abec292bfd74d96ee",
  measurementId: "G-646SMSQML2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "crazykiller");
export const auth = getAuth(app);
