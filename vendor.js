const API_BASE = '/api';

let allOrders = [];
let allProducts = [];
let currentFilter = 'todas';
let activeTab = 'comandas';
let selectedMenuCategory = 'todos';
let autoRefreshTimer = null;

function updateClock() {
  const el = document.getElementById('vendor-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

setInterval(updateClock, 1000);
updateClock();

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

async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Error al consultar comandas');
    allOrders = await res.json();
    renderOrders();
    renderCaja();
  } catch (err) {
    console.error(err);
  }
}

async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?all=true`);
    if (!res.ok) throw new Error('Error al consultar productos');
    allProducts = await res.json();
    renderProducts();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('vendor-menu-grid');
    if (container && allProducts.length === 0) {
      container.innerHTML = '<div class="empty-products"><p>Error de conexión al cargar productos del catálogo.</p></div>';
    }
  }
}

function getNormalizedStatus(order) {
  const st = (order.estado || 'Pendiente').toLowerCase();
  if (st.includes('prep')) return 'preparacion';
  if (st.includes('list')) return 'lista';
  if (st.includes('comp') || st.includes('entr')) return 'completada';
  return 'pendiente';
}

function renderOrders() {
  const container = document.getElementById('vendor-orders-grid');
  const countBadge = document.getElementById('active-orders-count');
  if (!container) return;

  const activeCount = allOrders.filter(o => getNormalizedStatus(o) !== 'completada').length;
  if (countBadge) {
    countBadge.textContent = activeCount;
  }

  let filtered = [...allOrders];
  if (currentFilter !== 'todas') {
    filtered = filtered.filter(o => getNormalizedStatus(o) === currentFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-orders-state">
        <p>No hay comandas ${currentFilter !== 'todas' ? 'con estado: ' + currentFilter : 'registradas aún'}.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const status = getNormalizedStatus(order);
    const isBeca = order.cliente_tipo && order.cliente_tipo.toLowerCase().includes('beca');
    const isProgramado = order.tipo_entrega === 'PROGRAMADA';
    const items = Array.isArray(order.items) ? order.items : [];
    const timeFormatted = new Date(order.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusLabel = 'Pendiente';
    let statusClass = 'status-pendiente';
    let nextActionBtn = '';

    if (status === 'pendiente') {
      statusLabel = 'Pendiente';
      statusClass = 'status-pendiente';
      nextActionBtn = `<button class="btn-vendor-action btn-action-prep" onclick="changeOrderStatus(${order.id}, 'En Preparación')">☕ Iniciar Preparación</button>`;
    } else if (status === 'preparacion') {
      statusLabel = 'En Preparación';
      statusClass = 'status-preparacion';
      nextActionBtn = `<button class="btn-vendor-action btn-action-ready" onclick="changeOrderStatus(${order.id}, 'Lista')">✓ Marcar Lista</button>`;
    } else if (status === 'lista') {
      statusLabel = 'Lista para Entrega';
      statusClass = 'status-lista';
      nextActionBtn = `<button class="btn-vendor-action btn-action-done" onclick="changeOrderStatus(${order.id}, 'Completada')">🎉 Entregar al Alumno</button>`;
    } else {
      statusLabel = 'Completada';
      statusClass = 'status-completada';
      nextActionBtn = `<span class="order-finished-text">✓ Entregada</span>`;
    }

    const folioText = order.folio || order.numero_orden;

    return `
      <article class="vendor-order-card ${statusClass}-border ${isProgramado ? 'is-scheduled-card' : ''}">
        <div class="vendor-order-header">
          <div>
            <span class="order-folio-badge">${folioText}</span>
            <span class="order-time-text">⏱ ${timeFormatted}</span>
          </div>
          <span class="vendor-status-pill ${statusClass}">${statusLabel}</span>
        </div>

        <div class="vendor-delivery-badge-row">
          ${isProgramado 
            ? `<span class="badge-scheduled">⏰ Programado: ${order.hora_entrega || 'Hora pactada'}</span>`
            : `<span class="badge-immediate">⚡ Entrega Inmediata</span>`
          }
          ${order.cliente_nombre ? `<span class="badge-client-name">👤 ${order.cliente_nombre}</span>` : ''}
        </div>

        <div class="vendor-client-meta">
          <span class="meta-tag ${isBeca ? 'meta-beca' : 'meta-general'}">${order.cliente_tipo || 'General'}</span>
          <span class="meta-tag meta-payment">${order.metodo_pago}</span>
          ${order.cliente_matricula ? `<span class="meta-tag meta-matricula">ID: ${order.cliente_matricula}</span>` : ''}
        </div>

        ${order.notas ? `<div class="vendor-order-notes"><strong>Nota:</strong> ${order.notas}</div>` : ''}

        <div class="vendor-order-items">
          ${items.map(it => {
            const mods = Array.isArray(it.modificadores) && it.modificadores.length > 0
              ? `<div class="vendor-item-mods">${it.modificadores.map(m => `<span class="mod-pill">${m}</span>`).join('')}</div>`
              : '';
            return `
              <div class="vendor-item-line">
                <div class="vendor-item-main-desc">
                  <span class="vendor-item-qty">${it.cantidad}x</span>
                  <span class="vendor-item-name">${it.nombre || it.nombre_producto}</span>
                  ${mods}
                </div>
                <span class="vendor-item-price">$${(parseFloat(it.precio || it.precio_unitario || 0) * parseInt(it.cantidad || 1, 10)).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="vendor-order-footer">
          <div class="vendor-total-box">
            <span class="vendor-total-label">Total:</span>
            <span class="vendor-total-val">$${parseFloat(order.total).toFixed(2)}</span>
          </div>
          <div class="vendor-action-wrap">
            ${nextActionBtn}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newStatus })
    });
    if (!res.ok) throw new Error('No se pudo actualizar el estado');
    showToast(`Orden actualizada: ${newStatus}`);
    fetchOrders();
  } catch (err) {
    showToast('Error al cambiar estado de orden');
  }
}

function renderProducts() {
  const container = document.getElementById('vendor-menu-grid');
  const searchInput = document.getElementById('menu-search-input');
  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let list = [...allProducts];

  if (selectedMenuCategory !== 'todos') {
    list = list.filter(p => p.categoria === selectedMenuCategory);
  }

  if (query) {
    list = list.filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
      (p.categoria && p.categoria.toLowerCase().includes(query))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-products">
        <p>No se encontraron productos en esta categoría o búsqueda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(prod => `
    <div class="vendor-product-card ${prod.disponible ? 'is-available' : 'is-unavailable'}">
      <div class="vendor-prod-info">
        <div class="vendor-prod-header">
          <span class="badge ${prod.badge_class || 'badge-cafe'}">${prod.categoria_nombre || prod.categoria || 'Menú'}</span>
          <span class="vendor-prod-price">$${parseFloat(prod.precio).toFixed(2)}</span>
        </div>
        <h4 class="vendor-prod-name">${prod.nombre}</h4>
        <p class="product-desc">${prod.descripcion || ''}</p>
      </div>
      <div class="vendor-prod-bottom-bar">
        <button 
          class="btn-toggle-availability ${prod.disponible ? 'btn-is-on' : 'btn-is-off'}" 
          onclick="toggleProductStock(${prod.id})"
          title="Cambiar disponibilidad en tienda"
        >
          ${prod.disponible ? '✓ Disponible' : '✕ Agotado'}
        </button>
        <div class="vendor-crud-btns">
          <button class="btn-vendor-edit" onclick="openEditProductModal(${prod.id})" title="Editar producto">✏️ Editar</button>
          <button class="btn-vendor-delete" onclick="handleDeleteProduct(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}')" title="Eliminar producto">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleProductStock(productId) {
  try {
    const res = await fetch(`${API_BASE}/products/${productId}/toggle`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Error al actualizar disponibilidad');
    const data = await res.json();
    showToast(data.product.disponible ? 'Producto disponible' : 'Producto marcado como agotado');
    fetchProducts();
  } catch (err) {
    showToast('Error al modificar producto');
  }
}

function openNewProductModal() {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-product-title');
  const form = document.getElementById('product-form');
  if (!modal || !form) return;

  title.textContent = 'Agregar Producto al Catálogo';
  form.reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-disponible').checked = true;
  modal.classList.add('active');
}

function openEditProductModal(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-product-title');
  if (!modal) return;

  title.textContent = 'Editar Producto';
  document.getElementById('prod-id').value = prod.id;
  document.getElementById('prod-name').value = prod.nombre;
  document.getElementById('prod-category').value = prod.categoria_id || 1;
  document.getElementById('prod-price').value = prod.precio;
  document.getElementById('prod-desc').value = prod.descripcion || '';
  document.getElementById('prod-disponible').checked = prod.disponible;

  modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.remove('active');
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-name').value.trim();
  const categoria_id = parseInt(document.getElementById('prod-category').value, 10);
  const precio = parseFloat(document.getElementById('prod-price').value);
  const descripcion = document.getElementById('prod-desc').value.trim();
  const disponible = document.getElementById('prod-disponible').checked;

  if (!nombre || isNaN(precio)) {
    showToast('Por favor completa los campos requeridos');
    return;
  }

  const payload = { nombre, categoria_id, precio, descripcion, disponible };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) throw new Error('Error al guardar el producto');

    showToast(id ? 'Producto actualizado correctamente' : 'Producto agregado al catálogo');
    closeProductModal();
    fetchProducts();
  } catch (err) {
    showToast('No se pudo guardar el producto');
  }
}

async function handleDeleteProduct(id, name) {
  if (!confirm(`¿Deseas eliminar permanentemente "${name}" del catálogo?`)) return;

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar');

    showToast(`Producto "${name}" eliminado`);
    fetchProducts();
  } catch (err) {
    showToast('No se pudo eliminar el producto');
  }
}

function renderCaja() {
  const totalVentasEl = document.getElementById('caja-total-ventas');
  const totalOrdenesEl = document.getElementById('caja-total-ordenes');
  const totalBecasEl = document.getElementById('caja-total-becas');
  const methodsListEl = document.getElementById('caja-methods-list');

  const totalVentas = allOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const totalBecas = allOrders.filter(o => o.cliente_tipo && o.cliente_tipo.toLowerCase().includes('beca')).length;

  if (totalVentasEl) totalVentasEl.textContent = `$${totalVentas.toFixed(2)}`;
  if (totalOrdenesEl) totalOrdenesEl.textContent = allOrders.length;
  if (totalBecasEl) totalBecasEl.textContent = totalBecas;

  if (!methodsListEl) return;

  const methodsMap = {};
  allOrders.forEach(o => {
    const m = o.metodo_pago || 'Efectivo';
    if (!methodsMap[m]) {
      methodsMap[m] = { count: 0, total: 0 };
    }
    methodsMap[m].count += 1;
    methodsMap[m].total += parseFloat(o.total || 0);
  });

  const methodKeys = Object.keys(methodsMap);
  if (methodKeys.length === 0) {
    methodsListEl.innerHTML = '<div class="empty-orders-state"><p>No se han registrado cobros en el turno.</p></div>';
    return;
  }

  methodsListEl.innerHTML = methodKeys.map(k => `
    <div class="caja-method-row">
      <div class="caja-method-info">
        <span class="caja-method-name">${k}</span>
        <span class="caja-method-count">${methodsMap[k].count} transacciones</span>
      </div>
      <span class="caja-method-amount">$${methodsMap[k].total.toFixed(2)}</span>
    </div>
  `).join('');
}

function setupVendorTabs() {
  const tabButtons = document.querySelectorAll('.vendor-nav-tabs .vendor-tab-btn');
  const tabContents = document.querySelectorAll('.vendor-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      const target = document.getElementById(`tab-${activeTab}`);
      if (target) target.classList.add('active');

      if (activeTab === 'menu') {
        renderProducts();
        fetchProducts();
      } else if (activeTab === 'caja') {
        renderCaja();
        fetchOrders();
      } else if (activeTab === 'comandas') {
        renderOrders();
        fetchOrders();
      }
    });
  });

  const filterButtons = document.querySelectorAll('.order-filter-group .btn-filter-status');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.status;
      renderOrders();
    });
  });

  const categoryButtons = document.querySelectorAll('.vendor-category-nav .btn-category');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMenuCategory = btn.dataset.category || 'todos';
      renderProducts();
    });
  });

  const btnRefresh = document.getElementById('btn-manual-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (activeTab === 'menu') {
        fetchProducts();
      } else {
        fetchOrders();
      }
      showToast('Datos actualizados');
    });
  }

  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProducts();
    });
  }

  const btnNewProd = document.getElementById('btn-open-new-product');
  if (btnNewProd) {
    btnNewProd.addEventListener('click', openNewProductModal);
  }

  const btnCloseModal = document.getElementById('btn-close-product-modal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeProductModal);
  }

  const btnCancelModal = document.getElementById('btn-cancel-product');
  if (btnCancelModal) {
    btnCancelModal.addEventListener('click', closeProductModal);
  }

  const prodForm = document.getElementById('product-form');
  if (prodForm) {
    prodForm.addEventListener('submit', handleProductFormSubmit);
  }

  const modalOverlay = document.getElementById('product-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeProductModal();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupVendorTabs();
  fetchOrders();
  fetchProducts();

  autoRefreshTimer = setInterval(() => {
    if (activeTab === 'comandas') {
      fetchOrders();
    }
  }, 6000);
});
