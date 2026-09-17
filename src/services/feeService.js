const { pricing } = require('../config');

function calculateFee(durationHours) {
  if (durationHours < 0) {
    throw new Error('Duration cannot be negative');
  }

  const totalHours = Math.ceil(durationHours);
  const firstHourFee = pricing.firstHour;
  const additionalFee = Math.max(0, totalHours - 1) * pricing.additionalHour;
  const fee = firstHourFee + additionalFee;

  return Math.min(fee, pricing.dailyCap);
}

module.exports = { calculateFee };
