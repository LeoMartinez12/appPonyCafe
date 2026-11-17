const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    postgres_conectado: db.getConnectionStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ponypay/:matricula', async (req, res) => {
  try {
    const { matricula } = req.params;
    const account = await db.getPonyAccount(matricula);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Matrícula no registrada en PonyPay' });
    }
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, all } = req.query;
    const products = await db.getProducts(category, search, all === 'true');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nombre, categoria_id, descripcion, precio, disponible } = req.body;
    if (!nombre || !precio) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    const result = await db.createProduct({
      nombre,
      categoria_id,
      descripcion,
      precio,
      disponible: disponible !== undefined ? disponible : true
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria_id, descripcion, precio, disponible } = req.body;
    const result = await db.updateProduct(id, {
      nombre,
      categoria_id,
      descripcion,
      precio,
      disponible
    });
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.deleteProduct(id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const result = await db.updateOrderStatus(id, estado);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.toggleProductAvailability(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
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
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La orden no tiene productos' });
    }

    const result = await db.createOrder({
      cliente_nombre,
      cliente_matricula,
      cliente_tipo,
      metodo_pago: metodo_pago || 'Efectivo',
      tipo_entrega,
      hora_entrega,
      notas,
      subtotal: parseFloat(subtotal) || 0,
      descuento: parseFloat(descuento) || 0,
      impuestos: parseFloat(impuestos) || 0,
      total: parseFloat(total) || 0,
      items
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/track/:folio', async (req, res) => {
  try {
    const { folio } = req.params;
    const order = await db.getOrderByFolio(folio);
    if (!order) {
      return res.status(404).json({ success: false, error: 'No se encontró ninguna orden con ese folio' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log('Servidor PonyCafe corriendo en el puerto ' + PORT);
  await db.initDb();
});
