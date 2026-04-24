/* auth.js - Authentication functionality */

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, authPersistenceReady, db } from "./firebase.js";

/* show message */
function showFormMessage(message, isError = true) {
  const divider = document.querySelector(".divider");
  if (divider) {
    divider.textContent = message;
    divider.style.color = isError ? "#c62828" : "#1b7f3a";
    return;
  }
  alert(message);
}

/* clear message */
function clearFormMessage() {
  const divider = document.querySelector(".divider");
  if (divider) {
    divider.textContent = "or";
    divider.style.color = "";
  }
}

/* auth elements */
function getAuthElements() {
  const form = document.querySelector(".login-form");
  const emailInput = document.querySelector("#email");
  const emailDomain = document.querySelector("#email-domain");
  const passwordInput = document.querySelector("#password");
  const confirmPasswordInput = document.querySelector("#confirm-password");
  const usernameInput = document.querySelector("#username");
  const submitBtn = document.querySelector(".login-btn");
  const googleBtn = document.querySelector(".google-btn");
  const forgotPasswordBtn = document.querySelector(".forgot-password-btn");
  const facebookBtn = document.querySelector(".login-card .facebook-btn");

  const isAuthPage = Boolean(form && emailInput && passwordInput && submitBtn);
  const isSignupPage = Boolean(isAuthPage && confirmPasswordInput);
  const isLoginPage = Boolean(isAuthPage && !confirmPasswordInput);

  return {
    form,
    emailInput,
    emailDomain,
    passwordInput,
    confirmPasswordInput,
    usernameInput,
    submitBtn,
    googleBtn,
    forgotPasswordBtn,
    facebookBtn,
    isAuthPage,
    isSignupPage,
    isLoginPage,
  };
}

/* email builder */
function getFullEmail(emailInput, emailDomain) {
  const localValue = emailInput?.value?.trim() || "";
  if (!localValue) return "";

  if (localValue.includes("@")) {
    return localValue.toLowerCase();
  }

  const domain = emailDomain?.value || "@gmail.com";
  return `${localValue}${domain}`.toLowerCase();
}

/* button loading */
function setButtonLoadingState(button, loading, loadingLabel = "") {
  if (!button) return;

  if (loading) {
    button.disabled = true;
    if (loadingLabel) {
      button.dataset.originalLabel = button.textContent || "";
      button.textContent = loadingLabel;
    }
    return;
  }

  button.disabled = false;
  if (loadingLabel && button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
}

/* IMPORTANT: create/update user doc WITH username */
async function ensureUserDoc(user, username = "") {
  if (!user?.uid) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const existingDoc = await getDoc(userRef);

    const data = existingDoc.exists() ? existingDoc.data() : null;

    const finalUsername =
      username ||
      data?.username ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "user");

    if (!existingDoc.exists()) {
      await setDoc(userRef, {
        email: user.email || "",
        username: finalUsername,
        role: "user",
      });
      return;
    }

    await setDoc(
      userRef,
      {
        email: user.email || data?.email || "",
        username: finalUsername,
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Failed to ensure user Firestore document:", error);
  }
}

/* redirect if already logged in */
async function redirectAuthenticatedUserOnAuthPages(isAuthPage) {
  if (!isAuthPage) return;

  await authPersistenceReady;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.replace("shop.html");
    }
  });
}

/* LOGIN */
async function handleEmailLogin(elements, event) {
  event?.preventDefault();
  clearFormMessage();

  const email = getFullEmail(elements.emailInput, elements.emailDomain);
  const password = elements.passwordInput?.value?.trim() || "";

  if (!email || !password) {
    showFormMessage("Please fill in all fields.");
    return;
  }

  try {
    setButtonLoadingState(elements.submitBtn, true, "Logging in...");
    await authPersistenceReady;

    const credentials = await signInWithEmailAndPassword(auth, email, password);

    await ensureUserDoc(credentials.user);

    window.location.assign("shop.html");
  } catch (error) {
    console.error("Login failed:", error);
    showFormMessage(`Login failed: ${error.message}`);
  } finally {
    setButtonLoadingState(elements.submitBtn, false, "Logging in...");
  }
}

/* SIGNUP */
async function handleEmailSignup(elements, event) {
  event?.preventDefault();
  clearFormMessage();

  const email = getFullEmail(elements.emailInput, elements.emailDomain);
  const password = elements.passwordInput?.value?.trim() || "";
  const confirmPassword = elements.confirmPasswordInput?.value?.trim() || "";
  const username = elements.usernameInput?.value?.trim() || "";

  if (!username || !email || !password || !confirmPassword) {
    showFormMessage("Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    showFormMessage("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showFormMessage("Passwords do not match.");
    return;
  }

  try {
    setButtonLoadingState(elements.submitBtn, true, "Creating account...");
    await authPersistenceReady;

    const credentials = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    await ensureUserDoc(credentials.user, username);

    window.location.assign("shop.html");
  } catch (error) {
    console.error("Signup failed:", error);
    showFormMessage(`Signup failed: ${error.message}`);
  } finally {
    setButtonLoadingState(elements.submitBtn, false, "Creating account...");
  }
}

/* GOOGLE LOGIN */
async function handleGoogleAuth(elements, event) {
  event?.preventDefault();
  clearFormMessage();

  try {
    setButtonLoadingState(elements.googleBtn, true, "Signing in...");
    await authPersistenceReady;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const credentials = await signInWithPopup(auth, provider);

    const username =
      credentials.user.displayName || credentials.user.email.split("@")[0];

    await ensureUserDoc(credentials.user, username);

    window.location.assign("shop.html");
  } catch (error) {
    if (error?.code === "auth/popup-closed-by-user") return;

    console.error("Google login failed:", error);
    showFormMessage(`Google Sign-In failed: ${error.message}`);
  } finally {
    setButtonLoadingState(elements.googleBtn, false, "Signing in...");
  }
}

/* forgot password */
async function handleForgotPassword(elements, event) {
  event?.preventDefault();
  clearFormMessage();

  const email = getFullEmail(elements.emailInput, elements.emailDomain);
  if (!email) {
    showFormMessage("Enter your email first.");
    return;
  }

  try {
    setButtonLoadingState(elements.forgotPasswordBtn, true);
    await sendPasswordResetEmail(auth, email);
    showFormMessage("Password reset email sent.", false);
  } catch (error) {
    console.error("Password reset failed:", error);
    showFormMessage(`Password reset failed: ${error.message}`);
  } finally {
    setButtonLoadingState(elements.forgotPasswordBtn, false);
  }
}

/* wire page */
function wireAuthPageListeners(elements) {
  if (!elements.isAuthPage) return;

  elements.form?.addEventListener("submit", (event) => {
    if (elements.isSignupPage) {
      handleEmailSignup(elements, event);
      return;
    }
    handleEmailLogin(elements, event);
  });

  elements.submitBtn?.addEventListener("click", (event) => {
    if (elements.isSignupPage) {
      handleEmailSignup(elements, event);
      return;
    }
    handleEmailLogin(elements, event);
  });

  elements.googleBtn?.addEventListener("click", (event) => {
    handleGoogleAuth(elements, event);
  });

  if (elements.isLoginPage) {
    elements.forgotPasswordBtn?.addEventListener("click", (event) => {
      handleForgotPassword(elements, event);
    });
  }

  if (elements.facebookBtn) {
    elements.facebookBtn.style.pointerEvents = "none";
    elements.facebookBtn.style.opacity = "0.55";
    elements.facebookBtn.title = "Facebook Sign-In is not configured.";
  }
}

/* logout */
function wireLogoutListener() {
  const logoutBtn = document.querySelector(".logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      await signOut(auth);
      clearFormMessage();
      window.location.assign("login.html");
    } catch (error) {
      console.error("Logout failed:", error);
      showFormMessage(`Logout failed: ${error.message}`);
    }
  });
}

/* init */
const authElements = getAuthElements();
wireAuthPageListeners(authElements);
wireLogoutListener();
redirectAuthenticatedUserOnAuthPages(authElements.isAuthPage);
