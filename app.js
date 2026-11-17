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

function addToCart(product, modifiers = [], quantity = 1, notes = '', customPrice = null) {
  const cart = getCart();
  const priceVal = customPrice !== null ? parseFloat(customPrice) : parseFloat(product.precio);
  const modsSorted = (modifiers || []).slice().sort().join('|');
  const cartItemId = `${product.id}_${modsSorted}_${notes || ''}`;

  const existing = cart.find(item => item.cartItemId === cartItemId || (!item.cartItemId && item.id === product.id && modifiers.length === 0));

  if (existing) {
    existing.cantidad += quantity;
  } else {
    cart.push({
      cartItemId,
      id: product.id,
      nombre: product.nombre,
      categoria: product.categoria || 'cafe',
      badge_class: product.badge_class || 'badge-cafe',
      descripcion: product.descripcion || '',
      precio: priceVal,
      cantidad: quantity,
      notas: notes || '',
      modificadores: modifiers || []
    });
  }

  saveCart(cart);
  showToast(`Agregado: ${product.nombre}`);
}

function updateQuantity(itemKey, delta) {
  let cart = getCart();
  const item = cart.find(i => (i.cartItemId ? i.cartItemId === itemKey : String(i.id) === String(itemKey)));

  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    cart = cart.filter(i => (i.cartItemId ? i.cartItemId !== itemKey : String(i.id) !== String(itemKey)));
  }

  saveCart(cart);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
}

function removeFromCart(itemKey) {
  let cart = getCart();
  cart = cart.filter(i => (i.cartItemId ? i.cartItemId !== itemKey : String(i.id) !== String(itemKey)));
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

function calculateTotals(cart, applyBecaDiscount = false) {
  const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const discount = applyBecaDiscount ? (subtotal * 0.20) : 0;
  const total = Math.max(0, subtotal - discount);

  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    taxes: '0.00',
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
let currentCustomizingProduct = null;
let currentCustomQuantity = 1;

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
  openCustomizeProductModal(prod);
}

function openCustomizeProductModal(prod) {
  currentCustomizingProduct = prod;
  currentCustomQuantity = 1;

  const modal = document.getElementById('customize-modal');
  if (!modal) {
    addToCart(prod);
    return;
  }

  document.getElementById('customize-modal-title').textContent = prod.nombre;
  document.getElementById('customize-modal-desc').textContent = prod.descripcion || '';
  const badge = document.getElementById('customize-modal-category');
  if (badge) {
    badge.textContent = prod.categoria_nombre || prod.categoria || 'Menú';
    badge.className = `badge ${prod.badge_class || 'badge-cafe'}`;
  }

  const isDrink = prod.categoria === 'cafe' || prod.categoria === 'bebidas' || prod.categoria_id === 1 || prod.categoria_id === 3;
  const milkSection = document.getElementById('custom-milk-section');
  const tempSection = document.getElementById('custom-temp-section');
  const sweetSection = document.getElementById('custom-sweet-section');

  if (milkSection) milkSection.style.display = isDrink ? 'block' : 'none';
  if (tempSection) tempSection.style.display = isDrink ? 'block' : 'none';
  if (sweetSection) sweetSection.style.display = isDrink ? 'block' : 'none';

  const notesInput = document.getElementById('custom-special-notes');
  if (notesInput) notesInput.value = '';

  document.querySelectorAll('#customize-modal .btn-custom-chip').forEach(btn => {
    const isDefault = btn.dataset.val === 'Leche Entera' || btn.dataset.val === 'Caliente' || btn.dataset.val === 'Endulzante Regular';
    btn.classList.toggle('active', isDefault);
  });

  updateCustomizeModalTotal();
  modal.classList.add('visible');
}

function closeCustomizeModal() {
  const modal = document.getElementById('customize-modal');
  if (modal) modal.classList.remove('visible');
}

function updateCustomizeModalTotal() {
  if (!currentCustomizingProduct) return;
  const basePrice = parseFloat(currentCustomizingProduct.precio);
  let extras = 0;

  const isDrink = currentCustomizingProduct.categoria === 'cafe' || currentCustomizingProduct.categoria === 'bebidas' || currentCustomizingProduct.categoria_id === 1 || currentCustomizingProduct.categoria_id === 3;

  if (isDrink) {
    document.querySelectorAll('#customize-modal .btn-custom-chip.active').forEach(chip => {
      extras += parseFloat(chip.dataset.cost || 0);
    });
  }

  const unitTotal = basePrice + extras;
  const finalTotal = unitTotal * currentCustomQuantity;

  const totalEl = document.getElementById('custom-modal-total-price');
  const qtyEl = document.getElementById('custom-qty-val');
  if (totalEl) totalEl.textContent = `$${finalTotal.toFixed(2)}`;
  if (qtyEl) qtyEl.textContent = currentCustomQuantity;
}

function setupCustomizeModalEvents() {
  const modal = document.getElementById('customize-modal');
  if (!modal) return;

  modal.querySelectorAll('.btn-custom-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.group;
      modal.querySelectorAll(`.btn-custom-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      updateCustomizeModalTotal();
    });
  });

  const minusBtn = document.getElementById('btn-custom-qty-minus');
  const plusBtn = document.getElementById('btn-custom-qty-plus');
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      if (currentCustomQuantity > 1) {
        currentCustomQuantity -= 1;
        updateCustomizeModalTotal();
      }
    });
  }
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      currentCustomQuantity += 1;
      updateCustomizeModalTotal();
    });
  }

  const confirmBtn = document.getElementById('btn-confirm-add-custom');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!currentCustomizingProduct) return;
      const isDrink = currentCustomizingProduct.categoria === 'cafe' || currentCustomizingProduct.categoria === 'bebidas' || currentCustomizingProduct.categoria_id === 1 || currentCustomizingProduct.categoria_id === 3;

      const modifiers = [];
      let extras = 0;
      if (isDrink) {
        modal.querySelectorAll('.btn-custom-chip.active').forEach(chip => {
          modifiers.push(chip.dataset.val);
          extras += parseFloat(chip.dataset.cost || 0);
        });
      }

      const notesInput = document.getElementById('custom-special-notes');
      const specialNote = notesInput ? notesInput.value.trim() : '';
      const unitPrice = parseFloat(currentCustomizingProduct.precio) + extras;

      addToCart(currentCustomizingProduct, modifiers, currentCustomQuantity, specialNote, unitPrice);
      closeCustomizeModal();
    });
  }
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

  setupCustomizeModalEvents();
}

let selectedPayment = 'Efectivo';
let selectedDeliveryType = 'INMEDIATA';
let hasBecaDiscount = false;
let becaMatricula = '';

function renderCartPage() {
  const itemsSection = document.querySelector('.cart-items-section');
  const countDisplay = document.querySelector('.order-item-count');
  if (!itemsSection) return;

  const cart = getCart();
  const totals = calculateTotals(cart, hasBecaDiscount);

  if (countDisplay) {
    countDisplay.textContent = `${totals.count} artículos en la orden`;
  }

  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const totalEl = document.getElementById('summary-total');

  if (subtotalEl) subtotalEl.textContent = `$${totals.subtotal}`;
  if (discountEl) discountEl.textContent = `-$${totals.discount}`;
  if (totalEl) totalEl.textContent = `$${totals.total}`;

  const becaCheck = document.getElementById('beca-discount-check');
  const becaInputContainer = document.getElementById('beca-matricula-container');
  const becaStatus = document.getElementById('beca-status-text');

  if (becaCheck) {
    becaCheck.checked = hasBecaDiscount;
  }
  if (becaInputContainer) {
    becaInputContainer.style.display = hasBecaDiscount || (becaCheck && becaCheck.checked) ? 'flex' : 'none';
  }
  if (becaStatus) {
    if (hasBecaDiscount) {
      becaStatus.textContent = `Beca autorizada: ${becaMatricula || 'Alumno'} (20% de descuento).`;
      becaStatus.className = 'beca-status-text beca-valid';
    }
  }

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

  const itemsHtml = cart.map(item => {
    const itemKey = item.cartItemId || item.id;
    const modsHtml = Array.isArray(item.modificadores) && item.modificadores.length > 0
      ? `<div class="cart-item-mods">${item.modificadores.map(m => `<span class="mod-pill">${m}</span>`).join('')}</div>`
      : '';
    const noteHtml = item.notas ? `<p class="cart-item-individual-notes">Nota: ${item.notas}</p>` : '';

    return `
      <article class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-header">
            <span class="badge ${item.badge_class || 'badge-cafe'}">${item.categoria}</span>
            <h3 class="cart-item-title">${item.nombre}</h3>
          </div>
          ${modsHtml}
          ${noteHtml}
          <p class="cart-item-desc">${item.descripcion || 'Preparación estándar'}</p>
          <span class="cart-item-unit-price">$${parseFloat(item.precio).toFixed(2)} c/u</span>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button class="btn-qty" onclick="updateQuantity('${itemKey}', -1)">-</button>
            <span class="qty-display">${item.cantidad}</span>
            <button class="btn-qty" onclick="updateQuantity('${itemKey}', 1)">+</button>
          </div>
          <span class="cart-item-total">$${(item.precio * item.cantidad).toFixed(2)}</span>
          <button class="btn-remove" onclick="removeFromCart('${itemKey}')" title="Eliminar producto">🗑️</button>
        </div>
      </article>
    `;
  }).join('');

  const notesHtml = `
    <div class="order-notes">
      <label class="notes-label" for="order-notes-input">Notas generales para el Barista</label>
      <input type="text" id="order-notes-input" placeholder="Ej: Entregar en mesa 4, servilletas extra..." class="notes-input">
    </div>
  `;

  itemsSection.innerHTML = itemsHtml + notesHtml;
}

async function checkPonyPayAccount(matricula) {
  if (!matricula) return null;
  try {
    const res = await fetch(`${API_BASE}/ponypay/${encodeURIComponent(matricula)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.account;
  } catch {
    return null;
  }
}

function setupCartControls() {
  const paymentBtns = document.querySelectorAll('.payment-methods .btn-payment');
  const ponySection = document.getElementById('ponypay-section');
  const ponyInput = document.getElementById('ponypay-matricula-input');
  const btnVerificarPony = document.getElementById('btn-verificar-ponypay');
  const ponyStatusBox = document.getElementById('ponypay-status-box');

  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPayment = btn.textContent.trim();
      if (ponySection) {
        ponySection.style.display = selectedPayment === 'PonyPay' ? 'block' : 'none';
        if (selectedPayment === 'PonyPay' && becaMatricula && ponyInput && !ponyInput.value) {
          ponyInput.value = becaMatricula;
        }
      }
    });
  });

  if (btnVerificarPony && ponyInput) {
    btnVerificarPony.addEventListener('click', async () => {
      const mat = ponyInput.value.trim();
      if (!mat) {
        showToast('Ingresa una matrícula');
        return;
      }
      btnVerificarPony.disabled = true;
      btnVerificarPony.textContent = 'Consultando...';

      const acc = await checkPonyPayAccount(mat);
      btnVerificarPony.disabled = false;
      btnVerificarPony.textContent = 'Consultar';

      if (!acc) {
        ponyStatusBox.style.display = 'block';
        ponyStatusBox.className = 'ponypay-status-box pony-error';
        ponyStatusBox.innerHTML = `⚠️ Matrícula <strong>${mat}</strong> no encontrada en PonyPay.`;
        return;
      }

      const cart = getCart();
      const totals = calculateTotals(cart, hasBecaDiscount);
      const isSufficient = acc.saldo >= parseFloat(totals.total);

      ponyStatusBox.style.display = 'block';
      ponyStatusBox.className = isSufficient ? 'ponypay-status-box pony-success' : 'ponypay-status-box pony-warning';
      ponyStatusBox.innerHTML = `
        <div class="pony-acc-row"><span>Alumno:</span> <strong>${acc.nombre}</strong></div>
        <div class="pony-acc-row"><span>Saldo disponible:</span> <strong class="pony-saldo-val">$${acc.saldo.toFixed(2)} MXN</strong></div>
        ${!isSufficient ? `<div class="pony-insufficient-msg">Saldo insuficiente para cubrir el total ($${totals.total}).</div>` : '<div class="pony-sufficient-msg">✓ Saldo suficiente para cubrir esta orden.</div>'}
      `;
    });
  }

  const deliveryBtns = document.querySelectorAll('.delivery-options .btn-delivery-option');
  const scheduledContainer = document.getElementById('scheduled-time-container');
  deliveryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      deliveryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDeliveryType = btn.dataset.delivery || 'INMEDIATA';
      if (scheduledContainer) {
        scheduledContainer.style.display = selectedDeliveryType === 'PROGRAMADA' ? 'block' : 'none';
      }
    });
  });

  const becaCheckbox = document.getElementById('beca-discount-check');
  const becaInputContainer = document.getElementById('beca-matricula-container');
  const becaInput = document.getElementById('beca-matricula-input');
  const btnAplicarBeca = document.getElementById('btn-aplicar-beca');
  const becaStatus = document.getElementById('beca-status-text');

  async function validateBecaEntry() {
    const val = becaInput ? becaInput.value.trim() : '';
    if (!val) {
      if (becaStatus) {
        becaStatus.textContent = 'Escribe la matrícula del alumno para validar.';
        becaStatus.className = 'beca-status-text beca-error';
      }
      hasBecaDiscount = false;
      renderCartPage();
      return;
    }

    if (btnAplicarBeca) {
      btnAplicarBeca.disabled = true;
      btnAplicarBeca.textContent = 'Verificando...';
    }

    const acc = await checkPonyPayAccount(val);

    if (btnAplicarBeca) {
      btnAplicarBeca.disabled = false;
      btnAplicarBeca.textContent = 'Validar';
    }

    if (!acc) {
      if (becaStatus) {
        becaStatus.textContent = `La matrícula ${val} no está registrada en el sistema.`;
        becaStatus.className = 'beca-status-text beca-error';
      }
      hasBecaDiscount = false;
      if (becaCheckbox) becaCheckbox.checked = false;
      renderCartPage();
      return;
    }

    if (!acc.tiene_beca) {
      if (becaStatus) {
        becaStatus.textContent = `El alumno ${acc.nombre} (${val}) no tiene Beca Alimenticia asignada.`;
        becaStatus.className = 'beca-status-text beca-error';
      }
      hasBecaDiscount = false;
      if (becaCheckbox) becaCheckbox.checked = false;
      showToast('No cuenta con beca asignada');
      renderCartPage();
      return;
    }

    if (!acc.beca_disponible_hoy) {
      if (becaStatus) {
        becaStatus.textContent = `La matrícula ${val} ya utilizó su Beca Alimenticia hoy (Límite: 1 al día).`;
        becaStatus.className = 'beca-status-text beca-error';
      }
      hasBecaDiscount = false;
      if (becaCheckbox) becaCheckbox.checked = false;
      showToast('Beca ya utilizada hoy');
      renderCartPage();
      return;
    }

    hasBecaDiscount = true;
    becaMatricula = val;
    if (becaStatus) {
      becaStatus.textContent = `Beca autorizada: ${acc.nombre} (20% de descuento aplicado hoy).`;
      becaStatus.className = 'beca-status-text beca-valid';
    }
    showToast('Beca Alimenticia validada');
    renderCartPage();
  }

  if (becaCheckbox) {
    becaCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (becaInputContainer) becaInputContainer.style.display = 'flex';
        if (becaInput && becaInput.value.trim()) {
          validateBecaEntry();
        } else {
          hasBecaDiscount = false;
          if (becaInput) becaInput.focus();
          if (becaStatus) {
            becaStatus.textContent = 'Ingresa la matrícula del becario y pulsa Validar.';
            becaStatus.className = 'beca-status-text';
          }
          renderCartPage();
        }
      } else {
        hasBecaDiscount = false;
        becaMatricula = '';
        if (becaInputContainer) becaInputContainer.style.display = 'none';
        if (becaStatus) becaStatus.textContent = '';
        renderCartPage();
      }
    });
  }

  if (btnAplicarBeca) {
    btnAplicarBeca.addEventListener('click', validateBecaEntry);
  }

  if (becaInput) {
    becaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateBecaEntry();
      }
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
      const nameInput = document.getElementById('client-name-input');
      const clientName = nameInput ? nameInput.value.trim() : '';
      const pickupTimeSelect = document.getElementById('pickup-time-select');
      const horaEntrega = selectedDeliveryType === 'PROGRAMADA' && pickupTimeSelect ? pickupTimeSelect.value : null;

      let matriculaFinal = becaMatricula;
      if (selectedPayment === 'PonyPay') {
        const ponyInputVal = document.getElementById('ponypay-matricula-input');
        matriculaFinal = ponyInputVal ? ponyInputVal.value.trim() : matriculaFinal;
        if (!matriculaFinal) {
          showToast('Ingresa tu matrícula para cobro con PonyPay');
          return;
        }
      }

      const totals = calculateTotals(cart, hasBecaDiscount);

      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span>Procesando cobro...</span>';

      try {
        const payload = {
          cliente_nombre: clientName || (hasBecaDiscount ? `Alumno (${matriculaFinal})` : 'Cliente General'),
          cliente_matricula: matriculaFinal || null,
          cliente_tipo: hasBecaDiscount ? `Beca Alimenticia (${matriculaFinal || 'General'})` : 'General',
          metodo_pago: selectedPayment,
          tipo_entrega: selectedDeliveryType,
          hora_entrega: horaEntrega,
          notas: notesInput ? notesInput.value : '',
          subtotal: totals.subtotal,
          descuento: totals.discount,
          impuestos: '0.00',
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
          const createdFolio = data.order.folio || data.order.numero_orden;
          localStorage.setItem('ponycafe_last_folio', createdFolio);
          showReceiptModal(data.order, cart, totals);
          localStorage.removeItem(CART_STORAGE_KEY);
          hasBecaDiscount = false;
          becaMatricula = '';
          updateCartBadge();
        } else {
          showToast('Error: ' + (data.error || 'No se pudo procesar la orden'));
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

  const folioText = order.folio || order.numero_orden;
  const isProg = order.tipo_entrega === 'PROGRAMADA';

  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-badge-success">✓ Orden Exitosa</div>
        <h3 class="modal-title">Ticket de Venta</h3>
        <p class="modal-order-number">Folio: ${folioText}</p>
      </div>
      <div class="modal-body">
        <div class="receipt-delivery-banner ${isProg ? 'receipt-scheduled' : 'receipt-immediate'}">
          ${isProg ? `⏰ Programado para recolección: ${order.hora_entrega || 'Hora pactada'}` : '⚡ Preparación Inmediata'}
        </div>
        <div class="receipt-info-row">
          <span>Fecha y Hora:</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="receipt-info-row">
          <span>Cliente:</span>
          <span>${order.cliente_nombre || order.cliente_tipo}</span>
        </div>
        <div class="receipt-info-row">
          <span>Método:</span>
          <span>${order.metodo_pago}</span>
        </div>
        <div class="receipt-info-row">
          <span>Estado inicial:</span>
          <span class="status-pill status-pendiente">${order.estado || 'Pendiente'}</span>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-items-list">
          ${items.map(i => {
            const mods = Array.isArray(i.modificadores) && i.modificadores.length > 0
              ? `<div class="receipt-item-mods">${i.modificadores.map(m => `<span class="mod-pill">${m}</span>`).join('')}</div>`
              : '';
            return `
              <div class="receipt-item-row">
                <div class="receipt-item-col">
                  <span>${i.cantidad}x ${i.nombre}</span>
                  ${mods}
                </div>
                <span>$${(i.precio * i.cantidad).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-info-row">
          <span>Subtotal:</span>
          <span>$${totals.subtotal}</span>
        </div>
        ${parseFloat(totals.discount) > 0 ? `
          <div class="receipt-info-row discount-text">
            <span>Beca Alimenticia:</span>
            <span>-$${totals.discount}</span>
          </div>
        ` : ''}
        <div class="receipt-info-row total-highlight">
          <span>Total Cobrado:</span>
          <span>$${totals.total}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-track-action" onclick="openTrackModal('${folioText}')">🔍 Rastrear este Pedido</button>
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

function openTrackModal(initialFolio) {
  let modal = document.getElementById('track-order-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'track-order-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const defaultFolio = initialFolio || localStorage.getItem('ponycafe_last_folio') || '';

  modal.innerHTML = `
    <div class="modal-box modal-track-box">
      <div class="modal-header">
        <h3 class="modal-title">Rastreo de Pedido en Vivo</h3>
        <button class="btn-close-modal" onclick="closeTrackModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="track-search-bar">
          <input type="text" id="track-folio-input" class="form-control" placeholder="Ingresa tu folio (ej. PC-1042 o ORD-1042)" value="${defaultFolio}">
          <button type="button" class="btn-vendor-save" onclick="handleTrackSearch()">Consultar</button>
        </div>
        <div id="track-result-container" class="track-result-container">
          <p class="track-prompt">Ingresa tu número de folio para consultar el avance de preparación en cocina.</p>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('visible');

  if (defaultFolio) {
    trackOrder(defaultFolio);
  }
}

function closeTrackModal() {
  const modal = document.getElementById('track-order-modal');
  if (modal) modal.classList.remove('visible');
}

function handleTrackSearch() {
  const input = document.getElementById('track-folio-input');
  if (!input || !input.value.trim()) {
    showToast('Ingresa un número de folio');
    return;
  }
  trackOrder(input.value.trim());
}

async function trackOrder(folio) {
  const container = document.getElementById('track-result-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Consultando estatus de tu orden...</div>';

  try {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(folio)}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      container.innerHTML = `
        <div class="track-not-found">
          <p>⚠️ No se encontró ninguna orden con el folio <strong>${folio}</strong>.</p>
          <span class="track-hint">Verifica el código impreso en tu ticket o pantalla de confirmación.</span>
        </div>
      `;
      return;
    }

    const order = data.order;
    const st = (order.estado || 'Pendiente').toLowerCase();
    let currentStep = 1;
    if (st.includes('prep')) currentStep = 2;
    else if (st.includes('list')) currentStep = 3;
    else if (st.includes('comp') || st.includes('entr')) currentStep = 4;

    const isProg = order.tipo_entrega === 'PROGRAMADA';
    const items = Array.isArray(order.items) ? order.items : [];

    container.innerHTML = `
      <div class="track-card">
        <div class="track-header-meta">
          <div>
            <span class="track-folio-title">${order.folio || order.numero_orden}</span>
            <span class="track-client-name">Cliente: ${order.cliente_nombre || order.cliente_tipo}</span>
          </div>
          <span class="track-delivery-pill ${isProg ? 'pill-scheduled' : 'pill-immediate'}">
            ${isProg ? `⏰ Recolección: ${order.hora_entrega || 'Hora programada'}` : '⚡ Preparación Inmediata'}
          </span>
        </div>

        <div class="stepper-wrapper">
          <div class="stepper-step ${currentStep >= 1 ? 'is-done' : ''} ${currentStep === 1 ? 'is-active' : ''}">
            <div class="step-circle">1</div>
            <span class="step-label">Recibida</span>
          </div>
          <div class="stepper-line ${currentStep >= 2 ? 'is-done' : ''}"></div>
          <div class="stepper-step ${currentStep >= 2 ? 'is-done' : ''} ${currentStep === 2 ? 'is-active' : ''}">
            <div class="step-circle">2</div>
            <span class="step-label">Preparando</span>
          </div>
          <div class="stepper-line ${currentStep >= 3 ? 'is-done' : ''}"></div>
          <div class="stepper-step ${currentStep >= 3 ? 'is-done' : ''} ${currentStep === 3 ? 'is-active' : ''}">
            <div class="step-circle">3</div>
            <span class="step-label">Lista en Barra</span>
          </div>
          <div class="stepper-line ${currentStep >= 4 ? 'is-done' : ''}"></div>
          <div class="stepper-step ${currentStep >= 4 ? 'is-done' : ''} ${currentStep === 4 ? 'is-active' : ''}">
            <div class="step-circle">4</div>
            <span class="step-label">Entregada</span>
          </div>
        </div>

        <div class="track-status-message ${currentStep === 3 ? 'status-ready-callout' : ''}">
          ${currentStep === 1 ? '⏳ Tu orden está en fila de pedidos recibidos. Pronto iniciará preparación.' : ''}
          ${currentStep === 2 ? '☕ El barista está preparando tus productos en barra con dedicación.' : ''}
          ${currentStep === 3 ? '🎉 ¡Tu pedido está LISTO! Puedes pasar al mostrador de entrega con tu folio.' : ''}
          ${currentStep === 4 ? '✓ Pedido entregado. ¡Gracias por tu compra en PonyCafé!' : ''}
        </div>

        <div class="track-items-summary">
          <h4 class="track-items-title">Detalle del Pedido:</h4>
          ${items.map(it => {
            const mods = Array.isArray(it.modificadores) && it.modificadores.length > 0
              ? `<div class="track-item-mods">${it.modificadores.map(m => `<span class="mod-pill">${m}</span>`).join('')}</div>`
              : '';
            return `
              <div class="track-item-line">
                <div>
                  <span>${it.cantidad}x ${it.nombre || it.nombre_producto}</span>
                  ${mods}
                </div>
                <span>$${(parseFloat(it.precio || it.precio_unitario || 0) * parseInt(it.cantidad || 1, 10)).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
          <div class="track-total-row">
            <span>Total Pagado:</span>
            <strong>$${parseFloat(order.total).toFixed(2)}</strong>
          </div>
        </div>

        <button type="button" class="btn-refresh-track" onclick="trackOrder('${folio}')">↻ Actualizar Estatus</button>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="track-not-found"><p>Error de conexión al consultar el estatus.</p></div>';
  }
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
                <td class="order-folio">${o.folio || o.numero_orden}</td>
                <td>${o.cliente_nombre || o.cliente_tipo}</td>
                <td>${o.metodo_pago}</td>
                <td class="order-price">$${parseFloat(o.total).toFixed(2)}</td>
                <td><span class="status-badge-complete">${o.estado || 'Pendiente'}</span></td>
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
