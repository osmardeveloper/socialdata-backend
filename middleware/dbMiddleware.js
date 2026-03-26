/**
 * middleware/dbMiddleware.js
 * Middleware inteligente de base de datos.
 *
 * Inyecta en req.db el objeto correcto según el estado de conexión:
 *   - ONLINE  → usa MongoDB (Mongoose models)  + caché pasiva en SQLite
 *   - OFFLINE → usa SQLite (better-sqlite3)
 *
 * Uso en controladores: req.db.mode === 'sqlite' | 'mongo'
 */

const connectivity = require('../services/connectivityService');

const UsuarioSQLite    = require('../sqlite/models/sqliteUsuario');
const PreguntaSQLite   = require('../sqlite/models/sqlitePregunta');
const FormularioSQLite = require('../sqlite/models/sqliteFormulario');
const EncuestaSQLite   = require('../sqlite/models/sqliteEncuesta');
const StaffSQLite      = require('../sqlite/models/sqliteStaff');
const GrupoFamiliarSQLite = require('../sqlite/models/sqliteGrupoFamiliar');

const Usuario                 = require('../models/Usuario');
const Pregunta                = require('../models/Pregunta');
const FormularioPersonalizada = require('../models/FormularioPersonalizada');
const EncuestaRealizada       = require('../models/EncuestaRealizada');
const UsuarioStaff             = require('../models/UsuarioStaff');
const GrupoFamiliar            = require('../models/GrupoFamiliar');

/**
 * Middleware principal: adjunta req.db con los modelos correctos.
 */
function dbMiddleware(req, res, next) {
  const online = connectivity.isOnline();

  if (online) {
    // ── MODO ONLINE: usar MongoDB ──────────────────────────────
    req.db = {
      mode: 'mongo',
      Usuario,
      Pregunta,
      FormularioPersonalizada,
      EncuestaRealizada,
      Staff: UsuarioStaff,
      GrupoFamiliar,
    };
  } else {
    // ── MODO OFFLINE: usar SQLite ──────────────────────────────
    req.db = {
      mode: 'sqlite',
      Usuario:    UsuarioSQLite,
      Pregunta:   PreguntaSQLite,
      FormularioPersonalizada: FormularioSQLite,
      EncuestaRealizada:       EncuestaSQLite,
      Staff: StaffSQLite,
      GrupoFamiliar: GrupoFamiliarSQLite,
    };
  }

  next();
}

module.exports = dbMiddleware;
