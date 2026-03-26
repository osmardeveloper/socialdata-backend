/**
 * sqlite/models/sqlitePregunta.js
 * Modelo SQLite para la tabla 'preguntas'.
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString();

const PreguntaSQLite = {
  create(data) {
    const id = data.id || uuidv4();
    const stmt = db.prepare(`
      INSERT INTO preguntas (
        id, mongo_id, detalles, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @detalles, @is_synced, @created_at, @updated_at
      )
    `);
    const timestamp = now();
    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      detalles: JSON.stringify(data.detalles || []),
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return this.findById(id);
  },

  findAll() {
    const rows = db.prepare('SELECT * FROM preguntas ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, detalles: JSON.parse(r.detalles) }));
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM preguntas WHERE id = ?').get(id);
    if (!row) return null;
    return { ...row, detalles: JSON.parse(row.detalles) };
  },

  findByMongoId(mongoId) {
    const row = db.prepare('SELECT * FROM preguntas WHERE mongo_id = ?').get(mongoId);
    if (!row) return null;
    return { ...row, detalles: JSON.parse(row.detalles) };
  },

  update(id, data) {
    const allowed = ['detalles', 'is_synced', 'mongo_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const preparedData = { ...data };
    if (preparedData.detalles && typeof preparedData.detalles !== 'string') {
      preparedData.detalles = JSON.stringify(preparedData.detalles);
    }
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE preguntas SET ${setClause}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...preparedData, updated_at: now(), id });
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM preguntas WHERE id = ?').run(id);
  },

  findUnsynced() {
    const rows = db.prepare('SELECT * FROM preguntas WHERE is_synced = 0').all();
    return rows.map(r => ({ ...r, detalles: JSON.parse(r.detalles) }));
  },

  markSynced(id, mongoId) {
    return db.prepare(`
      UPDATE preguntas SET is_synced = 1, mongo_id = ?, updated_at = ? WHERE id = ?
    `).run(mongoId, now(), id);
  },
};

module.exports = PreguntaSQLite;
