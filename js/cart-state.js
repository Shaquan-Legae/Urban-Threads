// cart-state.js - Shared auth/cart snapshot state (single listener per page)

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, authPersistenceReady, db } from "./firebase.js";

const stateListeners = new Set();
const authReadyWaiters = [];

let authUnsubscribe = null;
let cartUnsubscribe = null;
let startPromise = null;

const state = {
  user: null,
  items: {},
  loading: true,
  error: "",
  authResolved: false
};

function emitState() {
  const snapshot = getCartState();
  stateListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("Cart state listener failed:", error);
    }
  });
}

function resolveAuthReadyWaiters() {
  while (authReadyWaiters.length > 0) {
    const resolve = authReadyWaiters.shift();
    resolve();
  }
}

function normalizeCartDoc(docSnap) {
  const data = docSnap.data() || {};
  const productId = data.productId || docSnap.id;

  return {
    productId,
    name: data.name || "Product",
    price: Number.isFinite(Number(data.price)) ? Number(data.price) : 0,
    quantity: Number.isFinite(Number(data.quantity)) ? Number(data.quantity) : 1,
    imageURL: data.imageURL || ""
  };
}

function cartCollection(uid) {
  return collection(db, `users/${uid}/cart`);
}

function cartDoc(uid, productId) {
  return doc(db, `users/${uid}/cart`, productId);
}

function resubscribeUserCart(uid) {
  if (typeof cartUnsubscribe === "function") {
    cartUnsubscribe();
  }
  cartUnsubscribe = null;

  if (!uid) {
    state.items = {};
    state.loading = false;
    state.error = "";
    emitState();
    return;
  }

  state.loading = true;
  state.error = "";
  emitState();

  cartUnsubscribe = onSnapshot(
    cartCollection(uid),
    (snapshot) => {
      const nextItems = {};
      snapshot.forEach((docSnap) => {
        const item = normalizeCartDoc(docSnap);
        nextItems[item.productId] = item;
      });

      state.items = nextItems;
      state.loading = false;
      state.error = "";
      emitState();
    },
    (error) => {
      console.error("Cart snapshot failed:", error);
      state.error = "Unable to load your cart right now.";
      state.loading = false;
      emitState();
    }
  );
}

export async function startCartState() {
  if (startPromise) {
    return startPromise;
  }

  startPromise = (async () => {
    await authPersistenceReady;

    if (typeof authUnsubscribe === "function") {
      authUnsubscribe();
    }

    authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        state.user = user || null;
        state.authResolved = true;
        resolveAuthReadyWaiters();
        resubscribeUserCart(user?.uid || "");
      },
      (error) => {
        console.error("Auth listener failed:", error);
        state.user = null;
        state.authResolved = true;
        state.loading = false;
        state.items = {};
        state.error = "Unable to verify your session right now.";
        resolveAuthReadyWaiters();
        emitState();
      }
    );
  })();

  return startPromise;
}

export async function waitForAuthState() {
  await startCartState();

  if (state.authResolved) {
    return;
  }

  await new Promise((resolve) => {
    authReadyWaiters.push(resolve);
  });
}

export function getCartState() {
  return {
    user: state.user,
    items: { ...state.items },
    loading: state.loading,
    error: state.error,
    authResolved: state.authResolved
  };
}

export function subscribeCartState(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  stateListeners.add(listener);
  listener(getCartState());
  startCartState();

  return () => {
    stateListeners.delete(listener);
  };
}

function ensureAuthenticatedUser() {
  if (!state.user) {
    throw new Error("AUTH_REQUIRED");
  }
  return state.user;
}

export async function addProductToCart(product, quantity = 1) {
  await waitForAuthState();
  const user = ensureAuthenticatedUser();

  const productId = product?.productId || product?.id;
  if (!productId) {
    throw new Error("Product id is required.");
  }

  const safeQuantity = Number.isFinite(Number(quantity)) ? Math.max(1, Number(quantity)) : 1;
  const targetDoc = cartDoc(user.uid, productId);

  const existing = await getDoc(targetDoc);
  const existingQuantity = existing.exists()
    ? Number(existing.data().quantity || 0)
    : 0;

  await setDoc(
    targetDoc,
    {
      productId,
      name: product.name || "Product",
      price: Number.isFinite(Number(product.price)) ? Number(product.price) : 0,
      quantity: existingQuantity + safeQuantity,
      imageURL: product.imageURL || product.image || ""
    },
    { merge: true }
  );
}

export async function removeCartProduct(productId) {
  await waitForAuthState();
  const user = ensureAuthenticatedUser();

  if (!productId) {
    return;
  }

  await deleteDoc(cartDoc(user.uid, productId));
}

export async function setCartProductQuantity(productId, quantity) {
  await waitForAuthState();
  const user = ensureAuthenticatedUser();

  if (!productId) {
    return;
  }

  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    await deleteDoc(cartDoc(user.uid, productId));
    return;
  }

  await updateDoc(cartDoc(user.uid, productId), { quantity: nextQuantity });
}

export function getCartItemCount(itemsMap = state.items) {
  return Object.values(itemsMap).reduce((sum, item) => {
    const quantity = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 0;
    return sum + quantity;
  }, 0);
}

export function getCartTotal(itemsMap = state.items) {
  return Object.values(itemsMap).reduce((sum, item) => {
    const price = Number.isFinite(Number(item?.price)) ? Number(item.price) : 0;
    const quantity = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 0;
    return sum + (price * quantity);
  }, 0);
}
