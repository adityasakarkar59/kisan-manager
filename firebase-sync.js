import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const app = getApps().length
  ? getApps()[0]
  : initializeApp(window.KISAN_FIREBASE_CONFIG);

const firestoreDb = getFirestore(app);

function getLoggedInUser() {
  return window.kisanCurrentUser || null;
}

window.syncNow = async function() {
  const user = getLoggedInUser();

  if (!user) {
    console.log("Sync skipped: user not logged in");
    return;
  }

  if (!navigator.onLine) {
    console.log("Sync skipped: offline");
    return;
  }

  try {
    const localCustomers = await getAllCustomersDB();
    const localMirchiDays = await getAllMirchiDaysDB();

    await setDoc(
      doc(firestoreDb, "users", user.uid, "data", "customers"),
      {
        data: localCustomers,
        updatedAt: serverTimestamp()
      }
    );

    await setDoc(
      doc(firestoreDb, "users", user.uid, "data", "mirchiDays"),
      {
        data: localMirchiDays,
        updatedAt: serverTimestamp()
      }
    );

    console.log("Firebase sync completed for:", user.uid);
  } catch (error) {
    console.log("Firebase sync failed:", error);
  }
};

window.restoreFromCloud = async function() {
  const user = getLoggedInUser();

  if (!user) {
    if (window.showMessage) {
      window.showMessage("Login required to restore cloud data");
    }
    return;
  }

  if (!navigator.onLine) {
    if (window.showMessage) {
      window.showMessage("Internet required to restore");
    }
    return;
  }

  try {
    const customersSnap = await getDoc(
      doc(firestoreDb, "users", user.uid, "data", "customers")
    );

    const mirchiSnap = await getDoc(
      doc(firestoreDb, "users", user.uid, "data", "mirchiDays")
    );

    const cloudCustomers = customersSnap.exists()
      ? customersSnap.data().data || []
      : [];

    const cloudMirchiDays = mirchiSnap.exists()
      ? mirchiSnap.data().data || []
      : [];

    await saveCustomersDB(cloudCustomers);
    await saveMirchiDaysDB(cloudMirchiDays);

    if (window.showMessage) {
      window.showMessage("Cloud data restored");
    }

    setTimeout(function() {
      location.reload();
    }, 800);
  } catch (error) {
    console.log("Restore failed:", error);

    if (window.showMessage) {
      window.showMessage("Restore failed");
    }
  }
};

window.addEventListener("online", function() {
  if (window.syncNow) {
    window.syncNow();
  }
});