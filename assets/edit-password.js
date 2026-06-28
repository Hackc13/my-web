import { auth } from "../firebase/firebase.js";
import {
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const passwordCurrent = document.getElementById("passwordCurrent");
const passwordNew = document.getElementById("passwordNew");
const passwordRetype = document.getElementById("passwordRetype");
const savePasswordBtn = document.getElementById("savePasswordBtn");
const passwordStatus = document.getElementById("passwordStatus");

let currentUser = null;

function show(text) {
  if (passwordStatus) passwordStatus.textContent = text || "";
}

function cleanError(error) {
  if (error && error.code) return error.code;
  const msg = error && error.message ? error.message : String(error);
  const authMatch = msg.match(/auth\/[a-z0-9-]+/i);
  if (authMatch) return authMatch[0];
  return msg.replace(/^Firebase:\s*Error\s*/i, "").replace(/[().]+$/g, "");
}

function hasPasswordProvider(user) {
  return !!user?.providerData?.some(provider => provider.providerId === "password");
}

async function reauthWithPassword(user, password) {
  if (!hasPasswordProvider(user)) throw new Error("password-login-required");
  if (!password) throw new Error("current-password-required");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

async function savePassword() {
  if (!currentUser) return;

  const current = passwordCurrent.value || "";
  const next = passwordNew.value || "";
  const retype = passwordRetype.value || "";

  if (!current) return show("current-password-required");
  if (!next || next.length < 6) return show("new-password-minimum-6-characters");
  if (next !== retype) return show("new-password-and-retype-not-matching");

  try {
    show("checking-current-password");
    await reauthWithPassword(currentUser, current);

    show("changing-password");
    await updatePassword(currentUser, next);

    show("password-changed-successfully");
  } catch (error) {
    console.error(error);
    show(cleanError(error));
  }
}

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUser = user;
});

savePasswordBtn.addEventListener("click", savePassword);

[passwordCurrent, passwordNew, passwordRetype].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") savePassword();
  });
});
