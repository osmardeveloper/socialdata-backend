/**
 * sqlite/models/sqliteEncuesta.js
 * Modelo SQLite para la tabla 'encuestas_realizadas'.
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString();

const EncuestaSQLite = {
  create(data) {
    const id = data.id || uuidv4();
    const stmt = db.prepare(`
      INSERT INTO encuestas_realizadas (
        id, mongo_id, formulario_id, usuario_id, encuestador_id,
        respuestas, fecha, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @formulario_id, @usuario_id, @encuestador_id,
        @respuestas, @fecha, @is_synced, @created_at, @updated_at
      )
    `);
    const timestamp = now();
    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      formulario_id: data.formulario_id,
      usuario_id: data.usuario_id,
      encuestador_id: data.encuestador_id,
      respuestas: JSON.stringify(data.respuestas || []),
      fecha: data.fecha || timestamp,
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return this.findById(id);
  },

  findAll() {
    const rows = db.prepare('SELECT * FROM encuestas_realizadas ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, respuestas: JSON.parse(r.respuestas) }));
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM encuestas_realizadas WHERE id = ?').get(id);
    if (!row) return null;
    return { ...row, respuestas: JSON.parse(row.respuestas) };
  },

  findByMongoId(mongoId) {
    const row = db.prepare('SELECT * FROM encuestas_realizadas WHERE mongo_id = ?').get(mongoId);
    if (!row) return null;
    return { ...row, respuestas: JSON.parse(row.respuestas) };
  },

  update(id, data) {
    const allowed = ['formulario_id', 'usuario_id', 'encuestador_id', 'respuestas', 'fecha', 'is_synced', 'mongo_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const preparedData = { ...data };
    if (preparedData.respuestas && typeof preparedData.respuestas !== 'string') {
      preparedData.respuestas = JSON.stringify(preparedData.respuestas);
    }
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE encuestas_realizadas SET ${setClause}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...preparedData, updated_at: now(), id });
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM encuestas_realizadas WHERE id = ?').run(id);
  },

  findUnsynced() {
    const rows = db.prepare('SELECT * FROM encuestas_realizadas WHERE is_synced = 0').all();
    return rows.map(r => ({ ...r, respuestas: JSON.parse(r.respuestas) }));
  },

  markSynced(id, mongoId) {
    return db.prepare(`
      UPDATE encuestas_realizadas SET is_synced = 1, mongo_id = ?, updated_at = ? WHERE id = ?
    `).run(mongoId, now(), id);
  },
};

module.exports = EncuestaSQLite;
