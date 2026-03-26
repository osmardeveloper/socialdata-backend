/**
 * services/syncService.js
 * Servicio de sincronización SQLite → MongoDB.
 *
 * Estrategia:
 *  1. Se ejecuta al detectar conexión o manualmente vía endpoint.
 *  2. Procesa en ORDEN: usuarios → preguntas → formularios → encuestas
 *     (respeta dependencias entre entidades).
 *  3. Cada registro con is_synced = 0 se sube a MongoDB.
 *  4. Si tiene mongo_id → UPDATE; si no → INSERT.
 *  5. Después → marca is_synced = 1 en SQLite.
 *  6. Los errores se registran en sync_queue con reintentos.
 */

const UsuarioSQLite    = require('../sqlite/models/sqliteUsuario');
const PreguntaSQLite   = require('../sqlite/models/sqlitePregunta');
const FormularioSQLite = require('../sqlite/models/sqliteFormulario');
const EncuestaSQLite   = require('../sqlite/models/sqliteEncuesta');
const GrupoFamiliarSQLite = require('../sqlite/models/sqliteGrupoFamiliar');

const Usuario             = require('../models/Usuario');
const Pregunta            = require('../models/Pregunta');
const FormularioPersonalizada = require('../models/FormularioPersonalizada');
const EncuestaRealizada   = require('../models/EncuestaRealizada');
const GrupoFamiliar       = require('../models/GrupoFamiliar');

const connectivity = require('./connectivityService');
const db           = require('../sqlite/db.sqlite');

// Estado del proceso
let _isSyncing = false;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function enqueueError(entity, entityId, action, payload, errorMsg) {
  try {
    db.prepare(`
      INSERT INTO sync_queue (entity, entity_id, action, payload, retries, last_error)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(entity, entityId, action, JSON.stringify(payload), errorMsg);
  } catch (e) {
    console.error('[SyncQueue] Error al guardar en cola:', e.message);
  }
}

function removeFromQueue(entityId) {
  db.prepare('DELETE FROM sync_queue WHERE entity_id = ?').run(entityId);
}

// ─────────────────────────────────────────────────────────
// SINCRONIZACIÓN POR ENTIDAD
// ─────────────────────────────────────────────────────────

async function syncUsuarios() {
  const pending = UsuarioSQLite.findUnsynced();
  console.log(`[Sync] Usuarios pendientes: ${pending.length}`);

  for (const u of pending) {
    try {
      let mongoDoc;

      if (u.mongo_id) {
        // Actualizar en MongoDB (última modificación gana)
        mongoDoc = await Usuario.findByIdAndUpdate(
          u.mongo_id,
          {
            tipo_documento: u.tipo_documento,
            numero_documento: u.numero_documento,
            nombre: u.nombre,
            apellido: u.apellido,
            direccion: u.direccion,
            telefono: u.telefono,
            correo: u.correo,
            fecha_nacimiento: u.fecha_nacimiento,
          },
          { new: true, upsert: false }
        );
      } else {
        // Verificar duplicado por número de documento
        const existing = await Usuario.findOne({ numero_documento: u.numero_documento });
        if (existing) {
          mongoDoc = existing;
        } else {
          mongoDoc = await Usuario.create({
            tipo_documento: u.tipo_documento,
            numero_documento: u.numero_documento,
            nombre: u.nombre,
            apellido: u.apellido,
            direccion: u.direccion,
            telefono: u.telefono,
            correo: u.correo,
            fecha_nacimiento: u.fecha_nacimiento,
          });
        }
      }

      UsuarioSQLite.markSynced(u.id, mongoDoc._id.toString());
      removeFromQueue(u.id);
      console.log(`  ✅ Usuario sincronizado: ${u.nombre} ${u.apellido}`);
    } catch (error) {
      console.error(`  ❌ Error sincronizando usuario ${u.id}:`, error.message);
      enqueueError('usuarios', u.id, u.mongo_id ? 'update' : 'create', u, error.message);
    }
  }
}

async function syncPreguntas() {
  const pending = PreguntaSQLite.findUnsynced();
  console.log(`[Sync] Preguntas pendientes: ${pending.length}`);

  for (const p of pending) {
    try {
      let mongoDoc;
      if (p.mongo_id) {
        mongoDoc = await Pregunta.findByIdAndUpdate(
          p.mongo_id,
          { detalles: p.detalles },
          { new: true }
        );
      } else {
        mongoDoc = await Pregunta.create({ detalles: p.detalles });
      }
      PreguntaSQLite.markSynced(p.id, mongoDoc._id.toString());
      removeFromQueue(p.id);
      console.log(`  ✅ Pregunta sincronizada: ${p.id}`);
    } catch (error) {
      console.error(`  ❌ Error sincronizando pregunta ${p.id}:`, error.message);
      enqueueError('preguntas', p.id, p.mongo_id ? 'update' : 'create', p, error.message);
    }
  }
}

async function syncFormularios() {
  const pending = FormularioSQLite.findUnsynced();
  console.log(`[Sync] Formularios pendientes: ${pending.length}`);

  for (const f of pending) {
    try {
      // Resolver IDs de preguntas: convertir UUIDs locales → mongo_ids
      const preguntaIds = await Promise.all(
        f.preguntas.map(async (localId) => {
          const local = PreguntaSQLite.findById(localId) || PreguntaSQLite.findByMongoId(localId);
          if (local?.mongo_id) return local.mongo_id;
          // Puede que ya sea un mongo_id directo
          const fromMongo = await Pregunta.findById(localId).catch(() => null);
          return fromMongo ? localId : null;
        })
      );
      const validIds = preguntaIds.filter(Boolean);

      let mongoDoc;
      if (f.mongo_id) {
        mongoDoc = await FormularioPersonalizada.findByIdAndUpdate(
          f.mongo_id,
          { titulo: f.titulo, preguntas: validIds },
          { new: true }
        );
      } else {
        mongoDoc = await FormularioPersonalizada.create({
          titulo: f.titulo,
          preguntas: validIds,
        });
      }
      FormularioSQLite.markSynced(f.id, mongoDoc._id.toString());
      removeFromQueue(f.id);
      console.log(`  ✅ Formulario sincronizado: ${f.titulo}`);
    } catch (error) {
      console.error(`  ❌ Error sincronizando formulario ${f.id}:`, error.message);
      enqueueError('formularios', f.id, f.mongo_id ? 'update' : 'create', f, error.message);
    }
  }
}

async function syncEncuestas() {
  const pending = EncuestaSQLite.findUnsynced();
  console.log(`[Sync] Encuestas pendientes: ${pending.length}`);

  for (const e of pending) {
    try {
      // Resolver IDs locales → mongo_ids
      const formLocal = FormularioSQLite.findById(e.formulario_id);
      const usuLocal  = UsuarioSQLite.findById(e.usuario_id);
      const staffLocal = db.prepare('SELECT * FROM usuarios_staff WHERE id = ?').get(e.encuestador_id);

      const formulario_id  = formLocal?.mongo_id || e.formulario_id;
      const usuario_id     = usuLocal?.mongo_id  || e.usuario_id;
      const encuestador_id = staffLocal?.mongo_id || e.encuestador_id;

      let mongoDoc;
      if (e.mongo_id) {
        mongoDoc = await EncuestaRealizada.findByIdAndUpdate(
          e.mongo_id,
          { formulario_id, usuario_id, encuestador_id, respuestas: e.respuestas, fecha: e.fecha },
          { new: true }
        );
      } else {
        mongoDoc = await EncuestaRealizada.create({
          formulario_id,
          usuario_id,
          encuestador_id,
          respuestas: e.respuestas,
          fecha: e.fecha,
        });
      }
      EncuestaSQLite.markSynced(e.id, mongoDoc._id.toString());
      removeFromQueue(e.id);
      console.log(`  ✅ Encuesta sincronizada: ${e.id}`);
    } catch (error) {
      console.error(`  ❌ Error sincronizando encuesta ${e.id}:`, error.message);
      enqueueError('encuestas', e.id, e.mongo_id ? 'update' : 'create', e, error.message);
    }
  }
}

async function syncGrupos() {
  const pending = GrupoFamiliarSQLite.findUnsynced();
  console.log(`[Sync] Grupos Familiares pendientes: ${pending.length}`);

  for (const g of pending) {
    try {
      // Resolver IDs de miembros locales → mongo_ids
      const miembrosMongo = g.miembros.map(localId => {
        const u = UsuarioSQLite.findById(localId) || UsuarioSQLite.findByMongoId(localId);
        return u?.mongo_id || localId; // si no hay mongo_id, usamos el que tiene (asumimos es mongo id o pendiente)
      });

      let mongoDoc;
      if (g.mongo_id) {
        mongoDoc = await GrupoFamiliar.findByIdAndUpdate(
          g.mongo_id,
          { nombre_familia: g.nombre_familia, codigo_identificador: g.codigo_identificador, miembros: miembrosMongo },
          { new: true }
        );
      } else {
        mongoDoc = await GrupoFamiliar.create({
          nombre_familia: g.nombre_familia,
          codigo_identificador: g.codigo_identificador,
          miembros: miembrosMongo
        });
      }
      GrupoFamiliarSQLite.markSynced(g.id, mongoDoc._id.toString());
      removeFromQueue(g.id);
      console.log(`  ✅ Grupo Familiar sincronizado: ${g.nombre_familia}`);
    } catch (error) {
      console.error(`  ❌ Error sincronizando grupo familiar ${g.id}:`, error.message);
      enqueueError('grupos_familiares', g.id, g.mongo_id ? 'update' : 'create', g, error.message);
    }
  }
}

// ─────────────────────────────────────────────────────────
// SINCRONIZACIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────

/**
 * Ejecuta la sincronización completa en el orden correcto.
 * @returns {Object} Resumen del proceso
 */
async function runSync() {
  if (_isSyncing) {
    console.log('[Sync] Ya hay una sincronización en curso, omitiendo...');
    return { status: 'already_running' };
  }

  if (!connectivity.isOnline()) {
    console.log('[Sync] Sin conexión, sincronización postergada.');
    return { status: 'offline' };
  }

  _isSyncing = true;
  console.log('\n[Sync] ====== INICIANDO SINCRONIZACIÓN ======');
  const startTime = Date.now();

  try {
    await syncUsuarios();
    await syncPreguntas();
    await syncFormularios();
    await syncEncuestas();
    await syncGrupos();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Sync] ====== COMPLETADO en ${duration}s ======\n`);
    return { status: 'completed', duration: `${duration}s` };
  } catch (error) {
    console.error('[Sync] Error general:', error.message);
    return { status: 'error', message: error.message };
  } finally {
    _isSyncing = false;
  }
}

/**
 * Inicializar: escuchar cuando vuelva la conexión para auto-sincronizar.
 */
function initSync() {
  connectivity.onStatusChange((online) => {
    if (online) {
      console.log('[Sync] Conexión restaurada → iniciando sincronización automática...');
      // Pequeño delay para que MongoDB termine de reconectarse
      setTimeout(runSync, 2000);
    }
  });
  console.log('[Sync] Servicio de sincronización iniciado.');
}

/**
 * Estado de la cola de errores.
 */
function getSyncQueue() {
  return db.prepare('SELECT * FROM sync_queue ORDER BY created_at DESC').all();
}

/**
 * ¿Hay datos pendientes?
 */
function hasPendingData() {
  const counts = {
    usuarios:   db.prepare('SELECT COUNT(*) as c FROM usuarios WHERE is_synced = 0').get().c,
    preguntas:  db.prepare('SELECT COUNT(*) as c FROM preguntas WHERE is_synced = 0').get().c,
    formularios: db.prepare('SELECT COUNT(*) as c FROM formularios_personalizados WHERE is_synced = 0').get().c,
    encuestas:  db.prepare('SELECT COUNT(*) as c FROM encuestas_realizadas WHERE is_synced = 0').get().c,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { hasPending: total > 0, total, counts };
}

// ─────────────────────────────────────────────────────────
// PULL: DESCARGAR DE MONGO A SQLITE (CACHÉ)
// ─────────────────────────────────────────────────────────

/**
 * Descarga las plantillas (preguntas y formularios) para asegurar que estén
 * disponibles cuando el dispositivo se quede sin internet.
 */
async function downloadDataFromServer() {
  if (!connectivity.isOnline()) return { status: 'offline' };

  console.log('\n[Sync] ====== DESCARGANDO DATOS (PULL) ======');
  try {
    // 1. Descargar Preguntas
    const mongoPreguntas = await Pregunta.find();
    console.log(`  ⬇️ Descargando ${mongoPreguntas.length} preguntas...`);
    for (const p of mongoPreguntas) {
      const existing = PreguntaSQLite.findByMongoId(p._id.toString());
      if (!existing) {
        PreguntaSQLite.create({
          mongo_id: p._id.toString(),
          detalles: p.detalles,
          is_synced: 1
        });
      } else {
        PreguntaSQLite.update(existing.id, {
          detalles: p.detalles,
          is_synced: 1
        });
      }
    }

    // 2. Descargar Formularios
    const mongoForms = await FormularioPersonalizada.find();
    console.log(`  ⬇️ Descargando ${mongoForms.length} formularios...`);
    for (const f of mongoForms) {
      const existing = FormularioSQLite.findByMongoId(f._id.toString());
      // Convertir ObjectIds de Mongo a string
      const preguntasStr = f.preguntas.map(id => id.toString());

      if (!existing) {
        FormularioSQLite.create({
          mongo_id: f._id.toString(),
          titulo: f.titulo,
          preguntas: preguntasStr,
          is_synced: 1
        });
      } else {
        FormularioSQLite.update(existing.id, {
          titulo: f.titulo,
          preguntas: preguntasStr,
          is_synced: 1
        });
      }
    }

    // 3. Descargar Usuarios (Opcional: Últimos 100 para búsqueda rápida)
    const mongoUsuarios = await Usuario.find().sort({ updatedAt: -1 }).limit(100);
    console.log(`  ⬇️ Cacheando últimos ${mongoUsuarios.length} usuarios...`);
    for (const u of mongoUsuarios) {
      const existing = UsuarioSQLite.findByMongoId(u._id.toString());
      const data = {
        mongo_id: u._id.toString(),
        tipo_documento: u.tipo_documento,
        numero_documento: u.numero_documento,
        nombre: u.nombre,
        apellido: u.apellido,
        direccion: u.direccion,
        telefono: u.telefono,
        correo: u.correo,
        fecha_nacimiento: u.fecha_nacimiento,
        is_synced: 1
      };
      if (!existing) {
        UsuarioSQLite.create(data);
      } else {
        UsuarioSQLite.update(existing.id, data);
      }
    }

    // 4. Descargar Grupos Familiares
    const mongoGrupos = await GrupoFamiliar.find();
    console.log(`  ⬇️ Descargando ${mongoGrupos.length} grupos familiares...`);
    for (const g of mongoGrupos) {
      const existing = GrupoFamiliarSQLite.findByMongoId(g._id.toString());
      const data = {
        mongo_id: g._id.toString(),
        nombre_familia: g.nombre_familia,
        codigo_identificador: g.codigo_identificador,
        miembros: g.miembros.map(m => m.toString()),
        is_synced: 1
      };
      if (!existing) {
        GrupoFamiliarSQLite.create(data);
      } else {
        GrupoFamiliarSQLite.update(existing.id, data);
      }
    }

    console.log('[Sync] ====== DESCARGA COMPLETADA ======\n');
    return { status: 'completed' };
  } catch (error) {
    console.error('[Sync] Error en descarga:', error.message);
    throw error;
  }
}

module.exports = {
  runSync,
  initSync,
  getSyncQueue,
  hasPendingData,
  downloadDataFromServer,
};
