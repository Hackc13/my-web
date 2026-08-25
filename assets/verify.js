import { auth, db } from "../firebase/firebase.js";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  updateDoc,
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

const verifyMessage = document.getElementById("verifyMessage");
const checkVerifyBtn = document.getElementById("checkVerifyBtn");
const resendVerifyBtn = document.getElementById("resendVerifyBtn");
const verifyEmail = document.getElementById("verifyEmail");

let currentUser = null;

function show(text) {
  if (verifyMessage) verifyMessage.textContent = text || "";
}

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  if (verifyEmail) {
    verifyEmail.textContent = user.email || "";
  }

  if (user.emailVerified) {
    show("email-already-verified-going-login");

    setTimeout(async () => {
      await signOut(auth);
      location.href = "login.html";
    }, 800);
  }
});

if (checkVerifyBtn) {
  checkVerifyBtn.onclick = async () => {
    if (!currentUser) return;

    show("checking-verification");

    try {
      await currentUser.reload();

      if (!currentUser.emailVerified) {
        show("email-not-verified-yet");
        return;
      }

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          emailVerified: true,
          verifiedAt: serverTimestamp()
        });
      } catch (error) {
        console.warn(error);
      }

      show("verification-success-go-login");

      setTimeout(async () => {
        await signOut(auth);
        location.href = "login.html";
      }, 900);
    } catch (error) {
      show(cleanError(error));
    }
  };
}

if (resendVerifyBtn) {
  resendVerifyBtn.onclick = async () => {
    if (!currentUser) return;

    show("sending-verification-email");

    try {
      await sendEmailVerification(currentUser);
      show("verification-email-sent");
    } catch (error) {
      show(cleanError(error));
    }
  };
}
