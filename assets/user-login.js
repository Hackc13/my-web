import { auth, db } from "../firebase/firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { isAdmin } from "./admin-access.js";

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

const loginInput = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");
const message = document.getElementById("message");
const togglePass = document.getElementById("togglePass");

let redirecting = false;

function show(text) {
  if (message) message.textContent = text || "";
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

async function resolveEmail(value) {
  const input = String(value || "").trim();

  if (!input) {
    throw new Error("email-or-username-required");
  }

  if (input.includes("@")) {
    return input.toLowerCase();
  }

  const username = cleanUsername(input);

  if (!username) {
    throw new Error("username-invalid");
  }

  const snap = await getDoc(doc(db, "usernames", username));

  if (!snap.exists()) {
    throw new Error("username-not-found");
  }

  const data = snap.data();

  if (!data.email) {
    throw new Error("username-email-missing");
  }

  return String(data.email).toLowerCase();
}

async function goAfterLogin(user) {
  if (!user || redirecting) return;

  redirecting = true;
  show("login-success-checking-admin");

  try {
    const admin = await isAdmin(user);

    if (admin) {
      show("admin-found-opening-choice");
      window.location.assign("./choose.html");
    } else {
      show("not-admin-going-home");
      setTimeout(() => {
        window.location.assign("./index.html");
      }, 400);
    }
  } catch (error) {
    console.warn(error);
    show("admin-check-failed-going-home");

    setTimeout(() => {
      window.location.assign("./index.html");
    }, 500);
  }
}

async function loginWithEmailOrUsername() {
  if (!loginInput || !password) {
    show("login-form-error");
    return;
  }

  show("checking-login");

  try {
    const email = await resolveEmail(loginInput.value);

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password.value
    );

    await goAfterLogin(credential.user);
  } catch (error) {
    redirecting = false;
    show(cleanError(error));
  }
}

async function loginWithGoogle() {
  show("checking-google-login");

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    const credential = await signInWithPopup(auth, provider);
    await goAfterLogin(credential.user);
  } catch (error) {
    redirecting = false;
    show(cleanError(error));
  }
}

if (loginBtn) {
  loginBtn.type = "button";
  loginBtn.addEventListener("click", loginWithEmailOrUsername);
}

if (password) {
  password.addEventListener("keydown", event => {
    if (event.key === "Enter") loginWithEmailOrUsername();
  });
}

if (loginInput) {
  loginInput.addEventListener("keydown", event => {
    if (event.key === "Enter") loginWithEmailOrUsername();
  });
}

if (googleBtn) {
  googleBtn.type = "button";
  googleBtn.addEventListener("click", loginWithGoogle);
}

if (togglePass) {
  togglePass.addEventListener("click", () => {
    if (!password) return;
    password.type = password.type === "password" ? "text" : "password";
  });
}
