// card.js - Payment page auth guard + cart-derived total display

import { getCartItemCount, getCartState, getCartTotal, startCartState, subscribeCartState, waitForAuthState } from "./cart-state.js";

const pathName = window.location.pathname.toLowerCase();
const isCardPage = pathName.endsWith("card.html");
const DELIVERY_FEE_STORAGE_KEY = "urban_threads_delivery_fee";

let cardStateUnsubscribe = null;

function redirectToLogin() {
  window.location.replace("login.html");
}

function setCardMessage(message, isError = false) {
  const subtitle = document.querySelector(".payment-subtitle");
  if (!subtitle) {
    return;
  }

  subtitle.textContent = message;
  subtitle.style.color = isError ? "#c62828" : "";
}

function updateTotalDisplay(total) {
  const totalElement = document.querySelector(".total-value");
  if (!totalElement) {
    return;
  }
  totalElement.textContent = `R ${Number(total).toFixed(2)}`;
}

function getPersistedDeliveryFee() {
  try {
    const stored = Number(sessionStorage.getItem(DELIVERY_FEE_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch (error) {
    console.warn("Unable to read delivery fee on card page:", error);
    return 0;
  }
}

function renderCardState(state) {
  if (state.loading) {
    setCardMessage("Loading cart...", false);
    return;
  }

  if (state.error) {
    setCardMessage(state.error, true);
    return;
  }

  const itemCount = getCartItemCount(state.items);
  if (!itemCount) {
    setCardMessage("Your cart is empty", true);
    updateTotalDisplay(0);
    return;
  }

  setCardMessage("Secure checkout", false);
  const subtotal = getCartTotal(state.items);
  const deliveryFee = getPersistedDeliveryFee();
  updateTotalDisplay(subtotal + deliveryFee);
}

function bindPaymentValidation() {
  const payBtn = document.querySelector(".pay-btn");
  if (!payBtn || payBtn.dataset.bound === "true") {
    return;
  }

  payBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const state = getCartState();
    if (!getCartItemCount(state.items)) {
      setCardMessage("Your cart is empty", true);
      return;
    }

    const cardholderName = document.querySelector('input[placeholder="John Doe"]')?.value?.trim() || "";
    const cardNumber = document.querySelector('input[placeholder="1234 5678 9012 3456"]')?.value?.trim() || "";
    const expiryDate = document.querySelector('input[placeholder="MM/YY"]')?.value?.trim() || "";
    const cvv = document.querySelector('input[placeholder="123"]')?.value?.trim() || "";

    if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
      setCardMessage("Please fill in all required fields", true);
      return;
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      setCardMessage("Invalid card number", true);
      return;
    }

    if (cvv.length !== 3 || Number.isNaN(Number(cvv))) {
      setCardMessage("Invalid CVV", true);
      return;
    }

    alert("Payment successful! Your order has been placed.");
    window.location.href = "index.html";
  });

  payBtn.dataset.bound = "true";
}

export async function initCardPage() {
  if (!isCardPage) {
    return;
  }

  await startCartState();
  await waitForAuthState();

  const initialState = getCartState();
  if (!initialState.user) {
    redirectToLogin();
    return;
  }

  bindPaymentValidation();

  if (typeof cardStateUnsubscribe === "function") {
    cardStateUnsubscribe();
  }

  cardStateUnsubscribe = subscribeCartState((state) => {
    if (!state.user) {
      redirectToLogin();
      return;
    }
    renderCardState(state);
  });
}

if (isCardPage) {
  initCardPage();
  window.addEventListener("beforeunload", () => {
    if (typeof cardStateUnsubscribe === "function") {
      cardStateUnsubscribe();
    }
  });
}
