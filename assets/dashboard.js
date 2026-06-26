import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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


const fields = {
  itemId: document.getElementById("itemId"),
  title: document.getElementById("title"),
  type: document.getElementById("type"),
  category: document.getElementById("category"),
  link: document.getElementById("link"),
  thumb: document.getElementById("thumb"),
  description: document.getElementById("description")
};

const formStatus = document.getElementById("formStatus");
const adminList = document.getElementById("adminList");
const newSeriesPassword = document.getElementById("newSeriesPassword");
const saveSeriesPasswordBtn = document.getElementById("saveSeriesPasswordBtn");
const seriesPasswordStatus = document.getElementById("seriesPasswordStatus");

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function saveSeriesPassword() {
  if (!newSeriesPassword || !newSeriesPassword.value.trim()) {
    if (seriesPasswordStatus) seriesPasswordStatus.textContent = "password-required";
    return;
  }

  if (newSeriesPassword.value.length < 4) {
    if (seriesPasswordStatus) seriesPasswordStatus.textContent = "password-too-short";
    return;
  }

  if (seriesPasswordStatus) seriesPasswordStatus.textContent = "saving-series-password";

  try {
    const passwordHash = await sha256(newSeriesPassword.value);

    await setDoc(doc(db, "settings", "seriesLock"), {
      passwordHash,
      updatedAt: serverTimestamp()
    });

    newSeriesPassword.value = "";

    if (seriesPasswordStatus) seriesPasswordStatus.textContent = "series-password-saved";
  } catch (e) {
    if (seriesPasswordStatus) seriesPasswordStatus.textContent = cleanError(e);
  }
}

if (saveSeriesPasswordBtn) {
  saveSeriesPasswordBtn.onclick = saveSeriesPassword;
}

function convertGoogleDriveLink(link) {
  if (!link) return "";
  if (link.includes("/preview")) return link;

  const match = link.match(/\/d\/([^/]+)/);
  if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;

  return link;
}

function getFormData() {
  const playable = ["video", "movie", "series"].includes(fields.type.value);
  const link = fields.link.value.trim();

  return {
    title: fields.title.value.trim(),
    type: fields.type.value,
    category: fields.category.value.trim() || "General",
    link: playable ? convertGoogleDriveLink(link) : link,
    thumb: fields.thumb.value.trim(),
    description: fields.description.value.trim()
  };
}

function clearForm() {
  fields.itemId.value = "";
  fields.title.value = "";
  fields.type.value = "video";
  fields.category.value = "";
  fields.link.value = "";
  fields.thumb.value = "";
  fields.description.value = "";
}

async function saveContent() {
  try {
    const data = getFormData();

    if (!data.title || !data.link) {
      formStatus.textContent = "Title and link are required.";
      return;
    }

    if (fields.itemId.value) {
      await updateDoc(doc(db, "items", fields.itemId.value), data);
      formStatus.textContent = "Updated successfully.";
    } else {
      await addDoc(collection(db, "items"), { ...data, createdAt: serverTimestamp() });
      formStatus.textContent = "Added successfully.";
    }

    clearForm();
    await loadAdminList();
  } catch (e) {
    formStatus.textContent = cleanError(e);
  }
}

async function loadAdminList() {
  try {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const docs = snap.docs;

    adminList.innerHTML = docs.length ? docs.map(d => {
      const item = d.data();
      return `
        <div class="admin-item">
          <img src="${item.thumb || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop"}">
          <div class="grow">
            <h3>${item.title || "Untitled"}</h3>
            <p>${item.type || "item"} • ${item.category || "General"}</p>
          </div>
          <button data-edit="${d.id}">Edit</button>
          <button class="danger" data-delete="${d.id}">Delete</button>
        </div>
      `;
    }).join("") : "<p>No content added yet.</p>";

    adminList.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = () => {
        const selectedDoc = docs.find(d => d.id === button.dataset.edit);
        const item = selectedDoc.data();

        fields.itemId.value = selectedDoc.id;
        fields.title.value = item.title || "";
        fields.type.value = item.type || "video";
        fields.category.value = item.category || "";
        fields.link.value = item.link || "";
        fields.thumb.value = item.thumb || "";
        fields.description.value = item.description || "";

        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    });

    adminList.querySelectorAll("[data-delete]").forEach(button => {
      button.onclick = async () => {
        if (confirm("Delete this content?")) {
          try {
            await deleteDoc(doc(db, "items", button.dataset.delete));
            await loadAdminList();
          } catch (e) {
            formStatus.textContent = cleanError(e);
          }
        }
      };
    });
  } catch (e) {
    adminList.innerHTML = `<p>${cleanError(e)}</p>`;
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const admin = await isAdmin(user);

  if (!admin) {
    alert("not-admin");
    location.href = "index.html";
    return;
  }

  loadAdminList();
});

document.getElementById("saveBtn").onclick = saveContent;
document.getElementById("clearBtn").onclick = clearForm;
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};
