/**
 * controllers/grupoFamiliarController.js (DUAL: MongoDB / SQLite)
 * ACTUALIZADO: Soporte para Parentesco (Mamá, Papá, etc.)
 */

const UsuarioSQLite = require('../sqlite/models/sqliteUsuario');
const Usuario = require('../models/Usuario');
const db = require('../sqlite/db.sqlite');

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

function generateCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FAM-${ts}-${rd}`;
}

function normalizeGrupo(g, populatedMiembros) {
  if (!g) return null;
  return {
    _id: g.mongo_id || g.id || g._id,
    _localId: g.id,
    nombre_familia: g.nombre_familia,
    codigo_identificador: g.codigo_identificador,
    miembros: populatedMiembros || g.miembros, // Aquí vienen con parentesco
    isSynced: !!g.is_synced,
    createdAt: g.created_at || g.createdAt,
    updatedAt: g.updated_at || g.updatedAt,
  };
}

// Recibe un array de { _id, parentesco }
function populateMiembrosLocal(rawMiembros) {
  if (!rawMiembros || !Array.isArray(rawMiembros)) return [];
  
  return rawMiembros.map(item => {
    const id = typeof item === 'string' ? item : (item._id || item.usuario);
    const parentesco = item.parentesco || 'Otro';
    
    const u = UsuarioSQLite.findById(id);
    if (!u) return { _id: id, parentesco };
    
    return {
      _id: u.mongo_id || u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      numero_documento: u.numero_documento,
      correo: u.correo,
      parentesco: parentesco
    };
  });
}

// ────────────────────────────────────────────
// CONTROLADORES
// ────────────────────────────────────────────

exports.getGrupos = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const grupos = req.db.GrupoFamiliar.findAll().map(g => {
        const rawMiembros = typeof g.miembros === 'string' ? JSON.parse(g.miembros) : (g.miembros || []);
        return normalizeGrupo(g, populateMiembrosLocal(rawMiembros));
      });
      return res.json(grupos);
    }

    // MODO ONLINE
    const grupos = await req.db.GrupoFamiliar.find()
      .populate('miembros.usuario', 'nombre apellido numero_documento correo');
    
    // Normalizar estructura de Mongo (miembros.usuario -> miembro plano)
    const normalized = grupos.map(g => {
      const gObj = g.toObject();
      const populated = gObj.miembros.map(m => ({
        ...(m.usuario || {}),
        parentesco: m.parentesco
      }));
      return normalizeGrupo(gObj, populated);
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createGrupo = async (req, res) => {
  try {
    const { nombre_familia, miembros } = req.body; // miembros: [{ _id, parentesco }, ...]
    const codigo_identificador = generateCode();

    if (req.db.mode === 'sqlite') {
      const createAndBind = db.transaction((data) => {
        const nuevo = req.db.GrupoFamiliar.create(data);
        const parseMiembros = typeof data.miembros === 'string' ? JSON.parse(data.miembros) : data.miembros;
        
        parseMiembros.forEach(m => {
          UsuarioSQLite.updateFamily(m._id, nuevo.id);
        });
        return nuevo;
      });

      const nuevo = createAndBind({ nombre_familia, codigo_identificador, miembros });
      const raw = typeof nuevo.miembros === 'string' ? JSON.parse(nuevo.miembros) : nuevo.miembros;
      return res.status(201).json(normalizeGrupo(nuevo, populateMiembrosLocal(raw)));
    }

    // MODO ONLINE (Mongo)
    const mongoMiembros = miembros.map(m => ({ usuario: m._id, parentesco: m.parentesco }));
    const grupo = await req.db.GrupoFamiliar.create({ 
      nombre_familia, 
      codigo_identificador, 
      miembros: mongoMiembros 
    });
    
    await Usuario.updateMany({ _id: { $in: miembros.map(m => m._id) } }, { $set: { grupo_familiar_id: grupo._id } });

    const populated = await req.db.GrupoFamiliar.findById(grupo._id).populate('miembros.usuario', 'nombre apellido numero_documento correo');
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateGrupo = async (req, res) => {
  try {
    const { nombre_familia, miembros } = req.body; // [{ _id, parentesco }]

    if (req.db.mode === 'sqlite') {
      const g = req.db.GrupoFamiliar.findById(req.params.id);
      if (!g) return res.status(404).json({ message: 'Grupo no encontrado' });

      const updateAndBind = db.transaction((data) => {
        db.prepare('UPDATE usuarios SET grupo_familiar_id = NULL, is_synced = 0 WHERE grupo_familiar_id = ?').run(g.id);
        const updated = req.db.GrupoFamiliar.update(g.id, { ...data, is_synced: 0 });
        
        const parseMiembros = typeof data.miembros === 'string' ? JSON.parse(data.miembros) : data.miembros;
        if (parseMiembros) {
          parseMiembros.forEach(m => {
            UsuarioSQLite.updateFamily(m._id, updated.id);
          });
        }
        return updated;
      });

      const updated = updateAndBind({ nombre_familia, miembros });
      const raw = typeof updated.miembros === 'string' ? JSON.parse(updated.miembros) : updated.miembros;
      return res.json(normalizeGrupo(updated, populateMiembrosLocal(raw)));
    }

    // MODO ONLINE
    const grupo = await req.db.GrupoFamiliar.findById(req.params.id);
    if (!grupo) return res.status(404).json({ message: 'Grupo no encontrado' });

    await Usuario.updateMany({ grupo_familiar_id: grupo._id }, { $set: { grupo_familiar_id: null } });

    const mongoMiembros = miembros.map(m => ({ usuario: m._id, parentesco: m.parentesco }));
    const updatedGrupo = await req.db.GrupoFamiliar.findByIdAndUpdate(req.params.id, {
      nombre_familia,
      miembros: mongoMiembros
    }, { new: true });

    await Usuario.updateMany({ _id: { $in: miembros.map(m => m._id) } }, { $set: { grupo_familiar_id: updatedGrupo._id } });

    const resPopulated = await req.db.GrupoFamiliar.findById(updatedGrupo._id).populate('miembros.usuario', 'nombre apellido numero_documento correo');
    res.json(resPopulated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteGrupo = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const g = req.db.GrupoFamiliar.findById(req.params.id);
      if (g) {
        db.prepare('UPDATE usuarios SET grupo_familiar_id = NULL, is_synced = 0 WHERE grupo_familiar_id = ?').run(g.id);
        req.db.GrupoFamiliar.delete(g.id);
      }
      return res.json({ message: 'Grupo eliminado' });
    }

    const grupo = await req.db.GrupoFamiliar.findById(req.params.id);
    if (grupo) {
      await Usuario.updateMany({ grupo_familiar_id: grupo._id }, { $set: { grupo_familiar_id: null } });
      await req.db.GrupoFamiliar.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Grupo eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
