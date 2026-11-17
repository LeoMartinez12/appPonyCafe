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

let fallbackProducts = [
  { id: 1, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', categoria_nombre: 'Café', nombre: 'Americano 12oz', descripcion: 'Espresso doble diluido en agua caliente.', precio: 30.00, disponible: true },
  { id: 2, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', categoria_nombre: 'Café', nombre: 'Capuchino Vainilla', descripcion: 'Espresso, leche vaporizada y vainilla.', precio: 45.00, disponible: true },
  { id: 3, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', categoria_nombre: 'Café', nombre: 'Latte Caramelo', descripcion: 'Espresso suave con leche cremosa y jarabe de caramelo.', precio: 48.00, disponible: true },
  { id: 4, categoria_id: 1, categoria: 'cafe', badge_class: 'badge-cafe', categoria_nombre: 'Café', nombre: 'Espresso Doble', descripcion: 'Extracción pura y concentrada de grano tostado obscuro.', precio: 32.00, disponible: true },
  { id: 5, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', categoria_nombre: 'Panadería', nombre: 'Muffin de Mora', descripcion: 'Muffin esponjoso relleno de moras silvestres.', precio: 35.00, disponible: true },
  { id: 6, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', categoria_nombre: 'Panadería', nombre: 'Croissant Francés', descripcion: 'Hojaldre crujiente horneado con mantequilla premium.', precio: 38.00, disponible: true },
  { id: 7, categoria_id: 2, categoria: 'panaderia', badge_class: 'badge-panaderia', categoria_nombre: 'Panadería', nombre: 'Bagel con Queso Crema', descripcion: 'Bagel artesanal tostado con queso crema suave.', precio: 42.00, disponible: true },
  { id: 8, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', categoria_nombre: 'Bebidas', nombre: 'Té Chai Frío', descripcion: 'Infusión de especias chai con leche e hielo.', precio: 50.00, disponible: true },
  { id: 9, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', categoria_nombre: 'Bebidas', nombre: 'Frappé Moka', descripcion: 'Café batido con chocolate, leche, hielo y crema batida.', precio: 55.00, disponible: true },
  { id: 10, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', categoria_nombre: 'Bebidas', nombre: 'Matcha Latte Helado', descripcion: 'Té verde matcha japonés batido con leche vegetal.', precio: 52.00, disponible: true },
  { id: 11, categoria_id: 3, categoria: 'bebidas', badge_class: 'badge-bebidas', categoria_nombre: 'Bebidas', nombre: 'Jugo Verde Natural', descripcion: 'Espinaca, piña, apio y jugo de naranja recién exprimido.', precio: 40.00, disponible: true },
  { id: 12, categoria_id: 4, categoria: 'snacks', badge_class: 'badge-cafe', categoria_nombre: 'Snacks', nombre: 'Galleta con Chispas', descripcion: 'Galleta suave horneada con chispas de chocolate.', precio: 25.00, disponible: true }
];

let fallbackOrders = [];
let fallbackPonyAccounts = [
  { id: 1, matricula: '2024TEST', nombre_estudiante: 'Juan Pablo Pérez', saldo: 250.00, tiene_beca: true, ultima_beca_fecha: null },
  { id: 2, matricula: '2024BECA', nombre_estudiante: 'Ana Sofía Rodríguez', saldo: 180.00, tiene_beca: true, ultima_beca_fecha: null },
  { id: 3, matricula: '2024PONY', nombre_estudiante: 'Carlos Mendoza', saldo: 300.00, tiene_beca: false, ultima_beca_fecha: null }
];

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
        folio VARCHAR(20) UNIQUE,
        cliente_nombre VARCHAR(120),
        cliente_matricula VARCHAR(50),
        cliente_tipo VARCHAR(50) DEFAULT 'Estudiante',
        metodo_pago VARCHAR(50) NOT NULL,
        tipo_entrega VARCHAR(20) DEFAULT 'INMEDIATA',
        hora_entrega TIME DEFAULT NULL,
        fecha_entrega DATE DEFAULT CURRENT_DATE,
        notas TEXT,
        subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
        descuento NUMERIC(10, 2) DEFAULT 0 CHECK (descuento >= 0),
        impuestos NUMERIC(10, 2) NOT NULL CHECK (impuestos >= 0),
        total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
        estado VARCHAR(30) DEFAULT 'Pendiente',
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
        notas TEXT,
        modificadores JSONB DEFAULT '[]'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cuentas_ponypay (
        id SERIAL PRIMARY KEY,
        matricula VARCHAR(50) UNIQUE NOT NULL,
        nombre_estudiante VARCHAR(120) NOT NULL,
        saldo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        tiene_beca BOOLEAN NOT NULL DEFAULT FALSE,
        ultima_beca_fecha DATE DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS folio VARCHAR(20) UNIQUE;
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(120);
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS cliente_matricula VARCHAR(50);
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) DEFAULT 'INMEDIATA';
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS hora_entrega TIME DEFAULT NULL;
      ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS fecha_entrega DATE DEFAULT CURRENT_DATE;
      ALTER TABLE detalle_orden ADD COLUMN IF NOT EXISTS modificadores JSONB DEFAULT '[]'::jsonb;
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
      for (const prod of fallbackProducts) {
        await client.query(
          'INSERT INTO productos (categoria_id, nombre, descripcion, precio, disponible) VALUES ($1, $2, $3, $4, $5)',
          [prod.categoria_id, prod.nombre, prod.descripcion, prod.precio, prod.disponible]
        );
      }
    }

    const ponyCheck = await client.query('SELECT COUNT(*) FROM cuentas_ponypay');
    if (parseInt(ponyCheck.rows[0].count, 10) === 0) {
      for (const acc of fallbackPonyAccounts) {
        await client.query(
          'INSERT INTO cuentas_ponypay (matricula, nombre_estudiante, saldo, tiene_beca) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [acc.matricula, acc.nombre_estudiante, acc.saldo, acc.tiene_beca]
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

async function getProducts(category, search, all = false) {
  if (isConnected) {
    try {
      let query = `
        SELECT p.id, p.categoria_id, p.nombre, p.descripcion, p.precio::float, p.disponible, 
               c.codigo as categoria, c.badge_class, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1
      `;
      if (!all) {
        query += ' AND p.disponible = true';
      }
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
      return filterFallbackProducts(category, search, all);
    }
  }
  return filterFallbackProducts(category, search, all);
}

function filterFallbackProducts(category, search, all = false) {
  let list = [...fallbackProducts];
  if (!all) {
    list = list.filter(p => p.disponible);
  }
  if (category && category !== 'todos') {
    list = list.filter(p => p.categoria === category);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.nombre.toLowerCase().includes(s) || (p.descripcion && p.descripcion.toLowerCase().includes(s)));
  }
  return list;
}

async function createProduct(prod) {
  const { categoria_id, nombre, descripcion, precio, disponible } = prod;
  const isDisp = disponible !== undefined ? Boolean(disponible) : true;
  const catId = parseInt(categoria_id, 10) || 1;
  const priceVal = parseFloat(precio) || 0;

  if (isConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO productos (categoria_id, nombre, descripcion, precio, disponible)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, categoria_id, nombre, descripcion, precio::float, disponible`,
        [catId, nombre, descripcion || '', priceVal, isDisp]
      );
      return { success: true, product: res.rows[0] };
    } catch (err) {
      throw err;
    }
  }

  const catObj = initialCategories.find(c => c.id === catId) || initialCategories[0];
  const newProd = {
    id: fallbackProducts.length ? Math.max(...fallbackProducts.map(p => p.id)) + 1 : 1,
    categoria_id: catId,
    categoria: catObj.codigo,
    categoria_nombre: catObj.nombre,
    badge_class: catObj.badge_class,
    nombre,
    descripcion: descripcion || '',
    precio: priceVal,
    disponible: isDisp
  };
  fallbackProducts.push(newProd);
  return { success: true, product: newProd };
}

async function updateProduct(id, prod) {
  const prodId = parseInt(id, 10);
  const { categoria_id, nombre, descripcion, precio, disponible } = prod;

  if (isConnected) {
    try {
      const res = await pool.query(
        `UPDATE productos 
         SET categoria_id = COALESCE($1, categoria_id),
             nombre = COALESCE($2, nombre),
             descripcion = COALESCE($3, descripcion),
             precio = COALESCE($4, precio),
             disponible = COALESCE($5, disponible)
         WHERE id = $6
         RETURNING id, categoria_id, nombre, descripcion, precio::float, disponible`,
        [categoria_id || null, nombre || null, descripcion !== undefined ? descripcion : null, precio !== undefined ? parseFloat(precio) : null, disponible !== undefined ? Boolean(disponible) : null, prodId]
      );
      if (res.rows.length === 0) return { success: false, error: 'Producto no encontrado' };
      return { success: true, product: res.rows[0] };
    } catch (err) {
      throw err;
    }
  }

  const existing = fallbackProducts.find(p => p.id === prodId);
  if (!existing) return { success: false, error: 'Producto no encontrado' };

  if (categoria_id !== undefined) {
    existing.categoria_id = parseInt(categoria_id, 10);
    const catObj = initialCategories.find(c => c.id === existing.categoria_id);
    if (catObj) {
      existing.categoria = catObj.codigo;
      existing.categoria_nombre = catObj.nombre;
      existing.badge_class = catObj.badge_class;
    }
  }
  if (nombre !== undefined) existing.nombre = nombre;
  if (descripcion !== undefined) existing.descripcion = descripcion;
  if (precio !== undefined) existing.precio = parseFloat(precio);
  if (disponible !== undefined) existing.disponible = Boolean(disponible);

  return { success: true, product: existing };
}

async function deleteProduct(id) {
  const prodId = parseInt(id, 10);
  if (isConnected) {
    try {
      const res = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING id', [prodId]);
      if (res.rows.length === 0) return { success: false, error: 'Producto no encontrado' };
      return { success: true, id: prodId };
    } catch (err) {
      throw err;
    }
  }

  const idx = fallbackProducts.findIndex(p => p.id === prodId);
  if (idx === -1) return { success: false, error: 'Producto no encontrado' };
  fallbackProducts.splice(idx, 1);
  return { success: true, id: prodId };
}

async function toggleProductAvailability(id) {
  const prodId = parseInt(id, 10);
  if (isConnected) {
    try {
      const res = await pool.query(
        'UPDATE productos SET disponible = NOT disponible WHERE id = $1 RETURNING id, nombre, precio::float, disponible',
        [prodId]
      );
      return { success: true, product: res.rows[0] };
    } catch (err) {
      throw err;
    }
  }
  const item = fallbackProducts.find(p => p.id === prodId);
  if (item) {
    item.disponible = !item.disponible;
    return { success: true, product: item };
  }
  return { success: false, error: 'Producto no encontrado' };
}

async function getPonyAccount(matricula) {
  const clean = (matricula || '').trim().toUpperCase();
  if (!clean) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  if (isConnected) {
    try {
      const res = await pool.query(
        'SELECT * FROM cuentas_ponypay WHERE UPPER(matricula) = $1 LIMIT 1',
        [clean]
      );
      if (res.rows.length === 0) return null;
      const acc = res.rows[0];
      const ultimaStr = acc.ultima_beca_fecha ? new Date(acc.ultima_beca_fecha).toISOString().slice(0, 10) : null;
      const becaDisponible = Boolean(acc.tiene_beca) && (!ultimaStr || ultimaStr !== todayStr);

      return {
        id: acc.id,
        matricula: acc.matricula,
        nombre: acc.nombre_estudiante,
        saldo: parseFloat(acc.saldo),
        tiene_beca: Boolean(acc.tiene_beca),
        ultima_beca_fecha: ultimaStr,
        beca_disponible_hoy: becaDisponible
      };
    } catch {
      return findFallbackPonyAccount(clean, todayStr);
    }
  }

  return findFallbackPonyAccount(clean, todayStr);
}

function findFallbackPonyAccount(clean, todayStr) {
  const acc = fallbackPonyAccounts.find(a => a.matricula.toUpperCase() === clean);
  if (!acc) return null;
  const ultimaStr = acc.ultima_beca_fecha ? String(acc.ultima_beca_fecha).slice(0, 10) : null;
  const becaDisponible = Boolean(acc.tiene_beca) && (!ultimaStr || ultimaStr !== todayStr);

  return {
    id: acc.id,
    matricula: acc.matricula,
    nombre: acc.nombre_estudiante,
    saldo: parseFloat(acc.saldo),
    tiene_beca: Boolean(acc.tiene_beca),
    ultima_beca_fecha: ultimaStr,
    beca_disponible_hoy: becaDisponible
  };
}

async function createOrder(orderData) {
  const { 
    cliente_nombre, 
    cliente_matricula, 
    cliente_tipo, 
    metodo_pago, 
    tipo_entrega, 
    hora_entrega, 
    notas, 
    subtotal, 
    descuento, 
    impuestos, 
    total, 
    items 
  } = orderData;

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const numero_orden = 'ORD-' + randomNum;
  const folio = 'PC-' + randomNum;
  const isProgramado = tipo_entrega === 'PROGRAMADA';
  const cleanMatricula = (cliente_matricula || '').trim().toUpperCase();
  const isPonyPay = metodo_pago === 'PonyPay';
  const isBeca = (cliente_tipo && cliente_tipo.startsWith('Beca Alimenticia')) || (parseFloat(descuento) > 0);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (isConnected) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let ponyAcc = null;
      if (isPonyPay || isBeca) {
        if (!cleanMatricula) {
          throw new Error('Se requiere la matrícula del estudiante para procesar PonyPay o Beca');
        }
        const accRes = await client.query(
          'SELECT * FROM cuentas_ponypay WHERE UPPER(matricula) = $1 FOR UPDATE',
          [cleanMatricula]
        );
        if (accRes.rows.length === 0) {
          throw new Error(`La matrícula ${cleanMatricula} no está registrada en el sistema universitario`);
        }
        ponyAcc = accRes.rows[0];
      }

      if (isBeca) {
        if (!ponyAcc.tiene_beca) {
          throw new Error(`La matrícula ${cleanMatricula} no cuenta con Beca Alimenticia asignada`);
        }
        const ultimaStr = ponyAcc.ultima_beca_fecha ? new Date(ponyAcc.ultima_beca_fecha).toISOString().slice(0, 10) : null;
        if (ultimaStr === todayStr) {
          throw new Error(`Esta Beca Alimenticia ya fue registrada hoy en el sistema (Límite: 1 por día)`);
        }
        await client.query(
          'UPDATE cuentas_ponypay SET ultima_beca_fecha = CURRENT_DATE WHERE id = $1',
          [ponyAcc.id]
        );
      }

      if (isPonyPay) {
        const saldoActual = parseFloat(ponyAcc.saldo);
        const totalPagar = parseFloat(total);
        if (saldoActual < totalPagar) {
          throw new Error(`Saldo insuficiente en PonyPay. Saldo actual: $${saldoActual.toFixed(2)}, Total: $${totalPagar.toFixed(2)}`);
        }
        await client.query(
          'UPDATE cuentas_ponypay SET saldo = saldo - $1 WHERE id = $2',
          [totalPagar, ponyAcc.id]
        );
      }

      const orderInsert = await client.query(
        `INSERT INTO ordenes (
           numero_orden, folio, cliente_nombre, cliente_matricula, cliente_tipo, 
           metodo_pago, tipo_entrega, hora_entrega, notas, subtotal, descuento, impuestos, total, estado
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Pendiente')
         RETURNING *`,
        [
          numero_orden,
          folio,
          cliente_nombre || (ponyAcc ? ponyAcc.nombre_estudiante : 'Cliente General'),
          cleanMatricula || null,
          cliente_tipo || 'Estudiante',
          metodo_pago,
          isProgramado ? 'PROGRAMADA' : 'INMEDIATA',
          hora_entrega || null,
          notas || '',
          subtotal,
          descuento || 0,
          impuestos || 0,
          total
        ]
      );
      const createdOrder = orderInsert.rows[0];

      if (Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO detalle_orden (orden_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal, notas, modificadores)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              createdOrder.id,
              item.id || null,
              item.nombre,
              item.cantidad,
              item.precio,
              item.subtotal || (item.precio * item.cantidad),
              item.notas || '',
              JSON.stringify(item.modificadores || [])
            ]
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

  let fallbackAcc = null;
  if (isPonyPay || isBeca) {
    if (!cleanMatricula) {
      throw new Error('Se requiere la matrícula del estudiante para procesar PonyPay o Beca');
    }
    fallbackAcc = fallbackPonyAccounts.find(a => a.matricula.toUpperCase() === cleanMatricula);
    if (!fallbackAcc) {
      throw new Error(`La matrícula ${cleanMatricula} no está registrada en el sistema universitario`);
    }
  }

  if (isBeca) {
    if (!fallbackAcc.tiene_beca) {
      throw new Error(`La matrícula ${cleanMatricula} no cuenta con Beca Alimenticia asignada`);
    }
    const ultimaStr = fallbackAcc.ultima_beca_fecha ? String(fallbackAcc.ultima_beca_fecha).slice(0, 10) : null;
    if (ultimaStr === todayStr) {
      throw new Error(`Esta Beca Alimenticia ya fue registrada hoy en el sistema (Límite: 1 por día)`);
    }
    fallbackAcc.ultima_beca_fecha = todayStr;
  }

  if (isPonyPay) {
    const saldoActual = parseFloat(fallbackAcc.saldo);
    const totalPagar = parseFloat(total);
    if (saldoActual < totalPagar) {
      throw new Error(`Saldo insuficiente en PonyPay. Saldo actual: $${saldoActual.toFixed(2)}, Total: $${totalPagar.toFixed(2)}`);
    }
    fallbackAcc.saldo = saldoActual - totalPagar;
  }

  const fallbackOrder = {
    id: fallbackOrders.length + 1,
    numero_orden,
    folio,
    cliente_nombre: cliente_nombre || (fallbackAcc ? fallbackAcc.nombre_estudiante : 'Cliente General'),
    cliente_matricula: cleanMatricula || null,
    cliente_tipo: cliente_tipo || 'General',
    metodo_pago,
    tipo_entrega: isProgramado ? 'PROGRAMADA' : 'INMEDIATA',
    hora_entrega: hora_entrega || null,
    notas: notas || '',
    subtotal,
    descuento: descuento || 0,
    impuestos: 0,
    total,
    estado: 'Pendiente',
    creado_en: new Date().toISOString(),
    items: items || []
  };
  fallbackOrders.unshift(fallbackOrder);
  return { success: true, order: fallbackOrder };
}

async function getOrders() {
  if (isConnected) {
    try {
      const res = await pool.query(`
        SELECT o.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', d.id,
                'nombre', d.nombre_producto,
                'cantidad', d.cantidad,
                'precio', d.precio_unitario,
                'subtotal', d.subtotal,
                'notas', d.notas,
                'modificadores', d.modificadores
              )
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as items
        FROM ordenes o
        LEFT JOIN detalle_orden d ON o.id = d.orden_id
        GROUP BY o.id
        ORDER BY 
          CASE WHEN o.tipo_entrega = 'PROGRAMADA' AND o.estado != 'Completada' THEN 1 ELSE 2 END,
          o.creado_en DESC
        LIMIT 60
      `);
      return res.rows;
    } catch {
      return fallbackOrders;
    }
  }
  return fallbackOrders;
}

async function updateOrderStatus(id, estado) {
  const orderId = parseInt(id, 10);
  if (isConnected) {
    try {
      const res = await pool.query(
        'UPDATE ordenes SET estado = $1 WHERE id = $2 RETURNING *',
        [estado, orderId]
      );
      return { success: true, order: res.rows[0] };
    } catch (err) {
      throw err;
    }
  }
  const item = fallbackOrders.find(o => o.id === orderId);
  if (item) {
    item.estado = estado;
    return { success: true, order: item };
  }
  return { success: false, error: 'Orden no encontrada' };
}

async function getOrderByFolio(folio) {
  const cleanFolio = (folio || '').trim();
  if (!cleanFolio) return null;

  if (isConnected) {
    try {
      const res = await pool.query(`
        SELECT o.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', d.id,
                'nombre', d.nombre_producto,
                'cantidad', d.cantidad,
                'precio', d.precio_unitario,
                'subtotal', d.subtotal,
                'notas', d.notas,
                'modificadores', d.modificadores
              )
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as items
        FROM ordenes o
        LEFT JOIN detalle_orden d ON o.id = d.orden_id
        WHERE UPPER(o.folio) = UPPER($1) OR UPPER(o.numero_orden) = UPPER($1)
        GROUP BY o.id
        LIMIT 1
      `, [cleanFolio]);

      return res.rows.length > 0 ? res.rows[0] : null;
    } catch {
      return findFallbackOrder(cleanFolio);
    }
  }

  return findFallbackOrder(cleanFolio);
}

function findFallbackOrder(folio) {
  const upper = folio.toUpperCase();
  return fallbackOrders.find(o => 
    (o.folio && o.folio.toUpperCase() === upper) || 
    (o.numero_orden && o.numero_orden.toUpperCase() === upper)
  ) || null;
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
  const totalDisponibles = fallbackProducts.filter(p => p.disponible).length;
  return {
    total_ordenes: fallbackOrders.length,
    total_ventas: totalVentas.toFixed(2),
    total_productos: totalDisponibles,
    postgres_conectado: false
  };
}

module.exports = {
  pool,
  initDb,
  getCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrders,
  getOrderByFolio,
  getPonyAccount,
  updateOrderStatus,
  toggleProductAvailability,
  getStats,
  getConnectionStatus: () => isConnected
};
