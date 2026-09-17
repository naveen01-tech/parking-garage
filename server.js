require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const garageRoutes = require('./src/routes/garageRoutes');
const parkingRoutes = require('./src/routes/parkingRoutes');
const { initDatabase } = require('./src/db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/parking', parkingRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

(async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Parking garage server running on http://localhost:${PORT}`);
  });
})();
