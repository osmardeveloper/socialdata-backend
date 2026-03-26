/**
 * sqlite/db.sqlite.js
 * Inicializa la base de datos SQLite local con todas las tablas necesarias.
 * Usa better-sqlite3 (síncrono, liviano, ideal para offline-first).
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Directorio de datos local
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'socialdata.sqlite');
const db = new Database(DB_PATH);

// Activar WAL para mejor rendimiento concurrente
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────
// CREACIÓN DE TABLAS
// ─────────────────────────────────────────

db.exec(`
  -- Tabla: usuarios_staff (encuestadores / administradores)
  CREATE TABLE IF NOT EXISTS usuarios_staff (
    id          TEXT PRIMARY KEY,           -- UUID
    mongo_id    TEXT UNIQUE,               -- _id de MongoDB (sync)
    nombre      TEXT NOT NULL,
    usuario     TEXT NOT NULL UNIQUE,
    rol         TEXT NOT NULL DEFAULT 'encuestador',
    password    TEXT NOT NULL,
    is_synced   INTEGER NOT NULL DEFAULT 0, -- 0 = pendiente, 1 = sincronizado
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: usuarios (población caracterizada)
  CREATE TABLE IF NOT EXISTS usuarios (
    id                TEXT PRIMARY KEY,
    mongo_id          TEXT UNIQUE,
    tipo_documento    TEXT NOT NULL,
    numero_documento  TEXT NOT NULL UNIQUE,
    nombre            TEXT NOT NULL,
    apellido          TEXT NOT NULL,
    direccion         TEXT NOT NULL,
    telefono          TEXT NOT NULL,
    correo            TEXT,
    fecha_nacimiento  TEXT NOT NULL,
    edad              INTEGER,                   -- Nuevo campo
    grupo_familiar_id TEXT,                     -- Nuevo campo
    is_synced         INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: preguntas
  CREATE TABLE IF NOT EXISTS preguntas (
    id          TEXT PRIMARY KEY,
    mongo_id    TEXT UNIQUE,
    detalles    TEXT NOT NULL,              -- JSON serializado
    is_synced   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: formularios_personalizados
  CREATE TABLE IF NOT EXISTS formularios_personalizados (
    id          TEXT PRIMARY KEY,
    mongo_id    TEXT UNIQUE,
    titulo      TEXT NOT NULL,
    preguntas   TEXT NOT NULL,              -- JSON: array de IDs de preguntas
    is_synced   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: encuestas_realizadas
  CREATE TABLE IF NOT EXISTS encuestas_realizadas (
    id              TEXT PRIMARY KEY,
    mongo_id        TEXT UNIQUE,
    formulario_id   TEXT NOT NULL,          -- UUID local o mongo_id
    usuario_id      TEXT NOT NULL,          -- UUID local o mongo_id
    encuestador_id  TEXT NOT NULL,          -- UUID local o mongo_id
    respuestas      TEXT NOT NULL,          -- JSON serializado
    fecha           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    is_synced       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: grupos_familiares
  CREATE TABLE IF NOT EXISTS grupos_familiares (
    id                    TEXT PRIMARY KEY,
    mongo_id              TEXT UNIQUE,
    nombre_familia        TEXT NOT NULL,
    codigo_identificador  TEXT NOT NULL UNIQUE,
    miembros              TEXT NOT NULL,              -- JSON: array de IDs de usuarios
    is_synced             INTEGER NOT NULL DEFAULT 0,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Tabla: cola de sincronización (registro de errores / reintentos)
  CREATE TABLE IF NOT EXISTS sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entity      TEXT NOT NULL,              -- 'usuarios', 'encuestas', etc.
    entity_id   TEXT NOT NULL,              -- UUID local del registro
    action      TEXT NOT NULL,              -- 'create' | 'update'
    payload     TEXT NOT NULL,              -- JSON con los datos
    retries     INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// MIGRACIÓN: Intentar añadir columna 'edad' si no existe (para DBs existentes)
try {
  db.prepare('ALTER TABLE usuarios ADD COLUMN edad INTEGER').run();
  console.log('[SQLite Migrations] Columna "edad" añadida a la tabla "usuarios"');
} catch (e) {
  // Si ya existe la columna, tirará error 'duplicate column name: edad'
}

console.log(`[SQLite] Base de datos lista en: ${DB_PATH}`);

module.exports = db;
