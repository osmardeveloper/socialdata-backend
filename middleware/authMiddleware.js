/**
 * middleware/authMiddleware.js  (DUAL: MongoDB / SQLite)
 * 
 * Verifica el token JWT y busca al usuario en MongoDB o SQLite.
 */

const jwt         = require('jsonwebtoken');
const UsuarioStaff = require('../models/UsuarioStaff');
const StaffSQLite  = require('../sqlite/models/sqliteStaff');
const connectivity = require('../services/connectivityService');

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (connectivity.isOnline()) {
        // ONLINE: intentar MongoDB, sino SQLite
        req.user = await UsuarioStaff.findById(decoded.id).select('-password');
        if (!req.user) {
          const local = StaffSQLite.findById(decoded.id);
          if (local) req.user = { 
            _id: local.mongo_id || local.id, 
            nombre: local.nombre, 
            usuario: local.usuario, 
            rol: local.rol 
          };
        }
      } else {
        // OFFLINE: siempre SQLite
        const local = StaffSQLite.findById(decoded.id);
        if (local) req.user = { 
          _id: local.mongo_id || local.id, 
          nombre: local.nombre, 
          usuario: local.usuario, 
          rol: local.rol 
        };
      }

      if (!req.user) return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });

      next();
    } catch (error) {
      console.error('[Auth Error]', error.message);
      res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        message: `El rol de usuario '${req.user.rol}' no está autorizado para acceder a esta ruta`
      });
    }
    next();
  };
};
