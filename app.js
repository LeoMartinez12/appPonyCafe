const CART_STORAGE_KEY = 'ponycafe_cart';
const API_BASE = '/api';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
  } catch (err) {
    console.error(err);
  }
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({
      id: product.id,
      nombre: product.nombre,
      categoria: product.categoria || 'cafe',
      badge_class: product.badge_class || 'badge-cafe',
      descripcion: product.descripcion || '',
      precio: parseFloat(product.precio),
      cantidad: 1,
      notas: ''
    });
  }

  saveCart(cart);
  showToast(`Agregado: ${product.nombre}`);
}

function updateQuantity(productId, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === productId);

  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }

  saveCart(cart);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== productId);
  saveCart(cart);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
  showToast('Producto eliminado');
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartBadge();
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
  showToast('Carrito vaciado');
}

function calculateTotals(cart, applyStudentDiscount = true) {
  const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const discount = applyStudentDiscount ? (subtotal * 0.10) : 0;
  const taxable = subtotal - discount;
  const taxes = taxable * 0.16;
  const total = taxable + taxes;

  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    taxes: taxes.toFixed(2),
    total: total.toFixed(2),
    count: cart.reduce((sum, item) => sum + item.cantidad, 0)
  };
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge-target');
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.cantidad, 0);

  badges.forEach(badge => {
    badge.textContent = `🛒 ${count} ${count === 1 ? 'item' : 'items'}`;
  });
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

let activeCategory = 'todos';
let searchQuery = '';

async function fetchProducts() {
  try {
    const params = new URLSearchParams();
    if (activeCategory !== 'todos') params.append('category', activeCategory);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener productos');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function renderCatalogPage() {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state">Cargando menú...</div>';

  const products = await fetchProducts();

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-products">
        <p>No se encontraron productos disponibles en esta categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(prod => `
    <article class="product-card" data-id="${prod.id}">
      <div class="product-info">
        <span class="badge ${prod.badge_class || 'badge-cafe'}">${prod.categoria_nombre || prod.categoria || 'Café'}</span>
        <h2 class="product-title">${prod.nombre}</h2>
        <p class="product-desc">${prod.descripcion || ''}</p>
      </div>
      <div class="product-actions">
        <span class="product-price">$${parseFloat(prod.precio).toFixed(2)}</span>
        <button class="btn-add" onclick='handleAddToCart(${JSON.stringify(prod)})'>+ Agregar</button>
      </div>
    </article>
  `).join('');
}

function handleAddToCart(prod) {
  addToCart(prod);
}

function setupCatalogControls() {
  const categoryButtons = document.querySelectorAll('.category-nav .btn-category');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category || 'todos';
      renderCatalogPage();
    });
  });

  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value;
        renderCatalogPage();
      }, 250);
    });
  }
}

let selectedPayment = 'Efectivo';
let hasStudentDiscount = true;

function renderCartPage() {
  const itemsSection = document.querySelector('.cart-items-section');
  const countDisplay = document.querySelector('.order-item-count');
  if (!itemsSection) return;

  const cart = getCart();
  const totals = calculateTotals(cart, hasStudentDiscount);

  if (countDisplay) {
    countDisplay.textContent = `${totals.count} artículos en la orden`;
  }

  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const taxEl = document.getElementById('summary-tax');
  const totalEl = document.getElementById('summary-total');

  if (subtotalEl) subtotalEl.textContent = `$${totals.subtotal}`;
  if (discountEl) discountEl.textContent = `-$${totals.discount}`;
  if (taxEl) taxEl.textContent = `$${totals.taxes}`;
  if (totalEl) totalEl.textContent = `$${totals.total}`;

  if (cart.length === 0) {
    itemsSection.innerHTML = `
      <div class="cart-empty-state">
        <div class="empty-icon">☕</div>
        <h3>Tu carrito está vacío</h3>
        <p>Añade bebidas o alimentos deliciosos desde el catálogo para iniciar tu orden.</p>
        <a href="catalog.html" class="btn-primary-action">Explorar Menú</a>
      </div>
    `;
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = '0.5';
      checkoutBtn.style.cursor = 'not-allowed';
    }
    return;
  }

  const checkoutBtn = document.querySelector('.btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = '1';
    checkoutBtn.style.cursor = 'pointer';
  }

  const itemsHtml = cart.map(item => `
    <article class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-header">
          <span class="badge ${item.badge_class || 'badge-cafe'}">${item.categoria}</span>
          <h3 class="cart-item-title">${item.nombre}</h3>
        </div>
        <p class="cart-item-desc">${item.descripcion || 'Preparación estándar'}</p>
        <span class="cart-item-unit-price">$${parseFloat(item.precio).toFixed(2)} c/u</span>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-control">
          <button class="btn-qty" onclick="updateQuantity(${item.id}, -1)">-</button>
          <span class="qty-display">${item.cantidad}</span>
          <button class="btn-qty" onclick="updateQuantity(${item.id}, 1)">+</button>
        </div>
        <span class="cart-item-total">$${(item.precio * item.cantidad).toFixed(2)}</span>
        <button class="btn-remove" onclick="removeFromCart(${item.id})" title="Eliminar producto">🗑️</button>
      </div>
    </article>
  `).join('');

  const notesHtml = `
    <div class="order-notes">
      <label class="notes-label" for="order-notes-input">Notas para la orden / Barista</label>
      <input type="text" id="order-notes-input" placeholder="Ej: Entregar en mesa 4, sin azúcar, para llevar..." class="notes-input">
    </div>
  `;

  itemsSection.innerHTML = itemsHtml + notesHtml;
}

function setupCartControls() {
  const paymentBtns = document.querySelectorAll('.payment-methods .btn-payment');
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPayment = btn.textContent.trim();
    });
  });

  const discountCheckbox = document.getElementById('student-discount-check');
  if (discountCheckbox) {
    discountCheckbox.addEventListener('change', (e) => {
      hasStudentDiscount = e.target.checked;
      renderCartPage();
    });
  }

  const clearBtn = document.querySelector('.btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (getCart().length === 0) return;
      if (confirm('¿Deseas vaciar todos los artículos del carrito?')) {
        clearCart();
      }
    });
  }

  const checkoutBtn = document.querySelector('.btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      const cart = getCart();
      if (cart.length === 0) {
        showToast('El carrito está vacío');
        return;
      }

      const notesInput = document.getElementById('order-notes-input');
      const totals = calculateTotals(cart, hasStudentDiscount);

      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span>Procesando...</span>';

      try {
        const payload = {
          cliente_tipo: hasStudentDiscount ? 'Estudiante (10% Desc.)' : 'General',
          metodo_pago: selectedPayment,
          notas: notesInput ? notesInput.value : '',
          subtotal: totals.subtotal,
          descuento: totals.discount,
          impuestos: totals.taxes,
          total: totals.total,
          items: cart
        };

        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showReceiptModal(data.order, cart, totals);
          localStorage.removeItem(CART_STORAGE_KEY);
          updateCartBadge();
        } else {
          showToast('Error al procesar la orden: ' + (data.error || 'Intenta de nuevo'));
        }
      } catch (err) {
        showToast('Error de conexión con el servidor POS');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<span>Cobrar y Procesar</span> →';
      }
    });
  }
}

function showReceiptModal(order, items, totals) {
  let modal = document.getElementById('receipt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'receipt-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-badge-success">✓ Orden Exitosa</div>
        <h3 class="modal-title">Ticket de Venta</h3>
        <p class="modal-order-number">${order.numero_orden || 'ORD-#1042'}</p>
      </div>
      <div class="modal-body">
        <div class="receipt-info-row">
          <span>Fecha:</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="receipt-info-row">
          <span>Método:</span>
          <span>${order.metodo_pago}</span>
        </div>
        <div class="receipt-info-row">
          <span>Cliente:</span>
          <span>${order.cliente_tipo}</span>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-items-list">
          ${items.map(i => `
            <div class="receipt-item-row">
              <span>${i.cantidad}x ${i.nombre}</span>
              <span>$${(i.precio * i.cantidad).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-info-row">
          <span>Subtotal:</span>
          <span>$${totals.subtotal}</span>
        </div>
        <div class="receipt-info-row discount-text">
          <span>Descuento:</span>
          <span>-$${totals.discount}</span>
        </div>
        <div class="receipt-info-row">
          <span>IVA (16%):</span>
          <span>$${totals.taxes}</span>
        </div>
        <div class="receipt-info-row total-highlight">
          <span>Total Cobrado:</span>
          <span>$${totals.total}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary-action" onclick="closeModalAndRedirect()">Nueva Orden</button>
      </div>
    </div>
  `;

  modal.classList.add('visible');
}

function closeModalAndRedirect() {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.remove('visible');
  window.location.href = 'catalog.html';
}

async function renderDashboardPage() {
  updateCartBadge();
  const ordersCountEl = document.getElementById('stat-orders');
  const salesTotalEl = document.getElementById('stat-sales');
  const prodsCountEl = document.getElementById('stat-products');
  const dbStatusEl = document.getElementById('stat-db-status');

  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) {
      const stats = await res.json();
      if (ordersCountEl) ordersCountEl.textContent = stats.total_ordenes;
      if (salesTotalEl) salesTotalEl.textContent = `$${stats.total_ventas}`;
      if (prodsCountEl) prodsCountEl.textContent = stats.total_productos;
      if (dbStatusEl) {
        dbStatusEl.textContent = stats.postgres_conectado ? 'PostgreSQL Conectado' : 'Modo Local Activo';
        dbStatusEl.className = stats.postgres_conectado ? 'status-pill status-online' : 'status-pill status-fallback';
      }
    }
  } catch {
    if (dbStatusEl) {
      dbStatusEl.textContent = 'Servidor Local';
      dbStatusEl.className = 'status-pill status-fallback';
    }
  }

  renderRecentOrders();
}

async function renderRecentOrders() {
  const container = document.getElementById('recent-orders-container');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Error al consultar órdenes');
    const orders = await res.json();

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-orders-state">
          <p>No hay órdenes registradas aún. Procesa tu primera orden en caja.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="orders-table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td class="order-folio">${o.numero_orden}</td>
                <td>${o.cliente_tipo}</td>
                <td>${o.metodo_pago}</td>
                <td class="order-price">$${parseFloat(o.total).toFixed(2)}</td>
                <td><span class="status-badge-complete">${o.estado || 'Completada'}</span></td>
                <td class="order-date">${new Date(o.creado_en).toLocaleDateString()} ${new Date(o.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-orders-state">
        <p>No se pudo sincronizar el historial con la base de datos.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  if (document.querySelector('.product-grid')) {
    setupCatalogControls();
    renderCatalogPage();
  }

  if (document.querySelector('.cart-items-section')) {
    setupCartControls();
    renderCartPage();
  }

  if (document.getElementById('stat-orders')) {
    renderDashboardPage();
  }
});
