/**
 * sqlite/models/sqliteFormulario.js
 * Modelo SQLite para la tabla 'formularios_personalizados'.
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString();

const FormularioSQLite = {
  create(data) {
    const id = data.id || uuidv4();
    const stmt = db.prepare(`
      INSERT INTO formularios_personalizados (
        id, mongo_id, titulo, preguntas, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @titulo, @preguntas, @is_synced, @created_at, @updated_at
      )
    `);
    const timestamp = now();
    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      titulo: data.titulo,
      preguntas: JSON.stringify(data.preguntas || []),
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return this.findById(id);
  },

  findAll() {
    const rows = db.prepare('SELECT * FROM formularios_personalizados ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, preguntas: JSON.parse(r.preguntas) }));
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM formularios_personalizados WHERE id = ?').get(id);
    if (!row) return null;
    return { ...row, preguntas: JSON.parse(row.preguntas) };
  },

  findByMongoId(mongoId) {
    const row = db.prepare('SELECT * FROM formularios_personalizados WHERE mongo_id = ?').get(mongoId);
    if (!row) return null;
    return { ...row, preguntas: JSON.parse(row.preguntas) };
  },

  update(id, data) {
    const allowed = ['titulo', 'preguntas', 'is_synced', 'mongo_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const preparedData = { ...data };
    if (preparedData.preguntas && typeof preparedData.preguntas !== 'string') {
      preparedData.preguntas = JSON.stringify(preparedData.preguntas);
    }
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE formularios_personalizados SET ${setClause}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...preparedData, updated_at: now(), id });
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM formularios_personalizados WHERE id = ?').run(id);
  },

  findUnsynced() {
    const rows = db.prepare('SELECT * FROM formularios_personalizados WHERE is_synced = 0').all();
    return rows.map(r => ({ ...r, preguntas: JSON.parse(r.preguntas) }));
  },

  markSynced(id, mongoId) {
    return db.prepare(`
      UPDATE formularios_personalizados SET is_synced = 1, mongo_id = ?, updated_at = ? WHERE id = ?
    `).run(mongoId, now(), id);
  },
};

module.exports = FormularioSQLite;
