# PonyCafe - Sistema POS Universitario con PostgreSQL

Sistema web de Punto de Venta (POS) para cafetería universitaria con backend Node.js y base de datos PostgreSQL.

## Estructura del Proyecto

- `index.html`: Panel principal y dashboard del POS con métricas y accesos directos.
- `catalog.html`: Catálogo de productos interactivo con filtro por categorías y búsqueda.
- `cart.html`: Carrito de compras, cálculo de descuento estudiantil, impuestos y cobro.
- `styles.css`: Estilos visuales con la paleta de colores de PonyCafe.
- `app.js`: Lógica del cliente, manejo de carrito en localStorage y consumo de API.
- `server.js`: Servidor Express con endpoints REST para el POS.
- `db.js`: Módulo de conexión con PostgreSQL (pg.Pool) y persistencia.
- `schema.sql`: Script DDL y DML para PostgreSQL.
- `init-db.js`: Script de inicialización automática de la base de datos.
- `.env`: Variables de entorno para conexión a la base de datos y puerto.

## Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)

## Configuración y Ejecución

1. Configurar las credenciales en el archivo `.env`:
   ```env
   PORT=3000
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=tu_contraseña
   PGDATABASE=ponycafe
   ```

2. Inicializar la base de datos en PostgreSQL:
   ```bash
   npm run init-db
   ```
   O importar directamente `schema.sql` en `psql` o pgAdmin:
   ```bash
   psql -U postgres -d postgres -c "CREATE DATABASE ponycafe;"
   psql -U postgres -d ponycafe -f schema.sql
   ```

3. Iniciar el servidor:
   ```bash
   npm start
   ```

4. Abrir en el navegador:
   http://localhost:3000
