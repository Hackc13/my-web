import { auth, db } from "../firebase/firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const resetInput = document.getElementById("resetInput");
const sendResetBtn = document.getElementById("sendResetBtn");
const resetMessage = document.getElementById("resetMessage");

function show(text) {
  if (resetMessage) resetMessage.textContent = text || "";
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

async function sendResetEmail() {
  show("checking-account");

  try {
    const email = await resolveEmail(resetInput.value);

    await sendPasswordResetEmail(auth, email);

    show("password-reset-email-sent-check-your-inbox");
  } catch (error) {
    show(cleanError(error));
  }
}

if (sendResetBtn) {
  sendResetBtn.type = "button";
  sendResetBtn.addEventListener("click", sendResetEmail);
}

if (resetInput) {
  resetInput.addEventListener("keydown", event => {
    if (event.key === "Enter") sendResetEmail();
  });
}
