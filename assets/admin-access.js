import { db } from "../firebase/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function isAdmin(user) {
  if (!user || !user.email) return false;

  const exactEmail = user.email.trim();
  const lowerEmail = exactEmail.toLowerCase();

  try {
    // First check lowercase email document.
    let snap = await getDoc(doc(db, "admins", lowerEmail));

    if (snap.exists()) {
      console.log("Admin found:", lowerEmail);
      return true;
    }

    // Then check exact email document, just in case.
    if (exactEmail !== lowerEmail) {
      snap = await getDoc(doc(db, "admins", exactEmail));

      if (snap.exists()) {
        console.log("Admin found:", exactEmail);
        return true;
      }
    }

    console.warn("Admin not found. Create Firestore document:", `admins/${lowerEmail}`);
    return false;
  } catch (error) {
    console.error("Admin check failed:", error);
    return false;
  }
}
