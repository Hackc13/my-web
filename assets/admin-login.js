import { auth } from "../firebase/firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

  const apiKeyMatch = msg.match(/api-key-not-valid/i);
  if (apiKeyMatch) return "auth/api-key-not-valid";

  return msg.replace(/^Firebase:\s*Error\s*/i, "").replace(/[().]+$/g, "");
}


const email = document.getElementById("email");
const password = document.getElementById("password");
const message = document.getElementById("message");

const togglePass = document.getElementById("togglePass");
if (togglePass) {
  togglePass.onclick = () => {
    password.type = password.type === "password" ? "text" : "password";
  };
}

document.getElementById("adminLoginBtn").onclick = async () => {
  message.textContent = "Checking admin...";

  try {
    const result = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    const admin = await isAdmin(result.user);

    if (!admin) {
      message.textContent = "not-admin";
      return;
    }

    location.href = "dashboard.html";
  } catch (e) {
    message.textContent = cleanError(e);
  }
};
