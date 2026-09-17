const tokenKey = 'parking_token';
const state = {
  mode: 'login',
  auth: null,
  dashboardTab: 'check-in',
};

const pages = {
  auth: document.getElementById('authPage'),
  dashboard: document.getElementById('dashboardPage'),
};

const dashboardPanels = {
  'check-in': 'checkInPanel',
  'check-out': 'checkOutPanel',
  search: 'searchPanel',
  history: 'historyPanel',
};

function setPage(pageName) {
  Object.entries(pages).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== pageName);
  });
}

function setMode(mode) {
  state.mode = mode;
  document.getElementById('loginTab').classList.toggle('active', mode === 'login');
  document.getElementById('registerTab').classList.toggle('active', mode === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', mode !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', mode !== 'register');
}

function setDashboardTab(tabName) {
  state.dashboardTab = tabName;
  const activePanelId = dashboardPanels[tabName];

  document.querySelectorAll('.dashboard-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.dashboardTab === tabName);
  });

  document.querySelectorAll('.feature-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== activePanelId);
  });
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function logout() {
  localStorage.removeItem(tokenKey);
  state.auth = null;
  setPage('auth');
  setMode('login');
  showStatus('Logged out successfully', 'success');
}

function showStatus(message, type = 'info') {
  const el = document.getElementById('statusMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function renderCheckoutReceipt(data) {
  const spot = data.spot || {};
  const result = document.getElementById('checkoutResult');
  result.className = 'result-box';
  result.innerHTML = `
    <article class="receipt" aria-label="Parking payment receipt">
      <header class="receipt-head">
        <div>
          <h4>Parking receipt</h4>
          <p>ParkEasy Garage</p>
        </div>
        <span class="receipt-check" aria-label="Checkout successful">✓</span>
      </header>
      <div class="receipt-body">
        <div class="receipt-total">
          <span>Total paid</span>
          <strong>INR ${escapeHtml(data.fee)}</strong>
        </div>
        <dl class="receipt-details">
          <div><dt>Vehicle plate</dt><dd>${escapeHtml(data.plate)}</dd></div>
          <div><dt>Session ID</dt><dd>#${escapeHtml(data.sessionId)}</dd></div>
          <div><dt>Garage</dt><dd>#${escapeHtml(spot.garage_id)}</dd></div>
          <div><dt>Parking spot</dt><dd>${escapeHtml(spot.spot_number)}</dd></div>
          <div><dt>Spot type</dt><dd>${escapeHtml(spot.spot_type)}</dd></div>
          <div><dt>Status</dt><dd>Checked out</dd></div>
        </dl>
        <div class="receipt-actions">
          <button class="receipt-print" type="button" id="printReceiptBtn">Print receipt</button>
        </div>
      </div>
    </article>`;
  document.getElementById('printReceiptBtn').addEventListener('click', () => window.print());
}

function renderCheckinTicket(data) {
  const session = data.session || data;
  const spot = data.spot || session.spot || {};
  const result = document.getElementById('checkInResult');
  result.className = 'result-box';
  result.innerHTML = `
    <article class="receipt" aria-label="Parking check-in ticket">
      <header class="receipt-head">
        <div>
          <h4>Parking ticket</h4>
          <p>Vehicle checked in successfully</p>
        </div>
        <span class="receipt-check" aria-label="Check-in successful">✓</span>
      </header>
      <div class="receipt-body">
        <div class="receipt-highlight">
          <span>Assigned spot</span>
          <strong>${escapeHtml(spot.spot_number || 'Pending')}</strong>
        </div>
        <dl class="receipt-details">
          <div><dt>Vehicle plate</dt><dd>${escapeHtml(session.vehicle_plate || data.plate)}</dd></div>
          <div><dt>Vehicle type</dt><dd>${escapeHtml(session.vehicle_type || data.vehicleType)}</dd></div>
          <div><dt>Garage</dt><dd>#${escapeHtml(spot.garage_id || session.garage_id || data.garageId)}</dd></div>
          <div><dt>Spot type</dt><dd>${escapeHtml(spot.spot_type)}</dd></div>
          <div><dt>Session ID</dt><dd>#${escapeHtml(session.id || data.sessionId)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(session.status || 'ACTIVE')}</dd></div>
        </dl>
      </div>
    </article>`;
}

function renderVehicleSearch(data) {
  const spot = data.spot || {};
  const result = document.getElementById('searchResult');
  result.className = 'result-box';
  result.innerHTML = `
    <article class="receipt" aria-label="Vehicle search result">
      <header class="receipt-head">
        <div>
          <h4>Vehicle details</h4>
          <p>Parking record found</p>
        </div>
        <span class="receipt-status">${escapeHtml(data.status || 'FOUND')}</span>
      </header>
      <div class="receipt-body">
        <div class="receipt-highlight">
          <span>Vehicle plate</span>
          <strong>${escapeHtml(data.plate)}</strong>
        </div>
        <dl class="receipt-details">
          <div><dt>Vehicle type</dt><dd>${escapeHtml(data.vehicleType)}</dd></div>
          <div><dt>Garage</dt><dd>#${escapeHtml(spot.garage_id || data.garageId)}</dd></div>
          <div><dt>Parking spot</dt><dd>${escapeHtml(spot.spot_number || 'Not assigned')}</dd></div>
          <div><dt>Spot type</dt><dd>${escapeHtml(spot.spot_type || 'Not available')}</dd></div>
          <div><dt>Checked in</dt><dd>${escapeHtml(data.checkIn)}</dd></div>
          <div><dt>Checked out</dt><dd>${escapeHtml(data.checkOut || 'Still parked')}</dd></div>
        </dl>
      </div>
    </article>`;
}

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';

  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { response, data };
}

async function registerUser(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('registerName').value,
    email: document.getElementById('registerEmail').value,
    password: document.getElementById('registerPassword').value,
  };

  const { response, data } = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    showStatus(data.error || 'Registration failed', 'error');
    return;
  }

  setMode('login');
  setPage('auth');
  showStatus('Registration successful. Please login.', 'success');
}

async function loginUser(event) {
  event.preventDefault();
  const payload = {
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value,
  };

  const { response, data } = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    showStatus(data.error || 'Login failed', 'error');
    return;
  }

  setToken(data.token);
  state.auth = data.user;
  setPage('dashboard');
  setDashboardTab('check-in');
  showStatus('Login successful', 'success');
  loadAvailability();
}

async function checkInVehicle(event) {
  event.preventDefault();
  const payload = {
    garageId: Number(document.getElementById('checkinGarageId').value),
    plate: document.getElementById('checkinPlate').value,
    vehicleType: document.getElementById('checkinVehicleType').value,
  };

  const { response, data } = await apiFetch('/api/parking/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const result = document.getElementById('checkInResult');

  if (!response.ok) {
    result.className = 'result-box';
    result.textContent = data.error || 'Check-in failed';
    result.style.color = '#d14343';
    return;
  }

  renderCheckinTicket(data);
  loadAvailability();
}

async function checkOutVehicle(event) {
  event.preventDefault();
  const payload = {
    plate: document.getElementById('checkoutPlate').value,
    hours: Number(document.getElementById('checkoutHours').value),
  };

  const { response, data } = await apiFetch('/api/parking/check-out', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const result = document.getElementById('checkoutResult');

  if (!response.ok) {
    result.className = 'result-box';
    result.textContent = data.error || 'Checkout failed';
    result.style.color = '#d14343';
    return;
  }

  renderCheckoutReceipt(data);
  loadAvailability();
}

async function searchVehicle(event) {
  event.preventDefault();
  const plate = document.getElementById('searchPlate').value.trim();
  if (!plate) {
    document.getElementById('searchResult').textContent = 'Please enter a plate number';
    return;
  }

  const { response, data } = await apiFetch(`/api/parking/vehicle/${encodeURIComponent(plate)}`);
  const result = document.getElementById('searchResult');
  if (!response.ok) {
    result.className = 'result-box';
    result.textContent = data.error || 'Vehicle not found';
    result.style.color = '#d14343';
    return;
  }

  renderVehicleSearch(data);
}

async function loadHistory(event) {
  if (event) event.preventDefault();
  const page = Number(document.getElementById('historyPage').value || 1);
  const limit = Number(document.getElementById('historyLimit').value || 10);

  const { response, data } = await apiFetch(`/api/parking/history?page=${page}&limit=${limit}&sort=check_in&order=desc`);
  const tbody = document.getElementById('historyTableBody');

  if (!response.ok) {
    tbody.innerHTML = `<tr><td colspan="3">${data.error || 'Unable to load history'}</td></tr>`;
    return;
  }

  const rows = data.rows || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No parking history found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.vehicle_plate}</td>
      <td>${row.status}</td>
      <td>${row.fee ?? '—'}</td>
    </tr>
  `).join('');
}

async function loadAvailability() {
  if (!getToken()) return;
  const { response, data } = await apiFetch('/api/garages/1/spots/availability');
  if (!response.ok) return;

  document.getElementById('availableValue').textContent = data.available ?? 0;
  document.getElementById('occupiedValue').textContent = data.occupied ?? 0;
  document.getElementById('evFreeValue').textContent = data.availableEV ?? 0;
}

function attachEvents() {
  document.getElementById('loginTab').addEventListener('click', () => setMode('login'));
  document.getElementById('registerTab').addEventListener('click', () => setMode('register'));
  document.getElementById('registerForm').addEventListener('submit', registerUser);
  document.getElementById('loginForm').addEventListener('submit', loginUser);
  document.getElementById('checkInForm').addEventListener('submit', checkInVehicle);
  document.getElementById('checkOutForm').addEventListener('submit', checkOutVehicle);
  document.getElementById('searchForm').addEventListener('submit', searchVehicle);
  document.getElementById('historyForm').addEventListener('submit', loadHistory);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('menuToggle').addEventListener('click', () => {
    const menu = document.getElementById('dashboardTabs');
    const isOpen = menu.classList.toggle('open');
    document.getElementById('menuToggle').setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.dashboard-tab').forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardTab(button.dataset.dashboardTab);
      document.getElementById('dashboardTabs').classList.remove('open');
      document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setPage('auth');
  setMode('login');
  setDashboardTab('check-in');
  attachEvents();
  if (getToken()) {
    setPage('dashboard');
    loadAvailability();
  }
});
