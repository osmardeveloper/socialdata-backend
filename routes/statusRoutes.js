/**
 * routes/statusRoutes.js
 * Endpoints de estado del sistema y control de sincronización.
 */

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');

const connectivity = require('../services/connectivityService');
const syncService  = require('../services/syncService');

// ─────────────────────────────────────────
// GET /api/status
// Devuelve el estado actual ONLINE / OFFLINE
// Consultado periódicamente por el frontend
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const online = connectivity.isOnline();
  const pending = syncService.hasPendingData();

  res.json({
    online,
    mode: online ? 'mongo' : 'sqlite',
    pendingSync: pending.hasPending,
    pendingCount: pending.total,
    pendingDetail: pending.counts,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// POST /api/status/sync
// Fuerza una sincronización manual (requiere auth)
// ─────────────────────────────────────────
router.post('/sync', protect, async (req, res) => {
  try {
    const result = await syncService.runSync();
    res.json({ message: 'Sincronización ejecutada', result });
  } catch (error) {
    res.status(500).json({ message: 'Error en sincronización', error: error.message });
  }
});

// ─────────────────────────────────────────
// POST /api/status/pull
// Descarga plantillas (PULL) para uso offline
// ─────────────────────────────────────────
router.post('/pull', protect, async (req, res) => {
  try {
    const result = await syncService.downloadDataFromServer();
    res.json({ message: 'Descarga exitosa', result });
  } catch (error) {
    res.status(500).json({ message: 'Error en descarga de datos', error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/status/queue
// Ver cola de errores de sincronización (admin)
// ─────────────────────────────────────────
router.get('/queue', protect, (req, res) => {
  const queue = syncService.getSyncQueue();
  res.json({ count: queue.length, items: queue });
});

module.exports = router;
