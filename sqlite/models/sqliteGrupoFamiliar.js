/**
 * sqlite/models/sqliteGrupoFamiliar.js
 * Modelo SQLite para la tabla 'grupos_familiares'.
 */

const db = require('../db.sqlite');
const { v4: uuidv4 } = require('uuid');

const now = () => new Date().toISOString();

const GrupoFamiliarSQLite = {
  create(data) {
    const id = data.id || uuidv4();
    const timestamp = now();
    const stmt = db.prepare(`
      INSERT INTO grupos_familiares (
        id, mongo_id, nombre_familia, codigo_identificador, miembros, is_synced, created_at, updated_at
      ) VALUES (
        @id, @mongo_id, @nombre_familia, @codigo_identificador, @miembros, @is_synced, @created_at, @updated_at
      )
    `);

    stmt.run({
      id,
      mongo_id: data.mongo_id || null,
      nombre_familia: data.nombre_familia,
      codigo_identificador: data.codigo_identificador,
      miembros: JSON.stringify(data.miembros || []),
      is_synced: data.is_synced || 0,
      created_at: timestamp,
      updated_at: timestamp
    });

    return this.findById(id);
  },

  findAll() {
    const rows = db.prepare('SELECT * FROM grupos_familiares ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, miembros: JSON.parse(r.miembros) }));
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM grupos_familiares WHERE id = ? OR mongo_id = ?').get(id, id);
    if (!row) return null;
    return { ...row, miembros: JSON.parse(row.miembros) };
  },

  findByMongoId(mongoId) {
    const row = db.prepare('SELECT * FROM grupos_familiares WHERE mongo_id = ?').get(mongoId);
    if (!row) return null;
    return { ...row, miembros: JSON.parse(row.miembros) };
  },

  update(id, data) {
    const allowed = ['nombre_familia', 'codigo_identificador', 'miembros', 'is_synced', 'mongo_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    
    const preparedData = { ...data };
    if (preparedData.miembros && typeof preparedData.miembros !== 'string') {
      preparedData.miembros = JSON.stringify(preparedData.miembros);
    }

    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE grupos_familiares SET ${setClause}, updated_at = @updated_at WHERE id = @id OR mongo_id = @id`)
      .run({ ...preparedData, updated_at: now(), id });
    
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM grupos_familiares WHERE id = ? OR mongo_id = ?').run(id, id);
  },

  findUnsynced() {
    const rows = db.prepare('SELECT * FROM grupos_familiares WHERE is_synced = 0').all();
    return rows.map(r => ({ ...r, miembros: JSON.parse(r.miembros) }));
  },

  markSynced(id, mongoId) {
    return db.prepare(`
      UPDATE grupos_familiares SET is_synced = 1, mongo_id = ?, updated_at = ? WHERE id = ?
    `).run(mongoId, now(), id);
  }
};

module.exports = GrupoFamiliarSQLite;
