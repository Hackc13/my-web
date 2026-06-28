import { auth, db } from "../firebase/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query
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

const grid = document.getElementById("grid");
const status = document.getElementById("status");
const search = document.getElementById("search");
const filters = document.querySelectorAll(".filter");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const profileMenu = document.getElementById("profileMenu");
const adminPanelLink = document.getElementById("adminPanelLink");
const hero = document.querySelector(".hero");
const sectionTitle = document.querySelector(".topbar h2");

const downloadPanel = document.getElementById("downloadPanel");
const downloadList = document.getElementById("downloadList");
const clearDownloadsBtn = document.getElementById("clearDownloadsBtn");

const seriesLockModal = document.getElementById("seriesLockModal");
const closeSeriesModal = document.getElementById("closeSeriesModal");
const seriesPasswordInput = document.getElementById("seriesPasswordInput");
const unlockSeriesBtn = document.getElementById("unlockSeriesBtn");
const seriesPasswordMsg = document.getElementById("seriesPasswordMsg");

let items = [];
let activeType = "all";
let downloads = JSON.parse(localStorage.getItem("crazyhubDownloads") || "[]");
let seriesUnlocked = sessionStorage.getItem("crazyhubSeriesUnlocked") === "yes";

const titles = {
  all: "Latest Uploads",
  video: "Videos",
  movie: "Movies",
  series: "Series",
  image: "Images",
  software: "Software",
  download: "Downloads"
};

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function showSeriesModal() {
  if (!seriesLockModal) return;

  seriesLockModal.classList.remove("hidden");

  if (seriesPasswordInput) {
    seriesPasswordInput.value = "";
    setTimeout(() => seriesPasswordInput.focus(), 80);
  }

  if (seriesPasswordMsg) {
    seriesPasswordMsg.textContent = "";
  }
}

function hideSeriesModal() {
  if (seriesLockModal) {
    seriesLockModal.classList.add("hidden");
  }
}

function setActiveButton(type) {
  filters.forEach(b => b.classList.toggle("active", b.dataset.type === type));
}

async function unlockSeries() {
  if (!seriesPasswordInput || !seriesPasswordInput.value.trim()) {
    if (seriesPasswordMsg) seriesPasswordMsg.textContent = "password-required";
    return;
  }

  if (seriesPasswordMsg) seriesPasswordMsg.textContent = "checking-password";

  try {
    const snap = await getDoc(doc(db, "settings", "seriesLock"));

    if (!snap.exists()) {
      if (seriesPasswordMsg) seriesPasswordMsg.textContent = "series-password-not-set";
      return;
    }

    const data = snap.data();
    const savedHash = data.passwordHash;
    const enteredHash = await sha256(seriesPasswordInput.value);

    if (savedHash && enteredHash === savedHash) {
      seriesUnlocked = true;
      sessionStorage.setItem("crazyhubSeriesUnlocked", "yes");

      hideSeriesModal();

      activeType = "series";
      setActiveButton("series");
      search.value = "";

      render();

      const library = document.getElementById("library");
      if (library) library.scrollIntoView({ behavior: "smooth", block: "start" });

      return;
    }

    if (seriesPasswordMsg) seriesPasswordMsg.textContent = "wrong-series-password";
  } catch (error) {
    if (seriesPasswordMsg) seriesPasswordMsg.textContent = cleanError(error);
  }
}

if (unlockSeriesBtn) {
  unlockSeriesBtn.onclick = unlockSeries;
}

if (seriesPasswordInput) {
  seriesPasswordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") unlockSeries();
  });
}

if (closeSeriesModal) {
  closeSeriesModal.onclick = () => {
    hideSeriesModal();
  };
}

function fallbackThumb(type) {
  if (type === "software") return "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=900&auto=format&fit=crop";
  if (type === "download") return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop";
  if (type === "image") return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop";
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function safeFileName(title, link) {
  try {
    const url = new URL(link);
    const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");

    if (last && last.includes(".")) return last.replace(/[^\w.\- ]+/g, "_");
  } catch (_) {}

  return `${(title || "download").replace(/[^\w.\- ]+/g, "_")}.download`;
}

function saveDownloads() {
  localStorage.setItem("crazyhubDownloads", JSON.stringify(downloads.slice(0, 20)));
}

function upsertDownload(row) {
  const index = downloads.findIndex(d => d.id === row.id);

  if (index >= 0) downloads[index] = { ...downloads[index], ...row };
  else downloads.unshift(row);

  saveDownloads();
  renderDownloadsPanel();
}

function renderDownloadsPanel() {
  if (!downloadPanel || !downloadList) return;

  downloadPanel.classList.toggle("hidden", activeType !== "download");

  if (activeType !== "download") return;

  if (!downloads.length) {
    downloadList.innerHTML = `<div class="download-empty">No downloads yet. Click any download card to start.</div>`;
    return;
  }

  downloadList.innerHTML = downloads.map(d => {
    const percentText = d.progress === null || d.progress === undefined ? "Preparing" : `${d.progress}%`;
    const progressWidth = d.progress === null || d.progress === undefined ? 0 : d.progress;

    return `
      <div class="download-row">
        <div class="download-icon">⬇</div>
        <div class="download-main">
          <div class="download-title">${d.title || "Download"}</div>
          <div class="download-meta">
            <span>${percentText}</span>
            <span>${formatBytes(d.received || 0)}${d.total ? " / " + formatBytes(d.total) : ""}</span>
            <span>${d.status || "waiting"}</span>
          </div>
          <div class="download-progress">
            <span style="width:${progressWidth}%"></span>
          </div>
        </div>
        <a class="download-open" href="${d.link}" target="_blank" rel="noopener">Open</a>
      </div>
    `;
  }).join("");
}

async function startDownload(id) {
  const found = items.find(x => x.id === id);
  if (!found) return;

  const item = found.item;
  const link = item.link;
  const downloadId = `${id}-${Date.now()}`;

  upsertDownload({
    id: downloadId,
    title: item.title || "Download",
    link,
    progress: 0,
    received: 0,
    total: 0,
    status: "starting"
  });

  try {
    const response = await fetch(link);

    if (!response.ok) throw new Error(`download/${response.status}`);
    if (!response.body) throw new Error("download/stream-not-supported");

    const total = Number(response.headers.get("content-length")) || 0;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      received += value.length;

      const progress = total ? Math.min(100, Math.round((received / total) * 100)) : null;

      upsertDownload({
        id: downloadId,
        title: item.title || "Download",
        link,
        progress,
        received,
        total,
        status: total ? "downloading" : "downloading-size-unknown"
      });
    }

    const blob = new Blob(chunks);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = objectUrl;
    a.download = safeFileName(item.title, link);
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    upsertDownload({
      id: downloadId,
      title: item.title || "Download",
      link,
      progress: 100,
      received,
      total: total || received,
      status: "completed"
    });
  } catch (error) {
    console.warn(error);

    upsertDownload({
      id: downloadId,
      title: item.title || "Download",
      link,
      progress: null,
      received: 0,
      total: 0,
      status: "opened-in-browser"
    });

    window.open(link, "_blank", "noopener");
  }
}

function cardTemplate(id, item) {
  const type = item.type || "video";
  const playable = ["video", "movie", "series"].includes(type);
  const isDownload = type === "download";
  const href = playable ? `watch.html?id=${id}` : isDownload ? "#" : item.link;
  const target = playable || isDownload ? "" : `target="_blank" rel="noopener"`;

  return `<a class="card ${isDownload ? "download-card" : ""}" href="${href}" ${target} ${isDownload ? `data-download-id="${id}"` : ""}>
    <div class="poster">
      <img src="${item.thumb || fallbackThumb(type)}" alt="${item.title || "Content"}">
      <span class="badge">${type}</span>
      ${playable ? `<span class="play">▶</span>` : ``}
      ${isDownload ? `<span class="play">⬇</span>` : ``}
    </div>
    <div class="card-info">
      <h3>${item.title || "Untitled"}</h3>
      <p>${item.category || "General"}</p>
    </div>
  </a>`;
}

function bindCards() {
  document.querySelectorAll(".download-card").forEach(card => {
    card.onclick = event => {
      event.preventDefault();
      const id = card.dataset.downloadId;
      startDownload(id);
    };
  });

  document.querySelectorAll(".series-card-locked").forEach(card => {
    card.onclick = event => {
      event.preventDefault();
      showSeriesModal();
    };
  });
}

function updatePageLayout() {
  const isHome = activeType === "all";

  if (hero) {
    hero.style.display = isHome ? "flex" : "none";
  }

  if (sectionTitle) {
    sectionTitle.textContent = titles[activeType] || "Latest Uploads";
  }

  if (search) {
    search.placeholder = isHome
      ? "Search videos, software, images..."
      : `Search ${titles[activeType].toLowerCase()}...`;
  }

  renderDownloadsPanel();
}

function render() {
  updatePageLayout();

  const term = search.value.toLowerCase().trim();

  const filtered = items.filter(({ item }) => {
    const itemType = item.type || "video";
    const combined = `${item.title || ""} ${item.type || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();

    if (itemType === "series" && !seriesUnlocked) {
      return false;
    }

    return (activeType === "all" || itemType === activeType) && combined.includes(term);
  });

  grid.innerHTML = filtered.length
    ? filtered.map(({ id, item }) => cardTemplate(id, item)).join("")
    : `<div class="empty">No ${titles[activeType].toLowerCase()} found.</div>`;

  bindCards();
}

async function loadItems() {
  try {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    items = snap.docs.map(doc => ({
      id: doc.id,
      item: doc.data()
    }));

    status.style.display = "none";
    render();
  } catch (e) {
    console.error(e);
    status.textContent = cleanError(e);
  }
}

if (search) {
  search.oninput = render;
}

filters.forEach(btn => {
  btn.onclick = () => {
    const requestedType = btn.dataset.type;

    if (requestedType === "series" && !seriesUnlocked) {
      showSeriesModal();
      return;
    }

    filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    activeType = requestedType;
    search.value = "";

    render();

    const library = document.getElementById("library");
    if (library) {
      library.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
});

if (clearDownloadsBtn) {
  clearDownloadsBtn.onclick = () => {
    downloads = [];
    saveDownloads();
    renderDownloadsPanel();
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    sessionStorage.removeItem("crazyhubSeriesUnlocked");
    await signOut(auth);
    location.href = "login.html";
  };
}


function setUserEmailDisplay(user) {
  if (!userEmail) return;

  // Keep the button small. Email is shown as tooltip only.
  userEmail.textContent = "Account";
  userEmail.title = user?.email || "Account";
  userEmail.setAttribute("aria-label", user?.email || "Account");
}

function toggleProfileDropdown(event) {
  if (!profileMenu) return;

  event.preventDefault();
  event.stopPropagation();

  profileMenu.classList.toggle("hidden");
  userEmail.classList.toggle("profile-open", !profileMenu.classList.contains("hidden"));
}

if (userEmail) {
  userEmail.addEventListener("click", toggleProfileDropdown);
}

document.addEventListener("click", event => {
  if (!profileMenu || !userEmail) return;

  if (!profileMenu.contains(event.target) && !userEmail.contains(event.target)) {
    profileMenu.classList.add("hidden");
    userEmail.classList.remove("profile-open");
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  setUserEmailDisplay(user);

  const admin = await isAdmin(user);

  if (adminPanelLink) {
    adminPanelLink.classList.toggle("hidden", !admin);
  }

  loadItems();
});
