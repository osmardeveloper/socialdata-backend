/**
 * services/connectivityService.js
 * Detecta si el backend tiene acceso a internet / MongoDB.
 * El estado se mantiene en memoria y se actualiza periódicamente.
 */

const mongoose = require('mongoose');

let _isOnline = false;               // Estado actual
let _listeners = [];                 // Callbacks para notificar cambios

/**
 * Verifica si Mongo está conectado.
 * readyState 1 = connected.
 */
function checkMongoConnection() {
  return mongoose.connection.readyState === 1;
}

/**
 * Verificación principal de conectividad.
 * Usa el estado de Mongoose como fuente de verdad.
 */
async function checkConnectivity() {
  const wasOnline = _isOnline;
  _isOnline = checkMongoConnection();

  // Si el estado cambió → notificar listeners
  if (wasOnline !== _isOnline) {
    console.log(`[Conectividad] Estado cambió: ${_isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    _listeners.forEach(fn => fn(_isOnline));
  }

  return _isOnline;
}

/**
 * Iniciar polling de conectividad cada N segundos.
 * @param {number} intervalMs - Intervalo en ms (default: 15 seg)
 */
function startMonitoring(intervalMs = 15000) {
  // Revisión inicial
  checkConnectivity();

  // Escuchar eventos de Mongoose directamente
  mongoose.connection.on('connected', () => {
    console.log('[Conectividad] MongoDB reconectado → ONLINE 🟢');
    _isOnline = true;
    _listeners.forEach(fn => fn(true));
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[Conectividad] MongoDB desconectado → OFFLINE 🔴');
    _isOnline = false;
    _listeners.forEach(fn => fn(false));
  });

  // Polling de respaldo
  setInterval(checkConnectivity, intervalMs);
  console.log(`[Conectividad] Monitoreo iniciado (cada ${intervalMs / 1000}s)`);
}

/**
 * Registrar un listener que se llama cuando cambia el estado.
 * @param {Function} fn - Recibe (isOnline: boolean)
 */
function onStatusChange(fn) {
  _listeners.push(fn);
}

/**
 * Obtener el estado actual (síncrono).
 */
function isOnline() {
  return _isOnline;
}

module.exports = {
  startMonitoring,
  onStatusChange,
  isOnline,
  checkConnectivity,
};
