// ui.js - User interface utilities and common functions

import {
  getCartItemCount,
  getCartTotal,
  startCartState,
  subscribeCartState,
} from "./cart-state.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

/* simple in-memory cache (prevents repeated Firestore reads) */
const usernameCache = new Map();
let selectedDeliveryFee = 0;
let latestCartSubtotal = 0;
let shippingListenerBound = false;
const DELIVERY_FEE_STORAGE_KEY = "urban_threads_delivery_fee";

function persistDeliveryFee(fee) {
  try {
    sessionStorage.setItem(DELIVERY_FEE_STORAGE_KEY, String(fee));
  } catch (error) {
    console.warn("Unable to persist delivery fee:", error);
  }
}

function loadPersistedDeliveryFee() {
  try {
    const stored = Number(sessionStorage.getItem(DELIVERY_FEE_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch (error) {
    console.warn("Unable to load persisted delivery fee:", error);
    return 0;
  }
}

function parseDeliveryFee(option) {
  if (!option) {
    return 0;
  }

  const fromValue = Number(option.value);
  if (Number.isFinite(fromValue)) {
    return fromValue;
  }

  const matches = String(option.textContent || "").match(/\d+(\.\d+)?/g);
  if (!matches?.length) {
    return 0;
  }

  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSelectedDeliveryFee() {
  const shippingSelect = document.querySelector(".summary__select");
  if (!shippingSelect) {
    return 0;
  }

  const selectedOption =
    shippingSelect.options?.[shippingSelect.selectedIndex] ||
    shippingSelect.querySelector("option");

  return parseDeliveryFee(selectedOption);
}

function bindDeliveryFeeListener() {
  const shippingSelect = document.querySelector(".summary__select");
  if (!shippingSelect) {
    selectedDeliveryFee = loadPersistedDeliveryFee();
    return;
  }

  selectedDeliveryFee = getSelectedDeliveryFee();
  persistDeliveryFee(selectedDeliveryFee);

  if (shippingListenerBound) {
    return;
  }

  shippingSelect.addEventListener("change", () => {
    selectedDeliveryFee = getSelectedDeliveryFee();
    persistDeliveryFee(selectedDeliveryFee);
    updateCartTotal(latestCartSubtotal);
  });

  shippingListenerBound = true;
}

/* Authentication + Cart UI Sync */

export function initAuthUI() {
  updateCartAccess(null);
  bindDeliveryFeeListener();

  subscribeCartState((state) => {
    updateNavbarAuthState(state.user);
    updateCartCount(getCartItemCount(state.items));
    latestCartSubtotal = getCartTotal(state.items);
    updateCartTotal(latestCartSubtotal);
  });

  startCartState();
}

/* update navbar auth state with firestore username */

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function updateNavbarAuthState(user) {
  try {
    const loginLine = document.querySelector(".login-line");
    if (loginLine) {
      loginLine.style.display = user ? "none" : "flex";
    }

    const userEmailElement = document.getElementById("user-email");

    if (!user) {
      if (userEmailElement) userEmailElement.innerText = "";
      return;
    }

    let username = null;

    /* 1. check cache first */
    if (usernameCache.has(user.uid)) {
      username = usernameCache.get(user.uid);
    } else {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          username = snap.data().username || null;
        }

        /* store in cache */
        if (username) {
          usernameCache.set(user.uid, username);
        }
      } catch (err) {
        console.error("Error fetching username from Firestore:", err);
      }
    }

    const rawName =
      username ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "User");

    const displayName = capitalizeFirstLetter(rawName);

    if (userEmailElement) {
      userEmailElement.innerText = displayName;
    }

    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
      logoutBtn.style.display = "block";
      logoutBtn.innerText = `Logout - ${displayName}`;
    }

    updateCartAccess(user);
  } catch (error) {
    console.error("Error updating auth UI:", error);
  }
}

function updateCartAccess(user) {
  const cartLinks = document.querySelectorAll('a[href="cart.html"]');

  cartLinks.forEach((link) => {
    if (!link.dataset.authGuardBound) {
      link.addEventListener("click", (event) => {
        if (link.dataset.requiresAuth === "true") {
          event.preventDefault();
          window.location.assign("login.html");
        }
      });
      link.dataset.authGuardBound = "true";
    }

    link.dataset.requiresAuth = user ? "false" : "true";
    link.setAttribute("aria-disabled", user ? "false" : "true");
  });
}

/* Product Card Rendering */

export function createProductCard(product, isInCart = false) {
  try {
    const card = document.createElement("div");
    const id = product.id || product.productId || "";
    card.className = "product-card";
    card.dataset.productId = id;

    const imageURL = product.imageURL || product.image || "";
    const name = product.name || "Product";
    const parsedPrice = Number(product.price);
    const price = Number.isFinite(parsedPrice)
      ? parsedPrice.toFixed(2)
      : "0.00";

    const imageMarkup = imageURL
      ? `<img src="${imageURL}" alt="${name}">`
      : `<span>Image unavailable</span>`;

    const buttonLabel = isInCart ? "In Cart" : "Add to Cart";
    const buttonDisabled = isInCart ? "disabled" : "";
    const buttonAria = isInCart ? "aria-disabled=\"true\"" : "aria-disabled=\"false\"";
    const removeVisibilityClass = isInCart ? " product-card__remove-btn--visible" : "";
    const removeTabIndex = isInCart ? "0" : "-1";

    card.innerHTML = `
      <div class="product-card__image">
        ${imageMarkup}
        <button type="button" tabindex="${removeTabIndex}" class="product-card__remove-btn${removeVisibilityClass}" data-product-id="${id}" aria-label="Remove from cart" aria-hidden="${!isInCart}">×</button>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${name}</h3>
        <div class="product-card__meta">
          <span class="product-card__price">R${price}</span>
        </div>
        <div class="cart-btn-wrapper">
          <button type="button" class="add-to-cart-btn${isInCart ? " in-cart" : ""}" data-product-id="${id}" ${buttonDisabled} ${buttonAria}>
            ${buttonLabel}
          </button>
        </div>
      </div>
    `;

    if (isInCart) {
      card.classList.add("in-cart");
    }

    return card;
  } catch (error) {
    console.error("Error creating product card:", error);
    return document.createElement("div");
  }
}

/* Cart Display Utilities */

export function createCartItem(product, quantity) {
  try {
    const item = document.createElement("div");
    item.className = "cart-item";
    item.dataset.productId = product.productId || product.id || "";

    const imageURL = product.imageURL || product.image || "";
    const name = product.name || "Product";
    const parsedPrice = Number(product.price);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0;
    const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
    const totalPrice = (price * qty).toFixed(2);
    const id = product.productId || product.id || "";

    item.innerHTML = `
      <img src="${imageURL}" alt="${name}" class="cart-item__image">
      <div class="cart-item__details">
        <h3 class="cart-item__name">${name}</h3>
      </div>
      <div class="cart-item__quantity">
        <button class="quantity-btn quantity-decrease" data-product-id="${id}">-</button>
        <span class="quantity-value">${qty}</span>
        <button class="quantity-btn quantity-increase" data-product-id="${id}">+</button>
      </div>
      <div class="cart-item__price">R ${totalPrice}</div>
      <button class="cart-item__remove" data-product-id="${id}">&times;</button>
    `;
    return item;
  } catch (error) {
    console.error("Error creating cart item:", error);
    return document.createElement("div");
  }
}

/* Total Price Calculation */

export function updateCartTotal(total) {
  try {
    const totalElements = document.querySelectorAll(
      ".cart-total, .price strong, .total-value, .summary__total-value, .summary__value",
    );

    const subtotal = Number.isFinite(Number(total)) ? Number(total) : 0;
    const deliveryFee = Number.isFinite(Number(selectedDeliveryFee))
      ? Number(selectedDeliveryFee)
      : 0;
    const finalTotal = subtotal + deliveryFee;
    const formattedTotal = finalTotal.toFixed(2);

    totalElements.forEach((el) => {
      if (el) {
        el.innerText = `R ${formattedTotal}`;
      }
    });
  } catch (error) {
    console.error("Error updating cart total:", error);
  }
}

export function calculateTotal(cartItems) {
  try {
    if (!cartItems || typeof cartItems !== "object") {
      return 0;
    }

    return Object.values(cartItems).reduce((sum, item) => {
      const price = Number.isFinite(Number(item?.price))
        ? Number(item.price)
        : 0;
      const quantity = Number.isFinite(Number(item?.quantity))
        ? Number(item.quantity)
        : 0;
      return sum + price * quantity;
    }, 0);
  } catch (error) {
    console.error("Error calculating total:", error);
    return 0;
  }
}

/* Cart Count Display */

export function updateCartCount(count) {
  try {
    const cartCountElements = document.querySelectorAll(".cart-count");
    const validCount = Number.isFinite(Number(count))
      ? Math.max(0, Number(count))
      : 0;

    cartCountElements.forEach((el) => {
      if (el) {
        el.innerText = `${validCount} item${validCount !== 1 ? "s" : ""}`;
      }
    });
  } catch (error) {
    console.error("Error updating cart count:", error);
  }
}

/* Loading/Error States */

export function showLoading(element) {
  try {
    if (element) {
      element.innerHTML = "<p>Loading...</p>";
    }
  } catch (error) {
    console.error("Error showing loading state:", error);
  }
}

export function showError(element, message) {
  try {
    if (element && message) {
      element.innerHTML = `<p class="error">${message}</p>`;
    }
  } catch (error) {
    console.error("Error showing error state:", error);
  }
}

/* Generic DOM Update */

export function updateElement(selector, content) {
  try {
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = content;
    }
  } catch (error) {
    console.error("Error updating element:", error);
  }
}

initAuthUI();
