CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    badge_class VARCHAR(50) DEFAULT 'badge-cafe'
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS cuentas_ponypay (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nombre_estudiante VARCHAR(120) NOT NULL,
    saldo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tiene_beca BOOLEAN NOT NULL DEFAULT FALSE,
    ultima_beca_fecha DATE DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categorias (nombre, codigo, badge_class) VALUES
('Café', 'cafe', 'badge-cafe'),
('Panadería', 'panaderia', 'badge-panaderia'),
('Bebidas', 'bebidas', 'badge-bebidas'),
('Snacks', 'snacks', 'badge-cafe')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO productos (categoria_id, nombre, descripcion, precio, disponible) VALUES
(1, 'Americano 12oz', 'Espresso doble diluido en agua caliente.', 30.00, true),
(1, 'Capuchino Vainilla', 'Espresso, leche vaporizada y vainilla.', 45.00, true),
(1, 'Latte Caramelo', 'Espresso suave con leche cremosa y jarabe de caramelo artesanal.', 48.00, true),
(1, 'Espresso Doble', 'Extracción pura y concentrada de grano tostado obscuro.', 32.00, true),
(2, 'Muffin de Mora', 'Muffin esponjoso relleno de moras silvestres.', 35.00, true),
(2, 'Croissant Francés', 'Hojaldre crujiente horneado con mantequilla premium.', 38.00, true),
(2, 'Bagel con Queso Crema', 'Bagel artesanal tostado con queso crema suave.', 42.00, true),
(3, 'Té Chai Frío', 'Infusión de especias chai con leche e hielo.', 50.00, true),
(3, 'Frappé Moka', 'Café batido con chocolate, leche, hielo y crema batida.', 55.00, true),
(3, 'Matcha Latte Helado', 'Té verde matcha japonés batido con leche vegetal.', 52.00, true),
(3, 'Jugo Verde Natural', 'Espinaca, piña, apio y jugo de naranja recién exprimido.', 40.00, true),
(4, 'Galleta con Chispas', 'Galleta suave horneada con chispas de chocolate semiamargo.', 25.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO cuentas_ponypay (matricula, nombre_estudiante, saldo, tiene_beca) VALUES
('2024TEST', 'Juan Pablo Pérez', 250.00, true),
('2024BECA', 'Ana Sofía Rodríguez', 180.00, true),
('2024PONY', 'Carlos Mendoza', 300.00, false)
ON CONFLICT (matricula) DO NOTHING;
