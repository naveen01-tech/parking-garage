const express = require('express');
const { run, get, all } = require('../db/database');
const { authRequired } = require('../utils/auth');
const { calculateFee } = require('../services/feeService');

const router = express.Router();

router.use(authRequired);

function normalizeVehicleType(vehicleType) {
  if (!vehicleType) return null;
  const value = String(vehicleType).trim().toUpperCase();
  return ['COMPACT', 'STANDARD', 'EV'].includes(value) ? value : null;
}

router.post('/check-in', async (req, res, next) => {
  try {
    const { garageId, plate, vehicleType } = req.body;

    if (!garageId || !plate || !vehicleType) {
      return res.status(400).json({ error: 'garageId, plate and vehicleType are required' });
    }

    const normalizedPlate = String(plate).trim();
    if (!normalizedPlate) {
      return res.status(400).json({ error: 'Plate cannot be empty' });
    }

    const normalizedType = normalizeVehicleType(vehicleType);
    if (!normalizedType) {
      return res.status(400).json({ error: 'Invalid vehicle type' });
    }

    const garage = await get('SELECT id FROM garages WHERE id = ?', [garageId]);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found' });
    }

    const existing = await get('SELECT id FROM parking_sessions WHERE vehicle_plate = ? AND status = ?', [normalizedPlate, 'ACTIVE']);
    if (existing) {
      return res.status(409).json({ error: 'Vehicle already has an active parking session' });
    }

    const spotTypeNeeded = normalizedType === 'EV' ? 'EV' : 'COMPACT';
    const availableSpots = await all(
      'SELECT * FROM parking_spots WHERE garage_id = ? AND is_occupied = 0 AND spot_type = ? ORDER BY spot_number ASC LIMIT 1',
      [garageId, spotTypeNeeded]
    );

    let selectedSpot = availableSpots[0];
    if (!selectedSpot && normalizedType !== 'EV') {
      const fallbackSpots = await all(
        'SELECT * FROM parking_spots WHERE garage_id = ? AND is_occupied = 0 ORDER BY spot_number ASC LIMIT 1',
        [garageId]
      );
      selectedSpot = fallbackSpots[0];
    }

    if (!selectedSpot) {
      return res.status(409).json({ error: 'No suitable parking spot available' });
    }

    if (normalizedType === 'EV' && selectedSpot.spot_type !== 'EV') {
      return res.status(409).json({ error: 'EV vehicles must use EV spots only' });
    }

    await run('UPDATE parking_spots SET is_occupied = 1 WHERE id = ?', [selectedSpot.id]);

    const sessionResult = await run(
      'INSERT INTO parking_sessions (garage_id, vehicle_plate, vehicle_type, spot_id, check_in, status) VALUES (?, ?, ?, ?, datetime("now"), "ACTIVE")',
      [garageId, normalizedPlate, normalizedType, selectedSpot.id]
    );

    const session = await get('SELECT * FROM parking_sessions WHERE id = ?', [sessionResult.id]);
    const updatedSpot = await get('SELECT * FROM parking_spots WHERE id = ?', [selectedSpot.id]);
    return res.status(201).json({
      message: 'Vehicle checked in successfully',
      session,
      spot: updatedSpot,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/check-out', async (req, res, next) => {
  try {
    const { plate, hours } = req.body;

    if (!plate) {
      return res.status(400).json({ error: 'Plate is required' });
    }

    const normalizedPlate = String(plate).trim();
    if (!normalizedPlate) {
      return res.status(400).json({ error: 'Plate cannot be empty' });
    }

    const durationHours = Number(hours ?? 0);
    if (Number.isNaN(durationHours) || durationHours < 0) {
      return res.status(400).json({ error: 'Hours must be a non-negative number' });
    }

    const session = await get('SELECT * FROM parking_sessions WHERE vehicle_plate = ? AND status = ?', [normalizedPlate, 'ACTIVE']);
    if (!session) {
      return res.status(404).json({ error: 'No active session found for this vehicle' });
    }

    const spot = await get('SELECT * FROM parking_spots WHERE id = ?', [session.spot_id]);
    const fee = calculateFee(durationHours);

    await run('UPDATE parking_spots SET is_occupied = 0 WHERE id = ?', [spot.id]);
    await run(
      'UPDATE parking_sessions SET check_out = datetime("now"), fee = ?, status = ? WHERE id = ?',
      [fee, 'COMPLETED', session.id]
    );

    const releasedSpot = await get('SELECT * FROM parking_spots WHERE id = ?', [spot.id]);
    return res.json({
      message: 'Vehicle checked out successfully',
      plate: normalizedPlate,
      fee,
      spot: releasedSpot,
      sessionId: session.id,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/active', async (req, res, next) => {
  try {
    const sessions = await all('SELECT * FROM parking_sessions WHERE status = ? ORDER BY check_in DESC', ['ACTIVE']);
    return res.json({ sessions });
  } catch (error) {
    return next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 10));
    const sortBy = ['check_in', 'check_out', 'vehicle_plate', 'fee'].includes(String(req.query.sort || 'check_in')) ? String(req.query.sort || 'check_in') : 'check_in';
    const order = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const totalRows = await get('SELECT COUNT(*) as count FROM parking_sessions');
    const offset = (page - 1) * limit;
    const rows = await all(
      `SELECT * FROM parking_sessions ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return res.json({
      page,
      limit,
      total: totalRows.count,
      rows,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/vehicle/:plate', async (req, res, next) => {
  try {
    const plate = String(req.params.plate || '').trim();
    if (!plate) {
      return res.status(400).json({ error: 'Plate is required' });
    }

    const session = await get('SELECT * FROM parking_sessions WHERE vehicle_plate = ? ORDER BY id DESC LIMIT 1', [plate]);
    if (!session) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const spot = await get('SELECT * FROM parking_spots WHERE id = ?', [session.spot_id]);
    return res.json({
      plate: session.vehicle_plate,
      vehicleType: session.vehicle_type,
      garageId: session.garage_id,
      spot,
      checkIn: session.check_in,
      checkOut: session.check_out,
      status: session.status,
      fee: session.fee,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
