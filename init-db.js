const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const dbName = process.env.PGDATABASE || 'ponycafe';

  const defaultClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres'
  });

  try {
    await defaultClient.connect();
    const checkDb = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      await defaultClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Base de datos '${dbName}' creada con éxito.`);
    } else {
      console.log(`La base de datos '${dbName}' ya existe.`);
    }
  } catch (err) {
    console.error('Error al verificar base de datos base:', err.message);
  } finally {
    await defaultClient.end();
  }

  const appClient = new Client({
    host,
    port,
    user,
    password,
    database: dbName
  });

  try {
    await appClient.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await appClient.query(schemaSql);
    console.log('Tablas y datos iniciales de PonyCafe configurados correctamente.');
  } catch (err) {
    console.error('Error al aplicar el esquema:', err.message);
  } finally {
    await appClient.end();
  }
}

run();

