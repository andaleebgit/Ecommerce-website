const appRoot = document.querySelector('#app');
const cartKey = 'verdant-cart-v1';
const themeKey = 'verdant-theme-v1';
let allProducts = [];
let currentUser = null;
let activeFilter = 'All products';
let searchTerm = '';
let sortMode = 'featured';
let toastTimeout;

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-theme', isDark);
  const toggle = document.querySelector('.theme-toggle');
  const icon = document.querySelector('.theme-icon');
  if (toggle && icon) {
    icon.textContent = isDark ? '☾' : '☀';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  localStorage.setItem(themeKey, theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem(themeKey);
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (preferredDark ? 'dark' : 'light');
  applyTheme(initialTheme);
}

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey) || '[]');
    return Array.isArray(value) ? value.filter(item => typeof item.id === 'string' && Number.isInteger(item.quantity)) : [];
  } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateBagCount();
}
function updateBagCount() {
  const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector('.bag-count').textContent = count;
}
function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function notify(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2800);
}
function route() {
  const path = location.hash.replace(/^#/, '') || '/shop';
  const [pathname, query = ''] = path.split('?');
  return { pathname, params: new URLSearchParams(query) };
}
function setNav(path) {
  const navKey = path.startsWith('/shop') || path.startsWith('/product/') ? 'shop' : path.startsWith('/about') ? 'about' : path.startsWith('/account') ? 'account' : '';
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === navKey) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function addToCart(id, quantity = 1) {
  const cart = readCart();
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
  else cart.push({ id, quantity: Math.min(10, quantity) });
  saveCart(cart);
  const product = allProducts.find(item => item.id === id);
  notify(`${product?.name || 'Product'} added to your bag`);
}
function productCard(product, index) {
  return `<article class="product-card" style="animation-delay:${Math.min(index * 55, 275)}ms">
    <a class="product-visual" href="#/product/${encodeURIComponent(product.id)}" aria-label="View ${esc(product.name)}">
      <img src="${esc(product.image)}" alt="A finished interior featuring ${esc(product.name)} paint" loading="lazy">
      <span class="product-swatch" style="background:${esc(product.hex)}"></span>
      ${product.featured ? '<span class="product-tag">A HOUSE FAVOURITE</span>' : ''}
    </a>
    <div class="product-info"><div class="product-topline"><h3 class="product-name">${esc(product.name)}</h3><span class="product-price">${money(product.price)}</span></div>
    <p class="product-sub">${esc(product.colour)} · ${esc(product.finish)} · ${esc(product.size)}</p>
    <div class="product-actions"><a class="text-link" href="#/product/${encodeURIComponent(product.id)}">View colour</a><button class="add-button" data-add="${esc(product.id)}" ${product.stock < 1 ? 'disabled' : ''}>${product.stock < 1 ? 'Sold out' : 'Add to bag +'}</button></div></div>
  </article>`;
}
function renderShop() {
  const categories = ['All products', 'Interior', 'Exterior', 'Preparation'];
  const counts = Object.fromEntries(categories.map(category => [category, category === 'All products' ? allProducts.length : allProducts.filter(item => item.category === category).length]));
  appRoot.innerHTML = `<section class="shop-hero"><div class="hero-copy"><p class="eyebrow">The considered colour collection</p><h1>Colour for a life well lived.</h1><p>Thoughtful shades, beautifully made. Discover richly pigmented paints and dependable finishes for every room and the spaces beyond.</p><a class="button button-coral" href="#collection">Shop the collection <span aria-hidden="true">→</span></a></div><div class="hero-image" role="img" aria-label="Sunlit contemporary living room in natural colours"><span class="hero-stamp">Made for<br>the long<br>view</span></div></section>
  <section class="wrap" id="collection"><div class="collection-bar"><div><p class="eyebrow">A thoughtful palette</p><h2>The collection</h2><p>Colour with a little more meaning.</p></div><div class="collection-controls"><input class="search-field" id="product-search" type="search" placeholder="Search colours" aria-label="Search colours"><select class="select-field" id="sort-products" aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A to Z</option></select></div></div>
  <div class="shop-layout"><aside class="filter-rail" aria-label="Filter products"><p class="filter-heading">Shop by finish</p><ul class="filter-list">${categories.map(category => `<li><button class="filter-button ${activeFilter === category ? 'active' : ''}" data-filter="${esc(category)}">${esc(category)}<span class="filter-count">${counts[category]}</span></button></li>`).join('')}</ul><p class="filter-note">Need a little guidance?<br><a class="text-link" href="mailto:hello@verdantandco.example">Talk to our colour team</a></p></aside><div class="product-grid" id="product-grid"></div></div></section>`;
  document.querySelector('#product-search').value = searchTerm;
  document.querySelector('#sort-products').value = sortMode;
  renderProductGrid();
}
function renderProductGrid() {
  const grid = document.querySelector('#product-grid');
  if (!grid) return;
  let matches = allProducts.filter(product => (activeFilter === 'All products' || product.category === activeFilter)
    && `${product.name} ${product.colour} ${product.finish} ${product.category}`.toLowerCase().includes(searchTerm.toLowerCase()));
  if (sortMode === 'price-low') matches.sort((a, b) => a.price - b.price);
  if (sortMode === 'price-high') matches.sort((a, b) => b.price - a.price);
  if (sortMode === 'name') matches.sort((a, b) => a.name.localeCompare(b.name));
  grid.innerHTML = matches.length ? matches.map(productCard).join('') : '<p class="empty-results">No colours match that search. Try another shade or category.</p>';
}
function renderDetail(id) {
  const product = allProducts.find(item => item.id === id);
  if (!product) {
    appRoot.innerHTML = '<div class="wrap page-intro"><p class="eyebrow">Colour not found</p><h1>That shade has moved on.</h1><a class="text-link" href="#/shop">Return to the collection</a></div>';
    return;
  }
  appRoot.innerHTML = `<section class="wrap product-detail"><div class="detail-image"><img src="${esc(product.image)}" alt="Interior styled with ${esc(product.name)} paint"></div><div class="detail-copy"><p class="breadcrumb"><a href="#/shop">Shop</a> &nbsp;/&nbsp; ${esc(product.collection)}</p><p class="eyebrow">${esc(product.category)} · ${esc(product.finish)}</p><h1>${esc(product.name)}</h1><p class="detail-color"><span class="product-swatch" style="position:static;display:inline-block;vertical-align:middle;margin-right:8px;background:${esc(product.hex)}"></span>${esc(product.colour)}</p><p class="detail-price">${money(product.price)} <span style="font-size:11px;font-weight:400;color:var(--muted)">/ ${esc(product.size)}</span></p><p class="detail-description">${esc(product.description)}</p><div class="spec-list"><div class="spec"><span>Finish</span><strong>${esc(product.finish)}</strong></div><div class="spec"><span>Size</span><strong>${esc(product.size)}</strong></div><div class="spec"><span>Coverage</span><strong>${esc(product.coverage)}</strong></div><div class="spec"><span>Availability</span><strong>${product.stock ? `${product.stock} in stock` : 'Currently sold out'}</strong></div></div><div class="quantity-row"><div class="quantity-control"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input id="detail-quantity" type="number" value="1" min="1" max="10" aria-label="Quantity"><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div><button class="button" data-detail-add="${esc(product.id)}" ${product.stock < 1 ? 'disabled' : ''}>Add to bag <span aria-hidden="true">→</span></button></div><p class="delivery-hint">Complimentary delivery over $75. Secure checkout.</p></div></section>`;
}
function cartDetails() {
  return readCart().map(item => ({ ...item, product: allProducts.find(product => product.id === item.id) })).filter(item => item.product);
}
function renderOrder() {
  const cart = cartDetails();
  if (!cart.length) {
    appRoot.innerHTML = `<section class="wrap page-intro"><p class="eyebrow">Your bag</p><h1>A fresh start.</h1><p>Your bag is waiting for a little colour.</p><a class="button" href="#/shop">Explore the collection <span aria-hidden="true">→</span></a></section>`;
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal >= 75 ? 0 : 9.95;
  const tax = Math.round(subtotal * .08 * 100) / 100;
  const total = subtotal + shipping + tax;
  appRoot.innerHTML = `<section class="wrap"><div class="page-intro"><p class="eyebrow">Your bag · ${cart.reduce((sum, item) => sum + item.quantity, 0)} items</p><h1>Make it yours.</h1><p>Good things are on their way.</p></div><div id="order-alert"></div><div class="checkout-layout"><div><h2 class="section-label">Your selection</h2><div class="basket-lines">${cart.map(item => `<article class="basket-line"><img src="${esc(item.product.image)}" alt="" loading="lazy"><div><h3>${esc(item.product.name)}</h3><p>${esc(item.product.colour)} · ${esc(item.product.size)}</p><div class="basket-line-controls"><button data-cart-qty="-1" data-id="${esc(item.id)}" aria-label="Remove one ${esc(item.product.name)}">−</button><span>${item.quantity}</span><button data-cart-qty="1" data-id="${esc(item.id)}" aria-label="Add one ${esc(item.product.name)}">+</button><button data-remove="${esc(item.id)}">Remove</button></div></div><span class="basket-line-total">${money(item.product.price * item.quantity)}</span></article>`).join('')}</div>
  ${currentUser ? `<form class="checkout-form" id="checkout-form"><h2 class="form-title">Delivery details</h2><p class="form-error" id="checkout-error"></p><div class="field full"><label for="recipient">Full name</label><input id="recipient" name="recipient" autocomplete="name" required maxlength="120" value="${esc(currentUser.name)}"></div><div class="field full"><label for="address">Street address</label><input id="address" name="address" autocomplete="street-address" required maxlength="120"></div><div class="field"><label for="city">City</label><input id="city" name="city" autocomplete="address-level2" required maxlength="120"></div><div class="field"><label for="postcode">ZIP / postal code</label><input id="postcode" name="postcode" autocomplete="postal-code" required maxlength="120"></div><button class="button checkout-submit" type="submit">Place order · ${money(total)} <span aria-hidden="true">→</span></button></form>` : `<div class="checkout-form"><h2 class="form-title">Ready when you are</h2><p class="form-error"></p><p class="field full" style="color:var(--muted);font-size:12px">Sign in or create an account to add delivery details and place your order.</p><a class="button checkout-submit" href="#/account?next=order">Sign in to continue <span aria-hidden="true">→</span></a></div>`}</div>
  <aside class="order-summary"><h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Delivery</span><span>${shipping ? money(shipping) : 'Complimentary'}</span></div><div class="summary-row"><span>Estimated tax</span><span>${money(tax)}</span></div><div class="summary-row summary-total"><span>Total</span><span>${money(total)}</span></div><p class="summary-small">${shipping ? `You are ${money(75 - subtotal)} away from complimentary delivery.` : 'Complimentary delivery applied.'} Tax is estimated at 8%.</p></aside></div></section>`;
}
function renderAccount(mode = 'login') {
  if (currentUser) {
    appRoot.innerHTML = `<section class="wrap account-wrap"><div class="account-aside"><p class="eyebrow">Your account</p><h1>A little more colour, a little less to remember.</h1><p>Keep your favourite shades and delivery details close at hand.</p></div><div class="account-form-wrap"><div class="account-head"><div><p class="eyebrow">Welcome back</p><h2>${esc(currentUser.name)}</h2><p>${esc(currentUser.email)}</p></div><button id="logout-button" class="button button-light" type="button">Sign out</button></div><div class="account-orders" id="account-orders"><p>Loading your orders…</p></div></div></section>`;
    loadOrders();
    return;
  }
  const signup = mode === 'signup';
  appRoot.innerHTML = `<section class="wrap account-wrap"><div class="account-aside"><p class="eyebrow">A considered home, starts here</p><h1>Good colour is worth coming back to.</h1><p>Create an account to keep track of orders and bring your next project a little closer.</p></div><div class="account-form-wrap"><p class="eyebrow">A place of your own</p><h2>${signup ? 'Create your account' : 'Welcome back'}</h2><p>${signup ? 'A few details and you are all set.' : 'Sign in to see your orders and continue to checkout.'}</p><div class="form-tabs" role="tablist"><button class="form-tab ${!signup ? 'active' : ''}" data-account-mode="login" role="tab" aria-selected="${!signup}">Sign in</button><button class="form-tab ${signup ? 'active' : ''}" data-account-mode="signup" role="tab" aria-selected="${signup}">Create account</button></div><form class="account-form" id="account-form" data-mode="${signup ? 'signup' : 'login'}"><p class="account-note" id="account-error"></p>${signup ? '<div class="field"><label for="account-name">Your name</label><input id="account-name" name="name" autocomplete="name" required minlength="2" maxlength="80"></div>' : ''}<div class="field"><label for="account-email">Email address</label><input id="account-email" name="email" type="email" autocomplete="email" required maxlength="254"></div><div class="field"><label for="account-password">Password</label><input id="account-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" required></div><button class="button" type="submit">${signup ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span></button></form></div></section>`;
}
function renderAbout() {
  appRoot.innerHTML = `<section class="about-hero"><div class="about-copy"><p class="eyebrow">Colour, considered</p><h1>Made with care. Meant to be lived in.</h1><p>We believe colour is more than what you see. It is the feeling of coming home, the warmth of a familiar room, the beginning of a new idea.</p></div><div class="about-image" role="img" aria-label="A thoughtfully designed home filled with natural light"></div></section><section class="wrap"><div class="values-row"><article class="value"><p class="eyebrow">01 / Formulation</p><h2>Better by nature</h2><p>Our water-based paints are low in odour and made with carefully selected ingredients, for a more considered finish indoors.</p></article><article class="value"><p class="eyebrow">02 / Colour</p><h2>Quietly distinctive</h2><p>Every shade begins with the character of a real place and is tested in changing light, across the rooms where life happens.</p></article><article class="value"><p class="eyebrow">03 / Craft</p><h2>Made to last</h2><p>Thoughtful pigments, dependable coverage, and finishes designed to hold their beauty through everyday living.</p></article></div><div class="story-band"><div><p class="eyebrow">A note from our studio</p><h2>For the rooms that hold your life.</h2></div><div><p>Verdant & Co. began with a simple question: what if choosing paint felt less like a chore and more like the start of something? We built a small, considered palette that works beautifully in real homes, paired with practical products that make the work feel good too.</p><p>We are an independent colour studio, bringing together design-minded shades and dependable trade essentials. Every tin is a small invitation to make a space your own.</p><a class="text-link" href="#/shop">Find your colour →</a></div></div></section>`;
}
async function loadOrders() {
  const holder = document.querySelector('#account-orders');
  if (!holder) return;
  try {
    const orders = await api('/api/orders');
    holder.innerHTML = `<h2>Your orders</h2>${orders.length ? orders.map(order => `<article class="order-card"><div><strong>Order ${esc(order.id.slice(0, 8).toUpperCase())}</strong><p>${new Date(`${order.created_at.replace(' ', 'T')}Z`).toLocaleDateString()} · ${order.items.map(item => `${esc(item.name)} × ${item.quantity}`).join(', ')}</p><p>Delivering to ${esc(order.recipient)}, ${esc(order.city)} ${esc(order.postcode)}</p></div><div><span class="order-status">${esc(order.status)}</span><p>${money(order.total)}</p></div></article>`).join('') : '<p>You have no orders yet. Your first colour story is waiting.</p><a class="text-link" href="#/shop">Explore the collection →</a>'}`;
  } catch (error) { holder.innerHTML = `<p class="form-error">${esc(error.message)}</p>`; }
}
async function render() {
  const { pathname, params } = route();
  setNav(pathname);
  if (pathname.startsWith('/product/')) renderDetail(decodeURIComponent(pathname.slice('/product/'.length)));
  else if (pathname === '/order') renderOrder();
  else if (pathname === '/account') renderAccount(params.get('mode') || 'login');
  else if (pathname === '/about') renderAbout();
  else renderShop();
  updateBagCount();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

appRoot.addEventListener('click', async event => {
  const add = event.target.closest('[data-add]');
  if (add) addToCart(add.dataset.add);
  const detailAdd = event.target.closest('[data-detail-add]');
  if (detailAdd) {
    const quantityInput = document.querySelector('#detail-quantity');
    addToCart(detailAdd.dataset.detailAdd, Math.max(1, Math.min(10, Number(quantityInput.value) || 1)));
  }
  const quantityButton = event.target.closest('[data-qty]');
  if (quantityButton) {
    const input = document.querySelector('#detail-quantity');
    input.value = Math.max(1, Math.min(10, (Number(input.value) || 1) + Number(quantityButton.dataset.qty)));
  }
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    activeFilter = filter.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(button => button.classList.toggle('active', button === filter));
    renderProductGrid();
  }
  const tab = event.target.closest('[data-account-mode]');
  if (tab) renderAccount(tab.dataset.accountMode);
  const cartQuantity = event.target.closest('[data-cart-qty]');
  if (cartQuantity) {
    const cart = readCart();
    const entry = cart.find(item => item.id === cartQuantity.dataset.id);
    if (entry) {
      const nextQuantity = entry.quantity + Number(cartQuantity.dataset.cartQty);
      if (nextQuantity > 10) {
        notify('Maximum quantity per product is 10');
        return;
      }
      entry.quantity = nextQuantity;
    }
    saveCart(cart.filter(item => item.quantity > 0));
    renderOrder();
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) {
    saveCart(readCart().filter(item => item.id !== remove.dataset.remove));
    renderOrder();
  }
  if (event.target.closest('#logout-button')) {
    try { await api('/api/logout', { method: 'POST' }); currentUser = null; notify('You have signed out'); renderAccount(); }
    catch (error) { notify(error.message); }
  }
});
appRoot.addEventListener('input', event => {
  if (event.target.id === 'product-search') {
    searchTerm = event.target.value;
    renderProductGrid();
  }
});
appRoot.addEventListener('change', event => {
  if (event.target.id === 'sort-products') {
    sortMode = event.target.value;
    renderProductGrid();
  }
});
appRoot.addEventListener('submit', async event => {
  if (event.target.id === 'account-form') {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form));
    const isSignup = form.dataset.mode === 'signup';
    const errorNode = document.querySelector('#account-error');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    errorNode.textContent = '';
    try {
      const data = await api(isSignup ? '/api/register' : '/api/login', { method: 'POST', body: JSON.stringify(values) });
      currentUser = data.user;
      notify(isSignup ? 'Welcome to Verdant & Co.' : 'Welcome back');
      const { params } = route();
      if (params.get('next') === 'order') location.hash = '#/order';
      else renderAccount();
    } catch (error) { errorNode.textContent = error.message; }
    finally { submit.disabled = false; }
  }
  if (event.target.id === 'checkout-form') {
    event.preventDefault();
    const form = event.target;
    const errorNode = document.querySelector('#checkout-error');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    errorNode.textContent = '';
    try {
      const data = await api('/api/orders', {
        method: 'POST', body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), items: readCart() })
      });
      saveCart([]);
      const reference = data.order.id.slice(0, 8).toUpperCase();
      appRoot.innerHTML = `<section class="wrap page-intro"><p class="eyebrow">Order confirmed · ${money(data.order.total)}</p><h1>Thank you, ${esc(currentUser.name)}.</h1><p>Your order reference is <strong>${esc(reference)}</strong>. We will send an update when it is on its way.</p><p><a class="button" href="#/account">View your account <span aria-hidden="true">→</span></a> &nbsp; <a class="text-link" href="#/shop">Continue browsing</a></p></section>`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { errorNode.textContent = error.message; }
    finally { if (document.contains(submit)) submit.disabled = false; }
  }
});
document.querySelector('.menu-toggle').addEventListener('click', event => {
  const nav = document.querySelector('.main-nav');
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
  event.currentTarget.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
document.querySelector('.main-nav').addEventListener('click', event => {
  if (event.target.closest('a')) {
    document.querySelector('.main-nav').classList.remove('open');
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  }
});
window.addEventListener('hashchange', render);
document.addEventListener('click', event => {
  const themeToggle = event.target.closest('.theme-toggle');
  if (!themeToggle) return;
  const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
  applyTheme(nextTheme);
});
async function start() {
  try {
    initTheme();
    const [products, session] = await Promise.all([api('/api/products'), api('/api/me')]);
    allProducts = products;
    currentUser = session.user;
    render();
  } catch (error) {
    initTheme();
    appRoot.innerHTML = `<div class="wrap page-intro"><p class="eyebrow">A little pause</p><h1>We could not reach the shop.</h1><p>${esc(error.message)} Check that the local server is running, then refresh the page.</p></div>`;
  }
}
start();
