/**
 * sqlite/models/sqliteUsuario.js
 * Modelo SQLite para la tabla 'usuarios' (población a caracterizar).
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString();

const UsuarioSQLite = {
  // Crear un nuevo usuario
  create(data) {
    const id = data.id || uuidv4();
    const stmt = db.prepare(`
      INSERT INTO usuarios (
        id, mongo_id, tipo_documento, numero_documento, nombre, apellido,
        direccion, telefono, correo, fecha_nacimiento, edad, grupo_familiar_id, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @tipo_documento, @numero_documento, @nombre, @apellido,
        @direccion, @telefono, @correo, @fecha_nacimiento, @edad, @grupo_familiar_id, @is_synced, @created_at, @updated_at
      )
    `);
    const timestamp = now();
    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento,
      nombre: data.nombre,
      apellido: data.apellido,
      direccion: data.direccion,
      telefono: data.telefono,
      correo: data.correo,
      fecha_nacimiento: data.fecha_nacimiento,
      edad: data.edad || null,
      grupo_familiar_id: data.grupo_familiar_id || null,
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return this.findById(id);
  },

  // Obtener todo el personal staff (población)
  findAll() {
    return db.prepare('SELECT * FROM usuarios ORDER BY created_at DESC').all();
  },

  // Buscar por ID local (UUID)
  findById(id) {
    return db.prepare('SELECT * FROM usuarios WHERE id = ? OR mongo_id = ?').get(id, id);
  },

  // Buscar por mongo_id (para comparación al sincronizar)
  findByMongoId(mongoId) {
    return db.prepare('SELECT * FROM usuarios WHERE mongo_id = ?').get(mongoId);
  },

  // Buscar por número de documento
  findByNumeroDocumento(numero) {
    return db.prepare('SELECT * FROM usuarios WHERE numero_documento = ?').get(numero);
  },

  // Actualizar usuario
  update(id, data) {
    const allowed = ['tipo_documento', 'numero_documento', 'nombre', 'apellido',
      'direccion', 'telefono', 'correo', 'fecha_nacimiento', 'edad', 'is_synced', 'mongo_id', 'grupo_familiar_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE usuarios SET ${setClause}, updated_at = @updated_at WHERE id = @id OR mongo_id = @id`)
      .run({ ...data, updated_at: now(), id });
    return this.findById(id);
  },

  // Vincula un usuario a una familia de forma rápida
  updateFamily(userId, familyId) {
    return db.prepare('UPDATE usuarios SET grupo_familiar_id = ?, updated_at = ?, is_synced = 0 WHERE id = ? OR mongo_id = ?')
      .run(familyId, now(), userId, userId);
  },

  // Eliminar usuario
  delete(id) {
    return db.prepare('DELETE FROM usuarios WHERE id = ? OR mongo_id = ?').run(id, id);
  },

  // Obtener pendientes de sincronizar
  findUnsynced() {
    return db.prepare('SELECT * FROM usuarios WHERE is_synced = 0').all();
  },

  // Marcar como sincronizado y guardar mongo_id
  markSynced(id, mongoId) {
    return db.prepare(`
      UPDATE usuarios SET is_synced = 1, mongo_id = ?, updated_at = ? WHERE id = ?
    `).run(mongoId, now(), id);
  },
};

module.exports = UsuarioSQLite;
