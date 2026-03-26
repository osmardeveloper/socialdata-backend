/**
 * sqlite/models/sqliteStaff.js
 * Modelo SQLite para la tabla 'usuarios_staff' (personal administrativo/encuestadores).
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const now = () => new Date().toISOString();

const StaffSQLite = {
  // Crear un nuevo staff (incluye hash de contraseña manual para SQLite)
  async create(data) {
    const id = data.id || uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash(data.password, salt);
    const timestamp = now();

    const stmt = db.prepare(`
      INSERT INTO usuarios_staff (
        id, mongo_id, nombre, usuario, rol, password, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @nombre, @usuario, @rol, @password, @is_synced, @created_at, @updated_at
      )
    `);

    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      nombre: data.nombre,
      usuario: data.usuario,
      rol: data.rol || 'encuestador',
      password: hashedPw,
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return this.findById(id);
  },

  // Obtener todo el staff
  findAll() {
    return db.prepare('SELECT id, mongo_id, nombre, usuario, rol, is_synced, created_at, updated_at FROM usuarios_staff ORDER BY created_at DESC').all();
  },

  // Buscar por ID local (UUID) o Mongo ID
  findById(id) {
    return db.prepare('SELECT * FROM usuarios_staff WHERE id = ? OR mongo_id = ?').get(id, id);
  },

  // Buscar por nombre de usuario (para login)
  findByUsuario(usuario) {
    return db.prepare('SELECT * FROM usuarios_staff WHERE usuario = ?').get(usuario);
  },

  // Actualizar staff (con manejo de contraseña opcional)
  async update(id, data) {
    const s = this.findById(id);
    if (!s) return null;

    const updates = { ...data, updated_at: now(), id: s.id };
    
    // Si hay password nuevo, hashearlo
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(data.password, salt);
    }

    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');

    db.prepare(`UPDATE usuarios_staff SET ${setClause} WHERE id = @id`).run(updates);
    
    return this.findById(s.id);
  },

  // Guardar en caché desde Mongo (usado en login online)
  upsertFromMongo(mongoUser, passwordHashed) {
    const existing = db.prepare('SELECT id FROM usuarios_staff WHERE mongo_id = ?').get(mongoUser._id.toString());
    const timestamp = now();

    if (existing) {
      db.prepare(`
        UPDATE usuarios_staff 
        SET nombre = @nombre, usuario = @usuario, rol = @rol, password = @password, is_synced = 1, updated_at = @updated_at 
        WHERE id = @id
      `).run({
        id: existing.id,
        nombre: mongoUser.nombre,
        usuario: mongoUser.usuario,
        rol: mongoUser.rol,
        password: passwordHashed,
        updated_at: timestamp
      });
    } else {
      db.prepare(`
        INSERT INTO usuarios_staff (id, mongo_id, nombre, usuario, rol, password, is_synced, created_at, updated_at)
        VALUES (@id, @mongo_id, @nombre, @usuario, @rol, @password, 1, @created_at, @updated_at)
      `).run({
        id: uuidv4(),
        mongo_id: mongoUser._id.toString(),
        nombre: mongoUser.nombre,
        usuario: mongoUser.usuario,
        rol: mongoUser.rol,
        password: passwordHashed,
        created_at: timestamp,
        updated_at: timestamp
      });
    }
  },

  delete(id) {
    const s = this.findById(id);
    if (s) db.prepare('DELETE FROM usuarios_staff WHERE id = ?').run(s.id);
  }
};

module.exports = StaffSQLite;
