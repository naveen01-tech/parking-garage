const express = require('express');
const { run, get, all } = require('../db/database');
const { authRequired } = require('../utils/auth');

const router = express.Router();

router.use(authRequired);

router.post('/', async (req, res, next) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const result = await run('INSERT INTO garages (name, location) VALUES (?, ?)', [name, location]);
    const garage = await get('SELECT * FROM garages WHERE id = ?', [result.id]);
    return res.status(201).json({ garage });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const garages = await all('SELECT * FROM garages ORDER BY id ASC');
    return res.json({ garages });
  } catch (error) {
    return next(error);
  }
});

router.post('/:garageId/spots', async (req, res, next) => {
  try {
    const { garageId } = req.params;
    const { spotNumber, spotType } = req.body;

    if (!spotNumber || !spotType) {
      return res.status(400).json({ error: 'spotNumber and spotType are required' });
    }

    const garage = await get('SELECT id FROM garages WHERE id = ?', [garageId]);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found' });
    }

    const validTypes = ['COMPACT', 'STANDARD', 'EV'];
    if (!validTypes.includes(spotType.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid spot type' });
    }

    const existingSpot = await get('SELECT id FROM parking_spots WHERE garage_id = ? AND spot_number = ?', [garageId, spotNumber]);
    if (existingSpot) {
      return res.status(409).json({ error: 'Spot already exists' });
    }

    const result = await run('INSERT INTO parking_spots (garage_id, spot_number, spot_type, is_occupied) VALUES (?, ?, ?, 0)', [garageId, spotNumber, spotType.toUpperCase()]);
    const spot = await get('SELECT * FROM parking_spots WHERE id = ?', [result.id]);
    return res.status(201).json({ spot });
  } catch (error) {
    return next(error);
  }
});

router.get('/:garageId/spots', async (req, res, next) => {
  try {
    const { garageId } = req.params;
    const garage = await get('SELECT id FROM garages WHERE id = ?', [garageId]);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found' });
    }

    const spots = await all('SELECT * FROM parking_spots WHERE garage_id = ? ORDER BY spot_number ASC', [garageId]);
    return res.json({ spots });
  } catch (error) {
    return next(error);
  }
});

router.get('/:garageId/spots/availability', async (req, res, next) => {
  try {
    const { garageId } = req.params;
    const garage = await get('SELECT id FROM garages WHERE id = ?', [garageId]);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found' });
    }

    const rows = await all('SELECT spot_type, is_occupied FROM parking_spots WHERE garage_id = ?', [garageId]);
    const response = {
      total: rows.length,
      available: rows.filter((spot) => !spot.is_occupied).length,
      occupied: rows.filter((spot) => spot.is_occupied).length,
      totalEV: rows.filter((spot) => spot.spot_type === 'EV').length,
      availableEV: rows.filter((spot) => spot.spot_type === 'EV' && !spot.is_occupied).length,
      totalCompact: rows.filter((spot) => spot.spot_type === 'COMPACT').length,
      availableCompact: rows.filter((spot) => spot.spot_type === 'COMPACT' && !spot.is_occupied).length,
      totalStandard: rows.filter((spot) => spot.spot_type === 'STANDARD').length,
      availableStandard: rows.filter((spot) => spot.spot_type === 'STANDARD' && !spot.is_occupied).length,
    };

    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
