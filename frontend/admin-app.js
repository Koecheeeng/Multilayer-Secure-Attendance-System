import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Make sure this matches your backend server address and port
const API_BASE = 'http://localhost:3000/api/admin';

const el = {
  loginPanel: document.getElementById('loginPanel'),
  dashboard: document.getElementById('dashboard'),
  btnSignIn: document.getElementById('btnSignIn'),
  btnSignOut: document.getElementById('btnSignOut'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginMessage: document.getElementById('loginMessage'),
  currentName: document.getElementById('currentName'),
  currentRole: document.getElementById('currentRole'),
  adminOnlySection: document.getElementById('adminOnlySection'),
  staffCode: document.getElementById('staffCode'),
  staffName: document.getElementById('staffName'),
  staffDepartment: document.getElementById('staffDepartment'),
  staffPosition: document.getElementById('staffPosition'),
  staffEmail: document.getElementById('staffEmail'),
  staffPhone: document.getElementById('staffPhone'),
  staffStatus: document.getElementById('staffStatus'),
  btnCreateStaff: document.getElementById('btnCreateStaff'),
  staffMessage: document.getElementById('staffMessage'),
  staffTableBody: document.getElementById('staffTableBody'),
  absenceStaffSelect: document.getElementById('absenceStaffSelect'),
  absenceDate: document.getElementById('absenceDate'),
  absenceType: document.getElementById('absenceType'),
  absenceNotes: document.getElementById('absenceNotes'),
  btnCreateAbsence: document.getElementById('btnCreateAbsence'),
  absenceMessage: document.getElementById('absenceMessage'),
  absenceTableBody: document.getElementById('absenceTableBody')
};

function setMessage(node, text, ok = true) {
  node.textContent = text || '';
  node.className = `status ${ok ? 'ok' : 'err'}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function api(path, options = {}) {
  const token = await getSessionToken();

  if (!token) {
    throw new Error('You are not signed in');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

function showDashboard(show) {
  el.loginPanel.classList.toggle('hidden', show);
  el.dashboard.classList.toggle('hidden', !show);
  el.btnSignOut.classList.toggle('hidden', !show);
}

function setAdminOnly(isAdmin) {
  el.adminOnlySection.classList.toggle('hidden', !isAdmin);
}

function renderStaff(staffRows) {
  el.staffTableBody.innerHTML = staffRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.staff_code)}</td>
      <td>${escapeHtml(row.full_name)}</td>
      <td>${escapeHtml(row.department || '')}</td>
      <td>${escapeHtml(row.position || '')}</td>
      <td>${escapeHtml(row.email || '')}</td>
      <td>${escapeHtml(row.phone || '')}</td>
      <td>${escapeHtml(row.status)}</td>
    </tr>
  `).join('');

  el.absenceStaffSelect.innerHTML = staffRows.length
    ? staffRows.map((row) => `
        <option value="${escapeHtml(row.id)}">
          ${escapeHtml(row.staff_code)} — ${escapeHtml(row.full_name)}
        </option>
      `).join('')
    : '<option value="">No staff available</option>';
}

function renderAbsences(absenceRows) {
  el.absenceTableBody.innerHTML = absenceRows.map((row) => {
    const staff = row.staff_profiles || {};
    return `
      <tr>
        <td>${escapeHtml(row.absence_date)}</td>
        <td>
          <strong>${escapeHtml(staff.full_name || '—')}</strong><br/>
          <span class="muted">${escapeHtml(staff.staff_code || '')}</span>
        </td>
        <td>${escapeHtml(row.absence_type)}</td>
        <td>${escapeHtml(row.notes || '')}</td>
        <td>${escapeHtml(row.created_by || '')}</td>
      </tr>
    `;
  }).join('');
}

async function loadMe() {
  const result = await api('/me');
  const profile = result.data.profile;

  el.currentName.textContent = profile.full_name;
  el.currentRole.textContent = profile.role;

  setAdminOnly(profile.role === 'admin');
}

async function loadStaff() {
  const result = await api('/staff');
  const rows = result.data || [];
  renderStaff(rows);
  return rows;
}

async function loadAbsences() {
  const result = await api('/absence');
  renderAbsences(result.data || []);
}

async function refreshAll() {
  await loadMe();
  const staffRows = await loadStaff();
  await loadAbsences();

  // Keep the absence dropdown in sync
  if (!staffRows.length) {
    el.absenceStaffSelect.innerHTML = '<option value="">No staff available</option>';
  }
}

async function signIn() {
  setMessage(el.loginMessage, '');
  const email = el.emailInput.value.trim();
  const password = el.passwordInput.value;

  if (!email || !password) {
    setMessage(el.loginMessage, 'Email and password are required', false);
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setMessage(el.loginMessage, error.message, false);
    return;
  }

  showDashboard(true);
  await refreshAll();
}

async function signOut() {
  await supabase.auth.signOut();
  showDashboard(false);
  el.currentName.textContent = '—';
  el.currentRole.textContent = '—';
}

async function createStaff() {
  setMessage(el.staffMessage, '');

  const payload = {
    staff_code: el.staffCode.value.trim(),
    full_name: el.staffName.value.trim(),
    department: el.staffDepartment.value.trim(),
    position: el.staffPosition.value.trim(),
    email: el.staffEmail.value.trim(),
    phone: el.staffPhone.value.trim(),
    status: el.staffStatus.value
  };

  if (!payload.full_name) {
    setMessage(el.staffMessage, 'Full name is required', false);
    return;
  }

  try {
    await api('/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setMessage(el.staffMessage, 'Staff profile created successfully', true);
    el.staffCode.value = '';
    el.staffName.value = '';
    el.staffDepartment.value = '';
    el.staffPosition.value = '';
    el.staffEmail.value = '';
    el.staffPhone.value = '';
    el.staffStatus.value = 'active';

    await refreshAll();
  } catch (err) {
    setMessage(el.staffMessage, err.message, false);
  }
}

async function createAbsence() {
  setMessage(el.absenceMessage, '');

  const payload = {
    staff_id: el.absenceStaffSelect.value,
    absence_date: el.absenceDate.value,
    absence_type: el.absenceType.value,
    notes: el.absenceNotes.value.trim()
  };

  if (!payload.staff_id || !payload.absence_date || !payload.absence_type) {
    setMessage(el.absenceMessage, 'Select staff, date, and type', false);
    return;
  }

  try {
    await api('/absence', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setMessage(el.absenceMessage, 'Absence saved successfully', true);
    el.absenceNotes.value = '';
    await loadAbsences();
  } catch (err) {
    setMessage(el.absenceMessage, err.message, false);
  }
}

el.btnSignIn.addEventListener('click', signIn);
el.btnSignOut.addEventListener('click', signOut);
el.btnCreateStaff.addEventListener('click', createStaff);
el.btnCreateAbsence.addEventListener('click', createAbsence);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !el.dashboard.classList.contains('hidden')) {
    if (document.activeElement === el.staffName) {
      createStaff();
    }
  }
});

(async function init() {
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    showDashboard(true);
    try {
      await refreshAll();
    } catch (err) {
      console.error(err);
      showDashboard(false);
      setMessage(el.loginMessage, err.message, false);
    }
  } else {
    showDashboard(false);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showDashboard(true);
      await refreshAll();
    }

    if (event === 'SIGNED_OUT') {
      showDashboard(false);
    }
  });
})();
