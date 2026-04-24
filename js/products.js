/* products.js */

import { addToCart, removeFromCart } from "./cart.js";
import { createProductCard, showError, showLoading } from "./ui.js";
import { subscribeCartState } from "./cart-state.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

const productsContainer = document.querySelector(".products-section");
const shopLayout = document.querySelector(".shop-layout");
const searchInput = document.querySelector(".shop-widget--search input");
const categoryLinks = document.querySelectorAll(".shop-widget__list a");
const categoryResetButton = document.querySelector(".shop-widget__header .shop-widget__toggle");

let allProducts = [];
let filteredProducts = [];
let selectedCategory = "All";
let searchTerm = "";
let addToCartBound = false;
let listenersBound = false;
let currentCartItems = {};
let currentUser = null;

function mountProductsSection() {
  if (!productsContainer || !shopLayout) {
    return;
  }

  if (productsContainer.parentElement !== shopLayout) {
    shopLayout.appendChild(productsContainer);
  }
}

/* fetch products */
export async function fetchProducts() {
  if (!productsContainer) {
    return;
  }

  try {
    showLoading(productsContainer);

    const snapshot = await getDocs(collection(db, "products"));

    const products = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};

      products.push({
        id: docSnap.id,
        name: data.name || "Product",
        price: Number(data.price) || 0,
        category: data.category || "",
        imageURL: data.imageURL || ""
      });
    });

    allProducts = products;
    filteredProducts = [...allProducts];

    renderProducts();
  } catch (error) {
    console.error("error fetching products:", error);
    showError(productsContainer, "failed to load products");
  }
}

/* render */
export function renderProducts() {
  if (!productsContainer) {
    return;
  }

  productsContainer.innerHTML = "";

  if (!filteredProducts.length) {
    productsContainer.innerHTML = "<p>No products found</p>";
    return;
  }

  filteredProducts.forEach((product) => {
    try {
      const productId = product.id || product.productId || "";
      const inCart = Boolean(productId && currentCartItems[productId]);
      const card = createProductCard(product, inCart);
      if (card) {
        productsContainer.appendChild(card);
      }
    } catch (error) {
      console.error("skipped malformed product:", error);
    }
  });

  attachAddToCartListener();
}

/* filters */
export function filterByCategory(category) {
  selectedCategory = category || "All";
  applyFilters();
}

export function filterBySearch(term) {
  searchTerm = (term || "").toLowerCase().trim();
  applyFilters();
}

function applyFilters() {
  filteredProducts = allProducts.filter((product) => {
    const categoryMatch =
      selectedCategory === "All" ||
      String(product.category || "").toLowerCase() === selectedCategory.toLowerCase();

    const searchMatch =
      !searchTerm ||
      String(product.name || "").toLowerCase().includes(searchTerm);

    return categoryMatch && searchMatch;
  });

  renderProducts();
}

/* add to cart */
function updateProductCardState(card) {
  if (!card) {
    return;
  }

  const productId = card.dataset.productId || "";
  const inCart = Boolean(productId && currentCartItems[productId]);
  const addBtn = card.querySelector(".add-to-cart-btn");
  const removeBtn = card.querySelector(".product-card__remove-btn");

  if (inCart) {
    card.classList.add("in-cart");
    if (addBtn) {
      addBtn.textContent = "In Cart";
      addBtn.disabled = true;
      addBtn.classList.add("in-cart");
      addBtn.setAttribute("aria-disabled", "true");
    }
    if (removeBtn) {
      removeBtn.classList.add("product-card__remove-btn--visible");
      removeBtn.setAttribute("aria-hidden", "false");
      removeBtn.tabIndex = 0;
    }
    return;
  }

  card.classList.remove("in-cart");
  if (addBtn) {
    addBtn.textContent = "Add to Cart";
    addBtn.disabled = false;
    addBtn.classList.remove("in-cart");
    addBtn.setAttribute("aria-disabled", "false");
  }
  if (removeBtn) {
    removeBtn.classList.remove("product-card__remove-btn--visible");
    removeBtn.setAttribute("aria-hidden", "true");
    removeBtn.tabIndex = -1;
  }
}

function refreshProductCardStates() {
  if (!productsContainer) {
    return;
  }

  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => updateProductCardState(card));
}

function attachAddToCartListener() {
  if (!productsContainer || addToCartBound) {
    return;
  }

  productsContainer.addEventListener("click", async (event) => {
    const removeBtn = event.target.closest(".product-card__remove-btn");
    if (removeBtn) {
      const productId = removeBtn.dataset.productId;
      if (!productId) {
        return;
      }

      removeBtn.disabled = true;
      try {
        await removeFromCart(productId);
      } catch (error) {
        console.error("Remove from cart failed:", error);
      } finally {
        removeBtn.disabled = false;
      }
      return;
    }

    const addBtn = event.target.closest(".add-to-cart-btn");
    if (!addBtn) {
      return;
    }

    const productId = addBtn.dataset.productId;
    if (!productId) {
      return;
    }

    if (!currentUser) {
      window.location.assign("login.html");
      return;
    }

    const product = allProducts.find((p) => (p.id || p.productId) === productId);
    if (!product) {
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    const added = await addToCart(product, 1);
    if (!added) {
      addBtn.textContent = "Add to Cart";
      addBtn.disabled = false;
      return;
    }

    addBtn.textContent = "In Cart";
    addBtn.classList.add("in-cart");
  });

  addToCartBound = true;
}

/* category filters */
export function attachCategoryFilterListeners() {
  if (!categoryLinks.length) {
    return;
  }

  categoryLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      categoryLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const category = (link.textContent || "").split(" ")[0] || "All";
      filterByCategory(category);
    });
  });

  if (categoryResetButton) {
    categoryResetButton.addEventListener("click", () => {
      selectedCategory = "All";
      categoryLinks.forEach((l) => l.classList.remove("active"));
      categoryLinks[0]?.classList.add("active");
      applyFilters();
    });
  }
}

/* search */
export function attachSearchListener() {
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", (e) => {
    filterBySearch(e.target.value);
  });
}

/* init */
export function initProductsPage() {
  if (!productsContainer) {
    return;
  }

  mountProductsSection();

  subscribeCartState((state) => {
    currentUser = state.user;
    currentCartItems = state.items || {};
    refreshProductCardStates();
  });

  fetchProducts();

  if (!listenersBound) {
    attachCategoryFilterListeners();
    attachSearchListener();
    listenersBound = true;
  }
}

initProductsPage();
