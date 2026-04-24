// cart.js - Cart page rendering + cart write operations

import {
  addProductToCart,
  getCartItemCount,
  getCartState,
  getCartTotal,
  removeCartProduct,
  setCartProductQuantity,
  startCartState,
  subscribeCartState,
  waitForAuthState
} from "./cart-state.js";
import { createCartItem, showError, showLoading, updateCartCount, updateCartTotal } from "./ui.js";

const isCartPage = Boolean(document.querySelector(".cart-page") || document.querySelector(".cart-items"));

let cartEventsBound = false;
let cartStateUnsubscribe = null;

function redirectToLogin() {
  window.location.replace("login.html");
}

function getCartContainer() {
  return document.querySelector(".cart-items");
}

function updateSummaryItemsLabel(itemCount) {
  const summaryItemsLabel = document.querySelector(".summary__row .summary__label");
  if (summaryItemsLabel) {
    summaryItemsLabel.innerText = `ITEMS ${itemCount}`;
  }
}

function renderCartState(state) {
  const cartItemsContainer = getCartContainer();
  if (!cartItemsContainer) {
    return;
  }

  if (state.loading) {
    showLoading(cartItemsContainer);
    return;
  }

  if (state.error) {
    showError(cartItemsContainer, state.error);
    return;
  }

  const items = Object.values(state.items);
  const itemCount = getCartItemCount(state.items);
  const total = getCartTotal(state.items);

  cartItemsContainer.innerHTML = "";

  if (!items.length) {
    cartItemsContainer.innerHTML = "<p>Your cart is empty</p>";
    updateSummaryItemsLabel(0);
    updateCartCount(0);
    updateCartTotal(0);
    return;
  }

  items.forEach((item) => {
    cartItemsContainer.appendChild(createCartItem(item, item.quantity));
  });

  updateSummaryItemsLabel(itemCount);
  updateCartCount(itemCount);
  updateCartTotal(total);
}

function bindCartEvents() {
  if (cartEventsBound) {
    return;
  }

  const cartItemsContainer = getCartContainer();
  if (!cartItemsContainer) {
    return;
  }

  cartItemsContainer.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("button");
    if (!actionButton) {
      return;
    }

    const productId = actionButton.dataset.productId;
    if (!productId) {
      return;
    }

    try {
      if (actionButton.classList.contains("cart-item__remove")) {
        await removeCartProduct(productId);
        return;
      }

      const currentQuantity = Number(getCartState().items[productId]?.quantity || 0);

      if (actionButton.classList.contains("quantity-increase")) {
        await setCartProductQuantity(productId, currentQuantity + 1);
        return;
      }

      if (actionButton.classList.contains("quantity-decrease")) {
        await setCartProductQuantity(productId, currentQuantity - 1);
      }
    } catch (error) {
      console.error("Cart action failed:", error);
      showError(cartItemsContainer, "Unable to update your cart right now.");
    }
  });

  cartEventsBound = true;
}

export async function addToCart(product, quantity = 1) {
  try {
    await addProductToCart(product, quantity);
    return true;
  } catch (error) {
    if (error?.message === "AUTH_REQUIRED") {
      window.location.assign("login.html");
      return false;
    }

    console.error("Add to cart failed:", error);
    return false;
  }
}

export async function removeFromCart(productId) {
  try {
    await removeCartProduct(productId);
  } catch (error) {
    if (error?.message === "AUTH_REQUIRED") {
      window.location.assign("login.html");
      return;
    }
    throw error;
  }
}

export async function updateQuantity(productId, newQuantity) {
  await setCartProductQuantity(productId, newQuantity);
}

export async function loadCartFromFirestore() {
  await startCartState();
  await waitForAuthState();
  return getCartState().items;
}

export function getCartItems() {
  return getCartState().items;
}

export async function initCartPage() {
  if (!isCartPage) {
    return;
  }

  await startCartState();
  await waitForAuthState();

  const initialState = getCartState();
  if (!initialState.user) {
    redirectToLogin();
    return;
  }

  bindCartEvents();

  if (typeof cartStateUnsubscribe === "function") {
    cartStateUnsubscribe();
  }

  cartStateUnsubscribe = subscribeCartState((state) => {
    if (!state.user) {
      redirectToLogin();
      return;
    }
    renderCartState(state);
  });
}

if (isCartPage) {
  initCartPage();
  window.addEventListener("beforeunload", () => {
    if (typeof cartStateUnsubscribe === "function") {
      cartStateUnsubscribe();
    }
  });
}
