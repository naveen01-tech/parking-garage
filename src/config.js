module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  pricing: {
    firstHour: 50,
    additionalHour: 30,
    dailyCap: 300,
  },
  vehicleTypes: ['COMPACT', 'STANDARD', 'EV'],
  spotTypes: ['COMPACT', 'STANDARD', 'EV'],
};
