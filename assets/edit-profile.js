import { auth, db } from "../firebase/firebase.js";
import {
  onAuthStateChanged,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const profileUsername = document.getElementById("profileUsername");
const profileEmail = document.getElementById("profileEmail");
const profileCurrentPassword = document.getElementById("profileCurrentPassword");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

let currentUser = null;
let currentProfile = null;

function show(text) {
  if (profileStatus) profileStatus.textContent = text || "";
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
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

async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  currentProfile = snap.exists()
    ? snap.data()
    : { uid: user.uid, username: "", email: user.email || "" };

  profileUsername.value = currentProfile.username || "";
  profileEmail.value = currentProfile.email || user.email || "";
}

async function saveProfile() {
  if (!currentUser) return;

  const newUsername = cleanUsername(profileUsername.value);
  const newEmail = String(profileEmail.value || "").trim().toLowerCase();
  const currentPassword = profileCurrentPassword.value || "";

  if (!newUsername || newUsername.length < 3) return show("username-minimum-3-characters");
  if (!newEmail || !newEmail.includes("@")) return show("valid-email-required");

  try {
    show("checking-current-password");
    await reauthWithPassword(currentUser, currentPassword);

    show("checking-username");
    const usernameRef = doc(db, "usernames", newUsername);
    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists() && usernameSnap.data().uid !== currentUser.uid) {
      return show("username-already-taken");
    }

    const oldUsername = cleanUsername(currentProfile?.username || "");
    show("saving-profile");

    if (newEmail !== (currentUser.email || "").toLowerCase()) {
      await updateEmail(currentUser, newEmail);
    }

    await setDoc(usernameRef, {
      uid: currentUser.uid,
      username: newUsername,
      email: newEmail,
      name: currentProfile?.name || currentUser.displayName || "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (oldUsername && oldUsername !== newUsername) {
      try {
        await deleteDoc(doc(db, "usernames", oldUsername));
      } catch (error) {
        console.warn("old username delete failed:", error);
      }
    }

    await updateDoc(doc(db, "users", currentUser.uid), {
      username: newUsername,
      email: newEmail,
      updatedAt: serverTimestamp()
    });

    currentProfile = { ...currentProfile, username: newUsername, email: newEmail };
    show("profile-updated-successfully");
  } catch (error) {
    console.error(error);
    show(cleanError(error));
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;
  try {
    await loadProfile(user);
  } catch (error) {
    console.error(error);
    show(cleanError(error));
  }
});

saveProfileBtn.addEventListener("click", saveProfile);

[profileUsername, profileEmail, profileCurrentPassword].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") saveProfile();
  });
});
