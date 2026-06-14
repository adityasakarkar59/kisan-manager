import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const app = getApps().length
  ? getApps()[0]
  : initializeApp(window.KISAN_FIREBASE_CONFIG);

const auth = getAuth(app);
const db = getFirestore(app);

window.kisanAuth = auth;
window.kisanCurrentUser = null;

await setPersistence(auth, browserLocalPersistence);

function showAuthMessage(message) {
  const box = document.getElementById("authMessage");

  if (!box) {
    console.log(message);
    return;
  }

  box.innerText = message;
  box.classList.remove("hidden");
}

function hideAuthMessage() {
  const box = document.getElementById("authMessage");

  if (!box) {
    return;
  }

  box.innerText = "";
  box.classList.add("hidden");
}

function showMainApp(user) {
  const boot = document.getElementById("bootScreen");
  const loginPage = document.getElementById("loginPage");
  const mainApp = document.getElementById("mainApp");
  const emailBox = document.getElementById("accountEmail");
  const nameBox = document.getElementById("accountName");
  const initialBox = document.getElementById("profileInitial");
  const initialBoxLarge = document.getElementById("profileInitialLarge");

  let displayName = user.displayName || localStorage.getItem("kisan_active_user_name") || "Farm Account";
  let email = user.email || localStorage.getItem("kisan_active_user_email") || "Logged in";

  if (boot) boot.classList.add("hidden");
  if (loginPage) loginPage.classList.add("hidden");
  if (mainApp) mainApp.classList.remove("hidden");

  if (emailBox) emailBox.innerText = email;
  if (nameBox) nameBox.innerText = displayName;
  if (initialBox) initialBox.innerText = displayName.trim().charAt(0).toUpperCase() || "K";
  if (initialBoxLarge) initialBoxLarge.innerText = displayName.trim().charAt(0).toUpperCase() || "K";
}

function showLoginPage() {
  const boot = document.getElementById("bootScreen");
  const loginPage = document.getElementById("loginPage");
  const mainApp = document.getElementById("mainApp");

  if (boot) boot.classList.add("hidden");
  if (mainApp) mainApp.classList.add("hidden");
  if (loginPage) loginPage.classList.remove("hidden");
}

window.showLoginForm = function() {
  hideAuthMessage();

  document.getElementById("loginFormBox").classList.remove("hidden");
  document.getElementById("signupFormBox").classList.add("hidden");

  document.getElementById("loginTabBtn").classList.add("active-login-tab");
  document.getElementById("signupTabBtn").classList.remove("active-login-tab");
};

window.showSignupForm = function() {
  hideAuthMessage();

  document.getElementById("signupFormBox").classList.remove("hidden");
  document.getElementById("loginFormBox").classList.add("hidden");

  document.getElementById("signupTabBtn").classList.add("active-login-tab");
  document.getElementById("loginTabBtn").classList.remove("active-login-tab");
};

window.createUserAccount = async function() {
  hideAuthMessage();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!navigator.onLine) {
    showAuthMessage("Internet is required to create account.");
    return;
  }

  if (name === "") {
    showAuthMessage("Enter account name.");
    return;
  }

  if (email === "") {
    showAuthMessage("Enter email address.");
    return;
  }

  if (password === "") {
    showAuthMessage("Enter password.");
    return;
  }

  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.");
    return;
  }

  try {
    showAuthMessage("Creating account...");

    const result = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(result.user, {
      displayName: name
    });

    window.kisanCurrentUser = result.user;

    showMainApp(result.user);

    await firstTimeUserDataCheck(result.user);

    hideAuthMessage();

    if (window.showMessage) {
      window.showMessage("Account created successfully");
    }
  } catch (error) {
    showAuthMessage(getFriendlyAuthError(error));
  }
};

window.loginUser = async function() {
  hideAuthMessage();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!navigator.onLine) {
    showAuthMessage("Internet is required for first login. After login once, app opens offline.");
    return;
  }

  if (email === "") {
    showAuthMessage("Enter email address.");
    return;
  }

  if (password === "") {
    showAuthMessage("Enter password.");
    return;
  }

  try {
    showAuthMessage("Logging in...");

    const result = await signInWithEmailAndPassword(auth, email, password);

    window.kisanCurrentUser = result.user;

    showMainApp(result.user);

    await firstTimeUserDataCheck(result.user);

    hideAuthMessage();

    if (window.showMessage) {
      window.showMessage("Logged in successfully");
    }
  } catch (error) {
    showAuthMessage(getFriendlyAuthError(error));
  }
};

window.logoutUser = async function() {
  try {
    await signOut(auth);

    window.kisanCurrentUser = null;

    localStorage.removeItem("kisan_active_user_uid");
    localStorage.removeItem("kisan_active_user_email");
    localStorage.removeItem("kisan_active_user_name");

    showLoginPage();
    window.showLoginForm();

    if (window.showMessage) {
      window.showMessage("Logged out");
    }
  } catch (error) {
    console.log("Logout error:", error);

    if (window.showMessage) {
      window.showMessage("Logout failed");
    }
  }
};

onAuthStateChanged(auth, async function(user) {
  if (user) {
    window.kisanCurrentUser = user;

    showMainApp(user);

    await firstTimeUserDataCheck(user);
    return;
  }

  const savedUid = localStorage.getItem("kisan_active_user_uid");

  if (savedUid) {
    if (window.showMainAppFromLocalSession) {
      window.showMainAppFromLocalSession();
    } else {
      const boot = document.getElementById("bootScreen");
      const loginPage = document.getElementById("loginPage");
      const mainApp = document.getElementById("mainApp");

      if (boot) boot.classList.add("hidden");
      if (loginPage) loginPage.classList.add("hidden");
      if (mainApp) mainApp.classList.remove("hidden");
    }

    return;
  }

  window.kisanCurrentUser = null;
  showLoginPage();
});

async function firstTimeUserDataCheck(user) {
  try {
    if (!window.openKisanDB) {
      return;
    }

    await openKisanDB();

    const activeUserKey = "kisan_active_user_uid";
    const previousUserId = localStorage.getItem(activeUserKey);

    const customersRef = doc(db, "users", user.uid, "data", "customers");
    const mirchiRef = doc(db, "users", user.uid, "data", "mirchiDays");

    if (previousUserId && previousUserId !== user.uid && window.clearAllLocalDataDB) {
      await clearAllLocalDataDB();
      localStorage.setItem(activeUserKey, user.uid);
      localStorage.setItem("kisan_active_user_email", user.email || "Logged in");
      localStorage.setItem("kisan_active_user_name", user.displayName || "Farm Account");

      if (navigator.onLine) {
        const customersSnap = await getDoc(customersRef);
        const mirchiSnap = await getDoc(mirchiRef);

        const cloudCustomers = customersSnap.exists()
          ? customersSnap.data().data || []
          : [];

        const cloudMirchi = mirchiSnap.exists()
          ? mirchiSnap.data().data || []
          : [];

        await saveCustomersDB(cloudCustomers);
        await saveMirchiDaysDB(cloudMirchi);
      }

      location.reload();
      return;
    }

    localStorage.setItem(activeUserKey, user.uid);
    localStorage.setItem("kisan_active_user_email", user.email || "Logged in");
    localStorage.setItem("kisan_active_user_name", user.displayName || "Farm Account");

    const localCustomers = await getAllCustomersDB();
    const localMirchiDays = await getAllMirchiDaysDB();

    if (!navigator.onLine) {
      return;
    }

    const customersSnap = await getDoc(customersRef);
    const mirchiSnap = await getDoc(mirchiRef);

    const hasCloudData = customersSnap.exists() || mirchiSnap.exists();
    const hasLocalData = localCustomers.length > 0 || localMirchiDays.length > 0;

    const restoreKey = "kisan_restore_done_" + user.uid;

    if (hasCloudData && !hasLocalData && sessionStorage.getItem(restoreKey) !== "yes") {
      const cloudCustomers = customersSnap.exists()
        ? customersSnap.data().data || []
        : [];

      const cloudMirchi = mirchiSnap.exists()
        ? mirchiSnap.data().data || []
        : [];

      await saveCustomersDB(cloudCustomers);
      await saveMirchiDaysDB(cloudMirchi);

      sessionStorage.setItem(restoreKey, "yes");

      location.reload();
      return;
    }

    if (!hasCloudData && hasLocalData && window.syncNow) {
      await window.syncNow();
    }
  } catch (error) {
    console.log("First time data check failed:", error);

    if (window.showMessage) {
      window.showMessage("Cloud check failed");
    }
  }
}

function getFriendlyAuthError(error) {
  console.log("Firebase Auth Error:", error);

  const code = error && error.code ? error.code : "";
  const message = error && error.message ? error.message : "";

  if (code.includes("email-already-in-use")) {
    return "This email already has an account. Please login.";
  }

  if (code.includes("invalid-email")) {
    return "Enter a valid email address.";
  }

  if (code.includes("weak-password")) {
    return "Password is weak. Use at least 6 characters.";
  }

  if (code.includes("operation-not-allowed")) {
    return "Email/password login is not enabled in Firebase.";
  }

  if (code.includes("unauthorized-domain")) {
    return "This website domain is not allowed in Firebase Auth.";
  }

  if (code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Email or password is wrong.";
  }

  if (code.includes("user-not-found")) {
    return "No account found with this email.";
  }

  if (code.includes("network-request-failed")) {
    return "Internet problem. Please check connection.";
  }

  return code || message || "Something went wrong. Please try again.";
}