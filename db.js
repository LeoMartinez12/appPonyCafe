const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'ponycafe',
  connectionTimeoutMillis: 3000
});

let isConnected = false;

const initialCategories = [
  { id: 1, nombre: 'Café', codigo: 'cafe', badge_class: 'badge-cafe' },
  { id: 2, nombre: 'Panadería', codigo: 'panaderia', badge_class: 'badge-panaderia' },
  { id: 3, nombre: 'Bebidas', codigo: 'bebidas', badge_class: 'badge-bebidas' },
  { id: 4, nombre: 'Snacks', codigo: 'snacks', badge_class: 'badge-cafe' }
];

const initialProducts = [
  { id: 1, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', nombre: 'Americano 12oz', descripcion: 'Espresso doble diluido en agua caliente.', precio: 30.00, disponible: true },
  { id: 2, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', nombre: 'Capuchino Vainilla', descripcion: 'Espresso, leche vaporizada y vainilla.', precio: 45.00, disponible: true },
  { id: 3, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', nombre: 'Latte Caramelo', descripcion: 'Espresso suave con leche cremosa y jarabe de caramelo.', precio: 48.00, disponible: true },
  { id: 4, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', nombre: 'Espresso Doble', descripcion: 'Extracción pura y concentrada de grano tostado obscuro.', precio: 32.00, disponible: true },
  { id: 5, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', nombre: 'Muffin de Mora', descripcion: 'Muffin esponjoso relleno de moras silvestres.', precio: 35.00, disponible: true },
  { id: 6, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', nombre: 'Croissant Francés', descripcion: 'Hojaldre crujiente horneado con mantequilla premium.', precio: 38.00, disponible: true },
  { id: 7, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', nombre: 'Bagel con Queso Crema', descripcion: 'Bagel artesanal tostado con queso crema suave.', precio: 42.00, disponible: true },
  { id: 8, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', nombre: 'Té Chai Frío', descripcion: 'Infusión de especias chai con leche e hielo.', precio: 50.00, disponible: true },
  { id: 9, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', nombre: 'Frappé Moka', descripcion: 'Café batido con chocolate, leche, hielo y crema batida.', precio: 55.00, disponible: true },
  { id: 10, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', nombre: 'Matcha Latte Helado', descripcion: 'Té verde matcha japonés batido con leche vegetal.', precio: 52.00, disponible: true },
  { id: 11, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', nombre: 'Jugo Verde Natural', descripcion: 'Espinaca, piña, apio y jugo de naranja recién exprimido.', precio: 40.00, disponible: true },
  { id: 12, categoria_id: 4, categoria: 'snacks', badge_class: 'badge-cafe', nombre: 'Galleta con Chispas', descripcion: 'Galleta suave horneada con chispas de chocolate.', precio: 25.00, disponible: true }
];

let fallbackOrders = [];

async function initDb() {
  try {
    const client = await pool.connect();
    isConnected = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        badge_class VARCHAR(50) DEFAULT 'badge-cafe'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
        disponible BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ordenes (
        id SERIAL PRIMARY KEY,
        numero_orden VARCHAR(20) NOT NULL UNIQUE,
        cliente_tipo VARCHAR(50) DEFAULT 'Estudiante',
        metodo_pago VARCHAR(50) NOT NULL,
        notas TEXT,
        subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
        descuento NUMERIC(10, 2) DEFAULT 0 CHECK (descuento >= 0),
        impuestos NUMERIC(10, 2) NOT NULL CHECK (impuestos >= 0),
        total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
        estado VARCHAR(30) DEFAULT 'Completada',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_orden (
        id SERIAL PRIMARY KEY,
        orden_id INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
        nombre_producto VARCHAR(100) NOT NULL,
        cantidad INTEGER NOT NULL CHECK (cantidad > 0),
        precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
        subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
        notas TEXT
      );
    `);

    const catCheck = await client.query('SELECT COUNT(*) FROM categorias');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      for (const cat of initialCategories) {
        await client.query(
          'INSERT INTO categorias (nombre, codigo, badge_class) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [cat.nombre, cat.codigo, cat.badge_class]
        );
      }
    }

    const prodCheck = await client.query('SELECT COUNT(*) FROM productos');
    if (parseInt(prodCheck.rows[0].count, 10) === 0) {
      for (const prod of initialProducts) {
        await client.query(
          'INSERT INTO productos (categoria_id, nombre, descripcion, precio, disponible) VALUES ($1, $2, $3, $4, $5)',
          [prod.categoria_id, prod.nombre, prod.descripcion, prod.precio, prod.disponible]
        );
      }
    }

    client.release();
    return true;
  } catch (err) {
    isConnected = false;
    return false;
  }
}

async function getCategories() {
  if (isConnected) {
    try {
      const res = await pool.query('SELECT * FROM categorias ORDER BY id ASC');
      return res.rows;
    } catch {
      return initialCategories;
    }
  }
  return initialCategories;
}

async function getProducts(category, search) {
  if (isConnected) {
    try {
      let query = `
        SELECT p.id, p.nombre, p.descripcion, p.precio::float, p.disponible, 
               c.codigo as categoria, c.badge_class, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.disponible = true
      `;
      const params = [];

      if (category && category !== 'todos') {
        params.push(category);
        query += ` AND c.codigo = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (LOWER(p.nombre) LIKE LOWER($${params.length}) OR LOWER(p.descripcion) LIKE LOWER($${params.length}))`;
      }

      query += ' ORDER BY p.id ASC';
      const res = await pool.query(query, params);
      return res.rows;
    } catch {
      return filterFallbackProducts(category, search);
    }
  }
  return filterFallbackProducts(category, search);
}

function filterFallbackProducts(category, search) {
  let list = [...initialProducts];
  if (category && category !== 'todos') {
    list = list.filter(p => p.categoria === category);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.nombre.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s));
  }
  return list;
}

async function createOrder(orderData) {
  const { cliente_tipo, metodo_pago, notas, subtotal, descuento, impuestos, total, items } = orderData;
  const numero_orden = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

  if (isConnected) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderInsert = await client.query(
        `INSERT INTO ordenes (numero_orden, cliente_tipo, metodo_pago, notas, subtotal, descuento, impuestos, total, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Completada')
         RETURNING *`,
        [numero_orden, cliente_tipo || 'Estudiante', metodo_pago, notas || '', subtotal, descuento || 0, impuestos, total]
      );
      const createdOrder = orderInsert.rows[0];

      if (Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO detalle_orden (orden_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [createdOrder.id, item.id || null, item.nombre, item.cantidad, item.precio, item.subtotal || (item.precio * item.cantidad), item.notas || '']
          );
        }
      }

      await client.query('COMMIT');
      client.release();
      return { success: true, order: createdOrder };
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      throw err;
    }
  }

  const fallbackOrder = {
    id: fallbackOrders.length + 1,
    numero_orden,
    cliente_tipo: cliente_tipo || 'Estudiante',
    metodo_pago,
    notas: notas || '',
    subtotal,
    descuento: descuento || 0,
    impuestos,
    total,
    estado: 'Completada',
    creado_en: new Date().toISOString(),
    items: items || []
  };
  fallbackOrders.unshift(fallbackOrder);
  return { success: true, order: fallbackOrder };
}

async function getOrders() {
  if (isConnected) {
    try {
      const res = await pool.query('SELECT * FROM ordenes ORDER BY creado_en DESC LIMIT 20');
      return res.rows;
    } catch {
      return fallbackOrders;
    }
  }
  return fallbackOrders;
}

async function getStats() {
  if (isConnected) {
    try {
      const countRes = await pool.query('SELECT COUNT(*) as total_ordenes, COALESCE(SUM(total), 0) as total_ventas FROM ordenes');
      const prodRes = await pool.query('SELECT COUNT(*) as total_productos FROM productos WHERE disponible = true');
      return {
        total_ordenes: parseInt(countRes.rows[0].total_ordenes, 10),
        total_ventas: parseFloat(countRes.rows[0].total_ventas).toFixed(2),
        total_productos: parseInt(prodRes.rows[0].total_productos, 10),
        postgres_conectado: true
      };
    } catch {
      return getFallbackStats();
    }
  }
  return getFallbackStats();
}

function getFallbackStats() {
  const totalVentas = fallbackOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  return {
    total_ordenes: fallbackOrders.length,
    total_ventas: totalVentas.toFixed(2),
    total_productos: initialProducts.length,
    postgres_conectado: false
  };
}

module.exports = {
  pool,
  initDb,
  getCategories,
  getProducts,
  createOrder,
  getOrders,
  getStats,
  getConnectionStatus: () => isConnected
};

