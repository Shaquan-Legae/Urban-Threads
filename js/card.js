// card.js - Payment page auth guard + cart-derived total display

import { getCartItemCount, getCartState, getCartTotal, startCartState, subscribeCartState, waitForAuthState, removeCartProduct } from "./cart-state.js";

const pathName = window.location.pathname.toLowerCase();
const isCardPage = pathName.endsWith("card.html");
const DELIVERY_FEE_STORAGE_KEY = "urban_threads_delivery_fee";

let cardStateUnsubscribe = null;
let _lastPersistedDelivery = 0;

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
  try {
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
    _lastPersistedDelivery = deliveryFee;
    updateTotalDisplay(subtotal + deliveryFee);
  } catch (err) {
    console.error('renderCardState error:', err);
  }
}

function recomputeTotalFromState() {
  try {
    const state = getCartState();
    if (!state || state.loading || state.error) return;
    const subtotal = getCartTotal(state.items);
    const deliveryFee = getPersistedDeliveryFee();
    _lastPersistedDelivery = deliveryFee;
    updateTotalDisplay(subtotal + deliveryFee);
  } catch (err) {
    console.error('recomputeTotalFromState error:', err);
  }
}

function bindPaymentValidation() {
  const payBtn = document.querySelector(".pay-btn");
  if (!payBtn || payBtn.dataset.bound === "true") {
    return;
  }

  let isProcessing = false;

  payBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    if (isProcessing) return;

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

    // basic validation
    if (cardNumber.replace(/\s/g, "").length < 13) {
      setCardMessage("Invalid card number", true);
      return;
    }

    if (cvv.length < 3 || Number.isNaN(Number(cvv))) {
      setCardMessage("Invalid CVV", true);
      return;
    }

    // Disable and show processing state
    isProcessing = true;
    payBtn.disabled = true;
    payBtn.classList.add("loading");
    const originalText = payBtn.textContent;
    payBtn.textContent = "Processing...";

    try {
      // simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // clear cart using existing removeCartProduct utility
      const productIds = Object.keys(getCartState().items || {});
      for (const pid of productIds) {
        try {
          await removeCartProduct(pid);
        } catch (err) {
          console.error("Failed to remove product during clear:", pid, err);
          throw err;
        }
      }

      // success — show animated success UI then redirect
      showPaymentSuccess();
      // small delay to let animation play before redirecting
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1800);
    } catch (error) {
      console.error("Checkout failed:", error);
      setCardMessage("Payment failed. Please try again.", true);
      // re-enable
      payBtn.disabled = false;
      payBtn.classList.remove("loading");
      payBtn.textContent = originalText;
      isProcessing = false;
    }
  });

  payBtn.dataset.bound = "true";
}

function showPaymentSuccess() {
  try {
    const container = document.querySelector('.payment-container');
    const form = document.querySelector('.payment-form');
    const success = document.getElementById('payment-success');
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
    // ensure pay button disabled state removed after success to avoid odd focus
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.classList.remove('loading');
    }
  } catch (err) {
    console.error('showPaymentSuccess error:', err);
  }
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

  // ensure initial total reflects current cart+delivery (in case subscribe delivered earlier)
  recomputeTotalFromState();

  // watch for delivery fee changes in other pages (storage events)
  window.addEventListener('storage', (e) => {
    if (e.key === DELIVERY_FEE_STORAGE_KEY) {
      // only update if value actually changed
      const newVal = Number(e.newValue);
      if (!Number.isFinite(newVal)) return;
      if (newVal === _lastPersistedDelivery) return;
      _lastPersistedDelivery = newVal;
      recomputeTotalFromState();
    }
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
