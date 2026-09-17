const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../src/db/database');

(async () => {
  await initDatabase();
})();

async function postJson(path, payload, token) {
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const response = await fetch(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return response;
}

test('user can register and login', async () => {
  const registerResponse = await postJson('/api/auth/register', {
    name: 'Test User',
    email: 'test-user@example.com',
    password: 'secret123',
  });

  assert.equal(registerResponse.status, 201);
  const registerData = await registerResponse.json();
  assert.ok(registerData.token);

  const loginResponse = await postJson('/api/auth/login', {
    email: 'test-user@example.com',
    password: 'secret123',
  });

  assert.equal(loginResponse.status, 200);
  const loginData = await loginResponse.json();
  assert.ok(loginData.token);
});

test('check-in and checkout works for standard vehicle', async () => {
  const registerResponse = await postJson('/api/auth/register', {
    name: 'Garage User',
    email: 'garage-user@example.com',
    password: 'secret123',
  });

  const token = (await registerResponse.json()).token;

  const checkInResponse = await postJson('/api/parking/check-in', {
    garageId: 1,
    plate: 'ABC-123',
    vehicleType: 'STANDARD',
  }, token);

  assert.equal(checkInResponse.status, 201);
  const checkInData = await checkInResponse.json();
  assert.ok(checkInData.session);

  const checkoutResponse = await postJson('/api/parking/check-out', {
    plate: 'ABC-123',
    hours: 2,
  }, token);

  assert.equal(checkoutResponse.status, 200);
  const checkoutData = await checkoutResponse.json();
  assert.ok(checkoutData.fee >= 0);
});

test('EV vehicle must get EV spot', async () => {
  const registerResponse = await postJson('/api/auth/register', {
    name: 'EV User',
    email: 'ev-user@example.com',
    password: 'secret123',
  });

  const token = (await registerResponse.json()).token;

  const response = await postJson('/api/parking/check-in', {
    garageId: 1,
    plate: 'EV-1',
    vehicleType: 'EV',
  }, token);

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.spot.spot_type, 'EV');
});
