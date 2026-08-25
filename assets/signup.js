import { auth, db } from "../firebase/firebase.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function cleanError(error) {
  if (error && error.code) return error.code;

  const msg = error && error.message ? error.message : String(error);

  const firebaseMatch = msg.match(/\(([^()]*\/[a-z0-9-]+)\)/i);
  if (firebaseMatch) return firebaseMatch[1];

  const authMatch = msg.match(/auth\/[a-z0-9-]+/i);
  if (authMatch) return authMatch[0];

  const firestoreMatch = msg.match(/(permission-denied|unavailable|not-found|already-exists|resource-exhausted|unauthenticated|invalid-argument|failed-precondition|deadline-exceeded|cancelled|unknown|internal|data-loss|out-of-range|aborted)/i);
  if (firestoreMatch) return firestoreMatch[1];

  return msg.replace(/^Firebase:\s*Error\s*/i, "").replace(/[().]+$/g, "");
}

const nameInput = document.getElementById("name");
const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const message = document.getElementById("message");

function show(text) {
  if (message) message.textContent = text || "";
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

async function signup() {
  const name = (nameInput?.value || "").trim();
  const username = cleanUsername(usernameInput?.value || "");
  const phone = (phoneInput?.value || "").trim();
  const email = (emailInput?.value || "").trim().toLowerCase();
  const password = passwordInput?.value || "";

  if (!name) {
    show("name-required");
    return;
  }

  if (!username) {
    show("username-required");
    return;
  }

  if (username.length < 3) {
    show("username-minimum-3-characters");
    return;
  }

  if (!email) {
    show("email-required");
    return;
  }

  if (!password) {
    show("password-required");
    return;
  }

  show("checking-username");

  try {
    const usernameRef = doc(db, "usernames", username);
    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists()) {
      show("username-already-taken");
      return;
    }

    show("creating-account");

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await updateProfile(user, {
      displayName: name
    });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      username,
      phone,
      email,
      emailVerified: false,
      createdAt: serverTimestamp()
    });

    await setDoc(usernameRef, {
      uid: user.uid,
      username,
      email,
      name,
      createdAt: serverTimestamp()
    });

    await sendEmailVerification(user);

    show("verification-email-sent");

    setTimeout(() => {
      location.href = "verify.html";
    }, 800);
  } catch (error) {
    show(cleanError(error));
  }
}

if (signupBtn) {
  signupBtn.type = "button";
  signupBtn.addEventListener("click", signup);
}

[emailInput, passwordInput, nameInput, usernameInput, phoneInput].forEach(input => {
  if (!input) return;

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") signup();
  });
});
