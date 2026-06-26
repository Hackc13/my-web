import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

  const apiKeyMatch = msg.match(/api-key-not-valid/i);
  if (apiKeyMatch) return "auth/api-key-not-valid";

  return msg.replace(/^Firebase:\s*Error\s*/i, "").replace(/[().]+$/g, "");
}

const id = new URLSearchParams(location.search).get("id");

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function checkSeriesPassword() {
  if (sessionStorage.getItem("crazyhubSeriesUnlocked") === "yes") {
    return true;
  }

  const typed = prompt("Enter Series password");

  if (!typed) return false;

  const snap = await getDoc(doc(db, "settings", "seriesLock"));

  if (!snap.exists()) {
    alert("series-password-not-set");
    return false;
  }

  const savedHash = snap.data().passwordHash;
  const typedHash = await sha256(typed);

  if (savedHash && typedHash === savedHash) {
    sessionStorage.setItem("crazyhubSeriesUnlocked", "yes");
    return true;
  }

  alert("wrong-series-password");
  return false;
}

function convert(link) {
  if (!link) return "";
  if (link.includes("/preview")) return link;

  const match = link.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : link;
}

async function loadVideo() {
  try {
    const snap = await getDoc(doc(db, "items", id));

    if (!snap.exists()) {
      title.textContent = "Video not found";
      return;
    }

    const item = snap.data();

    if ((item.type || "").toLowerCase() === "series") {
      const allowed = await checkSeriesPassword();

      if (!allowed) {
        location.href = "index.html";
        return;
      }
    }

    const videoLink = convert(item.link);

    title.textContent = item.title || "Untitled";
    meta.textContent = `${item.type || "video"} • ${item.category || "General"}`;
    description.textContent = item.description || "";
    player.src = videoLink;
    openLink.href = videoLink;
  } catch (error) {
    title.textContent = cleanError(error);
  }
}

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  loadVideo();
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    sessionStorage.removeItem("crazyhubSeriesUnlocked");
    await signOut(auth);
    location.href = "login.html";
  };
}
