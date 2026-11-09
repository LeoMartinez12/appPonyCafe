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

app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const products = await db.getProducts(category, search);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { cliente_tipo, metodo_pago, notas, subtotal, descuento, impuestos, total, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La orden no tiene productos' });
    }

    const result = await db.createOrder({
      cliente_tipo,
      metodo_pago: metodo_pago || 'Efectivo',
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
