const API_BASE = "https://dummyjson.com/products";
const CART_KEY = "shopgrid_cart";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countNode = document.getElementById("cartCount");
  if (!countNode) return;
  const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
  countNode.textContent = totalItems;
}

function getDiscountedPrice(product) {
  const discount = product.discountPercentage || 0;
  return product.price - (product.price * discount / 100);
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      brand: product.brand || "No brand",
      category: product.category,
      price: product.price,
      discountPercentage: product.discountPercentage || 0,
      thumbnail: product.thumbnail,
      quantity
    });
  }

  saveCart(cart);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to load data");
  }
  return response.json();
}

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <a href="product.html?id=${product.id}" aria-label="View ${product.title}">
      <img class="product-image" src="${product.thumbnail}" alt="${product.title}">
    </a>
    <div class="product-body">
      <div class="product-meta">
        <span>${product.category}</span>
        <span>${product.brand || "No brand"}</span>
      </div>
      <h2 class="product-title">${product.title}</h2>
      <div class="rating-line">
        <span class="rating">Rating ${product.rating}</span>
        <span>${product.stock} left</span>
      </div>
      <div class="price-line">
        <span class="price">${money.format(product.price)}</span>
        <span class="discount">${product.discountPercentage}% off</span>
      </div>
      <div class="card-actions">
        <a class="secondary-button" href="product.html?id=${product.id}">Details</a>
        <button class="primary-button" type="button" data-add="${product.id}">Add</button>
      </div>
    </div>
  `;
  article.querySelector("[data-add]").addEventListener("click", () => {
    addToCart(product);
    article.querySelector("[data-add]").textContent = "Added";
    setTimeout(() => {
      article.querySelector("[data-add]").textContent = "Add";
    }, 900);
  });
  return article;
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");

  grid.innerHTML = "";
  products.forEach((product) => grid.appendChild(productCard(product)));
  emptyState.classList.toggle("hidden", products.length > 0);
  resultCount.textContent = `${products.length} product${products.length === 1 ? "" : "s"} found`;
}

function applyProductFilters(products) {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const sort = document.getElementById("sortSelect").value;

  let filtered = products.filter((product) => {
    const text = `${product.title} ${product.brand || ""} ${product.category}`.toLowerCase();
    const matchesSearch = text.includes(search);
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "priceLow") return a.price - b.price;
    if (sort === "priceHigh") return b.price - a.price;
    if (sort === "ratingHigh") return b.rating - a.rating;
    return a.id - b.id;
  });

  renderProducts(filtered);
}

async function initListingPage() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  try {
    const data = await fetchJson(`${API_BASE}?limit=194`);
    const products = data.products || [];
    const categories = [...new Set(products.map((product) => product.category))].sort();
    const categoryFilter = document.getElementById("categoryFilter");

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    ["searchInput", "categoryFilter", "sortSelect"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => applyProductFilters(products));
    });

    renderProducts(products);
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">Products could not be loaded. Please try again later.</p>`;
    document.getElementById("resultCount").textContent = "Unable to load products";
  }
}

function detailTemplate(product) {
  const images = product.images && product.images.length ? product.images : [product.thumbnail];
  return `
    <div class="details-media">
      <img src="${images[0]}" alt="${product.title}">
      <div class="thumb-strip">
        ${images.slice(0, 5).map((image) => `<img src="${image}" alt="${product.title} image">`).join("")}
      </div>
    </div>
    <article class="details-info">
      <p class="eyebrow">${product.category}</p>
      <h1>${product.title}</h1>
      <p class="description">${product.description}</p>
      <div class="price-line">
        <span class="price">${money.format(product.price)}</span>
        <span class="discount">${product.discountPercentage}% off</span>
      </div>
      <div class="spec-grid">
        <div class="spec"><span>Brand</span>${product.brand || "No brand"}</div>
        <div class="spec"><span>Rating</span>${product.rating}</div>
        <div class="spec"><span>Stock</span>${product.stock} units</div>
        <div class="spec"><span>Warranty</span>${product.warrantyInformation || "Standard"}</div>
        <div class="spec"><span>Shipping</span>${product.shippingInformation || "Available"}</div>
        <div class="spec"><span>Availability</span>${product.availabilityStatus || "In stock"}</div>
      </div>
      <div class="quantity-picker">
        <label for="quantityInput">Quantity</label>
        <input id="quantityInput" type="number" min="1" max="${Math.max(product.stock, 1)}" value="1">
      </div>
      <button id="addDetailBtn" class="primary-button full-width" type="button">Add to Cart</button>
    </article>
  `;
}

async function initProductPage() {
  const details = document.getElementById("productDetails");
  if (!details) return;

  const productId = new URLSearchParams(window.location.search).get("id") || "1";

  try {
    const product = await fetchJson(`${API_BASE}/${productId}`);
    details.innerHTML = detailTemplate(product);
    document.getElementById("addDetailBtn").addEventListener("click", () => {
      const quantity = Math.max(1, Number(document.getElementById("quantityInput").value) || 1);
      addToCart(product, quantity);
      document.getElementById("addDetailBtn").textContent = "Added to Cart";
      setTimeout(() => {
        document.getElementById("addDetailBtn").textContent = "Add to Cart";
      }, 900);
    });
  } catch (error) {
    details.innerHTML = `<div class="loading-card">Product details could not be loaded.</div>`;
  }
}

function setCartQuantity(productId, quantity) {
  const cart = getCart()
    .map((item) => item.id === productId ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);
  saveCart(cart);
  renderCartPage();
}

function removeCartItem(productId) {
  saveCart(getCart().filter((item) => item.id !== productId));
  renderCartPage();
}

function renderCartPage() {
  const cartItems = document.getElementById("cartItems");
  if (!cartItems) return;

  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = cart.reduce((sum, item) => {
    return sum + (item.price * item.discountPercentage / 100) * item.quantity;
  }, 0);
  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * 0.08;
  const shipping = cart.length ? (discountedSubtotal >= 100 ? 0 : 9.99) : 0;
  const grandTotal = discountedSubtotal + tax + shipping;

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="empty-state">
        Your cart is empty.
        <br>
        <a class="primary-button" href="index.html">Browse Products</a>
      </div>
    `;
  } else {
    cartItems.innerHTML = "";
    cart.forEach((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${item.thumbnail}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p class="product-meta">${item.brand} · ${item.category}</p>
          <p>${money.format(item.price)} each · ${item.discountPercentage}% off</p>
          <div class="cart-controls">
            <button class="icon-button" type="button" data-decrease="${item.id}" aria-label="Decrease quantity">-</button>
            <strong>${item.quantity}</strong>
            <button class="icon-button" type="button" data-increase="${item.id}" aria-label="Increase quantity">+</button>
            <button class="remove-button" type="button" data-remove="${item.id}">Remove</button>
          </div>
        </div>
        <div class="line-total">${money.format(getDiscountedPrice(item) * item.quantity)}</div>
      `;
      cartItems.appendChild(row);
    });
  }

  document.getElementById("subtotal").textContent = money.format(subtotal);
  document.getElementById("discount").textContent = `-${money.format(discount)}`;
  document.getElementById("tax").textContent = money.format(tax);
  document.getElementById("shipping").textContent = shipping ? money.format(shipping) : "Free";
  document.getElementById("grandTotal").textContent = money.format(grandTotal);

  cartItems.querySelectorAll("[data-decrease]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = getCart().find((cartItem) => cartItem.id === Number(button.dataset.decrease));
      if (item) setCartQuantity(item.id, item.quantity - 1);
    });
  });

  cartItems.querySelectorAll("[data-increase]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = getCart().find((cartItem) => cartItem.id === Number(button.dataset.increase));
      if (item) setCartQuantity(item.id, item.quantity + 1);
    });
  });

  cartItems.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeCartItem(Number(button.dataset.remove)));
  });
}

function initCartPage() {
  const clearCartBtn = document.getElementById("clearCartBtn");
  if (!clearCartBtn) return;

  clearCartBtn.addEventListener("click", () => {
    saveCart([]);
    renderCartPage();
  });
  renderCartPage();
}

updateCartCount();
initListingPage();
initProductPage();
initCartPage();
