const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/parking.db');

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS garages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS parking_spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      garage_id INTEGER NOT NULL,
      spot_number TEXT NOT NULL,
      spot_type TEXT NOT NULL CHECK(spot_type IN ('COMPACT','STANDARD','EV')),
      is_occupied INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(garage_id) REFERENCES garages(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS parking_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      garage_id INTEGER NOT NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      spot_id INTEGER NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT,
      fee REAL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE','COMPLETED')) DEFAULT 'ACTIVE',
      FOREIGN KEY(garage_id) REFERENCES garages(id),
      FOREIGN KEY(spot_id) REFERENCES parking_spots(id)
    )
  `);

  const garageCount = await get('SELECT COUNT(*) as count FROM garages');
  if (!garageCount || garageCount.count === 0) {
    await run(
      `INSERT INTO garages (name, location) VALUES (?, ?)`,
      ['City Centre Garage', 'Downtown']
    );

    const garageId = (await get('SELECT id FROM garages WHERE name = ?', ['City Centre Garage'])).id;

    const defaultSpots = [
      ['A1', 'COMPACT'], ['A2', 'STANDARD'], ['A3', 'EV'], ['A4', 'STANDARD'], ['A5', 'COMPACT'], ['A6', 'EV']
    ];

    for (const [spotNumber, spotType] of defaultSpots) {
      await run(
        `INSERT INTO parking_spots (garage_id, spot_number, spot_type) VALUES (?, ?, ?)`,
        [garageId, spotNumber, spotType]
      );
    }
  }
}

module.exports = { db, run, get, all, initDatabase };
