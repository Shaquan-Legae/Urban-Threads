// checkout.js - Enhanced checkout with delivery fees, payment processing, and card detection

import { getCartItemCount, getCartTotal, getCartState, startCartState, subscribeCartState, waitForAuthState, removeCartProduct } from "./cart-state.js";
import { showError, showLoading, updateCartTotal } from "./ui.js";

const pathName = window.location.pathname.toLowerCase();
const isCheckoutPage = pathName.endsWith("checkout.html");

let checkoutUnsubscribe = null;
let currentDeliveryFee = 0;
let currentCartItems = {};
let isProcessingPayment = false;

function redirectToLogin() {
  window.location.replace("login.html");
}

function getMainContainer() {
  return document.querySelector("main");
}

function getSummaryContainer() {
  return document.querySelector(".checkout-summary") || getMainContainer();
}

/* Card Type Detection */
function detectCardType(number) {
  if (!number) return null;

  const cleaned = number.replace(/\D/g, "");

  if (/^4/.test(cleaned)) {
    return "visa";
  }

  if (/^(51|52|53|54|55)/.test(cleaned) || /^(2221|2720)/.test(cleaned)) {
    return "mastercard";
  }

  return null;
}

function formatCardNumber(input) {
  const value = input.value.replace(/\s/g, "");
  const groups = value.match(/.{1,4}/g) || [];
  input.value = groups.join(" ");
}

function formatExpiryDate(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2, 4);
  }
  input.value = value;
}

function updateCardIcon() {
  const cardInput = document.getElementById("card-number");
  const icon = document.querySelector(".card-icon");

  if (!cardInput || !icon) {
    return;
  }

  const cardType = detectCardType(cardInput.value);

  icon.className = "card-icon";
  if (cardType) {
    icon.classList.add("visible", cardType);
  }
}

function attachCardInputListeners() {
  const cardNumberInput = document.getElementById("card-number");
  const expiryInput = document.getElementById("card-expiry");
  const cvcInput = document.getElementById("card-cvc");

  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", () => {
      formatCardNumber(cardNumberInput);
      updateCardIcon();
    });
  }

  if (expiryInput) {
    expiryInput.addEventListener("input", () => {
      formatExpiryDate(expiryInput);
    });
  }

  if (cvcInput) {
    cvcInput.addEventListener("input", () => {
      cvcInput.value = cvcInput.value.replace(/\D/g, "");
    });
  }
}

/* Delivery Fee Handling */
function attachDeliveryOptionListeners() {
  const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
  const deliveryError = document.querySelector(".delivery-error");

  if (deliveryOptions.length === 0) {
    console.warn("No delivery options found");
    return;
  }

  deliveryOptions.forEach((radio) => {
    radio.addEventListener("change", () => {
      const feeValue = Number(radio.dataset.fee) || 0;
      currentDeliveryFee = feeValue;
      console.log("Delivery option selected:", radio.value, "Fee:", feeValue);
      
      if (deliveryError) {
        deliveryError.style.display = "none";
      }
      updateCheckoutTotal();
    });
  });
}

function getSelectedDeliveryOption() {
  const selected = document.querySelector('input[name="delivery"]:checked');
  return selected ? { value: selected.value, fee: Number(selected.dataset.fee) } : null;
}

function updateCheckoutTotal() {
  const subtotal = getCartTotal(currentCartItems);
  const total = subtotal + currentDeliveryFee;

  console.log("updateCheckoutTotal called - Subtotal:", subtotal, "DeliveryFee:", currentDeliveryFee, "Total:", total);

  const subtotalEl = document.getElementById("subtotal-value");
  const deliveryEl = document.getElementById("delivery-value");
  const totalEl = document.getElementById("checkout-total");

  if (subtotalEl) {
    subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
  }

  if (deliveryEl) {
    deliveryEl.textContent = currentDeliveryFee > 0 ? `R${currentDeliveryFee.toFixed(2)}` : "-";
  }

  if (totalEl) {
    totalEl.textContent = `R${total.toFixed(2)}`;
  }
}

/* Clear Cart */
async function clearCart() {
  try {
    const state = getCartState();
    const productIds = Object.keys(state.items || {});

    for (const productId of productIds) {
      await removeCartProduct(productId);
    }
  } catch (error) {
    console.error("Failed to clear cart:", error);
    throw error;
  }
}

/* Payment Processing */
async function processPayment() {
  const cardName = document.getElementById("card-name")?.value?.trim();
  const cardNumber = document.getElementById("card-number")?.value?.replace(/\s/g, "");
  const expiryDate = document.getElementById("card-expiry")?.value?.trim();
  const cvc = document.getElementById("card-cvc")?.value?.trim();
  const payBtn = document.getElementById("pay-now-btn");
  const deliveryError = document.querySelector(".delivery-error");

  // Validation
  const itemCount = getCartItemCount(currentCartItems);
  if (!itemCount) {
    if (deliveryError) {
      deliveryError.textContent = "Your cart is empty.";
      deliveryError.style.display = "block";
    }
    return false;
  }

  const deliveryOption = getSelectedDeliveryOption();
  if (!deliveryOption) {
    if (deliveryError) {
      deliveryError.textContent = "Please select a delivery option.";
      deliveryError.style.display = "block";
    }
    return false;
  }

  if (!cardName || !cardNumber || !expiryDate || !cvc) {
    alert("Please fill in all payment details.");
    return false;
  }

  if (cardNumber.length < 13 || cardNumber.length > 19) {
    alert("Please enter a valid card number.");
    return false;
  }

  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    alert("Please enter a valid expiry date (MM/YY).");
    return false;
  }

  if (cvc.length < 3 || cvc.length > 4) {
    alert("Please enter a valid CVC.");
    return false;
  }

  // Disable button and show loading
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.classList.add("loading");
    payBtn.textContent = "Processing...";
  }

  try {
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clear cart
    await clearCart();

    // Show success
    showPaymentSuccess();
    return true;
  } catch (error) {
    console.error("Payment failed:", error);
    alert("Payment processing failed. Please try again.");
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.classList.remove("loading");
      payBtn.textContent = "Pay Now";
    }
    return false;
  }
}

function showPaymentSuccess() {
  const checkoutContent = document.querySelector(".checkout-content");
  const successMessage = document.getElementById("payment-success");

  if (checkoutContent) {
    checkoutContent.style.display = "none";
  }

  if (successMessage) {
    successMessage.style.display = "block";
  }
}

function attachPayNowListener() {
  const payBtn = document.getElementById("pay-now-btn");

  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      if (isProcessingPayment) {
        return;
      }

      isProcessingPayment = true;
      await processPayment();
      isProcessingPayment = false;
    });
  }
}

function renderCheckoutState(state) {
  const container = getSummaryContainer();
  if (!container) {
    return;
  }

  if (state.loading) {
    showLoading(container);
    return;
  }

  if (state.error) {
    showError(container, state.error);
    return;
  }

  const items = Object.values(state.items);
  const itemCount = getCartItemCount(state.items);
  const total = getCartTotal(state.items);

  console.log("renderCheckoutState - Items:", items.length, "CartTotal:", total, "CurrentDeliveryFee:", currentDeliveryFee);

  if (!items.length) {
    container.innerHTML = "<p>Your cart is empty</p>";
    updateCartTotal(0);
    currentCartItems = {};
    updateCheckoutTotal();
    return;
  }

  const rows = items
    .map((item) => {
      const lineSubtotal = (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2);
      return `
        <div class="order-item">
          <span class="item-name">${item.name} x${item.quantity}</span>
          <span class="item-price">R ${lineSubtotal}</span>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="order-items">${rows}</div>
  `;

  // Update cart state
  currentCartItems = state.items;
  console.log("Set currentCartItems, now calling updateCheckoutTotal");
  updateCheckoutTotal();
}

export async function initCheckoutPage() {
  if (!isCheckoutPage) {
    console.log("Not on checkout page");
    return;
  }

  console.log("Initializing checkout page");

  await startCartState();
  await waitForAuthState();

  const initialState = getCartState();
  if (!initialState.user) {
    redirectToLogin();
    return;
  }

  console.log("Attaching listeners...");
  // Attach input listeners
  attachCardInputListeners();
  attachDeliveryOptionListeners();
  attachPayNowListener();

  console.log("Subscribing to cart state...");
  // Subscribe to cart state
  if (typeof checkoutUnsubscribe === "function") {
    checkoutUnsubscribe();
  }

  checkoutUnsubscribe = subscribeCartState((state) => {
    if (!state.user) {
      redirectToLogin();
      return;
    }
    renderCheckoutState(state);
  });
}

if (isCheckoutPage) {
  initCheckoutPage();
  window.addEventListener("beforeunload", () => {
    if (typeof checkoutUnsubscribe === "function") {
      checkoutUnsubscribe();
    }
  });
}
