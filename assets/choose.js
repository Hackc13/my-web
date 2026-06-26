import { auth } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { isAdmin } from "./admin-access.js";

const adminChoice = document.getElementById("adminChoice");
const userChoice = document.getElementById("userChoice");
const logoutChoice = document.getElementById("logoutChoice");
const chooseEmail = document.getElementById("chooseEmail");
const chooseMessage = document.getElementById("chooseMessage");

function show(text) {
  if (chooseMessage) chooseMessage.textContent = text || "";
}

if (adminChoice) {
  adminChoice.onclick = () => {
    location.href = "dashboard.html";
  };
}

if (userChoice) {
  userChoice.onclick = () => {
    location.href = "index.html";
  };
}

if (logoutChoice) {
  logoutChoice.onclick = async () => {
    await signOut(auth);
    location.href = "login.html";
  };
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  if (chooseEmail) {
    chooseEmail.textContent = user.email || "Admin";
  }

  show("checking-admin-access");

  try {
    const admin = await isAdmin(user);

    if (!admin) {
      location.href = "index.html";
      return;
    }

    show("");
  } catch (error) {
    console.warn(error);
    location.href = "index.html";
  }
});
