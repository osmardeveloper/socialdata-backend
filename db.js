/**
 * db.js
 * Conexión a MongoDB con soporte de reconexión automática.
 * NO termina el proceso si falla — el sistema continúa en modo offline.
 */

const mongoose = require('mongoose');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,   // Timeout rápido para no bloquear el arranque
  socketTimeoutMS: 45000,
  family: 4,
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    console.log(`[MongoDB] Conectado: ${conn.connection.host} 🟢`);
  } catch (error) {
    // ⚠️ NO hacer process.exit(1) — el sistema arranca en modo offline
    console.warn(`[MongoDB] Sin conexión al iniciar: ${error.message}`);
    console.warn('[MongoDB] El sistema arrancará en modo OFFLINE 🔴');
    console.warn('[MongoDB] Se intentará reconectar automáticamente...');
  }

  // Eventos de reconexión de Mongoose
  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Error de conexión: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Desconectado → modo OFFLINE 🔴');
    // Mongoose reintenta automáticamente con las opciones de reconnect
    setTimeout(() => attemptReconnect(), 10000);
  });
};

async function attemptReconnect() {
  if (mongoose.connection.readyState === 0) {
    console.log('[MongoDB] Intentando reconexión...');
    try {
      await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    } catch (err) {
      console.warn(`[MongoDB] Reconexión fallida: ${err.message}`);
      setTimeout(() => attemptReconnect(), 30000); // Reintento cada 30s
    }
  }
}

module.exports = connectDB;
